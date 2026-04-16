import imaplib
import email
from email.header import decode_header
import os
import sqlite3
from dotenv import load_dotenv, find_dotenv
import time
import re
from backend.app.utils.agent import run_agent

# --- BULLETPROOF ENV LOADING ---
env_path = find_dotenv()
print(f"🔍 System found .env file at: {env_path}")
load_dotenv(env_path, override=True)

# Exact names from your .env file
EMAIL_ACCOUNT = os.getenv("EMAIL_USER")
APP_PASSWORD = os.getenv("EMAIL_PASS")

# Strict Check: Ithu illama code munnadiye pogathu!
print(f"🔍 Debug - Email Loaded: {EMAIL_ACCOUNT}")
print(f"🔍 Debug - Password Loaded: {'YES (Secret)' if APP_PASSWORD else 'NO (It is None!)'}")

if not EMAIL_ACCOUNT or not APP_PASSWORD:
    print("\n❌ CRITICAL ERROR: Could not load Email or Password from .env file!")
    print("Please check if EMAIL_USER and EMAIL_PASS are correct in your .env file.")
    exit() # Force stop to prevent the 'replace' error!
# -------------------------------

RECEIPTS_DIR = "data/receipts"

def get_db_connection():
    conn = sqlite3.connect('data/ar_system.db')
    return conn

def check_for_replies():
    print(f"[{time.strftime('%X')}] Checking for new payment replies...")
    
    try:
        # Connect to Gmail's IMAP server
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(EMAIL_ACCOUNT, APP_PASSWORD)
        
        # Select the inbox
        mail.select("inbox")
        
        # Search for UNREAD emails that have "[INV-" in the subject
        status, messages = mail.search(None, '(UNSEEN SUBJECT "[INV-")')
        
        if status == "OK":
            email_ids = messages[0].split()
            if not email_ids:
                print("No new replies found.")
            
            for email_id in email_ids:
                # Fetch the email data
                res, msg_data = mail.fetch(email_id, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # --- PUTHU KAVASAM (SAFETY CHECK) ---
                        raw_subject = msg.get("Subject")
                        if not raw_subject:
                            print("\n⚠️ Ignored an email without a subject.")
                            continue # Subject illana intha mail-a skip pannidu
                        
                        # Extract Subject
                        subject, encoding = decode_header(raw_subject)[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else "utf-8")
                        
                        print(f"\n📬 Found Mail: {subject}")
                        
                        # Extract Invoice ID from Subject
                        match = re.search(r'\[(INV-\d+)\]', subject)
                        if match:
                            inv_id = match.group(1)
                            print(f"🔍 Extracted Invoice ID: {inv_id}")
                            
                            # Download attachments
                            for part in msg.walk():
                                if part.get_content_maintype() == 'multipart':
                                    continue
                                if part.get('Content-Disposition') is None:
                                    continue
                                
                                filename = part.get_filename()
                                if filename:
                                    # Create a unique filename based on invoice ID
                                    ext = filename.split('.')[-1]
                                    new_filename = f"{inv_id}_receipt.{ext}"
                                    filepath = os.path.join(RECEIPTS_DIR, new_filename)
                                    
                                    with open(filepath, "wb") as f:
                                        f.write(part.get_payload(decode=True))
                                    print(f"✅ Downloaded Receipt: {new_filename}")
                                    
                                    # Update Database Status
                                    conn = get_db_connection()
                                    conn.execute(
                                        "UPDATE invoices SET status = ?, payment_proof_path = ? WHERE invoice_id = ?",
                                        ("Payment Received - Pending OCR", filepath, inv_id)
                                    )
                                    conn.commit()
                                    conn.close()
                                    print(f"🔄 Database updated for {inv_id}")
                                    print(f"🔄 Database updated for {inv_id}")
                                    
                                    # --- PUTHUSA ADD PANRA LINES ---
                                    print(f"🚀 Sending image to Vision Engine...")
                                    run_agent(inv_id, filepath)
                                    # -------------------------------
                                    
        mail.logout()
    except Exception as e:
        print(f"Error checking emails: {e}")

# ... (Mela irukka unga existing functions: check_for_replies, etc. apdiye irukkanum)

if __name__ == "__main__":
    # SETTINGS: Evlo nerathukku oru thadava check pannanum?
    CHECK_INTERVAL_SECONDS = 30  # 300 seconds = 5 Minutes
    
    print("🚀 [Inbound Bot] Starting Autonomous Mode...")
    print(f"📡 System will check for new emails every {CHECK_INTERVAL_SECONDS/60} minutes.")
    print("Press Ctrl + C to stop the bot anytime.\n")
    
    try:
        while True:
            # 1. Check for replies
            check_for_replies()
            
            # 2. Log status
            print(f"[{time.strftime('%X')}] 💤 Check complete. Sleeping for {CHECK_INTERVAL_SECONDS/60} mins...")
            
            # 3. System-a thoonga vaikirom (Wait phase)
            time.sleep(CHECK_INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        print("\n🛑 [Inbound Bot] Shutting down gracefully...")
    except Exception as e:
        print(f"❌ [Critical Error] The bot crashed: {e}")