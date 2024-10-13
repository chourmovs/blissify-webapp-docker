# Étape 1 : Construction de l'application dans une image de build
FROM ubuntu:latest AS build

# Mettre à jour les paquets et installer les dépendances nécessaires à la compilation
RUN apt-get update && apt-get install -y \
    build-essential pkg-config libavutil-dev libavformat-dev \
    libavfilter-dev libavdevice-dev libclang-dev libsqlite3-dev \
    git curl cifs-utils

# Configuration des locales
USER root
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get install --no-install-recommends -y locales && rm -rf /var/lib/apt/lists/*
RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN echo "LANG=en_US.UTF-8" > /etc/locale.conf

# Installer Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Cloner et compiler blissify-rs
WORKDIR /app
RUN git clone https://github.com/Polochon-street/blissify-rs.git .
RUN cargo build --release

# Étape 2 : Créer l'image finale minimale
FROM borda/docker_python-opencv-ffmpeg

# Créer le répertoire de montage
RUN mkdir -p /mnt/Musique
RUN chmod -R 777 /mnt/Musique

# Installer uniquement les dépendances nécessaires à l'exécution
RUN apt-get update && apt-get install -y \
    openssh-client ffmpeg mpd mpc expect \
    curl npm nodejs


# Copier l'exécutable compilé depuis l'étape de build
COPY --from=build /app/target/release/blissify /usr/local/bin/blissify

# Copier les fichiers du depot pour le dev
#WORKDIR /devapp
#COPY . /devapp

# Copier les fichiers de la webapp dans l'image finale
WORKDIR /app
COPY . /app

WORKDIR /app/webapp
# Installer les dépendances, y compris nodemon en dev
RUN npm install --only=development  # Installe nodemon et autres dépendances dev
RUN npm install -g nodemon
RUN npm install  # Installe les autres dépendances
# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app
RUN python3 -m venv .venv
RUN . .venv/bin/activate
RUN pip install streamlit
WORKDIR /app/webapp

# Configuration des locales
USER root
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get install --no-install-recommends -y locales && rm -rf /var/lib/apt/lists/*
RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN echo "LANG=en_US.UTF-8" > /etc/locale.conf

RUN mkdir -p /var/lib/mpd/music \
    && mkdir -p /var/lib/mpd/playlists \
    && mkdir -p /var/run/mpd \
    && mkdir -p /var/log/mpd \
    && touch /var/lib/mpd/tag_cache /var/lib/mpd/sticker.sql /var/log/mpd/mpd.log /var/lib/mpd/mpd.db /var/lib/mpd/network_path.conf

# Configurer MPD pour utiliser /mnt/Musique comme répertoire de musique
RUN truncate -s 0 /etc/mpd.conf \
    && echo 'filesystem_charset "UTF8"' >> /etc/mpd.conf \
    && echo 'music_directory "/mnt/Musique"' >> /etc/mpd.conf \
    && echo 'playlist_directory "/var/lib/mpd/playlists"' >> /etc/mpd.conf \
    && echo 'db_file "/var/lib/mpd/mpd.db"' >> /etc/mpd.conf \
    && echo 'log_file "/var/log/mpd/mpd.log"' >> /etc/mpd.conf \
    && echo 'pid_file "/var/run/mpd/mpd.pid"' >> /etc/mpd.conf \
    && echo 'state_file "/var/lib/mpd/state"' >> /etc/mpd.conf \
    && echo 'sticker_file "/var/lib/mpd/sticker.sql"' >> /etc/mpd.conf \
    && echo 'bind_to_address "0.0.0.0"' >> /etc/mpd.conf \
    && echo 'port "6600"' >> /etc/mpd.conf


# Exposer le port 3000
EXPOSE 3000
EXPOSE 6600
EXPOSE 8501

# Copier le script de démarrage
COPY start.sh /app/start.sh

# Rendre le script exécutable
RUN chmod +x /app/start.sh

# Commande de démarrage
CMD ["/app/start.sh"]
