// Ms. Lil Baker — Admin Product Manager

const config = window.MSB_CONFIG || {};
const supabaseClient = window.supabase?.createClient(config.url, config.anonKey);

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const headerActions = document.getElementById("headerActions");

let editingId = null;
let selectedFile = null;
let allProducts = []; // Local state for search filtering

// ---------- Auth & Initialization ----------

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showAdmin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.classList.remove("hidden");
  adminView.classList.add("hidden");
  if (headerActions) headerActions.classList.add("hidden");
}

function showAdmin() {
  loginView.classList.add("hidden");
  adminView.classList.remove("hidden");
  if (headerActions) headerActions.classList.remove("hidden");
  loadProductList();
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");
  const btn = document.getElementById("loginBtn");
  
  msg.textContent = "";
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  
  if (error) {
    msg.textContent = "Incorrect email or password.";
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> Log in`;
    return;
  }
  
  btn.innerHTML = `<i class="fa-solid fa-lock"></i> Log in`;
  showAdmin();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

// ---------- Photo Preview ----------

document.getElementById("photoInput").addEventListener("change", (e) => {
  selectedFile = e.target.files[0] || null;
  const preview = document.getElementById("uploadPreview");
  
  if (selectedFile) {
    preview.innerHTML = `<img src="${URL.createObjectURL(selectedFile)}" alt="Preview">`;
  } else {
    preview.innerHTML = `<i class="fa-regular fa-image placeholder-icon"></i><span>No photo selected</span>`;
  }
});

// ---------- Save (Add or Edit) ----------

document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("nameInput").value.trim();
  const category = document.getElementById("categoryInput").value;
  const price = document.getElementById("priceInput").value;
  const description = document.getElementById("descInput").value.trim();
  const msg = document.getElementById("saveMsg");
  const btn = document.getElementById("saveBtn");
  
  msg.className = "form-msg";
  msg.textContent = "";

  if (!name || !price) {
    msg.classList.add("error");
    msg.textContent = "Product Name and Price are required.";
    return;
  }

  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
  msg.textContent = "Uploading to server...";

  let photo_url = null;

  try {
    // 1. Handle Photo Upload
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("product-photos")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseClient.storage
        .from("product-photos")
        .getPublicUrl(filePath);

      photo_url = urlData.publicUrl;
    }

    // 2. Prepare Payload
    const payload = { name, category, price: Number(price), description };
    if (photo_url) payload.photo_url = photo_url;

    // 3. Insert or Update
    if (editingId) {
      const { error } = await supabaseClient.from("products").update(payload).eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from("products").insert(payload);
      if (error) throw error;
    }

    msg.classList.add("success");
    msg.textContent = editingId ? "Product updated successfully!" : "Product added to menu!";
    resetForm();
    loadProductList();
  } catch (err) {
    console.error(err);
    msg.classList.add("error");
    msg.textContent = "Failed to save product. Check connection and try again.";
  } finally {
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Save Product`;
  }
});

document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  selectedFile = null;
  
  document.getElementById("formTitle").innerHTML = `<i class="fa-solid fa-plus"></i> Add a Baked Product`;
  document.getElementById("nameInput").value = "";
  document.getElementById("priceInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("categoryInput").value = "Cakes";
  document.getElementById("photoInput").value = "";
  
  document.getElementById("uploadPreview").innerHTML = `<i class="fa-regular fa-image placeholder-icon"></i><span>No photo selected</span>`;
  document.getElementById("cancelEditBtn").classList.add("hidden");
  
  setTimeout(() => {
    document.getElementById("saveMsg").textContent = "";
    document.getElementById("saveMsg").className = "form-msg";
  }, 3000);
}

// ---------- Catalog Management & Filtering ----------

async function loadProductList() {
  const list = document.getElementById("productList");
  
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="loading-state" style="color:var(--berry-dark);">Couldn't load products. Verify Supabase connection.</p>`;
    return;
  }

  allProducts = data || [];
  renderProducts();
}

function renderProducts() {
  const list = document.getElementById("productList");
  const countBadge = document.getElementById("productCount");
  const searchQuery = (document.getElementById("searchProducts")?.value || "").toLowerCase().trim();

  // Filter products by search query
  const filtered = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery) || 
    p.category.toLowerCase().includes(searchQuery)
  );

  if (countBadge) countBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = `<p class="loading-state">No products found.</p>`;
    return;
  }

  list.innerHTML = filtered.map(p => `
    <div class="product-row ${p.is_available ? "" : "unavailable"}" data-id="${p.id}">
      ${p.photo_url 
        ? `<img src="${p.photo_url}" alt="Thumbnail">` 
        : `<div class="ph-placeholder"><i class="fa-solid fa-cake-candles"></i></div>`}
      
      <div class="product-info">
        <div class="pname">${escapeHtml(p.name)}</div>
        <div class="pmeta">${escapeHtml(p.category)} · ₹${Number(p.price).toFixed(0)} ${p.is_available ? "" : "· <span style='color:var(--berry)'>Hidden</span>"}</div>
      </div>
      
      <div class="row-actions">
        <button class="icon-btn" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn" data-action="toggle" title="${p.is_available ? "Hide from menu" : "Show on menu"}">
          <i class="fa-solid ${p.is_available ? 'fa-eye-slash' : 'fa-eye'}"></i>
        </button>
        <button class="icon-btn danger" data-action="delete" title="Delete forever"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join("");
}

// Live search listener
document.getElementById("searchProducts")?.addEventListener("input", renderProducts);

// Global Actions Delegation (Edit, Toggle, Delete)
document.getElementById("productList").addEventListener("click", async (e) => {
  const btn = e.target.closest(".icon-btn");
  if (!btn) return;
  
  const row = e.target.closest(".product-row");
  const id = row.dataset.id;
  const product = allProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  // EDIT
  if (btn.dataset.action === "edit") {
    editingId = id;
    document.getElementById("formTitle").innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit "${product.name}"`;
    document.getElementById("nameInput").value = product.name;
    document.getElementById("categoryInput").value = product.category;
    document.getElementById("priceInput").value = product.price;
    document.getElementById("descInput").value = product.description || "";
    
    document.getElementById("uploadPreview").innerHTML = product.photo_url
      ? `<img src="${product.photo_url}" alt="Preview">`
      : `<i class="fa-regular fa-image placeholder-icon"></i><span>No photo selected</span>`;
      
    document.getElementById("cancelEditBtn").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // TOGGLE AVAILABILITY
  if (btn.dataset.action === "toggle") {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    await supabaseClient.from("products").update({ is_available: !product.is_available }).eq("id", id);
    loadProductList();
  }

  // DELETE
  if (btn.dataset.action === "delete") {
    if (!confirm(`Are you sure you want to delete "${product.name}"?\nThis cannot be undone.`)) return;
    
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    await supabaseClient.from("products").delete().eq("id", id);
    loadProductList();
  }
});

// Security: Prevent XSS in catalog strings
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// Kick off logic on load
checkSession();
