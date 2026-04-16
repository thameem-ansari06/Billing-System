import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv, find_dotenv


env_path = find_dotenv()
print(f"🔍 System found .env file at: {env_path}")

# INTHA LINE THAAN MUKKIYAM (override=True)
load_dotenv(env_path, override=True) 

# Test panrathukkaga email-a mattum print panni paarpom
print(f"🔍 Debug Print - Email found: {os.getenv('EMAIL_USER')}")

def send_invoice_mail(receiver_email, invoice_id, amount, pdf_path):
    print(f"\n📧 [Email Bot] Preparing to send {invoice_id} to {receiver_email}...")
    
    sender_email = os.getenv("EMAIL_USER")
    app_password = os.getenv("EMAIL_PASS")
    
    # Check if credentials exist
    if not sender_email or not app_password:
        print("❌ Error: Email credentials not found in .env file!")
        return
        
    msg = EmailMessage()
    # Mukkiyam: Subject-la [INV-XXXX] irukkanum, appo thaan namma IMAP bot thedi edukkum
    msg['Subject'] = f"Action Required: Your Invoice {invoice_id} is Due [{invoice_id}]"
    msg['From'] = sender_email
    msg['To'] = receiver_email
    
    # Email Body message
    body = f"""Hello,

Please find attached your invoice {invoice_id} for the amount of ₹{amount}.

Kindly process the payment and REPLY TO THIS EMAIL with your payment proof (Screenshot/Receipt).
Our automated system will verify it.

Thank you,
Finance Team"""
    
    msg.set_content(body)
    
    # Attach the auto-generated PDF document
    try:
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
            pdf_name = os.path.basename(pdf_path)
            
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=pdf_name)
    except FileNotFoundError:
        print(f"❌ Error: PDF file not found at {pdf_path}")
        return
    
    # Send the email via Google SMTP
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, app_password)
            smtp.send_message(msg)
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")