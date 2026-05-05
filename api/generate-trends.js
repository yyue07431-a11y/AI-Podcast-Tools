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

    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
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

  if (start === -1 || end === -1) {
    throw new Error("AI 没有返回 JSON 对象");
  }

  return cleaned.slice(start, end + 1);
}

function safeParseAiJson(content = "") {
  try {
    return JSON.parse(content);
  } catch {
    const jsonText = extractJsonObject(content);

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`AI 返回的 JSON 格式不合法，请重新点击刷新。原始错误：${error.message}`);
    }
  }
}

function normalizeTrendItem(item, index) {
  const categoryList = ["政治", "名人", "娱乐", "社会", "科技", "商业"];
  const category = categoryList.includes(item?.category) ? item.category : "社会";

  const tags = Array.isArray(item?.tags)
    ? item.tags.filter(Boolean).slice(0, 5)
    : ["真实热点", "趋势观察", "内容选题"];

  return {
    id: String(Date.now() + index),
    title: String(item?.title || `真实热点 ${index + 1}`).trim(),
    source: String(item?.source || item?.platform || "真实数据源").trim(),
    platform: String(item?.platform || item?.source || "真实数据源").trim(),
    category,
    heat: Number.isFinite(Number(item?.heat)) ? Number(item.heat) : 80,
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

严格返回合法 JSON。
不要 markdown。
不要解释。
不要在数组元素之间漏逗号。
不要使用尾随逗号。
格式必须完全如下：
{
  "trends": [
    {
      "title": "",
      "source": "",
      "platform": "",
      "category": "科技",
      "heat": 88,
      "summary": "",
      "tags": ["标签1", "标签2", "标签3"]
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
            "你是严格返回合法 JSON 的热点分析助手。只能输出 JSON 对象，不能输出 markdown、解释、注释或多余文本。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Kimi API 返回非 JSON: ${raw.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Kimi API request failed");
  }

  const content = data.choices?.[0]?.message?.content || "";
  const parsed = safeParseAiJson(content);

  return {
    trends: Array.isArray(parsed.trends) ? parsed.trends : [],
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
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "真实热点抓取失败",
    });
  }
}
