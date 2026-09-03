(() => {
  const eligibleCategories = ['brownies', 'cupcakes', 'cookies', 'small treats', 'treats', 'desserts'];
  const boxSizes = [4, 6, 9, 12];
  let boxSize = 6;
  const selected = new Map();
  let products = [];

  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const esc = value => { const node = document.createElement('div'); node.textContent = value ?? ''; return node.innerHTML; };
  const eligible = () => products.filter(product => eligibleCategories.includes(String(product.category || '').trim().toLowerCase()));
  const count = () => [...selected.values()].reduce((sum, qty) => sum + qty, 0);
  const total = () => [...selected.entries()].reduce((sum, [id, qty]) => { const p = eligible().find(item => String(item.id) === id); return sum + Number(p?.price || 0) * qty; }, 0);

  function render() {
    const shell = document.getElementById('boxBuilder');
    if (!shell) return;
    const available = eligible();
    if (!available.length) {
      shell.innerHTML = `<div class="box-empty"><span class="box-empty-mark">✦</span><h3>The treat shelf is getting ready.</h3><p>Build-a-Box will appear here as soon as brownies, cookies, cupcakes or small treats are added to the menu.</p><a class="text-link" href="#menu">See the current menu <span>→</span></a></div>`;
      return;
    }
    const filled = count();
    shell.innerHTML = `<div class="box-builder-top"><div><span class="box-kicker">01 · Choose your box</span><h3>How many little treats?</h3></div><div class="box-size-picker">${boxSizes.map(size => `<button type="button" class="box-size ${size === boxSize ? 'active' : ''}" data-box-size="${size}">${size}<small>pieces</small></button>`).join('')}</div></div><div class="box-builder-grid"><div class="treat-picker"><div class="box-kicker">02 · Fill it up</div><div class="treat-list">${available.map(product => { const qty = selected.get(String(product.id)) || 0; return `<article class="treat-card ${qty ? 'chosen' : ''}"><img src="${esc(product.photo_url || '')}" alt="${esc(product.name || 'Treat')}" loading="lazy"><div class="treat-info"><strong>${esc(product.name || 'Treat')}</strong><small>${money(product.price)} each</small></div><div class="treat-controls"><button type="button" data-treat-minus="${esc(product.id)}" aria-label="Remove one">−</button><b>${qty}</b><button type="button" data-treat-plus="${esc(product.id)}" aria-label="Add one">+</button></div></article>`; }).join('')}</div></div><div class="box-preview-wrap"><div class="box-preview-label">YOUR BOX · <span>${filled}/${boxSize}</span></div><div class="treat-box ${filled ? 'has-treats' : ''}"><div class="box-lid"><span>MS. LIL BAKER</span></div><div class="box-inside">${[...selected.entries()].flatMap(([id, qty]) => { const p = available.find(item => String(item.id) === id); return Array.from({length: qty}, () => `<span class="box-treat" title="${esc(p?.name || 'Treat')}">${esc((p?.name || 'Treat').slice(0,2).toUpperCase())}</span>`); }).join('') || '<span class="box-placeholder">tap a treat<br>to start</span>'}</div></div><div class="box-total"><span><small>${filled} of ${boxSize} filled</small><strong>${money(total())}</strong></span><button class="btn primary" type="button" id="addBoxToBag" ${filled === boxSize ? '' : 'disabled'}>Add box to bag +</button></div></div></div>`;
  }

  async function loadProducts() {
    const config = window.MSB_CONFIG || {};
    const sb = window.supabase?.createClient(config.url, config.anonKey);
    if (!sb) return render();
    const { data, error } = await sb.from('products').select('*').eq('is_available', true).order('created_at', {ascending:false});
    if (!error) products = data || [];
    render();
  }

  function addBox() {
    if (count() !== boxSize) return;
    const available = eligible();
    const details = [...selected.entries()].map(([id, qty]) => { const p = available.find(item => String(item.id) === id); return `${p?.name || 'Treat'} × ${qty}`; }).join(' · ');
    const cart = JSON.parse(localStorage.getItem('mlb-cart') || '[]');
    cart.push({id:`box-${Date.now()}`, name:`${boxSize}-piece treat box`, price:total(), details});
    localStorage.setItem('mlb-cart', JSON.stringify(cart));
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = Number(badge.textContent || 0) + 1;
    const button = document.getElementById('addBoxToBag');
    if (button) { button.textContent = 'Added ✓'; button.disabled = true; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shell = document.getElementById('boxBuilder');
    if (!shell) return;
    document.addEventListener('click', event => {
      const size = event.target.closest('[data-box-size]');
      if (size) { boxSize = Number(size.dataset.boxSize); while (count() > boxSize) { const entry = [...selected.entries()].find(([,qty]) => qty > 0); if (!entry) break; if (entry[1] > 1) selected.set(entry[0], entry[1]-1); else selected.delete(entry[0]); } render(); return; }
      const plus = event.target.closest('[data-treat-plus]');
      if (plus) { if (count() >= boxSize) return; const id = String(plus.dataset.treatPlus); selected.set(id, (selected.get(id) || 0) + 1); render(); return; }
      const minus = event.target.closest('[data-treat-minus]');
      if (minus) { const id = String(minus.dataset.treatMinus); const qty = selected.get(id) || 0; if (qty <= 1) selected.delete(id); else selected.set(id, qty-1); render(); return; }
      if (event.target.closest('#addBoxToBag')) addBox();
    });
    loadProducts();
  });
})();
