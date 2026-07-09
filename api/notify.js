export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { newStudent, matches } = req.body;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_KEY) return res.status(500).json({ error: "Missing API key" });

  const send = async (to, subject, html) => {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Tu pars où ? <onboarding@resend.dev>",
        to,
        subject,
        html
      })
    });
  };

  const dest = `${newStudent.destination.school} – ${newStudent.destination.city}, ${newStudent.destination.country}`;
  const semLabel = { fall: "Fall", spring: "Spring", both: "Fall & Spring" }[newStudent.semester] || newStudent.semester;

  // Email au nouvel inscrit avec la liste de ses matchs
  if (matches.length > 0) {
    const matchList = matches.map(m => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0efe9">
          <strong>${m.firstName} ${m.lastName}</strong><br>
          <span style="color:#6b6b6b;font-size:13px">${{ fall: "Fall", spring: "Spring", both: "Fall & Spring" }[m.semester] || m.semester}</span>
          ${m.whatsapp ? `<br><a href="https://wa.me/${m.whatsapp.replace(/\s/g,"").replace(/^0/,"+33")}" style="color:#25D366;font-size:13px">Contacter sur WhatsApp</a>` : ""}
        </td>
      </tr>`).join("");

    await send(
      newStudent.email,
      ` ${matches.length} étudiant${matches.length > 1 ? "s" : ""} part${matches.length > 1 ? "ent" : ""} avec toi à ${newStudent.destination.city} !`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem 1rem">
        <h2 style="font-size:20px;font-weight:500;margin:0 0 8px">Tu pars où ? </h2>
        <p style="color:#6b6b6b;margin:0 0 1.5rem">Tu viens de t'inscrire pour <strong>${dest}</strong> (${semLabel}).</p>
        <p style="font-weight:500;margin:0 0 12px">${matches.length} étudiant${matches.length > 1 ? "s" : ""} part${matches.length > 1 ? "ent" : ""} au même endroit :</p>
        <table style="width:100%;border-collapse:collapse">${matchList}</table>
        <div style="margin-top:1.5rem;padding:12px 14px;background:#f7f7f5;border-radius:8px">
          <p style="margin:0;font-size:13px;color:#6b6b6b">Retrouve tous tes matchs sur <a href="https://tu-pars-ou.vercel.app" style="color:#1a1a1a">tu-pars-ou.vercel.app</a></p>
        </div>
      </div>`
    );
  }

  // Email à chaque match existant pour les prévenir du nouvel inscrit
  for (const match of matches) {
    if (!match.email) continue;
    await send(
      match.email,
      ` Quelqu'un part avec toi à ${newStudent.destination.city} !`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem 1rem">
        <h2 style="font-size:20px;font-weight:500;margin:0 0 8px">Tu pars où ? </h2>
        <p style="color:#6b6b6b;margin:0 0 1.5rem">Un nouvel étudiant vient de s'inscrire pour <strong>${dest}</strong> !</p>
        <div style="padding:14px;border:0.5px solid #e5e7eb;border-radius:8px;margin-bottom:1.5rem">
          <p style="margin:0 0 4px;font-weight:500">${newStudent.firstName} ${newStudent.lastName}</p>
          <p style="margin:0;font-size:13px;color:#6b6b6b">${semLabel}</p>
          ${newStudent.whatsapp ? `<a href="https://wa.me/${newStudent.whatsapp.replace(/\s/g,"").replace(/^0/,"+33")}" style="display:inline-block;margin-top:8px;padding:6px 12px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:13px">Contacter sur WhatsApp</a>` : ""}
        </div>
        <div style="padding:12px 14px;background:#f7f7f5;border-radius:8px">
          <p style="margin:0;font-size:13px;color:#6b6b6b">Retrouve tous tes matchs sur <a href="https://tu-pars-ou.vercel.app" style="color:#1a1a1a">tu-pars-ou.vercel.app</a></p>
        </div>
      </div>`
    );
  }

  res.status(200).json({ ok: true });
}
