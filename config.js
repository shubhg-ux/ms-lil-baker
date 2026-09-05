// Ms. Lil Baker — Supabase connection
const SUPABASE_URL = "https://dqedwfbowxevwjspwiti.supabase.co";
// Use Supabase's current publishable key. This key is safe for browser/client use.
const SUPABASE_ANON_KEY = "sb_publishable_uNiPvfMTR5jsKQ5rjGSX5w_jgweBPSP";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.MSB_CONFIG = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };

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
    menu.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 820) close(); });
  }
}

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
