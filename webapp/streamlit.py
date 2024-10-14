import streamlit as st
import requests

# Streamlit app title
st.set_page_config(page_title="Blissify-RS database runner ",
            page_icon='🦙',
            layout="wide")

with st.sidebar:
    st.markdown(
        """
        <style>
            .sidebar-title {
                font-size: 3rem;
            }
            .sidebar-separator {
                margin-top: 10px;
                margin-bottom: 10px;
            }
        </style>
        """,
        unsafe_allow_html=True
    )
    st.markdown('<div class="sidebar-title">Blissify-RS</div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-title">database runner</div>', unsafe_allow_html=True)
    st.sidebar.markdown('---')

# Adjust the title based on the selected model
st.write(f"""\n""")
st.write(f"""\n""")

st.write(f"""
    This little app allows users to mount his NAS media share in included MPD server as a base to build blissify database.

    For more info, you can refer to [Blissify-RS documentation](https://github.com/Polochon-street/blissify-rs).
    
    """)


st.markdown('---')

# Network Path Form

# Adjust the title based on the selected model
st.header(f"""`MPD` configuration""")
st.write(f"""\n""")


with st.expander("Help"):
    st.write(f"""
    Prepare MPD for blissify-RS"

    💡Path is on the linux form //192.xxx.xxx.xxx/Share

    💡Once added you will have to update you MPD database by launching MPC update 
        """)

st.write(f"""\n""")

network_path = st.text_input("NAS media Network Path:", value="//192.xxx.xxx.xxx/Share")

st.write(f"""\n""")

col1,col2,col3,col4 = st.columns(4)
with col1:
    if st.button("Mount NAS Share", key="mount_nas_button"):
        try:
            response = requests.get(f"http://localhost:3000/mount-nas?path={network_path}")
            st.success(response.text)
        except requests.exceptions.RequestException as e:
            st.error(f"Erreur lors du montage du NAS: {e}")

with col2:
    if st.button("MPC update", key="mpc_update_button"):
        try:
            response = requests.get("http://localhost:3000/mpc-update")
            st.success(response.text)
        except requests.exceptions.RequestException as e:
            st.error(f"Erreur lors de la mise à jour MPC: {e}\n")

st.markdown('---')


st.header(f"""`Blissify` operations""")
st.write(f"""\n""")


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
                    f'<div style="width:1024px; height:500px; overflow:auto; border:1px solid #ccc; padding:5px;">{st.session_state.console_output}</div>',
                    unsafe_allow_html=True
                )

with col6:
    if st.button("Blissify Update", key="blissify_update_button"):
        st.session_state.console_output = "Démarrage de l'analyse Blissify...\n"
        sse_url = "http://localhost:3000/blissify-update"
        response = requests.get(sse_url, stream=True)
                
        # Create an empty container for the console output
        console_output_container = st.empty()

        for line in response.iter_lines():
            if line:
                line = line.decode()
                st.session_state.console_output += line + "\n"
                # Update the console output in the container
                console_output_container.markdown(
                    f'<div style="width:1024px; height:500px; overflow:auto; border:1px solid #ccc; padding:5px;">{st.session_state.console_output}</div>',
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

