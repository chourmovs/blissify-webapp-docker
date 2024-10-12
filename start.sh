#!/bin/bash

# Tuer tout processus MPD existant
if pgrep mpd; then
    echo "Stopping existing MPD process..."
    pkill mpd
fi

# Libérer le port 6600 s'il est utilisé par un autre processus
if lsof -i:6600; then
    echo "Port 6600 is in use, freeing it..."
    fuser -k 6600/tcp
fi

# Démarrer MPD
echo "Starting MPD..."
mpd

# Démarrer l'application web
echo "Starting web application..."
# Ajoutez ici les commandes pour démarrer votre application web
nodemon /app/webapp/app.js
# Exécuter la commande passée en argument, s'il y en a
exec "$@"


