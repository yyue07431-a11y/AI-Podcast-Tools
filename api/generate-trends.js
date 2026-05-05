// 真实热点方向：Google Trends / Google News RSS / Reddit -> Kimi分析
// 注意：Kimi国际版 endpoint 固定用 https://api.moonshot.ai/v1/chat/completions

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

function extractRssItems(xml, source, platform, limit = 8) {
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, limit);

  return items.map((match, index) => {
    const item = match[0];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1]
      || item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[2]
      || `${platform} 热点 ${index + 1}`;

    const description =
      item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
      item.match(/<description>(.*?)<\/description>/)?.[1] ||
      "";

    return {
      title: title.replace(/&amp;/g, "&").replace(/&#39;/g, "'"),
      summary: description.replace(/<[^>]+>/g, "").slice(0, 180),
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
        data?.data?.children?.map((item) => ({
          title: item?.data?.title,
          summary: item?.data?.selftext?.slice(0, 180) || "",
          source: `Reddit r/${subreddit}`,
          platform: "Reddit",
        })) || [];

      results.push(...posts);
    } catch {
      continue;
    }
  }

  return results;
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

严格返回 JSON，不要 markdown，不要解释：
{
  "trends": [
    {
      "title": "",
      "source": "",
      "platform": "",
      "category": "科技",
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
          content: "你是严格返回合法 JSON 的热点分析助手。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    }),
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Kimi API 返回非 JSON: ${raw.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Kimi API request failed");
  }

  const content = data.choices?.[0]?.message?.content || "";

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 内容不是 JSON");
    return JSON.parse(match[0]);
  }
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

    return res.status(200).json({
      trends: Array.isArray(analyzed.trends) ? analyzed.trends : [],
      rawCount: rawTopics.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "真实热点抓取失败",
    });
  }
}
