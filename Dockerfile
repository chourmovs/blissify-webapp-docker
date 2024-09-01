# Étape 1 : Construction de l'application dans une image de build
FROM archlinux:latest AS build

# Mettre à jour les paquets et installer les dépendances nécessaires à la compilation
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm base-devel clang ffmpeg git curl cifs-utils

# Créer le répertoire de montage
RUN mkdir -p /mnt/Musique

# Installer Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Cloner et compiler blissify-rs
WORKDIR /app
RUN git clone https://github.com/Polochon-street/blissify-rs.git .
RUN cargo build --release

# Étape 2 : Créer l'image finale minimale
FROM archlinux:latest

# Installer uniquement les dépendances nécessaires à l'exécution
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm openssh


# Copier l'exécutable compilé depuis l'étape de build
COPY --from=build /app/target/release/blissify /usr/local/bin/blissify

# Copier les fichiers de la webapp dans l'image finale
WORKDIR /app/webapp
COPY ./webapp /app/webapp

# Installer Node.js et les dépendances de la webapp
RUN pacman -S --noconfirm nodejs npm
RUN npm install express child_process ssh2 sftp-upload

# Exposer le port 3000
EXPOSE 3000

# Commande de démarrage de la webapp
CMD ["node", "app.js"]
