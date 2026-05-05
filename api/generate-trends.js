async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 AI-Podcast-Tools",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${url}`);
  }

  return response.text();
}

function decodeHtml(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractRssItems(xml, source, platform, limit = 8) {
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, limit);

  return items.map((match, index) => {
    const item = match[0];

    const titleMatch =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      item.match(/<title>(.*?)<\/title>/);

    const descMatch =
      item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
      item.match(/<description>(.*?)<\/description>/);

    const title = decodeHtml(titleMatch?.[1] || `${platform} 热点 ${index + 1}`);
    const description = decodeHtml(descMatch?.[1] || "");

    return {
      title: title.replace(/<[^>]+>/g, "").trim(),
      summary: description.replace(/<[^>]+>/g, "").slice(0, 180).trim(),
      source,
      platform,
    };
  });
}

async function fetchGoogleNews(keyword = "AI OR creator economy OR entertainment OR business") {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    keyword,
  )}&hl=zh-CN&gl=SG&ceid=SG:zh-Hans`;

  const xml = await fetchText(url);
  return extractRssItems(xml, "Google News RSS", "Google News", 10);
}

async function fetchRedditHot() {
  const subreddits = ["technology", "entertainment", "worldnews", "business"];
  const results = [];

  for (const subreddit of subreddits) {
    try {
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
        headers: {
          "User-Agent": "AI-Podcast-Tools/1.0",
        },
      });

      if (!response.ok) continue;

      const data = await response.json();

      const posts =
        data?.data?.children
          ?.map((item) => ({
            title: item?.data?.title,
            summary: item?.data?.selftext?.slice(0, 180) || "",
            source: `Reddit r/${subreddit}`,
            platform: "Reddit",
          }))
          .filter((item) => item.title) || [];

      results.push(...posts);
    } catch {
      continue;
    }
  }

  return results;
}

function extractJsonObject(text = "") {
  const cleaned = String(text)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI 没有返回 JSON 对象");
  }

  return cleaned.slice(start, end + 1);
}

async function repairJsonWithKimi(badJson, apiKey) {
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
          content:
            "你是 JSON 修复器。只输出修复后的合法 JSON，不要解释，不要 markdown，不要代码块。",
        },
        {
          role: "user",
          content: `请修复下面这段 JSON，使它成为合法 JSON。不要改变字段含义，只补齐缺失逗号、引号或括号。只返回 JSON：\n\n${badJson}`,
        },
      ],
      temperature: 0,
    }),
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const content = data.choices?.[0]?.message?.content || "";

  try {
    return JSON.parse(extractJsonObject(content));
  } catch {
    return null;
  }
}

async function safeParseAiJson(content = "", apiKey) {
  const jsonText = extractJsonObject(content);

  try {
    return JSON.parse(jsonText);
  } catch {
    return repairJsonWithKimi(jsonText, apiKey);
  }
}

function guessCategory(text = "") {
  const value = String(text).toLowerCase();

  if (
    value.includes("ai") ||
    value.includes("openai") ||
    value.includes("apple") ||
    value.includes("google") ||
    value.includes("tech") ||
    value.includes("technology") ||
    value.includes("人工智能") ||
    value.includes("科技")
  ) {
    return "科技";
  }

  if (
    value.includes("business") ||
    value.includes("market") ||
    value.includes("economy") ||
    value.includes("stock") ||
    value.includes("公司") ||
    value.includes("商业") ||
    value.includes("经济")
  ) {
    return "商业";
  }

  if (
    value.includes("celebrity") ||
    value.includes("actor") ||
    value.includes("singer") ||
    value.includes("明星") ||
    value.includes("名人")
  ) {
    return "名人";
  }

  if (
    value.includes("movie") ||
    value.includes("music") ||
    value.includes("netflix") ||
    value.includes("entertainment") ||
    value.includes("综艺") ||
    value.includes("娱乐") ||
    value.includes("电影")
  ) {
    return "娱乐";
  }

  if (
    value.includes("president") ||
    value.includes("election") ||
    value.includes("government") ||
    value.includes("policy") ||
    value.includes("政治") ||
    value.includes("选举")
  ) {
    return "政治";
  }

  return "社会";
}

function buildFallbackTags(item) {
  const text = `${item.title || ""} ${item.summary || ""}`.toLowerCase();

  if (text.includes("ai") || text.includes("openai") || text.includes("人工智能")) {
    return ["模型竞争", "技术产业化", "创作者影响"];
  }

  if (text.includes("reddit")) {
    return ["海外讨论", "社区情绪", "用户观点"];
  }

  if (text.includes("business") || text.includes("market") || text.includes("经济")) {
    return ["商业变化", "市场信号", "消费趋势"];
  }

  if (text.includes("entertainment") || text.includes("music") || text.includes("movie")) {
    return ["娱乐内容", "粉丝传播", "社媒讨论"];
  }

  return ["真实趋势", "社会讨论", "内容选题"];
}

function buildFallbackTrends(rawTopics = []) {
  return rawTopics.slice(0, 8).map((item, index) => {
    const category = guessCategory(`${item.title || ""} ${item.summary || ""}`);

    return {
      title: item.title || `真实热点 ${index + 1}`,
      source: item.source || item.platform || "真实数据源",
      platform: item.platform || item.source || "真实数据源",
      category,
      heat: Math.max(70, 92 - index * 3),
      summary:
        item.summary ||
        "该热点来自真实新闻或社区数据源，具备讨论度，适合展开播客内容。",
      tags: buildFallbackTags(item),
    };
  });
}

function normalizeTrendItem(item, index) {
  const categoryList = ["政治", "名人", "娱乐", "社会", "科技", "商业"];
  const category = categoryList.includes(item?.category)
    ? item.category
    : guessCategory(`${item?.title || ""} ${item?.summary || ""}`);

  const tags = Array.isArray(item?.tags) && item.tags.length > 0
    ? item.tags.filter(Boolean).map(String).slice(0, 5)
    : buildFallbackTags(item);

  return {
    id: String(Date.now() + index),
    title: String(item?.title || `真实热点 ${index + 1}`).trim(),
    source: String(item?.source || item?.platform || "真实数据源").trim(),
    platform: String(item?.platform || item?.source || "真实数据源").trim(),
    category,
    heat: Number.isFinite(Number(item?.heat)) ? Number(item.heat) : Math.max(70, 90 - index * 3),
    summary: String(item?.summary || "该热点具备讨论度，适合展开播客内容。").trim(),
    tags,
  };
}

async function analyzeWithKimi(rawTopics) {
  const apiKey = process.env.KIMI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KIMI_API_KEY");
  }

  const prompt = `
