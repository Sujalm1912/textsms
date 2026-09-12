const STORAGE_KEY = 'smstalks-prototype';

function makeId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
  return `SMS-${suffix}`;
}

const defaultState = {
  profile: { name: 'You', id: makeId(), photo: '' },
  contact: { name: 'Alex Morgan', id: 'SMS-4A2L9Q', initials: 'AM', photo: '', lastSeen: 'online' },
  view: 'start',
  contacts: [{ name: 'Alex Morgan', id: 'SMS-4A2L9Q', initials: 'AM', photo: '', lastSeen: 'online' }],
  messages: [
    { from: 'them', text: 'Hey! I made it here. This feels much quieter than a group chat.', time: '10:42 AM' },
    { from: 'me', text: 'That is exactly the idea. Just us, and a little breathing room.', time: '10:44 AM' },
    { from: 'them', text: 'I like it. Send me the plan when you are ready.', time: '10:45 AM' }
  ]
};

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultState;
const $ = (selector) => document.querySelector(selector);

if (!state.view) state.view = 'start';
if (!Array.isArray(state.contacts)) state.contacts = state.contact ? [state.contact] : [];
if (!state.conversations) state.conversations = state.contact ? { [state.contact.id]: state.messages || [] } : {};
if (state.contact && !state.contact.lastSeen) state.contact.lastSeen = 'last seen recently';
state.contacts = state.contacts.map((contact) => ({ ...contact, lastSeen: contact.lastSeen || 'last seen recently' }));
state.messages = state.contact ? (state.conversations[state.contact.id] || []) : [];

if (/^LL-\d{6}$/.test(state.profile.id)) {
  state.profile.id = makeId();
  saveState();
}

function saveState() {
  if (state.contact) state.conversations[state.contact.id] = state.messages;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function initials(name) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
function formatTime() { return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date()); }

function setAvatar(element, fallback, photo) {
  element.textContent = photo ? '' : fallback;
  element.style.backgroundImage = photo ? `url(${photo})` : '';
}

function renderProfile() {
  $('#profileName').textContent = state.profile.name;
  $('#profileId').textContent = state.profile.id;
  setAvatar($('#profileAvatarButton'), initials(state.profile.name), state.profile.photo);
}

function renderContact() {
  if (!state.contact) return;
  $('#contactName').textContent = state.contact.name;
  $('#introName').textContent = state.contact.name;
  $('#contactIdLabel').textContent = state.contact.id;
  $('#contactPresence').textContent = `● ${state.contact.lastSeen || 'last seen recently'}`;
  setAvatar($('#contactAvatar'), state.contact.initials || initials(state.contact.name), state.contact.photo);
  const introAvatar = document.querySelector('.thread-intro .avatar');
  setAvatar(introAvatar, state.contact.initials || initials(state.contact.name), state.contact.photo);
}

function renderInboxList(selector) {
  const list = $(selector);
  list.innerHTML = '';
  state.contacts.forEach((contact) => {
    const button = document.createElement('button');
    button.className = `inbox-item${state.contact?.id === contact.id && state.view === 'chat' ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.contactId = contact.id;
    const avatar = document.createElement('span');
    avatar.className = 'avatar inbox-avatar';
    setAvatar(avatar, contact.initials || initials(contact.name), contact.photo);
    const details = document.createElement('span');
    details.className = 'inbox-details';
    details.innerHTML = `<strong></strong><span class="mono"></span><span class="inbox-last-seen"></span>`;
    details.querySelector('strong').textContent = contact.name;
    details.querySelector('.mono').textContent = contact.id;
    details.querySelector('.inbox-last-seen').textContent = contact.lastSeen || 'last seen recently';
    button.append(avatar, details);
    list.appendChild(button);
  });
}

function renderInbox() {
  $('#inboxCount').textContent = state.contacts.length;
  $('#inboxEmpty').hidden = state.contacts.length > 0;
  $('#inboxPageEmpty').hidden = state.contacts.length > 0;
  renderInboxList('#inboxList');
  renderInboxList('#inboxPageList');
}

function toggleViews() {
  const chatMode = state.view === 'chat';
  $('#startScreen').hidden = state.view !== 'start';
  $('#inboxScreen').hidden = state.view !== 'inbox';
  $('#chatView').hidden = !chatMode;
  $('.inbox-card').hidden = state.view === 'start';
  $('#appShell').classList.toggle('chat-mode', chatMode);
}

function openContact(contact) {
  state.contact = contact;
  state.messages = state.conversations[contact.id] || [];
  state.view = 'chat';
  saveState();
  window.location.hash = `chat/${encodeURIComponent(contact.id)}`;
}

function routeFromUrl() {
  const match = window.location.hash.match(/^#chat\/(.+)$/);
  if (match) {
    const contact = state.contacts.find((entry) => entry.id === decodeURIComponent(match[1]));
    if (!contact) {
      window.location.hash = '#inbox';
      return;
    }
    state.contact = contact;
    state.messages = state.conversations[contact.id] || [];
    state.view = 'chat';
    renderInbox();
    renderContact();
    renderMessages();
    toggleViews();
    return;
  }
  state.view = window.location.hash === '#inbox' ? 'inbox' : 'start';
  renderInbox();
  toggleViews();
}

function renderMessages() {
  const list = $('#messageList');
  list.innerHTML = '';
  state.messages.forEach((message) => {
    const item = document.createElement('article');
    item.className = `message ${message.from}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (message.text) {
      const text = document.createElement('div');
      text.textContent = message.text;
      bubble.appendChild(text);
    }
    if (message.mediaType === 'image') {
      const image = document.createElement('img');
      image.src = message.media;
      image.alt = 'Shared image';
      image.style.cssText = 'display:block;max-width:280px;border-radius:9px;margin-top:4px;';
      bubble.appendChild(image);
    }
    if (message.mediaType === 'video') {
      const video = document.createElement('video');
      video.src = message.media;
      video.controls = true;
      video.style.cssText = 'display:block;max-width:300px;border-radius:9px;margin-top:4px;';
      bubble.appendChild(video);
    }
    if (message.mediaType === 'audio') {
      const audio = document.createElement('audio');
      audio.src = message.media;
      audio.controls = true;
      audio.style.cssText = 'display:block;max-width:280px;margin-top:4px;';
      bubble.appendChild(audio);
    }
    item.appendChild(bubble);
    const meta = document.createElement('span');
    meta.className = 'message-meta';
    meta.textContent = `${message.from === 'me' ? 'You' : state.contact.name} · ${message.time}`;
    item.appendChild(meta);
    list.appendChild(item);
  });
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
}

