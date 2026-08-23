// Ms. Lil Baker — admin product manager

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");

let editingId = null;
let selectedFile = null;
let allAdminProducts = [];

// ---------- Auth ----------

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
}

function showAdmin() {
  loginView.classList.add("hidden");
  adminView.classList.remove("hidden");
  loadProductList();
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");
  msg.textContent = "";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = "That email or password isn't right.";
    return;
  }
  showAdmin();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

// ---------- Photo preview ----------

document.getElementById("photoInput").addEventListener("change", (e) => {
  selectedFile = e.target.files[0] || null;
  const preview = document.getElementById("uploadPreview");
  const label = document.getElementById("fileLabel");
  if (selectedFile) {
    preview.innerHTML = `<img src="${URL.createObjectURL(selectedFile)}" alt="">`;
    label.textContent = selectedFile.name;
  } else {
    preview.innerHTML = "Tap below to add a photo";
    label.textContent = "Choose photo";
  }
});

// ---------- Save (add or edit) ----------

document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("nameInput").value.trim();
  const category = document.getElementById("categoryInput").value;
  const price = document.getElementById("priceInput").value;
  const description = document.getElementById("descInput").value.trim();
  const msg = document.getElementById("saveMsg");
  msg.className = "form-msg";
  msg.textContent = "";

  if (!name || !price) {
    msg.classList.add("error");
    msg.textContent = "Name and price are required.";
    return;
  }

  msg.textContent = "Saving…";

  let photo_url = null;

  try {
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

    const payload = { name, category, price: Number(price), description };
    if (photo_url) payload.photo_url = photo_url;

    if (editingId) {
      const { error } = await supabaseClient.from("products").update(payload).eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from("products").insert(payload);
      if (error) throw error;
    }

    msg.classList.add("ok");
    msg.textContent = "Saved.";
    resetForm();
    loadProductList();
  } catch (err) {
    console.error(err);
    msg.classList.add("error");
    msg.textContent = "Something went wrong saving that. Try again.";
  }
});

document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  selectedFile = null;
  document.getElementById("formTitle").textContent = "Add a product";
  document.getElementById("nameInput").value = "";
  document.getElementById("priceInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("categoryInput").value = "Cakes";
  document.getElementById("photoInput").value = "";
  document.getElementById("uploadPreview").innerHTML = "Tap below to add a photo";
  document.getElementById("fileLabel").textContent = "Choose photo";
  document.getElementById("cancelEditBtn").classList.add("hidden");
}

// ---------- List: load, search, filter, group ----------

async function loadProductList() {
  const list = document.getElementById("productList");
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p style="color:var(--plum-dark); font-size:13px;">Couldn't load products.</p>`;
    return;
  }

  allAdminProducts = data || [];
  updateStats();
  renderList();
}

function updateStats() {
  const total = allAdminProducts.length;
  const live = allAdminProducts.filter(p => p.is_available).length;
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statLive").textContent = live;
  document.getElementById("statHidden").textContent = total - live;
}

function renderList() {
  const list = document.getElementById("productList");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const filterCat = document.getElementById("filterSelect").value;

  let items = allAdminProducts;
  if (filterCat !== "All") items = items.filter(p => p.category === filterCat);
  if (search) items = items.filter(p => p.name.toLowerCase().includes(search));

  if (items.length === 0) {
    list.innerHTML = `<div class="list-empty-msg">Nothing matches — try a different search or filter.</div>`;
    return;
  }

  // group by category for a tidier list
  const groups = {};
  items.forEach(p => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });

  list.innerHTML = Object.keys(groups).map(cat => `
    <div class="cat-group-label">${escapeHtml(cat)}</div>
    ${groups[cat].map(p => `
      <div class="product-row ${p.is_available ? "" : "unavailable"}" data-id="${p.id}">
        ${p.photo_url
          ? `<img src="${p.photo_url}" alt="">`
          : `<div class="ph-placeholder"></div>`}
        <div class="product-info">
          <div class="pname">${escapeHtml(p.name)}</div>
          <div class="pmeta">₹${Number(p.price).toFixed(0)}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-action="edit">Edit</button>
          <button class="icon-btn" data-action="toggle">${p.is_available ? "Hide" : "Show"}</button>
          <button class="icon-btn danger" data-action="delete">Delete</button>
        </div>
      </div>
    `).join("")}
  `).join("");
}

document.getElementById("searchInput").addEventListener("input", renderList);
document.getElementById("filterSelect").addEventListener("change", renderList);

document.getElementById("productList").addEventListener("click", async (e) => {
  const btn = e.target.closest(".icon-btn");
  if (!btn) return;
  const row = e.target.closest(".product-row");
  const id = row.dataset.id;
  const product = allAdminProducts.find(p => p.id === id);
  if (!product) return;

  if (btn.dataset.action === "edit") {
    editingId = id;
    document.getElementById("formTitle").textContent = "Edit product";
    document.getElementById("nameInput").value = product.name;
    document.getElementById("categoryInput").value = product.category;
    document.getElementById("priceInput").value = product.price;
    document.getElementById("descInput").value = product.description || "";
    document.getElementById("uploadPreview").innerHTML = product.photo_url
      ? `<img src="${product.photo_url}" alt="">`
      : "Tap below to add a photo";
    document.getElementById("cancelEditBtn").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (btn.dataset.action === "toggle") {
    await supabaseClient.from("products").update({ is_available: !product.is_available }).eq("id", id);
    loadProductList();
  }

  if (btn.dataset.action === "delete") {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    await supabaseClient.from("products").delete().eq("id", id);
    loadProductList();
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

checkSession();
