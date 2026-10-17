# Universal Webview Screenshot

> Capture any region of an Obsidian webview and instantly embed it — with a timestamp — into your notes.

![Obsidian plugin version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fadarshkshitij%2Fobsidian-universal-webview-screenshot%2Fmain%2Fmanifest.json&query=version&label=version&color=7c6af7)
![License](https://img.shields.io/github/license/adarshkshitij/obsidian-universal-webview-screenshot?color=7c6af7)
![Desktop only](https://img.shields.io/badge/platform-desktop-blue)

---

## ✨ Why this plugin?

Obsidian's split-pane workflow is great for taking notes while reading or watching content in a webview. Existing screenshot plugins only work on a fixed list of supported sites (YouTube, Coursera, etc.).

**Universal Webview Screenshot works on any website** — Telegram Web, Twitter, internal wikis, course platforms, blog posts with embedded videos — with no per-site adapters.

---

## 🚀 Features

- **Region selection** — draw a box over the exact area you want (e.g. just the video player), then capture it repeatedly with a single hotkey.
- **Works on any site** — no whitelist, no adapters needed.
- **Inserts at cursor position** — the screenshot block is placed exactly where your cursor is in the note, not forced to the bottom.
- **Automatic note insertion** — the screenshot is saved to your vault and a formatted Markdown block (image + timestamp) is appended to your active note instantly.
- **Configurable template** — customise exactly how the block looks using `{{SCREENSHOT}}` and `{{TIMESTAMP}}` placeholders.
- **Two timestamp modes** — elapsed time since your first capture (`00:04`) or current wall-clock time (`11:38:12`).
- **JPEG / PNG support** — choose the format and quality that suits your workflow.

---

## ⌨️ Commands & Hotkeys

| Command | Default hotkey | What it does |
|---|---|---|
| **Define capture region** | `Alt+R` | Shows a drag overlay; draw a box over the area you want to capture. |
| **Capture screenshot of defined region** | `Alt+C` | Captures the saved region and inserts it at your cursor position in the active note. |

Assign or change hotkeys in **Settings → Hotkeys** — search for "webview screenshot".

> Tip: Press **Define capture region** once per session to lock onto the video player, then press **Capture** as many times as you like without redrawing.


---

## 📦 Installation

### Option A — BRAT (beta, available now)

1. Install the [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin.
2. In BRAT's settings, click **Add Beta plugin**.
3. Paste: `https://github.com/adarshkshitij/obsidian-universal-webview-screenshot`
4. Enable the plugin and assign your hotkeys.

### Option B — Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/adarshkshitij/obsidian-universal-webview-screenshot/releases/latest).
2. Copy them into `<vault>/.obsidian/plugins/webview-screenshot/`.
3. Reload Obsidian, enable the plugin, and assign hotkeys.

---

## ⚙️ Settings

| Setting | Default | Description |
|---|---|---|
| Attachments folder | `Attachments` | Vault-relative folder where captured images are saved. |
| Insertion template | `\n- !{{SCREENSHOT}} {{TIMESTAMP}}` | Markdown block appended to the note after each capture. |
| Image format | JPEG | JPEG (smaller) or PNG (lossless). |
| JPEG quality | 0.8 | Compression quality (0.1–1.0). |
| Timestamp mode | Elapsed time | Elapsed time since first capture, or current wall-clock time. |
| Focus note after capture | On | Moves focus to the note so you can type immediately. |

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue first to discuss any significant changes.

---

## 📄 License

[MIT](LICENSE) © 2025 [adarshkshitij](https://github.com/adarshkshitij)
