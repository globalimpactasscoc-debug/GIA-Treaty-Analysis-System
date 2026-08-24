export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        /*
         * API: Health check
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
         * API: Search treaty sources
         */
        if (url.pathname === "/api/search") {

            const query =
                url.searchParams.get("q");

            if (!query) {

                return jsonResponse(
                    {
                        error: "Missing search query"
                    },
                    400
                );

            }


            const results = await searchGovernmentSources(
                query
            );


            return jsonResponse({
                query,
                results
            });

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
                        error: "No legal text supplied"
                    },
                    400
                );

            }


            /*
             * Search the official sources using
             * terms extracted from the submitted text.
             */

            const query =
                extractSearchQuery(text);


            const sourceResults =
                await searchGovernmentSources(
                    query
                );


            /*
             * Return the source material to the
             * comparison layer.
             */

            return jsonResponse({

                query,

                submittedText: text,

                sources: sourceResults,

                message:
                    "Government-source retrieval completed. Comparative legal analysis can now be performed against the returned treaty records."

            });

        }


        /*
         * Serve the website.
         */

        return env.ASSETS.fetch(request);

    }
};


/*
 * Search both government sources.
 */

async function searchGovernmentSources(query) {

    const results = [];


    /*
     * MOFA official treaty database
     */

    try {

        const mofaResults =
            await searchMOFA(query);

        results.push(...mofaResults);

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
     * U.S. Department of State
     */

    try {

        const stateResults =
            await searchStateDepartment(query);

        results.push(...stateResults);

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


/*
 * MOFA treaty database.
 *
 * MOFA's treaty database is a searchable HTML
 * application rather than a simple JSON API.
 *
 * This function establishes the official source
 * and retrieves its search page.
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

        url,

        status:
            "source-retrieved",

        note:
            "MOFA treaty database retrieved. Search/form parsing should be added according to the database's current form parameters.",

        pageLength:
            html.length

    }];

}


/*
 * U.S. Department of State.
 *
 * The Office of Treaty Affairs publishes:
 *
 * - Treaties in Force
 * - Texts of Agreements
 * - Treaties Pending in the Senate
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
            "State Department treaty resources retrieved. Treaty-specific document discovery should be added to the source adapter.",

        pageLength:
            html.length

    }];

}


/*
 * Extract useful search terms from submitted
 * legal text.
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


    /*
     * Keep the query reasonably small.
     */

    return [
        ...new Set(matches)
    ]
        .slice(0, 12)
        .join(" ");

}


/*
 * JSON response helper.
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
