async function sendEmail(to, subject, html) {
  if (to.includes("+seed")) return;
  const BREVO_KEY = process.env.BREVO_API_KEY;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Tu pars où en échange ?", email: "monzatpaul@gmail.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { newStudent, matches } = req.body;
  if (!process.env.BREVO_API_KEY) return res.status(500).json({ error: "Missing API key" });

  const dest = newStudent.destination.school;
  const city = newStudent.destination.city;
  const country = newStudent.destination.country;
  const semLabel = { fall: "Fall", spring: "Spring", double: "Double diplôme" }[newStudent.semester] || newStudent.semester;

  const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:2rem 1rem;color:#111110`;
  const mutedStyle = `color:#6f6f6b;font-size:14px;line-height:1.6`;
  const cardStyle = `padding:14px 16px;border:1px solid rgba(0,0,0,0.09);border-radius:10px;margin-bottom:1rem`;
  const waBtn = (whatsapp) => whatsapp
    ? `<a href="https://wa.me/${whatsapp.replace(/\D/g,"")}" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Contacter sur WhatsApp</a>`
    : "";
  const footer = `<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.09)"><p style="${mutedStyle}">Retrouve tous tes matchs sur <a href="https://tu-pars-ou.vercel.app" style="color:#111110;font-weight:500">tu-pars-ou.vercel.app</a></p></div>`;

  const realMatches = matches.filter(m => !m.email?.includes("+seed"));

  if (realMatches.length > 0) {
    const matchList = realMatches.map(m => `
      <div style="${cardStyle}">
        <p style="margin:0 0 2px;font-weight:600;font-size:15px">${m.firstName} ${m.lastName}</p>
        <p style="margin:0;${mutedStyle}">${{ fall: "Fall", spring: "Spring", double: "Double diplôme" }[m.semester] || m.semester}</p>
        ${waBtn(m.whatsapp)}
      </div>`).join("");

    await sendEmail(
      newStudent.email,
      `${realMatches.length} étudiant${realMatches.length > 1 ? "s" : ""} part${realMatches.length > 1 ? "ent" : ""} avec toi à ${city}`,
      `<div style="${baseStyle}">
        <p style="font-size:13px;font-weight:600;color:#6f6f6b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Tu pars où en échange ?</p>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px">Bienvenue !</h1>
        <p style="margin:0 0 1.5rem;${mutedStyle}">Tu t'es inscrit pour <strong style="color:#111110">${dest}</strong> · ${city}, ${country} · ${semLabel}</p>
        <p style="font-weight:600;margin:0 0 12px;font-size:15px">${realMatches.length} étudiant${realMatches.length > 1 ? "s" : ""} part${realMatches.length > 1 ? "ent" : ""} au même endroit :</p>
        ${matchList}
        ${footer}
      </div>`
    );
  } else {
    await sendEmail(
      newStudent.email,
      `Inscription confirmée — ${dest}`,
      `<div style="${baseStyle}">
        <p style="font-size:13px;font-weight:600;color:#6f6f6b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Tu pars où en échange ?</p>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px">Inscription confirmée !</h1>
        <p style="margin:0 0 1.5rem;${mutedStyle}">Tu t'es inscrit pour <strong style="color:#111110">${dest}</strong> · ${city}, ${country} · ${semLabel}</p>
        <p style="${mutedStyle}">Tu es le premier pour cette destination. On t'enverra un email dès que quelqu'un d'autre s'inscrit.</p>
        ${footer}
      </div>`
    );
  }

  for (const match of matches) {
    if (!match.email || match.email.includes("+seed")) continue;
    await sendEmail(
      match.email,
      `Nouveau : ${newStudent.firstName} part aussi à ${city}`,
      `<div style="${baseStyle}">
        <p style="font-size:13px;font-weight:600;color:#6f6f6b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Tu pars où en échange ?</p>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px">Nouveau match !</h1>
        <p style="margin:0 0 1.5rem;${mutedStyle}"><strong style="color:#111110">${newStudent.firstName} ${newStudent.lastName}</strong> vient de s'inscrire pour <strong style="color:#111110">${dest}</strong> · ${city}.</p>
        <div style="${cardStyle}">
          <p style="margin:0 0 2px;font-weight:600;font-size:15px">${newStudent.firstName} ${newStudent.lastName}</p>
          <p style="margin:0;${mutedStyle}">${semLabel}</p>
          ${waBtn(newStudent.whatsapp)}
        </div>
        <a href="https://tu-pars-ou.vercel.app" style="display:block;text-align:center;padding:12px;background:#111110;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin-top:8px">Voir tous mes matchs</a>
        ${footer}
      </div>`
    );
  }

  res.status(200).json({ ok: true });
}
