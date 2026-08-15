let cart=JSON.parse(localStorage.getItem('msLilBakerCart')||'[]');
const config=window.MSB_CONFIG||{url:'',anonKey:''};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const saveCart=()=>{localStorage.setItem('msLilBakerCart',JSON.stringify(cart));renderCart()};
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const orderCode=id=>`MLB-${String(id).padStart(4,'0')}`;
function renderCart(){
  $('#cartCount').textContent=cart.reduce((a,i)=>a+i.qty,0);
  const b=$('#cartItems');
  b.innerHTML=cart.length?cart.map((i,x)=>`<div class="cart-row"><div><strong>${safe(i.name)}</strong><div class="small">${i.price?money(i.price):'Price pending'}</div></div><div class="qty"><button type="button" data-inc="${x}">+</button><span>${i.qty}</span><button type="button" data-dec="${x}">−</button><button type="button" data-remove="${x}" class="remove">×</button></div></div>`).join(''):'<div class="empty-cart"><div>🧁</div><strong>Your cart is waiting for something sweet.</strong><p>Add a treat from the menu and it will appear here.</p></div>';
  $('#cartTotal').textContent=money(cart.reduce((a,i)=>a+(Number(i.price)||0)*i.qty,0));
}
function openModal(id){const m=$('#'+id);m.classList.add('show');m.setAttribute('aria-hidden','false')}
function closeModal(id){const m=$('#'+id);m.classList.remove('show');m.setAttribute('aria-hidden','true')}
function bindFilters(){$$('.filter').forEach(f=>f.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));f.classList.add('active');const s=f.dataset.filter;$$('.product-card').forEach(c=>c.style.display=s==='all'||c.dataset.category===s?'':'none')})}
function showToast(text){const t=$('#toast');if(!t)return;t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
document.addEventListener('click',e=>{
  const add=e.target.closest('.add-btn');
  if(add){const c=add.closest('.product-card'),name=c.dataset.name,price=Number(c.dataset.price)||0,image=c.querySelector('img')?.src||'',f=cart.find(i=>i.name===name);f?f.qty++:cart.push({name,price,image,qty:1});saveCart();openModal('cartModal');showToast(`${name} added to cart`)}
  if(e.target.matches('[data-inc]')){cart[+e.target.dataset.inc].qty++;saveCart()}
  if(e.target.matches('[data-dec]')){const x=+e.target.dataset.dec,i=cart[x];i.qty--;if(i.qty<=0)cart.splice(x,1);saveCart()}
  if(e.target.matches('[data-remove]')){cart.splice(+e.target.dataset.remove,1);saveCart()}
  if(e.target.matches('[data-close]'))closeModal(e.target.dataset.close)
});
$('#cartBtn').onclick=()=>openModal('cartModal');$('#ctaCartBtn').onclick=()=>openModal('cartModal');$('#customOrderBtn').onclick=()=>openModal('customModal');
window.addEventListener('click',e=>{if(e.target.classList.contains('modal'))closeModal(e.target.id)});
async function submit(table,payload){
  if(!config.url||!config.anonKey)return{demo:true};
  const r=await fetch(`${config.url}/rest/v1/${table}?select=*`,{method:'POST',headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!r.ok)throw Error(await r.text());
  return{demo:false,data:await r.json()};
}
async function loadProducts(){
  if(!config.url||!config.anonKey)return;
  try{const r=await fetch(`${config.url}/rest/v1/products?select=id,name,description,price,image_url,available,sort_order,category:categories(slug)&available=eq.true&order=sort_order.asc`,{headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`}});if(!r.ok)throw Error(await r.text());const products=await r.json();const grid=$('.product-grid');if(!grid)return;if(!products.length){grid.innerHTML='<p class="empty">The menu is being freshly prepared. Check back soon. 🍰</p>';return}grid.innerHTML=products.map(p=>`<article class="product-card" data-category="${safe(p.category?.slug||'other')}" data-name="${safe(p.name)}" data-price="${Number(p.price)||0}">${p.image_url?`<img class="product-image" src="${safeAttr(p.image_url)}" alt="${safeAttr(p.name)}" loading="lazy">`:`<div class="product-photo">🍰</div>`}<div class="product-info"><div><h3>${safe(p.name)}</h3><p>${Number(p.price)>0?money(p.price):'Price on request'}</p></div><button class="add-btn">Add</button></div></article>`).join('');bindFilters()}catch(err){console.error('Live menu load failed',err)}}
function safe(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function safeAttr(s){return safe(s)}
$('#orderForm').onsubmit=async e=>{
  e.preventDefault();if(!cart.length){$('#orderStatus').textContent='Your cart is empty — add a treat first.';return}
  const d=Object.fromEntries(new FormData(e.target)),total=cart.reduce((a,i)=>a+(Number(i.price)||0)*i.qty,0);$('#orderStatus').textContent='Sending your order…';
  try{const r=await submit('orders',{customer_name:d.customer_name,phone:d.phone,requested_date:d.date,notes:d.notes,items:cart,total_amount:total,status:'new'});if(r.demo){$('#orderStatus').textContent='Demo mode is active.';return}const row=r.data?.[0];if(!row?.id||!row?.tracking_token)throw Error('Order tracking details were not returned');const code=orderCode(row.id);cart=[];saveCart();e.target.reset();closeModal('cartModal');$('#successOrderCode').textContent=code;$('#successOrderLink').href=`track.html?token=${encodeURIComponent(row.tracking_token)}&id=${row.id}`;$('#successModal').classList.add('show');$('#successModal').setAttribute('aria-hidden','false');}
  catch(err){console.error(err);$('#orderStatus').textContent='We could not place the order. Please try again.'}
};
$('#customForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));$('#customStatus').textContent='Sending your request…';try{const r=await submit('custom_requests',{...d,status:'new'});e.target.reset();$('#customStatus').textContent=r.demo?'Demo mode is active.':'Request sent — we will get back to you soon.'}catch(err){console.error(err);$('#customStatus').textContent='Could not send the request. Please try again.'}};
renderCart();bindFilters();loadProducts();