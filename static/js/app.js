// Theme Management
function setTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('preferred-theme', theme);
    
    // Update active state of theme options
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === theme);
    });
}

// Initialize theme from localStorage or default to light
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('preferred-theme') || 'light';
    setTheme(savedTheme);
    
    // Theme selector event listeners
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            setTheme(option.dataset.theme);
        });
    });
    
    // Animation toggle
    const animationToggle = document.getElementById('enableAnimations');
    if (animationToggle) {
        animationToggle.addEventListener('change', (e) => {
            document.body.style.setProperty('--transition', 
                e.target.checked ? 'all 0.3s ease' : 'none');
        });
    }
    
    // Section visibility animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
});

// Add settings to navigation
const navItems = document.querySelector('.main-nav ul');
if (navItems) {
    const settingsItem = document.createElement('li');
    settingsItem.innerHTML = '<a href="#settings" class="nav-link"><i class="fas fa-cog"></i> Settings</a>';
    navItems.appendChild(settingsItem);
}