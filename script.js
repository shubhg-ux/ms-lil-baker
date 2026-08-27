const config = window.MSB_CONFIG || {};
const sb = window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('mlb-cart') || '[]');
let activeCat = 'all';
let query = '';
const WA = '919876543210';

const photo = key => (window.MSB_PHOTOS && window.MSB_PHOTOS[key]) || '';
const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const esc = value => { const d=document.createElement('div'); d.textContent=value ?? ''; return d.innerHTML; };

function saveCart(){ localStorage.setItem('mlb-cart', JSON.stringify(cart)); }
function syncCart(){
  const count=document.getElementById('cartCount');
  const subtotal=document.getElementById('cartSubtotal');
  if(count) count.textContent=cart.length;
  if(subtotal) subtotal.textContent=money(cart.reduce((a,x)=>a+Number(x.price||0),0));
  saveCart();
}
function renderCart(){
  const box=document.getElementById('cartItemsContainer'); if(!box) return;
  if(!cart.length){ box.innerHTML='<div class="empty-cart"><div class="empty-heart">♡</div><h4>Your basket is waiting.</h4><p>Add a little something sweet.</p></div>'; syncCart(); return; }
  box.innerHTML=cart.map((x,i)=>`<div class="cart-line"><div><strong>${esc(x.name)}</strong><small>${esc(x.details||'Freshly baked to order')}</small><b>${money(x.price)}</b></div><button data-remove="${i}">Remove</button></div>`).join('');
  syncCart();
}
function openCart(){ renderCart(); document.getElementById('cartDrawer')?.classList.add('active'); document.getElementById('cartOverlay')?.classList.add('active'); }
function closeCart(){ document.getElementById('cartDrawer')?.classList.remove('active'); document.getElementById('cartOverlay')?.classList.remove('active'); }

function getFallbackProducts(){
  const a=photo('chocolate-hazelnut-cake'), b=photo('berry-cheesecake');
  return [
    {id:'sample-1',name:'Chocolate Hazelnut Cake',description:'Rich chocolate cake finished with a little crunch.',category:'Cakes',price:900,photo_url:a},
    {id:'sample-2',name:'Berry Cheesecake',description:'Creamy cheesecake with a bright berry finish.',category:'Cheesecakes',price:950,photo_url:b},
    {id:'sample-3',name:'The Baker’s Special',description:'A small-batch surprise from the kitchen.',category:'Cakes',price:1100,photo_url:a},
    {id:'sample-4',name:'Something Berry Sweet',description:'Soft, creamy and made for celebrations.',category:'Cheesecakes',price:1050,photo_url:b}
  ];
}
function renderProducts(){
  const grid=document.getElementById('productGrid'); if(!grid) return;
  let list=activeCat==='all'?allProducts:allProducts.filter(p=>(p.category||'').toLowerCase()===activeCat.toLowerCase());
  if(query) list=list.filter(p=>`${p.name||''} ${p.description||''} ${p.category||''}`.toLowerCase().includes(query.toLowerCase()));
  if(!list.length){ grid.innerHTML='<div class="empty-cart"><h4>Nothing here yet.</h4><p>Try another category or search.</p></div>'; return; }
  grid.innerHTML=list.map((p,i)=>{
    const src=p.photo_url || (i%2===0?photo('chocolate-hazelnut-cake'):photo('berry-cheesecake'));
    return `<article class="product-card" data-id="${esc(p.id)}"><div class="product-thumb">${src?`<img src="${esc(src)}" alt="${esc(p.name||'Fresh bake')}" loading="lazy">`:'<div class="photo-fallback">✦</div>'}<span class="product-tag">${esc(p.category||'Fresh bake')}</span><span class="view-pill">View ↗</span></div><div class="product-details"><h3 class="product-title">${esc(p.name||'Fresh bake')}</h3><p class="product-desc">${esc(p.description||'Handmade and freshly prepared to order.')}</p><div class="product-footer"><span class="product-price">${money(p.price)}</span><button class="add-btn" data-add="${esc(p.id)}">Add +</button></div></div></article>`;
  }).join('');
}
async function fetchProducts(){
  if(!sb){ allProducts=getFallbackProducts(); renderProducts(); return; }
  const {data,error}=await sb.from('products').select('*').eq('is_available',true).order('created_at',{ascending:false});
  if(error){ console.warn('Menu fetch failed; showing preview catalogue.',error); allProducts=getFallbackProducts(); renderProducts(); return; }
  allProducts=data&&data.length?data:getFallbackProducts(); renderProducts();
}
function productById(id){ return allProducts.find(p=>String(p.id)===String(id)); }
function addProduct(id){ const p=productById(id); if(!p) return; cart.push({id:p.id,name:p.name||'Fresh bake',price:Number(p.price||0),details:p.category||''}); openCart(); }
function openProduct(p){
  const src=p.photo_url || photo('chocolate-hazelnut-cake');
  const modal=document.getElementById('productModal'); const content=document.getElementById('productModalContent'); if(!modal||!content)return;
  content.innerHTML=`<div class="modal-photo">${src?`<img src="${esc(src)}" alt="${esc(p.name)}">`:''}</div><div class="modal-info"><div class="eyebrow">${esc(p.category||'Fresh bake')}</div><h2>${esc(p.name||'Fresh bake')}</h2><p>${esc(p.description||'Handmade and freshly prepared to order.')}</p><div class="modal-price">${money(p.price)}</div><button class="btn primary" data-modal-add="${esc(p.id)}">Add to bag +</button></div>`;
  modal.classList.add('active'); modal.setAttribute('aria-hidden','false');
}
function closeProduct(){ document.getElementById('productModal')?.classList.remove('active'); document.getElementById('productModal')?.setAttribute('aria-hidden','true'); }
function initBuilder(){
  const flavor=document.getElementById('buildFlavor'), msg=document.getElementById('buildMessage'), price=document.getElementById('customTotalPrice'), preview=document.getElementById('previewMessageText'), caption=document.getElementById('previewFlavor'); if(!flavor)return;
  function update(){ const o=flavor.options[flavor.selectedIndex], size=document.querySelector('input[name="buildSize"]:checked'), total=Math.round(Number(o.dataset.price||0)*Number(size?.dataset.multiplier||1)); if(price)price.textContent=money(total); if(preview)preview.textContent=msg.value.trim()||'Happy Birthday!'; if(caption)caption.textContent=`${o.value} · ${size?.value||'0.5 kg'}`; }
  flavor.addEventListener('change',update); msg?.addEventListener('input',update); document.querySelectorAll('input[name="buildSize"]').forEach(x=>x.addEventListener('change',update));
  document.getElementById('addCustomToCartBtn')?.addEventListener('click',()=>{ const o=flavor.options[flavor.selectedIndex],size=document.querySelector('input[name="buildSize"]:checked'); cart.push({id:`custom-${Date.now()}`,name:`Custom Cake · ${o.value}`,price:Math.round(Number(o.dataset.price||0)*Number(size?.dataset.multiplier||1)),details:`${size?.value||'0.5 kg'}${msg.value.trim()?` · “${msg.value.trim()}”`:''}`}); openCart(); });
  update();
}
function customRequest(){ document.getElementById('studio')?.scrollIntoView({behavior:'smooth'}); setTimeout(()=>document.getElementById('buildMessage')?.focus(),500); }
function initGallery(){
  const a=photo('chocolate-hazelnut-cake'),b=photo('berry-cheesecake');
  const hp=document.getElementById('heroPhoto'),sp=document.getElementById('storyPhoto'); if(hp&&a)hp.src=a; if(sp&&b)sp.src=b;
  const rail=document.getElementById('photoRail'); if(!rail)return;
  const photos=[a,b,a,b,a,b]; rail.innerHTML=photos.map((src,i)=>src?`<button class="gallery-tile" data-lightbox="${i}" aria-label="Open cake photo ${i+1}"><img src="${src}" alt="Cake photo ${i+1}" loading="lazy"><span>sweet detail ${String(i+1).padStart(2,'0')}</span></button>`:'').join('');
}
function openLightbox(src){ const lb=document.getElementById('lightbox'); if(!lb)return; document.getElementById('lightboxImage').src=src; lb.classList.add('active'); }
function closeLightbox(){document.getElementById('lightbox')?.classList.remove('active');}

