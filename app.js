/* ================================================
   ShopWave — App Logic
   ================================================ */

(() => {
  "use strict";

  // ───── State ─────
  let allProducts = [];
  let filteredProducts = [];
  let cart = []; // { product, qty }
  let activeCategory = "all";

  // ───── DOM refs ─────
  const $grid       = document.getElementById("product-grid");
  const $heading    = document.getElementById("products-heading");
  const $count      = document.getElementById("products-count");
  const $empty      = document.getElementById("empty-state");
  const $search     = document.getElementById("search-input");
  const $chips      = document.getElementById("filter-chips");
  const $cartToggle = document.getElementById("cart-toggle");
  const $cartBadge  = document.getElementById("cart-badge");
  const $cartSidebar= document.getElementById("cart-sidebar");
  const $cartOverlay= document.getElementById("cart-overlay");
  const $cartClose  = document.getElementById("cart-close");
  const $cartBody   = document.getElementById("cart-body");
  const $cartEmpty  = document.getElementById("cart-empty");
  const $cartFooter = document.getElementById("cart-footer");
  const $subtotal   = document.getElementById("cart-subtotal");
  const $discount   = document.getElementById("cart-discount");
  const $total      = document.getElementById("cart-total");
  const $clearCart   = document.getElementById("btn-clear-cart");
  const $toastBox   = document.getElementById("toast-container");

  // ───── Helpers ─────
  const fmt = (n) => "$" + n.toFixed(2);

  function starsSVG(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.round(rating);
      html += `<svg class="star ${filled ? "" : "empty"}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return html;
  }

  function discountedPrice(price, discPct) {
    return price - price * (discPct / 100);
  }

  // ───── Toast ─────
  function showToast(message, type = "success") {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `
      <span class="toast-icon ${type === "warn" ? "warn" : ""}">
        ${type === "warn"
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        }
      </span>
      <span>${message}</span>`;
    $toastBox.appendChild(t);
    setTimeout(() => {
      t.classList.add("toast-out");
      t.addEventListener("animationend", () => t.remove());
    }, 2200);
  }

  // ───── Skeletons ─────
  function renderSkeletons(n = 12) {
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-line w60"></div>
            <div class="skeleton-line w80"></div>
            <div class="skeleton-line w40 h20"></div>
          </div>
        </div>`;
    }
    $grid.innerHTML = html;
  }

  // ───── Render Products ─────
  function renderProducts(products) {
    if (!products.length) {
      $grid.innerHTML = "";
      $empty.classList.remove("hidden");
      $count.textContent = "";
      return;
    }
    $empty.classList.add("hidden");
    $count.textContent = `(${products.length} product${products.length > 1 ? "s" : ""})`;

    $grid.innerHTML = products.map((p) => {
      const dp = discountedPrice(p.price, p.discountPercentage);
      const inCart = cart.some((c) => c.product.id === p.id);
      return `
        <article class="product-card" data-id="${p.id}">
          <div class="card-img-wrap">
            <img src="${p.thumbnail}" alt="${p.title}" loading="lazy" />
            ${p.discountPercentage >= 10 ? `<span class="card-badge badge-discount">-${Math.round(p.discountPercentage)}%</span>` : ""}
            ${p.stock < 20 ? `<span class="card-badge badge-stock-low" style="top:${p.discountPercentage >= 10 ? 38 : 12}px">Low Stock</span>` : ""}
          </div>
          <div class="card-body">
            <span class="card-category">${p.category}</span>
            <h3 class="card-title">${p.title}</h3>
            <span class="card-brand">${p.brand || "Unbranded"}</span>
            <div class="card-rating">
              <div class="stars">${starsSVG(p.rating)}</div>
              <span class="rating-val">${p.rating.toFixed(1)}</span>
            </div>
            <div class="card-price-row">
              <span class="card-price">${fmt(dp)}</span>
              ${p.discountPercentage > 0 ? `<span class="card-price-original">${fmt(p.price)}</span>` : ""}
            </div>
            <button class="btn-add-cart ${inCart ? "added" : ""}" data-id="${p.id}" id="add-cart-${p.id}">
              ${inCart
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> In Cart`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add to Cart`
              }
            </button>
          </div>
        </article>`;
    }).join("");
  }

  // ───── Render Chips ─────
  function renderChips(products) {
    const cats = [...new Set(products.map((p) => p.category))].sort();
    let html = `<button class="chip ${activeCategory === "all" ? "active" : ""}" data-cat="all">All</button>`;
    cats.forEach((c) => {
      html += `<button class="chip ${activeCategory === c ? "active" : ""}" data-cat="${c}">${c}</button>`;
    });
    $chips.innerHTML = html;
  }

  // ───── Filter & Search ─────
  function applyFilters() {
    const q = $search.value.trim().toLowerCase();
    filteredProducts = allProducts.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    $heading.textContent = activeCategory === "all" ? "All Products" : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
    renderProducts(filteredProducts);
  }

  // ───── Cart Logic ─────
  function addToCart(productId) {
    const existing = cart.find((c) => c.product.id === productId);
    if (existing) return;
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    cart.push({ product, qty: 1 });
    updateCartUI();
    renderProducts(filteredProducts); // refresh grid buttons
    showToast(`${product.title} added to cart`);
  }

  function removeFromCart(productId) {
    const item = cart.find((c) => c.product.id === productId);
    cart = cart.filter((c) => c.product.id !== productId);
    updateCartUI();
    renderProducts(filteredProducts);
    if (item) showToast(`${item.product.title} removed`, "warn");
  }

  function changeQty(productId, delta) {
    const item = cart.find((c) => c.product.id === productId);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    updateCartUI();
  }

  function clearCart() {
    if (!cart.length) return;
    cart = [];
    updateCartUI();
    renderProducts(filteredProducts);
    showToast("Cart cleared", "warn");
  }

  function updateCartUI() {
    // Badge
    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    $cartBadge.textContent = totalItems;
    $cartBadge.classList.remove("bump");
    void $cartBadge.offsetWidth; // reflow
    $cartBadge.classList.add("bump");

    // Empty / filled states
    if (!cart.length) {
      $cartBody.classList.add("hidden");
      $cartEmpty.classList.remove("hidden");
      $cartFooter.classList.add("hidden");
    } else {
      $cartBody.classList.remove("hidden");
      $cartEmpty.classList.add("hidden");
      $cartFooter.classList.remove("hidden");
    }

    // Render items
    $cartBody.innerHTML = cart.map((c) => {
      const p = c.product;
      const dp = discountedPrice(p.price, p.discountPercentage);
      return `
        <div class="cart-item" data-id="${p.id}">
          <div class="cart-item-img"><img src="${p.thumbnail}" alt="${p.title}" /></div>
          <div class="cart-item-details">
            <span class="cart-item-title">${p.title}</span>
            <span class="cart-item-brand">${p.brand || "Unbranded"} · ${p.category}</span>
            <div class="cart-item-meta">
              <span>⭐ ${p.rating.toFixed(1)}</span>
              <span>📦 ${p.availabilityStatus}</span>
              <span>🚚 ${p.shippingInformation}</span>
            </div>
            <div class="cart-item-meta">
              <span>🔒 ${p.warrantyInformation}</span>
              <span>↩️ ${p.returnPolicy}</span>
            </div>
            <div class="cart-item-bottom">
              <span class="cart-item-price">${fmt(dp * c.qty)}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="qty-controls">
                  <button class="qty-btn" data-action="dec" data-id="${p.id}">−</button>
                  <span class="qty-value">${c.qty}</span>
                  <button class="qty-btn" data-action="inc" data-id="${p.id}">+</button>
                </div>
                <button class="cart-item-remove" data-id="${p.id}" aria-label="Remove item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join("");

    // Totals
    let subtotal = 0;
    let discountTotal = 0;
    cart.forEach((c) => {
      subtotal += c.product.price * c.qty;
      discountTotal += (c.product.price * c.product.discountPercentage / 100) * c.qty;
    });
    const total = subtotal - discountTotal;
    $subtotal.textContent = fmt(subtotal);
    $discount.textContent = "-" + fmt(discountTotal);
    $total.textContent = fmt(total);
  }

  // ───── Cart sidebar open/close ─────
  function openCart() {
    $cartSidebar.classList.add("open");
    $cartOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    $cartSidebar.classList.remove("open");
    $cartOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ───── Event Listeners ─────
  // Search
  let searchTimer;
  $search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 250);
  });

  // Filter chips
  $chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeCategory = chip.dataset.cat;
    $chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    applyFilters();
  });

  // Add to cart (delegation on grid)
  $grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add-cart");
    if (!btn || btn.classList.contains("added")) return;
    addToCart(Number(btn.dataset.id));
  });

  // Cart sidebar events
  $cartToggle.addEventListener("click", openCart);
  $cartClose.addEventListener("click", closeCart);
  $cartOverlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  // Cart body delegation (qty, remove)
  $cartBody.addEventListener("click", (e) => {
    const qtyBtn = e.target.closest(".qty-btn");
    if (qtyBtn) {
      const id = Number(qtyBtn.dataset.id);
      const delta = qtyBtn.dataset.action === "inc" ? 1 : -1;
      changeQty(id, delta);
      return;
    }
    const rmBtn = e.target.closest(".cart-item-remove");
    if (rmBtn) {
      removeFromCart(Number(rmBtn.dataset.id));
    }
  });

  // Clear cart
  $clearCart.addEventListener("click", clearCart);

  // ───── Fetch & Init ─────
  async function init() {
    renderSkeletons(16);
    try {
      const res = await fetch("https://dummyjson.com/products?limit=194");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      allProducts = data.products;
      filteredProducts = [...allProducts];
      renderChips(allProducts);
      renderProducts(filteredProducts);
      $count.textContent = `(${allProducts.length} products)`;
      updateCartUI(); // initial state
    } catch (err) {
      $grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--red);padding:40px;">Failed to load products. Please try again later.</p>`;
      console.error(err);
    }
  }

  init();
})();
