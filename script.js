const API = '/api';
const fallback = { id: 'iphone-16-128', name: 'iPhone 16 128GB', category: 'Mobiles', rating: 4.8, image: 'https://images.unsplash.com/photo-1592286927505-2fdc7eaf6e2b?auto=format&fit=crop&w=900&q=85', stores: [] };
const $ = (selector) => document.querySelector(selector);
const money = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN') : '—';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char]));
const showToast = (message) => { const toast = $('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); };
let currentProduct = fallback;

function getProductPresentation(product) {
  const words = String(product.name || 'Product').trim().split(/\s+/);
  return { ...product, title: words.slice(0, 2).join(' '), variant: words.slice(2).join(' ') || product.category || 'Product' };
}

function merchantIcon(name) {
  const key = String(name || '').toLowerCase();
  if (key.includes('flipkart')) return '<div class="merchant-logo flipkart">f</div>';
  if (key.includes('amazon')) return '<div class="merchant-logo amazon">a</div>';
  if (key.includes('croma')) return '<div class="merchant-logo croma">C</div>';
  return `<div class="merchant-logo">${escapeHtml(String(name || 'M').slice(0, 1).toUpperCase())}</div>`;
}

function renderStores(stores) {
  const list = $('.merchant-list');
  if (!list) return;
  const validStores = Array.isArray(stores) ? stores.filter(store => Number.isFinite(Number(store.price))) : [];
  if (!validStores.length) {
    list.innerHTML = '<div class="merchant-row"><div class="merchant-info"><strong>No store prices available</strong><span>Try another product or connect a merchant feed.</span></div></div>';
    return;
  }
  const lowest = Math.min(...validStores.map(store => Number(store.price)));
  list.innerHTML = validStores.map((store) => {
    const price = Number(store.price);
    const isBest = price === lowest;
    return `<div class="merchant-row ${isBest ? 'best' : ''}">
      ${merchantIcon(store.name)}
      <div class="merchant-info"><strong>${escapeHtml(store.name)} <span class="verified">✓</span></strong><span>${escapeHtml(store.delivery || 'Check merchant')}</span><small>${escapeHtml(store.availability || 'Available')}</small></div>
      <div class="merchant-price"><strong>₹${money(price)}</strong>${isBest ? '<span class="lowest-label">LOWEST</span>' : `<span>${escapeHtml(store.availability || 'Available')}</span>`}</div>
      <button class="buy-button ${isBest ? '' : 'secondary'}" data-store="${escapeHtml(store.name)}" data-url="${escapeHtml(store.url || '')}">Buy <i class="icon-arrow-up-right"></i></button>
    </div>`;
  }).join('');
  list.querySelectorAll('.buy-button').forEach((button) => button.addEventListener('click', () => {
    const url = button.dataset.url;
    if (url && /^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
    else showToast(`${button.dataset.store} product link is not connected yet.`);
  }));
}

function renderProduct(product) {
  currentProduct = product || fallback;
  const presentation = getProductPresentation(currentProduct);
  const stores = currentProduct.stores || [];
  const prices = stores.map(store => Number(store.price)).filter(Number.isFinite);
  const lowest = prices.length ? Math.min(...prices) : null;
  const highest = prices.length ? Math.max(...prices) : null;
  const saving = prices.length > 1 ? highest - lowest : 0;
  $('#resultTitle').innerHTML = `${escapeHtml(presentation.title)} <span>${escapeHtml(presentation.variant)}</span>`;
  $('#bestPrice').textContent = money(lowest);
  $('#productImage').alt = `${presentation.title} product`;
  $('#productImage').onerror = () => { $('#productImage').style.visibility = 'hidden'; };
  if (currentProduct.image) { $('#productImage').style.visibility = 'visible'; $('#productImage').src = currentProduct.image; }
  const rating = $('.rating');
  if (rating) rating.innerHTML = `<span class="stars">★★★★★</span> <strong>${Number(currentProduct.rating || 0).toFixed(1)}</strong> <span class="muted">Product rating</span>`;
  const caption = $('.product-caption');
  if (caption) caption.textContent = `${currentProduct.category || 'Product'} · Compare offers`;
  const savingChip = $('.saving-chip');
  if (savingChip) savingChip.innerHTML = `<i class="icon-trending-down"></i> ${saving > 0 ? `Save up to ₹${money(saving)}` : 'Best available price'}`;
  renderStores(stores);
}

async function updateProduct(query) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return showToast('Enter a product to search');
  $('#searchStatus').textContent = 'Searching…';
  $('#searchStatus').classList.remove('empty');
  try {
    const response = await fetch(`${API}/search?q=${encodeURIComponent(cleanQuery)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Search failed (${response.status})`);
    const data = await response.json();
    const product = data.products?.[0];
    if (!product) {
      $('#resultTitle').innerHTML = 'No products found <span>Try another search</span>';
      $('#bestPrice').textContent = '—';
      $('.merchant-list').innerHTML = '<div class="merchant-row"><div class="merchant-info"><strong>No matching product</strong><span>Try a model name like “Samsung Galaxy S24” or “Samsung S24”.</span></div></div>';
      $('#searchStatus').textContent = `No products found for “${cleanQuery}”. Try another product name.`;
      $('#searchStatus').classList.add('empty');
      return showToast('No products found. Try another search');
    }
    renderProduct(product);
    $('#searchStatus').textContent = `${data.count} product${data.count > 1 ? 's' : ''} found · ${data.demo ? 'Sample comparison data' : 'Live merchant data'}`;
    $('#searchStatus').classList.remove('empty');
    await fetch(`${API}/recent-searches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: cleanQuery }) }).catch(() => {});
    await requestAiRecommendation(cleanQuery, product);
    showToast(`Found ${data.count} product${data.count > 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Product search error:', error);
    $('#searchStatus').textContent = 'Search service is temporarily unavailable.';
    $('#searchStatus').classList.add('empty');
    showToast('Search failed. Please try again.');
  }
}

function ensureAiPanel() {
  let panel = $('#aiRecommendation');
  if (panel) return panel;
  const section = document.createElement('section');
  section.id = 'aiRecommendation';
  section.style.cssText = 'margin:24px 0;padding:22px;border:1px solid #dfe5d8;border-radius:20px;background:linear-gradient(135deg,#fbfff5,#f4f8ee);box-shadow:0 8px 30px rgba(25,35,20,.06);';
  section.innerHTML = '<div style="display:flex;gap:14px;align-items:flex-start"><div style="font-size:24px">✦</div><div style="flex:1"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71805e">AI shopping assistant</div><h3 style="margin:5px 0 8px;font-size:20px">Smart recommendation</h3><div id="aiRecommendationText" style="white-space:pre-wrap;line-height:1.65;color:#394033">Analyzing this product…</div><div id="aiSources" style="margin-top:12px;font-size:12px;color:#697260"></div></div></div>';
  const compare = $('#compare');
  if (compare) compare.after(section);
  return section;
}

async function requestAiRecommendation(query, product) {
  const panel = ensureAiPanel();
  const text = $('#aiRecommendationText');
  const sources = $('#aiSources');
  if (!text) return;
  text.textContent = 'Analyzing price, availability and product details…';
  if (sources) sources.textContent = '';
  try {
    const offers = (product.stores || []).map(store => ({ provider: store.name, name: product.name, price: store.price, availability: store.availability, delivery: store.delivery, url: store.url }));
    const response = await fetch(`${API}/ai/compare`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, products: offers }) });
    const data = await response.json();
    if (!response.ok || !data.enabled) {
      text.textContent = 'AI assistant is not connected yet. Add GEMINI_API_KEY in Vercel Environment Variables to enable it.';
      return;
    }
    text.textContent = data.text || 'No recommendation available.';
    const chunks = data.groundingMetadata?.groundingChunks || [];
    const links = chunks.map(chunk => chunk.web?.uri).filter(uri => typeof uri === 'string' && /^https:\/\//.test(uri)).slice(0, 4);
    if (sources && links.length) sources.innerHTML = `Web sources: ${links.map(uri => `<a href="${escapeHtml(uri)}" target="_blank" rel="noopener noreferrer" style="margin-right:10px">${escapeHtml(new URL(uri).hostname)}</a>`).join('')}`;
  } catch (error) {
    console.error('AI recommendation error:', error);
    text.textContent = 'AI recommendation is temporarily unavailable. The price comparison above still works.';
  }
}

$('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); updateProduct($('#searchInput').value); $('#compare').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('.clear-search').addEventListener('click', () => { $('#searchInput').value = ''; $('#searchInput').focus(); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { $('#searchInput').value = button.dataset.query; updateProduct(button.dataset.query); $('#compare').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
$('.photo-wishlist').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const saved = !button.classList.toggle('saved');
  const method = saved ? 'POST' : 'DELETE';
  const endpoint = saved ? `${API}/wishlist` : `${API}/wishlist/${encodeURIComponent(currentProduct.id)}`;
  const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: saved ? JSON.stringify({ productId: currentProduct.id }) : undefined }).catch(() => null);
  if (!response?.ok) { button.classList.toggle('saved'); return showToast('Wishlist could not be updated'); }
  button.innerHTML = `<i class="icon-heart${saved ? ' icon-fill' : ''}"></i>`;
  showToast(saved ? 'Added to your wishlist' : 'Removed from your wishlist');
});
$('#alertButton').addEventListener('click', () => $('#alertForm input').focus());
$('#alertForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const targetPrice = Number(event.currentTarget.querySelector('input').value);
  if (!targetPrice || targetPrice <= 0) return showToast('Enter a valid target price');
  const response = await fetch(`${API}/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: currentProduct.id, targetPrice }) }).catch(() => null);
  showToast(response?.ok ? `Price alert saved for ₹${targetPrice.toLocaleString('en-IN')}` : 'Unable to save alert');
});
$('.filter-button').addEventListener('click', () => showToast('Filters are coming to the next release'));

updateProduct($('#searchInput').value);
