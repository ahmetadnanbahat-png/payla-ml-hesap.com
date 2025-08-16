// PostgreSQL Database System
class Database {
    constructor() {
        this.apiUrl = '/api'; // API endpoint for database operations
    }

    // API çağrıları için yardımcı fonksiyon
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, options);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API call error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    // Kullanıcı kayıt
    async registerUser(userData) {
        return await this.apiCall('/users/register', 'POST', userData);
    }

    // Kullanıcı giriş
    async loginUser(credentials) {
        const result = await this.apiCall('/users/login', 'POST', credentials);
        if (result.success && result.user) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
        }
        return result;
    }

    // Kullanıcı çıkış
    logoutUser() {
        localStorage.removeItem('currentUser');
        return { success: true, message: 'Başarıyla çıkış yapıldı' };
    }

    // Mevcut kullanıcıyı al
    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Tüm oyunları al
    async getAllGames() {
        return await this.apiCall('/games');
    }

    // Oyun ekle (Admin)
    async addGame(gameData) {
        return await this.apiCall('/games', 'POST', gameData);
    }

    // Oyun sil (Admin)
    async deleteGame(gameId) {
        return await this.apiCall(`/games/${gameId}`, 'DELETE');
    }

    // Oyun hesabı ekle (Admin)
    async addGameAccount(gameId, accountData) {
        return await this.apiCall(`/games/${gameId}/accounts`, 'POST', accountData);
    }

    // Oyun hesabı sil (Admin)
    async deleteGameAccount(gameId, accountId) {
        return await this.apiCall(`/games/${gameId}/accounts/${accountId}`, 'DELETE');
    }

    // Hesap al/satın al
    async purchaseAccount(gameId, userId) {
        return await this.apiCall('/purchases', 'POST', { gameId, userId });
    }

    // Key ekle (Admin)
    async addKey(keyData) {
        return await this.apiCall('/keys', 'POST', keyData);
    }

    // Key sil (Admin)
    async deleteKey(keyId) {
        return await this.apiCall(`/keys/${keyId}`, 'DELETE');
    }

    // Tüm keyleri al (Admin)
    async getAllKeys() {
        return await this.apiCall('/keys');
    }

    // Key kullan
    async useKey(keyId, userId) {
        return await this.apiCall(`/keys/${keyId}/use`, 'POST', { userId });
    }

    // Öneri ekle
    async addSuggestion(suggestionData) {
        return await this.apiCall('/suggestions', 'POST', suggestionData);
    }

    // Tüm önerileri al (Admin)
    async getAllSuggestions() {
        return await this.apiCall('/suggestions');
    }

    // Öneri sil (Admin)
    async deleteSuggestion(suggestionId) {
        return await this.apiCall(`/suggestions/${suggestionId}`, 'DELETE');
    }

    // Tüm kullanıcıları al (Admin)
    async getAllUsers() {
        return await this.apiCall('/users');
    }

    // Kullanıcı sil (Admin)
    async deleteUser(username) {
        return await this.apiCall(`/users/${username}`, 'DELETE');
    }

    // İstatistikleri al (Admin)
    async getStats() {
        return await this.apiCall('/stats');
    }

    // Kullanıcının satın aldığı hesapları al
    async getUserPurchases(userId) {
        return await this.apiCall(`/users/${userId}/purchases`);
    }
}

// Global database instance
const db = new Database();

function registerUser() {
    let username = document.querySelector("input[name='NewUserName']").value;
    let email = document.querySelector("input[name='Email']").value;
    let password = document.querySelector("input[name='NewPassword']").value;

    // Validation
    if (!username || !email || !password) {
        Swal.fire("Hata!", "Lütfen tüm alanları doldurun.", "error");
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire("Hata!", "Lütfen geçerli bir e-posta adresi girin.", "error");
        return;
    }

    // Password validation
    if (password.length < 6) {
        Swal.fire("Hata!", "Şifre en az 6 karakter olmalıdır.", "error");
        return;
    }

    const userData = { username, email, password };
    db.registerUser(userData).then(result => {
        if (result.success) {
            Swal.fire("Başarılı!", result.message, "success").then(() => {
                // Kayıt sonrası giriş ekranına geç
                toggleAuthMode();
            });
        } else {
            Swal.fire("Hata!", result.message, "error");
        }
    }).catch(error => {
        console.error('Registration error:', error);
        Swal.fire("Hata!", "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.", "error");
    });
}

function loginUser() {
    let username = document.querySelector("input[name='UserName']").value;
    let password = document.querySelector("input[name='Password']").value;

    // Validation
    if (!username || !password) {
        Swal.fire("Hata!", "Lütfen kullanıcı adı ve şifre giriniz.", "error");
        return;
    }

    const credentials = { username, password };
    db.loginUser(credentials).then(result => {
        if (result.success) {
            Swal.fire("Başarılı!", result.message, "success").then(() => {
                // Admin kontrolü
                if (result.user && result.user.role === 'admin') {
                    window.location.href = 'admin-panel.html';
                } else {
                    window.location.href = 'games.html';
                }
            });
        } else {
            Swal.fire("Hata!", result.message, "error");
        }
    }).catch(error => {
        console.error('Login error:', error);
        Swal.fire("Hata!", "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.", "error");
    });
}


