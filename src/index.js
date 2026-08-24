/*
 * GIA Treaty Analysis System
 *
 * U.S.–Japan treaty extraction + provision-level comparison
 *
 * Sources:
 *   Japan Ministry of Foreign Affairs Treaty Database
 *   U.S. Department of State Office of Treaty Affairs
 */

const MOFA_SEARCH =
  "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php";

const MOFA_HOME =
  "https://www3.mofa.go.jp/mofaj/gaiko/treaty/index.php";

const STATE_TREATY_AFFAIRS =
  "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/";

const JAPAN_TERMS = [
  "japan",
  "japanese",
  "nippon",
  "米国",
  "アメリカ合衆国",
  "アメリカ",
  "日米"
];

const LEGAL_TERMS = [
  "treaty",
  "agreement",
  "accord",
  "protocol",
  "exchange of notes",
  "exchange of letters",
  "memorandum",
  "amendment",
  "convention",
  "arrangement",
  "security",
  "defense",
  "defence",
  "military",
  "forces",
  "installation",
  "trade",
  "tariff",
  "customs",
  "economic",
  "technology",
  "semiconductor",
  "energy",
  "tax",
  "taxation",
  "aviation",
  "maritime",
  "environment",
  "nuclear",
  "atomic",
  "information",
  "cyber",
  "data"
];


/* -------------------------------------------------------
 * Main Worker
 * ----------------------------------------------------- */

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    /*
     * Health/status
     */

    if (url.pathname === "/api/status") {

      return jsonResponse({
        status: "operational",

        system: {
          name: "GIA U.S.–Japan Treaty Extraction and Comparison System",
          mode: "live government-source extraction"
        },

        sources: {
          mofa: {
            name: "Japan Ministry of Foreign Affairs",
            url: MOFA_HOME,
            status: "enabled"
          },

          stateDepartment: {
            name: "U.S. Department of State",
            url: STATE_TREATY_AFFAIRS,
            status: "enabled"
          }
        },

        capabilities: [
          "U.S.–Japan treaty record extraction",
          "Treaty metadata extraction",
          "Treaty text extraction",
          "Legal provision extraction",
          "Cross-source treaty matching",
          "Provision-level comparison"
        ]
      });

    }


    /*
     * MOFA extraction
     */

    if (url.pathname === "/api/mofa") {

      try {

        const records =
          await extractMOFARecords();

        return jsonResponse({

          success: true,

          source:
            "Japan Ministry of Foreign Affairs",

          sourceUrl:
            MOFA_SEARCH,

          recordCount:
            records.length,

          records

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          source:
            "Japan Ministry of Foreign Affairs",

          error:
            String(error)

        }, 500);

      }

    }


    /*
     * State Department extraction
     */

    if (url.pathname === "/api/state") {

      try {

        const records =
          await extractStateRecords();

        return jsonResponse({

          success: true,

          source:
            "U.S. Department of State",

          sourceUrl:
            STATE_TREATY_AFFAIRS,

          recordCount:
            records.length,

          records

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          source:
            "U.S. Department of State",

          error:
            String(error)

        }, 500);

      }

    }


    /*
     * Search actual extracted U.S.–Japan records.
     *
     * Example:
     *
     * /api/search?q=military
     * /api/search?q=trade
     * /api/search?q=defense
     */

    if (url.pathname === "/api/search") {

      const query =
        url.searchParams.get("q");

      if (!query) {

        return jsonResponse({
          error: "Missing search query"
        }, 400);

      }

      try {

        const corpus =
          await buildTreatyCorpus();

        const matches =
          searchCorpus(
            corpus,
            query
          );

        return jsonResponse({

          success: true,

          query,

          corpusSize:
            corpus.length,

          matches,

          matchCount:
            matches.length

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          query,

          error:
            String(error)

        }, 500);

      }

    }


    /*
     * Full legal analysis.
     *
     * POST:
     *
     * {
     *   "text": "proposed legislation..."
     * }
     */

    if (
      url.pathname === "/api/analyze" &&
      request.method === "POST"
    ) {

      let body;

      try {

        body =
          await request.json();

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


      try {

        /*
         * Build actual treaty corpus.
         */

        const corpus =
          await buildTreatyCorpus();


        /*
         * Extract legal provisions from
         * the submitted legislation.
         */

        const proposedProvisions =
          extractProvisions(text);


        /*
         * Compare each submitted provision
         * against the actual treaty corpus.
         */

        const comparisons =
          compareProvisions(
            proposedProvisions,
            corpus
          );


        /*
         * Overall result.
         */

        const overall =
          calculateOverallAssessment(
            comparisons
          );


        return jsonResponse({

          success: true,

          system:
            "U.S.–Japan Treaty Extraction and Comparative Analysis",

          corpus: {
            totalRecords:
              corpus.length,

            sources: [
              "Japan Ministry of Foreign Affairs",
              "U.S. Department of State"
            ]
          },

          submittedText:
            text,

          proposedProvisions,

          comparisons,

          assessment:
            overall

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          error:
            String(error),

          message:
            "Treaty extraction or comparison failed. No substantive comparison is reported when the government-source corpus cannot be constructed."

        }, 500);

      }

    }


    /*
     * Website
     */

    return env.ASSETS.fetch(request);

  }

};


