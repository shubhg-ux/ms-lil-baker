// Customer menu -> Supabase products table. Add this after the page's DOM loads.
// Set window.MSB_CONFIG = { url: 'https://YOUR_PROJECT.supabase.co', anonKey: 'YOUR_PUBLISHABLE_KEY' }.
(async function loadLiveProducts(){
  const cfg=window.MSB_CONFIG||{};
  if(!cfg.url||!cfg.anonKey) return;
  try{
    const res=await fetch(`${cfg.url}/rest/v1/products?select=id,name,slug,description,category_id,price,image_url,available,sort_order&available=eq.true&order=sort_order.asc`,{headers:{apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`}});
    if(!res.ok) throw new Error(await res.text());
    const products=await res.json();
    const grid=document.querySelector('.product-grid'); if(!grid) return;
    grid.innerHTML=products.map(p=>`<article class="product-card" data-category="${p.category_id}" data-name="${escapeHtml(p.name)}" data-price="${Number(p.price)||0}"><img src="${escapeAttr(p.image_url||'')}" alt="${escapeHtml(p.name)}"><div class="product-info"><div><h3>${escapeHtml(p.name)}</h3><p>${Number(p.price)?'₹'+Number(p.price).toLocaleString('en-IN'):'Price on request'}</p></div><button class="add-btn">Add</button></div></article>`).join('');
    grid.querySelectorAll('.add-btn').forEach(btn=>btn.addEventListener('click',()=>{ const card=btn.closest('.product-card'); const name=card.dataset.name, price=Number(card.dataset.price)||0; const found=window.cart?.find(i=>i.name===name); if(found) found.qty++; else { window.cart=window.cart||[]; window.cart.push({name,price,qty:1}); } if(window.saveCart) window.saveCart(); });
  }catch(e){console.error('Live product load failed',e)}
})();
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return escapeHtml(s)}
