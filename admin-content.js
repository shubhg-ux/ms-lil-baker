const sb = window.supabase?.createClient(window.MSB_CONFIG?.url, window.MSB_CONFIG?.anonKey) || null;
const state = { settings: null, gallery: [], galleryNames: [] };

const $ = id => document.getElementById(id);
const esc = value => { const el = document.createElement('div'); el.textContent = value ?? ''; return el.innerHTML; };
const prettyName = value => String(value || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());

function message(text, type = '') {
  const el = $('contentMsg');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'error' ? '#9b3047' : type === 'ok' ? '#47705a' : '';
}

function requireClient() {
  if (!sb) throw new Error('Supabase is not configured.');
}

async function checkSession() {
  requireClient();
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) {
    window.location.href = 'admin-login.html?next=admin-content.html';
    return false;
  }
  return true;
}

async function loadSettings() {
  const { data, error } = await sb.from('site_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  state.settings = data;
  state.gallery = Array.isArray(data.gallery_urls) ? data.gallery_urls.filter(Boolean) : [];
  const storedNames = Array.isArray(data.gallery_names) ? data.gallery_names : [];
  state.galleryNames = state.gallery.map((_, index) => storedNames[index] || `Cake ${String(index + 1).padStart(2, '0')}`);
  $('heroEyebrow').value = data.hero_eyebrow || '';
  $('heroTitle').value = data.hero_title || '';
  $('heroDescription').value = data.hero_description || '';
  $('galleryEyebrow').value = data.gallery_eyebrow || '';
  $('galleryTitle').value = data.gallery_title || '';
  $('galleryDescription').value = data.gallery_description || '';
  $('storyEyebrow').value = data.story_eyebrow || '';
  $('storyTitle').value = data.story_title || '';
  $('storyDescription').value = data.story_description || '';
  $('whatsappNumber').value = data.whatsapp_number || '';
  renderImages();
  renderGallery();
}

function renderImages() {
  const fallback = state.gallery[0] || '';
  const hero = state.settings?.hero_url || fallback;
  const story = state.settings?.story_url || state.gallery[1] || fallback;
  $('heroPreview').src = hero;
  $('storyPreview').src = story;
  $('heroUrl').textContent = hero ? (state.galleryNames[state.gallery.indexOf(hero)] || 'Selected gallery image') : 'No image selected';
  $('storyUrl').textContent = story ? (state.galleryNames[state.gallery.indexOf(story)] || 'Selected gallery image') : 'No image selected';
}

function renderGallery() {
  const list = $('galleryList');
  $('galleryCount').textContent = `${state.gallery.length} photo${state.gallery.length === 1 ? '' : 's'}`;
  if (!state.gallery.length) {
    list.innerHTML = '<div class="list-empty-msg">No gallery photos yet. Upload some above.</div>';
    return;
  }
  const hero = state.settings?.hero_url;
  const story = state.settings?.story_url;
  list.innerHTML = state.gallery.map((url, index) => `
    <article class="gallery-item">
      <img src="${esc(url)}" alt="${esc(state.galleryNames[index])}" loading="lazy">
      <div class="gallery-item-body">
        <span class="gallery-index">Photo ${String(index + 1).padStart(2, '0')}${url === hero ? ' · HERO' : ''}${url === story ? ' · STORY' : ''}</span>
        <input class="gallery-name-input" type="text" value="${esc(state.galleryNames[index])}" data-name-index="${index}" aria-label="Gallery photo name" placeholder="Name this photo">
        <div class="gallery-buttons">
          <button class="mini-btn" data-action="hero" data-index="${index}">Set hero</button>
          <button class="mini-btn" data-action="story" data-index="${index}">Set story</button>
          <button class="mini-btn" data-action="left" data-index="${index}" ${index === 0 ? 'disabled' : ''}>← Move</button>
          <button class="mini-btn" data-action="right" data-index="${index}" ${index === state.gallery.length - 1 ? 'disabled' : ''}>Move →</button>
          <button class="mini-btn danger" data-action="remove" data-index="${index}" style="grid-column:1/-1">Remove from gallery</button>
        </div>
      </div>
    </article>
  `).join('');
}

async function saveSettings(patch = {}) {
  const payload = {
    hero_eyebrow: $('heroEyebrow').value.trim(),
    hero_title: $('heroTitle').value.trim(),
    hero_description: $('heroDescription').value.trim(),
    gallery_eyebrow: $('galleryEyebrow').value.trim(),
    gallery_title: $('galleryTitle').value.trim(),
    gallery_description: $('galleryDescription').value.trim(),
    story_eyebrow: $('storyEyebrow').value.trim(),
    story_title: $('storyTitle').value.trim(),
    story_description: $('storyDescription').value.trim(),
    whatsapp_number: $('whatsappNumber').value.replace(/\D/g, ''),
    gallery_urls: state.gallery,
    gallery_names: state.galleryNames,
    updated_at: new Date().toISOString(),
    ...patch
  };
  const { data, error } = await sb.from('site_settings').update(payload).eq('id', 1).select('*').single();
  if (error) throw error;
  state.settings = data;
  state.gallery = Array.isArray(data.gallery_urls) ? data.gallery_urls.filter(Boolean) : [];
  state.galleryNames = state.gallery.map((_, index) => (Array.isArray(data.gallery_names) ? data.gallery_names[index] : '') || `Cake ${String(index + 1).padStart(2, '0')}`);
  renderImages();
  renderGallery();
}

$('saveContent').addEventListener('click', async () => {
  try {
    message('Saving…');
    state.galleryNames = state.gallery.map((_, index) => {
      const input = document.querySelector(`[data-name-index="${index}"]`);
      return input?.value.trim() || `Cake ${String(index + 1).padStart(2, '0')}`;
    });
    await saveSettings();
    message('Website changes saved.', 'ok');
  } catch (error) {
    console.error(error);
    message('Could not save the changes.', 'error');
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'admin-login.html';
});

document.querySelectorAll('[data-jump]').forEach(button => {
  button.addEventListener('click', () => document.getElementById('galleryUpload')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
});

$('galleryList').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const index = Number(button.dataset.index);
  const url = state.gallery[index];
  if (!url) return;

  try {
    const action = button.dataset.action;
    if (action === 'hero') {
      await saveSettings({ hero_url: url });
      message('Hero image updated.', 'ok');
      return;
    }
    if (action === 'story') {
      await saveSettings({ story_url: url });
      message('Story image updated.', 'ok');
      return;
    }
    if (action === 'left' && index > 0) {
      [state.gallery[index - 1], state.gallery[index]] = [state.gallery[index], state.gallery[index - 1]];
      [state.galleryNames[index - 1], state.galleryNames[index]] = [state.galleryNames[index], state.galleryNames[index - 1]];
      await saveSettings();
      message('Gallery order updated.', 'ok');
      return;
    }
    if (action === 'right' && index < state.gallery.length - 1) {
      [state.gallery[index + 1], state.gallery[index]] = [state.gallery[index], state.gallery[index + 1]];
      [state.galleryNames[index + 1], state.galleryNames[index]] = [state.galleryNames[index], state.galleryNames[index + 1]];
      await saveSettings();
      message('Gallery order updated.', 'ok');
      return;
    }
    if (action === 'remove') {
      if (!confirm('Remove this photo from the gallery?')) return;
      state.gallery.splice(index, 1);
      state.galleryNames.splice(index, 1);
      const patch = { gallery_urls: state.gallery, gallery_names: state.galleryNames };
      if (state.settings?.hero_url === url) patch.hero_url = state.gallery[0] || null;
      if (state.settings?.story_url === url) patch.story_url = state.gallery[1] || state.gallery[0] || null;
      await saveSettings(patch);
      message('Photo removed from the gallery.', 'ok');
    }
  } catch (error) {
    console.error(error);
    message('That gallery change could not be saved.', 'error');
    await loadSettings();
  }
});

$('galleryUpload').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  try {
    message(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);
    const uploaded = [];
    const uploadedNames = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      const path = `site-gallery/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`;
      const { error } = await sb.storage.from('product-photos').upload(path, file, { cacheControl: '31536000', upsert: false });
      if (error) throw error;
      const { data } = sb.storage.from('product-photos').getPublicUrl(path);
      if (data?.publicUrl) {
        uploaded.push(data.publicUrl);
        uploadedNames.push(prettyName(file.name) || `Cake ${state.gallery.length + uploaded.length}`);
      }
    }
    state.gallery.push(...uploaded);
    state.galleryNames.push(...uploadedNames);
    await saveSettings({ gallery_urls: state.gallery, gallery_names: state.galleryNames });
    event.target.value = '';
    message(`${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} added. Name them below and press Save website changes.`, 'ok');
  } catch (error) {
    console.error(error);
    message('Upload failed. Check the image type and try again.', 'error');
    await loadSettings();
  }
});

(async function init() {
  try {
    if (await checkSession()) {
      await loadSettings();
      message('Ready to edit.');
    }
  } catch (error) {
    console.error(error);
    message('Could not load website settings.', 'error');
  }
})();