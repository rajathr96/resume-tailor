import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url?.startsWith('http')) {
      return Response.json({ error: 'Please enter a valid URL starting with http or https.' }, { status: 400 });
    }

    // Fetch the page server-side
    let html;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResumeBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Page returned ${res.status}`);
      html = await res.text();
    } catch (err) {
      return Response.json({ error: `Could not fetch that URL: ${err.message}. The page may require login or block bots.` }, { status: 422 });
    }

    const pageText = stripHtml(html).slice(0, 15000); // cap to avoid token overload

    // Ask Gemini to validate and extract, with quota fallback
    const prompt = `You are given the text content of a webpage. Determine if it contains a job description.

If it IS a job description: extract the clean, complete JD text — include role title, company, responsibilities, requirements, and any other relevant details. Remove navigation, ads, and unrelated page content.

If it is NOT a job description (e.g. a news article, homepage, LinkedIn feed, error page, etc.): say so clearly.

Respond in this JSON format only:
{
  "is_jd": true or false,
  "jd_text": "full extracted JD text here (only if is_jd is true)",
  "reason": "brief reason if is_jd is false"
}

PAGE CONTENT:
${pageText}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2000 },
    };

    let result;
    for (const modelName of ['gemini-2.5-flash', 'gemini-2.5-flash-lite']) {
      try {
        result = await genAI.getGenerativeModel({ model: modelName }).generateContent(payload);
        break;
      } catch (err) {
        const is429 = err.message?.includes('429') || err.message?.includes('quota');
        if (is429 && modelName !== 'gemini-1.5-flash') continue;
        throw err;
      }
    }

    const raw = result.response.text().trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Unexpected response from AI');

    const parsed = JSON.parse(raw.slice(start, end + 1));

    if (!parsed.is_jd) {
      return Response.json({ error: `This doesn't look like a job description — ${parsed.reason || 'could not find job posting content on this page'}.` }, { status: 422 });
    }

    return Response.json({ jd_text: parsed.jd_text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
