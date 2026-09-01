const demoProducts = [
  { id: 'iphone-16-128', name: 'iPhone 16 128GB', category: 'Mobiles', rating: 4.8, image: 'https://images.unsplash.com/photo-1592286927505-2fdc7eaf6e2b?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Flipkart', price: 69999, delivery: 'Free delivery · 2 days', availability: 'Available', url: 'https://www.flipkart.com/' },
    { name: 'Amazon', price: 71490, delivery: '₹40 delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/' },
    { name: 'Croma', price: 73999, delivery: 'Free delivery · 4 days', availability: 'Available', url: 'https://www.croma.com/' }
  ] },
  { id: 'macbook-air-m3', name: 'MacBook Air M3 256GB', category: 'Laptops', rating: 4.7, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Amazon', price: 89990, delivery: 'Free delivery · 2 days', availability: 'Available', url: 'https://www.amazon.in/' },
    { name: 'Croma', price: 92990, delivery: 'Free delivery · 4 days', availability: 'Available', url: 'https://www.croma.com/' }
  ] },
  { id: 'sony-wh-1000xm5', name: 'Sony WH-1000XM5', category: 'Headphones', rating: 4.6, image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Croma', price: 24990, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.croma.com/' },
    { name: 'Amazon', price: 26990, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/' }
  ] },
  { id: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', category: 'Mobiles', rating: 4.5, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Amazon', price: 62499, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/' },
    { name: 'Flipkart', price: 63999, delivery: 'Free delivery · 2 days', availability: 'Limited stock', url: 'https://www.flipkart.com/' }
  ] }
];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesQuery(product, query) {
  const q = normalize(query);
  const haystack = normalize(`${product.name} ${product.category}`);
  if (!q) return false;
  if (haystack.includes(q)) return true;
  const tokens = q.split(' ').filter(Boolean);
  return tokens.length > 0 && tokens.every(token => haystack.includes(token));
}

function withPrices(product) {
  const prices = product.stores.map(store => Number(store.price)).filter(Number.isFinite);
  return { ...product, lowestPrice: prices.length ? Math.min(...prices) : null, highestPrice: prices.length ? Math.max(...prices) : null, savings: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0 };
}

function summary(results) {
  const offers = results.flatMap(product => product.stores || []).filter(store => Number.isFinite(Number(store.price)));
  const prices = offers.map(store => Number(store.price));
  return prices.length ? { lowestPrice: Math.min(...prices), highestPrice: Math.max(...prices), savings: Math.max(...prices) - Math.min(...prices) } : { lowestPrice: null, highestPrice: null, savings: 0 };
}

async function safeProviderSearch(query) {
  try {
    const { searchProviders } = require('../providers');
    return await searchProviders(query);
  } catch (error) {
    console.error('Provider search error:', error);
    return [];
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const query = String(req.query?.q || '').trim().slice(0, 100);
  if (!query) return res.status(400).json({ error: 'q is required' });

  const providerResults = await safeProviderSearch(query);
  const liveProducts = providerResults.flatMap(result => result.products || []).filter(item => item.name && Number.isFinite(Number(item.price)));
  const demoMatches = demoProducts.filter(product => matchesQuery(product, query)).map(withPrices);
  const useLive = liveProducts.length > 0;
  const products = useLive ? liveProducts : demoMatches;
  const providerStatus = providerResults.length ? providerResults.map(result => ({ provider: result.provider, enabled: Boolean(result.enabled), error: result.error || null })) : [
    { provider: 'Amazon', enabled: false, error: null },
    { provider: 'Flipkart', enabled: false, error: null },
    { provider: 'Croma', enabled: false, error: null },
    { provider: 'Google', enabled: false, error: null }
  ];

  return res.status(200).json({
    query,
    demo: !useLive,
    count: products.length,
    products,
    prices: useLive ? summary([{ stores: liveProducts }]) : summary(demoMatches),
    providers: providerStatus,
    discovery: providerResults.flatMap(result => result.discovery || []).slice(0, 10)
  });
};
