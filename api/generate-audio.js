export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, voice = "female" } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const appid = process.env.VOLC_APP_ID;
    const token = process.env.VOLC_ACCESS_TOKEN;
    const cluster = process.env.VOLC_CLUSTER || "volcano_tts";

    const voiceType =
      voice === "male" ? "BV002_streaming" : "BV001_streaming";

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v1/tts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer;${token}`,
        },
        body: JSON.stringify({
          app: {
            appid,
            token,
            cluster,
          },
          user: {
            uid: "podcast-user",
          },
          audio: {
            voice_type: voiceType,
            encoding: "mp3",
            speed_ratio: 1.0,
          },
          request: {
            reqid: Date.now().toString(),
            text,
            text_type: "plain",
            operation: "query",
          },
        }),
      }
    );

    // 🔥 一定要分开写（避免语法错误）
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return res.status(500).json({
        error: "JSON parse failed",
        detail: raw,
      });
    }

    if (data.code !== 3000) {
      return res.status(500).json({
        error: data.message,
        detail: data,
      });
    }

    const audioBuffer = Buffer.from(data.data, "base64");

    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(audioBuffer);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
