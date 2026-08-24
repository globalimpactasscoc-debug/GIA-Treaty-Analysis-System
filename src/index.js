export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * API: Health/status
     */
    if (url.pathname === "/api/status") {
      return jsonResponse({
        status: "operational",
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
     * API: MOFA
     */
    if (url.pathname === "/api/mofa") {
      try {
        const result = await getMOFASource();

        return jsonResponse({
          success: true,
          source: "Japan Ministry of Foreign Affairs",
          sourceUrl: result.url,
          retrieved: new Date().toISOString(),
          contentLength: result.contentLength,
          message:
            "MOFA treaty database successfully reached. U.S.–Japan-specific treaty discovery is ready for the search layer."
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
     * API: U.S. Department of State
     */
    if (url.pathname === "/api/state") {
      try {
        const result = await getStateSource();

        return jsonResponse({
          success: true,
          source: "U.S. Department of State",
          sourceUrl: result.url,
          retrieved: new Date().toISOString(),
          contentLength: result.contentLength,
          message:
            "U.S. Department of State treaty resources successfully reached. U.S.–Japan-specific treaty discovery is ready for the search layer."
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
     * API: Search both official sources
     *
     * Example:
     * /api/search?q=military
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
          query: query.trim(),
          jurisdiction: "United States–Japan",
          sources: results
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
     * API: Analyze submitted legal text
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

      let sources = [];

      if (query) {
        try {
          sources = await searchGovernmentSources(query);
        } catch (error) {
          sources = [
            {
              source: "Government source search",
              status: "error",
              error: String(error)
            }
          ];
        }
      }

      return jsonResponse({
        success: true,
        query,
        submittedText: text,
        jurisdiction: "United States–Japan",
        sources,
        message:
          "Government-source retrieval completed. The returned U.S.–Japan treaty records can be used by the comparative legal analysis layer."
      });
    }

    /*
     * Website
     */
    return env.ASSETS.fetch(request);
  }
};


/*
 * Search both official government sources
 */
async function searchGovernmentSources(query) {
  const results = [];

  /*
   * MOFA
   */
  try {
    const mofa = await searchMOFA(query);

    results.push(mofa);
  } catch (error) {
    results.push({
      source: "Japan Ministry of Foreign Affairs",
      status: "error",
      error: String(error)
    });
  }

  /*
   * U.S. Department of State
   */
  try {
    const state = await searchStateDepartment(query);

    results.push(state);
  } catch (error) {
    results.push({
      source: "U.S. Department of State",
      status: "error",
      error: String(error)
    });
  }

  return results;
}


/*
 * MOFA source
 *
 * Official Japan Ministry of Foreign Affairs
 * treaty database.
 */
async function getMOFASource() {
  const url =
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/index.php";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      "MOFA request failed: HTTP " +
      response.status
    );
  }

  const html = await response.text();

  return {
    url,
    contentLength: html.length
  };
}


/*
 * Search MOFA
 *
 * This currently retrieves the official treaty
 * database and identifies it as the Japanese
 * treaty source.
 */
async function searchMOFA(query) {
  const source = await getMOFASource();

  return {
    source:
      "Japan Ministry of Foreign Affairs",

    database:
      "MOFA Treaty Database",

    jurisdiction:
      "United States–Japan",

    searchQuery:
      query,

    url:
      source.url,

    status:
      "source-retrieved",

    contentLength:
      source.contentLength,

    note:
      "Official MOFA treaty database reached successfully. Treaty-specific record extraction is the next source-adapter layer."
  };
}


/*
 * U.S. Department of State source
 */
async function getStateSource() {
  const url =
    "https://2021-2025.state.gov/bureaus-offices/treaty-affairs/";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      "State Department request failed: HTTP " +
      response.status
    );
  }

  const html = await response.text();

  return {
    url,
    contentLength: html.length
  };
}


/*
 * Search U.S. Department of State
 */
async function searchStateDepartment(query) {
  const source = await getStateSource();

  return {
    source:
      "U.S. Department of State",

    database:
      "Office of Treaty Affairs",

    jurisdiction:
      "United States–Japan",

    searchQuery:
      query,

    url:
      source.url,

    status:
      "source-retrieved",

    contentLength:
      source.contentLength,

    note:
      "Official U.S. Department of State treaty resources reached successfully. U.S.–Japan treaty-specific record extraction is the next source-adapter layer."
  };
}


/*
 * Extract useful legal search terms
 */
function extractSearchQuery(text) {
  const words = text
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
    "trade",
    "tariff",
    "tariffs",
    "customs",
    "technology",
    "semiconductor",
    "semiconductors",
    "digital",
    "data",
    "cyber",
    "tax",
    "taxation",
    "income",
    "forces",
    "force",
    "installation",
    "installations",
    "territory",
    "jurisdiction",
    "obligation",
    "obligations",
    "prohibition",
    "exception",
    "exceptions",
    "amendment",
    "amendments",
    "protocol",
    "protocols",
    "Japan",
    "Japanese",
    "United",
    "States",
    "US",
    "U.S."
  ];

  const matches = words.filter(
    word =>
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
 * JSON response helper
 */
function jsonResponse(data, status = 200) {
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

        "Access-Control-Allow-Methods":
          "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"
      }
    }
  );
}
