import os
import re
import json
import logging
import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

# Load variables from .env file securely for local testing
load_dotenv(override=True)

# 🧠 Structured Logging initialized
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

# 1. 🔐 Security Fix: Strict CORS instead of wildcard
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000") # Default to local next.js on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# 2. 🔑 Credentials Handling: Fully Migrated to Local OAuth2 Flow
MASTER_FOLDER_ID = os.environ.get("MASTER_FOLDER_ID")
SCOPES = ['https://www.googleapis.com/auth/drive.file']

drive_service = None
if MASTER_FOLDER_ID:
    try:
        creds = None
        
        # 🚀 PRODUCTION CHECK: Load from Render Environment Variables first
        prod_token = os.environ.get("OAUTH_TOKEN_JSON")
        if prod_token:
            creds_info = json.loads(prod_token)
            creds = Credentials.from_authorized_user_info(creds_info, SCOPES)
        # Fallback to local dev file
        elif os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
            
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if os.path.exists('credentials.json'):
                    logging.info("Initiating Google OAuth2 pop-up flow using credentials.json...")
                    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                    creds = flow.run_local_server(port=0)
                    with open('token.json', 'w') as token:
                        token.write(creds.to_json())
                else:
                    logging.warning("No credentials.json found! Please download OAuth Client ID from Google Cloud and place it in audio-backend folder.")

        if creds:
            drive_service = build('drive', 'v3', credentials=creds, cache_discovery=False)
            logging.info("Google Drive OAuth service successfully initialized linked to your personal email.")
            
    except Exception as e:
        logging.error(f"Failed to initialize Google Drive OAuth service: {e}")
else:
    logging.warning("⚠️ MASTER_FOLDER_ID missing from .env. Running in LOCAL Mock Upload mode.")

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
        fields='id',
        supportsAllDrives=True
    ).execute()

def get_or_create_user_folder(drive_service, user_folder_name):
    """Finds existing user folder or creates a cleanly-nested new one inside the master folder."""
    query = f"name='{user_folder_name}' and '{MASTER_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = drive_service.files().list(
        q=query, 
        fields="files(id, name)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()
    items = results.get('files', [])
    
    if items:
        return items[0]['id']
        
    folder_metadata = {
        'name': user_folder_name,
        'parents': [MASTER_FOLDER_ID],
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = drive_service.files().create(
        body=folder_metadata, 
        fields='id',
        supportsAllDrives=True
    ).execute()
    return folder.get('id')

@app.get("/")
def health_check():
    return {"status": "online", "message": "Audio Pipeline API is running securely."}

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
        
        # Determine if Google Drive is connected
        if drive_service:
            user_folder_id = get_or_create_user_folder(drive_service, clean_name)
            upload_to_drive(drive_service, file, filename, user_folder_id)
            logging.info(f"SUCCESS: {clean_name} uploaded file '{filename}' at {timestamp} to Google Drive.")
        else:
            # Fallback local saving if Drive isn't configured (great for local testing)
            # Vercel functions are read-only, so we must use /tmp if deployed.
            local_save_dir = "/tmp/uploads" if os.environ.get("VERCEL") else "uploads"
            os.makedirs(local_save_dir, exist_ok=True)
            local_path = os.path.join(local_save_dir, filename)
            with open(local_path, "wb") as f:
                f.write(await file.read())
            logging.info(f"MOCK SUCCESS: Drive not configured. Saved '{filename}' locally to {local_save_dir}.")
        
        return {"status": "success", "filename": filename, "message": "Uploaded successfully"}
    except Exception as e:
        logging.error(f"FAILURE: Upload failed for {clean_name}. Reason: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during upload.")
