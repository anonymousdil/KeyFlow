// KeyFlow Content Script
// Handles actual typing simulation into focused elements

let typingSession = null;

function getActiveElement() {
  const el = document.activeElement;
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  const isEditable =
    tag === 'textarea' ||
    (tag === 'input' && ['text', 'search', 'email', 'password', 'url', 'tel', 'number', ''].includes((el.type || '').toLowerCase())) ||
    el.isContentEditable ||
    el.getAttribute('role') === 'textbox' ||
    el.getAttribute('contenteditable') === 'true';

  return isEditable ? el : null;
}

function setNativeValue(element, value) {
  // Works for React-controlled inputs
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');

  if (element.tagName.toLowerCase() === 'input' && nativeInputValueSetter) {
    nativeInputValueSetter.set.call(element, value);
  } else if (element.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.set.call(element, value);
  } else {
    element.value = value;
  }
}

function insertTextAtCursor(element, char) {
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    // For contenteditable elements (like Monaco, CodeMirror, rich editors)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      if (char === '\n') {
        // Insert a real line break
        const br = document.createElement('br');
        range.insertNode(br);
        // Move cursor after the br
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        const textNode = document.createTextNode(char);
        range.insertNode(textNode);
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    // Fire input event
    element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: char }));
    return;
  }

  // For standard input/textarea
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const currentValue = element.value;

  const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
  setNativeValue(element, newValue);

  // Move cursor forward
  const newPos = start + char.length;
  element.selectionStart = newPos;
  element.selectionEnd = newPos;

  // Fire all necessary events to trigger React/Vue/Angular reactivity
  element.dispatchEvent(new KeyboardEvent('keydown', { key: char === '\n' ? 'Enter' : char, bubbles: true }));
  element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: char }));
  element.dispatchEvent(new KeyboardEvent('keyup', { key: char === '\n' ? 'Enter' : char, bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function typeText(targetElement, text, intervalMs, onProgress, onDone, onError) {
  const chars = Array.from(text); // Handles Unicode/emoji correctly
  let index = 0;

  // Focus the element
  targetElement.focus();

  // Small delay to let focus settle
  await new Promise(r => setTimeout(r, 80));

  if (!typingSession || !typingSession.active) {
    onError('Session cancelled');
    return;
  }

  function typeNext() {
    if (!typingSession || !typingSession.active) {
      onError('Typing stopped by user');
      return;
    }

    if (index >= chars.length) {
      onDone();
      return;
    }

    const char = chars[index];
    index++;

    try {
      insertTextAtCursor(targetElement, char);
    } catch (e) {
      console.warn('KeyFlow: Error inserting char', char, e);
    }

    const progress = Math.round((index / chars.length) * 100);
    onProgress(progress, index, chars.length);

    typingSession.timeoutId = setTimeout(typeNext, intervalMs);
  }

  typeNext();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_TYPING') {
    const { text, speed } = message;

    // WPM → chars per minute → ms per char
    // speed is in WPM, average 5 chars per word
    const msPerChar = Math.round(60000 / (speed * 5));

    const target = getActiveElement();

    if (!target) {
      sendResponse({ success: false, error: 'NO_FOCUS' });
      return true;
    }

    // Kill any existing session
    if (typingSession && typingSession.active) {
      clearTimeout(typingSession.timeoutId);
      typingSession.active = false;
    }

    typingSession = { active: true, timeoutId: null };

    typeText(
      target,
      text,
      msPerChar,
      (progress, typed, total) => {
        chrome.runtime.sendMessage({ action: 'TYPING_PROGRESS', progress, typed, total }).catch(() => {});
      },
      () => {
        typingSession = null;
        chrome.runtime.sendMessage({ action: 'TYPING_DONE' }).catch(() => {});
      },
      (err) => {
        typingSession = null;
        chrome.runtime.sendMessage({ action: 'TYPING_ERROR', error: err }).catch(() => {});
      }
    );

    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'STOP_TYPING') {
    if (typingSession) {
      clearTimeout(typingSession.timeoutId);
      typingSession.active = false;
      typingSession = null;
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'CHECK_FOCUS') {
    const el = getActiveElement();
    if (el) {
      const tag = el.tagName.toLowerCase();
      const placeholder = el.placeholder || el.getAttribute('aria-label') || el.getAttribute('aria-placeholder') || '';
      sendResponse({ focused: true, element: tag, placeholder });
    } else {
      sendResponse({ focused: false });
    }
    return true;
  }
});
