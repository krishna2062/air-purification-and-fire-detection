/* script.js - Login Logic */

document.addEventListener("DOMContentLoaded", () => {
    
    // Auto-redirect removed to allow explicit login page access
    // if(sessionStorage.getItem("isLoggedIn") === "true") { ... }

    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorDisplay = document.getElementById("errorDisplay");
    const errorText = document.getElementById("errorText");

    // Fixed Credentials
    const CREDENTIALS = {
        username: "admin",
        password: "admin123"
    };

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const inputUsername = usernameInput.value.trim();
        const inputPassword = passwordInput.value.trim();

        // 1. Basic Validation
        if (!inputUsername || !inputPassword) {
            showError("Please enter both username and password.");
            return;
        }

        // 2. Auth Check
        if (inputUsername === CREDENTIALS.username && inputPassword === CREDENTIALS.password) {
            // Success
            loginSuccess();
        } else {
            // Failure
            showError("Invalid username or password.");
            passwordInput.value = ""; // Clear password
            passwordInput.focus();
        }
    });

    // Helper: Show Error
    function showError(message) {
        errorText.textContent = message;
        errorDisplay.classList.add("visible");
        
        // Shake animation for card
        const card = document.querySelector(".login-card");
        card.style.transform = "translateX(5px)";
        setTimeout(() => {
            card.style.transform = "translateX(-5px)";
        }, 50);
        setTimeout(() => {
            card.style.transform = "translateX(5px)";
        }, 100);
        setTimeout(() => {
            card.style.transform = "translateX(0)";
        }, 150);

        // Hide error after 3 seconds
        setTimeout(() => {
            errorDisplay.classList.remove("visible");
        }, 3000);
    }

    // Helper: Login Success
    function loginSuccess() {
        const btn = document.querySelector(".login-btn");
        const originalText = btn.innerHTML;
        
        // Show loading state
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
        btn.style.opacity = "0.8";
        
        // Store session (SessionStorage is cleared when tab closes)
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", "admin");
        
        // Redirect with slight delay for UX
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 800);
    }
});