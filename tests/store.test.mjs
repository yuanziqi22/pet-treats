import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createDemoStore } from '../store.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
const account = { nickname: '小爪测试', email: 'demo@example.com', password: 'DemoPass123!', phone: '13800138000' };
const address = { name: '演示收件人', phone: '13800138000', region: '演示省 演示市 演示区', detail: '示例路 12 号（虚拟地址）' };
function setup() {
  const storage = new MemoryStorage();
  const session = new MemoryStorage();
  const make = () => createDemoStore({ storage, session, crypto: webcrypto });
  return { storage, session, make, store: make() };
}

test('registration persists a normalized account without plaintext passwords, and refresh restores login', async () => {
  const { store, storage, make } = setup();
  const user = await store.register({ ...account, email: ' DEMO@Example.com ' });
  assert.equal(user.email, 'demo@example.com');
  assert.equal(user.nickname, account.nickname);
  assert.equal(user.passwordHash, undefined);
  assert.ok(!JSON.stringify([...storage.values]).includes(account.password));
  assert.equal(make().currentUser().id, user.id);
  store.logout();
  assert.equal(store.mode(), 'anonymous');
  await assert.rejects(store.login(account.email, 'wrong-password'), /邮箱或密码不正确/);
  await store.login('DEMO@example.com', account.password);
  assert.equal(store.mode(), 'user');
});

test('registration validates all required fields and prevents case-insensitive duplicate emails', async () => {
  const { store } = setup();
  for (const patch of [{ nickname: ' ' }, { email: 'invalid' }, { password: '123' }, { phone: 'abc' }]) {
    await assert.rejects(store.register({ ...account, ...patch }));
  }
  await store.register(account);
  await assert.rejects(store.register({ ...account, email: 'DEMO@EXAMPLE.COM' }), /已注册/);
});

test('anonymous and guest sessions cannot create or view orders', () => {
  const { store, make } = setup();
  assert.equal(store.mode(), 'anonymous');
  const purchase = { productId: 'chicken', quantity: 1, address, requestId: 'guest-attempt' };
  assert.throws(() => store.createOrder(purchase), /登录/);
  store.enterGuest();
  assert.equal(make().mode(), 'guest');
  assert.throws(() => store.createOrder(purchase), /登录/);
  assert.throws(() => store.listOrders(), /登录/);
});

test('orders use catalog prices, persist across refresh, and repeated submissions create only one order', async () => {
  const { store, make } = setup();
  await store.register(account);
  const purchase = { productId: 'chicken', quantity: 3, address, requestId: 'checkout-1' };
  const order = store.createOrder(purchase);
  assert.equal(order.totalCents, 8970);
  assert.equal(order.status, '模拟订单已生成');
  assert.equal(store.createOrder(purchase).id, order.id);
  assert.equal(make().listOrders().length, 1);
  assert.equal(make().getOrder(order.id).address.detail, address.detail);
});

test('invalid quantity, product or address never creates an order', async () => {
  const { store } = setup();
  await store.register(account);
  const purchase = { productId: 'chicken', quantity: 1, address, requestId: 'checkout-2' };
  for (const patch of [{ quantity: 0 }, { quantity: 100 }, { quantity: 1.5 }, { productId: 'unknown' }, { address: { ...address, detail: ' ' } }, { address: { ...address, phone: 'invalid' } }]) {
    assert.throws(() => store.createOrder({ ...purchase, ...patch }));
  }
  assert.equal(store.listOrders().length, 0);
});

test('each account only sees its own orders; signing out removes account access', async () => {
  const { store } = setup();
  await store.register(account);
  const order = store.createOrder({ productId: 'salmon', quantity: 1, address, requestId: 'owner-order' });
  store.logout();
  await store.register({ ...account, email: 'second@example.com', nickname: '另一个账号' });
  assert.equal(store.listOrders().length, 0);
  assert.equal(store.getOrder(order.id), null);
  store.logout();
  await store.login(account.email, account.password);
  assert.equal(store.listOrders()[0].id, order.id);
});

test('failed storage writes report failure instead of showing a successful order', async () => {
  const { store, storage } = setup();
  await store.register(account);
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.createOrder({ productId: 'duck', quantity: 1, address, requestId: 'quota' }), /保存失败/);
  assert.equal(store.listOrders().length, 0);
});
