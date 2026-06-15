# Fluentia

**Translate with clarity** — a modern, responsive language translator with glassmorphism UI, built with **HTML**, **CSS**, and **vanilla JavaScript**. Translate instantly, manage history, toggle dark mode, and more.

![Fluentia](assets/icons/logo.svg)

## Features

- **Instant translation** with loading states and error handling
- **Languages:** English, Hindi, French, Spanish, German + Auto Detect
- **Swap languages** with smooth animation
- **Copy**, **download (.txt)**, and **text-to-speech** for results
- **Translation history** stored in `localStorage`
- **Dark / light mode** with saved preference
- **Character counter** (max 5,000)
- **Keyboard shortcuts:** `Enter` to translate, `Ctrl+Shift+C` to copy
- **Toast notifications** for feedback
- **Fully responsive** — two-column desktop, stacked mobile

## Quick Start (VS Code / Cursor)

### Option A — Live Server (recommended)

1. Open this folder in **VS Code** or **Cursor**.
2. Install **Live Server** (VS Code will suggest it via `.vscode/extensions.json`).
3. Right-click `index.html` → **Open with Live Server**.
4. Type text, choose languages, and click **Translate**.

### Option B — Terminal

```bash
npm start
```

Then open [http://localhost:5500](http://localhost:5500).

No build step required.

## Project Structure

```
language-translator/
├── index.html          # Main markup
├── style.css           # Glassmorphism UI & themes
├── script.js           # App logic & API integration
├── config.js           # API keys & provider settings
├── assets/
│   ├── icons/          # SVG icons
│   └── images/
└── README.md
```

## API Configuration

API credentials live in **`config.js`** only. Never commit real keys to public repositories.

### Option 1: MyMemory (default — works immediately)

The app ships with `provider: "mymemory"`. No API key is required. Ideal for local development and demos.

**Limits:** Free tier has daily/request limits; not for high-volume production.

```js
window.CONFIG = {
  provider: "mymemory",
  // ...
};
```

### Option 2: Microsoft Azure Translator (recommended for production)

1. Create an [Azure AI Translator](https://azure.microsoft.com/products/ai-services/ai-translator) resource.
2. Copy the **subscription key** and **region** (e.g. `eastus`).
3. Update `config.js`:

```js
window.CONFIG = {
  provider: "microsoft",
  microsoft: {
    subscriptionKey: "YOUR_SUBSCRIPTION_KEY",
    region: "eastus",
    endpoint: "https://api.cognitive.microsofttranslator.com",
  },
  // ...
};
```

**CORS:** Azure Translator supports browser calls from localhost when using a valid key. For production, consider a backend proxy to hide the key.

### Option 3: Google Cloud Translation API

1. Enable the [Cloud Translation API](https://cloud.google.com/translate/docs/setup) in Google Cloud Console.
2. Create an API key (restrict by HTTP referrer in production).
3. Update `config.js`:

```js
window.CONFIG = {
  provider: "google",
  google: {
    apiKey: "YOUR_API_KEY",
    endpoint: "https://translation.googleapis.com/language/translate/v2",
  },
  // ...
};
```

**Note:** Restrict your API key in Google Cloud Console. Exposing keys in front-end code is acceptable only for learning; use a server proxy for production apps.

## Auto Language Detection

| Provider   | Detection method                          |
|-----------|--------------------------------------------|
| Microsoft | Azure `/detect` endpoint                   |
| Google    | Cloud Translation detect API               |
| MyMemory  | Unicode/heuristic fallback in `script.js`  |

When **Auto Detect** is selected, the detected language is shown in a toast before translation.

## Keyboard Shortcuts

| Shortcut              | Action              |
|-----------------------|---------------------|
| `Enter` (in input)    | Translate           |
| `Shift + Enter`       | New line in input   |
| `Ctrl + C` (output focused) | Copy translation |
| `Ctrl + Shift + C`    | Copy translation (anywhere) |

## Browser Support

- Chrome, Edge, Firefox, Safari (recent versions)
- Text-to-speech uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (availability varies by browser/OS)

## Customization

| Setting            | File        | Key / variable      |
|--------------------|------------|---------------------|
| Max characters     | `config.js`| `maxCharacters`     |
| History limit      | `config.js`| `historyLimit`      |
| Active API         | `config.js`| `provider`          |
| Colors & theme     | `style.css`| `:root` CSS variables |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ERR_EMPTY_RESPONSE` on localhost:5500 | A **stale or crashed** process is on port 5500. Kill it (see below), then restart with `npm start` |
| Translation fails | Check `config.js` provider and API key |
| CORS error (Microsoft/Google) | Use MyMemory for local dev, or add a backend proxy |
| MyMemory quota exceeded | Switch to Microsoft/Google, or wait for quota reset |
| Clipboard copy fails | Use HTTPS or localhost; grant clipboard permission |
| TTS wrong language | Target language drives speech; ensure correct target is selected |

### Fix `ERR_EMPTY_RESPONSE` (port 5500)

1. Close other servers (old terminals, Live Server **Go Live**).
2. In PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5500 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

3. From the project folder: `npm start`
4. Open **http://127.0.0.1:5500** (not only `localhost` if issues persist).

## Security

- Keep API keys in `config.js` and add `config.js` to `.gitignore` if you store real secrets.
- For production, proxy API calls through your own backend so keys are never exposed in the browser.

## License

MIT — free to use and modify for personal and educational projects.
