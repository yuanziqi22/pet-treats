import { products as initialProducts } from './catalog.js';

export const DATA_KEY = 'paw-pantry-demo-v1';
export const ADMIN_EMAIL = 'admin@pawpantry.demo';
export const ADMIN_PASSWORD = 'PawAdmin2026!';
export const ORDER_STATUS = Object.freeze({pending:'待发货',shipped:'已发货',completed:'已完成'});
const ADMIN_KEY = 'paw-pantry-admin-session-v1';
const SESSION_KEY = 'paw-pantry-session-v1';
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const clean = value => String(value || '').trim();
const validPhone = value => /^\+?[\d\s()-]{7,24}$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''));
const hex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

// Browser-local demo state. This is a UI simulation, not server-side authorization.
export function createDemoStore({ storage, session, crypto = globalThis.crypto }) {
  function read() {
    let data;
    try {
      const raw = storage.getItem(DATA_KEY);
      data = raw ? JSON.parse(raw) : {version:1,users:[],orders:[]};
      if (![1,2].includes(data.version) || !Array.isArray(data.users) || !Array.isArray(data.orders)) throw Error();
      if (data.version === 2 && !Array.isArray(data.products)) throw Error();
    } catch { throw new Error('无法读取本地演示数据，请检查浏览器是否允许此网站使用本地存储。'); }
    if (data.version === 1) {
      data.products = initialProducts.map(p => ({...p,active:true}));
      data.orders = data.orders.map(o => ({...o,source:'user',status:ORDER_STATUS[o.status] ? o.status : 'pending'}));
      const now = Date.now();
      for (let i=0;i<18;i++) {
        const product = data.products[i%6], quantity = i%4+1;
        data.orders.push({id:'DEMO-'+String(i+1).padStart(4,'0'),userId:'demo-buyer-'+i,source:'demo',buyerName:['小橘的家长','团子的朋友','豆豆的小屋'][i%3],requestId:'seed-'+i,createdAt:new Date(now-i*1.6*86400000).toISOString(),status:['pending','shipped','completed'][Math.floor(i/6)],productId:product.id,productName:product.name,image:product.image,unitPriceCents:product.priceCents,quantity,totalCents:product.priceCents*quantity,address:{name:'示例收件人',phone:'13800000000',region:'演示省 示例市 示范区',detail:'小爪路 '+(i+1)+' 号（虚拟地址）'}});
      }
      data.version = 2;
      save(data);
    }
    return data;
  }
  function isAdmin() { try { return session.getItem(ADMIN_KEY) === 'demo-admin'; } catch { return false; } }
  function requireAdmin() { if (!isAdmin()) throw Error('请先以管理员身份登录。'); }
  function getProduct(id) { return read().products.find(p => p.id === id) || null; }
  function adminOrders({source='all',days=0,search='',status='all'}={}) {
    requireAdmin();
    const data=read(), cutoff=new Date();
    cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate()-(Number(days)-1));
    const query=clean(search).toLowerCase();
    return data.orders.map(o=>({...o,buyerName:o.buyerName || data.users.find(u=>u.id===o.userId)?.nickname || '用户'})).filter(o=>(source==='all'||o.source===source)&&(status==='all'||o.status===status)&&(!days||Date.parse(o.createdAt)>=cutoff.getTime())&&(!query||[o.id,o.buyerName,o.productName].some(v=>String(v).toLowerCase().includes(query)))).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
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
    currentUser, isAdmin, getProduct, adminOrders,
    adminLogin(email,password) {
      if (normalizeEmail(email)!==ADMIN_EMAIL || password!==ADMIN_PASSWORD) throw Error('管理员邮箱或密码不正确。');
      try { session.setItem(ADMIN_KEY,'demo-admin'); } catch { throw Error('无法保存管理员登录状态。'); }
    },
    adminLogout() { session.removeItem(ADMIN_KEY); },
    listProducts({includeInactive=false}={}) { return read().products.filter(p=>includeInactive || p.active); },
    saveProduct(input) {
      requireAdmin();
      const data=read(), previous=input.id ? data.products.find(p=>p.id===input.id) : null;
      if(input.id && !previous) throw Error('商品不存在。');
      if(previous && input.expectedSnapshot !== undefined && input.expectedSnapshot !== JSON.stringify(previous)) throw Error('商品已在其他页面修改，当前草稿已保留。请记录草稿后关闭并重新打开编辑，以最新商品信息为准。');
      const product={id:previous?.id || 'treat-'+crypto.randomUUID(),name:clean(input.name),pet:input.pet,priceCents:Number(input.priceCents),flavor:clean(input.flavor),description:clean(input.description),tag:clean(input.tag),image:input.image || previous?.image || 'assets/product-default.svg',color:previous?.color || 'mint',active:input.active === undefined ? (previous?.active ?? true) : input.active};
      if(!product.name || product.name.length>60 || !['dog','cat'].includes(product.pet) || !Number.isSafeInteger(product.priceCents) || product.priceCents<1 || product.priceCents>99999999 || !product.flavor || product.flavor.length>50 || !product.description || product.description.length>500 || product.tag.length>24 || typeof product.active!=='boolean') throw Error('请填写有效的商品信息和价格（最多两位小数）。');
      if(typeof product.image!=='string' || !(new RegExp('^assets/[a-z0-9-]+[.](svg|png|webp|jpg)$').test(product.image) || new RegExp('^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$').test(product.image) && product.image.length<=409630)) throw Error('请选择有效的本地商品图片，压缩后不超过 300 KB。');
      if(previous) data.products[data.products.indexOf(previous)]=product; else data.products.push(product);
      save(data); return product;
    },
    setProductActive(id,active) {
      requireAdmin(); const data=read(),p=data.products.find(p=>p.id===id);
      if(!p || typeof active!=='boolean') throw Error('商品不存在或状态无效。');
      p.active=active; save(data); return p;
    },
    advanceOrder(id) {
      requireAdmin(); const data=read(),o=data.orders.find(o=>o.id===id);
      if(!o || o.status==='completed') throw Error('订单不存在或已经完成。');
      o.status=o.status==='pending'?'shipped':'completed';
      o[o.status==='shipped'?'shippedAt':'completedAt']=new Date().toISOString(); save(data); return o;
    },
    statistics(filters={}) {
      requireAdmin(); const orders=adminOrders(filters), products=read().products.map(p=>({...p,orderCount:0,units:0,revenueCents:0}));
      const totals={orderCount:orders.length,units:0,revenueCents:0,pendingCount:0,products};
      for(const o of orders){totals.units+=o.quantity;totals.revenueCents+=o.totalCents;totals.pendingCount+=Number(o.status==='pending');const p=products.find(p=>p.id===o.productId);if(p){p.orderCount++;p.units+=o.quantity;p.revenueCents+=o.totalCents;}}
      products.sort((a,b)=>b.orderCount-a.orderCount||b.units-a.units); return totals;
    },
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
    createOrder({ productId, quantity, address, requestId, expectedPriceCents }) {
      const user = requireUser();
      const data = read();
      const existing = data.orders.find(order => order.userId === user.id && order.requestId === requestId);
      if (existing && requestId) return existing;
      const product = data.products.find(p=>p.id===productId);
      if (!product) throw new Error('这款小食不存在，请重新选择。');
      if (!product.active) throw Error('这款小食已下架，请选择其他商品。');
      if (expectedPriceCents !== undefined && expectedPriceCents !== product.priceCents) throw Error('商品价格已更新，请确认最新价格后再次提交。');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('购买数量需要是 1–99 之间的整数。');
      const delivery = Object.fromEntries(['name', 'phone', 'region', 'detail'].map(key => [key, clean(address?.[key])]));
      if (delivery.name.length < 2 || delivery.name.length > 40) throw new Error('请填写收件人姓名（2–40 个字符）。');
      if (!validPhone(delivery.phone)) throw new Error('请填写有效的收件电话。');
      if (delivery.region.length < 2 || delivery.region.length > 100) throw new Error('请填写省、市、区／县。');
      if (delivery.detail.length < 5 || delivery.detail.length > 200) throw new Error('请填写详细地址，至少 5 个字符。');
      if (!requestId || typeof requestId !== 'string') throw new Error('请重新打开结算页面后再提交。');
      const order = {
        id: `PP-${crypto.randomUUID().toUpperCase()}`, userId: user.id, requestId,
        createdAt: new Date().toISOString(), status: 'pending', source: 'user', buyerName: user.nickname,
        productId: product.id, productName: product.name, image: product.image,
        unitPriceCents: product.priceCents, quantity, totalCents: product.priceCents * quantity,
        address: delivery,
      };
      data.orders.unshift(order);
      save(data);
      return order;
    },
    listOrders() { const user = requireUser(); return read().orders.filter(order => order.userId === user.id && order.source === 'user'); },
    getOrder(id) { return this.listOrders().find(order => order.id === id) || null; },
  };
}
