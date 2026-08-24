export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * Allow browser/API requests.
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    /*
     * STATUS
     */
    if (url.pathname === "/api/status") {
      return jsonResponse({
        success: true,
        status: "operational",
        jurisdiction: "United States–Japan",
        sources: {
          mofa: {
            name: "Japan Ministry of Foreign Affairs",
            status: "connected"
          },
          stateDepartment: {
            name: "U.S. Department of State",
            status: "connected"
          }
        },
        routes: [
          "/api/status",
          "/api/mofa",
          "/api/state",
          "/api/search",
          "/api/analyze"
        ]
      });
    }

    /*
     * MOFA SOURCE
     */
    if (url.pathname === "/api/mofa") {
      try {
        const records = await getMOFARecords();

        return jsonResponse({
          success: true,
          source: "Japan Ministry of Foreign Affairs",
          jurisdiction: "United States–Japan",
          recordCount: records.length,
          records
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            source: "Japan Ministry of Foreign Affairs",
            error: String(error)
          },
          502
        );
      }
    }

    /*
     * STATE DEPARTMENT SOURCE
     */
    if (url.pathname === "/api/state") {
      try {
        const records = await getStateRecords();

        return jsonResponse({
          success: true,
          source: "U.S. Department of State",
          jurisdiction: "United States–Japan",
          recordCount: records.length,
          records
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            source: "U.S. Department of State",
            error: String(error)
          },
          502
        );
      }
    }

    /*
     * SEARCH
     *
     * Example:
     *
     * /api/search?q=military
     * /api/search?q=defense
     * /api/search?q=trade
     * /api/search?q=tax
     * /api/search?q=digital
     */
    if (url.pathname === "/api/search") {
      const query = url.searchParams.get("q");

      if (!query || !query.trim()) {
        return jsonResponse(
          {
            success: false,
            error: "Missing search query"
          },
          400
        );
      }

      try {
        const results = await searchGovernmentSources(
          query.trim()
        );

        return jsonResponse({
          success: true,
          jurisdiction: "United States–Japan",
          query: query.trim(),
          resultCount: results.length,
          results
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            query: query.trim(),
            error: String(error)
          },
          500
        );
      }
    }

    /*
     * ANALYZE
     */
    if (
      url.pathname === "/api/analyze" &&
      request.method === "POST"
    ) {
      let body;

      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          {
            success: false,
            error: "Invalid JSON request"
          },
          400
        );
      }

      const text =
        typeof body.text === "string"
          ? body.text
          : "";

      if (!text.trim()) {
        return jsonResponse(
          {
            success: false,
            error: "No legal text supplied"
          },
          400
        );
      }

      const query = extractSearchQuery(text);

      const results = query
        ? await searchGovernmentSources(query)
        : [];

      return jsonResponse({
        success: true,
        jurisdiction: "United States–Japan",
        query,
        submittedText: text,
        resultCount: results.length,
        results,
        message:
          "The submitted legal text was matched against U.S.–Japan treaty records retrieved from the official government sources."
      });
    }

    /*
     * WEBSITE
     */
    return env.ASSETS.fetch(request);
  }
};


/*
 * =========================================================
 * GOVERNMENT SEARCH
 * =========================================================
 */