function toggleAuthMode() {
    let modalTitle = document.querySelector(".modal-header h2");
    let formContainer = document.getElementById("loginForm");
    let toggleText = document.getElementById("toggleText");
    let toggleButton = document.getElementById("toggleButton");

    if (modalTitle.textContent === "Giriş Yap") {
        // Kayıt ol ekranını aç
        modalTitle.textContent = "Kayıt Ol";
        formContainer.innerHTML = `
            <div class="field">
                <label>Kullanıcı Adı</label>
                <input type="text" name="NewUserName">
            </div>
            <div class="field">
                <label>E-Posta</label>
                <input type="email" name="Email">
            </div>
            <div class="field">
                <label>Şifre</label>
                <input type="password" name="NewPassword">
            </div>
            <button class="loginSubmitBtn" onclick="registerUser()">Kaydol</button>
        `;
        toggleText.textContent = "Zaten bir üyeliğiniz var mı?";
        toggleButton.textContent = "Hemen Giriş Yap";
    } else {
        // Giriş ekranına dön
        modalTitle.textContent = "Giriş Yap";
        formContainer.innerHTML = `
            <div class="field">
                <label>Kullanıcı Adı</label>
                <input type="text" name="UserName">
            </div>
            <div class="field loginPassword">
                <label>Parola</label>
                <input type="password" name="Password">
            </div>
            <button class="loginSubmitBtn" onclick="loginUser()">Giriş Yap</button>
        `;
        toggleText.textContent = "Halen bir üyeliğiniz yok mu?";
        toggleButton.textContent = "Hemen Ücretsiz Kaydol";
    }
}

function togglePassword() {
    let passwordInput = document.querySelector("input[type='password']"); // More generic selector
    let icon = document.querySelector(".password-toggle");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function forgotPassword() {
    Swal.fire({
        title: "Şifremi Unuttum",
        text: "Şifrenizi sıfırlamak için e-posta adresinizi girin.",
        input: "email",
        inputPlaceholder: "E-posta adresinizi girin...",
        showCancelButton: true,
        confirmButtonText: "Gönder",
        preConfirm: (email) => {
            if (!email) {
                Swal.showValidationMessage("Lütfen geçerli bir e-posta girin!");
            }
            // In a real scenario, you would call an API here to send the reset email.
            // For now, we'll simulate a successful response.
            return email;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Simulate API call success
            Swal.fire("Başarılı!", `Şifre sıfırlama bağlantısı ${result.value} adresine gönderildi.`, "success");
        }
    });
}

function toggleDropdown() {
    let dropdown = document.getElementById("userDropdown");
    dropdown.style.display = (dropdown.style.display === "block") ? "none" : "block";
}

// Sayfanın herhangi bir yerine tıklanınca menüyü kapat
document.addEventListener("click", function(event) {
    let dropdown = document.getElementById("userDropdown");
    let icon = document.querySelector(".user-icon"); // Assuming user-icon is the clickable element

    if (dropdown && icon && !icon.contains(event.target) && dropdown.style.display === "block") {
        dropdown.style.display = "none";
    }
});

// Dummy functions for admin panel (to be implemented or removed if not needed)
function generateApiKey() {
    // Placeholder for key generation logic
    // This function will likely be replaced by a call to db.addKey or similar
    alert('API Anahtarı oluşturma özelliği geliştirilmektedir!');
}

function addAccount() {
    // Placeholder for account adding logic
    // This function will likely be replaced by a call to db.addGameAccount
    alert('Hesap ekleme özelliği geliştirilmektedir!');
}

function removeSharedAccount() {
    // Remove 'büyük paylaşımlıhesap.com' from admin panel
    // This implies removing it from a list or specific section.
    // Assuming there's a way to identify and remove it in the admin UI.
    alert('Paylaşımlı hesap kaldırma işlemi gerçekleştirildi (varsayılan olarak)');
    // A more specific implementation would be needed based on the admin panel's structure.
}

// Function to check login status on page load (for index.html)
function checkLoginStatus() {
    const currentUser = db.getCurrentUser();
    const loginButton = document.getElementById('loginButton');
    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    if (currentUser) {
        if (loginButton) loginButton.style.display = 'none';
        if (userGreeting) userGreeting.textContent = `Merhaba, ${currentUser.username}!`;
        if (userGreeting) userGreeting.style.display = 'inline';
        if (logoutButton) logoutButton.style.display = 'inline';
    } else {
        if (loginButton) loginButton.style.display = 'inline';
        if (userGreeting) userGreeting.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
    }
}

// Call checkLoginStatus when the page loads
document.addEventListener('DOMContentLoaded', checkLoginStatus);

// Dummy showAlert and closeAuthModal for context, assuming they exist elsewhere
function showAlert(type, title, message) {
    console.log(`${type}: ${title} - ${message}`);
    // In a real app, this would display a notification to the user.
    // Using SweetAlert for consistency with other functions
    if (type === 'success') {
        Swal.fire(title, message, "success");
    } else if (type === 'error') {
        Swal.fire(title, message, "error");
    }
}

function closeAuthModal() {
    console.log("Auth modal closed.");
    // In a real app, this would close the login/registration modal.
    // Example: If using Bootstrap modal
    // const modalElement = document.getElementById('authModal');
    // if (modalElement) {
    //     const modalInstance = bootstrap.Modal.getInstance(modalElement);
    //     if (modalInstance) {
    //         modalInstance.hide();
    //     }
    // }
}


function secureLoginUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Validation
    if (!username || !password) {
        showAlert('error', 'Hata', 'Lütfen kullanıcı adı ve şifre giriniz.');
        return;
    }

    // Use the new db instance for login
    db.loginUser({ username, password }).then(result => {
        if (result.success) {
            showAlert('success', 'Başarılı', result.message);
            closeAuthModal();
            // Redirect after successful login
            setTimeout(() => {
                if (result.redirect) {
                    window.location.href = result.redirect;
                } else {
                    window.location.reload(); // Ana sayfayı yenile
                }
            }, 1500);
        } else {
            showAlert('error', 'Hata', result.message);
        }
    });
}