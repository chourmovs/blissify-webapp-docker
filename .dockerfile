# Étape 1 : Utiliser une image de base Arch Linux
FROM archlinux:latest

# Étape 2 : Mettre à jour les paquets et installer les dépendances
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm base-devel clang ffmpeg git curl

# Étape 3 : Installer Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Étape 4 : Cloner et compiler blissify-rs
WORKDIR /app
RUN git clone https://github.com/yourusername/blissify-rs.git .
RUN cargo build --release

# Étape 5 : Créer une webapp pour interagir avec blissify-rs
# Par exemple, utiliser un framework léger comme Express.js ou Actix-web (si vous préférez rester en Rust)

# Ajouter votre code de webapp ici, par exemple :
COPY ./webapp /app/webapp
WORKDIR /app/webapp
RUN npm install
RUN npm run build

# Exposer le port 3000
EXPOSE 3000

# Commande pour démarrer la webapp
CMD ["npm", "start"]
