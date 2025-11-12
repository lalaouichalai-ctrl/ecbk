// =========================================================================
// shared.js - Fonctions API et utilitaires partagés (Version API RENDER)
// =========================================================================

// 🚨 URL de l'API déployée sur Render.com
// L'API contient un seul compte fonctionnel pour le moment :
// Code Client: 12345
// PIN: 1111
const API_BASE_URL = "https://ecbk.onrender.com"; 

// --- GESTION DE L'AUTHENTIFICATION ET DES SESSIONS ---

/**
 * Tente de connecter l'utilisateur via l'API.
 * @param {string} clientCode
 * @param {string} pin
 * @returns {Promise<object>} L'objet utilisateur si succès, ou un message d'erreur.
 */
async function apiLogin(clientCode, pin) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clientCode, pin })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Le Front-End simule le rôle d'admin pour ce compte unique
            data.user.isAdmin = (data.user.clientCode === "12345"); 
            
            // Stocker les données de l'utilisateur dans le sessionStorage
            sessionStorage.setItem('clientCode', data.user.clientCode);
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            return data.user;
        } else {
            return { success: false, message: data.message || "Code client ou PIN incorrect." };
        }

    } catch (error) {
        console.error("Erreur de communication API:", error);
        return { success: false, message: "Impossible de contacter le serveur. (Erreur réseau/Render)." };
    }
}

/**
 * Récupère les données utilisateur mises à jour depuis le serveur.
 * @param {string} clientCode
 * @returns {Promise<object|null>} L'objet utilisateur mis à jour.
 */
async function fetchUserData(clientCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${clientCode}`);
        const data = await response.json();

        if (response.ok && data.success) {
            data.user.isAdmin = (data.user.clientCode === "12345"); 
            // Mettre à jour les données dans le sessionStorage
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            return data.user;
        }
        return null;
    } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
        return null;
    }
}

/**
 * Enregistre une transaction (virement) via l'API et met à jour le solde.
 * @param {string} clientCode
 * @param {object} transaction - doit inclure type, description, et amount (négatif pour débit).
 * @returns {Promise<object>} Objet avec success: true/false et newSolde ou message.
 */
async function apiAddTransaction(clientCode, transaction) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${clientCode}/history`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true, newSolde: data.newSolde };
        } else {
            return { success: false, message: data.message || "Erreur lors de la transaction." };
        }

    } catch (error) {
        console.error("Erreur de communication API lors de la transaction:", error);
        return { success: false, message: "Impossible de contacter le serveur pour la transaction." };
    }
}

// --- Fonctions d'état et de session ---

/**
 * Vérifie si l'utilisateur est connecté et met à jour l'interface.
 * @param {boolean} adminOnly - Redirige si l'utilisateur n'est pas admin.
 * @returns {object|null} L'objet utilisateur si connecté et autorisé.
 */
function checkAuth(adminOnly = false) {
    const sessionClientCode = sessionStorage.getItem('clientCode');
    let currentUser = getUserData();

    // Redirection si non connecté
    if (!sessionClientCode || !currentUser) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return null;
    }
    
    // Redirection si l'accès admin est requis (le seul compte 12345 est l'admin)
    if (adminOnly && !currentUser.isAdmin) {
        window.location.href = 'dashboard.html';
        return null;
    }

    // Mise à jour de l'interface (si les éléments existent)
    const userNameElement = document.querySelector('.user-info span:first-child');
    if (userNameElement) {
        userNameElement.textContent = `Bienvenue ${currentUser.name}`;
    }

    const lastConnElement = document.querySelector('.last-conn');
    if (lastConnElement) {
        lastConnElement.textContent = `Dernière connexion le ${currentUser.lastConnection}`;
    }
    
    // Ajout de l'écouteur de déconnexion
    const logoutLink = document.querySelector('.status');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    return currentUser;
}

/**
 * Récupère les données utilisateur de la session.
 * @returns {object|null}
 */
function getUserData() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Déconnecte l'utilisateur et vide la session.
 */
function logout() {
    sessionStorage.removeItem('clientCode');
    sessionStorage.removeItem('userData');
    window.location.href = 'index.html';
}

// --- Fonctions utilitaires ---

/**
 * Formate un montant en devise XOF (Franc CFA)
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number') return 'N/A';
    return amount.toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'XOF', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Lance la vérification d'authentification au chargement de la page.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Ne rien faire sur la page de connexion
    if (!window.location.pathname.includes('index.html')) {
        checkAuth();
    }
});