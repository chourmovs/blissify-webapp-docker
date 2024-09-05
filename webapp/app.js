process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // You can stop the server here, but for the purposes of this debugging, we'll simply log the exception to the console.
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

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
    const mountCommand = `mount -t cifs -o username=chourmovs,password='3$*ES3KSu4tYtX',file_mode=0777,dir_mode=0777,rw ${networkPath} /mnt/Music`;
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

// Start analysis (assuming blissify is command)
app.get('/start-analysis', async (req, res) => {
  try {
    const analysisProcess = spawn('blissify', ['start']);
    let output = '';

    analysisProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Analysis stdout: ${data}`);
    });

    analysisProcess.stderr.on('data', (data) => {
      output += data.toString();
      console.error(`Analysis stderr: ${data}`);
    });

    await new Promise((resolve) => {
      analysisProcess.on('close', resolve);
    });

    res.send(`Analysis started successfully: ${output}`);
  } catch (error) {
    console.error('Analysis start command failed:', error);
    res.status(500).send('Error starting analysis');
  }
});

// Blissify update
app.get('/blissify-update', async (req, res) => {
  try {
    const updateProcess = spawn('blissify', ['update']);
    let output = '';
    updateProcess.stdout.on('data', (data) => {
      output += data.toString();
      res.write(data); // Send data chunks to the client
    });

    updateProcess.stderr.on('data', (data) => {
      output += data.toString();
      console.error(`Blissify stderr: ${data}`);
    });

    await new Promise((resolve) => {
      updateProcess.on('close', resolve);
    });

    res.end(`Blissify updated successfully:\n${output}`);
  } catch (error) {
    console.error('Blissify update command failed:', error);
    res.status(500).send('Error updating Blissify');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
