(function(){
  const keys=['chocolate-hazelnut-cake','berry-cheesecake'];
  function ready(){
    const p=window.MSB_PHOTOS||{};
    const photo=k=>p[k]||'';
    const hp=document.getElementById('heroPhoto');
    const sp=document.getElementById('storyPhoto');
    if(hp && photo(keys[0])) hp.src=photo(keys[0]);
    if(sp && photo(keys[1])) sp.src=photo(keys[1]);
    const rail=document.getElementById('photoRail');
    if(!rail) return;
    const photos=[0,1,2,3,4,5].map((_,i)=>keys[i%2]);
    rail.innerHTML=photos.map((k,i)=>`<button class="gallery-tile" data-lightbox="${i}" aria-label="Open cake photo ${i+1}"><img src="${photo(k)}" alt="Cake photo ${i+1}" loading="lazy"><span>sweet detail ${String(i+1).padStart(2,'0')}</span></button>`).join('');
  }
  function boot(){
    if(window.MSB_PHOTOS && Object.keys(window.MSB_PHOTOS).length) ready();
    else setTimeout(ready,300);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
