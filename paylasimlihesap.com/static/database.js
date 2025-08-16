
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
