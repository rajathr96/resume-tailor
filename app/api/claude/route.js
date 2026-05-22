import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(model, payload, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(payload);
    } catch (err) {
      const is503 = err.message?.includes('503') || err.message?.includes('high demand');
      if (is503 && attempt < maxRetries) {
        await sleep(1500 * 2 ** attempt); // 1.5s, 3s, 6s
        continue;
      }
      throw err;
    }
  }
}

export async function POST(request) {
  try {
    const { systemPrompt, userPrompt, maxTokens = 4000 } = await request.json();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const result = await generateWithRetry(model, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
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
