import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createDemoStore } from '../store.js';
class Memory { values=new Map(); getItem(k){return this.values.get(k)??null} setItem(k,v){this.values.set(k,v)} removeItem(k){this.values.delete(k)} }
const account={nickname:'测试用户',email:'buyer@example.com',password:'BuyerPass123!',phone:'13800138000'};
const address={name:'演示用户',phone:'13800138000',region:'演示省 示例市',detail:'演示路一号虚拟地址'};
function setup(){const storage=new Memory(),session=new Memory();return {storage,session,store:createDemoStore({storage,session,crypto:webcrypto})};}
function admin(s){s.adminLogin('admin@pawpantry.demo','PawAdmin2026!');}
const item={name:'南瓜鸡肉粒',pet:'dog',priceCents:2580,flavor:'南瓜风味',description:'新品演示小食',tag:'新品'};
test('admin session is independent and gates every management operation',async()=>{const{store:s}=setup();await s.register(account);assert.throws(()=>s.adminOrders(),/管理员/);assert.throws(()=>s.saveProduct(item),/管理员/);assert.throws(()=>s.statistics(),/管理员/);assert.throws(()=>s.adminLogin('admin@pawpantry.demo','wrong'));admin(s);s.adminLogout();assert.equal(s.currentUser().email,account.email);assert.throws(()=>s.advanceOrder('missing'),/管理员/);assert.throws(()=>s.setProductActive('chicken',false),/管理员/);});
test('migration preserves users and snapshots and seeds only once',()=>{const{storage,store:s}=setup();storage.setItem('paw-pantry-demo-v1',JSON.stringify({version:1,users:[{id:'old',nickname:'旧用户'}],orders:[{id:'OLD',userId:'old',productId:'chicken',productName:'旧名',unitPriceCents:100,quantity:2,totalCents:200,status:'模拟订单已生成',createdAt:new Date().toISOString(),address}]}));admin(s);assert.equal(s.adminOrders().length,19);assert.equal(s.adminOrders({source:'user'})[0].status,'pending');assert.equal(s.adminOrders({source:'user'})[0].productName,'旧名');assert.equal(s.listProducts().length,6);assert.equal(s.adminOrders().length,19);assert.equal(JSON.parse(storage.getItem('paw-pantry-demo-v1')).users[0].id,'old');});
test('new products can be purchased; snapshots survive edits and order transitions',async()=>{const{store:s}=setup();admin(s);const p=s.saveProduct(item);await s.register(account);const order=s.createOrder({productId:p.id,quantity:3,address,requestId:'new',expectedPriceCents:2580});assert.equal(order.totalCents,7740);s.saveProduct({...p,name:'新名称',priceCents:3000});assert.equal(s.getOrder(order.id).productName,item.name);assert.equal(s.advanceOrder(order.id).status,'shipped');assert.equal(s.advanceOrder(order.id).status,'completed');assert.throws(()=>s.advanceOrder(order.id));assert.equal(s.getOrder(order.id).status,'completed');assert.equal(s.statistics({source:'user'}).products.find(x=>x.id===p.id).orderCount,1);assert.equal(s.statistics({source:'user'}).units,3);assert.equal(s.statistics({source:'user'}).revenueCents,7740);});
test('inactive and repriced products cannot be silently purchased',async()=>{const{store:s}=setup();admin(s);await s.register(account);s.saveProduct({...s.getProduct('chicken'),priceCents:4000});assert.throws(()=>s.createOrder({productId:'chicken',quantity:1,address,requestId:'x',expectedPriceCents:2990}),/价格/);s.setProductActive('chicken',false);assert.equal(s.listProducts().some(p=>p.id==='chicken'),false);assert.throws(()=>s.createOrder({productId:'chicken',quantity:1,address,requestId:'y'}),/下架/);assert.equal(s.listOrders().length,0);});
test('demo statistics reconcile with orders, include zero sellers and honor filters',()=>{const{store:s}=setup();admin(s);s.saveProduct(item);const orders=s.adminOrders({source:'demo'}),stats=s.statistics({source:'demo'});assert.equal(orders.length,18);assert.equal(stats.orderCount,18);assert.equal(stats.units,orders.reduce((n,o)=>n+o.quantity,0));assert.equal(stats.products.reduce((n,p)=>n+p.orderCount,0),18);assert.equal(stats.products.find(p=>p.name===item.name).orderCount,0);assert.ok(s.adminOrders({days:7}).length<18);assert.equal(s.adminOrders({source:'user'}).length,0);assert.ok(s.adminOrders({status:'shipped'}).every(o=>o.status==='shipped'));assert.equal(s.adminOrders({search:'不存在商品xyz'}).length,0);});
test('invalid product input and failed storage never report success',()=>{const{store:s,storage}=setup();admin(s);s.listProducts();for(const patch of [{name:''},{pet:'bird'},{priceCents:1.2},{priceCents:-1},{image:'javascript:alert(1)'},{image:'data:image/svg+xml;base64,PHN2Zz4='}])assert.throws(()=>s.saveProduct({...item,...patch}));storage.setItem=()=>{throw Error('quota')};assert.throws(()=>s.saveProduct(item),/保存失败/);assert.equal(s.listProducts().length,6);});

test('stale editor cannot overwrite another administrator price and status changes',()=>{
  const {store:s,storage}=setup(); admin(s);
  const old=s.getProduct('chicken');
  const second=createDemoStore({storage,session:new Memory(),crypto:webcrypto}); admin(second);
  second.saveProduct({...old,priceCents:5000,active:false});
  assert.throws(()=>s.saveProduct({...old,description:'仅修改介绍',expectedSnapshot:JSON.stringify(old)}),/其他页面修改/);
  assert.equal(s.getProduct('chicken').priceCents,5000);
  assert.equal(s.getProduct('chicken').active,false);
  const latest=s.getProduct('chicken');
  s.saveProduct({...latest,description:'确认最新后修改',expectedSnapshot:JSON.stringify(latest)});
  assert.equal(s.getProduct('chicken').description,'确认最新后修改');
});
