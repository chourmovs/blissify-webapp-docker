# Étape 1 : Utiliser une image de base Arch Linux
FROM archlinux:latest

# Étape 2 : Mettre à jour les paquets et installer les dépendances
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm base-devel clang ffmpeg git curl nodejs npm

# Étape 3 : Installer Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Étape 4 : Cloner et compiler blissify-rs
WORKDIR /app
RUN git clone https://github.com/Polochon-street/blissify-rs.git .
RUN cargo build --release

# Étape 5 : Configurer et installer les dépendances de la webapp
WORKDIR /app/webapp

# Initialiser le projet Node.js et installer les dépendances
RUN npm init -y
RUN npm install express child_process ssh2 sftp-upload

# Copier les fichiers de la webapp dans l'image
COPY ./webapp /app/webapp

# Exposer le port 3000
EXPOSE 3000

# Commande pour démarrer la webapp
CMD ["node", "app.js"]
