(function(){
  const photos=Array.from({length:18},(_,i)=>`images/cake-${String(i+1).padStart(2,'0')}.jpg`);
  const embedded=k=>(window.MSB_PHOTOS&&window.MSB_PHOTOS[k])||'';
  const fallbackA=()=>embedded('chocolate-hazelnut-cake');
  const fallbackB=()=>embedded('berry-cheesecake');
  function setImage(img,src,fallback){
    if(!img)return;
    img.src=src;
    img.onerror=function(){ if(fallback && img.src!==fallback){ img.onerror=null; img.src=fallback; } };
  }
  function ready(){
    const hp=document.getElementById('heroPhoto');
    const sp=document.getElementById('storyPhoto');
    setImage(hp,photos[0],fallbackA());
    setImage(sp,photos[1],fallbackB());
    const rail=document.getElementById('photoRail');
    if(!rail)return;
    rail.innerHTML=photos.map((src,i)=>`<button class="gallery-tile" data-lightbox="${i}" data-gallery-src="${src}" aria-label="Open cake photo ${i+1}"><img src="${src}" alt="Cake photo ${i+1}" loading="lazy"><span>sweet detail ${String(i+1).padStart(2,'0')}</span></button>`).join('');
    rail.querySelectorAll('img').forEach(img=>{
      img.onerror=function(){
        img.closest('.gallery-tile')?.classList.add('image-missing');
        img.style.display='none';
      };
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
