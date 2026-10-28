# ClipTime Privacy Policy

_Last updated: 29 October 2026 (v1.2)_

ClipTime is a Chrome extension that keeps a history of text you copy, offers text-cleaning tools and stores reusable text snippets.

## What data ClipTime handles

- **Copied text** — text you copy or cut on web pages, and (if the setting is on) the text on your clipboard when you open the ClipTime popup. Text copied from password fields is never saved.
- **Page address and title** — the web address and title of the page where you copied something, shown so you know where it came from.
- **Snippets and settings** — text snippets you create and your ClipTime preferences.

## Where it is stored

All data is stored **only on your own computer**, inside Chrome's local extension storage (`chrome.storage.local`). It is not synced and is never sent to the developer or any third party.

ClipTime contains no analytics, no tracking, no advertising and no remote code. Your copied text, history and snippets are never sent anywhere.

## ClipTime Pro license

If you activate ClipTime Pro, your license key is stored locally.

- **Keys bought with bKash/Nagad** (starting with `CT1-`) contain the email address you gave when buying and a license ID. They are checked on your computer with a cryptographic signature, without contacting any server.
- **Keys bought by card/PayPal** are sold by our reseller **Lemon Squeezy** (merchant of record). When you activate, and about every 3 days after that, ClipTime sends the license key, an activation ID and a label such as "ClipTime · Chrome on Windows" to Lemon Squeezy's License API (`api.lemonsqueezy.com`) to check that the key is valid. Lemon Squeezy returns the license status and the buyer's name and email, which are kept locally to show who the license belongs to. Removing the key also tells Lemon Squeezy to free that activation. Payment details are handled entirely by Lemon Squeezy under its own privacy policy; ClipTime never sees them.

For `CT1-` keys, only when such a license is installed, ClipTime downloads a public list of cancelled license IDs once a day from the developer's GitHub repository. This request sends no personal data (not your email, history or license key). Users of the free version make no network requests at all.

## How long it is kept

History items are deleted automatically after the period you choose (30 days by default). Pinned items and snippets are kept until you delete them. You can delete individual items, clear the history, or delete everything at any time from the Settings tab. Uninstalling the extension removes all of its data.

## Sites you exclude

You can list websites (for example your bank) in Settings → "Never save from these sites". Nothing copied on those sites is saved.

## Permissions and why they are needed

| Permission | Why |
|---|---|
| Read and change data on all websites (content script) | To notice when you copy text on a page, and to insert snippets into text boxes. Nothing on the page is read except the text you copy and the text you type before a snippet shortcut. |
| clipboardRead / clipboardWrite | To save what's on the clipboard when you open the popup, and to copy items back. |
| storage, unlimitedStorage | To keep your history and snippets on your computer. |
| contextMenus | Right-click options like "Copy without blank lines" and "Insert snippet". |
| alarms | To delete expired history items periodically. |
| offscreen | Required by Chrome to write to the clipboard from the right-click menu. |
| scripting | To start working on tabs that were already open when ClipTime was installed. |

## Data sale and use

ClipTime does not sell, transfer or use your data for any purpose other than providing its features to you. It does not use data for advertising, credit-worthiness or lending.

## Contact

Questions or concerns: open an issue on the project's GitHub page.
