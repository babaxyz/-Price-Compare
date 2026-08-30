const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { searchProviders } = require('./providers');

const PORT = Number(process.env.PORT) || 4175;
const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || `http://${HOST}:${PORT}`;
const MAX_BODY_BYTES = 1024 * 1024;
const rateLimits = new Map();
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'store.json');
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const products = [
  { id: 'iphone-16-128', name: 'iPhone 16 128GB', category: 'Mobiles', rating: 4.8, image: 'https://images.unsplash.com/photo-1592286927505-2fdc7eaf6e2b?auto=format&fit=crop&w=900&q=85', description: 'A demo product record for comparing mobile prices.', stores: [{ name: 'Flipkart', price: 69999, delivery: 'Free delivery · 2 days', availability: 'Available', url: 'https://www.flipkart.com/', affiliateUrl: null }, { name: 'Amazon', price: 71490, delivery: '₹40 delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/', affiliateUrl: null }, { name: 'Croma', price: 73999, delivery: 'Free delivery · 4 days', availability: 'Available', url: 'https://www.croma.com/', affiliateUrl: null }] },
  { id: 'macbook-air-m3', name: 'MacBook Air M3 256GB', category: 'Laptops', rating: 4.7, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85', description: 'A demo laptop product record for comparison.', stores: [{ name: 'Amazon', price: 89990, delivery: 'Free delivery · 2 days', availability: 'Available', url: 'https://www.amazon.in/', affiliateUrl: null }, { name: 'Croma', price: 92990, delivery: 'Free delivery · 4 days', availability: 'Available', url: 'https://www.croma.com/', affiliateUrl: null }] },
  { id: 'sony-wh-1000xm5', name: 'Sony WH-1000XM5', category: 'Headphones', rating: 4.6, image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85', description: 'A demo audio product record for comparison.', stores: [{ name: 'Croma', price: 24990, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.croma.com/', affiliateUrl: null }, { name: 'Amazon', price: 26990, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/', affiliateUrl: null }] },
  { id: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', category: 'Mobiles', rating: 4.5, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', description: 'A demo smartphone product record for comparison.', stores: [{ name: 'Amazon', price: 62499, delivery: 'Free delivery · 3 days', availability: 'Available', url: 'https://www.amazon.in/', affiliateUrl: null }, { name: 'Flipkart', price: 63999, delivery: 'Free delivery · 2 days', availability: 'Limited stock', url: 'https://www.flipkart.com/', affiliateUrl: null }] }
];

async function readStore() { try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch { return { wishlist: [], recentSearches: [], alerts: [], comparisons: [] }; } }
let writeQueue = Promise.resolve();
async function writeStore(store) { writeQueue = writeQueue.then(async () => { await fs.mkdir(path.dirname(DATA_FILE), { recursive: true }); await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2)); }); return writeQueue; }
function send(res, status, body, headers = {}) { const origin = res.req.headers.origin; const cors = origin === ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}; res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', ...cors, ...headers }); res.end(status === 204 ? '' : JSON.stringify(body)); }
function productWithPrices(product) { const prices = product.stores.map(store => store.price); return { ...product, lowestPrice: Math.min(...prices), highestPrice: Math.max(...prices), savings: Math.max(...prices) - Math.min(...prices) }; }
async function body(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return null; } try { return raw ? JSON.parse(raw) : {}; } catch { return null; } }
function validId(id) { return typeof id === 'string' && /^[a-z0-9-]+$/.test(id); }
function aggregatePrices(items) { const valid = items.filter(item => item.price); return { lowestPrice: valid.length ? Math.min(...valid.map(item => item.price)) : null, highestPrice: valid.length ? Math.max(...valid.map(item => item.price)) : null, savings: valid.length ? Math.max(...valid.map(item => item.price)) - Math.min(...valid.map(item => item.price)) : 0 }; }

