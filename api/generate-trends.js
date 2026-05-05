export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing KIMI_API_KEY",
      });
    }

    const prompt = `
你是一个播客选题策划助手。

请模拟聚合 X、Instagram、Google Trends、微博、小红书、头条的热点，生成 8 个适合播客创作的热点选题。

每个热点必须包含：
- title
- source
- platform
- category：只能是 政治、名人、娱乐、社会、科技、商业
- heat：0-100
- summary
- tags：3个精准中文标签，不要写“热点”“播客”这种泛标签

严格返回 JSON，不要 markdown，不要解释：
{
  "trends": [
    {
      "title": "",
      "source": "",
      "platform": "",
      "category": "",
      "heat": 88,
      "summary": "",
      "tags": ["", "", ""]
    }
  ]
}
`;

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content: "你是一个严格返回合法 JSON 的助手。不要输出 markdown。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Kimi API 返回的不是 JSON",
        raw,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi API request failed",
        detail: data,
      });
    }

    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(500).json({
          error: "AI 内容不是 JSON",
          raw: content,
        });
      }
      parsed = JSON.parse(match[0]);
    }

    return res.status(200).json({
      trends: Array.isArray(parsed.trends) ? parsed.trends : [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "generate-trends failed",
    });
  }
}
