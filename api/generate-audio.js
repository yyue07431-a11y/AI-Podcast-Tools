export default async function handler(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // ⚠️ 这里只是示例（阿里云 TTS 需要 token）
    // 实际推荐你用更简单方案👇

    const response = await fetch("https://api.moonshot.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshot-v1-tts",   // 👉 Kimi TTS（更简单）
        input: text,
        voice: "female",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}
