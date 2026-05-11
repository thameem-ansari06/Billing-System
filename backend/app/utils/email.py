import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_otp_email(email_to: str, otp: str):
    """
    Sends a professional HTML email with the Delivery OTP.
    """
    try:
        mail_username = settings.MAIL_USERNAME
        mail_password = settings.MAIL_PASSWORD
        mail_from = settings.MAIL_FROM or mail_username
        mail_port = settings.MAIL_PORT
        mail_server = settings.MAIL_SERVER

        if not email_to:
            print("ERROR: email_to is empty. Cannot send OTP.")
            return

        if not mail_username or not mail_password:
            print(f"WARNING: MAIL_USERNAME or MAIL_PASSWORD not configured. Mock sending OTP to {email_to}: {otp}")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Order is Here!"
        msg["From"] = mail_from
        msg["To"] = email_to

        text = f"Your driver has arrived! Provide this OTP to receive your delivery: {otp}"
        html = f"""\
        <html>
          <body>
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4F46E5;">Your Order is Here! 🚚</h2>
                <p>Your driver has arrived at the destination.</p>
                <p>Please provide the following secure OTP to receive your delivery:</p>
                <div style="margin: 20px 0; padding: 15px; background: #F3F4F6; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">
                    {otp}
                </div>
                <p style="font-size: 12px; color: #6B7280;">Do not share this code until the package is in your hands.</p>
            </div>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(mail_server, mail_port)
        server.starttls()
        server.login(mail_username, mail_password)
        server.sendmail(mail_from, email_to, msg.as_string())
        server.quit()
        print(f"SUCCESS: OTP Email sent successfully to {email_to}")

    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR IN EMAIL UTILITY: {repr(e)}")
        traceback.print_exc()
