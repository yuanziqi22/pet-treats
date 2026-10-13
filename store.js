import { findProduct } from './catalog.js';

const DATA_KEY = 'paw-pantry-demo-v1';
const SESSION_KEY = 'paw-pantry-session-v1';
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const clean = value => String(value || '').trim();
const validPhone = value => /^\+?[\d\s()-]{7,24}$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''));
const hex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

// Browser-local demo state. This is a UI simulation, not server-side authorization.
export function createDemoStore({ storage, session, crypto = globalThis.crypto }) {
  function read() {
    try {
      const raw = storage.getItem(DATA_KEY);
      if (!raw) return { version: 1, users: [], orders: [] };
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.users) || !Array.isArray(data.orders)) throw new Error();
      return data;
    } catch { throw new Error('无法读取本地演示数据，请检查浏览器是否允许此网站使用本地存储。'); }
  }
  function save(data) {
    try { storage.setItem(DATA_KEY, JSON.stringify(data)); }
    catch { throw new Error('本地保存失败，请检查浏览器存储空间或隐私设置后重试。'); }
  }
  function getSession() {
    try { return JSON.parse(session.getItem(SESSION_KEY)) || {}; }
    catch { return {}; }
  }
  function setSession(value) {
    try { session.setItem(SESSION_KEY, JSON.stringify(value)); }
    catch { throw new Error('无法保存登录状态，请允许浏览器使用会话存储后重试。'); }
  }
  function publicUser(user) {
    if (!user) return null;
    const { id, nickname, email, phone } = user;
    return { id, nickname, email, phone };
  }
  function currentUser() {
    const { userId } = getSession();
    return userId ? publicUser(read().users.find(user => user.id === userId)) : null;
  }
  function requireUser() {
    const user = currentUser();
    if (!user) throw new Error('请先登录后购买或查看订单。');
    return user;
  }
  async function passwordHash(password, salt) {
    if (!crypto?.subtle) throw new Error('请通过本地预览地址 http://127.0.0.1:5173 打开网站。');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return hex(new Uint8Array(bits));
  }
  return {
    currentUser,
    mode() { return currentUser() ? 'user' : getSession().guest ? 'guest' : 'anonymous'; },
    enterGuest() { setSession({ guest: true }); },
    logout() { session.removeItem(SESSION_KEY); },
    async register(input) {
      const nickname = clean(input.nickname);
      const email = normalizeEmail(input.email);
      const phone = clean(input.phone);
      const password = String(input.password || '');
      if (nickname.length < 2 || nickname.length > 24) throw new Error('昵称需要 2–24 个字符。');
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请输入有效的邮箱地址。');
      if (password.length < 8 || password.length > 128 || !password.trim()) throw new Error('密码需要 8–128 个字符。');
      if (!validPhone(phone)) throw new Error('请输入有效的电话号码（7–15 位数字，可带区号）。');
      if (read().users.some(user => user.email === email)) throw new Error('该邮箱已注册，请直接登录。');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const digest = await passwordHash(password, salt);
      // Read again after hashing so another registration cannot overwrite newer data.
      const data = read();
      if (data.users.some(user => user.email === email)) throw new Error('该邮箱已注册，请直接登录。');
      const user = { id: crypto.randomUUID(), nickname, email, phone, salt, passwordHash: digest };
      data.users.push(user);
      save(data);
      setSession({ userId: user.id });
      return publicUser(user);
    },
    async login(email, password) {
      const user = read().users.find(item => item.email === normalizeEmail(email));
      if (!user || await passwordHash(String(password), user.salt) !== user.passwordHash) throw new Error('邮箱或密码不正确，请重试；没有账号可先注册。');
      setSession({ userId: user.id });
      return publicUser(user);
    },
    createOrder({ productId, quantity, address, requestId }) {
      const user = requireUser();
      const product = findProduct(productId);
      if (!product) throw new Error('这款小食不存在，请重新选择。');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('购买数量需要是 1–99 之间的整数。');
      const delivery = Object.fromEntries(['name', 'phone', 'region', 'detail'].map(key => [key, clean(address?.[key])]));
      if (delivery.name.length < 2 || delivery.name.length > 40) throw new Error('请填写收件人姓名（2–40 个字符）。');
      if (!validPhone(delivery.phone)) throw new Error('请填写有效的收件电话。');
      if (delivery.region.length < 2 || delivery.region.length > 100) throw new Error('请填写省、市、区／县。');
      if (delivery.detail.length < 5 || delivery.detail.length > 200) throw new Error('请填写详细地址，至少 5 个字符。');
      if (!requestId || typeof requestId !== 'string') throw new Error('请重新打开结算页面后再提交。');
      const data = read();
      const existing = data.orders.find(order => order.userId === user.id && order.requestId === requestId);
      if (existing) return existing;
      const order = {
        id: `PP-${crypto.randomUUID().toUpperCase()}`, userId: user.id, requestId,
        createdAt: new Date().toISOString(), status: '模拟订单已生成',
        productId: product.id, productName: product.name, image: product.image,
        unitPriceCents: product.priceCents, quantity, totalCents: product.priceCents * quantity,
        address: delivery,
      };
      data.orders.unshift(order);
      save(data);
      return order;
    },
    listOrders() { const user = requireUser(); return read().orders.filter(order => order.userId === user.id); },
    getOrder(id) { return this.listOrders().find(order => order.id === id) || null; },
  };
}