你是一个真实热点选题分析助手。

下面是真实抓取到的新闻/RSS/社区热点标题，请你做：
1. 去重
2. 合并相似热点
3. 判断分类：政治、名人、娱乐、社会、科技、商业
4. 生成更符合主题的中文标签，不能泛泛写“热点”“播客”“AI”
5. 生成适合播客创作的摘要
6. 给热度分数 heat，0-100

真实热点数据：
${rawTopics
  .map(
    (item, index) => `
${index + 1}. 【${item.platform}】${item.title}
来源：${item.source}
摘要：${item.summary || "无"}
`,
  )
  .join("\n")}

只返回合法 JSON。
不要 markdown。
不要解释。
不要在数组元素之间漏逗号。
不要使用尾随逗号。
格式必须完全如下：
{
  "trends": [
    {
      "title": "热点标题",
      "source": "来源",
      "platform": "平台",
      "category": "科技",
      "heat": 88,
      "summary": "摘要",
      "tags": ["具体标签1", "具体标签2", "具体标签3"]
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
          content:
            "你只能返回合法 JSON。数组元素之间必须有逗号。不要 markdown，不要解释，不要注释。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    }),
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      trends: buildFallbackTrends(rawTopics),
      usedFallback: true,
      fallbackReason: `Kimi API 返回非 JSON: ${raw.slice(0, 200)}`,
    };
  }

  if (!response.ok) {
    return {
      trends: buildFallbackTrends(rawTopics),
      usedFallback: true,
      fallbackReason: data?.error?.message || "Kimi API request failed",
    };
  }

  const content = data.choices?.[0]?.message?.content || "";
  const parsed = await safeParseAiJson(content, apiKey);

  if (!parsed || !Array.isArray(parsed.trends)) {
    return {
      trends: buildFallbackTrends(rawTopics),
      usedFallback: true,
      fallbackReason: "AI 返回 JSON 修复失败，已使用真实数据兜底",
    };
  }

  return {
    trends: parsed.trends,
    usedFallback: false,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const [googleNews, redditHot] = await Promise.allSettled([
      fetchGoogleNews(),
      fetchRedditHot(),
    ]);

    const rawTopics = [
      ...(googleNews.status === "fulfilled" ? googleNews.value : []),
      ...(redditHot.status === "fulfilled" ? redditHot.value : []),
    ].filter((item) => item.title);

    if (rawTopics.length === 0) {
      return res.status(500).json({
        error: "没有抓取到真实热点，请检查 Google News RSS / Reddit 网络请求。",
      });
    }

    const analyzed = await analyzeWithKimi(rawTopics.slice(0, 25));
    const trends = analyzed.trends.map((item, index) => normalizeTrendItem(item, index));

    return res.status(200).json({
      trends,
      rawCount: rawTopics.length,
      sources: ["Google News RSS", "Reddit Hot"],
      usedFallback: Boolean(analyzed.usedFallback),
      fallbackReason: analyzed.fallbackReason || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "真实热点抓取失败",
    });
  }
}
