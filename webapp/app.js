const express = require('express');
const { exec } = require('child_process');
const Client = require('ssh2').Client;
const path = require('path');
const sftpUpload = require('sftp-upload');
const { spawn } = require('child_process');

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
    
    const mountProcess = spawn('sh', ['-c', mountCommand]);

    let output = '';

    mountProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    mountProcess.stderr.on('data', (data) => {
        output += data.toString();
    });

    mountProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).send(`Erreur lors du montage : ${output}`);
        }
        res.send(`Partage NAS monté avec succès : ${output}`);
    });
});


app.get('/start-analysis', (req, res) => {
    const command = 'blissify init /mnt/Musique';
    const analysisProcess = spawn('sh', ['-c', command]);

    res.setHeader('Content-Type', 'text/plain');

    analysisProcess.stdout.on('data', (data) => {
        res.write(data.toString());
    });

    analysisProcess.stderr.on('data', (data) => {
        res.write(data.toString());
    });

    analysisProcess.on('close', (code) => {
        if (code !== 0) {
            res.write(`\nErreur lors de l'exécution de blissify init (code ${code})`);
        } else {
            res.write(`\nBlissify init exécuté avec succès`);
        }
        res.end();
    });
});

app.get('/mpc-update', (req, res) => {
    const command = 'mpc update';
    const mpcProcess = spawn('sh', ['-c', command]);

    res.setHeader('Content-Type', 'text/plain');

    mpcProcess.stdout.on('data', (data) => {
        res.write(data.toString());
    });

    mpcProcess.stderr.on('data', (data) => {
        res.write(data.toString());
    });

    mpcProcess.on('close', (code) => {
        if (code !== 0) {
            res.write(`\nErreur lors de la mise à jour MPC (code ${code})`);
        } else {
            res.write(`\nMPC mis à jour avec succès`);
        }
        res.end();
    });
});

app.get('/blissify-update', (req, res) => {
    const command = 'blissify update';
    const updateProcess = spawn('sh', ['-c', command]);

    res.setHeader('Content-Type', 'text/plain');

    updateProcess.stdout.on('data', (data) => {
        res.write(data.toString());
    });

    updateProcess.stderr.on('data', (data) => {
        res.write(data.toString());
    });

    updateProcess.on('close', (code) => {
        if (code !== 0) {
            res.write(`\nErreur lors de l'exécution de blissify update (code ${code})`);
        } else {
            res.write(`\nBlissify update exécuté avec succès`);
        }
        res.end();
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

app.get('/test-command', (req, res) => {
    const command = 'ls /mnt/Musique'; // Simple commande de test
    const testProcess = spawn('sh', ['-c', command]);

    res.setHeader('Content-Type', 'text/plain');

    testProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        res.write(data.toString());
    });

    testProcess.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
        res.write(data.toString());
    });

    testProcess.on('close', (code) => {
        console.log(`Processus terminé avec code : ${code}`);
        if (code !== 0) {
            res.write(`\nErreur (code ${code})`);
        } else {
            res.write(`\nCommande exécutée avec succès`);
        }
        res.end();
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
