export default function Burger() {
  const burgers = document.querySelectorAll('.burger');

  function showBurgerTarget() {
    const targetId = this.getAttribute('data-target-id');
    const targetClassToggle = this.getAttribute('data-target-class-toggle');
    if (targetId && targetClassToggle) {
      this.classList.toggle('burger--close');
      document.getElementById(targetId).classList.toggle(targetClassToggle);
    }
  }

  for (let i = 0; i < burgers.length; i++) {
    const burger = burgers[i];
    burger.addEventListener('click', showBurgerTarget);
  }
}
