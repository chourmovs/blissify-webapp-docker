process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // You can stop the server here, but for the purposes of this debugging, we'll simply log the exception to the console.
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
const { spawn } = require('child_process');
const compression = require('compression');
const fs = require('fs');

app.use(compression());

// Serve static files from the public directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mount NAS share
app.get('/mount-nas', async (req, res) => {
  const { path: networkPath } = req.query;

  if (!networkPath) {
    return res.status(400).send('Missing required parameter: path');
  }

  try {
    const mountCommand = `mount -t cifs -o username=chourmovs,password='3$*ES3KSu4tYtX',file_mode=0777,dir_mode=0777,rw ${networkPath} /mnt/Musique`;
    const mountProcess = spawn('sh', ['-c', mountCommand]);

    let output = '';

    mountProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Mount stdout: ${data}`);
    });

    mountProcess.stderr.on('data', (data) => {
      output += data.toString();
      console.error(`Mount stderr: ${data}`);
    });

    await new Promise((resolve) => {
      mountProcess.on('close', resolve);
    });

    res.send(`NAS share mounted successfully: ${output}`);
  } catch (error) {
    console.error('Mount command failed:', error);
    res.status(500).send('Error mounting NAS share');
  }
});

// Update MPC (Music Player Daemon)
app.get('/mpc-update', async (req, res) => {
  try {
    const mpcProcess = spawn('mpc', ['update']);
    let output = '';
    mpcProcess.stdout.on('data', (data) => {
      output += data.toString();
      res.write(data); // Send data chunks to the client
    });

    mpcProcess.stderr.on('data', (data) => {
      output += data.toString();
      console.error(`MPC stderr: ${data}`);
    });

    await new Promise((resolve) => {
      mpcProcess.on('close', resolve);
    });

    res.end(`MPC updated successfully:\n${output}`);
  } catch (error) {
    console.error('MPC update command failed:', error);
    res.status(500).send('Error updating MPC');
  }
});

// Route SSE pour lancer "blissify init"
app.get('/start-analysis', (req, res) => {
  const command = 'unbuffer blissify init /mnt/Musique';  // Utilisez unbuffer pour forcer la sortie immédiate
  const analysisProcess = spawn('sh', ['-c', command]);

  // Headers pour SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();  // Forcer l'envoi immédiat des headers

  // Capturer les données de sortie
  analysisProcess.stdout.on('data', (data) => {
    const output = data.toString().split('\n');
    output.forEach(line => {
      if (line.trim()) {
        res.write(`data: ${line.trim()}\n\n`);
        res.flush(); // Assurer l'envoi immédiat
      }
    });
  });

  // Capturer les erreurs
  analysisProcess.stderr.on('data', (data) => {
    res.write(`data: Erreur: ${data.toString()}\n\n`);
    res.flush(); // Forcer l'envoi immédiat des erreurs
  });

  // Quand le processus est terminé
  analysisProcess.on('close', (code) => {
    res.write(`data: Blissify terminé avec le code ${code}\n\n`);
    res.end(); // Fin du flux
  });
});

// Blissify update
app.get('/blissify-update', async (req, res) => {
  const command = 'unbuffer blissify update';  // Utilisez unbuffer pour forcer la sortie immédiate
  const analysisProcess = spawn('sh', ['-c', command]);

  // Headers pour SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();  // Forcer l'envoi immédiat des headers

  // Capturer les données de sortie
  analysisProcess.stdout.on('data', (data) => {
    const output = data.toString().split('\n');
    output.forEach(line => {
      if (line.trim()) {
        res.write(`data: ${line.trim()}\n\n`);
        res.flush(); // Assurer l'envoi immédiat
      }
    });
  });

  // Capturer les erreurs
  analysisProcess.stderr.on('data', (data) => {
    res.write(`data: Erreur: ${data.toString()}\n\n`);
    res.flush(); // Forcer l'envoi immédiat des erreurs
  });

  // Quand le processus est terminé
  analysisProcess.on('close', (code) => {
    res.write(`data: Blissify terminé avec le code ${code}\n\n`);
    res.end(); // Fin du flux
  });
});

app.get('/check-file-exists', (req, res) => {
  const filePath = '/root/.local/share/bliss-rs/song.db'; // Remplacez par le chemin de votre fichier

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Afficher un message de journalisation si le fichier n'existe pas
      console.log('Le fichier ' + filePath + ' n\'existe pas.');
      res.json({ exists: false });
    } else {
      // Afficher un message de journalisation si le fichier existe
      console.log('Le fichier ' + filePath + ' existe.');
      res.json({ exists: true });
    }
  });
});

app.get('/stop-analysis', (req, res) => {
  const command = 'pgrep blissify | xargs -r /bin/kill -15';
  const stopProcess = spawn('sh', ['-c', command], { detached: true });

  stopProcess.on('close', (code) => {
    console.log(`Blissify process stopped with code ${code}`);
    res.send('Blissify process stopped');
  });
});



app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
