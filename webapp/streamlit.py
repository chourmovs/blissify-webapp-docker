import streamlit as st
import requests

# Streamlit app title
st.title("Gestion du NAS et des Analyses")

# Network Path Form
network_path = st.text_input("Chemin du partage NAS:")
if st.button("Monter le partage NAS"):
    try:
        response = requests.get(f"http://localhost:3000/mount-nas?path={network_path}")
        st.success(response.text())
    except requests.exceptions.RequestException as e:
        st.error(f"Erreur lors du montage du NAS: {e}")

# Buttons for Operations
if st.button("Mise à jour MPC"):
    try:
        response = requests.get("http://localhost:3000/mpc-update")
        st.write(response.text())
    except requests.exceptions.RequestException as e:
        st.error(f"Erreur lors de la mise à jour MPC: {e}")

if st.button("Blissify Init"):
    st.write("Démarrage de l'analyse Blissify...")
    sse_url = "http://localhost:3000/start-analysis"
    response = requests.get(sse_url, stream=True)

    for line in response.iter_lines():
        if line:
            st.write(line.decode())

if st.button("Blissify Update"):
    try:
        response = requests.get("http://localhost:3000/blissify-update")
        st.write(response.text())
    except requests.exceptions.RequestException as e:
        st.error(f"Erreur lors de la mise à jour Blissify: {e}")

if st.button("Stop Analysis"):
    try:
        response = requests.get("http://localhost:3000/stop-analysis")
        st.write(response.text())
    except requests.exceptions.RequestException as e:
        st.error(f"Erreur lors de l'arrêt de l'analyse: {e}")

# Output Console
st.write("Console de sortie:")
st.markdown("---")