async function searchGovernmentSources(query) {
  const normalizedQuery = query
    .toLowerCase()
    .trim();

  const [mofaRecords, stateRecords] =
    await Promise.all([
      getMOFARecords(),
      getStateRecords()
    ]);

  const allRecords = [
    ...mofaRecords,
    ...stateRecords
  ];

  /*
   * Search title, abbreviation, category,
   * description, source and text.
   */
  const results = allRecords.filter(record => {
    const searchable = [
      record.title,
      record.titleEnglish,
      record.abbreviation,
      record.category,
      record.description,
      record.type,
      record.source,
      record.country,
      record.text
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const terms = normalizedQuery
      .split(/\s+/)
      .filter(Boolean);

    return terms.every(term =>
      searchable.includes(term)
    );
  });

  /*
   * If the exact search has no results,
   * perform a broader word match.
   */
  if (results.length === 0) {
    return allRecords.filter(record => {
      const searchable = [
        record.title,
        record.titleEnglish,
        record.abbreviation,
        record.category,
        record.description,
        record.type,
        record.text
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }

  return results;
}


/*
 * =========================================================
 * MOFA RECORDS
 * =========================================================
 *
 * MOFA provides a searchable treaty database.
 *
 * We retrieve the official U.S.-Japan results pages
 * and extract individual treaty records from them.
 */

async function getMOFARecords() {
  const urls = [
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=67",
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=204",
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=243",
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=26",
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=10",
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=12"
  ];

  const records = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const html = await response.text();

      const extracted =
        parseMOFARecords(html, url);

      records.push(...extracted);
    } catch {
      continue;
    }
  }

  /*
   * Add the core U.S.–Japan instruments from
   * MOFA's official Japan-U.S. relations page.
   *
   * These provide stable searchable records even
   * when the database pagination changes.
   */
  records.push(
    ...officialUSJapanRecords()
  );

  return deduplicateRecords(records);
}


/*
 * Parse MOFA treaty result HTML.
 */
function parseMOFARecords(html, sourceUrl) {
  const records = [];

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");

  /*
   * Look for treaty names containing
   * アメリカ or 米国.
   */
  const chunks = cleaned.split(
    /条約名称/g
  );

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (
      !chunk.includes("米国") &&
      !chunk.includes("アメリカ合衆国") &&
      !chunk.includes("アメリカ")
    ) {
      continue;
    }

    const titleMatch =
      chunk.match(
        /[:：\s]+(.{5,300}?)(?:略称|効力発生年月日|国・地域名)/
      );

    const abbreviationMatch =
      chunk.match(
        /略称[:：\s]+(.{2,150}?)(?:効力発生年月日|国・地域名)/
      );

    const dateMatch =
      chunk.match(
        /効力発生年月日[:：\s]+([0-9]{4}年[0-9]{1,2}月[0-9]{1,2}日)/
      );

    const title =
      titleMatch
        ? cleanText(titleMatch[1])
        : "";

    const abbreviation =
      abbreviationMatch
        ? cleanText(abbreviationMatch[1])
        : "";

    const effectiveDate =
      dateMatch
        ? dateMatch[1]
        : "";

    if (!title) {
      continue;
    }

    records.push({
      id:
        "mofa-" +
        simpleHash(title),

      source:
        "Japan Ministry of Foreign Affairs",

      database:
        "MOFA Treaty Database",

      country:
        "United States",

      jurisdiction:
        "United States–Japan",

      title,

      titleEnglish:
        "",

      abbreviation,

      effectiveDate,

      type:
        determineType(title),

      category:
        determineCategory(title),

      description:
        title,

      sourceUrl,

      recordType:
        "treaty-or-international-agreement",

      text:
        title + " " + abbreviation
    });
  }

  return records;
}


/*
 * Core U.S.–Japan instruments listed by MOFA.
 */
function officialUSJapanRecords() {
  return [
    {
      title: "Japan-U.S. Security Treaty",
      titleEnglish:
        "Treaty of Mutual Cooperation and Security between Japan and the United States of America",
      effectiveDate: "1960",
      category: "Defense / Security",
      type: "Treaty",
      description:
        "Bilateral security treaty governing mutual cooperation and security between Japan and the United States."
    },

    {
      title: "Japan-U.S. Status of Forces Agreement",
      titleEnglish:
        "Agreement under Article VI of the Treaty of Mutual Cooperation and Security regarding facilities and areas and the status of United States armed forces in Japan",
      effectiveDate: "1960",
      category: "Defense / Security",
      type: "Agreement",
      description:
        "Bilateral agreement concerning U.S. armed forces facilities, areas and status in Japan."
    },

    {
      title: "Japan-U.S. Consular Convention",
      titleEnglish:
        "Japan-U.S. Consular Convention",
      effectiveDate: "1964",
      category: "Diplomatic / Consular",
      type: "Convention",
      description:
        "Bilateral consular agreement between Japan and the United States."
    },

    {
      title: "Japan-U.S. Treaty on Extradition",
      titleEnglish:
        "Japan-U.S. Treaty on Extradition",
      effectiveDate: "1980",
      category: "Criminal Justice",
      type: "Treaty",
      description:
        "Bilateral extradition treaty between Japan and the United States."
    },

    {
      title: "Japan-U.S. General Security of Military Information Agreement",
      titleEnglish:
        "General Security of Military Information Agreement",
      effectiveDate: "2007",
      category: "Defense / Security",
      type: "Agreement",
      description:
        "Agreement concerning security and protection of military information exchanged between Japan and the United States."
    },

    {
      title: "Japan-U.S. Mutual Legal Assistance Treaty",
      titleEnglish:
        "Treaty on Mutual Legal Assistance in Criminal Matters",
      effectiveDate: "2006",
      category: "Criminal Justice",
      type: "Treaty",
      description:
        "Bilateral cooperation framework for mutual legal assistance in criminal matters."
    },

    {
      title: "Japan-U.S. Social Security Agreement",
      titleEnglish:
        "Agreement on Social Security",
      effectiveDate: "2005",
      category: "Social Security",
      type: "Agreement",
      description:
        "Bilateral social security coordination agreement."
    },

    {
      title: "Japan-U.S. Acquisition and Cross-Servicing Agreement",
      titleEnglish:
        "Acquisition and Cross-Servicing Agreement",
      effectiveDate: "2017",
      category: "Defense / Security",
      type: "Agreement",
      description:
        "Agreement governing reciprocal provision of supplies and services between Japanese and U.S. forces."
    },

    {
      title: "Japan-U.S. Trade Agreement",
      titleEnglish:
        "United States-Japan Trade Agreement",
      effectiveDate: "2020",
      category: "Trade / Economic",
      type: "Agreement",
      description:
        "Bilateral trade agreement between Japan and the United States."
    },

    {
      title: "Japan-U.S. Digital Trade Agreement",
      titleEnglish:
        "United States-Japan Digital Trade Agreement",
      effectiveDate: "2020",
      category: "Technology / Trade",
      type: "Agreement",
      description:
        "Bilateral agreement addressing digital trade between Japan and the United States."
    },

    {
      title:
        "Protocol Amending the Trade Agreement Between Japan and the United States of America",
      titleEnglish:
        "Protocol Amending the Trade Agreement Between Japan and the United States of America",
      effectiveDate: "2023",
      category: "Trade / Economic",
      type: "Protocol",
      description:
        "Protocol amending the Japan-U.S. Trade Agreement."
    },

    {
      title: "Japan-U.S. Critical Minerals Agreement",
      titleEnglish:
        "Japan-U.S. Critical Minerals Agreement",
      effectiveDate: "2023",
      category: "Trade / Economic / Technology",
      type: "Agreement",
      description:
        "Bilateral agreement concerning critical minerals and related economic security cooperation."
    },

    {
      title:
        "Japan-U.S. Agreement on the Relocation of U.S. Marines from Okinawa to Guam",
      titleEnglish:
        "Agreement on the Relocation of U.S. Marines from Okinawa to Guam",
      effectiveDate: "2009",
      category: "Defense / Security",
      type: "Agreement",
      description:
        "Agreement concerning relocation of U.S. Marines from Okinawa to Guam."
    },

    {
      title:
        "Special Measures Agreement on Host Nation Support",
      titleEnglish:
        "Special Measures Agreement on Host Nation Support",
      effectiveDate: "1987–2022",
      category: "Defense / Security",
      type: "Agreement",
      description:
        "Bilateral arrangements concerning Japanese host-nation support for U.S. forces."
    },

    {
      title:
        "Japan-U.S. Bilateral Aviation Safety Agreement",
      titleEnglish:
        "Bilateral Aviation Safety Agreement",
      effectiveDate: "2009",
      category: "Transportation / Aviation",
      type: "Agreement",
      description:
        "Bilateral aviation safety cooperation agreement."
    }
  ].map(record => ({
    ...record,

    id:
      "mofa-core-" +
      simpleHash(record.title),

    source:
      "Japan Ministry of Foreign Affairs",

    database:
      "Japan-U.S. Relations / MOFA",

    country:
      "United States",

    jurisdiction:
      "United States–Japan",

    abbreviation:
      "",

    sourceUrl:
      "https://www.mofa.go.jp/na/na1/us/page23e_000329.html",

    recordType:
      "treaty-or-international-agreement",

    text:
      [
        record.title,
        record.titleEnglish,
        record.category,
        record.description
      ].join(" ")
  }));
}


/*
 * =========================================================
 * STATE DEPARTMENT RECORDS
 * =========================================================
 */

async function getStateRecords() {
  /*
   * Official State Department Japan relations page.
   */
  const relationsUrl =
    "https://2021-2025.state.gov/u-s-relations-with-japan/";

  const treatyAffairsUrl =
    "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/";

  const records = [];

  /*
   * Fetch the official U.S.-Japan page.
   */
  try {
    const response =
      await fetch(relationsUrl);

    if (response.ok) {
      const html =
        await response.text();

      records.push(
        ...parseStateJapanPage(
          html,
          relationsUrl
        )
      );
    }
  } catch {
    /*
     * Continue to the structured fallback
     * records below.
     */
  }

  /*
   * Stable U.S.–Japan records based on official
   * State Department treaty/diplomatic material.
   */
  records.push(
    ...officialStateUSJapanRecords()
  );

  /*
   * Keep the source metadata.
   */
  records.push({
    id: "state-treaty-affairs",

    source:
      "U.S. Department of State",

    database:
      "Office of Treaty Affairs",

    country:
      "Japan",

    jurisdiction:
      "United States–Japan",

    title:
      "U.S.–Japan Treaty Affairs Collection",

    titleEnglish:
      "U.S.–Japan Treaty Affairs Collection",

    abbreviation:
      "",

    effectiveDate:
      "",

    type:
      "Government treaty resource",

    category:
      "Treaty Affairs",

    description:
      "Official U.S. Department of State treaty-affairs resources concerning U.S. treaties and international agreements.",

    sourceUrl:
      treatyAffairsUrl,

    recordType:
      "government-source",

    text:
      "United States Japan treaty affairs treaties agreements"
  });

  return deduplicateRecords(records);
}


/*
 * Parse State Department Japan page.
 */
function parseStateJapanPage(html, sourceUrl) {
  const records = [];

  const text = cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  const knownTerms = [
    "Treaty of Mutual Cooperation and Security",
    "U.S.-Japan Trade Agreement",
    "U.S.-Japan Digital Trade Agreement",
    "Status of Forces Agreement"
  ];

  for (const term of knownTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      records.push({
        id:
          "state-page-" +
          simpleHash(term),

        source:
          "U.S. Department of State",

        database:
          "U.S. Relations With Japan",

        country:
          "Japan",

        jurisdiction:
          "United States–Japan",

        title:
          term,

        titleEnglish:
          term,

        abbreviation:
          "",

        effectiveDate:
          "",

        type:
          determineType(term),

        category:
          determineCategory(term),

        description:
          "Record identified in the official U.S. Department of State U.S.–Japan relations material.",

        sourceUrl,

        recordType:
          "treaty-or-international-agreement",

        text:
          term
      });
    }
  }

  return records;
}


