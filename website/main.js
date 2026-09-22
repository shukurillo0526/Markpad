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
        
        // Trigger counter animation if it's the stats section
        if (entry.target.classList.contains('global-stats')) {
          const statNumbers = entry.target.querySelectorAll('.stat-number');
          statNumbers.forEach(stat => {
            const target = +stat.getAttribute('data-target');
            const duration = 2000;
            const increment = target / (duration / 16);
            
            let current = 0;
            const updateCounter = () => {
              current += increment;
              if (current < target) {
                stat.innerText = Math.ceil(current);
                requestAnimationFrame(updateCounter);
              } else {
                stat.innerText = target;
              }
            };
            updateCounter();
          });
        }
        
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Select all elements that should animate
  const animateElements = document.querySelectorAll('.feature-card, .section-title, .hero-content > *, .animate-on-scroll');
  
  animateElements.forEach(el => {
    el.classList.add('animate-hidden');
    observer.observe(el);
  });

  // Crypto copy-to-clipboard handler
  const cryptoButtons = document.querySelectorAll('.btn-crypto-copy');
  cryptoButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const address = btn.getAttribute('data-address');
      if (!address) return;
      try {
        await navigator.clipboard.writeText(address);
        const label = btn.querySelector('.copy-label');
        const origText = label ? label.textContent : 'Copy';
        btn.classList.add('copied');
        if (label) label.textContent = 'Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          if (label) label.textContent = origText;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    });
  });
});

