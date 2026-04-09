# 🎙️ VocalVault

VocalVault is an enterprise-grade, browser-based voice data pipeline engineered to collect user audio natively through the web and stream it directly into Google Drive. 

Built with a completely decoupled architecture, it leverages **Next.js (React)** for a highly responsive frontend and **FastAPI (Python)** for a fast, streaming backend. Both environments are now deployed completely as Serverless functions on Vercel.

## 🌟 System Architecture

*   **Frontend**: Next.js 15 (Turbopack) + TailwindCSS
    *   *Features*: Native `MediaRecorder` API handling, `.webm` browser wrapping, interactive Terms and Conditions UI, Glassmorphism aesthetic powered by Framer Motion.
    *   *Analytics*: Integrated with **Vercel Analytics** to track visitors, page views, and interactions.
*   **Backend**: FastAPI + Google Drive API
    *   *Features*: 
        *   Serverless-ready deployment on Vercel (`@vercel/python`).
        *   **Local OAuth2 Flow**: Completely bypasses Google's strict Service Account storage limits by securely acquiring a persistent personal token.
        *   Advanced regex name sanitization and UTC timestamping for robust file identification.
        *   Strict CORS policies.

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
uvicorn index:app --reload --port 8000
```

#### Authentication (Google Drive Setup)
1. Get an OAuth2 `credentials.json` (Desktop App) from your Google Cloud Console.
2. Drop it directly into the `audio-backend` folder.
3. Configure your target Drive Folder ID inside `.env`:
   ```env
   MASTER_FOLDER_ID=your_id_here
   ```
4. On your first boot, it will open a browser to authenticate you exactly once, creating a permanent `token.json` or `token.pickle`.

### 2. The Frontend (User Interface)
Open a second terminal in the `audio-frontend` folder:
```bash
cd audio-frontend

# Install node modules
npm install

# Start the dev server
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🚀 Cloud Deployment

Both the Frontend and Backend are configured for zero-config serverless deployment on **Vercel**.

### Backend (Vercel Serverless Python)
The backend is structured to compile as a Serverless API via `vercel.json`. 
*   **Deploy**: Follow standard Vercel import for the `audio-backend` folder.
*   **Environment Variables Needed**: 
    *   `MASTER_FOLDER_ID`
    *   `FRONTEND_URL` (e.g., `https://your-frontend-app.vercel.app`)
    *   `OAUTH_TOKEN_JSON`: In production, do *not* commit your `token.json` file. Instead, copy the full dictionary text inside your local `token.json` and paste it here!

### Frontend (Vercel Next.js)
The frontend imports effortlessly to Vercel as a standard Next.js application.
*   **Deploy**: Follow standard Vercel import for the `audio-frontend` folder.
*   **Environment Variables Needed**:
    *   `NEXT_PUBLIC_BACKEND_URL`: The live URL of your Vercel backend (e.g., `https://your-backend.vercel.app`).
*   **Analytics**: Vercel Analytics are pre-configured. Ensure it is enabled in your Vercel project dashboard.

---

## 🔐 Security & Safety
*   `.env`, `token.json`, and `credentials.json` are strictly ignored in `.gitignore` to prevent API key leaks.
*   FastAPI CORS securely locks incoming payload requests specifically to the designated Next.js frontend host.
