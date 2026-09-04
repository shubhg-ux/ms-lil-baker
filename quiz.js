const quizState = { step: 0, answers: [] };

const quizProducts = async () => {
  const sb = window.supabase?.createClient(window.MSB_CONFIG?.url, window.MSB_CONFIG?.anonKey);
  if (!sb) return [];
  const { data, error } = await sb.from('products').select('*').eq('is_available', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const norm = value => String(value || '').toLowerCase();

function scoreProduct(product, answers) {
  const text = norm(`${product.name} ${product.category} ${product.description}`);
  let score = 0;
  const [occasion, flavour, sweetness] = answers;

  if (occasion === 'celebration') score += /cake|celebration|birthday|custom/.test(text) ? 5 : 1;
  if (occasion === 'gifting') score += /brownie|cookie|box|gift|cheesecake/.test(text) ? 4 : 1;
  if (occasion === 'craving') score += /dessert|cake|brownie|chocolate|cheesecake/.test(text) ? 3 : 1;
  if (flavour === 'chocolate') score += /chocolate|cocoa|mud|brownie|dark/.test(text) ? 5 : 0;
  if (flavour === 'fruit') score += /fruit|berry|strawberry|mango|lemon|citrus/.test(text) ? 5 : 0;
  if (flavour === 'anything') score += 1;
  if (sweetness === 'light') score += /fruit|berry|lemon|cheesecake/.test(text) ? 2 : 0;
  if (sweetness === 'classic') score += 1;
  if (sweetness === 'indulgent') score += /chocolate|mud|brownie|cake/.test(text) ? 3 : 0;
  return score;
}

function addQuizItem(product) {
  const key = 'mlb-cart';
  const cart = JSON.parse(localStorage.getItem(key) || '[]');
  const existing = cart.find(item => item.id === product.id);
  if (existing) existing.qty = (existing.qty || 1) + 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price), photo: product.photo_url || '', qty: 1 });
  localStorage.setItem(key, JSON.stringify(cart));
  const count = document.getElementById('cartCount');
  if (count) count.textContent = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

function renderQuizStep() {
  const steps = [...document.querySelectorAll('.quiz-step')];
  const label = document.getElementById('quizStepLabel');
  const bar = document.getElementById('quizProgressBar');
  steps.forEach((step, i) => step.classList.toggle('active', i === quizState.step));
  if (label) label.textContent = `${String(quizState.step + 1).padStart(2, '0')} / 03`;
  if (bar) bar.style.width = `${((quizState.step + 1) / 3) * 100}%`;
}

async function showResult() {
  const result = document.getElementById('quizResult');
  if (!result) return;
  result.innerHTML = '<div class="quiz-loading">Finding your sweet spot…</div>';
  try {
    const products = await quizProducts();
    if (!products.length) {
      result.innerHTML = '<div class="quiz-empty"><strong>The menu is getting ready.</strong><p>There aren’t any available bakes to recommend yet. Check back soon.</p><a class="text-link" href="#menu">See the menu →</a></div>';
      return;
    }
    const best = [...products].sort((a, b) => scoreProduct(b, quizState.answers) - scoreProduct(a, quizState.answers))[0];
    result.innerHTML = `<div class="quiz-recommendation"><div class="quiz-result-copy"><span class="quiz-kicker">We think you'll love</span><h3>${escapeHtml(best.name)}</h3><p>${escapeHtml(best.description || 'A little something sweet, made by Ms. Lil Baker.')}</p><strong>₹${Number(best.price).toLocaleString('en-IN')}</strong><div class="quiz-result-actions"><button class="btn primary" id="quizAdd" type="button">Add to bag</button><button class="btn ghost" id="quizAgain" type="button">Try again</button></div></div>${best.photo_url ? `<img src="${escapeHtml(best.photo_url)}" alt="${escapeHtml(best.name)}">` : ''}</div>`;
    document.getElementById('quizAdd')?.addEventListener('click', () => {
      addQuizItem(best);
      document.getElementById('quizAdd').textContent = 'Added ✓';
    });
    document.getElementById('quizAgain')?.addEventListener('click', () => {
      quizState.step = 0;
      quizState.answers = [];
      result.innerHTML = '';
      renderQuizStep();
    });
  } catch (error) {
    console.error(error);
    result.innerHTML = '<div class="quiz-empty"><strong>We hit a tiny hiccup.</strong><p>Try the quiz again in a moment.</p><button class="btn ghost" id="quizAgain" type="button">Try again</button></div>';
    document.getElementById('quizAgain')?.addEventListener('click', () => { quizState.step = 0; quizState.answers = []; result.innerHTML = ''; renderQuizStep(); });
  }
}

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = value ?? '';
  return el.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const quiz = document.getElementById('bakeQuiz');
  if (!quiz) return;
  quiz.addEventListener('click', event => {
    const button = event.target.closest('.quiz-options button');
    if (!button) return;
    quizState.answers[quizState.step] = button.dataset.answer;
    if (quizState.step < 2) {
      quizState.step += 1;
      renderQuizStep();
    } else {
      [...quiz.querySelectorAll('.quiz-step')].forEach(step => step.classList.remove('active'));
      document.getElementById('quizProgressBar').style.width = '100%';
      document.getElementById('quizStepLabel').textContent = 'DONE';
      showResult();
    }
  });
  renderQuizStep();
});
