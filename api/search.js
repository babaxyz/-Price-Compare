const products = [
  { id: 'iphone-16-128', name: 'iPhone 16 128GB', category: 'Mobiles', rating: 4.8, image: 'https://images.unsplash.com/photo-1592286927505-2fdc7eaf6e2b?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Flipkart', price: 69999, delivery: 'Free delivery · 2 days', availability: 'Available' },
    { name: 'Amazon', price: 71490, delivery: '₹40 delivery · 3 days', availability: 'Available' },
    { name: 'Croma', price: 73999, delivery: 'Free delivery · 4 days', availability: 'Available' }
  ] },
  { id: 'macbook-air-m3', name: 'MacBook Air M3 256GB', category: 'Laptops', rating: 4.7, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Amazon', price: 89990, delivery: 'Free delivery · 2 days', availability: 'Available' },
    { name: 'Croma', price: 92990, delivery: 'Free delivery · 4 days', availability: 'Available' }
  ] },
  { id: 'sony-wh-1000xm5', name: 'Sony WH-1000XM5', category: 'Headphones', rating: 4.6, image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Croma', price: 24990, delivery: 'Free delivery · 3 days', availability: 'Available' },
    { name: 'Amazon', price: 26990, delivery: 'Free delivery · 3 days', availability: 'Available' }
  ] },
  { id: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', category: 'Mobiles', rating: 4.5, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', stores: [
    { name: 'Amazon', price: 62499, delivery: 'Free delivery · 3 days', availability: 'Available' },
    { name: 'Flipkart', price: 63999, delivery: 'Free delivery · 2 days', availability: 'Limited stock' }
  ] }
];

function withPrices(product) {
  const prices = product.stores.map(store => store.price);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  return { ...product, lowestPrice, highestPrice, savings: highestPrice - lowestPrice };
}

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

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const query = String(req.query?.q || '').trim().slice(0, 100);
  if (!query) return res.status(400).json({ error: 'q is required' });

  const matches = products.filter(product => matchesQuery(product, query)).map(withPrices);
  const allStores = matches.flatMap(product => product.stores);
  const prices = allStores.map(store => store.price).filter(price => Number.isFinite(price));

  return res.status(200).json({
    query,
    demo: true,
    count: matches.length,
    products: matches,
    prices: prices.length ? {
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      savings: Math.max(...prices) - Math.min(...prices)
    } : { lowestPrice: null, highestPrice: null, savings: 0 },
    providers: [
      { provider: 'Amazon', enabled: false, error: null },
      { provider: 'Flipkart', enabled: false, error: null },
      { provider: 'Croma', enabled: false, error: null }
    ],
    discovery: []
  });
};
