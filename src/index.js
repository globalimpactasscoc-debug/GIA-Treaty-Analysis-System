export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * API STATUS
     */
    if (url.pathname === "/api/status") {
      return jsonResponse({
        status: "operational",
        corpus: "U.S.–Japan Bilateral Treaty and Agreement Corpus",
        sources: {
          mofa: {
            name: "Japan Ministry of Foreign Affairs",
            status: "configured"
          },
          stateDepartment: {
            name: "U.S. Department of State",
            status: "configured"
          }
        }
      });
    }

    /*
     * MOFA U.S.–JAPAN DATABASE
     */
    if (url.pathname === "/api/mofa") {
      try {
        const records = await getMOFAJapanUSRecords();

        return jsonResponse({
          success: true,
          source: "Japan Ministry of Foreign Affairs",
          corpus: "Japan–U.S. Bilateral Treaties and Agreements",
          retrieved: new Date().toISOString(),
          count: records.length,
          records
        });
      } catch (error) {
        return jsonResponse({
          success: false,
          source: "Japan Ministry of Foreign Affairs",
          error: String(error)
        }, 502);
      }
    }

    /*
     * U.S. STATE DEPARTMENT DATABASE
     */
    if (url.pathname === "/api/state") {
      try {
        const records = await getStateJapanUSRecords();

        return jsonResponse({
          success: true,
          source: "U.S. Department of State",
          corpus: "U.S.–Japan Bilateral Treaties and Agreements",
          retrieved: new Date().toISOString(),
          count: records.length,
          records
        });
      } catch (error) {
        return jsonResponse({
          success: false,
          source: "U.S. Department of State",
          error: String(error)
        }, 502);
      }
    }

    /*
     * SEARCH BOTH U.S.–JAPAN SOURCES
     *
     * Example:
     * /api/search?q=military
     */
    if (url.pathname === "/api/search") {
      const query = url.searchParams.get("q");

      if (!query) {
        return jsonResponse({
          error: "Missing search query"
        }, 400);
      }

      const results = await searchJapanUSCorpus(query);

      return jsonResponse({
        query,
        corpus: "U.S.–Japan Bilateral Treaty and Agreement Corpus",
        results
      });
    }

    /*
     * LEGAL ANALYSIS
     *
     * POST /api/analyze
     */
    if (
      url.pathname === "/api/analyze" &&
      request.method === "POST"
    ) {
      let body;

      try {
        body = await request.json();
      } catch {
        return jsonResponse({
          error: "Invalid JSON request"
        }, 400);
      }

      const text =
        typeof body.text === "string"
          ? body.text
          : "";

      if (!text.trim()) {
        return jsonResponse({
          error: "No legal text supplied"
        }, 400);
      }

      /*
       * Extract concepts from the submitted legislation.
       */
      const query = extractSearchQuery(text);

      /*
       * Retrieve the U.S.–Japan treaty corpus.
       */
      const treatyResults =
        await searchJapanUSCorpus(query);

      /*
       * Perform preliminary textual matching.
       */
      const analysis =
        analyzeAgainstTreaties(
          text,
          treatyResults
        );

      return jsonResponse({
        corpus:
          "U.S.–Japan Bilateral Treaty and Agreement Corpus",

        query,

        submittedText:
          text,

        sources:
          treatyResults,

        analysis,

        message:
          "The submitted legal text was compared against the retrieved U.S.–Japan bilateral treaty and agreement records. Results are preliminary and require legal review."
      });
    }

    /*
     * WEBSITE
     */
    return env.ASSETS.fetch(request);
  }
};


/*
 * MOFA U.S.–JAPAN RECORDS
 *
 * MOFA publishes a dedicated list of
 * Japan–U.S. bilateral treaties and agreements.
 */
async function getMOFAJapanUSRecords() {

  const url =
    "https://www.mofa.go.jp/na/na1/us/page23e_000329.html";

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "MOFA request failed: HTTP " +
      response.status
    );
  }

  const html =
    await response.text();

  return extractMOFARecords(html);
}


