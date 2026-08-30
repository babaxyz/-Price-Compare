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

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const query = String(req.query?.q || '').trim().slice(0, 100);
  if (!query) return res.status(400).json({ error: 'q is required' });

  const matches = products
    .filter(product => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()))
    .map(withPrices);

  return res.status(200).json({
    query,
    demo: true,
    count: matches.length,
    products: matches,
    prices: matches.length ? {
      lowestPrice: Math.min(...matches.map(p => p.lowestPrice)),
      highestPrice: Math.max(...matches.map(p => p.highestPrice)),
      savings: Math.max(...matches.map(p => p.highestPrice)) - Math.min(...matches.map(p => p.lowestPrice))
    } : { lowestPrice: null, highestPrice: null, savings: 0 },
    providers: [
      { provider: 'Amazon', enabled: false, error: null },
      { provider: 'Flipkart', enabled: false, error: null },
      { provider: 'Croma', enabled: false, error: null }
    ],
    discovery: []
  });
};
