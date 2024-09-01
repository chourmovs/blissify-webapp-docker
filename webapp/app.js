const express = require('express');
const { exec } = require('child_process');
const Client = require('ssh2').Client;
const path = require('path');
const sftpUpload = require('sftp-upload');

const app = express();
const port = 3000;

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour rechercher des répertoires
app.get('/find-directory', (req, res) => {
    const networkPath = req.query.path; // Récupère le chemin du dossier réseau

    // Commande find
    exec(`find ${networkPath} -type d`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur: ${stderr}`);
        }
        res.send(stdout);  // Retourne la liste des répertoires trouvés
    });
});

// Route pour lancer l'analyse
app.get('/start-analysis', (req, res) => {

    const networkPath = req.query.path;
    const command = `blissify init ${networkPath}`;
    const analysis = exec(command);

    analysis.stdout.on('data', (data) => {
        res.write(data);
    });

    analysis.stderr.on('data', (data) => {
        res.write(`Erreur: ${data}`);
    });

    analysis.on('close', (code) => {
        res.end(`\nProcessus terminé avec le code: ${code}`);
    });
});

// Route pour chercher l'instance Volumio
app.get('/search-volumio', (req, res) => {
    // Exécuter une commande pour scanner le réseau (exemple avec nmap)
    exec('nmap -p 22 --open -sV 192.168.1.0/24', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur: ${stderr}`);
        }
        // Analyser stdout pour trouver les instances Volumio
        const volumioInstance = stdout.match(/192\.168\.1\.\d+/);  // exemple simple de regex
        res.send(volumioInstance ? volumioInstance[0] : 'Aucune instance Volumio trouvée');
    });
});

// Route pour uploader le fichier song.db vers Volumio via SFTP
app.post('/upload-songdb', (req, res) => {
    const conn = new Client();
    const songDbPath = '/path/to/song.db';  // Remplacez par le chemin de votre song.db
    const remotePath = '/home/volumio/.local/share/bliss-rs/song.db';

    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            if (err) throw err;
            sftp.fastPut(songDbPath, remotePath, (err) => {
                if (err) return res.status(500).send(`Erreur: ${err.message}`);
                res.send('Upload réussi!');
                conn.end();
            });
        });
    }).connect({
        host: '192.168.1.100',  // Adresse IP de l'instance Volumio trouvée
        port: 22,
        username: 'volumio',
        password: 'volumio'  // Remplacez par le mot de passe correct
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
