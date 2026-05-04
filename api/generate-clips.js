export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    const apiKey = process.env.KIMI_API_KEY;

    const prompt = `
你是一个播客剪辑专家。

请从下面的播客脚本中，挑选出最适合做短视频传播的3个片段。

要求：
1. 每段 20-40 秒内容（文字长度控制）
2. 要有“观点/冲突/金句”
3. 适合抖音、小红书传播
4. 给每段一个标题（吸引点击）
5. 给一个评分（80-100）
6. 给一个推荐理由

脚本：
${script}

只返回 JSON：
[
  {
    "title": "标题",
    "content": "片段内容",
    "score": 95,
    "reason": "为什么适合传播"
  }
]
`;

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content: "你是播客剪辑专家，只返回JSON",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data });
    }

    let clips;
    const content = data.choices?.[0]?.message?.content || "";

    try {
      clips = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        return res.status(500).json({
          error: "Invalid JSON",
          raw: content,
        });
      }
      clips = JSON.parse(match[0]);
    }

    return res.status(200).json({ clips });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
