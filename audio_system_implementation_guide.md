# Audio Recording & Collection System - Production Implementation Guide

This guide provides step-by-step instructions for building and deploying a 10/10 production-ready Audio Recording & Collection System. Based on enterprise infrastructure standards, this architecture separates the frontend (Next.js on Vercel) and the backend (FastAPI on Render or Railway) to ensure optimal performance, prevent cold starts, and provide robust security.

## System Architecture
- **Frontend**: React/Next.js hosted on **Vercel**
- **Backend**: FastAPI hosted on **Render** or **Railway** (Resolves ASGI limitations and cold start latency)
- **Storage**: Google Drive via Service Account integration
- **Database (Optional/Future)**: PostgreSQL/SQLite for robust metadata tracking.

## Step 1: Project Setup (Decoupled Structure)
Create a directory structure that separates your frontend and backend concerns.

1. **Frontend Setup**:
   ```bash
   npx create-next-app@latest audio-frontend
   ```
2. **Backend Setup**:
   ```bash
   mkdir audio-backend
   cd audio-backend
   python -m venv venv
   source venv/bin/activate
   ```
3. Create a `requirements.txt` for the backend:
   ```txt
   fastapi
   uvicorn
   python-multipart
   google-api-python-client
   google-auth-httplib2
   google-auth-oauthlib
   tenacity
   ```

## Step 2: Google Drive API Configuration
To allow the backend to seamlessly upload files without user intervention, use a Google Cloud Service Account.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** for your project.
3. Navigate to **IAM & Admin > Service Accounts**, create a new account, and download its JSON Key.
4. Create a master folder in your Google Drive (e.g., "Voice Data Collection") and share it with the Service Account email address, giving it "Editor" access.
5. Extract the master folder ID from the Google Drive URL.

## Step 3: Backend Implementation (FastAPI)
Create `main.py` inside your backend directory. This robust implementation features strict CORS, secure service account handling in the environment, file size protection, name sanitization, consistent UTC timestamps, memory-efficient streaming, structured logging, automatic failure retries, and scalable user-specific folders.

```python
import os
import re
import json
import logging
import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from tenacity import retry, wait_exponential, stop_after_attempt

# 🧠 Structured Logging initialized
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

# 1. 🔐 Security Fix: Strict CORS instead of wildcard
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://your-vercel-app.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# 2. 🔑 Credentials Handling: Load purely from Environment Variables (Zero-trust files)
# Expects a stringified JSON representation of your Service Account block
gcp_creds_json = os.environ.get("GCP_SERVICE_ACCOUNT_JSON")
if not gcp_creds_json:
    raise ValueError("CRITICAL: Missing GCP_SERVICE_ACCOUNT_JSON in environment.")

creds_info = json.loads(gcp_creds_json)
creds = service_account.Credentials.from_service_account_info(creds_info)
drive_service = build('drive', 'v3', credentials=creds, cache_discovery=False)

MASTER_FOLDER_ID = os.environ.get("MASTER_FOLDER_ID")

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def upload_to_drive(drive_service, file_obj, filename, folder_id):
    """Handles streaming upload directly to Drive with automatic retry logic.
       ⏱️ Advanced Timeout Note: Since Google API is synchronous, under extreme load 
       this could be wrapped in asyncio.to_thread to prevent ASGI thread-pooling locks.
    """
    media = MediaIoBaseUpload(file_obj.file, mimetype=file_obj.content_type, resumable=True)
    file_metadata = {'name': filename, 'parents': [folder_id]}
    
    return drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()

def get_or_create_user_folder(drive_service, user_folder_name):
    """Finds existing user folder or creates a cleanly-nested new one inside the master folder."""
    query = f"name='{user_folder_name}' and '{MASTER_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = drive_service.files().list(q=query, fields="files(id, name)").execute()
    items = results.get('files', [])
    
    if items:
        return items[0]['id']
        
    folder_metadata = {
        'name': user_folder_name,
        'parents': [MASTER_FOLDER_ID],
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
    return folder.get('id')

@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...), name: str = Form(...)):
    # 3. 📦 File Size Protection (Reject anything > 5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
    if file.size and file.size > MAX_FILE_SIZE:
        logging.warning(f"Rejected payload from '{name}' due to size limits.")
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # 4. Name Sanitization (Crucial for DB & FS integrity)
    clean_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
    
    # 5. Consistent UTC timestamps
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{clean_name}_{timestamp}.webm"
    
    try:
        logging.info(f"Starting pipeline for user: {clean_name}")
        
        user_folder_id = get_or_create_user_folder(drive_service, clean_name)
        upload_to_drive(drive_service, file, filename, user_folder_id)
        
        # 🧠 Analytics & Tracing Print
        logging.info(f"SUCCESS: {clean_name} uploaded file '{filename}' at {timestamp}")
        
        return {"status": "success", "filename": filename, "message": "Uploaded successfully"}
    except Exception as e:
        logging.error(f"FAILURE: Upload failed for {clean_name}. Reason: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during upload.")
```

## Step 4: Frontend Implementation (React/Next.js)
1. **Terms & Conditions UI**: Validate user permission proactively.
2. **Name Entry Setup**: Gather the user's name.
3. **Recording Logic**: Use the `MediaRecorder` API to capture native microphone inputs cross-platform.
4. **Auto-Upload Strategy**: Send the `FormData` POST containing the audio Blob to the properly enabled backend domain via CORS.

## Step 5: Enterprise Deployment Structure

### 1. Backend Service (Render / Railway)
Standardize your architecture by hosting FastAPI on traditional managed clusters.
*   **Environment Variables**: Securely inject `FRONTEND_URL`, `GCP_SERVICE_ACCOUNT_JSON` (the stringified credentials dictionary), and `MASTER_FOLDER_ID`.
*   Execute `uvicorn main:app --host 0.0.0.0 --port $PORT` at runtime.

### 2. Frontend Interface (Vercel)
*   **Environment Variables**: Bridge the services by defining `NEXT_PUBLIC_BACKEND_URL` to point to the active Render/Railway target.

## Step 6: 📊 Minimal Metadata Database (Future Improvement)
While storing data via filenames inside of designated Google Drive folders is mathematically sound for initial collections, scaling this across thousands of sessions requires standardizing the relational nature of uploads using a database. Fast forward improvements should consider:

- **Adding a Database**: Bootstrapping an SQLite DB or linking a Postgres URL on Railway.
- **Why?**:
   - Enables Search queries by duration, upload success rate, or user cohort.
   - Provides granular Analytics (Data sizes per week, active contributors).
   - Serves as the tracking source-of-truth if a file sync mismatch ever exists between Vercel and Google Drive metadata.
