# Love Meter Sharing System Update — TODO

## Plan Steps

- [x] **1. `public/assets/js/utils.js`** — Add `APP_URL` constant (`https://love-meter-in02.onrender.com/`) and update `getShareData()` to build the new clean formatted message + production URL.
- [x] **2. `public/assets/js/main.js`** — Replace old `buildShareText`/`buildShareUrl` logic with a new share message builder; use Web Share API on the Share button for supported devices; make Copy Link copy the full formatted message; add clipboard fallback for non-secure contexts.
- [x] **3. `public/index.html`** — Update `og:url` from `https://lovemeter.app` to `https://love-meter-in02.onrender.com/`.
- [x] **4. `public/assets/css/style.css`** — Add `white-space: pre-line;` to `.share-message` so the multi-line message renders correctly.
- [x] **5. `server.js`** — Replace the localhost startup log with the production URL (visible runtime reference).
- [x] **6. `README.md`** — Update the visible localhost reference to the production URL.
- [x] **7. Verification** — Ensure no `localhost`/`127.0.0.1`/`lovemeter.app` remains in app/share code; verify message format; provide testing steps.

