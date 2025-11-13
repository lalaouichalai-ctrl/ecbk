// =========================================================================
// shared.js - Fonctions API et utilitaires partagés (Version API RENDER)
// =========================================================================

// 🚨 CORRIGÉ : L'URL de l'API est le Web Service, PAS le Static Site.
// Nouveaux identifiants Admin : Code Client: 0000000000 / PIN: 000000
const API_BASE_URL = "https://ecbk.onrender.com"; 

// --- GESTION DE L'AUTHENTIFICATION ET DES SESSIONS ---

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
            // Mise à jour de la vérification Admin avec le nouveau code client
            data.user.isAdmin = (data.user.clientCode === "0000000000"); 
            
            sessionStorage.setItem('clientCode', data.user.clientCode);
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            // Stocker temporairement la liste complète des utilisateurs pour l'affichage Admin
            if (data.users) {
                sessionStorage.setItem('allUsers', JSON.stringify(data.users));
            }

            return data.user;
        } else {
            return { success: false, message: data.message || "Code client ou PIN incorrect." };
        }

    } catch (error) {
        console.error("Erreur de communication API:", error);
        return { success: false, message: "Impossible de contacter le serveur. (Erreur réseau/Render)." };
    }
}

async function fetchUserData(clientCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${clientCode}`);
        const data = await response.json();

        if (response.ok && data.success) {
            // Mise à jour de la vérification Admin avec le nouveau code client
            data.user.isAdmin = (data.user.clientCode === "0000000000"); 
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            return data.user;
        }
        return null;
    } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
        return null;
    }
}

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


// ------------------------------------------------------------------------------------------------
// 🚨 NOUVELLE FONCTION API POUR L'ADMINISTRATION : CRÉATION DE CLIENTS
// ------------------------------------------------------------------------------------------------

/**
 * Crée un nouvel utilisateur via l'API (pour l'Admin).
 * @param {object} newUser - L'objet du nouvel utilisateur.
 * @returns {Promise<object>} Objet avec success: true/false et message.
 */
async function apiCreateUser(newUser) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true, user: data.user };
        } else {
            return { success: false, message: data.message || "Erreur lors de la création du client." };
        }

    } catch (error) {
        console.error("Erreur de communication API lors de la création:", error);
        return { success: false, message: "Impossible de contacter le serveur pour la création." };
    }
}

// ------------------------------------------------------------------------------------------------
// 🚨 FONCTION UTILITAIRE ADMIN (lecture seulement)
// ------------------------------------------------------------------------------------------------

/**
 * Récupère la liste des utilisateurs depuis la session (stockée lors de la connexion Admin)
 * pour l'affichage initial dans manage.html.
 * ATTENTION: Cette liste est statique et n'inclut pas les clients créés APRES la connexion.
 */
function getUsersFromSession() {
    const allUsersData = sessionStorage.getItem('allUsers');
    return allUsersData ? JSON.parse(allUsersData) : [];
}

// ------------------------------------------------------------------------------------------------


// --- Fonctions d'état et de session ---

function checkAuth(adminOnly = false) {
    const sessionClientCode = sessionStorage.getItem('clientCode');
    let currentUser = getUserData();

    if (!sessionClientCode || !currentUser) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return null;
    }
    
    // La vérification Admin utilise maintenant le code 0000000000
    if (adminOnly && !currentUser.isAdmin) {
        window.location.href = 'dashboard.html';
        return null;
    }

    const userNameElement = document.querySelector('.user-info span:first-child');
    if (userNameElement) {
        userNameElement.textContent = `Bienvenue ${currentUser.name}`;
    }

    const lastConnElement = document.querySelector('.last-conn');
    if (lastConnElement) {
        lastConnElement.textContent = `Dernière connexion le ${currentUser.lastConnection}`;
    }
    
    const logoutLink = document.querySelector('.status');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    return currentUser;
}

function getUserData() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

function logout() {
    sessionStorage.clear(); // Vider toutes les données de session (y compris allUsers)
    window.location.href = 'index.html';
}

// --- Fonctions utilitaires ---

function formatCurrency(amount) {
    if (typeof amount !== 'number') return 'N/A';
    return amount.toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'XOF', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('index.html')) {
        checkAuth();
    }
});