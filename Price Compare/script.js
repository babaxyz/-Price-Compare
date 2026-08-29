const API = '/api';
const fallback = { title: 'iPhone 16', variant: '128GB', image: 'https://images.unsplash.com/photo-1592286927505-2fdc7eaf6e2b?auto=format&fit=crop&w=900&q=85', price: '69,999', id: 'iphone-16-128' };
const $ = (selector) => document.querySelector(selector);
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); };
const getProductPresentation = (product, lowestPrice) => { const words = product.name.split(' '); const price = lowestPrice ?? product.price ?? product.lowestPrice; return { ...product, title: words.slice(0, 2).join(' '), variant: words.slice(2).join(' ') || product.category || 'Product', price: price ? Number(price).toLocaleString('en-IN') : 'Check store' }; };

async function updateProduct(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return showToast('Enter a product to search');
  try {
    const response = await fetch(`${API}/search?q=${encodeURIComponent(cleanQuery)}`);
    const data = await response.json();
    const product = data.products?.[0] ? getProductPresentation(data.products[0], data.prices?.lowestPrice) : null;
    if (!product) {
      $('#resultTitle').innerHTML = 'No products found <span>Try another search</span>';
      $('#bestPrice').textContent = '—';
      $('#searchStatus').textContent = `No products found for “${cleanQuery}”. Try another product name.`;
      $('#searchStatus').classList.add('empty');
      return showToast('No products found. Try another search');
    }
    $('#resultTitle').innerHTML = `${product.title} <span>${product.variant}</span>`;
    $('#productImage').src = product.image;
    $('#productImage').alt = `${product.title} product`;
    $('#bestPrice').textContent = product.price;
    $('#searchStatus').textContent = `${data.count} demo product${data.count > 1 ? 's' : ''} found · Sample comparison data`;
    $('#searchStatus').classList.remove('empty');
    await fetch(`${API}/recent-searches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: cleanQuery }) });
    showToast(data.count ? `Found ${data.count} demo product${data.count > 1 ? 's' : ''}` : 'No products found. Showing the default demo product');
  } catch { showToast('Something went wrong. Please try again.'); }
}

$('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); updateProduct($('#searchInput').value); $('#compare').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('.clear-search').addEventListener('click', () => { $('#searchInput').value = ''; $('#searchInput').focus(); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { $('#searchInput').value = button.dataset.query; updateProduct(button.dataset.query); }));
document.querySelectorAll('.buy-button').forEach((button) => button.addEventListener('click', () => showToast(`Opening ${button.dataset.store}. Demo deal link ready.`)));
$('.photo-wishlist').addEventListener('click', async (event) => { const button = event.currentTarget; const saved = !button.classList.toggle('saved'); const method = saved ? 'POST' : 'DELETE'; const endpoint = saved ? `${API}/wishlist` : `${API}/wishlist/iphone-16-128`; await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: saved ? JSON.stringify({ productId: 'iphone-16-128' }) : undefined }); button.innerHTML = `<i class="icon-heart${saved ? ' icon-fill' : ''}"></i>`; showToast(saved ? 'Added to your wishlist' : 'Removed from your wishlist'); });
$('#alertButton').addEventListener('click', () => $('#alertForm input').focus());
$('#alertForm').addEventListener('submit', async (event) => { event.preventDefault(); const targetPrice = Number(event.currentTarget.querySelector('input').value); if (!targetPrice || targetPrice <= 0) return showToast('Enter a valid target price'); const response = await fetch(`${API}/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'iphone-16-128', targetPrice }) }); showToast(response.ok ? `Demo alert saved for ₹${targetPrice.toLocaleString('en-IN')}` : 'Unable to save alert'); });
$('.filter-button').addEventListener('click', () => showToast('Filters are coming to the next demo release'));