function showToast(text) {
  const toast = $('#toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function openProfileDialog() {
  $('#nameInput').value = state.profile.name;
  $('#photoInput').value = '';
  $('#photoFeedback').textContent = '';
  $('#profileDialog').showModal();
}

$('#editProfileButton').addEventListener('click', openProfileDialog);
$('#profileAvatarButton').addEventListener('click', openProfileDialog);
$('#copyIdButton').addEventListener('click', async () => {
  await navigator.clipboard?.writeText(state.profile.id);
  showToast('Your unique ID was copied');
});

$('#photoInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1_500_000) {
    event.target.value = '';
    $('#photoFeedback').textContent = 'Choose an image smaller than 1.5 MB.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { state.pendingPhoto = reader.result; $('#photoFeedback').textContent = 'New picture ready to save.'; };
  reader.readAsDataURL(file);
});

$('#profileForm').addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'default') return;
  event.preventDefault();
  const name = $('#nameInput').value.trim();
  if (!name) return;
  state.profile.name = name;
  if (state.pendingPhoto) state.profile.photo = state.pendingPhoto;
  delete state.pendingPhoto;
  saveState();
  renderProfile();
  $('#profileDialog').close();
  showToast('Profile updated');
});

$('#connectForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const enteredId = $('#contactId').value.trim().toUpperCase();
  if (!/^SMS-[A-Z0-9]{6}$/.test(enteredId)) {
    $('#connectFeedback').textContent = 'Use an ID in the format SMS-7K4P2Q.';
    return;
  }
  if (enteredId === state.profile.id) {
    $('#connectFeedback').textContent = 'That is your own ID. Ask someone else for theirs.';
    return;
  }
  state.contact = { name: 'New connection', id: enteredId, initials: 'NC', photo: '', lastSeen: 'last seen recently' };
  state.contacts = [state.contact, ...state.contacts.filter((contact) => contact.id !== enteredId)];
  state.view = 'inbox';
  state.messages = state.conversations[enteredId] || [];
  saveState();
  renderInbox();
  renderContact();
  renderMessages();
  toggleViews();
  window.location.hash = '#inbox';
  $('#connectFeedback').textContent = '';
  $('#contactId').value = '';
  showToast('Private thread opened');
});

function addMessage(message) {
  state.messages.push({ from: 'me', time: formatTime(), ...message });
  saveState();
  renderMessages();
}

$('#messageForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#messageInput');
  const text = input.value.trim();
  if (!text) return;
  addMessage({ text });
  input.value = '';
  input.style.height = 'auto';
});

$('#messageInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('#messageForm').requestSubmit();
  }
});

$('#messageInput').addEventListener('input', (event) => {
  event.target.style.height = 'auto';
  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
});

function handleInboxClick(event) {
  const item = event.target.closest('.inbox-item');
  if (!item) return;
  const contact = state.contacts.find((entry) => entry.id === item.dataset.contactId);
  if (!contact) return;
  openContact(contact);
}

$('#inboxList').addEventListener('click', handleInboxClick);
$('#inboxPageList').addEventListener('click', handleInboxClick);

$('#backToInbox').addEventListener('click', () => { window.location.hash = '#inbox'; });
window.addEventListener('hashchange', routeFromUrl);
$('#attachButton').addEventListener('click', () => $('#mediaInput').click());
$('#mediaInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    addMessage({ text: '', media: reader.result, mediaType: file.type.startsWith('image/') ? 'image' : 'video' });
    event.target.value = '';
  };
  reader.readAsDataURL(file);
});

let recorder;
let recordingChunks = [];
$('#voiceButton').addEventListener('click', async () => {
  if (recorder?.state === 'recording') {
    recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToast('Voice recording is not supported in this browser');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recordingChunks = [];
    recorder.ondataavailable = (event) => recordingChunks.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const reader = new FileReader();
      reader.onload = () => addMessage({ text: '', media: reader.result, mediaType: 'audio' });
      reader.readAsDataURL(new Blob(recordingChunks, { type: recorder.mimeType || 'audio/webm' }));
      $('#voiceButton').classList.remove('is-recording');
      $('#voiceButton').textContent = '◉';
    };
    recorder.start();
    $('#voiceButton').classList.add('is-recording');
    $('#voiceButton').textContent = '■';
    showToast('Recording voice message... click again to stop');
  } catch (error) {
    showToast('Microphone permission was not granted');
  }
});
$('#moreButton').addEventListener('click', () => showToast('More thread controls are coming soon'));

renderProfile();
renderInbox();
renderContact();
renderMessages();
routeFromUrl();
