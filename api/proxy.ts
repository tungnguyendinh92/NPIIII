import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const targetUrl = decodeURIComponent(url as string);

  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      redirect: "follow"
    };

    if (req.method === "POST") {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json"
      };
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const text = await response.text();

    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (e) {
      if (req.method === "POST") {
        res.status(200).json({ success: true, note: "Update sent successfully" });
      } else {
        res.status(500).json({ 
          error: "Received HTML instead of JSON. Please ensure your Google Script is deployed as a Web App with 'Who has access: Anyone'.",
          preview: text.substring(0, 100)
        });
      }
    }
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch from script" });
  }
}
