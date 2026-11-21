
(async () => {
  const key = process.env.API_FOOTBALL_KEY;

  const urls = [
    "https://v3.football.api-sports.io/status",
    "https://v3.football.api-sports.io/fixtures?live=all",
    "https://v3.football.api-sports.io/fixtures?next=10"
  ];

  for (const url of urls) {
    console.log("\nTEST :", url);

    const res = await fetch(url, {
      headers: { "x-apisports-key": key }
    });

    const json = await res.json();

    console.log("HTTP :", res.status);
    console.log("Errors :", json.errors);
    console.log("Results :", json.results);
    console.log("Response :", JSON.stringify(json.response).slice(0, 1500));
  }
})();