/* =======================================================
 * MOFA
 * =======================================================
 *
 * MOFA provides country-specific treaty searching and
 * individual treaty HTML/PDF documents.
 */

async function extractMOFARecords() {

  const response =
    await fetch(
      MOFA_SEARCH,
      {
        headers: {
          "User-Agent":
            "GIA-Treaty-Analysis-System/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "MOFA request failed: HTTP " +
      response.status
    );

  }


  const html =
    await response.text();


  const records =
    parseMOFAResults(html);


  /*
   * Only return records that are actually
   * identifiable as U.S.–Japan records.
   */

  const japanRecords =
    records.filter(
      record =>
        isUSJapanRecord(record)
    );


  /*
   * Retrieve treaty text for each record.
   *
   * Limit per request so the Worker does not
   * exceed execution/resource limits.
   */

  const enriched = [];

  for (
    const record of japanRecords.slice(0, 40)
  ) {

    try {

      const text =
        await retrieveDocumentText(
          record.documentUrl
        );

      record.text =
        text;

      record.provisions =
        extractProvisions(text);

      record.extractionStatus =
        "extracted";

    } catch (error) {

      record.text =
        "";

      record.provisions =
        [];

      record.extractionStatus =
        "metadata-only";

      record.extractionError =
        String(error);

    }

    enriched.push(record);

  }


  return enriched;

}


/*
 * Parse individual MOFA search-result records.
 */

function parseMOFAResults(html) {

  const records = [];

  /*
   * Convert HTML into readable text while
   * preserving links.
   */

  const anchors =
    extractAnchors(
      html
    );


  /*
   * Look for links into search2.php or
   * individual treaty documents.
   */

  for (
    const anchor of anchors
  ) {

    const title =
      cleanText(
        anchor.text
      );


    const href =
      absoluteURL(
        anchor.href,
        MOFA_SEARCH
      );


    if (!title) {
      continue;
    }


    if (
      !href.includes(
        "mofa.go.jp"
      )
    ) {
      continue;
    }


    const lower =
      title.toLowerCase();


    const looksRelevant =
      JAPAN_TERMS.some(
        term =>
          lower.includes(
            term.toLowerCase()
          )
      );


    if (
      looksRelevant ||
      lower.includes("米国")
    ) {

      records.push({

        source:
          "Japan Ministry of Foreign Affairs",

        title,

        documentUrl:
          href,

        sourceUrl:
          href,

        text:
          "",

        provisions:
          []

      });

    }

  }


  /*
   * Remove duplicates.
   */

  return uniqueRecords(
    records
  );

}


/* =======================================================
 * STATE DEPARTMENT
 * ======================================================= */

async function extractStateRecords() {

  const response =
    await fetch(
      STATE_TREATY_AFFAIRS,
      {
        headers: {
          "User-Agent":
            "GIA-Treaty-Analysis-System/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "State Department request failed: HTTP " +
      response.status
    );

  }


  const html =
    await response.text();


  /*
   * Extract links from the Office of
   * Treaty Affairs page.
   */

  const anchors =
    extractAnchors(
      html
    );


  const records = [];


  for (
    const anchor of anchors
  ) {

    const title =
      cleanText(
        anchor.text
      );


    const href =
      absoluteURL(
        anchor.href,
        STATE_TREATY_AFFAIRS
      );


    if (!title || !href) {
      continue;
    }


    /*
     * Look for treaty/agreements resources.
     */

    const combined =
      (
        title +
        " " +
        href
      ).toLowerCase();


    const relevant =
      combined.includes("treat") ||
      combined.includes("agreement") ||
      combined.includes("force") ||
      combined.includes("text");


    if (!relevant) {
      continue;
    }


    records.push({

      source:
        "U.S. Department of State",

      title,

      documentUrl:
        href,

      sourceUrl:
        href,

      text:
        "",

      provisions:
        []

    });

  }


  /*
   * State's general treaty-affairs page can
   * contain resource links rather than individual
   * bilateral records.
   *
   * Retrieve linked resources and identify
   * U.S.–Japan references.
   */

  const enriched = [];


  for (
    const record of uniqueRecords(records).slice(0, 40)
  ) {

    try {

      const response =
        await fetch(
          record.documentUrl,
          {
            headers: {
              "User-Agent":
                "GIA-Treaty-Analysis-System/1.0"
            }
          }
        );


      if (!response.ok) {
        continue;
      }


      const html =
        await response.text();


      const text =
        htmlToText(
          html
        );


      /*
       * Only retain resources that actually
       * contain U.S.–Japan/Japan references.
       */

      if (
        containsJapanReference(
          text
        )
      ) {

        record.text =
          text;

        record.provisions =
          extractProvisions(
            text
          );

        record.extractionStatus =
          "extracted";

        enriched.push(
          record
        );

      }

    } catch {
      continue;
    }

  }


  return uniqueRecords(
    enriched
  );

}


/* =======================================================
 * TREATY CORPUS
 * ======================================================= */

async function buildTreatyCorpus() {

  const [
    mofa,
    state
  ] =
    await Promise.all([
      extractMOFARecords(),
      extractStateRecords()
    ]);


  /*
   * Keep only actual U.S.–Japan records.
   */

  const mofaJapan =
    mofa.filter(
      isUSJapanRecord
    );


  const stateJapan =
    state.filter(
      record =>
        containsJapanReference(
          (
            record.title +
            " " +
            record.text
          )
        )
    );


  /*
   * Normalize both sources into one corpus.
   */

  const normalized = [
    ...mofaJapan.map(
      record =>
        normalizeRecord(
          record,
          "MOFA"
        )
    ),

    ...stateJapan.map(
      record =>
        normalizeRecord(
          record,
          "STATE"
        )
    )
  ];


  /*
   * Match records appearing in both
   * government sources.
   */

  return matchCrossSourceRecords(
    normalized
  );

}


/* =======================================================
 * NORMALIZATION
 * ======================================================= */

function normalizeRecord(
  record,
  source
) {

  const text =
    cleanText(
      record.text || ""
    );


  return {

    id:
      createRecordID(
        record.title
      ),

    source,

    title:
      record.title,

    documentUrl:
      record.documentUrl,

    sourceUrl:
      record.sourceUrl,

    text,

    provisions:
      record.provisions || extractProvisions(text),

    country:
      "Japan",

    counterpart:
      "United States",

    jurisdiction:
      "U.S.–Japan",

    extracted:
      Boolean(
        text
      )

  };

}


/*
 * Cross-source matching.
 */

function matchCrossSourceRecords(
  records
) {

  const groups =
    new Map();


  for (
    const record of records
  ) {

    const key =
      normalizeTitle(
        record.title
      );


    if (!groups.has(key)) {

      groups.set(
        key,
        []
      );

    }


    groups.get(key).push(
      record
    );

  }


  const output = [];


  for (
    const [
      key,
      group
    ] of groups
  ) {

    const sources =
      [
        ...new Set(
          group.map(
            record =>
              record.source
          )
        )
      ];


    output.push({

      id:
        key,

      title:
        group[0].title,

      jurisdiction:
        "U.S.–Japan",

      sources,

      matchedAcrossSources:
        sources.length > 1,

      records:
        group

    });

  }


  return output;

}


/* =======================================================
 * PROVISION EXTRACTION
 * ======================================================= */

function extractProvisions(
  text
) {

  if (!text) {
    return [];
  }


  const normalized =
    cleanText(
      text
    );


  /*
   * Split legal text into paragraph-like
   * provisions.
   */

  const paragraphs =
    normalized
      .split(
        /\n{2,}|(?<=\.)\s+(?=(?:Article|ARTICLE|第)\s*\d+)/g
      )
      .map(
        item =>
          item.trim()
      )
      .filter(
        item =>
          item.length >= 30
      );


  const provisions =
    [];


  for (
    let i = 0;
    i < paragraphs.length;
    i++
  ) {

    const paragraph =
      paragraphs[i];


    const lower =
      paragraph.toLowerCase();


    const categories =
      [];


    if (
      /\bshall\b|\bmust\b|\brequired\b|\bobligation\b/i.test(
        paragraph
      )
    ) {

      categories.push(
        "obligation"
      );

    }


    if (
      /\bshall not\b|\bmay not\b|\bprohibited\b|\bprohibition\b/i.test(
        paragraph
      )
    ) {

      categories.push(
        "prohibition"
      );

    }


    if (
      /\bmay\b|\bright\b|\bentitled\b/i.test(
        paragraph
      )
    ) {

      categories.push(
        "right"
      );

    }


    if (
      /\bexcept\b|\bexception\b|\bprovided that\b|\bsubject to\b/i.test(
        paragraph
      )
    ) {

      categories.push(
        "exception"
      );

    }


    if (
      /\bdefine\b|\bmeans\b|\bdefinition\b/i.test(
        paragraph
      )
    ) {

      categories.push(
        "definition"
      );

    }


    const subjects =
      detectSubjects(
        lower
      );


    if (
      categories.length ||
      subjects.length
    ) {

      provisions.push({

        number:
          i + 1,

        text:
          paragraph,

        categories:
          [
            ...new Set(
              categories
            )
          ],

        subjects

      });

    }

  }


  return provisions.slice(
    0,
    300
  );

}


/* =======================================================
 * LEGAL COMPARISON
 * ======================================================= */

function compareProvisions(
  proposedProvisions,
  corpus
) {

  const results = [];


  for (
    const proposed of proposedProvisions
  ) {

    const candidates = [];


    /*
     * Compare against every treaty record.
     */

    for (
      const treatyGroup of corpus
    ) {

      for (
        const record of treatyGroup.records
      ) {

        for (
          const treatyProvision of record.provisions
        ) {

          const score =
            provisionSimilarity(
              proposed,
              treatyProvision
            );


          if (
            score >= 0.28
          ) {

            candidates.push({

              score,

              treaty: {
                title:
                  treatyGroup.title,

                source:
                  record.source,

                url:
                  record.documentUrl,

                provisionNumber:
                  treatyProvision.number
              },

              provision:
                treatyProvision

            });

          }

        }

      }

    }


    candidates.sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    );


    const top =
      candidates.slice(
        0,
        10
      );


    results.push({

      proposedProvision:
        proposed,

      potentialConflicts:
        classifyMatches(
          proposed,
          top
        ),

      matches:
        top

    });

  }


  return results;

}


/*
 * Similarity based on legal subjects,
 * legal concepts, and significant terms.
 */

function provisionSimilarity(
  proposed,
  treaty
) {

  const a =
    tokenizeLegalText(
      proposed.text
    );

  const b =
    tokenizeLegalText(
      treaty.text
    );


  if (
    !a.size ||
    !b.size
  ) {

    return 0;

  }


  let shared =
    0;


  for (
    const word of a
  ) {

    if (
      b.has(word)
    ) {

      shared++;

    }

  }


  const lexical =
    shared /
    Math.max(
      1,
      Math.sqrt(
        a.size *
        b.size
      )
    );


  const categoryOverlap =
    overlap(
      proposed.categories,
      treaty.categories
    );


  const subjectOverlap =
    overlap(
      proposed.subjects,
      treaty.subjects
    );


  return Math.min(
    1,
    lexical * 0.55 +
    categoryOverlap * 0.20 +
    subjectOverlap * 0.25
  );

}


/*
 * Identify potentially conflicting relationships.
 */

function classifyMatches(
  proposed,
  matches
) {

  return matches
    .filter(
      match =>
        match.score >= 0.40
    )
    .map(
      match => {

        const treaty =
          match.provision;


        let relationship =
          "related";


        if (
          proposed.categories.includes(
            "obligation"
          ) &&
          treaty.categories.includes(
            "prohibition"
          )
        ) {

          relationship =
            "potential-conflict";

        }


        if (
          proposed.categories.includes(
            "prohibition"
          ) &&
          treaty.categories.includes(
            "obligation"
          )
        ) {

          relationship =
            "potential-conflict";

        }


        if (
          proposed.categories.includes(
            "right"
          ) &&
          treaty.categories.includes(
            "right"
          )
        ) {

          relationship =
            "parallel-right";

        }


        if (
          proposed.categories.includes(
            "exception"
          ) ||
          treaty.categories.includes(
            "exception"
          )
        ) {

          relationship =
            "exception-requires-review";

        }


        return {

          relationship,

          score:
            match.score,

          treaty:
            match.treaty,

          treatyProvision:
            treaty.text

        };

      }
    );

}


/* =======================================================
 * SEARCH
 * ======================================================= */

function searchCorpus(
  corpus,
  query
) {

  const terms =
    tokenizeLegalText(
      query
    );


  const results = [];


  for (
    const group of corpus
  ) {

    for (
      const record of group.records
    ) {

      const searchable =
        (
          record.title +
          " " +
          record.text
        ).toLowerCase();


      let score =
        0;


      for (
        const term of terms
      ) {

        if (
          searchable.includes(
            term
          )
        ) {

          score++;

        }

      }


      if (
        score > 0
      ) {

        results.push({

          score,

          title:
            group.title,

          jurisdiction:
            "U.S.–Japan",

          sources:
            group.sources,

          matchedAcrossSources:
            group.matchedAcrossSources,

          source:
            record.source,

          url:
            record.documentUrl,

          provisions:
            record.provisions

        });

      }

    }

  }


  return results.sort(
    (
      a,
      b
    ) =>
      b.score -
      a.score
  );

}


/* =======================================================
 * OVERALL ASSESSMENT
 * ======================================================= */

function calculateOverallAssessment(
  comparisons
) {

  let conflicts =
    0;

  let reviews =
    0;

  let related =
    0;


  for (
    const comparison of comparisons
  ) {

    for (
      const match of comparison.potentialConflicts
    ) {

      if (
        match.relationship ===
        "potential-conflict"
      ) {

        conflicts++;

      } else if (
        match.relationship ===
        "exception-requires-review"
      ) {

        reviews++;

      } else {

        related++;

      }

    }

  }


  let level =
    "LOW";


  if (
    conflicts >= 3
  ) {

    level =
      "HIGH";

  } else if (
    conflicts ||
    reviews >= 2
  ) {

    level =
      "MODERATE";

  }


  return {

    level,

    potentialConflicts:
      conflicts,

    provisionsRequiringReview:
      reviews,

    relatedProvisions:
      related,

    conclusion:
      conflicts
        ? "Potential inconsistency with one or more extracted U.S.–Japan treaty provisions requires substantive legal review."
        : reviews
          ? "The submitted legislation intersects with treaty provisions or exceptions requiring substantive legal review."
          : related
            ? "Related U.S.–Japan treaty provisions were identified, but no direct conflict was classified by this comparison layer."
            : "No sufficiently similar extracted U.S.–Japan treaty provisions were identified."

  };

}


/* =======================================================
 * HELPERS
 * ======================================================= */

function isUSJapanRecord(
  record
) {

  const text =
    (
      record.title +
      " " +
      record.text
    ).toLowerCase();


  return (
    text.includes("米国") ||
    text.includes("アメリカ合衆国") ||
    text.includes("アメリカ") ||
    text.includes("japan") ||
    text.includes("united states")
  );

}


function containsJapanReference(
  text
) {

  const lower =
    String(
      text || ""
    ).toLowerCase();


  return (
    lower.includes("japan") ||
    lower.includes("japanese") ||
    lower.includes("united states-japan") ||
    lower.includes("u.s.-japan") ||
    lower.includes("u.s.–japan") ||
    lower.includes("united states and japan")
  );

}


function detectSubjects(
  text
) {

  const subjects =
    [];


  const categories = {

    defense: [
      "military",
      "defense",
      "defence",
      "armed forces",
      "force",
      "forces",
      "installation",
      "security"
    ],

    trade: [
      "trade",
      "tariff",
      "customs",
      "import",
      "export",
      "goods",
      "market"
    ],

    technology: [
      "technology",
      "semiconductor",
      "data",
      "cyber",
      "telecommunications",
      "digital"
    ],

    taxation: [
      "tax",
      "taxation",
      "income",
      "withholding",
      "residence"
    ],

    energy: [
      "energy",
      "nuclear",
      "atomic",
      "fuel"
    ],

    transportation: [
      "aviation",
      "aircraft",
      "maritime",
      "shipping",
      "navigation"
    ],

    environment: [
      "environment",
      "environmental",
      "pollution",
      "climate"
    ]

  };


  for (
    const [
      category,
      terms
    ] of Object.entries(
      categories
    )
  ) {

    if (
      terms.some(
        term =>
          text.includes(term)
      )
    ) {

      subjects.push(
        category
      );

    }

  }


  return subjects;

}


function tokenizeLegalText(
  text
) {

  const stop =
    new Set([
      "the",
      "and",
      "that",
      "this",
      "with",
      "from",
      "shall",
      "such",
      "which",
      "their",
      "there",
      "where",
      "under",
      "into",
      "between",
      "within",
      "each",
      "other",
      "than",
      "have",
      "has",
      "been",
      "were",
      "will",
      "would",
      "could",
      "should"
    ]);


  const words =
    String(
      text || ""
    )
      .toLowerCase()
      .replace(
        /[^\p{L}\p{N}\s-]/gu,
        " "
      )
      .split(/\s+/)
      .filter(
        word =>
          word.length >= 4 &&
          !stop.has(word)
      );


  return new Set(
    words
  );

}


function overlap(
  a,
  b
) {

  if (
    !a.length ||
    !b.length
  ) {

    return 0;

  }


  const setB =
    new Set(
      b
    );


  const shared =
    a.filter(
      item =>
        setB.has(item)
    ).length;


  return shared /
    Math.max(
      a.length,
      b.length
    );

}


async function retrieveDocumentText(
  url
) {

  if (!url) {
    return "";
  }


  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "GIA-Treaty-Analysis-System/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "Document request failed: HTTP " +
      response.status
    );

  }


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  /*
   * Worker-native implementation handles
   * HTML directly.
   *
   * PDF binary extraction requires a PDF parser
   * or a separate document-processing service.
   */

  if (
    contentType.includes(
      "text/html"
    ) ||
    !url.toLowerCase().endsWith(
      ".pdf"
    )
  ) {

    const html =
      await response.text();

    return htmlToText(
      html
    );

  }


  /*
   * Preserve a truthful extraction status
   * rather than pretending binary PDF was parsed.
   */

  return "";

}