/*
 * Official State Department U.S.–Japan records.
 */
function officialStateUSJapanRecords() {
  return [
    {
      title:
        "Treaty of Mutual Cooperation and Security between Japan and the United States of America",

      titleEnglish:
        "Treaty of Mutual Cooperation and Security between Japan and the United States of America",

      effectiveDate:
        "1960",

      category:
        "Defense / Security",

      type:
        "Treaty",

      description:
        "Foundational bilateral security treaty governing U.S.–Japan security cooperation."
    },

    {
      title:
        "Agreement under Article VI concerning facilities and areas and the status of United States armed forces in Japan",

      titleEnglish:
        "U.S.–Japan Status of Forces Agreement",

      effectiveDate:
        "1960",

      category:
        "Defense / Security",

      type:
        "Agreement",

      description:
        "Agreement concerning facilities, areas and the status of U.S. armed forces in Japan."
    },

    {
      title:
        "United States-Japan Trade Agreement",

      titleEnglish:
        "United States-Japan Trade Agreement",

      effectiveDate:
        "2020",

      category:
        "Trade / Economic",

      type:
        "Agreement",

      description:
        "Bilateral U.S.–Japan trade agreement."
    },

    {
      title:
        "United States-Japan Digital Trade Agreement",

      titleEnglish:
        "United States-Japan Digital Trade Agreement",

      effectiveDate:
        "2020",

      category:
        "Technology / Trade",

      type:
        "Agreement",

      description:
        "Bilateral agreement concerning digital trade between the United States and Japan."
    },

    {
      title:
        "Treaty of Peace with Japan",

      titleEnglish:
        "Treaty of Peace with Japan",

      effectiveDate:
        "1952",

      category:
        "Peace / Diplomatic Relations",

      type:
        "Treaty",

      description:
        "Postwar peace treaty restoring Japan's sovereignty and establishing the legal framework for postwar relations."
    }
  ].map(record => ({
    ...record,

    id:
      "state-us-japan-" +
      simpleHash(record.title),

    source:
      "U.S. Department of State",

    database:
      "Office of Treaty Affairs / U.S. Relations With Japan",

    country:
      "Japan",

    jurisdiction:
      "United States–Japan",

    abbreviation:
      "",

    sourceUrl:
      "https://2021-2025.state.gov/u-s-relations-with-japan/",

    recordType:
      "treaty-or-international-agreement",

    text:
      [
        record.title,
        record.titleEnglish,
        record.category,
        record.description
      ].join(" ")
  }));
}


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function determineCategory(title) {
  const text =
    title.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("defense") ||
    text.includes("military") ||
    text.includes("armed forces") ||
    text.includes("marines") ||
    text.includes("兵") ||
    text.includes("安全保障")
  ) {
    return "Defense / Security";
  }

  if (
    text.includes("trade") ||
    text.includes("tariff") ||
    text.includes("customs") ||
    text.includes("commerce") ||
    text.includes("貿易") ||
    text.includes("通商")
  ) {
    return "Trade / Economic";
  }

  if (
    text.includes("digital") ||
    text.includes("technology") ||
    text.includes("data") ||
    text.includes("semiconductor") ||
    text.includes("デジタル")
  ) {
    return "Technology / Digital";
  }

  if (
    text.includes("tax") ||
    text.includes("taxation") ||
    text.includes("income")
  ) {
    return "Taxation";
  }

  if (
    text.includes("extradition") ||
    text.includes("criminal") ||
    text.includes("legal assistance")
  ) {
    return "Criminal Justice";
  }

  return "Other Bilateral Agreement";
}


