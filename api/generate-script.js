export default async function handler(req, res) {
  try {
    const { input } = req.body;

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
        messages: [
          {
            role: "system",
            content: "你是一个播客内容创作助手",
          },
          {
            role: "user",
            content: `根据以下内容生成播客脚本：${input}`,
          },
        ],
      }),
    });

    const data = await response.json();

    return res.status(200).json({
      script: data.choices[0].message.content,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
