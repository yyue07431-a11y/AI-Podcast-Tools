export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const { input } = req.body || {};

    if (!input) {
      return res.status(400).json({ error: "No input provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: "你是一个专业的播客内容创作助手，擅长结构化表达、吸引听众。",
          },
          {
            role: "user",
            content: `根据以下内容生成一个结构清晰、有吸引力的播客脚本：${input}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();

    const script = data?.choices?.[0]?.message?.content;

    if (!script) {
      return res.status(500).json({ error: "No script generated" });
    }

    return res.status(200).json({ script });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
