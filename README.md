# 🕷️ LEGEND-AMMAR — Pairing Code Server

WhatsApp pairing code server for the **🕷️ LEGEND-AMMAR 🕷️** bot.

> **Zaroori note:** WhatsApp 2026 me datacenter/residential-hosted servers se naye
> device pairing ko kabhi kabhi block karta hai (error 405/428). Agar ye server
> apni hosting pe bhi code generate na kare to hosting provider badlein ya
> residential IP wali hosting use karein.

## Features

- Number validate karta hai (country code ke sath)
- Baileys se fresh pairing code generate karta hai
- Per-IP rate limiting: 3 requests / 10 minute
- Spider neon themed pairing page (cyan/magenta)

## Local Test

```bash
npm install
npm start
```

Page: `http://localhost:3000`
API: `POST http://localhost:3000/api/pair` with `{ "phoneNumber": "+93770909827" }`

## Deploy — Railway (FREE / cheap)

1. [railway.app](https://railway.app) pe account banao → **New Project** → **Deploy from GitHub repo**
2. Ye repo GitHub pe upload karo (`LEGEND-AMMAR-pair-server`)
3. Railway khud Node.js detect kar lega. Koi environment variable zaroori nahi
   (PORT khud set karta hai)
4. **Deploy** → URL mil jayega (jaise `legendammarpair.up.railway.app`)

## Deploy — Koyeb (FREE)

1. [koyeb.com](https://koyeb.com) → **Create App** → **Deploy with GitHub**
2. Build preset **Node**, port **3000** (ya `PORT` env = `3000`)
3. **Deploy**

## Deploy — VPS (best reliability)

```bash
# Ubuntu/Debian VPS
sudo apt update && sudo apt install -y nodejs npm
git clone <repo-url>
cd LEGEND-AMMAR-pair-server
npm install
npm install -g pm2
pm2 start server.js --name legend-ammar-pair
pm2 save
```

Reverse proxy (nginx) me `proxy_pass http://localhost:3000` set karo aur HTTPS
(Certbot) laga lo.

## Bot me use karna

Bot ke `config.js` me pairing URL apne deployed URL se replace karo
(jaise `SESSION_ID` / pairing link field). Phir deploy karo aur apne pairing
page se session ID le lo.

---

🕷️ LEGEND-AMMAR — Powered by Legend Ammar
