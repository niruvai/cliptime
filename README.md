# ClipTime – Clipboard History & Text Tools

**সম্পূর্ণ ফ্রি ও ওপেন সোর্স Chrome এক্সটেনশন।** Chrome-এ যা কপি করবেন সব সেভ থাকবে — কম্পিউটার (Windows বা Mac) বন্ধ করে আবার চালু করলেও। সাথে এক ক্লিকে ফাঁকা লাইন সরানো, কেস কনভার্টার আর রিইউজেবল স্নিপেট। কোনো অ্যাকাউন্ট, বিজ্ঞাপন বা পেইড প্ল্যান নেই।

*A free, open-source Chrome extension: clipboard history that survives restarts, a one-click blank-line remover, a case converter and reusable text snippets. No account, no ads, no network requests.*

![ClipTime](store/screenshot-1-history.png)

## ফিচার

| | |
|---|---|
| 📋 **ক্লিপবোর্ড হিস্ট্রি** | যেকোনো সাইটে কপি/কাট (Ctrl+C, রাইট-ক্লিক, সাইটের "Copy" বাটন) — সব সেভ হয়; সার্চ করা যায় |
| 💾 **রিস্টার্টেও থাকে** | ডিফল্টে ৩০ দিন; ১ দিন থেকে সবসময় পর্যন্ত বাছা যায়; ১০,০০০ আইটেম পর্যন্ত |
| 📌 **পিন** | পিন করা আইটেম কখনো মুছবে না |
| 🧹 **এক ক্লিকে পরিষ্কার** | ফাঁকা লাইন সরানো, বাড়তি স্পেস, এক লাইনে জোড়া, HTML সরানো — পপআপ, হিস্ট্রি আইটেম আর রাইট-ক্লিক মেনু থেকে |
| 🔠 **টেক্সট ফরম্যাটার** | UPPER, lower, Title, Sentence, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, সাজানো, নম্বর, ডুপ্লিকেট সরানো, ১২৩ ↔ 123 |
| ✍️ **স্নিপেট** | যেকোনো টেক্সট বক্সে `;sig`-এর মতো শর্টকাট লিখলেই বসে যায়; `{date}` `{time}` প্লেসহোল্ডার |
| 🖥️ **অন্য অ্যাপের কপি** | Word/Notepad থেকে কপি করলে পপআপ খোলার সময় সেটাও সেভ হয় |
| 💽 **ব্যাকআপ** | Export / Import (JSON) |
| 🔒 **প্রাইভেসি** | পাসওয়ার্ড ফিল্ড বাদ, নির্দিষ্ট সাইট বাদ, কোনো নেটওয়ার্ক রিকোয়েস্ট নেই |
| 🌐 **বাংলা + ইংরেজি** | ব্রাউজারের ভাষা অনুযায়ী |
| ⌨️ **শর্টকাট** | `Alt+Shift+V` পপআপ খোলে; ↑ ↓ বাছুন, Enter কপি, Shift+Enter ফাঁকা লাইন ছাড়া কপি |

## ইনস্টল

**Chrome Web Store থেকে:** (পাবলিশ হলে লিংক এখানে বসবে)

