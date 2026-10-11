(() => {
  'use strict';

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const products = [...document.querySelectorAll('.product-card')];
  const status = document.querySelector('#filter-status');
  function filterProducts(category) {
    for (const product of products) product.hidden = category !== 'all' && product.dataset.pet !== category;
    for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    const count = products.filter(product => !product.hidden).length;
    status.textContent = category === 'all' ? `${count} 款小食，${count} 种小欢喜` : `${category === 'dog' ? '狗狗' : '猫咪'}的小欢喜 · ${count} 款小食`;
  }
  for (const button of filterButtons) button.addEventListener('click', () => filterProducts(button.dataset.filter));
  document.querySelector('[data-show-all]').addEventListener('click', () => filterProducts('all'));

  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const header = document.querySelector('.site-header');
  const mobile = window.matchMedia('(max-width: 820px)');
  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    navigation.classList.toggle('is-open', open);
  }
  menuToggle.addEventListener('click', event => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    // The disclosure follows the links visually; enter the navigation on keyboard activation.
    if (open && event.detail === 0) navigation.querySelector('a').focus();
  });
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link && mobile.matches) {
      setMenu(false);
      // Keep keyboard focus visible after the mobile menu disappears.
      const destination = document.querySelector(link.getAttribute('href'));
      destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  mobile.addEventListener('change', () => {
    const wasFocused = navigation.contains(document.activeElement);
    setMenu(false);
    if (mobile.matches && wasFocused) menuToggle.focus();
  });

  const links = [...navigation.querySelectorAll('.nav-link')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  let scheduled = false;
  function updateActiveLink() {
    const marker = header.getBoundingClientRect().bottom + 45;
    let active = 0;
    sections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= marker) active = index;
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateActiveLink); }
  }, { passive: true });
  window.addEventListener('resize', updateActiveLink);
  updateActiveLink();
})();
