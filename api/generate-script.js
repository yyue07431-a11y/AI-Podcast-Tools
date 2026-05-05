export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      input,
      model = "kimi",
      messages = [],
      currentScript = "",
      selectedTopics = [],
    } = req.body || {};

    if (!input) {
      return res.status(400).json({ error: "Missing input" });
    }

    const apiKey = process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing KIMI_API_KEY" });
    }

    const topicText = selectedTopics
      .map(
        (topic) =>
          `【${topic.platform || "未知平台"}】${topic.title}
分类：${topic.category || "未分类"}
摘要：${topic.summary || ""}
标签：${Array.isArray(topic.tags) ? topic.tags.join("、") : ""}`,
      )
      .join("\n\n");

    const safeHistory = Array.isArray(messages)
      ? messages.slice(-10).map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: String(message.content || "").slice(0, 4000),
        }))
      : [];

    const kimiMessages = [
      {
        role: "system",
        content: `
你是一个专业中文播客脚本编辑。
你必须进行真实多轮对话式改稿。
你需要参考：
1. 当前脚本
2. 已选择热点
3. 历史对话
4. 用户最新指令

重要规则：
- 如果用户要求修改脚本，你必须基于当前脚本修改，不要重新生成无关内容。
- 如果用户要求换语言、换结构、缩短、扩写、改风格，你必须严格执行。
- 输出只给最终脚本，不要解释你做了什么。
`,
      },
      {
        role: "user",
        content: `
当前脚本：
${currentScript || "暂无当前脚本"}

已选择热点：
${topicText || "暂无热点"}
`,
      },
      ...safeHistory,
      {
        role: "user",
        content: input,
      },
    ];

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: kimiMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Kimi API request failed",
        detail: data,
      });
    }

    return res.status(200).json({
      script: data.choices?.[0]?.message?.content || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
