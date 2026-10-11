# 爪间小食 · PAW & PANTRY

天然简约风格的中文宠物零食品牌展示首页。原生 HTML、CSS 和 JavaScript，无第三方运行依赖、无构建步骤，所有图片均保存在本地。

## 启动预览

安装 Node.js 18 或更高版本后，在当前目录运行：

```powershell
cd 'D:\Pet treats'
node server.mjs
```

浏览器访问 <http://127.0.0.1:5173>。关闭服务时在终端按 `Ctrl+C`。默认仅监听本机，不公开到局域网。端口被占用时，可以指定其他端口：

```powershell
$env:PORT = '5174'
node server.mjs
```

也可以直接双击 `index.html` 查看页面与基本交互。推荐 HTTP 预览以获得一致的浏览器行为。

## 内容与维护

- `index.html`：页面结构、品牌文案、6 款示例商品、图标及示例说明。
- `styles.css`：配色、排版、响应式布局、焦点样式及减少动态效果的适配。
- `app.js`：全部 / 狗狗 / 猫咪筛选、移动菜单、Esc 关闭、导航状态更新。
- `assets/`：本地照片、原创包装插画及 favicon。
- `scripts/create-packaging.mjs`：生成 6 张包装 SVG；修改配色或商品名称后可运行 `npm run assets`。

修改商品时同步更新 `data-pet`（`dog` 或 `cat`）、图片及文字。筛选的结果数量会自动计算；如果增加商品，请同步更新初始数量和“全部小食”的数字标记。

## 验证

```powershell
node --check app.js
node --check server.mjs
node --check scripts/create-packaging.mjs
```

浏览器回归步骤：

1. 桌面和手机宽度下，页面无横向滚动，全部图片成功显示。
2. 初始展示 6 款；狗狗 / 猫咪分别展示 3 款；“全部小食”恢复 6 款。
3. Tab 键访问按钮，Enter 或空格激活筛选；筛选按钮选中状态和结果提示同步改变。
4. 手机菜单展开后可通过链接导航；链接跳转后菜单关闭。Esc 关闭菜单并恢复按钮焦点。
5. 页尾“看看所有小食”恢复全部分类并跳转到产品区。
6. 检查锚点不会被顶部导航遮挡；浏览器控制台无脚本错误。

## 示例与素材说明

「爪间小食」为虚构品牌，商品名称、文案和包装为展示用途，不代表真实产品的配料、加工方式、认证或功效。六款商品的价格为人民币示例参考价，不代表实际售价，可在 `index.html` 中的 `product-price` 元素内修改。页面没有登录、支付、购物车或订单功能。

`hero.png` 和 `ingredients.png` 使用内置 ImageGen 生成；完整生成提示词记录在 `assets/image-prompts.json`。包装图与图标是项目内原创 SVG，无外部图片、字体或 CDN 请求。