async function api(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return false;
  if (req.method === 'GET' && parts[1] === 'search') {
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 100);
    if (!query) return send(res, 400, { error: 'q is required' });
    const providerResults = await searchProviders(query);
    const remoteProducts = providerResults.flatMap(result => result.products || []);
    const demoProducts = products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())).map(productWithPrices);
    const returnedProducts = remoteProducts.length ? remoteProducts : demoProducts;
    return send(res, 200, { query, demo: remoteProducts.length === 0, count: returnedProducts.length, products: returnedProducts, prices: aggregatePrices(remoteProducts), providers: providerResults.map(result => ({ provider: result.provider, enabled: result.enabled, error: result.error || null })), discovery: providerResults.flatMap(result => result.discovery || []) });
  }
  if (req.method === 'GET' && parts[1] === 'products' && parts.length === 2) {
    const query = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const category = String(url.searchParams.get('category') || '').toLowerCase();
    const result = products.filter(product => (!query || `${product.name} ${product.category}`.toLowerCase().includes(query)) && (!category || product.category.toLowerCase() === category)).map(productWithPrices);
    return send(res, 200, { demo: true, count: result.length, products: result });
  }
  if (req.method === 'GET' && parts[1] === 'products' && validId(parts[2])) {
    const product = products.find(item => item.id === parts[2]);
    return product ? send(res, 200, { demo: true, product: productWithPrices(product) }) : send(res, 404, { error: 'Product not found' });
  }
  const store = await readStore();
  if (req.method === 'GET' && parts[1] === 'wishlist') return send(res, 200, { productIds: store.wishlist });
  if (req.method === 'POST' && parts[1] === 'wishlist') { const input = await body(req); if (!input || !validId(input.productId) || !products.some(item => item.id === input.productId)) return send(res, 400, { error: 'Valid productId is required' }); if (!store.wishlist.includes(input.productId)) store.wishlist.push(input.productId); await writeStore(store); return send(res, 201, { productIds: store.wishlist }); }
  if (req.method === 'DELETE' && parts[1] === 'wishlist' && validId(parts[2])) { store.wishlist = store.wishlist.filter(id => id !== parts[2]); await writeStore(store); return send(res, 200, { productIds: store.wishlist }); }
  if (req.method === 'GET' && parts[1] === 'recent-searches') return send(res, 200, { searches: store.recentSearches });
  if (req.method === 'POST' && parts[1] === 'recent-searches') { const input = await body(req); const query = typeof input?.query === 'string' ? input.query.trim().slice(0, 80) : ''; if (!query) return send(res, 400, { error: 'query is required' }); store.recentSearches = [query, ...store.recentSearches.filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 5); await writeStore(store); return send(res, 201, { searches: store.recentSearches }); }
  if (req.method === 'POST' && parts[1] === 'alerts') { const input = await body(req); const targetPrice = Number(input?.targetPrice); if (!validId(input?.productId) || !products.some(product => product.id === input.productId) || !Number.isFinite(targetPrice) || targetPrice <= 0) return send(res, 400, { error: 'Valid productId and positive targetPrice are required' }); const alert = { id: crypto.randomUUID(), productId: input.productId, targetPrice, createdAt: new Date().toISOString(), demo: true }; store.alerts.push(alert); await writeStore(store); return send(res, 201, { alert }); }
  if (req.method === 'GET' && parts[1] === 'alerts') return send(res, 200, { alerts: store.alerts });
  if (req.method === 'GET' && parts[1] === 'health') return send(res, 200, { status: 'ok', mode: 'demo', timestamp: new Date().toISOString() });
  return send(res, 404, { error: 'API route not found' });
}

const server = http.createServer(async (req, res) => { try { const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const clientKey = req.socket.remoteAddress || 'unknown'; const now = Date.now(); const recent = rateLimits.get(clientKey) || []; const active = recent.filter(timestamp => now - timestamp < 60_000); if (active.length >= 120) return send(res, 429, { error: 'Too many requests. Please try again shortly.' }); active.push(now); rateLimits.set(clientKey, active); if (url.pathname.startsWith('/api/')) { await api(req, res, url); return; } if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }); const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); const file = path.resolve(ROOT, `.${requested}`); if ((file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) || requested.includes('..')) return send(res, 403, { error: 'Forbidden' }); const content = await fs.readFile(file); res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }); res.end(content); } catch (error) { if (error.code === 'ENOENT') return send(res, 404, { error: 'Not found' }); console.error(error); if (!res.headersSent) send(res, 500, { error: 'Something went wrong. Please try again.' }); } });
server.listen(PORT, HOST, () => console.log(`Price Compare demo server running at http://${HOST}:${PORT}`));