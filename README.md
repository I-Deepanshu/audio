# 🎙️ Secure Audio Recording & Collection System

An enterprise-grade, browser-based voice data pipeline engineered to collect user audio natively through the web and stream it directly into Google Drive using automated OAuth2 authentication. 

Built with a completely decoupled architecture, it leverages **Next.js (React)** for a highly responsive dark-mode frontend and **FastAPI (Python)** for an ultra-fast, streaming backend.

## 🌟 System Architecture

*   **Frontend**: Next.js 15 (Turbopack) + TailwindCSS
    *   *Features*: Native `MediaRecorder` API handling, `.webm` browser wrapping, interactive Terms and Conditions UI, Glassmorphism aesthetic.
*   **Backend**: FastAPI + Google Drive API
    *   *Features*: 
        *   True streaming uploads (avoids RAM bloat on large files).
        *   **Local OAuth2 Flow**: Completely bypasses Google's strict Service Account storage limits by securely acquiring a persistent personal token.
        *   Advanced regex name sanitization and UTC timestamping for robust file identification.
        *   File-size limiters (5MB max) and strict CORS policies.

---

## ⚡ Local Setup

### 1. The Backend (Audio Processing & Google Drive API)
Open a terminal in the `audio-backend` folder:
```bash
cd audio-backend

# Create and activate a Virtual Environment
python -m venv venv
.\venv\Scripts\activate   # (Windows)
# source venv/bin/activate # (Mac/Linux)

# Install Dependencies
pip install -r requirements.txt

# Start the Server
uvicorn main:app --reload --port 8000
```

#### Authentication (Google Drive Setup)
1. Get an OAuth2 `credentials.json` (Desktop App) from your Google Cloud Console.
2. Drop it directly into the `audio-backend` folder.
3. Configure your target Drive Folder ID inside `.env`:
   ```env
   MASTER_FOLDER_ID=your_id_here
   ```
4. On your first boot, it will open a browser to authenticate you exactly once, creating a permanent `token.json`.

### 2. The Frontend (User Interface)
Open a second terminal in the `audio-frontend` folder:
```bash
cd audio-frontend

# Install node modules
npm install

# Start the Turbopack dev server
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🚀 Cloud Deployment

### Backend (Render / Railway)
The backend requires a solid environment due to ASGI execution. Deploy to a containerized platform like Render.
*   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
*   **Environment Variables Needed**: 
    *   `MASTER_FOLDER_ID`
    *   `FRONTEND_URL` (e.g. `https://your-vercel.vercel.app`)
    *   `OAUTH_TOKEN_JSON`: In production, do *not* commit your `token.json` file. Instead, copy the full dictionary text inside your local `token.json` and paste it here!

### Frontend (Vercel)
Vercel is natively tailored for Next.js.
*   **Environment Variables Needed**:
    *   `NEXT_PUBLIC_BACKEND_URL`: The live URL of your Render backend.

---

## 🔐 Security & Safety
*   `.env`, `token.json`, and `credentials.json` are heavily ignored in Git to prevent API key leaks.
*   FastAPI CORS securely locks incoming payload requests specifically to the designated Next.js host.
