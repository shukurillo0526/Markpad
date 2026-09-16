// Intersection Observer for scroll animations
document.addEventListener('DOMContentLoaded', () => {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Select all elements that should animate
  const animateElements = document.querySelectorAll('.feature-card, .section-title, .hero-content > *');
  
  animateElements.forEach(el => {
    el.classList.add('animate-hidden');
    observer.observe(el);
  });
});
