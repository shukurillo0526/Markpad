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

  // Dynamic GitHub EXE Download Logic
  const downloadBtn = document.getElementById('download-exe-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const originalText = downloadBtn.innerHTML;
      
      // Show loading state
      const textContainer = downloadBtn.querySelector('.btn-text strong');
      if (textContainer) textContainer.textContent = 'Fetching latest...';
      
      try {
        // Fetch latest release from GitHub API
        const response = await fetch('https://api.github.com/repos/shukurillo0526/Markpad/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch release');
        
        const data = await response.json();
        
        // Prevent downloading the very old v1.0.0 release automatically
        if (data.tag_name === 'v1.0.0') {
            window.location.href = 'https://github.com/shukurillo0526/Markpad/releases/latest';
            return;
        }

        // Find the .exe or .msi asset
        const exeAsset = data.assets.find(asset => asset.name.endsWith('.exe') || asset.name.endsWith('.msi'));
        
        if (exeAsset && exeAsset.browser_download_url) {
          // Trigger the download
          window.location.href = exeAsset.browser_download_url;
          
          // Revert button text after a short delay
          setTimeout(() => {
            downloadBtn.innerHTML = originalText;
          }, 2000);
        } else {
          // Fallback to the releases page if no .exe is found
          window.location.href = 'https://github.com/shukurillo0526/Markpad/releases/latest';
        }
      } catch (error) {
        console.error('Error fetching latest release:', error);
        // Fallback on error
        window.location.href = 'https://github.com/shukurillo0526/Markpad/releases/latest';
      }
    });
  }
});
