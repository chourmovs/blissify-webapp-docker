import streamlit as st
import requests

# Streamlit app title
st.set_page_config(page_title="Blissify-RS database runner ",
            page_icon='🦙',
            layout="wide")


# Adjust the title based on the selected model
st.header(f"""`Blissify-RS` database runner""")

with st.expander("About this app"):
    st.write(f"""
    This Chatbot app allows users to interact with various models including the new LLM models hosted on DeepInfra's OpenAI compatible API.
    For more info, you can refer to [DeepInfra's documentation](https://deepinfra.com/docs/advanced/openai_api).

    💡 For decent answers, you'd want to increase the `Max Tokens` value from `100` to `500`. 
    """)


st.markdown('---')

# Network Path Form
network_path = st.text_input("NAS media network path:")

col1,col2,col3,col4 = st.columns(4)
with col1:
    if st.button("Mount NAS Share", key="mount_nas_button"):
        try:
            response = requests.get(f"http://localhost:3000/mount-nas?path={network_path}")
            st.success(response.text)
        except requests.exceptions.RequestException as e:
            st.error(f"Erreur lors du montage du NAS: {e}")

with col2:
    if st.button("MPC update command", key="mpc_update_button"):
        try:
            response = requests.get("http://localhost:3000/mpc-update")
            st.success(response.text)
        except requests.exceptions.RequestException as e:
            st.error(f"Erreur lors de la mise à jour MPC: {e}\n")

st.markdown('---')

# Buttons for Operations
col5,col6,col7,col8 = st.columns(4)

with col5:
    if st.button("Blissify Init", key="blissify_init_button"):
        st.session_state.console_output = "Démarrage de l'analyse Blissify...\n"
        sse_url = "http://localhost:3000/start-analysis"
        response = requests.get(sse_url, stream=True)

        # Create an empty container for the console output
        console_output_container = st.empty()

        for line in response.iter_lines():
            if line:
                line = line.decode()
                st.session_state.console_output += line + "\n"
                # Update the console output in the container
                console_output_container.markdown(
                    f'<div style="width:500px; height:500px; overflow:auto; border:1px solid #ccc; padding:10px;">{st.session_state.console_output}</div>',
                    unsafe_allow_html=True
                )

with col6:
    if st.button("Blissify Update", key="blissify_update_button"):
        #st.session_state.console_output = ""
        st.session_state.console_output += f"Mise à jour Blissify: {response.text}\n"
         # Create an empty container for the console output
        console_output_container = st.empty()

        for line in response.iter_lines():
            if line:
                line = line.decode()
                st.session_state.console_output += line + "\n"
                # Update the console output in the container
                console_output_container.markdown(
                    f'<div style="width:500px; height:500px; overflow:auto; border:1px solid #ccc; padding:10px;">{st.session_state.console_output}</div>',
                    unsafe_allow_html=True
                )


with col7:
    if st.button("Stop Analysis", key="stop_analysis_button"):
        st.session_state.console_output = ""
        try:
            response = requests.get("http://localhost:3000/stop-analysis")
            st.success(response.text)
        except requests.exceptions.RequestException as e:
            st.error(f"Erreur lors de la mise à jour MPC: {e}\n")

st.markdown('---')
