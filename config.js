// Ms. Lil Baker — Supabase connection
// Used by both the admin panel (admin-products.js) and the customer site (script.js)

const SUPABASE_URL = "https://dqedwfbowxevwjspwiti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZWR3ZmJvd3hldndqc3B3aXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTI3NDgsImV4cCI6MjEwMjk4ODc0OH0.AEM12VTGE2Mvyw0D2PTwXMQJo3zF6mX7DdHmpXwCxK8";

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
