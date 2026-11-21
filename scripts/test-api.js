
(async () => {
  const key = process.env.API_FOOTBALL_KEY;

  console.log("Clé présente :", !!key);
  console.log("Longueur clé :", key?.length);

  const res = await fetch(
    "https://v3.football.api-sports.io/status",
    {
      headers: {
        "x-apisports-key": key
      }
    }
  );

  console.log("HTTP :", res.status);

  console.log(
    "Quota restant :",
    res.headers.get("x-ratelimit-requests-remaining")
  );

  const data = await res.json();

  console.log(JSON.stringify(data, null, 2));
})();
