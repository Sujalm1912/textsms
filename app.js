const STORAGE_KEY = 'smstalks-prototype';

const defaultState = {
  profile: { name: 'You', id: 'LL-739204', photo: '' },
  contact: { name: 'Alex Morgan', id: 'LL-482913', initials: 'AM', photo: '' },
  messages: [
    { from: 'them', text: 'Hey! I made it here. This feels much quieter than a group chat.', time: '10:42 AM' },
    { from: 'me', text: 'That is exactly the idea. Just us, and a little breathing room.', time: '10:44 AM' },
    { from: 'them', text: 'I like it. Send me the plan when you are ready.', time: '10:45 AM' }
  ]
};

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultState;
const $ = (selector) => document.querySelector(selector);

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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
  $('#contactName').textContent = state.contact.name;
  $('#introName').textContent = state.contact.name;
  $('#contactIdLabel').textContent = state.contact.id;
  setAvatar($('#contactAvatar'), state.contact.initials || initials(state.contact.name), state.contact.photo);
  const introAvatar = document.querySelector('.thread-intro .avatar');
  setAvatar(introAvatar, state.contact.initials || initials(state.contact.name), state.contact.photo);
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
  if (!/^LL-\d{6}$/.test(enteredId)) {
    $('#connectFeedback').textContent = 'Use an ID in the format LL-123456.';
    return;
  }
  if (enteredId === state.profile.id) {
    $('#connectFeedback').textContent = 'That is your own ID. Ask someone else for theirs.';
    return;
  }
  state.contact = { name: 'New connection', id: enteredId, initials: 'NC', photo: '' };
  state.messages = [];
  saveState();
  renderContact();
  renderMessages();
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

$('#clearChatButton').addEventListener('click', () => {
  if (!state.messages.length || !window.confirm('Clear this conversation from this browser?')) return;
  state.messages = [];
  saveState();
  renderMessages();
  showToast('Conversation cleared');
});
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
renderContact();
renderMessages();
