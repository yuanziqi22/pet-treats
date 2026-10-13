import { products, findProduct, money } from './catalog.js';
import { createDemoStore } from './store.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const petName = product => product.pet === 'dog' ? '狗狗小食' : '猫咪小食';
const formatDate = date => new Date(date).toLocaleString('zh-CN', { hour12: false });
const RETURN_KEY = 'paw-pantry-return-v1';
const CHECKOUT_KEY = 'paw-pantry-checkout-v1';

export function initializeShop() {
  history.scrollRestoration = 'manual';
  const auth = document.querySelector('#auth-view');
  const storefront = document.querySelector('#storefront');
  const home = document.querySelector('#main');
  const view = document.querySelector('#shop-view');
  const accountTools = document.querySelector('#account-tools');
  const dialog = document.querySelector('#login-required');
  const message = document.querySelector('#app-message');
  let store;
  let submittingAuth = false;
  let lastRoute = '';

  function notify(error) {
    message.textContent = error instanceof Error ? error.message : error;
    message.hidden = false;
  }
  try { store = createDemoStore({ storage: localStorage, session: sessionStorage }); }
  catch { notify('当前浏览器不允许本地存储，请允许此网站使用存储后刷新。'); return; }

  const grid = document.querySelector('#product-grid');
  grid.innerHTML = products.map(product => `<article class="product-card" data-pet="${product.pet}">
    <a class="product-card-link" href="#product/${product.id}" aria-label="查看${product.name}，${money(product.priceCents)}">
      <div class="product-image ${product.color}"><span class="product-tag">${product.tag}</span><img src="${product.image}" alt="${product.name}示例包装" width="480" height="440" loading="lazy"><span class="product-open">看看这款小食 ↗</span></div>
      <div class="product-info"><div class="product-type">FOR ${product.pet === 'dog' ? 'DOGS' : 'CATS'} <span>${petName(product)}</span></div><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><span>${product.flavor}</span><span class="product-price"><small>示例参考价</small><strong>${money(product.priceCents)}</strong></span></div><span class="product-card-action">查看详情与购买 <span aria-hidden="true">→</span></span></div>
    </a></article>`).join('');

  function navigate(hash, replace = false) {
    if (replace || location.hash === hash) { history.replaceState(null, '', hash); render(); }
    else location.hash = hash;
  }
  function rememberTarget(hash) {
    if (/^#(?:checkout|product)\/(?:chicken|salmon|duck|tuna|beef|rabbit)(?:\?quantity=\d+)?$/.test(hash) || hash === '#orders') sessionStorage.setItem(RETURN_KEY, hash);
  }
  function returnTarget() {
    const hash = sessionStorage.getItem(RETURN_KEY) || '';
    return /^#(?:checkout|product)\/(?:chicken|salmon|duck|tuna|beef|rabbit)(?:\?quantity=\d+)?$/.test(hash) || hash === '#orders' ? hash : '#home';
  }
  function focusHeading() {
    const heading = view.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }
  function summary(product, quantity) {
    return `<aside class="checkout-summary"><p class="eyebrow">YOUR LITTLE TREAT</p><img src="${product.image}" alt="${product.name}示例包装" width="480" height="440"><h2>${product.name}</h2><p>${petName(product)} · ${product.flavor}</p><dl class="price-lines"><div><dt>单价</dt><dd>${money(product.priceCents)}</dd></div><div><dt>数量</dt><dd>${quantity} 件</dd></div><div><dt>配送</dt><dd>虚拟配送 · ¥0.00</dd></div><div class="price-total"><dt>模拟合计</dt><dd>${money(product.priceCents * quantity)}</dd></div></dl><p class="checkout-free">无需支付任何费用</p></aside>`;
  }
  function notFound(text = '没有找到这份小欢喜') {
    view.innerHTML = `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">✦</span><h1>${text}</h1><p>回到小食铺，重新挑选一份吧。</p><a class="button button-primary" href="#products">去看看小食 →</a></div>`;
  }
  function updateAccount() {
    const user = store.currentUser();
    accountTools.innerHTML = user
      ? `<span class="account-name" title="${escape(user.nickname)}"><span class="account-dot" aria-hidden="true"></span>${escape(user.nickname)}</span><a href="#orders" class="account-link">我的订单</a><button type="button" class="account-logout" id="logout">退出</button>`
      : '<span class="guest-badge">游客模式</span><button type="button" class="account-link" id="account-login">登录 / 注册</button>';
    document.querySelector('#logout')?.addEventListener('click', () => {
      try {
        store.logout();
        sessionStorage.removeItem(RETURN_KEY);
        sessionStorage.removeItem(CHECKOUT_KEY);
        document.querySelector('#login-form').reset();
        navigate('#login');
      } catch (error) { notify(error); }
    });
    document.querySelector('#account-login')?.addEventListener('click', () => {
      rememberTarget(location.hash);
      navigate('#login');
    });
  }
  function renderProduct(product, initialQuantity) {
    view.innerHTML = `<a class="back-link" href="#products">← 返回精选小食</a>
      <div class="product-detail"><div class="detail-image product-image ${product.color}"><span class="product-tag">${product.tag}</span><img src="${product.image}" alt="${product.name}示例包装" width="480" height="440"></div>
      <section class="detail-copy"><p class="eyebrow">A LITTLE TREAT, JUST FOR THEM</p><span class="detail-pet">${petName(product)} / ${product.flavor}</span><h1>${product.name}</h1><p class="detail-description">${product.description}</p><p class="detail-price">${money(product.priceCents)} <span>/ 件 · 示例参考价</span></p><div class="detail-divider"></div>
      <form id="purchase-form"><div class="quantity-row"><label for="quantity">挑选数量</label><div class="quantity-control"><button type="button" id="quantity-minus" aria-label="减少数量">−</button><input id="quantity" name="quantity" type="number" min="1" max="99" step="1" value="${initialQuantity}" inputmode="numeric" required><button type="button" id="quantity-plus" aria-label="增加数量">+</button></div></div><p class="quantity-hint">每次可选 1–99 件</p><p class="detail-subtotal">模拟合计 <strong id="detail-total">${money(product.priceCents * initialQuantity)}</strong></p><button type="submit" class="button button-primary buy-button">立即购买 <span aria-hidden="true">→</span></button></form>
      <p class="detail-demo"><svg aria-hidden="true"><use href="#icon-info"/></svg>虚拟体验，无需付款。填写地址后生成模拟订单，不会实际发货。</p><div class="detail-perks"><span>精选小食概念</span><span>为陪伴留一份心意</span></div></section></div>`;
    const quantity = document.querySelector('#quantity');
    const sync = () => {
      const value = Number(quantity.value);
      document.querySelector('#detail-total').textContent = Number.isInteger(value) && value >= 1 && value <= 99 ? money(product.priceCents * value) : '—';
      document.querySelector('#quantity-minus').disabled = value <= 1;
      document.querySelector('#quantity-plus').disabled = value >= 99;
    };
    quantity.addEventListener('input', sync);
    for (const [selector, delta] of [['#quantity-minus', -1], ['#quantity-plus', 1]]) document.querySelector(selector).addEventListener('click', () => {
      quantity.value = Math.min(99, Math.max(1, Math.trunc(Number(quantity.value) || 1) + delta)); sync();
    });
    sync();
    document.querySelector('#purchase-form').addEventListener('submit', event => {
      event.preventDefault();
      const target = `#checkout/${product.id}?quantity=${quantity.value}`;
      try {
        if (!store.currentUser()) { rememberTarget(target); dialog.showModal(); }
        else navigate(target);
      } catch (error) { notify(error); }
    });
  }
  function renderCheckout(product, quantity) {
    const user = store.currentUser();
    let draft;
    try { draft = JSON.parse(sessionStorage.getItem(CHECKOUT_KEY)); } catch { /* Start a new checkout if an old draft is malformed. */ }
    const signature = `${user.id}/${product.id}/${quantity}`;
    if (draft?.signature !== signature) {
      draft = { signature, requestId: crypto.randomUUID() };
      sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(draft));
    }
    view.innerHTML = `<a class="back-link" href="#product/${product.id}?quantity=${quantity}">← 返回商品详情</a><div class="shop-heading"><p class="eyebrow">ONE STEP CLOSER TO HAPPINESS</p><h1>把小欢喜，送到家</h1><p>填写收货信息，即可完成这次虚拟购买。</p></div><ol class="checkout-steps" aria-label="购买流程"><li>01 选择小食</li><li aria-current="step">02 填写地址</li><li>03 生成订单</li></ol>
      <div class="checkout-layout"><section class="address-panel"><h2>收货信息</h2><p class="panel-description">仅作演示，可填写虚拟地址。</p><form id="checkout-form" class="shop-form"><div class="form-row"><label>收件人<input name="name" autocomplete="shipping name" value="${escape(user.nickname)}" minlength="2" maxlength="40" required></label><label>收件电话<input name="phone" type="tel" autocomplete="shipping tel" value="${escape(user.phone)}" maxlength="24" required></label></div><label>所在地区<input name="region" autocomplete="shipping address-level2" placeholder="省 / 市 / 区（县）" minlength="2" maxlength="100" required></label><label>详细地址<textarea name="detail" autocomplete="shipping street-address" placeholder="街道、门牌号、小区及楼栋等" rows="3" minlength="5" maxlength="200" required></textarea></label><p class="checkout-notice">本次为虚拟购买，不收取费用、不实际发货。</p><p id="checkout-error" class="form-error" role="alert"></p><button type="submit" class="button button-primary form-submit">确认地址，生成模拟订单 →</button></form></section>${summary(product, quantity)}</div>`;
    const form = document.querySelector('#checkout-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      if (button.disabled) return;
      button.disabled = true;
      try {
        const address = Object.fromEntries(new FormData(form));
        const order = store.createOrder({ productId: product.id, quantity, address, requestId: draft.requestId });
        sessionStorage.removeItem(CHECKOUT_KEY);
        sessionStorage.removeItem(RETURN_KEY);
        navigate(`#order/${order.id}`);
      } catch (error) {
        document.querySelector('#checkout-error').textContent = error.message;
        button.disabled = false;
        if (!store.currentUser()) { rememberTarget(location.hash); dialog.showModal(); }
      }
    });
  }
  function renderOrders() {
    const orders = store.listOrders();
    view.innerHTML = `<a class="back-link" href="#products">← 继续挑选小食</a><div class="shop-heading"><p class="eyebrow">YOUR LITTLE MOMENTS</p><h1>我的订单</h1><p>每一份小食，都是一份记下来的偏爱。共 ${orders.length} 笔模拟订单。</p></div>${orders.length ? `<div class="orders-list">${orders.map(order => `<article class="order-card"><div class="order-card-top"><span>${escape(formatDate(order.createdAt))}</span><span class="order-status">模拟订单已生成</span></div><div class="order-card-body"><img src="${escape(order.image)}" alt="${escape(order.productName)}" width="100" height="100"><div><h2>${escape(order.productName)}</h2><p>${money(order.unitPriceCents)} × ${order.quantity} 件</p><p class="order-short-id">订单尾号 ${escape(order.id.slice(-8))}</p></div><strong>${money(order.totalCents)}</strong><a class="button button-secondary" href="#order/${escape(order.id)}">查看订单</a></div></article>`).join('')}</div><p class="orders-footnote">订单仅保存在当前浏览器；所有订单均无需付款，不会实际发货。</p>` : '<div class="empty-state"><span class="empty-symbol" aria-hidden="true">♡</span><h2>还没有装进口袋的小欢喜</h2><p>去挑选第一份小食，完成你的虚拟购买体验吧。</p><a class="button button-primary" href="#products">探索小食 →</a></div>'}`;
  }
  function renderOrder(id) {
    const order = store.getOrder(id);
    if (!order) { notFound('没有找到这笔订单'); return; }
    view.innerHTML = `<div class="order-success"><span class="success-icon" aria-hidden="true">✓</span><p class="eyebrow">A LITTLE HAPPINESS, SAVED</p><h1>小欢喜，已记下</h1><p>你的模拟订单已生成，感谢这份小小的偏爱。</p><span class="success-label">无需付款 · 不会实际发货</span></div><article class="receipt"><div class="receipt-meta"><div><span>订单编号</span><strong>${escape(order.id)}</strong></div><div><span>创建时间</span><strong>${escape(formatDate(order.createdAt))}</strong></div></div><div class="receipt-product"><img src="${escape(order.image)}" alt="${escape(order.productName)}" width="100" height="100"><div><h2>${escape(order.productName)}</h2><p>${money(order.unitPriceCents)} × ${order.quantity} 件</p></div><strong>${money(order.totalCents)}</strong></div><div class="receipt-address"><h2>收货信息</h2><p>${escape(order.address.name)} <span>${escape(order.address.phone)}</span></p><p>${escape(order.address.region)} ${escape(order.address.detail)}</p></div><div class="receipt-total"><span>模拟订单合计</span><strong>${money(order.totalCents)}</strong></div></article><div class="receipt-actions"><a class="button button-primary" href="#products">继续逛逛 →</a><a class="button button-secondary" href="#orders">查看我的订单</a></div>`;
  }
  function render() {
    try {
      message.hidden = true;
      if (dialog.open) dialog.close();
      const hash = location.hash || '#login';
      const [path, query = ''] = hash.slice(1).split('?');
      const [route, id] = path.split('/');
      const quantity = Number(new URLSearchParams(query).get('quantity') || 1);
      const isAuth = route === 'login' || route === 'register';
      const mode = store.mode();
      if (!isAuth && mode === 'anonymous') { rememberTarget(hash); navigate('#login', true); return; }
      if (isAuth && mode === 'user') { navigate('#home', true); return; }
      auth.hidden = !isAuth;
      storefront.hidden = isAuth;
      document.body.classList.toggle('is-auth', isAuth);
      if (isAuth) {
        const register = route === 'register';
        document.querySelector('#auth-title').textContent = register ? '和小食铺，初次见面' : '欢迎回到爪间';
        document.querySelector('#auth-description').textContent = register ? '注册一个账号，收藏与它的每一份小欢喜。' : '登录，给它挑一份小欢喜。';
        document.querySelector('#login-form').hidden = register;
        document.querySelector('#register-form').hidden = !register;
        document.querySelector('#auth-return-note').hidden = !returnTarget().startsWith('#checkout/');
        for (const name of ['login', 'register']) {
          const link = document.querySelector(`#${name}-tab`);
          if (route === name) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
          document.querySelector(`#${name}-error`).textContent = '';
        }
        document.title = `${register ? '注册' : '登录'} · 爪间小食`;
        window.scrollTo(0, 0);
        if (lastRoute) document.querySelector('#auth-title').focus({ preventScroll: true });
      } else {
        updateAccount();
        const isHome = ['home', 'products', 'ingredients', 'story', 'main'].includes(route);
        home.hidden = !isHome;
        view.hidden = isHome;
        document.querySelector('.skip-link').href = isHome ? '#main' : '#shop-view';
        if (isHome) {
          document.title = '爪间小食 PAW & PANTRY — 一口自然，一份陪伴';
          requestAnimationFrame(() => document.getElementById(route)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
        } else {
          document.title = '小食铺 · 爪间小食';
          if (['checkout', 'orders', 'order'].includes(route) && mode !== 'user') {
            rememberTarget(hash);
            navigate('#login', true);
            return;
          }
          if (route === 'product' || route === 'checkout') {
            const product = findProduct(id);
            if (!product) notFound();
            else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) navigate(`#product/${id}`, true);
            else if (route === 'product') renderProduct(product, quantity);
            else renderCheckout(product, quantity);
          } else if (route === 'orders') renderOrders();
          else if (route === 'order') renderOrder(id);
          else notFound();
          window.scrollTo(0, 0);
          focusHeading();
        }
      }
      lastRoute = route;
    } catch (error) { notify(error); }
  }

  for (const name of ['login', 'register']) {
    const form = document.querySelector(`#${name}-form`);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submittingAuth) return;
      const errorNode = document.querySelector(`#${name}-error`);
      const button = form.querySelector('[type="submit"]');
      const originalMarkup = button.innerHTML;
      errorNode.textContent = '';
      submittingAuth = true;
      button.disabled = true;
      button.textContent = name === 'register' ? '正在创建账号…' : '正在登录…';
      try {
        const values = Object.fromEntries(new FormData(form));
        if (name === 'register') await store.register(values);
        else await store.login(values.email, values.password);
        const target = returnTarget();
        sessionStorage.removeItem(RETURN_KEY);
        form.reset();
        form.querySelector('[name="password"]').type = 'password';
        const toggle = form.querySelector('.password-toggle');
        toggle.textContent = '显示'; toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', `显示${name === 'register' ? '注册' : '登录'}密码`);
        navigate(target);
      } catch (error) { errorNode.textContent = error.message; }
      finally { submittingAuth = false; button.disabled = false; button.innerHTML = originalMarkup; }
    });
    form.querySelector('.password-toggle').addEventListener('click', event => {
      const input = form.querySelector('[name="password"]');
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      event.currentTarget.textContent = reveal ? '隐藏' : '显示';
      event.currentTarget.setAttribute('aria-pressed', String(reveal));
      event.currentTarget.setAttribute('aria-label', `${reveal ? '隐藏' : '显示'}${name === 'register' ? '注册' : '登录'}密码`);
    });
  }
  document.querySelector('#guest-entry').addEventListener('click', () => {
    if (submittingAuth) return;
    try {
      store.enterGuest();
      const target = returnTarget();
      navigate(target.startsWith('#checkout/') ? target.replace('#checkout/', '#product/') : '#home');
    } catch (error) { notify(error); }
  });
  function dismissPurchase() {
    sessionStorage.removeItem(RETURN_KEY);
    dialog.close();
  }
  for (const button of dialog.querySelectorAll('.dialog-close, .dialog-dismiss')) button.addEventListener('click', dismissPurchase);
  dialog.addEventListener('cancel', () => sessionStorage.removeItem(RETURN_KEY));
  for (const link of dialog.querySelectorAll('[data-dialog-auth]')) link.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dismissPurchase(); });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    const main = home.hidden ? view : home;
    main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', event => {
    if (event.key !== 'paw-pantry-demo-v1' && event.key !== null) return;
    try {
      // Do not rebuild an in-progress address form when another tab saves data.
      if ((auth.hidden && store.mode() === 'anonymous') || location.hash === '#orders') render();
    } catch (error) { notify(error); }
  });
  render();
}
