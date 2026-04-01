// KeyFlow Popup Script

const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const speedSlider = document.getElementById('speedSlider');
const speedDisplay = document.getElementById('speedDisplay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressCounter = document.getElementById('progressCounter');
const statusMsg = document.getElementById('statusMsg');
const focusDot = document.getElementById('focusDot');
const focusLabel = document.getElementById('focusLabel');
const codeToggle = document.getElementById('codeToggle');
const presetBtns = document.querySelectorAll('.preset-btn');

let isTyping = false;
let isFocused = false;
let codeMode = false;
let currentSpeed = 120;

// ─── Focus check ────────────────────────────────────────────────────────────
async function checkFocus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'CHECK_FOCUS' }, (response) => {
      if (chrome.runtime.lastError) {
        setFocusState(false, null);
        return;
      }
      if (response && response.focused) {
        const label = response.placeholder
          ? `Focused: ${response.element} — "${response.placeholder.slice(0, 28)}${response.placeholder.length > 28 ? '…' : ''}"`
          : `Focused: <${response.element}>`;
        setFocusState(true, label);
      } else {
        setFocusState(false, null);
      }
    });
  } catch (e) {
    setFocusState(false, null);
  }
}

function setFocusState(focused, label) {
  isFocused = focused;
  focusDot.classList.toggle('active', focused);
  focusLabel.className = 'focus-label ' + (focused ? 'active' : 'inactive');
  focusLabel.textContent = focused
    ? label
    : 'Click a text field on the page first';
  updateStartBtn();
}

// ─── Char count ──────────────────────────────────────────────────────────────
inputText.addEventListener('input', () => {
  const len = inputText.value.length;
  charCount.textContent = len.toLocaleString() + ' char' + (len !== 1 ? 's' : '');
  charCount.classList.toggle('has-text', len > 0);
  updateStartBtn();
});

function updateStartBtn() {
  startBtn.disabled = isTyping || !isFocused || inputText.value.trim().length === 0;
}

// ─── Code mode ───────────────────────────────────────────────────────────────
codeToggle.addEventListener('click', () => {
  codeMode = !codeMode;
  codeToggle.classList.toggle('active', codeMode);
  chrome.storage.local.set({ codeMode });
});

// ─── Speed ───────────────────────────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  currentSpeed = parseInt(speedSlider.value);
  speedDisplay.textContent = currentSpeed + ' WPM';
  updatePresetHighlight();
  chrome.storage.local.set({ speed: currentSpeed });
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSpeed = parseInt(btn.dataset.wpm);
    speedSlider.value = currentSpeed;
    speedDisplay.textContent = currentSpeed + ' WPM';
    updatePresetHighlight();
    chrome.storage.local.set({ speed: currentSpeed });
  });
});

function updatePresetHighlight() {
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.wpm) === currentSpeed);
  });
}

// ─── Clear ───────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  inputText.value = '';
  charCount.textContent = '0 chars';
  charCount.classList.remove('has-text');
  updateStartBtn();
  setStatus('', '');
});

// ─── Start typing ────────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const text = inputText.value;
  if (!text || isTyping) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      setStatus('Could not find active tab.', 'error');
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'START_TYPING', text, speed: currentSpeed },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          setStatus('Extension not active on this page. Try refreshing.', 'error');
          return;
        }

        if (!response.success) {
          if (response.error === 'NO_FOCUS') {
            setStatus('No text field focused! Click a field on the page first.', 'error');
            setFocusState(false, null);
          } else {
            setStatus('Error: ' + response.error, 'error');
          }
          return;
        }

        // Started successfully
        setTypingState(true, text.length);
        setStatus('Typing in progress…', 'info');
      }
    );
  } catch (e) {
    setStatus('Failed to start typing.', 'error');
  }
});

// ─── Stop ────────────────────────────────────────────────────────────────────
stopBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'STOP_TYPING' });
    }
  } catch (e) {}
  setTypingState(false);
  setStatus('Typing stopped.', 'warning');
});

// ─── State helpers ───────────────────────────────────────────────────────────
function setTypingState(typing, totalChars) {
  isTyping = typing;
  startBtn.disabled = typing || !isFocused || inputText.value.trim().length === 0;

  stopBtn.classList.toggle('visible', typing);
  progressSection.classList.toggle('visible', typing);
  clearBtn.style.display = typing ? 'none' : '';

  if (typing) {
    progressFill.style.width = '0%';
    progressCounter.textContent = '0 / ' + (totalChars || 0).toLocaleString();
  } else {
    updateStartBtn();
  }
}

function setStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg' + (type ? ' ' + type : '');
}

// ─── Listen for progress/done from content script ────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'TYPING_PROGRESS') {
    progressFill.style.width = message.progress + '%';
    progressCounter.textContent = message.typed.toLocaleString() + ' / ' + message.total.toLocaleString();
  }

  if (message.action === 'TYPING_DONE') {
    progressFill.style.width = '100%';
    setTimeout(() => {
      setTypingState(false);
      progressFill.classList.add('done-flash');
      setTimeout(() => progressFill.classList.remove('done-flash'), 1000);
      setStatus('✓ Done! All text typed successfully.', 'success');
    }, 200);
  }

  if (message.action === 'TYPING_ERROR') {
    setTypingState(false);
    if (message.error && !message.error.includes('cancelled')) {
      setStatus('Stopped: ' + message.error, 'warning');
    }
  }
});

// ─── Restore saved settings ──────────────────────────────────────────────────
chrome.storage.local.get(['speed', 'codeMode'], (result) => {
  if (result.speed) {
    currentSpeed = result.speed;
    speedSlider.value = currentSpeed;
    speedDisplay.textContent = currentSpeed + ' WPM';
    updatePresetHighlight();
  }
  if (result.codeMode !== undefined) {
    codeMode = result.codeMode;
    codeToggle.classList.toggle('active', codeMode);
  }
});

// ─── Poll for focus every time popup opens ───────────────────────────────────
checkFocus();
// Re-check after a short delay (in case content script is still loading)
setTimeout(checkFocus, 500);
