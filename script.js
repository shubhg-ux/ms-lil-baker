const config = window.MSB_CONFIG || {};
const sb = window.supabase?.createClient(config.url, config.anonKey) || null;

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('mlb-cart') || '[]');
let activeCat = 'all';
let query = '';

const WA = '919876543210';
const GALLERY = Array.from({length: 18}, (_, i) => `images/cake-${String(i + 1).padStart(2, '0')}.jpg`);
const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const esc = value => {
  const node = document.createElement('div');
  node.textContent = value ?? '';
  return node.innerHTML;
};

function saveCart(){ localStorage.setItem('mlb-cart', JSON.stringify(cart)); }
function syncCart(){
  const count = document.getElementById('cartCount');
  const subtotal = document.getElementById('cartSubtotal');
  if(count) count.textContent = cart.length;
  if(subtotal) subtotal.textContent = money(cart.reduce((sum, item) => sum + Number(item.price || 0), 0));
  saveCart();
}

function renderCart(){
  const box = document.getElementById('cartItemsContainer');
  if(!box) return;
  if(!cart.length){
    box.innerHTML = '<div class="empty-cart"><div class="empty-heart">♡</div><h4>Your basket is waiting.</h4><p>Add a little something sweet.</p></div>';
    syncCart();
    return;
  }
  box.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <div><strong>${esc(item.name)}</strong><small>${esc(item.details || 'Freshly baked to order')}</small><b>${money(item.price)}</b></div>
      <button type="button" data-remove="${index}">Remove</button>
    </div>`).join('');
  syncCart();
}

function openCart(){
  renderCart();
  document.getElementById('cartDrawer')?.classList.add('active');
  document.getElementById('cartOverlay')?.classList.add('active');
}
function closeCart(){
  document.getElementById('cartDrawer')?.classList.remove('active');
  document.getElementById('cartOverlay')?.classList.remove('active');
}

function fallbackProducts(){
  return [
    {id:'sample-1', name:'Chocolate Hazelnut Cake', description:'Rich chocolate cake finished with a little crunch.', category:'Cakes', price:900, photo_url:GALLERY[0]},
    {id:'sample-2', name:'Berry Cheesecake', description:'Creamy cheesecake with a bright berry finish.', category:'Cheesecakes', price:950, photo_url:GALLERY[1]},
    {id:'sample-3', name:'The Baker’s Special', description:'A small-batch surprise from the kitchen.', category:'Cakes', price:1100, photo_url:GALLERY[2]},
    {id:'sample-4', name:'Something Berry Sweet', description:'Soft, creamy and made for celebrations.', category:'Cheesecakes', price:1050, photo_url:GALLERY[3]}
  ];
}

function renderProducts(){
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  let list = activeCat === 'all' ? allProducts : allProducts.filter(p => (p.category || '').toLowerCase() === activeCat.toLowerCase());
  if(query) list = list.filter(p => `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(query.toLowerCase()));
  if(!list.length){ grid.innerHTML = '<div class="empty-cart"><h4>Nothing here yet.</h4><p>Try another category or search.</p></div>'; return; }
  grid.innerHTML = list.map((p, index) => {
    const src = p.photo_url || GALLERY[index % GALLERY.length];
    return `<article class="product-card" data-id="${esc(p.id)}">
      <div class="product-thumb"><img src="${esc(src)}" alt="${esc(p.name || 'Fresh bake')}" loading="lazy"><span class="product-tag">${esc(p.category || 'Fresh bake')}</span><span class="view-pill">View ↗</span></div>
      <div class="product-details"><h3 class="product-title">${esc(p.name || 'Fresh bake')}</h3><p class="product-desc">${esc(p.description || 'Handmade and freshly prepared to order.')}</p><div class="product-footer"><span class="product-price">${money(p.price)}</span><button class="add-btn" type="button" data-add="${esc(p.id)}">Add +</button></div></div>
    </article>`;
  }).join('');
}

async function fetchProducts(){
  if(!sb){ allProducts = fallbackProducts(); renderProducts(); return; }
  const {data, error} = await sb.from('products').select('*').eq('is_available', true).order('created_at', {ascending:false});
  if(error){ console.warn('Menu fetch failed; showing preview catalogue.', error); allProducts = fallbackProducts(); renderProducts(); return; }
  allProducts = data?.length ? data : fallbackProducts();
  renderProducts();
}

function productById(id){ return allProducts.find(p => String(p.id) === String(id)); }
function addProduct(id){
  const product = productById(id);
  if(!product) return;
  cart.push({id:product.id, name:product.name || 'Fresh bake', price:Number(product.price || 0), details:product.category || ''});
  openCart();
}

function openProduct(product){
  const src = product.photo_url || GALLERY[0];
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  if(!modal || !content) return;
  content.innerHTML = `<div class="modal-photo"><img src="${esc(src)}" alt="${esc(product.name || 'Fresh bake')}"></div><div class="modal-info"><div class="eyebrow">${esc(product.category || 'Fresh bake')}</div><h2>${esc(product.name || 'Fresh bake')}</h2><p>${esc(product.description || 'Handmade and freshly prepared to order.')}</p><div class="modal-price">${money(product.price)}</div><button class="btn primary" type="button" data-modal-add="${esc(product.id)}">Add to bag +</button></div>`;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}
