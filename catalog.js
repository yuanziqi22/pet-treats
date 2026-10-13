export const products = Object.freeze([
  { id: 'chicken', name: '鸡胸肉小方块', pet: 'dog', flavor: '鸡肉风味', priceCents: 2990, color: 'mint', tag: '散步搭档', description: '小块鸡肉，装进口袋里的散步好心情。' },
  { id: 'salmon', name: '三文鱼小酥粒', pet: 'cat', flavor: '三文鱼风味', priceCents: 3990, color: 'peach', tag: '猫咪时光', description: '把海洋的灵感，藏进午后的一份小食。' },
  { id: 'duck', name: '鸭肉慢焙条', pet: 'dog', flavor: '鸭肉风味', priceCents: 3290, color: 'sand', tag: '日常小奖励', description: '一条小小的奖励，回应每次乖乖的等待。' },
  { id: 'tuna', name: '金枪鱼小方丁', pet: 'cat', flavor: '金枪鱼风味', priceCents: 3590, color: 'lilac', tag: '窝家好朋友', description: '窝在窗边，把悠闲的时光分成小小一口。' },
  { id: 'beef', name: '牛肉分享片', pet: 'dog', flavor: '牛肉风味', priceCents: 4290, color: 'rose', tag: '出门小搭档', description: '带上它出发，让一起走过的路多一点美味。' },
  { id: 'rabbit', name: '兔肉轻巧粒', pet: 'cat', flavor: '兔肉风味', priceCents: 4590, color: 'sage', tag: '陪伴小心意', description: '轻巧的一口，是留给小伙伴的专属心意。' },
].map(product => Object.freeze({ ...product, image: `assets/${product.id}.svg` })));

export const findProduct = id => products.find(product => product.id === id);
export const money = cents => `¥${(cents / 100).toFixed(2)}`;
