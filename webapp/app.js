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


app.get('/mount-nas', (req, res) => {
    const networkPath = req.query.path; // Récupère le chemin du dossier NAS

    // Commande pour monter le partage NAS en lecture seule sans sudo
    const mountCommand = `mount -o ro -t cifs ${networkPath} /mnt/Musique`; // Modifiez le type de montage si nécessaire
    
    exec(mountCommand, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors du montage : ${stderr}`);
        }
        res.send(`Partage NAS monté avec succès : ${stdout}`);
    });
});

// Route pour lancer blissify init après le montage
app.get('/start-analysis', (req, res) => {
    // Utiliser le chemin monté
    const command = `blissify init /mnt/Musique`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors de l'exécution de blissify : ${stderr}`);
        }
        res.send(`Blissify a été exécuté avec succès : ${stdout}`);
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
    const songDbPath = '~/.local/share/bliss-rs/song.db';  // Remplacez par le chemin de votre song.db
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
        host: '192.168.1.20',  // Adresse IP de l'instance Volumio trouvée
        port: 22,
        username: 'volumio',
        password: 'volumio'  // Remplacez par le mot de passe correct
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
