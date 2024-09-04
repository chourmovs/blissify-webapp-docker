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

app.get('/mount-nas', (req, res) => {
    const networkPath = req.query.path;

    // Commande pour monter le partage NAS en lecture seule sans sudo
    const mountCommand = `mount -t cifs -o username=chourmovs,password='3$*ES3KSu4tYtX',file_mode=0777,dir_mode=0777,rw ${networkPath} /mnt/Musique`;
    
    exec(mountCommand, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors du montage : ${stderr}`);
        }
        res.send(`Partage NAS monté avec succès : ${stdout}`);
    });
});

app.get('/mpc-update', (req, res) => {
    const command = `mpc update`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors de la mise à jour MPC : ${stderr}`);
        }
        res.send(`MPC mis à jour avec succès : ${stdout}`);
    });
});

app.get('/start-analysis', (req, res) => {
    const command = `blissify init /mnt/Musique`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors de l'exécution de blissify init : ${stderr}`);
        }
        res.send(`Blissify init exécuté avec succès : ${stdout}`);
    });
});

app.get('/blissify-update', (req, res) => {
    const command = `blissify update`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Erreur lors de l'exécution de blissify update : ${stderr}`);
        }
        res.send(`Blissify update exécuté avec succès : ${stdout}`);
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
