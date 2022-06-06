export default function navHighlighter(sections) {
  const scrollY = window.pageYOffset;

  sections.forEach((current) => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 50;
    const sectionId = current.getAttribute('id');

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document
        .querySelector(`.menu__item a[href*=${sectionId}]`)
        .classList.add('active');
    } else {
      document
        .querySelector(`.menu__item a[href*=${sectionId}]`)
        .classList.remove('active');
    }
  });
}
