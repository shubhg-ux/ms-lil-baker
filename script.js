// Ms. Lil Baker — Interactive Customer Storefront

const config = window.MSB_CONFIG || {};
const supabaseClient = window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;

let allProducts = [];
let cart = [];

// ---------- 1. Initialize 3D Floating Particles (Three.js) ----------
function init3DHero() {
  const canvas = document.getElementById("hero-3d-canvas");
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Create floating pastel particles (soft baking sprinkle style)
  const geometry = new THREE.SphereGeometry(0.12, 8, 8);
  const colors = [0xb8294f, 0xd4af37, 0x738a7c, 0xf3d2c1];
  const group = new THREE.Group();

  for (let i = 0; i < 60; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    );
    group.add(mesh);
  }
  scene.add(group);
  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);
    group.rotation.x += 0.001;
    group.rotation.y += 0.0015;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ---------- 2. Fetch & Render Menu Products ----------
async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  
  if (!supabaseClient) {
    grid.innerHTML = `<p>Unable to connect to database. Check config.js.</p>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = `<p>Error loading menu.</p>`;
    return;
  }

  allProducts = data || [];
  renderProductGrid("all");
}

function renderProductGrid(category) {
  const grid = document.getElementById("productGrid");
  const filtered = category === "all" 
    ? allProducts 
    : allProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--ink-secondary);">No items available in this category right now.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-thumb">
        <img src="${p.photo_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'}" alt="${p.name}">
      </div>
      <div class="product-details">
        <h3 class="product-title">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description || 'Artisanal baked good prepared fresh to order.')}</p>
        <div class="product-footer">
          <span class="product-price">₹${Number(p.price).toFixed(0)}</span>
          <button class="btn btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="addToCart('${p.id}')">
            + Add
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// Category filter click handler
document.getElementById("categoryTabs")?.addEventListener("click", (e) => {
  if (!e.target.classList.contains("tab-btn")) return;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderProductGrid(e.target.dataset.cat);
});

// ---------- 3. Interactive Cake Builder Studio ----------
function initCakeBuilder() {
  const flavorSelect = document.getElementById("buildFlavor");
  const messageInput = document.getElementById("buildMessage");
  const priceDisplay = document.getElementById("customTotalPrice");
  const messagePreview = document.getElementById("previewMessageText");

  function updateCustomizer() {
    const selectedOption = flavorSelect.options[flavorSelect.selectedIndex];
    const basePrice = Number(selectedOption.dataset.price || 1200);
    
    const sizeRadio = document.querySelector('input[name="buildSize"]:checked');
    const multiplier = Number(sizeRadio?.dataset.multiplier || 1);

    const calculatedTotal = Math.round(basePrice * multiplier);
    priceDisplay.textContent = `₹${calculatedTotal}`;

    // Update board live preview text
    const text = messageInput.value.trim();
    messagePreview.textContent = text || "Happy Birthday!";
  }

  flavorSelect?.addEventListener("change", updateCustomizer);
  messageInput?.addEventListener("input", updateCustomizer);
  document.querySelectorAll('input[name="buildSize"]').forEach(r => r.addEventListener("change", updateCustomizer));

  document.getElementById("addCustomToCartBtn")?.addEventListener("click", () => {
    const selectedOption = flavorSelect.options[flavorSelect.selectedIndex];
    const basePrice = Number(selectedOption.dataset.price || 1200);
    const sizeRadio = document.querySelector('input[name="buildSize"]:checked');
    const multiplier = Number(sizeRadio?.dataset.multiplier || 1);
    
    const item = {
      id: `custom-${Date.now()}`,
      name: `Custom Cake: ${flavorSelect.value} (${sizeRadio.value})`,
      price: Math.round(basePrice * multiplier),
      details: messageInput.value.trim() ? `Message: "${messageInput.value.trim()}"` : "No message"
    };

    cart.push(item);
    updateCartUI();
    openCart();
  });
}

// ---------- 4. Cart & WhatsApp Checkout ----------
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  cart.push({ id: product.id, name: product.name, price: Number(product.price) });
  updateCartUI();
  openCart();
}

function updateCartUI() {
  const countBadge = document.getElementById("cartCount");
  const container = document.getElementById("cartItemsContainer");
  const subtotalDisplay = document.getElementById("cartSubtotal");

  if (countBadge) countBadge.textContent = cart.length;

  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--ink-secondary); margin-top: 40px;">Your basket is empty.</p>`;
    subtotalDisplay.textContent = "₹0";
    return;
  }

  let total = 0;
  container.innerHTML = cart.map((item, index) => {
    total += item.price;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
        <div>
          <strong style="font-size: 14px; display: block;">${escapeHtml(item.name)}</strong>
          ${item.details ? `<small style="color: var(--ink-secondary);">${escapeHtml(item.details)}</small>` : ''}
          <span style="color: var(--berry); font-weight: 600; font-size: 13px;">₹${item.price}</span>
        </div>
        <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #999; cursor: pointer;">&times;</button>
      </div>
    `;
  }).join("");

  subtotalDisplay.textContent = `₹${total}`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function openCart() {
  document.getElementById("cartDrawer")?.classList.add("active");
  document.getElementById("cartOverlay")?.classList.add("active");
}

function closeCart() {
  document.getElementById("cartDrawer")?.classList.remove("active");
  document.getElementById("cartOverlay")?.classList.remove("active");
}

document.getElementById("cartBtn")?.addEventListener("click", openCart);
document.getElementById("closeCartBtn")?.addEventListener("click", closeCart);
document.getElementById("cartOverlay")?.addEventListener("click", closeCart);

// WhatsApp Direct Checkout Trigger
document.getElementById("whatsappCheckoutBtn")?.addEventListener("click", () => {
  if (cart.length === 0) return;

  const phoneNumber = "919876543210"; // Replace with your actual bakery WhatsApp number
  let message = "Hello Ms. Lil Baker! 🧁\nI would like to place an order:\n\n";
  
  let total = 0;
  cart.forEach((item, i) => {
    message += `${i + 1}. *${item.name}* - ₹${item.price}\n`;
    if (item.details) message += `   _${item.details}_\n`;
    total += item.price;
  });

  message += `\n*Total:* ₹${total}\n\nPlease confirm availability!`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, "_blank");
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  init3DHero();
  fetchProducts();
  initCakeBuilder();
});