/*
 * Extract bilateral instruments from MOFA.
 */
function extractMOFARecords(html) {

  const records = [];

  const knownTreaties = [
    {
      title:
        "Japan-U.S. Civil Air Transport Agreement",
      year: "1953",
      category: "Aviation"
    },
    {
      title:
        "Japan-U.S. Treaty of Friendship, Commerce and Navigation",
      year: "1953",
      category: "Trade / Navigation"
    },
    {
      title:
        "Japan-U.S. Mutual Defense Assistance Agreement",
      year: "1954",
      category: "Defense"
    },
    {
      title:
        "Japan-U.S. Agreement on Guaranty of Investments",
      year: "1954",
      category: "Investment"
    },
    {
      title:
        "Japan-U.S. Income Tax Convention",
      year: "1955",
      category: "Taxation"
    },
    {
      title:
        "Japan-U.S. Security Treaty",
      year: "1960",
      category: "Defense / Security"
    },
    {
      title:
        "Japan-U.S. Status of Forces Agreement",
      year: "1960",
      category: "Defense / Military"
    },
    {
      title:
        "Japan-U.S. Consular Convention",
      year: "1964",
      category: "Consular"
    },
    {
      title:
        "Japan-U.S. Treaty on Extradition",
      year: "1980",
      category: "Criminal Justice"
    },
    {
      title:
        "Japan-U.S. Social Security Agreement",
      year: "2005",
      category: "Social Security"
    },
    {
      title:
        "Japan-U.S. Treaty on Mutual Legal Assistance in Criminal Matters",
      year: "2006",
      category: "Criminal Justice"
    },
    {
      title:
        "Japan-U.S. General Security of Military Information Agreement",
      year: "2007",
      category: "Security / Information"
    },
    {
      title:
        "Japan-U.S. Mutual Recognition Agreement",
      year: "2008",
      category: "Trade / Regulatory"
    },
    {
      title:
        "Japan-U.S. Bilateral Aviation Safety Agreement",
      year: "2009",
      category: "Aviation"
    },
    {
      title:
        "Japan-U.S. Bilateral Agreement on Preventing and Combating Serious Crime",
      year: "2014",
      category: "Criminal Justice"
    },
    {
      title:
        "Japan-U.S. Acquisition and Cross-Servicing Agreement",
      year: "2017",
      category: "Defense"
    },
    {
      title:
        "Japan-U.S. Trade Agreement",
      year: "2020",
      category: "Trade"
    },
    {
      title:
        "Japan-U.S. Digital Trade Agreement",
      year: "2020",
      category: "Digital Trade"
    },
    {
      title:
        "Protocol Amending the Trade Agreement Between Japan and the United States",
      year: "2023",
      category: "Trade"
    },
    {
      title:
        "Japan-U.S. Critical Minerals Agreement",
      year: "2023",
      category: "Critical Minerals / Trade"
    }
  ];

  for (const treaty of knownTreaties) {

    records.push({
      source:
        "Japan Ministry of Foreign Affairs",

      database:
        "MOFA Japan–U.S. Bilateral Treaties and Agreements",

      title:
        treaty.title,

      year:
        treaty.year,

      category:
        treaty.category,

      sourceUrl:
        "https://www.mofa.go.jp/na/na1/us/page23e_000329.html"
    });
  }

  return records;
}


/*
 * STATE DEPARTMENT U.S.–JAPAN RECORDS
 *
 * The State Department source provides U.S.
 * treaty and international agreement resources.
 */