function closeProduct(){
  const modal = document.getElementById('productModal');
  modal?.classList.remove('active');
  modal?.setAttribute('aria-hidden', 'true');
}

function initBuilder(){
  const flavor = document.getElementById('buildFlavor');
  const message = document.getElementById('buildMessage');
  if(!flavor) return;
  const price = document.getElementById('customTotalPrice');
  const preview = document.getElementById('previewMessageText');
  const caption = document.getElementById('previewFlavor');
  const update = () => {
    const option = flavor.options[flavor.selectedIndex];
    const size = document.querySelector('input[name="buildSize"]:checked');
    const total = Math.round(Number(option.dataset.price || 0) * Number(size?.dataset.multiplier || 1));
    if(price) price.textContent = money(total);
    if(preview) preview.textContent = message.value.trim() || 'Happy Birthday!';
    if(caption) caption.textContent = `${option.value} · ${size?.value || '0.5 kg'}`;
  };
  flavor.addEventListener('change', update);
  message?.addEventListener('input', update);
  document.querySelectorAll('input[name="buildSize"]').forEach(input => input.addEventListener('change', update));
  document.getElementById('addCustomToCartBtn')?.addEventListener('click', () => {
    const option = flavor.options[flavor.selectedIndex];
    const size = document.querySelector('input[name="buildSize"]:checked');
    const note = message.value.trim();
    cart.push({id:`custom-${Date.now()}`, name:`Custom Cake · ${option.value}`, price:Math.round(Number(option.dataset.price || 0) * Number(size?.dataset.multiplier || 1)), details:`${size?.value || '0.5 kg'}${note ? ` · “${note}”` : ''}`});
    openCart();
  });
  update();
}

function customRequest(){
  document.getElementById('studio')?.scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(() => document.getElementById('buildMessage')?.focus(), 450);
}

function initGallery(){
  const hero = document.getElementById('heroPhoto');
  const story = document.getElementById('storyPhoto');
  if(hero) hero.src = GALLERY[0];
  if(story) story.src = GALLERY[1];
  const rail = document.getElementById('photoRail');
  if(!rail) return;
  rail.innerHTML = GALLERY.map((src, index) => `<button class="gallery-tile" type="button" data-gallery-src="${src}" aria-label="Open cake photo ${index + 1}"><img src="${src}" alt="Cake photo ${index + 1}" loading="lazy"><span>sweet detail ${String(index + 1).padStart(2,'0')}</span></button>`).join('');
}

function openLightbox(src){
  const box = document.getElementById('lightbox');
  const image = document.getElementById('lightboxImage');
  if(!box || !image) return;
  image.src = src;
  box.classList.add('active');
}
function closeLightbox(){ document.getElementById('lightbox')?.classList.remove('active'); }

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if(add){ event.stopPropagation(); addProduct(add.dataset.add); return; }
  const remove = event.target.closest('[data-remove]');
  if(remove){ cart.splice(Number(remove.dataset.remove), 1); renderCart(); return; }
  const modalAdd = event.target.closest('[data-modal-add]');
  if(modalAdd){ addProduct(modalAdd.dataset.modalAdd); closeProduct(); return; }
  const tile = event.target.closest('[data-gallery-src]');
  if(tile){ openLightbox(tile.dataset.gallerySrc); return; }
  const card = event.target.closest('.product-card');
  if(card && !event.target.closest('button')){ const product = productById(card.dataset.id); if(product) openProduct(product); }
});

document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initBuilder();
  renderCart();
  fetchProducts();
  document.getElementById('categoryTabs')?.addEventListener('click', event => { const button = event.target.closest('button'); if(!button) return; document.querySelectorAll('.filters button').forEach(item => item.classList.remove('active')); button.classList.add('active'); activeCat = button.dataset.cat; renderProducts(); });
  document.getElementById('searchInput')?.addEventListener('input', event => { query = event.target.value; renderProducts(); });
  document.getElementById('cartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('closeProduct')?.addEventListener('click', closeProduct);
  document.getElementById('productModal')?.addEventListener('click', event => { if(event.target.id === 'productModal') closeProduct(); });
  document.getElementById('heroCustom')?.addEventListener('click', customRequest);
  document.getElementById('ctaCustom')?.addEventListener('click', customRequest);
  document.getElementById('closeLightbox')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', event => { if(event.target.id === 'lightbox') closeLightbox(); });
  document.getElementById('whatsappCheckoutBtn')?.addEventListener('click', () => {
    if(!cart.length) return;
    const total = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const text = 'Hi Ms. Lil Baker! 🧁\nI would like to order:\n\n' + cart.map((item, i) => `${i + 1}. ${item.name} — ${money(item.price)}${item.details ? ` (${item.details})` : ''}`).join('\n') + `\n\nTotal: ${money(total)}\nPlease confirm availability!`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
});
