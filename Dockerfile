# Étape 1 : Construction de l'application dans une image de build
FROM archlinux:latest AS build

# Mettre à jour les paquets et installer les dépendances nécessaires à la compilation
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm base-devel clang ffmpeg git curl cifs-utils


# Installer Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Cloner et compiler blissify-rs
WORKDIR /app
RUN git clone https://github.com/Polochon-street/blissify-rs.git .
RUN cargo build --release

# Étape 2 : Créer l'image finale minimale
FROM archlinux:latest

# Créer le répertoire de montage
RUN mkdir -p /mnt/Musique

# Installer uniquement les dépendances nécessaires à l'exécution
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm openssh


# Copier l'exécutable compilé depuis l'étape de build
COPY --from=build /app/target/release/blissify /usr/local/bin/blissify

# Copier les fichiers de la webapp dans l'image finale
WORKDIR /app/webapp
COPY ./webapp /app/webapp

# Installer Node.js et les dépendances de la webapp
RUN pacman -S --noconfirm nodejs npm ffmpeg mpd mpc
RUN npm install

RUN mkdir -p /var/lib/mpd/music \
    && mkdir -p /var/lib/mpd/playlists \
    && mkdir -p /var/run/mpd \
    && mkdir -p /var/log/mpd \
    && touch /var/lib/mpd/tag_cache /var/lib/mpd/sticker.sql /var/log/mpd/mpd.log

# Configurer MPD pour utiliser /mnt/Musique comme répertoire de musique
RUN echo 'music_directory "/mnt/Musique"' >> /etc/mpd.conf \
    && echo 'playlist_directory "/var/lib/mpd/playlists"' >> /etc/mpd.conf \
    && echo 'db_file "/var/lib/mpd/tag_cache"' >> /etc/mpd.conf \
    && echo 'log_file "/var/log/mpd/mpd.log"' >> /etc/mpd.conf \
    && echo 'pid_file "/var/run/mpd/mpd.pid"' >> /etc/mpd.conf \
    && echo 'state_file "/var/lib/mpd/state"' >> /etc/mpd.conf \
    && echo 'sticker_file "/var/lib/mpd/sticker.sql"' >> /etc/mpd.conf \
    && echo 'bind_to_address "0.0.0.0"' >> /etc/mpd.conf \
    && echo 'port "6600"' >> /etc/mpd.conf

# Exposer le port 3000
EXPOSE 3000
EXPOSE 6600

# Commande de démarrage de la webapp
CMD ["node", "app.js","mpd"]
