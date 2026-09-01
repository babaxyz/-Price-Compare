module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    ai: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    providers: {
      amazon: Boolean(process.env.AMAZON_API_URL),
      flipkart: Boolean(process.env.FLIPKART_API_URL),
      croma: Boolean(process.env.CROMA_API_URL),
      google: Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID)
    },
    timestamp: new Date().toISOString()
  });
};
