# Contributing to ClipTime

Thanks for helping! ClipTime is a plain JavaScript Manifest V3 extension — no build step, no dependencies.

## Run it locally
1. Fork and clone the repo.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `extension/` folder.
3. After editing, press the ↻ reload button on the ClipTime card (and reload any open tabs for content-script changes).

## Tests
```bash
node --test tests/*.test.mjs
```
Text transforms live in `extension/lib/text-tools.js` as pure functions — please add a test in `tests/text-tools.test.mjs` for any new tool.

## Guidelines
- **Privacy first:** ClipTime must not make network requests or collect data. PRs that add analytics, tracking or remote code won't be merged.
- **Both languages:** add every new UI string to `extension/_locales/en/messages.json` **and** `extension/_locales/bn/messages.json`.
- Keep permissions minimal; explain any new permission in `PRIVACY.md` and `store/LISTING.md`.
- Don't bump the version in `manifest.json` — the maintainer does that when releasing.

## Reporting bugs
Open an issue with your Chrome version, OS, the site where it happened and steps to reproduce.

---

### বাংলায়
বাগ পেলে বা ফিচার চাইলে Issue খুলুন। কোড পাঠাতে চাইলে Fork → পরিবর্তন → `node --test tests/*.test.mjs` চালিয়ে → Pull Request দিন। নতুন লেখা যোগ করলে ইংরেজি ও বাংলা দুই `messages.json`-এ দিন। ডেটা বাইরে পাঠায় এমন কোনো পরিবর্তন গ্রহণ করা হবে না।