function htmlToText(
  html
) {

  return String(
    html || ""
  )

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<noscript[\s\S]*?<\/noscript>/gi,
      " "
    )

    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )

    .replace(
      /<\/p>/gi,
      "\n\n"
    )

    .replace(
      /<\/div>/gi,
      "\n"
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /\s+\n/g,
      "\n"
    )

    .replace(
      /\n\s+/g,
      "\n"
    )

    .replace(
      /[ \t]+/g,
      " "
    )

    .trim();

}


function extractAnchors(
  html
) {

  const anchors =
    [];

  const regex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          html
        )
    ) !== null
  ) {

    anchors.push({

      href:
        match[1],

      text:
        htmlToText(
          match[2]
        )

    });

  }


  return anchors;

}


function absoluteURL(
  href,
  base
) {

  try {

    return new URL(
      href,
      base
    ).href;

  } catch {

    return href;

  }

}


function cleanText(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


function normalizeTitle(
  title
) {

  return cleanText(
    title
      .toLowerCase()
      .replace(
        /[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi,
        " "
      )
  );

}


function createRecordID(
  title
) {

  return normalizeTitle(
    title
  )
    .slice(
      0,
      160
    );

}


function uniqueRecords(
  records
) {

  const map =
    new Map();


  for (
    const record of records
  ) {

    const key =
      (
        record.title +
        "|" +
        record.documentUrl
      );


    if (
      !map.has(key)
    ) {

      map.set(
        key,
        record
      );

    }

  }


  return [
    ...map.values()
  ];

}


/* =======================================================
 * JSON
 * ======================================================= */

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
          "*",

        "Cache-Control":
          "no-store"

      }

    }

  );

}
