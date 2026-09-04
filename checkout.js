// Ms. Lil Baker — website order checkout
const Checkout = (() => {
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const esc = value => { const node = document.createElement('div'); node.textContent = value ?? ''; return node.innerHTML; };
  const getCart = () => JSON.parse(localStorage.getItem('mlb-cart') || '[]');
  function openModal(){
    const cart=getCart(); if(!cart.length){alert('Your bag is empty. Add a bake first.');return;}
    const modal=document.getElementById('orderModal'), summary=document.getElementById('orderSummary');
    const total=cart.reduce((sum,item)=>sum+Number(item.price||0),0);
    summary.innerHTML=cart.map((item,i)=>`<div class="checkout-line"><span>${i+1}. ${esc(item.name)} <small>${esc(item.details||'')}</small></span><strong>${money(item.price)}</strong></div>`).join('')+`<div class="checkout-total"><span>Total</span><strong>${money(total)}</strong></div>`;
    modal.classList.add('active');modal.setAttribute('aria-hidden','false');document.getElementById('orderName')?.focus();
  }
  function closeModal(){const modal=document.getElementById('orderModal');modal?.classList.remove('active');modal?.setAttribute('aria-hidden','true');}
  async function submitOrder(event){
    event.preventDefault(); const form=event.currentTarget,button=document.getElementById('submitOrderBtn');
    const client=window.supabase?.createClient(window.MSB_CONFIG?.url,window.MSB_CONFIG?.anonKey),cart=getCart();
    if(!cart.length){alert('Your bag is empty.');closeModal();return;}
    const name=form.name.value.trim(),phone=form.phone.value.trim();
    if(!name||!phone){alert('Please enter your name and phone number.');return;}
    if(!client){alert('Order system is unavailable right now. Please try again shortly.');return;}
    button.disabled=true;button.textContent='Placing order…';
    const total=cart.reduce((sum,item)=>sum+Number(item.price||0),0);
    const items=cart.map(item=>({id:item.id,name:item.name,price:Number(item.price||0),details:item.details||'',qty:1}));
    const payload={customer_name:name,phone,email:form.email.value.trim()||null,requested_date:form.date.value||null,delivery_address:form.address.value.trim()||null,notes:form.notes.value.trim()||null,items,total_amount:total,status:'new',source:'website'};
    const {error}=await client.from('orders').insert(payload);
    if(error){console.error(error);alert('We could not place the order. Please try again.');button.disabled=false;button.textContent='Place order';return;}
    localStorage.removeItem('mlb-cart'); if(window.syncCart)window.syncCart(); closeModal(); form.reset();
    document.getElementById('confirmationCode').textContent='Order received · Admin notified';
    const confirmation=document.getElementById('orderConfirmation');confirmation.classList.add('active');confirmation.setAttribute('aria-hidden','false');
    button.disabled=false;button.textContent='Place order';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('placeOrderBtn')?.addEventListener('click',openModal);
    document.getElementById('closeOrderModal')?.addEventListener('click',closeModal);
    document.getElementById('orderModal')?.addEventListener('click',e=>{if(e.target.id==='orderModal')closeModal();});
    document.getElementById('orderForm')?.addEventListener('submit',submitOrder);
    document.getElementById('closeConfirmation')?.addEventListener('click',()=>{const c=document.getElementById('orderConfirmation');c?.classList.remove('active');c?.setAttribute('aria-hidden','true');});
  });
})();
