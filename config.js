// Ms. Lil Baker — Supabase connection
// Used by both the admin panel (admin-products.js) and the customer site (script.js)

const SUPABASE_URL = "https://dqedwfbowxevwjspwiti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkcWVk d2Zib3d4ZXZ3anNwd2l0aSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg3NDEyNzQ4LCJleHAiOjIxMDI5ODg3NDh9.AEM12VTGE2Mvyw0D2PTwXMQJo3zF6mX7DdHmpXwCxK8";

// Format expected by admin-products.js
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Format expected by script.js (the customer-facing homepage)
window.MSB_CONFIG = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };

/* Customer-site mobile navigation. Admin pages do not have .navbar, so they are untouched. */
if (document.querySelector('.navbar')) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'mobile-nav.css?v=2';
  document.head.appendChild(css);

  const nav = document.querySelector('.navbar');
  const links = document.querySelector('.nav-links');
  if (nav && links && !document.getElementById('mobileMenuToggle')) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobileMenu';
    menu.setAttribute('aria-label', 'Mobile navigation');
    menu.innerHTML = [...links.querySelectorAll('a')].map(a => `<a href="${a.getAttribute('href')}">${a.textContent.trim()}</a>`).join('');

    const toggle = document.createElement('button');
    toggle.className = 'mobile-menu-toggle';
    toggle.id = 'mobileMenuToggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobileMenu');
    toggle.innerHTML = '<span></span><span></span>';

    nav.appendChild(toggle);
    document.body.appendChild(menu);

    const close = () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      document.body.classList.remove('mobile-menu-open');
    };

    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      document.body.classList.toggle('mobile-menu-open', open);
    });

    menu.addEventListener('click', event => {
      if (event.target.closest('a')) close();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) close();
    });
  }
}

/* Customer-facing custom-cake links always use the number configured in Supabase. */
if (document.querySelector('.navbar') && supabaseClient) {
  supabaseClient.from('site_settings').select('whatsapp_number').eq('id', 1).single().then(({ data }) => {
    const number = String(data?.whatsapp_number || '').replace(/\D/g, '');
    if (!number) return;
    document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
      try {
        const url = new URL(link.href);
        url.pathname = `/${number}`;
        link.href = url.toString();
      } catch (_) {}
    });
  }).catch(() => {});
}
