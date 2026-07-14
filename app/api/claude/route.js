import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

async function generateWithFallback(genAI, systemPrompt, payload) {
  let lastErr;
  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        return await model.generateContent(payload);
      } catch (err) {
        const is503 = err.message?.includes('503') || err.message?.includes('high demand');
        const is429 = err.message?.includes('429') || err.message?.includes('quota');
        if (is503 && attempt < 3) {
          await sleep(1500 * 2 ** attempt);
          continue;
        }
        if (is429) { lastErr = err; break; } // try next model
        throw err;
      }
    }
  }
  throw lastErr;
}

export async function POST(request) {
  try {
    const { systemPrompt, userPrompt, maxTokens = 4000 } = await request.json();

    const result = await generateWithFallback(genAI, systemPrompt, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });

    // Gemini 2.5 Flash may include thinking parts — extract only output parts
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const text = (
      parts.length > 0
        ? parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('')
        : result.response.text()
    ).trim();
    if (!text) {
      console.error('[claude/route] Empty response from Gemini');
      return Response.json({ error: 'Gemini returned an empty response. Try again.' }, { status: 500 });
    }
    console.log('[claude/route] Raw response (first 200 chars):', text.slice(0, 200));
    return Response.json({ text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
