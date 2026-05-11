// nav.js — compartilhado por index.html, cardapio.html e sobre.html
(function () {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  hamburger?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();
