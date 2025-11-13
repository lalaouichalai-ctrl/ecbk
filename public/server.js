const express = require('express');
const fs = require('fs/promises');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = 'data.json';

// Middleware pour analyser les corps de requête JSON
app.use(express.json());

// Middleware CORS pour autoriser les requêtes du front-end
app.use(cors());

// Fonction utilitaire pour lire les données
const readData = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // En cas d'erreur (si data.json n'existe pas), on renvoie une structure vide
        console.error("Erreur de lecture du fichier de données :", error);
        return { users: [] };
    }
};

// Fonction utilitaire pour écrire les données
const writeData = async (data) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error("Erreur d'écriture du fichier de données :", error);
        return false;
    }
};

// --- ROUTES API ---

// Route de base (pour vérifier que l'API est en ligne)
app.get('/', (req, res) => {
    res.send('API Ecobank est en ligne !');
});

// 1. Route de LOGIN (POST /api/login)
app.post('/api/login', async (req, res) => {
    const { clientCode, pin } = req.body;
    const data = await readData();

    const user = data.users.find(u => u.clientCode === clientCode && u.pin === pin);

    if (user) {
        // Mettre à jour la date de connexion (simplifié)
        user.lastConnection = new Date().toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).replace(',', '');
        await writeData(data); // Sauvegarder la mise à jour
        
        // Retourner l'utilisateur (sans le PIN pour la sécurité)
        const { pin, ...userSafedata } = user; 
        res.json({ success: true, user: userSafedata });
    } else {
        res.status(401).json({ success: false, message: 'Code client ou PIN incorrect.' });
    }
});

// 2. Route pour récupérer un utilisateur (GET /api/users/:clientCode)
app.get('/api/users/:clientCode', async (req, res) => {
    const clientCode = req.params.clientCode;
    const data = await readData();
    const user = data.users.find(u => u.clientCode === clientCode);

    if (user) {
        const { pin, ...userSafedata } = user;
        res.json({ success: true, user: userSafedata });
    } else {
        res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
});

// 3. Route pour ajouter une transaction (PUT /api/users/:clientCode/history)
app.put('/api/users/:clientCode/history', async (req, res) => {
    const clientCode = req.params.clientCode;
    const transaction = req.body;
    const data = await readData();
    const userIndex = data.users.findIndex(u => u.clientCode === clientCode);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const user = data.users[userIndex];
    const amount = transaction.amount; // Montant négatif pour un débit (virement)

    // Vérification simple du solde pour les débits
    if (amount < 0 && user.solde + amount < 0) {
        return res.status(400).json({ success: false, message: 'Solde insuffisant pour cette opération.' });
    }
    
    // Mettre à jour le solde
    user.solde = parseFloat((user.solde + amount).toFixed(2));
    
    // Ajouter la transaction à l'historique
    if (!user.history) user.history = [];
    user.history.push({ 
        date: new Date().toISOString(), // Date du serveur
        ...transaction
    });
    
    // Sauvegarder les données
    const saved = await writeData(data);

    if (saved) {
        res.json({ success: true, newSolde: user.solde, message: 'Transaction enregistrée.' });
    } else {
        res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde des données.' });
    }
});


// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur API démarré sur le port ${PORT}`);
});