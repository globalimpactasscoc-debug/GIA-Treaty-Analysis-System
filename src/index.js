var __defProp = Object.defineProperty;

var __name = (target, value) =>
  __defProp(target, "name", {
    value,
    configurable: true
  });

/*
 * GIA Treaty Analysis System
 * Cloudflare Worker
 *
 * Available routes:
 *
 * /api/status
 * /api/mofa
 * /api/state
 * /api/search?q=...
 * /api/analyze
 */

var worker_default = {

  async fetch(request, env) {

    const url = new URL(request.url);


    /*
     * API STATUS
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
     * DIRECT MOFA ENDPOINT
     *
     * Tests whether the Japan Ministry
     * of Foreign Affairs treaty database
     * can be reached by the Worker.
     */

    if (url.pathname === "/api/mofa") {

      try {

        const result =
          await retrieveMOFASource();

        return jsonResponse({

          success: true,

          source:
            "Japan Ministry of Foreign Affairs",

          sourceUrl:
            result.url,

          retrieved:
            new Date().toISOString(),

          contentLength:
            result.contentLength,

          message:
            "MOFA treaty database successfully reached. Document extraction will be added next."

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          source:
            "Japan Ministry of Foreign Affairs",

          error:
            String(error)

        }, 502);

      }

    }


    /*
     * DIRECT STATE DEPARTMENT ENDPOINT
     *
     * Tests whether the U.S. Department
     * of State treaty resources can be
     * reached by the Worker.
     */

    if (url.pathname === "/api/state") {

      try {

        const result =
          await retrieveStateDepartmentSource();

        return jsonResponse({

          success: true,

          source:
            "U.S. Department of State",

          sourceUrl:
            result.url,

          retrieved:
            new Date().toISOString(),

          contentLength:
            result.contentLength,

          message:
            "U.S. Department of State treaty resources successfully reached. Document discovery and extraction will be added next."

        });

      } catch (error) {

        return jsonResponse({

          success: false,

          source:
            "U.S. Department of State",

          error:
            String(error)

        }, 502);

      }

    }


    /*
     * GOVERNMENT SOURCE SEARCH
     *
     * Example:
     *
     * /api/search?q=security treaty
     */

    if (url.pathname === "/api/search") {

      const query =
        url.searchParams.get("q");


      if (!query) {

        return jsonResponse({

          error:
            "Missing search query"

        }, 400);

      }


      const results =
        await searchGovernmentSources(query);


      return jsonResponse({

        query,

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

        body =
          await request.json();

      } catch {

        return jsonResponse({

          error:
            "Invalid JSON request"

        }, 400);

      }


      const text =
        typeof body.text === "string"
          ? body.text
          : "";


      if (!text.trim()) {

        return jsonResponse({

          error:
            "No legal text supplied"

        }, 400);

      }


      const query =
        extractSearchQuery(text);


      const sourceResults =
        await searchGovernmentSources(query);


      return jsonResponse({

        query,

        submittedText:
          text,

        sources:
          sourceResults,

        message:
          "Government-source retrieval completed. Comparative legal analysis can now be performed against the returned treaty records."

      });

    }


    /*
     * FRONTEND / STATIC ASSETS
     */

    return env.ASSETS.fetch(request);

  }

};


__name(
  worker_default,
  "worker_default"
);


/*
 * SEARCH BOTH GOVERNMENT SOURCES
 */

async function searchGovernmentSources(query) {

  const results = [];


  /*
   * MOFA
   */

  try {

    const mofaResults =
      await searchMOFA(query);

    results.push(
      ...mofaResults
    );

  } catch (error) {

    results.push({

      source:
        "Japan Ministry of Foreign Affairs",

      status:
        "error",

      error:
        String(error)

    });

  }


  /*
   * STATE DEPARTMENT
   */

  try {

    const stateResults =
      await searchStateDepartment(query);

    results.push(
      ...stateResults
    );

  } catch (error) {

    results.push({

      source:
        "U.S. Department of State",

      status:
        "error",

      error:
        String(error)

    });

  }


  return results;

}


__name(
  searchGovernmentSources,
  "searchGovernmentSources"
);


/*
 * MOFA SOURCE RETRIEVAL
 */

async function retrieveMOFASource() {

  const url =
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=67";


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


  return {

    url,

    html,

    contentLength:
      html.length

  };

}


__name(
  retrieveMOFASource,
  "retrieveMOFASource"
);


/*
 * STATE DEPARTMENT SOURCE RETRIEVAL
 *
 * This is currently the Office of Treaty
 * Affairs resource used by the existing
 * project.
 */

async function retrieveStateDepartmentSource() {

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


  return {

    url,

    html,

    contentLength:
      html.length

  };

}


__name(
  retrieveStateDepartmentSource,
  "retrieveStateDepartmentSource"
);


/*
 * MOFA SEARCH ADAPTER
 */

async function searchMOFA(query) {

  const encoded =
    encodeURIComponent(query);


  const url =
    "https://www3.mofa.go.jp/mofaj/gaiko/treaty/index.php";


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


  return [{

    source:
      "Japan Ministry of Foreign Affairs",

    database:
      "MOFA Treaty Database",

    searchQuery:
      query,

    encodedQuery:
      encoded,

    url,

    status:
      "source-retrieved",

    note:
      "MOFA treaty database retrieved. Treaty-specific search and document extraction will be added next.",

    pageLength:
      html.length

  }];

}


__name(
  searchMOFA,
  "searchMOFA"
);


/*
 * STATE DEPARTMENT SEARCH ADAPTER
 */

async function searchStateDepartment(query) {

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


  return [{

    source:
      "U.S. Department of State",

    database:
      "Office of Treaty Affairs",

    searchQuery:
      query,

    url,

    status:
      "source-retrieved",

    note:
      "State Department treaty resources retrieved. Treaty-specific document discovery and extraction will be added next.",

    pageLength:
      html.length

  }];

}


__name(
  searchStateDepartment,
  "searchStateDepartment"
);


/*
 * EXTRACT IMPORTANT SEARCH TERMS
 * FROM SUBMITTED LEGAL TEXT
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

    "forces",

    "installation",

    "territory",

    "jurisdiction",

    "obligation",

    "prohibition",

    "exception",

    "amendment",

    "protocol"

  ];


  const matches =
    words.filter(

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


__name(
  extractSearchQuery,
  "extractSearchQuery"
);


/*
 * JSON RESPONSE HELPER
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


__name(
  jsonResponse,
  "jsonResponse"
);


/*
 * EXPORT WORKER
 */

export {

  worker_default as default

};