**নিজে ইনস্টল (ডেভেলপার মোড):**
1. [Releases](https://github.com/niruvai/cliptime/releases/latest) থেকে `cliptime-vX.Y.Z.zip` নামিয়ে আনজিপ করুন — অথবা রিপো ক্লোন করুন।
2. `chrome://extensions` → ডান কোণায় **Developer mode** চালু।
3. **Load unpacked** → আনজিপ করা ফোল্ডার (বা রিপোর `extension` ফোল্ডার) বাছুন।

## ব্যবহার

- কপি করুন → হিস্ট্রিতে যায়। আইটেমে ক্লিক = আবার কপি, ডাবল-ক্লিক = পুরো লেখা দেখা।
- আইটেমে মাউস রাখলে: ফাঁকা লাইন ছাড়া কপি · টুলসে খুলুন · মুছুন · পিন।
- রাইট-ক্লিক: সিলেক্ট করা লেখা → ফাঁকা লাইন ছাড়া / UPPERCASE কপি, স্নিপেট হিসেবে রাখা; টেক্সট বক্সে → স্নিপেট বা সাম্প্রতিক কপি বসানো।

## অবদান রাখুন (Contributing)

ভুল পেলে বা নতুন ফিচার চাইলে [Issue খুলুন](https://github.com/niruvai/cliptime/issues)। কোড উন্নত করতে চাইলে [CONTRIBUTING.md](CONTRIBUTING.md) দেখুন — Pull Request স্বাগতম।

```bash
node --test tests/*.test.mjs   # টেক্সট টুলের টেস্ট
```

## প্রাইভেসি

সব ডেটা শুধু আপনার কম্পিউটারের Chrome-এ (`chrome.storage.local`) থাকে। ClipTime কোথাও কিছু পাঠায় না। বিস্তারিত: [PRIVACY.md](PRIVACY.md)

## সীমাবদ্ধতা

- `chrome://` পেজ, Chrome Web Store ও PDF ভিউয়ারে এক্সটেনশন চলে না — সেখানকার কপি পপআপ খোলার সময় ক্লিপবোর্ড থেকে সেভ হয়।
- শুধু টেক্সট সেভ হয়, ছবি নয়। ডেটা ঐ কম্পিউটারের Chrome প্রোফাইলেই থাকে।

---

## রক্ষণাবেক্ষণকারীর জন্য (Maintainer notes)

### নতুন ভার্সন রিলিজ
- GitHub → **Actions → Test & Release → Run workflow** → `patch` / `minor` → Run, **অথবা**
- `extension/manifest.json`-এ `"version"` বাড়িয়ে `main`-এ পুশ।

Workflow টেস্ট চালায় → zip বানায় → GitHub Release তৈরি করে → (secrets থাকলে) Chrome Web Store-এ আপলোড করে রিভিউতে জমা দেয়। রিভিউ পাস হলে সব ইউজারের Chrome নিজে থেকে আপডেট নেয়।

### প্রথমবার Web Store-এ পাবলিশ (হাতে, একবারই)
1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item** → Releases থেকে zip আপলোড।
2. Store listing ও Privacy ট্যাব `store/LISTING.md` থেকে পূরণ; ছবি `store/` ফোল্ডারে।
3. Submit for review। পরে Extension ID ও Publisher ID (Publisher → Settings) লিখে রাখুন।

### Web Store-এ অটো-আপডেট চালু (একবারের সেটআপ)
1. [Google Cloud Console](https://console.cloud.google.com/) → নতুন প্রজেক্ট → "Chrome Web Store API" Enable।
2. OAuth consent screen → External → নিজের ইমেইল test user → তারপর **Publish app** (In production)।
3. Credentials → OAuth client ID (Web application) → redirect URI `https://developers.google.com/oauthplayground`।
4. [OAuth Playground](https://developers.google.com/oauthplayground) → ⚙ → নিজের Client ID/secret → scope `https://www.googleapis.com/auth/chromewebstore` → Authorize → Exchange → **Refresh token**।
5. রিপো → Settings → Secrets and variables → Actions-এ রাখুন: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`।

### ওয়েবসাইট (GitHub Pages)
রিপো → **Settings → Pages** → Branch `main`, ফোল্ডার `/docs` → Save → `https://niruvai.github.io/cliptime/`। Web Store-এ পাবলিশ হলে `docs/index.html`-এ `CHROME_STORE_URL` বদলে দিন।

## ফোল্ডার কাঠামো

```
cliptime/
├── extension/                 ← Chrome-এ যা লোড হয়
│   ├── manifest.json
│   ├── background.js          ← হিস্ট্রি সেভ, মেয়াদ শেষে মোছা, রাইট-ক্লিক মেনু
│   ├── content.js             ← পেজে কপি ধরা, স্নিপেট শর্টকাট
│   ├── inject-main.js         ← সাইটের "Copy" বাটন (navigator.clipboard) ধরা
│   ├── offscreen.html/js      ← মেনু থেকে ক্লিপবোর্ডে লেখা
│   ├── popup.html/css/js      ← UI
│   ├── lib/text-tools.js      ← সব টেক্সট টুল
│   ├── _locales/en, bn
│   └── icons/
├── tests/                     ← node --test
├── docs/                      ← GitHub Pages ওয়েবসাইট
├── store/                     ← Web Store-এর লেখা ও ছবি
├── .github/workflows/         ← টেস্ট → zip → Release → Web Store
├── CONTRIBUTING.md
├── PRIVACY.md
└── LICENSE (MIT)
```

## লাইসেন্স

[MIT](LICENSE) — যে কেউ ব্যবহার, পরিবর্তন ও বিতরণ করতে পারবেন।
