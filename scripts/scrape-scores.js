
(async () => {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY manquante");
  }

  const todayParis = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris"
  }).format(new Date());

  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("date", todayParis);
  url.searchParams.set("timezone", "Europe/Paris");

  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey }
  });

  const json = await res.json();

  console.log("Date demandée :", todayParis);
  console.log("HTTP :", res.status);
  console.log("Erreurs API :", JSON.stringify(json.errors));
  console.log("Nombre de résultats API :", json.results);
  console.log("Nombre de matchs reçus :", json.response?.length);

  if (!res.ok || json.errors?.length) {
    console.error("Réponse API :", json);
    process.exit(1);
  }

  for (const match of json.response || []) {
    console.log(
      match.league.id,
      match.league.name,
      "|",
      match.teams.home.name,
      "-",
      match.teams.away.name,
      "|",
      match.fixture.status.short,
      "|",
      match.goals.home,
      "-",
      match.goals.away
    );
  }
})();
