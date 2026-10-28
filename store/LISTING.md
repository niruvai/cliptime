# Chrome Web Store — copy & paste these into the Developer Dashboard

## Store listing tab

**Name:** ClipTime – Clipboard History & Text Tools
**Category:** Productivity → Tools (or "Workflow & Planning")
**Language:** English (add Bengali as a second language if you like)

### Short description (max 132 chars)
Clipboard history saved for 30 days, one-click blank-line remover, case converter and reusable text snippets. 100% local.

### Detailed description (English)

ClipTime remembers everything you copy in Chrome — even after you restart Windows or Mac — and gives you one-click tools to clean it up.

📋 CLIPBOARD HISTORY
• Every text you copy or cut in Chrome is saved automatically
• Kept for 30 days (choose 1 day up to forever)
• Pin important items so they never expire
• Instant search, keyboard navigation (↑ ↓ Enter)
• Also saves text copied in other apps (Word, Notepad…) when you open ClipTime
• Password fields are never recorded; exclude any site (e.g. your bank)

🧹 ONE-CLICK CLEAN
• Remove blank lines — from the popup, the history list or the right-click menu
• Smart clean, remove extra spaces, trim, join lines, strip HTML

🔠 CASE CONVERTER
UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE

✍️ SNIPPETS
• Save replies, addresses, signatures
• Type a shortcut like ;sig in any text box to insert it (works in Gmail, Facebook, WhatsApp Web…)
• Or right-click → ClipTime: insert
• Placeholders {date} {time}

🔒 PRIVATE BY DESIGN
Your data never leaves your computer. No account, no tracking, no network requests. Open source on GitHub.

💯 100% FREE & OPEN SOURCE
Every feature is free for everyone — no account, no ads, no paid plan. Source code: https://github.com/niruvai/cliptime

Shortcut: Alt+Shift+V opens ClipTime.

### বিস্তারিত বিবরণ (বাংলা)

ClipTime Chrome-এ আপনি যা কপি করেন সব মনে রাখে — কম্পিউটার বন্ধ করে চালু করলেও — আর এক ক্লিকে লেখা পরিষ্কার করার টুল দেয়।

📋 ক্লিপবোর্ড হিস্ট্রি — কপি/কাট করা সব লেখা ৩০ দিন সেভ থাকে, পিন করলে কখনো মুছবে না, দ্রুত সার্চ।
🧹 এক ক্লিকে ফাঁকা লাইন সরান, বাড়তি স্পেস সরান, HTML ট্যাগ সরান।
🔠 কেস কনভার্টার — UPPERCASE, lowercase, Title Case, camelCase, snake_case ইত্যাদি; ইংরেজি ↔ বাংলা সংখ্যা।
✍️ স্নিপেট — যেকোনো টেক্সট বক্সে ;sig লিখলেই আপনার সিগনেচার বসে যাবে।
🔒 সব ডেটা আপনার কম্পিউটারেই থাকে, কোথাও পাঠানো হয় না।
💯 সম্পূর্ণ ফ্রি ও ওপেন সোর্স — কোনো অ্যাকাউন্ট, বিজ্ঞাপন বা পেইড প্ল্যান নেই।

### Graphics
- Icon: `extension/icons/icon128.png`
- Screenshots (1280×800): `store/screenshot-1-history.png`, `store/screenshot-2-tools.png`, `store/screenshot-3-snippets.png`
- Small promo tile (440×280): `store/promo-small-440x280.png`

---

## Privacy tab

**Single purpose description:**
ClipTime saves the text a user copies so they can find and reuse it later, and provides tools to clean and reformat that text and to insert saved snippets.

**Permission justifications:**

| Permission | Justification |
|---|---|
| Host permission (`<all_urls>`) / content scripts | Needed to detect when the user copies text on any web page (to save it to their history) and to insert the user's saved snippets into text boxes on any site. Only copied text and the characters typed just before a snippet shortcut are read. |
| clipboardRead | When the user opens the popup, reads the current clipboard text so copies made in other applications are also saved to their history. Can be turned off in settings. |
| clipboardWrite | Copies a history item or transformed text back to the clipboard when the user clicks it. |
| storage | Stores clipboard history, snippets and settings locally. |
| unlimitedStorage | Clipboard history for 30 days can exceed the default 10 MB local storage quota. |
| contextMenus | Right-click actions: "Copy without blank lines", case conversion, "Save as snippet", "Insert snippet". |
| alarms | Periodically deletes history items older than the user's retention period (default 30 days). |
| offscreen | Chrome requires an offscreen document to write to the clipboard from a context-menu action. |
| scripting | After install/update, injects the content script into tabs that were already open so copying works without reloading them. |

**Remote code:** No, I am not using remote code. (ClipTime makes no network requests at all.)

**In-app purchases:** None — leave "contains in-app purchases" unchecked.

**Data usage — check these boxes:**
- ☑ Website content (copied text) — handled only to provide the feature, stored locally, never transmitted
- ☑ Web history (URL/title of the page where text was copied) — stored locally, never transmitted

And certify:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:**
`https://github.com/niruvai/cliptime/blob/main/PRIVACY.md`
