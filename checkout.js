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
    const {data,error}=await client.rpc('place_customer_order',{
      p_customer_name:name,
      p_phone:phone,
      p_email:form.email.value.trim()||null,
      p_requested_date:form.date.value||null,
      p_delivery_address:form.address.value.trim()||null,
      p_notes:form.notes.value.trim()||null,
      p_items:items,
      p_total_amount:total
    });
    if(error){console.error(error);alert('We could not place the order. Please try again.');button.disabled=false;button.textContent='Place order';return;}
    const order=data?.[0];
    if(!order?.order_id || !order?.order_code){console.error('Unexpected order response',data);alert('The order was received, but we could not generate its customer ID. Please contact the bakery.');button.disabled=false;button.textContent='Place order';return;}
    localStorage.removeItem('mlb-cart'); if(window.syncCart)window.syncCart(); closeModal(); form.reset();
    document.getElementById('confirmationCode').textContent=order.order_code;
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
