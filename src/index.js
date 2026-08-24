const MOFA_SEARCH_URL =
  "https://www3.mofa.go.jp/mofaj/gaiko/treaty/search2.php?pID=67";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/api/status") {
      return Response.json(
        {
          status: "online",
          sources: [
            "Japan Ministry of Foreign Affairs (MOFA)",
            "U.S. Department of State",
          ],
        },
        { headers: corsHeaders }
      );
    }

    if (url.pathname === "/api/mofa") {
      try {
        const response = await fetch(MOFA_SEARCH_URL, {
          headers: {
            "User-Agent": "GIA-Treaty-Analysis-System/1.0",
          },
        });

        if (!response.ok) {
          return Response.json(
            {
              success: false,
              error: `MOFA returned HTTP ${response.status}`,
            },
            {
              status: 502,
              headers: corsHeaders,
            }
          );
        }

        const html = await response.text();

        return Response.json(
          {
            success: true,
            source: "Japan Ministry of Foreign Affairs",
            sourceUrl: MOFA_SEARCH_URL,
            retrieved: new Date().toISOString(),
            contentLength: html.length,
            message:
              "MOFA treaty database successfully reached. Document extraction will be added next.",
          },
          {
            headers: corsHeaders,
          }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message,
          },
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
