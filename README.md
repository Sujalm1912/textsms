# SMSTalks

A small messaging prototype for two people. It includes:

- A unique mixed `SMS-7K4P2Q` ID for each local profile
- Profile name editing and local profile picture upload
- A connect-by-ID flow
- An Inbox contact list with a centered Connect Privately start screen
- Contact name, profile picture, and last-seen details in the Inbox and thread header
- Per-contact history retained in the current browser/session with no delete control
- Text messaging with Enter-to-send
- Optional Twilio SMS delivery with E.164 phone validation
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

## Enable Messages Between Users

The app needs a shared database for one user to receive another user's messages. Create a Supabase project, run [supabase_schema.sql](supabase_schema.sql) in its SQL editor, then add these secrets in Streamlit Cloud under **App settings > Secrets**:

```toml
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

Use the service-role key only in Streamlit server secrets. Never put it in browser JavaScript or commit it to GitHub. Without these secrets, the app intentionally uses per-session local messages and cannot deliver between users.

## Enable Twilio SMS

Copy `.env.example` to `.env` for local development, then add the same values to Streamlit Cloud **App settings > Secrets**:

```toml
TWILIO_ACCOUNT_SID = "AC..."
TWILIO_AUTH_TOKEN = "..."
TWILIO_PHONE_NUMBER = "+1234567890"
```

In an open chat, enter the recipient phone number in E.164 format such as `+919876543210`, enable **Also send chat messages as SMS**, and send a message. Twilio handles outbound SMS; inbound SMS still needs a Twilio webhook connected to a public backend.

This is still a prototype: media, profiles, and messages live in the current browser/Streamlit session. Real cross-device profile syncing, last-seen updates, and permanent history require a backend with authentication, storage, and realtime messaging.
