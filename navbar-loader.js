// navbar-loader.js
document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    fetch('navbar.html')
        .then(response => response.text())
        .then(html => {
            // Inject Sidebar
            placeholder.innerHTML = html;
            
            // Initialization
            highlightActiveLink();
            setupLayout();
            setupMobileMenu();
        })
        .catch(err => console.error('Error loading navbar:', err));

    window.addEventListener('resize', setupLayout);
});

function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-item');
    
    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

function setupLayout() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) {
        // Enforce Fixed positioning for consistency
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.left = '0';
        sidebar.style.bottom = '0';
        sidebar.style.width = '250px';
        sidebar.style.zIndex = '1000';
        sidebar.style.overflowY = 'auto'; // Internal scroll
        
        // Responsive Layout Adjustment
        if (window.innerWidth <= 1000) { // Matching CSS breakpoint
            sidebar.style.transform = 'translateX(-100%)'; // Hide by default on mobile
            document.body.style.marginLeft = '0';
        } else {
            sidebar.style.transform = 'translateX(0)'; // Show on desktop
            document.body.style.marginLeft = '250px'; // Push content
        }
        
        // Ensure body width flows correctly
        document.body.style.width = 'auto';
        document.body.style.transition = 'margin-left 0.3s ease';
    }
}

function setupMobileMenu() {
    // 1. Inject Overlay (for closing sidebar on mobile)
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        // Ensure overlay styles are applied if missing from CSS
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '999';
        overlay.style.display = 'none'; // Hidden by default
        
        // CSS class toggle will handle display, but we add inline just in case
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', toggleSidebar);
    }

    // 2. Find or Create Toggle Button
    // Check if the current page has a header with a toggle, or create a global one
    let toggleBtn = document.querySelector('.menu-toggle');
    
    if (!toggleBtn) {
        // Create Floating Toggle Button for pages that miss it
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'menu-toggle'; // Use class from styles.css
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Apply floating styles
        Object.assign(toggleBtn.style, {
            position: 'fixed',
            top: '20px',
            right: '20px', // Right side is usually safer to avoid overlap with logo
            zIndex: '1100',
            background: '#1e293b',
            color: 'white',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '10px',
            cursor: 'pointer',
            display: window.innerWidth <= 1000 ? 'block' : 'none' // Only show on mobile initially
        });
        
        // Update visibility on resize
        window.addEventListener('resize', () => {
             toggleBtn.style.display = window.innerWidth <= 1000 ? 'block' : 'none';
        });

        document.body.appendChild(toggleBtn);
    }
    
    // Attach Click Handler
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling
        toggleSidebar();
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) {
        // Toggle class logic
        const isActive = sidebar.classList.toggle('active');
        
        // Manual override for inline styles if needed
        if (isActive) {
            sidebar.style.transform = 'translateX(0)';
        } else if (window.innerWidth <= 1000) {
            sidebar.style.transform = 'translateX(-100%)';
        }
    }
    
    if (overlay) {
        const isActive = overlay.classList.toggle('active');
        overlay.style.display = isActive ? 'block' : 'none';
    }
}
