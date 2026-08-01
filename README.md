# Love Meter ❤️

> Discover your magical love compatibility. A premium, production-ready web application with Firebase Firestore analytics, a hidden admin dashboard, and a beautiful glassmorphism UI.

![Love Meter](public/icons/og-image.png)

---

## ✨ Features

- **Animated Love Calculation** — Deterministic scoring (same names → same score). Beautiful circular meter with count-up animation.
- **Premium UI** — Glassmorphism, aurora gradients, floating hearts, sparkles, 4 themes (Dark, Light, Valentine, Anniversary).
- **Cloud Storage** — Every calculation is saved to Firebase Firestore. Data syncs across all devices instantly.
- **Hidden Admin Dashboard** — Triple-click the tiny lock icon (bottom-right) within 2 seconds to open admin login.
- **Firebase Auth** — Admin login uses Firebase Authentication (email/password). No hardcoded passwords.
- **Analytics** — Live stats cards, weekly trend chart, score distribution chart, search, filter, pagination, export (CSV/JSON/Excel).
- **PWA** — Installable on mobile. Service worker with offline support.
- **Share** — WhatsApp, Telegram, Instagram, Facebook, X, copy link, native share API.
- **Responsive** — Perfect on desktop, tablet, Android, iPhone.
- **Themes** — Dark Romance, Light Rose, Valentine, Anniversary.
- **Sound Effects** — Click, success, and music toggle.
- **Accessibility** — Keyboard shortcuts, ARIA labels, smooth scrolling.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A Firebase project (Firestore + Authentication)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/love-meter.git
cd love-meter
npm install
```

### 2. Configure Firebase

Copy the example env file and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project settings:

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — for the Firebase Admin SDK (server-side)
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc. — for the Firebase Web SDK (client-side admin auth)
- `ADMIN_EMAILS` — comma-separated list of emails allowed to access the admin dashboard

### 3. Set up Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Sign-in method**
2. Enable **Email/Password** sign-in
3. Create an admin user (email + password) in the **Users** tab
4. Add that email to `ADMIN_EMAILS` in your `.env`

### 4. Set up Firestore

1. In Firebase Console → **Firestore Database** → **Create database**
2. Start in **production mode**
3. Deploy the security rules from `firebase/firestore.rules`

### 5. Run

```bash
npm start
```

Open http://localhost:4000

---

## 🎯 Usage

### Calculate Love
1. Enter your name and your crush's name
2. Click "Calculate Love"
3. Watch the beautiful loading animation
4. See your score with confetti (for high scores)

### Admin Dashboard
1. Click the **tiny lock icon** 🔒 in the bottom-right corner **three times within 2 seconds**
2. Log in with your Firebase Auth email/password
3. View analytics, search records, export data

---

## 📁 Project Structure

```
love-meter/
├── config/              # Environment configuration
│   └── index.js
├── data/                # Data access layer (Firestore + preview)
│   └── store.js
├── middleware/           # Express middleware
│   ├── auth.js          # Firebase Auth verification
│   ├── errorHandler.js
│   ├── rateLimit.js
│   └── security.js      # Helmet, XSS filter
├── public/              # Frontend (PWA)
│   ├── assets/
│   │   ├── css/         # Styles
│   │   └── js/          # ES modules
│   ├── icons/           # App icons and OG image
│   ├── index.html       # Main SPA
│   ├── manifest.json
│   ├── sw.js            # Service Worker
│   ├── offline.html
│   └── 404.html
├── routes/              # Express route handlers
│   ├── admin.js
│   ├── calculate.js
│   └── health.js
├── scripts/             # Utility scripts
│   ├── generate-icons.js
│   └── seed-admin.mjs
├── utils/               # Shared utilities
│   ├── export.js
│   ├── logger.js
│   ├── loveAlgorithm.js
│   ├── sanitize.js
│   └── userAgent.js
├── firebase/            # Firebase config files
│   ├── firestore.rules
│   └── service-account.example.json
├── .env.example
├── package.json
├── server.js
└── README.md
```

---

## 🔐 Security

- **No hardcoded passwords** — Admin login uses Firebase Authentication
- **Input sanitization** — XSS and HTML injection prevention on every input
- **Rate limiting** — Per-IP rate limits on API endpoints
- **IP hashing** — IP addresses are one-way hashed, never stored in plain text
- **Security headers** — Helmet.js with CSP, X-Frame-Options, etc.
- **Firebase Auth** — All admin API routes are protected by Firebase ID token verification
- **Admin allowlist** — Only specified email addresses can access the admin panel

---

## 📊 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/calculate` | Calculate love score |
| GET | `/api/health` | Health check |
| GET | `/api/admin/config` | Firebase config (public) |
| POST | `/api/admin/verify-login` | Verify Firebase token |
| GET | `/api/admin/stats` | Aggregated analytics |
| GET | `/api/admin/calculations` | Paginated calculations list |
| GET | `/api/admin/calculations/export` | Export as CSV/JSON/Excel |
| DELETE | `/api/admin/calculations/:id` | Delete a record |
| DELETE | `/api/admin/calculations` | Bulk delete |
| DELETE | `/api/admin/calculations/all` | Clear all data |

---

## 🎨 Themes

| Theme | Description |
|-------|-------------|
| Dark Romance | Deep purple/black with pink accents |
| Light Rose | Light/white with rose tones |
| Valentine | Deep red/pink romantic theme |
| Anniversary | Gold/royal celebration theme |

---

## 📄 License

MIT

---

## 💖 Made with love

Built with ❤️ for everyone who believes in love.