document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add]'); if(add){e.stopPropagation();addProduct(add.dataset.add);return;}
  const rem=e.target.closest('[data-remove]'); if(rem){cart.splice(Number(rem.dataset.remove),1);renderCart();return;}
  const modalAdd=e.target.closest('[data-modal-add]'); if(modalAdd){addProduct(modalAdd.dataset.modalAdd);closeProduct();return;}
  const card=e.target.closest('.product-card'); if(card&&!e.target.closest('button')){const p=productById(card.dataset.id);if(p)openProduct(p);return;}
  const tile=e.target.closest('[data-lightbox]'); if(tile){openLightbox(tile.querySelector('img')?.src);return;}
});

document.addEventListener('DOMContentLoaded',()=>{
  initGallery(); initBuilder(); renderCart(); fetchProducts();
  document.getElementById('categoryTabs')?.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('.filters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeCat=b.dataset.cat;renderProducts();});
  document.getElementById('searchInput')?.addEventListener('input',e=>{query=e.target.value;renderProducts();});
  document.getElementById('cartBtn')?.addEventListener('click',openCart); document.getElementById('closeCart')?.addEventListener('click',closeCart); document.getElementById('cartOverlay')?.addEventListener('click',closeCart);
  document.getElementById('closeProduct')?.addEventListener('click',closeProduct); document.getElementById('productModal')?.addEventListener('click',e=>{if(e.target.id==='productModal')closeProduct();});
  document.getElementById('heroCustom')?.addEventListener('click',customRequest); document.getElementById('ctaCustom')?.addEventListener('click',customRequest);
  document.getElementById('closeLightbox')?.addEventListener('click',closeLightbox); document.getElementById('lightbox')?.addEventListener('click',e=>{if(e.target.id==='lightbox')closeLightbox();});
  document.getElementById('whatsappCheckoutBtn')?.addEventListener('click',()=>{if(!cart.length)return;const total=cart.reduce((a,x)=>a+Number(x.price||0),0);const text='Hi Ms. Lil Baker! 🧁\nI would like to order:\n\n'+cart.map((x,i)=>`${i+1}. ${x.name} — ${money(x.price)}${x.details?` (${x.details})`:''}`).join('\n')+`\n\nTotal: ${money(total)}\nPlease confirm availability!`;window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`,'_blank');});
});
