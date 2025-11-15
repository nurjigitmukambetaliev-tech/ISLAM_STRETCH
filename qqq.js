/* script.js — логика CeilPro: каталог, поиск, корзина (localStorage), купон, отзывы, модалки */

(() => {
  // helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const create = (t, attrs = {}) => {
    const e = document.createElement(t);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    return e;
  };
  const fmt = v => Number(v).toLocaleString('ru-RU');

  // localStorage keys
  const LS_CART = 'ceilpro_cart_v1';
  const LS_ORDERS = 'ceilpro_orders_v1';

  // demo products (натяжные потолки — комплектующие)
  const PRODUCTS = [
    {id:'p1', title:'Профиль потолочный алюминиевый SL-20', price: 450, category:'Профили', rating:4.6, badge:'Новинка', color:'#7c3aed', popular: 85, created:'2025-06-10', desc:'Алюминиевый профиль для натяжных потолков, длина 2.5 м.'},
    {id:'p2', title:'Багет потолочный белый PB-35', price: 320, category:'Багеты', rating:4.3, badge:'', color:'#06b6d4', popular: 70, created:'2025-03-02', desc:'Пластиковый багет для аккуратного края потолка.'},
    {id:'p3', title:'Крепёж монтажный набор (50 шт)', price: 299, category:'Крепёж', rating:4.1, badge:'Популярно', color:'#0ea5a4', popular: 78, created:'2024-12-15', desc:'Набор крепежа для надежной фиксации профилей.'},
    {id:'p4', title:'Профиль L-угол 25x25', price: 280, category:'Профили', rating:4.0, badge:'', color:'#f97316', popular: 60, created:'2024-08-01', desc:'Угловой профиль для сложных решений.'},
    {id:'p5', title:'Светильник LED recessed 12W', price: 1590, category:'Освещение', rating:4.7, badge:'Хит', color:'#ef4444', popular: 95, created:'2025-05-05', desc:'Точечный встраиваемый светильник 12W, теплый/холодный свет.'},
    {id:'p6', title:'Профиль натяжной камерный', price: 520, category:'Профили', rating:4.2, badge:'', color:'#94a3b8', popular: 66, created:'2024-06-01', desc:'Камера для натяжного полотна, повышенной прочности.'},
    {id:'p7', title:'Соединитель для профиля', price: 90, category:'Крепёж', rating:3.9, badge:'', color:'#60a5fa', popular: 40, created:'2023-12-30', desc:'Соединительный элемент для стыков профилей.'},
    {id:'p8', title:'Профиль угловой декоративный', price: 420, category:'Декор', rating:4.4, badge:'', color:'#7dd3fc', popular: 62, created:'2025-02-11', desc:'Декоративный элемент для оформления стыков.'},
    {id:'p9', title:'Портативный фен для монтажа', price: 3490, category:'Инструменты', rating:4.5, badge:'Хит', color:'#34d399', popular: 88, created:'2025-01-20', desc:'Термофен для установки и подрезки полотен.'},
    {id:'p10', title:'Лента уплотнительная 10м', price: 220, category:'Аксессуары', rating:4.0, badge:'', color:'#a78bfa', popular: 52, created:'2024-09-08', desc:'Уплотнительная лента для герметизации швов.'}
  ];

  // state
  let state = {
    products: PRODUCTS.slice(),
    filtered: PRODUCTS.slice(),
    cart: JSON.parse(localStorage.getItem(LS_CART) || '[]'),
    orders: JSON.parse(localStorage.getItem(LS_ORDERS) || '[]'),
    coupon: null,
    page: 1,
    perPage: 9
  };

  // elements
  const productsGrid = $('#productsGrid');
  const catSelect = $('#catSelect');
  const sortSelect = $('#sortSelect');
  const inlineSearch = $('#inlineSearch');
  const pagination = $('#pagination');
  const cartOpenBtn = $('#cartOpen');
  const cartPanel = $('#cartPanel');
  const cartItems = $('#cartItems');
  const cartTotal = $('#cartTotal');
  const cartBadge = $('#cartBadge');
  const cartClose = $('#cartClose');
  const clearCartBtn = $('#clearCart');
  const checkoutBtn = $('#checkoutBtn');
  const applyCouponBtn = $('#applyCoupon');
  const couponInput = $('#couponInput');
  const modal = $('#modal');
  const reviewsCarousel = $('#reviewsCarousel');
  const faqList = $('#faqList');
  const contactForm = $('#contactForm');
  const contactNotice = $('#contactNotice');
  const themeToggle = $('#themeToggle');
  const searchToggle = $('#searchToggle');
  const searchBox = $('#searchBox');
  const globalSearch = $('#globalSearch');
  const yearEl = $('#year');

  yearEl.textContent = new Date().getFullYear();

  // helpers
  function save() {
    localStorage.setItem(LS_CART, JSON.stringify(state.cart));
    localStorage.setItem(LS_ORDERS, JSON.stringify(state.orders));
  }
  function totalCart() {
    const sum = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (state.coupon && state.coupon.discountPct) {
      const disc = Math.round(sum * (state.coupon.discountPct / 100));
      return {sum, discounted: sum - disc, disc};
    }
    return {sum, discounted: sum, disc:0};
  }
  function showToast(msg, timeout=2200) {
    const t = create('div', {class:'toast'}); t.textContent = msg;
    document.body.appendChild(t);
    t.style.position='fixed'; t.style.right='20px'; t.style.bottom='20px'; t.style.background='rgba(15,23,42,0.9)';
    t.style.color='white'; t.style.padding='10px 14px'; t.style.borderRadius='8px'; t.style.zIndex=2000;
    setTimeout(()=> t.remove(), timeout);
  }

  // render categories
  function buildCategories() {
    const cats = Array.from(new Set(state.products.map(p=>p.category)));
    catSelect.innerHTML = '<option value="all">Все</option>';
    cats.forEach(c => {
      const o = create('option'); o.value = c; o.textContent = c;
      catSelect.appendChild(o);
    });
  }

  // pagination helper
  function paginate(arr, page=1, per=state.perPage) {
    const total = Math.max(1, Math.ceil(arr.length / per));
    page = Math.max(1, Math.min(page, total));
    const start = (page-1) * per;
    return {items: arr.slice(start, start+per), total, page};
  }

  // render products
  function renderProducts(page=1) {
    // sort, filter already applied in state.filtered
    const pag = paginate(state.filtered, page);
    state.page = pag.page;
    productsGrid.innerHTML = '';
    pag.items.forEach(p => {
      const card = create('article', {class:'product-card'});
      const vis = create('div', {class:'product-visual'});
      vis.style.background = `linear-gradient(135deg, ${p.color}, #00000022)`;
      vis.textContent = p.title.split(' ')[0];
      const title = create('div', {class:'product-title', text: p.title});
      const meta = create('div', {class:'product-meta', text: `${p.category} • ${p.rating}★`});
      const row = create('div', {class:'product-row'});
      const price = create('div', {class:'product-price', text: `${fmt(p.price)} ₽`});
      const actions = create('div', {class:'product-actions'});
      const addBtn = create('button', {class:'btn', text:'В корзину'});
      const viewBtn = create('button', {class:'btn ghost', text:'Подробнее'});
      addBtn.onclick = () => { addToCart(p.id); };
      viewBtn.onclick = () => { openQuickView(p.id); };
      actions.appendChild(addBtn); actions.appendChild(viewBtn);
      if (p.badge) {
        const t = create('div', {class:'tag', text: p.badge});
        card.appendChild(t);
      }
      card.appendChild(vis);
      card.appendChild(title);
      card.appendChild(meta);
      row.appendChild(price);
      row.appendChild(actions);
      card.appendChild(row);
      productsGrid.appendChild(card);
    });

    // pagination UI
    pagination.innerHTML = '';
    for (let i=1;i<=pag.total;i++){
      const b = create('button'); b.className='btn ghost'; b.textContent = i;
      if (i === pag.page) { b.style.fontWeight = 800; b.style.borderColor = 'rgba(15,23,42,0.08)'; }
      b.onclick = ()=> renderProducts(i);
      pagination.appendChild(b);
    }

    // live region or counter
    const countMsg = create('div', {class:'muted small', text: `Показано ${pag.items.length} из ${state.filtered.length} товаров`});
    productsGrid.parentElement.querySelector('.section-head').appendChild(countMsg);
    setTimeout(()=>countMsg.remove(),2000);

    updateCartUI();
  }

  // filter & search
  function applyFilters() {
    const cat = catSelect.value;
    const sort = sortSelect.value;
    const q = (inlineSearch.value || globalSearch.value || '').toLowerCase().trim();
    let arr = state.products.slice();
    if (cat && cat !== 'all') arr = arr.filter(p => p.category === cat);
    if (q) arr = arr.filter(p => (p.title + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q));
    // sort
    if (sort === 'price-asc') arr.sort((a,b)=>a.price-b.price);
    else if (sort === 'price-desc') arr.sort((a,b)=>b.price-a.price);
    else if (sort === 'new') arr.sort((a,b)=> new Date(b.created) - new Date(a.created));
    else arr.sort((a,b)=> b.popular - a.popular);
    state.filtered = arr;
    renderProducts(1);
  }

  // cart operations
  function addToCart(id) {
    const p = state.products.find(x=>x.id===id);
    if (!p) return;
    const ex = state.cart.find(c=>c.id===id);
    if (ex) ex.qty++;
    else state.cart.push({id:p.id,title:p.title,price:p.price,qty:1});
    save(); updateCartUI(); showToast('Добавлено в корзину');
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(c => c.id !== id);
    save(); updateCartUI();
  }

  function changeQty(id, qty) {
    const c = state.cart.find(i=>i.id===id);
    if (!c) return;
    c.qty = Math.max(0, qty);
    if (c.qty === 0) removeFromCart(id);
    save(); updateCartUI();
  }

  function updateCartUI() {
    // badge
    const count = state.cart.reduce((s,i)=>s+i.qty,0);
    cartBadge.textContent = count;
    // items
    cartItems.innerHTML = '';
    if (state.cart.length === 0) {
      cartItems.innerHTML = '<div class="muted center">Корзина пуста</div>';
    } else {
      state.cart.forEach(it => {
        const row = create('div', {class:'cart-item'});
        const left = create('div'); left.textContent = `${it.title} x${it.qty}`;
        const right = create('div');
        const price = create('div', {text: `${fmt(it.price * it.qty)} ₽`});
        const controls = create('div', {class:'row'});
        const minus = create('button', {class:'btn ghost', text:'−'}); minus.onclick = ()=> changeQty(it.id, it.qty-1);
        const plus = create('button', {class:'btn ghost', text:'+'}); plus.onclick = ()=> changeQty(it.id, it.qty+1);
        const del = create('button', {class:'btn ghost', text:'✕'}); del.onclick = ()=> removeFromCart(it.id);
        controls.appendChild(minus); controls.appendChild(plus); controls.appendChild(del);
        right.appendChild(price); right.appendChild(controls);
        row.appendChild(left); row.appendChild(right);
        cartItems.appendChild(row);
      });
    }
    // total
    const tot = totalCart();
    cartTotal.textContent = `${fmt(tot.discounted)} ₽`;
  }

  // cart open/close
  function openCart() {
    cartPanel.classList.add('open');
    cartPanel.setAttribute('aria-hidden','false');
    $('#cartOpen').setAttribute('aria-expanded','true');
  }
  function closeCart() {
    cartPanel.classList.remove('open');
    cartPanel.setAttribute('aria-hidden','true');
    $('#cartOpen').setAttribute('aria-expanded','false');
  }

  cartOpenBtn.onclick = ()=> { openCart(); };
  cartClose.onclick = ()=> { closeCart(); };
  clearCartBtn.onclick = ()=> { if (confirm('Очистить корзину?')) { state.cart=[]; save(); updateCartUI(); } };

  // coupon
  applyCouponBtn.onclick = () => {
    const code = (couponInput.value || '').trim().toUpperCase();
    if (!code) { showToast('Введите код купона'); return; }
    if (code === 'FIRST10') {
      state.coupon = {code:'FIRST10', discountPct:10};
      showToast('Купон FIRST10 применён: 10% скидка');
    } else {
      showToast('Купон не найден');
      state.coupon = null;
    }
    updateCartUI();
  };

  // quick view modal
  function openQuickView(id) {
    const p = state.products.find(x=>x.id===id);
    if (!p) return;
    modal.innerHTML = '';
    const wrap = create('div');
    wrap.innerHTML = `
      <div style="display:flex;gap:16px;align-items:flex-start">
        <div style="flex:1">
          <div style="height:200px;border-radius:12px;background:linear-gradient(135deg, ${p.color}, #00000022);display:flex;align-items:center;justify-content:center;color:white;font-weight:800">${p.title}</div>
        </div>
        <div style="width:360px">
          <h3>${p.title}</h3>
          <div class="muted">${p.category} • ${p.rating}★</div>
          <p style="margin-top:8px">${p.desc}</p>
          <div style="margin-top:8px;font-weight:800">${fmt(p.price)} ₽</div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button class="btn" id="modalAdd">Добавить</button>
            <button class="btn ghost" id="modalClose">Закрыть</button>
          </div>
        </div>
      </div>
    `;
    modal.appendChild(wrap);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    $('#modalClose').onclick = closeModal;
    $('#modalAdd').onclick = ()=> { addToCart(p.id); closeModal(); };
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = '';
  }
  modal.addEventListener('click', (e)=> { if (e.target === modal) closeModal(); });

  // checkout (mock)
  checkoutBtn.onclick = () => {
    if (state.cart.length === 0) { alert('Корзина пуста'); return; }
    // simple form
    modal.innerHTML = '';
    const form = create('div');
    form.innerHTML = `
      <h3>Оформление заказа</h3>
      <div class="muted small">Итого: <strong>${fmt(totalCart().discounted)} ₽</strong></div>
      <div style="margin-top:10px">
        <input id="oName" placeholder="Имя" />
        <input id="oPhone" placeholder="Телефон" />
        <input id="oAddress" placeholder="Адрес доставки" />
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn primary" id="payBtn">Оплатить (mock)</button>
        <button class="btn ghost" id="cancelPay">Отмена</button>
      </div>
    `;
    modal.appendChild(form);
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
    $('#cancelPay').onclick = closeModal;
    $('#payBtn').onclick = ()=> {
      const name = $('#oName').value || 'Клиент';
      const phone = $('#oPhone').value || '';
      const address = $('#oAddress').value || '';
      const order = {
        id: 'ORD' + Date.now(),
        created: new Date().toISOString(),
        items: state.cart.slice(),
        total: totalCart().discounted,
        name, phone, address,
        coupon: state.coupon ? state.coupon.code : null
      };
      state.orders.push(order);
      state.cart = []; state.coupon = null;
      save();
      updateCartUI();
      closeModal();
      showToast('Заказ оформлен! Номер: ' + order.id, 3500);
    };
  };

  // reviews & faq
  const REVIEWS = [
    {name:'Алексей','text':'Быстрая доставка и хорошие профили. Рекомендую.'},
    {name:'Ирина','text':'Купили багеты и светильники — всё подошло отлично.'},
    {name:'Сергей','text':'Профессиональная консультация по упаковке и монтажу.'}
  ];
  function renderReviews() {
    reviewsCarousel.innerHTML = '';
    REVIEWS.forEach(r => {
      const c = create('div', {class:'review'});
      c.innerHTML = `<strong>${r.name}</strong><div class="muted small" style="margin-top:8px">${r.text}</div>`;
      reviewsCarousel.appendChild(c);
    });
  }
  const FAQ = [
    {q:'Как быстро доставляете?', a:'Доставка в пределах региона 1–3 рабочих дня.'},
    {q:'Есть ли опт?', a:'Да — предоставляем оптовые цены при заказе от 50 единиц.'},
    {q:'Можно ли получить образцы?', a:'Да, отправляем небольшие образцы по запросу.'}
  ];
  function renderFAQ() {
    faqList.innerHTML = '';
    FAQ.forEach(item => {
      const it = create('div', {class:'faq-item'});
      const q = create('div', {class:'faq-q', text: item.q});
      const a = create('div', {class:'faq-a', text: item.a});
      it.appendChild(q); it.appendChild(a);
      it.onclick = ()=> { a.style.display = a.style.display === 'block' ? 'none' : 'block'; };
      faqList.appendChild(it);
    });
  }

  // contact form
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#cfName').value.trim();
    const email = $('#cfEmail').value.trim();
    const msg = $('#cfMessage').value.trim();
    if (!name || !email || !msg) { contactNotice.textContent = 'Заполните все обязательные поля'; return; }
    contactNotice.textContent = 'Спасибо! Ваше сообщение отправлено.';
    contactForm.reset();
    setTimeout(()=> contactNotice.textContent = '', 3000);
  });
  $('#contactReset').onclick = ()=> { contactForm.reset(); };

  // quick interactions
  $('#applyFirst10').onclick = ()=> { couponInput.value = 'FIRST10'; applyCouponBtn.click(); };
  $('#openOffer').onclick = ()=> { window.location.hash = '#contact'; $('input#cfName')?.focus(); };

  // theme toggle (light by default, option to switch)
  function loadTheme() {
    const t = localStorage.getItem('ceilpro_theme') || 'light';
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  themeToggle.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('ceilpro_theme','light'); }
    else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('ceilpro_theme','dark'); }
  };

  // search box toggle
  searchToggle.onclick = ()=> {
    const hidden = searchBox.classList.toggle('hide');
    searchBox.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    if (!hidden) globalSearch.focus();
  };
  globalSearch.addEventListener('input', ()=> { inlineSearch.value = globalSearch.value; applyFilters(); });

  // quick view via keyboard Esc
  window.addEventListener('keydown', (e)=> {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
      if (!searchBox.classList.contains('hide')) { searchBox.classList.add('hide'); searchBox.setAttribute('aria-hidden','true'); }
    }
  });

  // quick view open helper
  function openQuickView(id) { openQuickView; } // placeholder to avoid linter noise

  // init
  function init() {
    buildCategories();
    applyFilters();
    renderProducts(1);
    renderReviews();
    renderFAQ();
    updateCartUI();
    loadTheme();
  }

  // wire filters controls
  catSelect.onchange = applyFilters;
  sortSelect.onchange = applyFilters;
  inlineSearch.oninput = () => { applyFilters(); };

  // load from LS
  updateCartUI();

  // expose some functions to window for debugging
  window.CeilPro = {state, addToCart, removeFromCart, changeQty: changeQty};

  // start
  init();

})();
