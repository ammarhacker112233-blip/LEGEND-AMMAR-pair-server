# 🕷️ LEGEND-AMMAR — Pairing Code Server

WhatsApp pairing code server for the **🕷️ LEGEND-AMMAR 🕷️** bot.

> **Zaroori note:** WhatsApp 2026 me datacenter/residential-hosted servers se naye device pairing ko kabhi kabhi block karta hai (error 405/428). Agar ye server apni hosting pe bhi code generate na kare to hosting provider badlein ya residential IP wali hosting use karein.

## Features

- Number validate karta hai (country code ke sath)
- Baileys se fresh pairing code generate karta hai
- Per-IP rate limiting: 3 requests / 10 minute
- Spider neon themed pairing page (cyan/magenta)
- Railway ke liye Dockerfile ready hai (auto detect)

## Local Test

```bash
npm install
npm start
```

Page: `http://localhost:3000`
API: `POST http://localhost:3000/api/pair` with `{ "phoneNumber": "+93770909827" }`

## Deploy — Railway (FREE / cheap)

1. [railway.app](https://railway.app) pe apna project kholo
2. **+ New** → **GitHub Repo** → `LEGEND-AMMAR-pair-server` select karo
3. Railway `Dockerfile` khud detect kar lega aur build karega
4. **Deploy** → URL mil jayega (jaise `legendammarpair.up.railway.app`)
5. Usi URL ko kholo — pairing page live hai

## Deploy — Koyeb (FREE)

1. [koyeb.com](https://koyeb.com) → **Create App** → **Deploy with GitHub**
2. Ye repo select karo, port **3000** (ya `PORT` env = `3000`)
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

Reverse proxy (nginx) me `proxy_pass http://localhost:3000` set karo aur HTTPS (Certbot) laga lo.

## Bot me use karna

Bot ke `config.js` me pairing URL apne deployed URL se replace karo (jaise `SESSION_ID` / pairing link field). Phir deploy karo aur apne pairing page se session ID le lo.

---

🕷️ LEGEND-AMMAR — Powered by Legend Ammar
