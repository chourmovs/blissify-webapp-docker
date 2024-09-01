const express = require('express');
const { exec } = require('child_process');
const Client = require('ssh2').Client;
const path = require('path');
const sftpUpload = require('sftp-upload');

const app = express();
app.use(express.static('public'));  // Servir les fichiers statiques comme HTML, CSS, JS

// Route pour rechercher la bibliothèque musicale
app.get('/search-music', (req, res) => {
    // Implémentation pour rechercher la bibliothèque musicale
    exec('find /path/to/network -type d', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur: ${stderr}`);
        }
        res.send(stdout);  // Retourne la liste des répertoires trouvés
    });
});

// Route pour lancer l'analyse
app.get('/start-analysis', (req, res) => {
    const command = 'blissify init';
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
