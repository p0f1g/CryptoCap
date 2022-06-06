export default function mobileMenu() {
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.main-nav');

  const toggleMenu = () => {
    burger.classList.toggle('burger--close');
    menu.classList.toggle('main-nav--open');
    document.body.classList.toggle('lock');
  };

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener('click', (e) => {
    if (
      menu.classList.contains('main-nav--open') &&
      e.target.classList.contains('menu__link')
    ) {
      toggleMenu();
    }
  });

  document.addEventListener('click', (e) => {
    const { target } = e;
    const itsMenu = target === menu || menu.contains(target);
    const itsBtnMenu = target === burger || burger.contains(target);
    const menuIsActive = menu.classList.contains('is-open');

    if (!itsMenu && !itsBtnMenu && menuIsActive) {
      toggleMenu();
    }
  });
}
