// Ms. Lil Baker — customer site logic

let allProducts = [];
let activeCategory = "All";

async function loadProducts() {
  const grid = document.getElementById("productGrid");

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load products:", error);
    grid.innerHTML = `<div class="empty-state">Couldn't load the menu right now. Please refresh.</div>`;
    return;
  }

  allProducts = data || [];
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("productGrid");
  const items = activeCategory === "All"
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">Nothing here yet — check back soon.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="card">
      <div class="card-photo">
        ${p.photo_url
          ? `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
          : ""}
      </div>
      <div class="card-scallop"></div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.category)}</div>
        <h3 class="card-name">${escapeHtml(p.name)}</h3>
        <p class="card-desc">${escapeHtml(p.description || "")}</p>
        <div class="card-foot">
          <span class="card-price">${Number(p.price).toFixed(0)}</span>
        </div>
      </div>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeCategory = btn.dataset.cat;
  renderGrid();
});

loadProducts();
