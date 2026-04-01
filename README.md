<div align="center">

```
██╗  ██╗███████╗██╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗
██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝██║     ██╔═══██╗██║    ██║
█████╔╝ █████╗   ╚████╔╝ █████╗  ██║     ██║   ██║██║ █╗ ██║
██╔═██╗ ██╔══╝    ╚██╔╝  ██╔══╝  ██║     ██║   ██║██║███╗██║
██║  ██╗███████╗   ██║   ██║     ███████╗╚██████╔╝╚███╔███╔╝
╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
```

**Simulate real human typing into any text field on any webpage.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-00e5ff?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-00ff88?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![No Dependencies](https://img.shields.io/badge/Dependencies-None-ff4060?style=flat-square)]()

</div>

---

## What is KeyFlow?

KeyFlow is a Chrome extension that types text into any webpage field **character by character** — exactly like a human would. Instead of an instant paste, every letter, space, tab, and newline is inserted individually at your chosen speed.

It's built for developers, testers, and power users who need text to appear typed, not pasted.

```
You paste this → KeyFlow types it → Looks like a human typed it
```

---

## Features

- **⌨️ True keystroke simulation** — fires real `keydown`, `input`, `keyup`, and `change` events
- **🔢 Perfect indentation** — every tab and whitespace character preserved exactly
- **⚡ Variable speed** — 10 WPM to 1000 WPM, with Slow / Normal / Fast / Turbo presets
- **🧠 Framework-aware** — works with React, Vue, and Angular controlled inputs
- **📝 Universal field support** — `<input>`, `<textarea>`, `contenteditable`, Monaco, CodeMirror
- **🎯 Live focus detection** — shows you exactly which field is targeted before you start
- **⏹️ Stop anytime** — interrupt mid-type with a single click
- **💾 Remembers your settings** — speed and mode persist across sessions

---

## Installation

> Chrome Web Store submission coming soon. Install manually for now.

**1. Download & extract**

Download the latest release zip from the [Releases](../../releases) page and extract it to a permanent folder on your machine.

**2. Enable Developer Mode**

Open Chrome and navigate to `chrome://extensions`, then toggle **Developer mode** on (top-right corner).

**3. Load the extension**

Click **"Load unpacked"** and select the extracted `typer-extension` folder.

**4. Pin it**

Click the puzzle icon in Chrome's toolbar → pin **KeyFlow** for quick access.

---

## Usage

```
1. Navigate to any page with a text field
2. Click inside the field to focus it
3. Open the KeyFlow popup
4. Paste your text
5. Set your speed
6. Hit ▶ Start Typing
```

The green indicator in the popup confirms your target field is locked in. KeyFlow will type directly into it.

---

## Speed Reference

| Preset | WPM | Characters/sec | Best for |
|--------|-----|----------------|----------|
| Slow | 30 | ~2.5 | Demonstrations, screen recordings |
| Normal | 120 | ~10 | Realistic human typing |
| Fast | 300 | ~25 | Quick fills, testing |
| Turbo | 600 | ~50 | Large code blocks, bulk input |
| Custom | 10–1000 | up to ~83 | Full control via slider |

---

## How It Works

Most paste-simulation tools simply set `element.value = text`. This breaks React/Vue/Angular apps and fails on rich editors because those frameworks listen for **events**, not value mutations.

KeyFlow does it differently:

```js
// For every character, KeyFlow:
element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
insertTextAtCursor(element, char);   // inserts at actual cursor position
element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
```

For `contenteditable` elements (Monaco, CodeMirror, Notion, etc.), it uses the Selection API to insert nodes directly into the DOM at the live cursor position.

React's synthetic event system is handled by using native property descriptors:

```js
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
);
nativeSetter.set.call(element, newValue); // triggers React's onChange
```

---

## Supported Field Types

| Field Type | Support |
|------------|---------|
| `<input type="text">` | ✅ Full |
| `<textarea>` | ✅ Full |
| `contenteditable` divs | ✅ Full |
| `role="textbox"` elements | ✅ Full |
| Monaco Editor (VS Code web) | ✅ Full |
| CodeMirror | ✅ Full |
| React controlled inputs | ✅ Full |
| Vue / Angular bindings | ✅ Full |
| `<input type="password">` | ✅ Full |
| `<input type="number">` | ✅ Full |

---

## File Structure

```
typer-extension/
├── manifest.json     # Extension config (Manifest V3)
├── content.js        # Injected into every page — handles actual typing
├── popup.html        # Extension popup UI
├── popup.js          # Popup logic, messaging, state management
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions

| Permission | Why |
|------------|-----|
| `activeTab` | To communicate with the current tab's content script |
| `scripting` | To inject the typing logic into pages |
| `storage` | To remember your speed and mode settings |

KeyFlow does **not** read page content, collect any data, or make any network requests.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/yourusername/keyflow-extension
cd keyflow-extension
# Load the folder as an unpacked extension in chrome://extensions
```

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with zero dependencies. Pure JS, pure events, pure typing.

</div>
