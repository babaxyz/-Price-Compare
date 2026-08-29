const providerConfig = [
  { name: 'Amazon', key: 'AMAZON_API_URL', token: 'AMAZON_API_KEY' },
  { name: 'Flipkart', key: 'FLIPKART_API_URL', token: 'FLIPKART_API_KEY' },
  { name: 'Croma', key: 'CROMA_API_URL', token: 'CROMA_API_KEY' }
];

function cleanPrice(value) {
  const price = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(price) && price > 0 ? price : null;
}

function normalizeItems(payload, provider) {
  const items = Array.isArray(payload) ? payload : payload.products || payload.items || payload.results || [];
  return items.flatMap((item) => {
    const price = cleanPrice(item.price ?? item.salePrice ?? item.offerPrice);
    if (!item.name && !item.title) return [];
    return [{
      provider,
      name: String(item.name || item.title).slice(0, 180),
      price,
      delivery: String(item.delivery || 'Check merchant').slice(0, 100),
      availability: String(item.availability || 'Check merchant').slice(0, 60),
      url: typeof item.url === 'string' && /^https:\/\//.test(item.url) ? item.url : null,
      image: typeof item.image === 'string' && /^https:\/\//.test(item.image) ? item.image : null,
      demo: false
    }];
  });
}

async function fetchJsonProvider(config, query) {
  const endpoint = process.env[config.key];
  if (!endpoint) return { provider: config.name, enabled: false, products: [] };
  const target = new URL(endpoint);
  target.searchParams.set('q', query);
  const headers = { Accept: 'application/json' };
  if (process.env[config.token]) headers.Authorization = `Bearer ${process.env[config.token]}`;
  const response = await fetch(target, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`${config.name} provider returned ${response.status}`);
  return { provider: config.name, enabled: true, products: normalizeItems(await response.json(), config.name) };
}

async function fetchGoogleDiscovery(query) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!key || !cx) return { provider: 'Google', enabled: false, products: [], discovery: [] };
  const target = new URL('https://www.googleapis.com/customsearch/v1');
  target.searchParams.set('key', key); target.searchParams.set('cx', cx); target.searchParams.set('q', query);
  const response = await fetch(target, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Google provider returned ${response.status}`);
  const payload = await response.json();
  return { provider: 'Google', enabled: true, products: [], discovery: (payload.items || []).slice(0, 10).map(item => ({ title: item.title, url: item.link, snippet: item.snippet })) };
}

async function searchProviders(query) {
  const results = await Promise.allSettled([fetchGoogleDiscovery(query), ...providerConfig.map(config => fetchJsonProvider(config, query))]);
  return results.map(result => result.status === 'fulfilled' ? result.value : { provider: 'unknown', enabled: false, products: [], error: 'Provider temporarily unavailable' });
}

module.exports = { searchProviders };
