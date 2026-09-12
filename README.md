# SMSTalks

A small messaging prototype for two people. It includes:

- A unique `LL-######` ID for each local profile
- Profile name editing and local profile picture upload
- A connect-by-ID flow
- Text messaging with Enter-to-send
- Image and video attachments in both app versions
- Voice messages with browser recording and Streamlit audio capture
- Shareable thread links using a URL query parameter
- Local browser persistence via `localStorage`

## Run

Open `index.html` directly in a browser, or serve the folder with any static web server.

To run the deployable Streamlit version:

```powershell
py -m pip install -r requirements.txt
py -m streamlit run app.py
```

For Streamlit Community Cloud, push this folder to GitHub and select `app.py` as the main file. The `requirements.txt` file is included for dependency installation.

This is still a prototype: media and messages live in the current Streamlit session. Real cross-device delivery requires a backend with authentication, storage, and realtime messaging.