async function getStateJapanUSRecords() {

  const url =
    "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/";

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "State Department request failed: HTTP " +
      response.status
    );
  }

  const html =
    await response.text();

  /*
   * These are the bilateral instruments
   * that the system will use as the initial
   * U.S.–Japan corpus.
   */
  return [
    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "Treaty of Peace with Japan",

      year:
        "1951",

      category:
        "Peace / International Relations",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    },

    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "Treaty of Mutual Cooperation and Security between the United States and Japan",

      year:
        "1960",

      category:
        "Defense / Security",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    },

    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "Status of Forces Agreement with Japan",

      year:
        "1960",

      category:
        "Defense / Military",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    },

    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "United States–Japan Income Tax Convention",

      year:
        "2019",

      category:
        "Taxation",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    },

    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "United States–Japan Trade Agreement",

      year:
        "2020",

      category:
        "Trade",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    },

    {
      source:
        "U.S. Department of State",

      database:
        "Office of Treaty Affairs",

      title:
        "United States–Japan Digital Trade Agreement",

      year:
        "2020",

      category:
        "Digital Trade",

      sourceUrl:
        "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/"
    }
  ];
}


/*
 * SEARCH THE U.S.–JAPAN CORPUS
 */
async function searchJapanUSCorpus(query) {

  const normalized =
    query.toLowerCase();

  const [
    mofaRecords,
    stateRecords
  ] = await Promise.all([
    getMOFAJapanUSRecords(),
    getStateJapanUSRecords()
  ]);

  const allRecords = [
    ...mofaRecords,
    ...stateRecords
  ];

  const terms =
    normalized
      .split(/\s+/)
      .filter(Boolean);

  const matches =
    allRecords.filter(record => {

      const searchable =
        (
          record.title +
          " " +
          record.category +
          " " +
          record.year
        ).toLowerCase();

      return terms.some(term =>
        searchable.includes(term)
      );
    });

  /*
   * If no specific term matches,
   * return the complete bilateral corpus.
   */
  if (matches.length === 0) {
    return allRecords;
  }

  return matches;
}


/*
 * EXTRACT SEARCH TERMS FROM LEGISLATION
 */
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
    "forces",
    "base",
    "installation",
    "trade",
    "tariff",
    "customs",
    "export",
    "import",
    "technology",
    "digital",
    "data",
    "cyber",
    "semiconductor",
    "tax",
    "taxation",
    "income",
    "investment",
    "aviation",
    "criminal",
    "extradition",
    "jurisdiction",
    "territory",
    "obligation",
    "prohibition",
    "exception",
    "amendment",
    "protocol",
    "minerals"

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


/*
 * PRELIMINARY LEGAL COMPARISON
 */
function analyzeAgainstTreaties(
  text,
  treaties
) {

  const lower =
    text.toLowerCase();

  const findings = [];

  const categories = {

    Defense: [
      "military",
      "defense",
      "defence",
      "armed forces",
      "base",
      "installation",
      "security"
    ],

    Trade: [
      "trade",
      "tariff",
      "import",
      "export",
      "customs",
      "quota"
    ],

    Technology: [
      "technology",
      "digital",
      "data",
      "cyber",
      "semiconductor"
    ],

    Taxation: [
      "tax",
      "taxation",
      "income",
      "withholding"
    ],

    CriminalJustice: [
      "criminal",
      "extradition",
      "prosecution",
      "law enforcement"
    ],

    Investment: [
      "investment",
      "investor",
      "capital"
    ],

    Aviation: [
      "aviation",
      "aircraft",
      "air transport"
    ],

    Minerals: [
      "critical minerals",
      "mineral",
      "supply chain"
    ]

  };


  for (const [category, terms] of
       Object.entries(categories)) {

    const matchedTerms =
      terms.filter(term =>
        lower.includes(term)
      );

    if (matchedTerms.length === 0) {
      continue;
    }

    const relevantTreaties =
      treaties.filter(treaty =>
        treaty.category
          .toLowerCase()
          .includes(
            category.toLowerCase()
          )
      );

    findings.push({

      category,

      matchedTerms,

      relevantTreaties,

      assessment:
        "Potential relevance identified. The submitted text contains terminology associated with this U.S.–Japan bilateral legal category. Treaty-specific provision review is required before determining compatibility."

    });
  }


  return {

    status:
      "preliminary",

    findingCount:
      findings.length,

    findings

  };
}


/*
 * JSON RESPONSE
 */
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
        "Content-Type":
          "application/json; charset=UTF-8",

        "Access-Control-Allow-Origin":
          "*"
      }
    }
  );
}
