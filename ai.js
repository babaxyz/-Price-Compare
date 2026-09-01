const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

async function generateComparison({ query, products }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { enabled: false, error: 'GEMINI_API_KEY is not configured' };

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const safeProducts = Array.isArray(products) ? products.slice(0, 12).map((product) => ({
    provider: String(product.provider || product.name || 'Store').slice(0, 80),
    name: String(product.name || product.title || '').slice(0, 180),
    price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
    availability: String(product.availability || 'Unknown').slice(0, 60),
    delivery: String(product.delivery || 'Unknown').slice(0, 100),
    url: typeof product.url === 'string' && /^https:\/\//.test(product.url) ? product.url : null
  })) : [];

  const prompt = `You are the shopping assistant for Price Compare India.\nUser search: ${String(query || '').slice(0, 120)}\n\nMerchant offers supplied by the app:\n${JSON.stringify(safeProducts, null, 2)}\n\nGive a concise recommendation in plain text with these headings:\nBEST CHOICE:\nWHY:\nPRICE CHECK:\nCAUTION:\n\nRules: never invent a price, availability, discount, review, or merchant offer. Use only supplied merchant prices for price comparison. If supplied data is missing or stale, clearly say so. You may use Google Search to verify current product facts, but do not treat search snippets as proof of a merchant price unless the result itself clearly supports it. Mention that users should confirm the final price on the merchant page.`;

  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || 'No recommendation was generated.';
  return { enabled: true, model, text, groundingMetadata: payload.candidates?.[0]?.groundingMetadata || null };
}

module.exports = { generateComparison };
