// Ms. Lil Baker — customer site logic

let allProducts = [];
let activeCategory = "All";

// Replace with Rubani's actual WhatsApp phone number (with country code, e.g., '919999999999')
const BAKERY_WHATSAPP_NUMBER = "919999999999"; 

async function loadProducts() {
  const grid = document.getElementById("productGrid");

  try {
    if (typeof supabaseClient === "undefined") {
      throw new Error("Supabase client is not initialized. Check config.js.");
    }

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    renderGrid();
  } catch (error) {
    console.error("Failed to load products:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <p>Couldn't load the menu right now. Please refresh the page or reach out directly via WhatsApp.</p>
        <a href="https://wa.me/${BAKERY_WHATSAPP_NUMBER}" class="btn btn-whatsapp" target="_blank" style="margin-top: 10px; display: inline-block;">Message on WhatsApp</a>
      </div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById("productGrid");
  const items = activeCategory === "All"
    ? allProducts
    : allProducts.filter(p => p.category?.toLowerCase() === activeCategory.toLowerCase());

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">No items found in this category yet — check back soon!</div>`;
    return;
  }

  grid.innerHTML = items.map(p => {
    const formattedPrice = `₹${Number(p.price).toLocaleString("en-IN")}`;
    const orderMessage = encodeURIComponent(`Hi Rubani! I'd like to order: ${p.name} (${formattedPrice})`);
    const waLink = `https://wa.me/${BAKERY_WHATSAPP_NUMBER}?text=${orderMessage}`;

    return `
      <div class="card">
        <div class="card-photo">
          ${p.photo_url
            ? `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
            : `<div class="photo-placeholder"><i class="fa-solid fa-cake-candles"></i></div>`}
        </div>
        <div class="card-scallop"></div>
        <div class="card-body">
          <div class="card-cat">${escapeHtml(p.category)}</div>
          <h3 class="card-name">${escapeHtml(p.name)}</h3>
          <p class="card-desc">${escapeHtml(p.description || "Freshly baked on order using premium ingredients.")}</p>
          <div class="card-foot">
            <span class="card-price">${formattedPrice}</span>
            <a href="${waLink}" class="btn-card-order" target="_blank" rel="noopener noreferrer">
              Order <i class="fa-brands fa-whatsapp"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

document.getElementById("tabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeCategory = btn.dataset.cat;
  renderGrid();
});

// Initialize load
loadProducts();
