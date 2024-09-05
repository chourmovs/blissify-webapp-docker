process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Vous pouvez arrêter le serveur ici, mais pour les besoins de ce débogage, nous allons simplement afficher l'exception dans la console.
});

const express = require('express');
const { exec } = require('child_process');
const Client = require('ssh2').Client;
const path = require('path');
const sftpUpload = require('sftp-upload');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/mount-nas', (req, res) => {
    const networkPath = req.query.path;

    // Command to mount the NAS share as read-only with no sudo
    const mountCommand = `mount -t cifs -o username=chourmovs,password='3$*ES3KSu4tYtX',file_mode=0777,dir_mode=0777,rw ${networkPath} /mnt/Music`;

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
            return res.status(500).send(`Error mounting share: ${output}`);
        }
        res.send(`NAS share mounted successfully: ${output}`);
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
            res.write(`\nError updating MPC (code ${code})`);
        } else {
            res.write(`\nMPC updated successfully`);
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
            res.write(`\nError executing blissify update (code ${code})`);
        } else {
            res.write(`\nBlissify update executed successfully`);
        }
        res.end();
    });
});

// Route to find the Volumio instance
app.get('/search-volumio', (req, res) => {
    // Execute a command to scan the network (example with nmap)
    exec('nmap -p 22 --open -sV 192.168.1.0/24', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send(`Error: ${stderr}`);
        }
        // Parse stdout to find Volumio instances
        const volumioInstance = stdout.match(/192\.168\.1\.\d+/); // simple example of regex
        res.send(volumioInstance ? volumioInstance[0] : 'No Volumio instances found');
    });
});

