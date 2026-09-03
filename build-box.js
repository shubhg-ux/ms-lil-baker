(() => {
  const eligibleCategories = ['brownies', 'cupcakes', 'cookies', 'small treats', 'treats', 'desserts'];
  const boxSizes = [4, 6, 9, 12];
  let boxSize = 6;
  const selected = new Map();

  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const esc = value => { const node = document.createElement('div'); node.textContent = value ?? ''; return node.innerHTML; };

  function treats() {
    return (window.MLB_PRODUCTS || []).filter(product => eligibleCategories.includes(String(product.category || '').trim().toLowerCase()));
  }

  function totalCount() {
    return [...selected.values()].reduce((sum, qty) => sum + qty, 0);
  }

  function totalPrice() {
    return [...selected.entries()].reduce((sum, [id, qty]) => {
      const product = treats().find(item => String(item.id) === String(id));
      return sum + (Number(product?.price || 0) * qty);
    }, 0);
  }

  function render() {
    const shell = document.getElementById('boxBuilder');
    if (!shell) return;
    const available = treats();

    if (!available.length) {
      shell.innerHTML = `<div class="box-empty"><span class="box-empty-mark">✦</span><h3>The treat shelf is getting ready.</h3><p>Build-a-Box will appear here as soon as brownies, cookies, cupcakes or small treats are added to the menu.</p><a class="text-link" href="#menu">See the current menu <span>→</span></a></div>`;
      return;
    }

    const count = totalCount();
    shell.innerHTML = `
      <div class="box-builder-top">
        <div><span class="box-kicker">01 · Choose your box</span><h3>How many little treats?</h3></div>
        <div class="box-size-picker">${boxSizes.map(size => `<button type="button" class="box-size ${size === boxSize ? 'active' : ''}" data-box-size="${size}">${size}<small>pieces</small></button>`).join('')}</div>
      </div>
      <div class="box-builder-grid">
        <div class="treat-picker">
          <div class="box-kicker">02 · Fill it up</div>
          <div class="treat-list">${available.map(product => {
            const qty = selected.get(String(product.id)) || 0;
            const image = product.photo_url || '';
            return `<article class="treat-card ${qty ? 'chosen' : ''}">
              <img src="${esc(image)}" alt="${esc(product.name || 'Treat')}" loading="lazy">
              <div class="treat-info"><strong>${esc(product.name || 'Treat')}</strong><small>${money(product.price)} each</small></div>
              <div class="treat-controls"><button type="button" data-treat-minus="${esc(product.id)}" aria-label="Remove one">−</button><b>${qty}</b><button type="button" data-treat-plus="${esc(product.id)}" aria-label="Add one">+</button></div>
            </article>`;
          }).join('')}</div>
        </div>
        <div class="box-preview-wrap">
          <div class="box-preview-label">YOUR BOX · <span>${count}/${boxSize}</span></div>
          <div class="treat-box ${count ? 'has-treats' : ''}">
            <div class="box-lid"><span>MS. LIL BAKER</span></div>
            <div class="box-inside">${[...selected.entries()].flatMap(([id, qty]) => {
              const product = available.find(item => String(item.id) === String(id));
              return Array.from({length: qty}, () => `<span class="box-treat" title="${esc(product?.name || 'Treat')}">${esc((product?.name || 'Treat').slice(0, 2).toUpperCase())}</span>`);
            }).join('') || '<span class="box-placeholder">tap a treat<br>to start</span>'}</div>
          </div>
          <div class="box-total"><span><small>${count} of ${boxSize} filled</small><strong>${money(totalPrice())}</strong></span><button class="btn primary" type="button" id="addBoxToBag" ${count === boxSize ? '' : 'disabled'}>Add box to bag +</button></div>
          ${count > boxSize ? '<p class="box-warning">Your box is full — remove a treat before adding another.</p>' : ''}
        </div>
      </div>`;
  }

  function addBoxToBag() {
    if (totalCount() !== boxSize) return;
    const available = treats();
    const items = [];
    selected.forEach((qty, id) => {
      const product = available.find(item => String(item.id) === String(id));
      if (product) items.push(`${product.name} × ${qty}`);
    });
    const cart = JSON.parse(localStorage.getItem('mlb-cart') || '[]');
    cart.push({
      id: `box-${Date.now()}`,
      name: `${boxSize}-piece treat box`,
      price: totalPrice(),
      details: items.join(' · ')
    });
    localStorage.setItem('mlb-cart', JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent('mlb:cart-updated'));
    const button = document.getElementById('addBoxToBag');
    if (button) { button.textContent = 'Added ✓'; setTimeout(() => { if (button) button.textContent = 'Add box to bag +'; }, 1200); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shell = document.getElementById('boxBuilder');
    if (!shell) return;

    const observer = new MutationObserver(render);
    observer.observe(shell, {childList: true});

    document.addEventListener('click', event => {
      const sizeButton = event.target.closest('[data-box-size]');
      if (sizeButton) {
        boxSize = Number(sizeButton.dataset.boxSize);
        while (totalCount() > boxSize) {
          const last = [...selected.entries()].find(([, qty]) => qty > 0);
          if (!last) break;
          if (last[1] > 1) selected.set(last[0], last[1] - 1); else selected.delete(last[0]);
        }
        render();
        return;
      }
      const plus = event.target.closest('[data-treat-plus]');
      if (plus) {
        if (totalCount() >= boxSize) return;
        const id = String(plus.dataset.treatPlus);
        selected.set(id, (selected.get(id) || 0) + 1);
        render();
        return;
      }
      const minus = event.target.closest('[data-treat-minus]');
      if (minus) {
        const id = String(minus.dataset.treatMinus);
        const qty = selected.get(id) || 0;
        if (qty <= 1) selected.delete(id); else selected.set(id, qty - 1);
        render();
        return;
      }
      if (event.target.closest('#addBoxToBag')) addBoxToBag();
    });

    window.addEventListener('mlb:products-ready', render);
    render();
  });
})();
