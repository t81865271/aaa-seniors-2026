export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({ error: "Telegram is not configured." });
    }

    const { name_ar, name_en, major, universities } = req.body || {};

    const message = `
🎓 New ACA Senior Submission

Arabic Name:
${name_ar || "-"}

English Name:
${name_en || "-"}

Major:
${major || "-"}

Applying To:
${universities || "-"}

Open Admin:
https://seniors2026.site/admin.html
`;

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      return res.status(500).json({
        error: "Telegram failed.",
        details: telegramData
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
