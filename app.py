import base64
import json
import os
import random
import re
import string
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import streamlit as st
from dotenv import load_dotenv
from streamlit_autorefresh import st_autorefresh
from twilio.rest import Client

load_dotenv()

st.set_page_config(page_title="SMSTalks", page_icon="↗", layout="wide", initial_sidebar_state="expanded")

GREEN = "#2f6653"
PAPER = "#f4efe5"

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
    :root { --ink:#202321; --muted:#737770; --line:rgba(32,35,33,.13); --green:#2f6653; --paper:#f4efe5; }
    .stApp { background: radial-gradient(circle at 78% 2%, rgba(216,120,95,.12), transparent 28%), var(--paper); color:var(--ink); }
    .block-container { max-width: 1320px; padding: 2.2rem 3rem 2rem; }
    [data-testid="stSidebar"] { background: rgba(255,253,248,.7); border-right:1px solid var(--line); }
    [data-testid="stSidebar"] .block-container { padding: 2rem 1.5rem; }
    h1,h2,h3,p,span,label,button { font-family:'Manrope',sans-serif; }
    h1,h2,h3 { letter-spacing:-.04em; }
    .mono { font-family:'DM Mono',monospace; font-size:.72rem; color:var(--muted); letter-spacing:.04em; }
    .brand { font:800 1.35rem 'Manrope',sans-serif; letter-spacing:-.06em; margin-bottom:1.8rem; }
    .brand-mark { display:inline-grid; place-items:center; width:30px; height:30px; margin-right:8px; border-radius:9px; color:white; background:var(--green); }
    .eyebrow { font:500 .64rem 'DM Mono',monospace; letter-spacing:.12em; color:var(--muted); }
    .panel { border:1px solid var(--line); border-radius:16px; padding:1rem 1.1rem; background:rgba(255,253,248,.75); box-shadow:0 16px 40px rgba(87,71,48,.06); margin-bottom:1rem; }
    .profile { display:flex; align-items:center; gap:.8rem; margin:.9rem 0 1rem; }
    .avatar { width:48px; height:48px; display:grid; place-items:center; flex:none; border-radius:50%; background:#e2b6a7; color:#70453c; font-weight:800; overflow:hidden; }
    .avatar img { width:100%; height:100%; object-fit:cover; }
    .contact-header { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:1rem; margin-bottom:1.3rem; }
    .contact { display:flex; align-items:center; gap:.8rem; }
    .online { color:var(--green); font-size:.7rem; font-weight:700; }
    .thread-note { color:var(--muted); font-size:.8rem; line-height:1.5; text-align:center; margin:2rem auto; max-width:500px; }
    .message { display:flex; flex-direction:column; max-width:70%; margin:.8rem 0; }
    .message.me { align-items:flex-end; margin-left:auto; }
    .message.them { align-items:flex-start; }
    .bubble { padding:.75rem .9rem; border-radius:4px 15px 15px 15px; background:#e0e9df; font-size:.87rem; line-height:1.5; }
    .message.me .bubble { border-radius:15px 4px 15px 15px; background:var(--green); color:#fff; }
    .meta { color:var(--muted); font: .58rem 'DM Mono',monospace; margin-top:.25rem; }
    .share-box { background:rgba(47,102,83,.08); border:1px solid rgba(47,102,83,.18); border-radius:10px; padding:.8rem; margin-top:.7rem; }
    .stButton button, .stDownloadButton button { border-radius:9px; font-weight:700; }
    div[data-testid="stChatInput"] { background:rgba(255,253,248,.88); }
    @media (max-width: 700px) { .block-container { padding:1rem; } .message { max-width:88%; } }
    </style>
    """,
    unsafe_allow_html=True,
)


def make_id():
    return "SMS-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def initials(name):
    return "".join(part[0] for part in name.split()[:2]).upper() or "YO"


def avatar_html(name, photo):
    if photo:
        encoded = base64.b64encode(photo).decode("ascii")
        return f'<div class="avatar"><img src="data:image/jpeg;base64,{encoded}" alt="Profile picture"></div>'
    return f'<div class="avatar">{initials(name)}</div>'


def now():
    return datetime.now().strftime("%I:%M %p").lstrip("0")


def twilio_settings():
    values = {}
    for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"):
        try:
            values[key] = st.secrets[key]
        except (KeyError, FileNotFoundError):
            values[key] = os.getenv(key)
    return values if all(values.values()) else None


def valid_phone(phone):
    return bool(re.fullmatch(r"\+[1-9]\d{7,14}", phone.strip()))


def send_twilio_sms(phone, message):
    settings = twilio_settings()
    if not settings:
        return None, "Twilio is not configured. Add Twilio secrets before sending SMS."
    if not valid_phone(phone):
        return None, "Use the recipient's phone number in E.164 format, for example +919876543210."
    try:
        sms = Client(settings["TWILIO_ACCOUNT_SID"], settings["TWILIO_AUTH_TOKEN"]).messages.create(
            body=message,
            from_=settings["TWILIO_PHONE_NUMBER"],
            to=phone.strip(),
        )
        return sms.sid, None
    except Exception as error:
        return None, f"Twilio could not send the SMS: {error}"


def supabase_settings():
    try:
        return st.secrets["SUPABASE_URL"].rstrip("/"), st.secrets["SUPABASE_SERVICE_ROLE_KEY"]
    except (KeyError, FileNotFoundError):
        return None


def supabase_request(method, path, payload=None, query=""):
    settings = supabase_settings()
    if not settings:
        return None
    url, service_key = settings
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(f"{url}/rest/v1/{path}{query}", data=body, method=method)
    request.add_header("apikey", service_key)
    request.add_header("Authorization", f"Bearer {service_key}")
    request.add_header("Content-Type", "application/json")
    request.add_header("Prefer", "return=representation")
    try:
        with urlopen(request, timeout=8) as response:
            return json.loads(response.read() or b"[]")
    except Exception as error:
        st.session_state.backend_error = str(error)
        return None


def load_shared_messages(thread_id):
    rows = supabase_request(
        "GET",
        "messages",
        query=f"?thread_id=eq.{thread_id}&order=created_at.asc",
    )
    if rows is None:
        return None
    return [
        {
            "from": "me" if row["sender_id"] == st.session_state.profile["id"] else "them",
            "text": row.get("body", ""),
            "time": datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")).strftime("%I:%M %p").lstrip("0"),
            **({row["media_type"]: row["media_data"]} if row.get("media_type") else {}),
        }
        for row in rows
    ]


def save_shared_message(thread_id, message):
    media_type = next((key for key in ("image", "video", "audio") if key in message), None)
    supabase_request(
        "POST",
        "messages",
        {
            "thread_id": thread_id,
            "sender_id": st.session_state.profile["id"],
            "body": message.get("text", ""),
            "media_type": media_type,
            "media_data": message.get(media_type) if media_type else None,
        },
    )


if "profile" not in st.session_state:
    st.session_state.profile = {"name": "You", "id": make_id(), "photo": None}
if "contact" not in st.session_state:
    st.session_state.contact = {"name": "Alex Morgan", "id": "SMS-4A2L9Q", "photo": None, "last_seen": "online", "phone": ""}
if "contacts" not in st.session_state:
    st.session_state.contacts = [st.session_state.contact]
if "started" not in st.session_state:
    st.session_state.started = False
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"from": "them", "text": "Hey! I made it here. This feels much quieter than a group chat.", "time": "10:42 AM"},
        {"from": "me", "text": "That is exactly the idea. Just us, and a little breathing room.", "time": "10:44 AM"},
        {"from": "them", "text": "I like it. Send me the plan when you are ready.", "time": "10:45 AM"},
    ]
if "conversations" not in st.session_state:
    st.session_state.conversations = {st.session_state.contact["id"]: st.session_state.messages}

shared_messages = load_shared_messages(st.session_state.contact["id"])
if shared_messages is not None:
    st.session_state.messages = shared_messages
    st.session_state.conversations[st.session_state.contact["id"]] = shared_messages

# A query parameter makes a thread link portable between browser sessions.
query_thread = st.query_params.get("thread")
if query_thread:
    if query_thread != st.session_state.contact["id"]:
        st.session_state.contact = {"name": "New connection", "id": query_thread, "photo": None, "last_seen": "last seen recently", "phone": ""}
        st.session_state.contacts = [st.session_state.contact, *[contact for contact in st.session_state.contacts if contact["id"] != query_thread]]
        st.session_state.messages = st.session_state.conversations.get(query_thread, [])
    st.session_state.started = True

if st.session_state.started:
    if supabase_settings():
        st_autorefresh(interval=3000, key="message_poll")
    st.markdown('<style>[data-testid="stSidebar"] { display: none; } .block-container { max-width: 1100px; }</style>', unsafe_allow_html=True)

with st.sidebar:
    st.markdown('<div class="brand"><span class="brand-mark">↗</span>SMSTalks</div>', unsafe_allow_html=True)
    st.markdown('<span class="eyebrow">YOUR PROFILE</span>', unsafe_allow_html=True)
    st.markdown(
        f'<div class="profile">{avatar_html(st.session_state.profile["name"], st.session_state.profile["photo"])}'
        f'<div><strong>{st.session_state.profile["name"]}</strong><div class="mono">{st.session_state.profile["id"]}</div></div></div>',
        unsafe_allow_html=True,
    )
    profile_name = st.text_input("Display name", value=st.session_state.profile["name"], key="profile_name")
    profile_photo = st.file_uploader("Profile picture", type=["png", "jpg", "jpeg", "webp"], key="profile_photo")
    if st.button("Save profile", use_container_width=True):
        st.session_state.profile["name"] = profile_name.strip() or "You"
        if profile_photo:
            st.session_state.profile["photo"] = profile_photo.getvalue()
        st.rerun()
    if st.button("Copy my ID", use_container_width=True):
        st.code(st.session_state.profile["id"], language=None)
        st.caption("Copy the ID above and send it privately.")
    st.markdown('<span class="eyebrow">INBOX</span>', unsafe_allow_html=True)
    st.caption(f"{len(st.session_state.contacts)} conversation(s)")
    for contact in st.session_state.contacts:
        if st.button(f'{initials(contact["name"])}  {contact["name"]}\n{contact["id"]} · {contact.get("last_seen", "last seen recently")}', key=f'inbox_{contact["id"]}', use_container_width=True):
            if st.session_state.contact["id"] != contact["id"]:
                st.session_state.messages = st.session_state.conversations.get(contact["id"], [])
            st.session_state.contact = contact
            st.session_state.started = True
            st.query_params["view"] = "chat"
            st.query_params["thread"] = contact["id"]
            st.rerun()
    st.caption("Local session prototype · add a database for real cross-device delivery")

col_main, col_side = st.columns([3.8, 1.25], gap="large")
if not st.session_state.started:
    with col_main:
        st.markdown('<div style="min-height:65vh;display:grid;place-items:center;text-align:center"><div style="max-width:440px;width:100%"><div class="start-icon">↗</div><div class="eyebrow">PRIVATE MESSAGING</div><h2>Connect privately</h2><p class="muted">Enter the unique ID of the person you want to message.</p></div></div>', unsafe_allow_html=True)
        connect_id = st.text_input("Their unique ID", placeholder="SMS-7K4P2Q", key="start_connect_id")
        if st.button("Connect", type="primary", use_container_width=True):
            candidate = connect_id.strip().upper()
            if len(candidate) == 10 and candidate.startswith("SMS-") and all(character in string.ascii_uppercase + string.digits for character in candidate[4:]):
                if candidate == st.session_state.profile["id"]:
                    st.warning("That is your own ID.")
                else:
                    st.session_state.contact = {"name": "New connection", "id": candidate, "photo": None, "last_seen": "last seen recently", "phone": ""}
                    st.session_state.contacts = [st.session_state.contact, *[contact for contact in st.session_state.contacts if contact["id"] != candidate]]
                    st.session_state.messages = st.session_state.conversations.get(candidate, [])
                    st.session_state.started = True
                    st.query_params["view"] = "chat"
                    st.query_params["thread"] = candidate
                    st.rerun()
            else:
                st.warning("Use an ID in the format SMS-7K4P2Q.")
    with col_side:
        st.markdown('<span class="eyebrow">INBOX</span>', unsafe_allow_html=True)
        st.caption("Choose a conversation or connect with a new person.")
    st.stop()

with col_main:
    contact = st.session_state.contact
    if supabase_settings():
        if st.button("Refresh messages", key="refresh_messages"):
            st.rerun()
    else:
        st.info("Shared messaging is not configured yet. Add Supabase secrets to receive messages from another user.")
    if st.button("← Inbox", key="back_to_inbox"):
        st.session_state.started = False
        st.query_params.clear()
        st.rerun()
    st.markdown(
        f'<div class="contact-header"><div class="contact">{avatar_html(contact["name"], contact["photo"])}'
        f'<div><h2 style="margin:0">{contact["name"]} <span class="online">● {contact.get("last_seen", "last seen recently")}</span></h2>'
        f'<div class="mono">{contact["id"]}</div></div></div><div class="mono">Today</div></div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        f'<div class="thread-note">{avatar_html(contact["name"], contact["photo"])}<br><strong>{contact["name"]}</strong><br>Messages here are just between the two of you.</div>',
        unsafe_allow_html=True,
    )
    for message in st.session_state.messages:
        sender = "You" if message["from"] == "me" else contact["name"]
        side = "me" if message["from"] == "me" else "them"
        st.markdown(f'<div class="message {side}"><div class="bubble">{message.get("text", "")}</div>', unsafe_allow_html=True)
        if message.get("image"):
            st.image(message["image"], use_container_width=False, width=300)
        if message.get("video"):
            st.video(message["video"])
        if message.get("audio"):
            st.audio(message["audio"])
        st.markdown(f'<div class="meta">{sender} · {message["time"]}</div></div>', unsafe_allow_html=True)

    st.divider()
    attachment = st.file_uploader("Attach a photo or video", type=["png", "jpg", "jpeg", "webp", "mp4", "mov", "webm"], key="chat_attachment")
    voice_message = st.audio_input("Record a voice message")
    message_text = st.chat_input("Write a message...")
    if message_text or attachment or voice_message:
        media = attachment.getvalue() if attachment else None
        message = {"from": "me", "text": message_text or "", "time": now()}
        if attachment and attachment.type.startswith("image/"):
            message["image"] = media
        elif attachment and attachment.type.startswith("video/"):
            message["video"] = media
        elif voice_message:
            message["audio"] = voice_message.getvalue()
        st.session_state.messages.append(message)
        st.session_state.conversations[contact["id"]] = st.session_state.messages
        save_shared_message(contact["id"], message)
        if st.session_state.get("send_as_sms"):
            sms_sid, sms_error = send_twilio_sms(st.session_state.get("contact_phone", ""), message_text)
            if sms_error:
                st.error(sms_error)
            else:
                st.success(f"SMS sent successfully. Message ID: {sms_sid}")
        st.rerun()

with col_side:
    st.markdown('<span class="eyebrow">SHARE THREAD</span>', unsafe_allow_html=True)
    st.subheader("Invite one person")
    thread_id = st.session_state.contact["id"]
    contact_phone = st.text_input(
        "Recipient phone number",
        value=contact.get("phone", ""),
        placeholder="+919876543210",
        key="contact_phone",
        help="Use E.164 format. This is used only when SMS sending is enabled.",
    )
    st.session_state.contact["phone"] = contact_phone
    st.checkbox("Also send chat messages as SMS", key="send_as_sms", disabled=not bool(twilio_settings()))
    if not twilio_settings():
        st.caption("Add Twilio secrets to enable SMS delivery.")
    try:
        base_url = st.context.url.split("?")[0]
    except (AttributeError, TypeError):
        base_url = "https://YOUR-APP.streamlit.app/"
    share_url = base_url + "?" + urlencode({"thread": thread_id})
    st.text_input("Share link", value=share_url, label_visibility="collapsed")
    st.caption("Share this link or send them the thread ID.")
    st.markdown(f'<div class="share-box"><div class="mono">THREAD ID</div><strong>{thread_id}</strong></div>', unsafe_allow_html=True)
    st.caption("History and media are retained in this session and cannot be deleted from the app.")
