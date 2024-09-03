#!/bin/bash

# Tuer tout processus MPD existant
if pgrep mpd; then
    echo "Stopping existing MPD process..."
    pkill mpd
fi

# Démarrer MPD
echo "Starting MPD..."
mpd

# Démarrer l'application web
echo "Starting web application..."
# Ajoutez ici les commandes pour démarrer votre application web
node /app/webapp/app.js
# Exécuter la commande passée en argument, s'il y en a
exec "$@"


