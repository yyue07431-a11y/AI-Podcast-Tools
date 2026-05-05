export default async function handler(req, res) {
  try {
    const { text } = req.body;

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v1/tts_v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VOLC_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app: {
            appid: process.env.VOLC_APP_ID,
          },
          user: {
            uid: "podcast-user",
          },
          audio: {
            voice_type: "BV001_streaming",
            encoding: "mp3",
            speed_ratio: 1.0,
          },
          request: {
            reqid: Date.now().toString(),
            text,
            text_type: "plain",
          },
        }),
      }
    );

    const data = await response.json();

    if (data.code !== 3000) {
      return res.status(500).json({
        error: data.message,
        detail: data,
      });
    }

    const audioBuffer = Buffer.from(data.data, "base64");

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