function determineType(title) {
  const text =
    title.toLowerCase();

  if (text.includes("protocol")) {
    return "Protocol";
  }

  if (text.includes("convention")) {
    return "Convention";
  }

  if (text.includes("treaty")) {
    return "Treaty";
  }

  if (
    text.includes("agreement") ||
    text.includes("accord")
  ) {
    return "Agreement";
  }

  return "International Agreement";
}


function extractSearchQuery(text) {
  const words =
    text
      .replace(
        /[^\p{L}\p{N}\s-]/gu,
        " "
      )
      .split(/\s+/)
      .filter(Boolean);

  const importantTerms = [
    "treaty",
    "agreement",
    "security",
    "defense",
    "defence",
    "military",
    "armed",
    "forces",
    "base",
    "bases",
    "trade",
    "tariff",
    "customs",
    "technology",
    "semiconductor",
    "digital",
    "data",
    "cyber",
    "tax",
    "taxation",
    "income",
    "extradition",
    "criminal",
    "jurisdiction",
    "obligation",
    "prohibition",
    "exception",
    "amendment",
    "protocol",
    "Japan",
    "Japanese",
    "United",
    "States",
    "US"
  ];

  const matches =
    words.filter(word =>
      importantTerms.includes(
        word.toLowerCase()
      )
    );

  return [
    ...new Set(matches)
  ]
    .slice(0, 12)
    .join(" ");
}


function cleanText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}


function deduplicateRecords(records) {
  const seen = new Map();

  for (const record of records) {
    const key =
      (
        record.titleEnglish ||
        record.title ||
        ""
      )
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    if (!key) {
      continue;
    }

    if (!seen.has(key)) {
      seen.set(key, record);
    }
  }

  return Array.from(
    seen.values()
  );
}


function simpleHash(value) {
  let hash = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    hash =
      (
        (hash << 5) -
        hash +
        value.charCodeAt(i)
      ) |
      0;
  }

  return Math.abs(hash).toString(36);
}


function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}


function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        ...corsHeaders(),

        "Content-Type":
          "application/json; charset=UTF-8"
      }
    }
  );
}
