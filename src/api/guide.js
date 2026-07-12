export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { destination } = req.body;
  if (!destination) return res.status(400).json({ error: "Missing destination" });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Missing API key" });

  const prompt = `Tu es un conseiller expert pour les étudiants en échange universitaire emlyon.
Génère une fiche pratique concise pour un étudiant qui part à ${destination.school} à ${destination.city}, ${destination.country}.

Réponds UNIQUEMENT en JSON valide, sans balises markdown, avec exactement cette structure :
{
  "budget": "2-3 phrases sur le budget mensuel estimé : loyer, nourriture, transport, total estimé",
  "logement": "2-3 phrases sur comment trouver un logement : plateformes recommandées, quartiers, timing",
  "culture": "2-3 phrases sur la culture locale, la langue, et les incontournables à faire sur place"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content.map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const guide = JSON.parse(clean);
    res.status(200).json(guide);
  } catch (e) {
    res.status(500).json({ error: "Generation failed" });
  }
}
