export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") {
      return Response.json({
        status: "online",
        sources: [
          "Japan Ministry of Foreign Affairs (MOFA)",
          "U.S. Department of State"
        ]
      });
    }

    return env.ASSETS.fetch(request);
  }
};
