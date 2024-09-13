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
//const fs = require('fs').promises;
const fs = require("fs");


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
    // Save network path to a configuration file
    await fs.promises.writeFile('/var/lib/mpd/network_path.conf', networkPath);
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

app.get('/check-file-exists', async (req, res) => {
  const filePath = path.resolve('/root/.local/share/bliss-rs/songs.db'); // Remplacez par le chemin de votre fichier

  try {
    await fs.access(filePath);
    console.log('Le fichier ' + filePath + ' existe.');
    res.json({ exists: true });
  } catch (err) {
    console.log('Le fichier ' + filePath + ' n\'existe pas.');
    console.error('Erreur lors de la vérification du fichier:', err);
    res.json({ exists: false });
  }
});

app.get("/check-mounted", async (req, res) => {
  try {
    const stat = await fs.promises.stat("/mnt/NAS");
    res.send("mounted");
  } catch (error) {
    // Handle the case when the directory is not mounted
    if (error.code === "ENOENT") {
      res.send("not_mounted");
    } else {
      console.error("Error checking the mounted state of the shared directory", error);
      res.sendStatus(500);
    }
  }
});

app.get('/stop-analysis', (req, res) => {
  const command = 'pgrep blissify | xargs -r /bin/kill -15';
  const stopProcess = spawn('sh', ['-c', command], { detached: true });

  stopProcess.on('close', (code) => {
    console.log(`Blissify process stopped with code ${code}`);
    res.send('Blissify process stopped');
  });
});




app.post("/save-config", async (req, res) => {
  try {
    const sharedPath = req.body.path_to_share;
    const data = JSON.stringify({ path_to_share: sharedPath }, null, 2);

    const configPath = "/var/lib/mpd/network_path.conf";
    await fs.promises.writeFile(configPath, data);

    res.status(200).send("Configuration saved successfully");
  } catch (error) {
    console.error("Error saving configuration", error);
    res.sendStatus(500);
  }
});


// Persistently check and mount the network path from the configuration file when the application starts
mountNetworkPathIfExists().catch((error) => {
  console.error('mountNetworkPathIfExists():', error);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});




async function mountNetworkPathIfExists() {
  try {
    const configPath = path.resolve("/var/lib/mpd/network_path.conf");
    const networkPath = (await fs.readFile(configPath)).toString().trim();

    if (networkPath) {
      fs.access(networkPath, fs.constants.R_OK)
        .then(() => {
          return fs.cpfs(networkPath, "/mnt/NAS", {
            options: ["-o", "vers=3.0,ro"],
          });
        })
        .catch(() => {
          console.error("Failed to mount network path. Please check the path.");
        });
    }
  } catch (err) {
    console.error("Error reading the configuration file to mount the network path", err);
    // You can display an error message on the front end
    console.error("Error: Unable to find the configuration file located at /var/lib/mpd/network_path.conf.");
  }
}
