# 4 P's of Loss Diagnostic

A store-walk diagnostic tool (People, Place, Process, Product) for rating loss-prevention
controls, recording observations and generating a shareable report.

This is a rebuild of the original Netlify version with three additions:

- A **Brand** dropdown (Rebel Sport, Supercheap Auto, BCF, Macpac) and an **email** field in
  the Store Context section.
- A **Download PDF** button so the finished report can be saved straight to a phone.
- A **Submit & Email Me a Copy** button that saves every submission to a shared Google Sheet
  (so the team has a central, searchable record) and emails the PDF to whoever filled it in.

It's a static site (plain HTML/CSS/JS, no build step), so it can be hosted for free on GitHub
Pages. There are two parts to set up: the website itself, and a small free Google Apps Script
backend that does the "save to a shared log + email a copy" part (GitHub Pages can't run
server code on its own, so this fills that gap).

---

## What's in this folder

```
index.html          The page itself
style.css           Styling
app.js              All the interactive logic (ratings, autosave, PDF, submission)
config.js           One line you'll edit: the Apps Script URL
apps-script/Code.gs  Backend script — paste this into Google Apps Script (step 1 below)
README.md           This file
```

---

## Step 1 — Set up the shared Google Sheet + backend (~10 minutes, one-time)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
   Name it something like **"4 P's Diagnostic — Submissions"**.
2. In that sheet, go to **Extensions > Apps Script**.
3. Delete whatever's in the editor and paste in the entire contents of `apps-script/Code.gs`
   from this folder.
4. Click the disk/save icon, then click **Deploy > New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set:
   - **Execute as:** Me (your account)
   - **Who has access:** Anyone
7. Click **Deploy**. The first time, Google will ask you to authorise the script — click through
   (it'll warn the app isn't verified; click **Advanced > Go to (project name)** — this is normal
   for scripts you write yourself).
8. Copy the **Web app URL** it gives you. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

That's your backend. Every submission from the website will now:
- add a row to a new "Submissions" tab in this spreadsheet, and
- email a PDF copy to whoever submitted it, and
- also save a copy of the PDF in a Google Drive folder called "4Ps Diagnostic Reports" as a backup.

**Keep this Google account as the owner** — if the account is ever deleted or the deployment
is removed, submissions will stop working until it's redeployed.

---

## Step 2 — Connect the website to that backend

Open `config.js` in this folder and paste the Web app URL from Step 1 in place of the
placeholder:

```js
const APP_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec"
};
```

Save the file.

---

## Step 3 — Put it on GitHub Pages

**Easiest way (no command line):**

1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g.
   `4ps-loss-diagnostic`). Keep it **Public** (GitHub Pages needs this on free plans, and there's
   nothing sensitive in the code itself — just don't put real store data in it).
2. On the new repo's page, click **Add file > Upload files**, and drag in all the files from
   this folder (`index.html`, `style.css`, `app.js`, `config.js` — the `apps-script` folder
   doesn't need to go to GitHub, it only lives in Google Apps Script).
3. Commit the files.
4. Go to the repo's **Settings > Pages**.
5. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder
   `/ (root)`. Save.
6. Wait about a minute, then refresh — GitHub will show you the live URL, something like:
   `https://<your-username>.github.io/4ps-loss-diagnostic/`

That's the link the whole team will use.

---

## Step 4 — Make the QR code

Once you have the live URL from Step 3, generate a QR code for it — either:

- Send me the URL and I'll generate a print-ready QR code image for you, or
- Use any free QR generator (e.g. [qr-code-generator.com](https://www.qr-code-generator.com/))
  and paste in your GitHub Pages URL.

Print it and stick it up in the store, or drop it into a team message.

---

## How the team uses it

1. Scan the QR code, fill in Store / Brand / Walk Date &amp; Time / Leader / Completed By as they go.
2. Work through People, Place, Process, Product — rate each section and write observations.
3. At the end, in Store Context:
   - **Download PDF** — saves a copy straight to their phone, works offline.
   - **Submit & Email Me a Copy** — needs signal; saves the submission to your shared Google
     Sheet and emails the PDF to whatever address they typed in.
4. If someone loses their copy, look them up in the "Submissions" tab of the Google Sheet, or
   check the "4Ps Diagnostic Reports" Drive folder — the PDF link is in the last column of
   the sheet.

The page also autosaves a draft to the device's local storage as people go, so a dropped
connection or an accidental tab close won't lose their answers — reopening the page restores
where they left off (until they hit **Clear all**).

---

## Notes / things to know

- **No cost.** GitHub Pages and Google Apps Script are both free for this kind of use.
- **Gmail sending limits.** A personal Gmail account can send up to 100 emails/day via
  `MailApp`; a Google Workspace account can send up to 1,500/day. That's very unlikely to be
  hit for store walk diagnostics, but worth knowing if this scales up a lot.
- **iPhone PDF downloads.** iOS Safari sometimes opens a downloaded PDF in a new tab instead of
  saving it straight to Files — from there people can tap **Share > Save to Files** or
  **Share > Mail** themselves. This is an Apple/Safari behaviour, not something the site can
  change.
- **Editing the content later.** All the questions and text live in `index.html` — open it in
  any text editor, edit the wording, save, and re-upload to GitHub (or `git push` if you're
  using the command line).
- **If submissions stop working:** the most common cause is the Apps Script deployment being
  out of date. In the Apps Script editor, use **Deploy > Manage deployments > Edit > New
  version** rather than only saving the code, so the live Web App URL actually picks up your
  changes.
