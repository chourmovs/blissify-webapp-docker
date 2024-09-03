#!/bin/bash

# Démarrer MPD en arrière-plan
mpd --no-daemon &

# Démarrer la webapp Node.js
node /app/webapp/app.js
