import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import random
from datetime import datetime, timedelta, timezone
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_verification_email(email: str, otp: str, user_type=None, user_name=None):
    """
    Send verification email with OTP
    Returns True if successful, False otherwise
    """
    # Email configuration
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    # Check if email configuration is available
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        # For development, just log the OTP
        logger.info(f"DEV MODE: OTP for {email} is: {otp}")
        return True  # Return True to not block signup in development
    
    # Use provided user_name or default
    display_name = user_name if user_name else "User"
    # Handle both enum and string user_type
    if user_type:
        if hasattr(user_type, 'value'):
            user_type_display = user_type.value.title()
        else:
            user_type_display = str(user_type).title()
    else:
        user_type_display = "User"
    
    # Create message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "MindMate - Verify Your Email"
    msg["From"] = smtp_user
    msg["To"] = email
    
    # HTML email body with personalization
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello {display_name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Welcome to MindMate! Please use the verification code below to complete your {user_type_display.lower()} registration:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #667eea;">
                <p style="margin: 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px;">{otp}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this verification, please ignore this email.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    # Text fallback with personalization
    text_body = f"""
    MindMate - Email Verification
    
    Hello {display_name}!
    
    Welcome to MindMate!
    
    Your verification code is: {otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this verification, please ignore this email.
    """
    
    # Add both parts to message
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        # Create SMTP session
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()  # Enable TLS
            server.login(smtp_user, smtp_password)
            
            # Send email
            text = msg.as_string()
            server.sendmail(smtp_user, [email], text)
            
        logger.info(f"Verification email sent successfully to {email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP Authentication failed. Check your email credentials.")
        return False
    except smtplib.SMTPRecipientsRefused:
        logger.error(f"Recipient {email} was refused by the server.")
        return False
    except smtplib.SMTPServerDisconnected:
        logger.error("SMTP server disconnected unexpectedly.")
        return False
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        return False

def send_password_reset_email(email: str, reset_token: str, first_name: str = None):
    """
    Send password reset email with secure token
    Returns True if successful, False otherwise
    """
    # Email configuration
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    # Check if email configuration is available
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        # For development, just log the reset token
        logger.info(f"DEV MODE: Password reset token for {email} is: {reset_token}")
        return True  # Return True to not block reset in development
    
    # Create message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "MindMate - Reset Your Password"
    msg["From"] = smtp_user
    msg["To"] = email
    
    # Prepare greeting
    greeting = f"Hello {first_name}," if first_name else "Hello,"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Password Reset</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                {greeting}
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your MindMate account. Use the reset OTP below to create a new password:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #667eea;">
                <p style="margin: 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reset OTP</p>
                <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: #667eea; word-break: break-all; font-family: monospace;">{reset_token}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                This token will expire in <strong>1 hour</strong>. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                For security reasons, please do not share this token with anyone.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    # Text fallback
    text_body = f"""
    MindMate - Password Reset
    
    {greeting}
    
    We received a request to reset your password for your MindMate account.
    
    Your password reset token is: {reset_token}
    
    This token will expire in 1 hour.
    
    If you didn't request this password reset, please ignore this email and your password will remain unchanged.
    
    For security reasons, please do not share this token with anyone.
    """
    
    # Add both parts to message
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        # Create SMTP session
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()  # Enable TLS
            server.login(smtp_user, smtp_password)
            
            # Send email
            text = msg.as_string()
            server.sendmail(smtp_user, [email], text)
            
        logger.info(f"Password reset email sent successfully to {email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP Authentication failed. Check your email credentials.")
        return False
    except smtplib.SMTPRecipientsRefused:
        logger.error(f"Recipient {email} was refused by the server.")
        return False
    except smtplib.SMTPServerDisconnected:
        logger.error("SMTP server disconnected unexpectedly.")
        return False
    except Exception as e:
        logger.error(f"Password reset email sending failed: {str(e)}")
        return False

def send_notification_email(to_email: str, subject: str, content: str):
    """
    Send a notification email to the specified recipient.
    Returns True if successful, False otherwise.
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    # Check if email configuration is available
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        return True  # Return True to not block operation in development
    
    # Create message
    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    
    # Add content
    msg.attach(MIMEText(content, "html"))
    
    try:
        # Create SMTP session with timeout
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()  # Enable TLS
            server.login(smtp_user, smtp_password)
            
            # Send email
            text = msg.as_string()
            server.sendmail(smtp_user, [to_email], text)
            
        logger.info(f"Notification email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        logger.warning("SMTP Authentication failed. Check your email credentials.")
        return False
    except smtplib.SMTPRecipientsRefused:
        logger.warning(f"Recipient {to_email} was refused by the server.")
        return False
    except smtplib.SMTPServerDisconnected:
        logger.warning("SMTP server disconnected unexpectedly. Email notification skipped.")
        return False
    except Exception as e:
        logger.warning(f"Notification email sending failed: {str(e)}")
        return False

def send_appointment_confirmation_emails(
    appointment,
    patient_email: str,
    patient_name: str,
    specialist_email: str,
    specialist_name: str
):
    """
    Send appointment confirmation emails to both patient and specialist.
    Includes meeting link for online appointments.
    """
    from datetime import datetime
    
    # Format appointment date and time
    scheduled_start = appointment.scheduled_start
    scheduled_end = appointment.scheduled_end
    
    if scheduled_start:
        if isinstance(scheduled_start, str):
            scheduled_start = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))
        
        appointment_date = scheduled_start.strftime("%B %d, %Y")
        appointment_time = scheduled_start.strftime("%I:%M %p")
        appointment_end_time = scheduled_end.strftime("%I:%M %p") if scheduled_end else ""
    else:
        appointment_date = "TBD"
        appointment_time = "TBD"
        appointment_end_time = ""
    
    # Determine appointment type
    is_online = appointment.appointment_type.value in ['virtual', 'online']
    appointment_type_display = "Online Consultation" if is_online else "In-Person Visit"
    
    # Build meeting link section for online appointments
    meeting_link_section = ""
    if is_online and appointment.meeting_link:
        meeting_link_section = f"""
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1e40af; margin-top: 0;">Meeting Link</h3>
            <p style="color: #1e3a8a; margin-bottom: 15px;">
                Join your consultation using the link below:
            </p>
            <a href="{appointment.meeting_link}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
                Join Meeting
            </a>
            <p style="color: #64748b; font-size: 14px; margin-top: 10px;">
                <strong>Link:</strong> <a href="{appointment.meeting_link}" style="color: #3b82f6;">{appointment.meeting_link}</a>
            </p>
        </div>
        """
    
    # Patient email content
    patient_email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
            .info-box {{ background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            .info-item {{ margin: 10px 0; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Confirmed!</h1>
            </div>
            <div class="content">
                <p>Dear {patient_name},</p>
                <p>Your appointment has been confirmed. Here are the details:</p>
                
                <div class="info-box">
                    <div class="info-item"><strong>Specialist:</strong> {specialist_name}</div>
                    <div class="info-item"><strong>Date:</strong> {appointment_date}</div>
                    <div class="info-item"><strong>Time:</strong> {appointment_time} - {appointment_end_time}</div>
                    <div class="info-item"><strong>Type:</strong> {appointment_type_display}</div>
                    <div class="info-item"><strong>Fee:</strong> Rs. {appointment.fee:.2f}</div>
                </div>
                
                {meeting_link_section}
                
                <p style="margin-top: 20px;">
                    <strong>Presenting Concern:</strong><br>
                    {appointment.presenting_concern or 'Not specified'}
                </p>
                
                <p style="margin-top: 20px;">
                    Please ensure you are available at the scheduled time. 
                    {'For online consultations, please test your internet connection and video/audio settings before the meeting.' if is_online else ''}
                </p>
            </div>
            <div class="footer">
                <p>This is an automated email from MindMate. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Specialist email content
    specialist_email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
            .info-box {{ background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            .info-item {{ margin: 10px 0; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Appointment Scheduled</h1>
            </div>
            <div class="content">
                <p>Dear {specialist_name},</p>
                <p>A new appointment has been confirmed with the following details:</p>
                
                <div class="info-box">
                    <div class="info-item"><strong>Patient:</strong> {patient_name}</div>
                    <div class="info-item"><strong>Date:</strong> {appointment_date}</div>
                    <div class="info-item"><strong>Time:</strong> {appointment_time} - {appointment_end_time}</div>
                    <div class="info-item"><strong>Type:</strong> {appointment_type_display}</div>
                    <div class="info-item"><strong>Fee:</strong> Rs. {appointment.fee:.2f}</div>
                </div>
                
                {meeting_link_section}
                
                <p style="margin-top: 20px;">
                    <strong>Patient's Concern:</strong><br>
                    {appointment.presenting_concern or 'Not specified'}
                </p>
                
                {f'<p style="margin-top: 15px;"><strong>Patient Notes:</strong><br>{appointment.request_message or "None"}</p>' if appointment.request_message else ''}
                
                <p style="margin-top: 20px;">
                    Please ensure you are available at the scheduled time.
                    {'For online consultations, please test your meeting link before the session.' if is_online else ''}
                </p>
            </div>
            <div class="footer">
                <p>This is an automated email from MindMate. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send emails
    patient_email_sent = False
    specialist_email_sent = False
    
    if patient_email:
        try:
            send_notification_email(
                to_email=patient_email,
                subject=f"Appointment Confirmed - {appointment_date}",
                content=patient_email_html
            )
            patient_email_sent = True
            logger.info(f"Appointment confirmation email sent to patient: {patient_email}")
        except Exception as e:
            logger.error(f"Failed to send email to patient {patient_email}: {str(e)}")
    
    if specialist_email:
        try:
            send_notification_email(
                to_email=specialist_email,
                subject=f"New Appointment Scheduled - {patient_name} - {appointment_date}",
                content=specialist_email_html
            )
            specialist_email_sent = True
            logger.info(f"Appointment confirmation email sent to specialist: {specialist_email}")
        except Exception as e:
            logger.error(f"Failed to send email to specialist {specialist_email}: {str(e)}")
    
    return patient_email_sent and specialist_email_sent

def send_appointment_pending_approval_emails(
    appointment,
    patient_email: str,
    patient_name: str,
    specialist_email: str,
    specialist_name: str
):
    """
    Send appointment pending approval emails to both patient and specialist.
    Used when an online appointment is created with payment receipt, awaiting specialist approval.
    """
    from datetime import datetime
    
    # Format appointment date and time
    scheduled_start = appointment.scheduled_start
    scheduled_end = appointment.scheduled_end
    
    if scheduled_start:
        if isinstance(scheduled_start, str):
            scheduled_start = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))
        
        appointment_date = scheduled_start.strftime("%B %d, %Y")
        appointment_time = scheduled_start.strftime("%I:%M %p")
        appointment_end_time = scheduled_end.strftime("%I:%M %p") if scheduled_end else ""
    else:
        appointment_date = "TBD"
        appointment_time = "TBD"
        appointment_end_time = ""
    
    # Get payment method and receipt info
    payment_method = getattr(appointment, 'payment_method_id', 'Not specified')
    payment_receipt = getattr(appointment, 'payment_receipt', 'Not provided')
    
    # Patient email content - informs them that payment is pending approval
    patient_email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
            .info-box {{ background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            .info-item {{ margin: 10px 0; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 10px 10px; }}
            .warning-box {{ background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Pending Approval</h1>
            </div>
            <div class="content">
                <p>Dear {patient_name},</p>
                <p>Your appointment request has been received and is pending payment approval.</p>
                
                <div class="info-box">
                    <div class="info-item"><strong>Specialist:</strong> {specialist_name}</div>
                    <div class="info-item"><strong>Date:</strong> {appointment_date}</div>
                    <div class="info-item"><strong>Time:</strong> {appointment_time} - {appointment_end_time}</div>
                    <div class="info-item"><strong>Type:</strong> Online Consultation</div>
                    <div class="info-item"><strong>Fee:</strong> Rs. {appointment.fee:.2f}</div>
                </div>
                
                <div class="warning-box">
                    <h3 style="color: #92400e; margin-top: 0;">⏳ Payment Approval Required</h3>
                    <p style="color: #78350f; margin-bottom: 10px;">
                        Your payment receipt has been submitted and is being reviewed by the specialist.
                        Once the payment is confirmed, you will receive a confirmation email with your meeting link.
                    </p>
                    <p style="color: #78350f; margin-bottom: 0;">
                        <strong>Payment Method:</strong> {payment_method}<br>
                        <strong>Receipt:</strong> {payment_receipt if len(str(payment_receipt)) < 100 else str(payment_receipt)[:100] + '...'}
                    </p>
                </div>
                
                <p style="margin-top: 20px;">
                    <strong>Presenting Concern:</strong><br>
                    {appointment.presenting_concern or 'Not specified'}
                </p>
                
                <p style="margin-top: 20px;">
                    Please wait for the specialist to confirm your payment. You will be notified once your appointment is confirmed.
                </p>
            </div>
            <div class="footer">
                <p>This is an automated email from MindMate. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Specialist email content - informs them that a new appointment needs payment confirmation
    specialist_email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
            .info-box {{ background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }}
            .info-item {{ margin: 10px 0; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 10px 10px; }}
            .action-box {{ background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Appointment - Payment Approval Required</h1>
            </div>
            <div class="content">
                <p>Dear {specialist_name},</p>
                <p>A new appointment request has been received that requires payment approval.</p>
                
                <div class="info-box">
                    <div class="info-item"><strong>Patient:</strong> {patient_name}</div>
                    <div class="info-item"><strong>Date:</strong> {appointment_date}</div>
                    <div class="info-item"><strong>Time:</strong> {appointment_time} - {appointment_end_time}</div>
                    <div class="info-item"><strong>Type:</strong> Online Consultation</div>
                    <div class="info-item"><strong>Fee:</strong> Rs. {appointment.fee:.2f}</div>
                </div>
                
                <div class="action-box">
                    <h3 style="color: #92400e; margin-top: 0;">💰 Payment Details</h3>
                    <p style="color: #78350f; margin-bottom: 10px;">
                        <strong>Payment Method:</strong> {payment_method}<br>
                        <strong>Payment Receipt:</strong> {payment_receipt if len(str(payment_receipt)) < 200 else str(payment_receipt)[:200] + '...'}
                    </p>
                    <p style="color: #78350f; margin-bottom: 0;">
                        Please review the payment receipt and confirm or reject the payment in your dashboard.
                    </p>
                </div>
                
                <p style="margin-top: 20px;">
                    <strong>Patient's Concern:</strong><br>
                    {appointment.presenting_concern or 'Not specified'}
                </p>
                
                {f'<p style="margin-top: 15px;"><strong>Patient Notes:</strong><br>{appointment.request_message or "None"}</p>' if appointment.request_message else ''}
                
                <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Please log in to your dashboard to review and confirm the payment.
                    Once confirmed, the appointment will be scheduled and both you and the patient will receive confirmation emails.
                </p>
                
                <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                    Appointment ID: {appointment.id}
                </p>
            </div>
            <div class="footer">
                <p>This is an automated email from MindMate. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send emails
    patient_email_sent = False
    specialist_email_sent = False
    
    if patient_email:
        try:
            send_notification_email(
                to_email=patient_email,
                subject=f"Appointment Pending Approval - {appointment_date}",
                content=patient_email_html
            )
            patient_email_sent = True
            logger.info(f"Appointment pending approval email sent to patient: {patient_email}")
        except Exception as e:
            logger.error(f"Failed to send email to patient {patient_email}: {str(e)}")
    
    if specialist_email:
        try:
            send_notification_email(
                to_email=specialist_email,
                subject=f"New Appointment - Payment Approval Required - {patient_name} - {appointment_date}",
                content=specialist_email_html
            )
            specialist_email_sent = True
            logger.info(f"Appointment pending approval email sent to specialist: {specialist_email}")
        except Exception as e:
            logger.error(f"Failed to send email to specialist {specialist_email}: {str(e)}")
    
    return patient_email_sent and specialist_email_sent

def send_patient_registration_completion_email(email: str, first_name: str, last_name: str):
    """
    Send registration completion email to patient
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Patient registration completion email for {email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "MindMate - Welcome! Registration Successful"
    msg["From"] = smtp_user
    msg["To"] = email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Welcome Aboard!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">🎉 Registration Successful!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear {first_name} {last_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Congratulations! Your registration with MindMate has been completed successfully. We're excited to have you join our forum of wellness and mental health.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #10b981; margin: 0 0 10px 0;">✅ What's Next?</h3>
                <ul style="text-align: left; color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Complete your profile to get personalized recommendations</li>
                    <li>Browse and connect with verified specialists</li>
                    <li>Schedule your first consultation</li>
                    <li>Access our wellness resources and tools</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">Get Started</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, our support team is here to help. Welcome to your journey towards better mental health!
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Welcome! Registration Successful
    
    Dear {first_name} {last_name},
    
            Congratulations! Your registration with MindMate has been completed successfully. We're excited to have you join our forum of wellness and mental health.
    
    What's Next?
    • Complete your profile to get personalized recommendations
    • Browse and connect with verified specialists
    • Schedule your first consultation
    • Access our wellness resources and tools
    
    If you have any questions or need assistance, our support team is here to help. Welcome to your journey towards better mental health!
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [email], text)
            
        logger.info(f"Patient registration completion email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Patient registration completion email failed: {str(e)}")
        return False

def send_specialist_registration_completion_email(email: str, first_name: str, last_name: str, specialization: str):
    """
    Send registration completion email to specialist with status pending
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Specialist registration completion email for {email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "MindMate - Registration Received - Pending Verification"
    msg["From"] = smtp_user
    msg["To"] = email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Specialist Registration</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">📋 Registration Received</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear Dr. {first_name} {last_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in joining MindMate as a verified specialist. We have successfully received your registration application.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0 0 15px 0;">📋 Application Details</h3>
                <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> Dr. {first_name} {last_name}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Specialization:</strong> {specialization}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> {email}</p>
                <p style="margin: 15px 0 5px 0; color: #f59e0b; font-weight: bold;">Status: Pending Verification</p>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
                <h3 style="color: #856404; margin: 0 0 10px 0;">⏳ What Happens Next?</h3>
                <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Our admin team will review your credentials and documentation</li>
                    <li>Verification process typically takes 2-5 business days</li>
                    <li>You'll receive an email notification once verification is complete</li>
                    <li>Upon approval, you'll gain full access to the MindMate platform</li>
                </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                We appreciate your patience during the verification process. If you have any questions or need to update your information, please contact our support team.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Registration Received - Pending Verification
    
    Dear Dr. {first_name} {last_name},
    
    Thank you for your interest in joining MindMate as a verified specialist. We have successfully received your registration application.
    
    Application Details:
    • Name: Dr. {first_name} {last_name}
    • Specialization: {specialization}
    • Email: {email}
    • Status: Pending Verification
    
    What Happens Next?
    • Our admin team will review your credentials and documentation
    • Verification process typically takes 2-5 business days
    • You'll receive an email notification once verification is complete
    • Upon approval, you'll gain full access to the MindMate platform
    
    We appreciate your patience during the verification process. If you have any questions or need to update your information, please contact our support team.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [email], text)
            
        logger.info(f"Specialist registration completion email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Specialist registration completion email failed: {str(e)}")
        return False

def send_specialist_approval_email(email: str, first_name: str, last_name: str, specialization: str, status: str, admin_notes: str = None):
    """
    Send approval status email to specialist (approved/rejected)
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Specialist verification email for {email} - Status: {status}")
        return True
    
    is_approved = status.lower() == "approved"
    subject = f"MindMate - Application {'Approved' if is_approved else 'Update Required'}"
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = email
    
    # Color scheme based on status
    if is_approved:
        gradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)"
        status_color = "#10b981"
        status_icon = "✅"
        status_text = "Approved"
        bg_color = "#d1fae5"
        border_color = "#10b981"
    else:
        gradient = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
        status_color = "#ef4444"
        status_icon = "❌"
        status_text = "Requires Attention"
        bg_color = "#fee2e2"
        border_color = "#ef4444"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: {gradient}; padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Verification Update</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">{status_icon} Application {status_text}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear Dr. {first_name} {last_name},
            </p>
    """
    
    if is_approved:
        html_body += f"""
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Congratulations! Your application to join MindMate as a verified specialist has been approved. Welcome to our platform!
            </p>
            
            <div style="background: {bg_color}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {border_color};">
                <h3 style="color: {status_color}; margin: 0 0 10px 0;">{status_icon} You're Now Verified!</h3>
                <ul style="color: #059669; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Your specialist profile is now active and visible to patients</li>
                    <li>You can start accepting consultation requests</li>
                    <li>Access to all specialist tools and features</li>
                    <li>Begin building your patient base on MindMate</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: {status_color}; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">Access Your Dashboard</a>
            </div>
        """
    else:
        html_body += f"""
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for your application to join MindMate. After reviewing your submission, we need some additional information before we can proceed with your verification.
            </p>
            
            <div style="background: {bg_color}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {border_color};">
                <h3 style="color: {status_color}; margin: 0 0 10px 0;">{status_icon} Action Required</h3>
        """
        
        if admin_notes:
            html_body += f'<p style="color: #991b1b; line-height: 1.6; margin: 0;"><strong>Admin Notes:</strong> {admin_notes}</p>'
        
        html_body += f"""
                <p style="color: #991b1b; line-height: 1.6; margin: 10px 0 0 0;">Please review the requirements and resubmit your application with the necessary updates.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: {status_color}; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">Update Application</a>
            </div>
        """
    
    html_body += f"""
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you have any questions about this decision, please don't hesitate to contact our support team.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Application {status_text}
    
    Dear Dr. {first_name} {last_name},
    
    """
    
    if is_approved:
        text_body += f"""Congratulations! Your application to join MindMate as a verified specialist has been approved. Welcome to our platform!
        
    You're Now Verified!
    • Your specialist profile is now active and visible to patients
    • You can start accepting consultation requests
    • Access to all specialist tools and features
    • Begin building your patient base on MindMate
    """
    else:
        text_body += f"""Thank you for your application to join MindMate. After reviewing your submission, we need some additional information before we can proceed with your verification.
        
    Action Required:"""
        if admin_notes:
            text_body += f"\nAdmin Notes: {admin_notes}"
        text_body += "\n\nPlease review the requirements and resubmit your application with the necessary updates."
    
    text_body += """
    
    If you have any questions about this decision, please don't hesitate to contact our support team.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [email], text)
            
        logger.info(f"Specialist verification email sent successfully to {email} - Status: {status}")
        return True
        
    except Exception as e:
        logger.error(f"Specialist verification email failed: {str(e)}")
        return False

def send_admin_specialist_registration_notification(admin_email: str, specialist_email: str, first_name: str, last_name: str, specialization: str, registration_date: str = None):
    """
    Send notification to admin when a new specialist registers
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Admin notification for new specialist registration: {specialist_email}")
        return True
    
    if not registration_date:
        registration_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "MindMate Admin - New Specialist Registration Pending"
    msg["From"] = smtp_user
    msg["To"] = admin_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate Admin</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">New Registration Alert</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">🔔 New Specialist Registration</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Hello Admin,
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                A new specialist has registered on MindMate and is awaiting verification. Please review their application and take appropriate action.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin: 0 0 15px 0;">👨‍⚕️ Specialist Details</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> Dr. {first_name} {last_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> {specialist_email}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Specialization:</strong> {specialization}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Registration Date:</strong> {registration_date}</p>
                    <p style="margin: 15px 0 5px 0; color: #f59e0b; font-weight: bold;">Status: Pending Verification</p>
                </div>
            </div>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #81d4fa;">
                <h3 style="color: #0277bd; margin: 0 0 10px 0;">📋 Required Actions</h3>
                <ul style="color: #0277bd; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Review specialist credentials and documentation</li>
                    <li>Verify professional licenses and certifications</li>
                    <li>Check background and references</li>
                    <li>Approve or reject the application with feedback</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">Review Application</a>
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Admin Dashboard</a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⚡ Quick Reminder:</strong> Please process this application within 2-5 business days to maintain our service quality standards.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate Admin Panel. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate Admin - New Specialist Registration Pending
    
    Hello Admin,
    
    A new specialist has registered on MindMate and is awaiting verification. Please review their application and take appropriate action.
    
    Specialist Details:
    • Name: Dr. {first_name} {last_name}
    • Email: {specialist_email}
    • Specialization: {specialization}
    • Registration Date: {registration_date}
    • Status: Pending Verification
    
    Required Actions:
    • Review specialist credentials and documentation
    • Verify professional licenses and certifications
    • Check background and references
    • Approve or reject the application with feedback
    
    Quick Reminder: Please process this application within 2-5 business days to maintain our service quality standards.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [admin_email], text)
            
        logger.info(f"Admin notification email sent successfully for specialist: {specialist_email}")
        return True
        
    except Exception as e:
        logger.error(f"Admin notification email failed: {str(e)}")
        return False


def send_login_notification_email(email: str, first_name: str, client_ip: str, login_time: datetime):
    """
    Send login notification email to patient
    Returns True if successful, False otherwise
    """
    try:
        # Format the login time
        formatted_time = login_time.strftime("%B %d, %Y at %I:%M %p UTC")
        
        # Create the email subject
        subject = "MindMate - Login Notification"
        
        # Create HTML content for the notification
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Login Notification</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">🔐 Account Access Alert</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Hello {first_name},
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    We're writing to let you know that your MindMate account was accessed successfully.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                    <h3 style="color: #667eea; margin: 0 0 15px 0;">📋 Login Details</h3>
                    <p style="margin: 5px 0; color: #666;"><strong>Date & Time:</strong> {formatted_time}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>IP Address:</strong> {client_ip}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Account Type:</strong> Patient</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #90caf9;">
                    <h3 style="color: #1976d2; margin: 0 0 10px 0;">🔒 Security Notice</h3>
                    <p style="color: #1976d2; font-size: 14px; line-height: 1.6; margin: 0;">
                        If this wasn't you, please secure your account immediately by changing your password and contacting our support team.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">Secure Account</a>
                    <a href="#" style="background: #f59e0b; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Contact Support</a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    Thank you for choosing MindMate for your mental health journey. Your security is our priority.
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© 2024 MindMate. All rights reserved.</p>
                <p>This is an automated security notification. Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """
        
        # Send the email using the existing notification function
        return send_notification_email(email, subject, html_content)
        
    except Exception as e:
        logger.error(f"Login notification email failed for {email}: {str(e)}")
        return False

def send_secret_code_email(email: str, first_name: str, action: str, timestamp: datetime):
    """
    Send secret code notification email (set/update/remove)
    Uses the existing send_notification_email function
    Returns True if successful, False otherwise
    
    Args:
        email: Recipient email address
        first_name: Patient's first name
        action: Action performed ('set', 'update', 'remove')
        timestamp: When the action was performed
    """
    try:
        # Format timestamp for display
        formatted_time = timestamp.strftime("%B %d, %Y at %I:%M %p UTC")
        
        # Determine action-specific content
        action_configs = {
            'set': {
                'subject': 'MindMate - Secret Code Set Successfully',
                'action_text': 'Set',
                'icon': '🔐',
                'color': '#10b981',
                'gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                'message': 'You have successfully set up a secret code for your account.',
                'benefits': [
                    'Enhanced account security',
                    'Additional verification layer',
                    'Protection against unauthorized access',
                    'Peace of mind for your personal data'
                ]
            },
            'update': {
                'subject': 'MindMate - Secret Code Updated Successfully',
                'action_text': 'Updated',
                'icon': '🔄',
                'color': '#3b82f6',
                'gradient': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                'message': 'Your secret code has been successfully updated.',
                'benefits': [
                    'Your account security remains strong',
                    'New secret code is now active',
                    'Previous code has been deactivated',
                    'Continue enjoying secure access'
                ]
            },
            'remove': {
                'subject': 'MindMate - Secret Code Removed',
                'action_text': 'Removed',
                'icon': '🔓',
                'color': '#f59e0b',
                'gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                'message': 'Your secret code has been removed from your account.',
                'benefits': [
                    'Secret code protection has been disabled',
                    'You can still set a new code anytime',
                    'Your account remains protected by password',
                    'Consider setting up a new code for enhanced security'
                ]
            }
        }
        
        config = action_configs.get(action.lower(), action_configs['set'])
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: {config['gradient']}; padding: 30px; border-radius: 10px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Security Update</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">{config['icon']} Secret Code {config['action_text']}</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Hello {first_name},
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    {config['message']}
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {config['color']};">
                    <h3 style="color: {config['color']}; margin: 0 0 10px 0;">📋 Security Details</h3>
                    <p style="margin: 5px 0; color: #666;"><strong>Action:</strong> Secret Code {config['action_text']}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Date & Time:</strong> {formatted_time}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Account:</strong> {email}</p>
                </div>
                
                <div style="background: #e0f7fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4dd0e1;">
                    <h3 style="color: #0097a7; margin: 0 0 10px 0;">✨ Security Benefits</h3>
                    <ul style="color: #0097a7; line-height: 1.8; margin: 0; padding-left: 20px;">"""
        
        # Add benefits list
        for benefit in config['benefits']:
            html_content += f'<li>{benefit}</li>'
        
        html_content += f"""
                    </ul>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>🛡️ Security Reminder:</strong> If you didn't perform this action, please contact our support team immediately and change your password.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background: {config['color']}; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">Access Your Account</a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    Thank you for keeping your MindMate account secure. If you have any questions about your account security, feel free to contact our support team.
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© 2024 MindMate. All rights reserved.</p>
                <p>This is an automated security notification.</p>
            </div>
        </body>
        </html>
        """
        
        # Use the existing send_notification_email function
        return send_notification_email(email, config['subject'], html_content)
        
    except Exception as e:
        logger.error(f"Error creating secret code email content: {str(e)}")
        return False

# )

def safe_enum_to_string(enum_value) -> str:
    """Safely convert enum to string for email functions"""
    if enum_value is None:
        return ""
    
    # If it's already a string, return it
    if isinstance(enum_value, str):
        return enum_value
    
    # If it's an enum, try to get its value
    if hasattr(enum_value, 'value'):
        return str(enum_value.value)
    
    # Otherwise, convert to string
    return str(enum_value)


def generate_otp():
    """Generate a 6-digit OTP using cryptographically secure random"""
    import secrets
    return ''.join(secrets.choice('0123456789') for _ in range(6))

def get_otp_expiry():
    """Get OTP expiry time (configurable, default 10 minutes from now)"""
    import os
    otp_expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
    return datetime.now(timezone.utc) + timedelta(minutes=otp_expiry_minutes)

def is_otp_valid(otp_expiry):
    """Check if OTP is still valid"""
    if not otp_expiry:
        return False
    
    try:
        # Ensure both datetimes have the same timezone awareness
        now = datetime.now(timezone.utc)
        
        # Handle timezone-naive datetime (assume UTC)
        if hasattr(otp_expiry, 'tzinfo') and otp_expiry.tzinfo is None:
            otp_expiry = otp_expiry.replace(tzinfo=timezone.utc)
        # Handle timezone-aware datetime - convert to UTC if needed
        elif hasattr(otp_expiry, 'tzinfo') and otp_expiry.tzinfo is not None:
            otp_expiry = otp_expiry.astimezone(timezone.utc)
        
        return now < otp_expiry
    except (AttributeError, TypeError) as e:
        # Handle cases where otp_expiry might not be a datetime object
        logger.error(f"Invalid datetime object for OTP expiry: {e}")
        return False
    except Exception as e:
        logger.error(f"Error comparing OTP expiry times: {e}")
        return False

def get_admin_emails_for_notifications(db) -> list:
    """
    Get all active admin emails for notifications
    Returns list of admin email addresses
    """
    try:
        from app.models.admin import Admin, AdminStatusEnum
        
        admins = db.query(Admin).filter(
            Admin.is_active == True,
            Admin.status == AdminStatusEnum.ACTIVE,
            Admin.is_deleted == False
        ).all()
        
        return [admin.email for admin in admins]
    except Exception as e:
        logger.error(f"Error fetching admin emails: {e}")
        return []

def send_admin_notification_email(admin_email: str, specialist_data: dict):
    """
    Send notification to admin about new specialist registration
    Wrapper around send_admin_specialist_registration_notification
    """
    try:
        return send_admin_specialist_registration_notification(
            admin_email=admin_email,
            specialist_email=specialist_data.get("email", ""),
            first_name=specialist_data.get("first_name", ""),
            last_name=specialist_data.get("last_name", ""),
            specialization=specialist_data.get("specialization", "Mental Health"),
            registration_date=specialist_data.get("registration_date", None)
        )
    except Exception as e:
        logger.error(f"Error sending admin notification: {e}")
        return False

# ============================================================================
# APPOINTMENT WORKFLOW EMAIL NOTIFICATIONS
# ============================================================================

def send_appointment_request_notification(specialist_email: str, specialist_name: str, patient_name: str, presenting_concern: str, request_message: str = None, consultation_mode: str = "online", fee: float = 0):
    """
    Send notification to specialist about new appointment request
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Appointment request notification for {specialist_email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MindMate - New Appointment Request from {patient_name}"
    msg["From"] = smtp_user
    msg["To"] = specialist_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">New Appointment Request</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">📅 New Appointment Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear Dr. {specialist_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You have received a new appointment request from a patient. Please review the details below and respond accordingly.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin: 0 0 15px 0;">👤 Patient Details</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Patient Name:</strong> {patient_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Consultation Mode:</strong> {consultation_mode.replace('_', ' ').title()}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Proposed Fee:</strong> PKR {fee:,.0f}</p>
                    <p style="margin: 15px 0 5px 0; color: #f59e0b; font-weight: bold;">Status: Pending Your Response</p>
                </div>
            </div>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #81d4fa;">
                <h3 style="color: #0277bd; margin: 0 0 10px 0;">📋 Patient's Concern</h3>
                <p style="color: #0277bd; line-height: 1.6; margin: 0; font-style: italic;">"{presenting_concern}"</p>
            </div>
            
            {f'''
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
                <h3 style="color: #0369a1; margin: 0 0 10px 0;">💬 Additional Message</h3>
                <p style="color: #0369a1; line-height: 1.6; margin: 0; font-style: italic;">"{request_message}"</p>
            </div>
            ''' if request_message else ''}
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⏰ Action Required:</strong> Please respond to this request within 24 hours to maintain our service quality standards.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">Review Request</a>
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Specialist Dashboard</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Thank you for providing quality mental health care through MindMate. Your timely response helps patients get the help they need.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - New Appointment Request
    
    Dear Dr. {specialist_name},
    
    You have received a new appointment request from a patient. Please review the details below and respond accordingly.
    
    Patient Details:
    • Patient Name: {patient_name}
    • Consultation Mode: {consultation_mode.replace('_', ' ').title()}
    • Proposed Fee: PKR {fee:,.0f}
    • Status: Pending Your Response
    
    Patient's Concern:
    "{presenting_concern}"
    
    {f'Additional Message: "{request_message}"' if request_message else ''}
    
    Action Required: Please respond to this request within 24 hours to maintain our service quality standards.
    
    Thank you for providing quality mental health care through MindMate.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [specialist_email], text)
            
        logger.info(f"Appointment request notification sent successfully to {specialist_email}")
        return True
        
    except Exception as e:
        logger.error(f"Appointment request notification failed: {str(e)}")
        return False

def send_appointment_approved_notification(patient_email: str, patient_name: str, specialist_name: str, scheduled_start: str, scheduled_end: str, consultation_mode: str = "online", specialist_message: str = None):
    """
    Send notification to patient about approved appointment
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Appointment approved notification for {patient_email}")
        return True
    
    # Format the scheduled time
    try:
        from datetime import datetime
        start_dt = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(scheduled_end.replace('Z', '+00:00'))
        formatted_date = start_dt.strftime("%B %d, %Y")
        formatted_start_time = start_dt.strftime("%I:%M %p")
        formatted_end_time = end_dt.strftime("%I:%M %p")
    except:
        formatted_date = "TBD"
        formatted_start_time = "TBD"
        formatted_end_time = "TBD"
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MindMate - Your Appointment with Dr. {specialist_name} Has Been Approved!"
    msg["From"] = smtp_user
    msg["To"] = patient_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Appointment Approved!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">🎉 Great News!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear {patient_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Your appointment request with Dr. {specialist_name} has been approved! We're excited to help you on your mental health journey.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #10b981; margin: 0 0 15px 0;">📅 Appointment Details</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Specialist:</strong> Dr. {specialist_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> {formatted_date}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> {formatted_start_time} - {formatted_end_time}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Mode:</strong> {consultation_mode.replace('_', ' ').title()}</p>
                    <p style="margin: 15px 0 5px 0; color: #10b981; font-weight: bold;">Status: Confirmed</p>
                </div>
            </div>
            
            {f'''
            <div style="background: #e0f7fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4dd0e1;">
                <h3 style="color: #0097a7; margin: 0 0 10px 0;">💬 Message from Dr. {specialist_name}</h3>
                <p style="color: #0097a7; line-height: 1.6; margin: 0; font-style: italic;">"{specialist_message}"</p>
            </div>
            ''' if specialist_message else ''}
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #6ee7b7;">
                <h3 style="color: #059669; margin: 0 0 10px 0;">✅ Next Steps</h3>
                <ul style="color: #059669; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Mark your calendar for the appointment time</li>
                    <li>Prepare any questions or concerns you'd like to discuss</li>
                    <li>Ensure you have a stable internet connection (for online sessions)</li>
                    <li>You'll receive a reminder 24 hours before your appointment</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">View Appointment</a>
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Patient Dashboard</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you need to reschedule or have any questions, please contact us or your specialist directly. We're here to support you every step of the way.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Your Appointment Has Been Approved!
    
    Dear {patient_name},
    
    Your appointment request with Dr. {specialist_name} has been approved! We're excited to help you on your mental health journey.
    
    Appointment Details:
    • Specialist: Dr. {specialist_name}
    • Date: {formatted_date}
    • Time: {formatted_start_time} - {formatted_end_time}
    • Mode: {consultation_mode.replace('_', ' ').title()}
    • Status: Confirmed
    
    {f'Message from Dr. {specialist_name}: "{specialist_message}"' if specialist_message else ''}
    
    Next Steps:
    • Mark your calendar for the appointment time
    • Prepare any questions or concerns you'd like to discuss
    • Ensure you have a stable internet connection (for online sessions)
    • You'll receive a reminder 24 hours before your appointment
    
    If you need to reschedule or have any questions, please contact us or your specialist directly.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [patient_email], text)
            
        logger.info(f"Appointment approved notification sent successfully to {patient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Appointment approved notification failed: {str(e)}")
        return False

def send_appointment_rejected_notification(patient_email: str, patient_name: str, specialist_name: str, rejection_reason: str, specialist_message: str = None):
    """
    Send notification to patient about rejected appointment
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Appointment rejected notification for {patient_email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MindMate - Update on Your Appointment Request with Dr. {specialist_name}"
    msg["From"] = smtp_user
    msg["To"] = patient_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Appointment Update</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">📋 Appointment Update</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear {patient_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We wanted to update you on your appointment request with Dr. {specialist_name}. Unfortunately, your request could not be accommodated at this time.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0 0 15px 0;">📋 Request Details</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Specialist:</strong> Dr. {specialist_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> Not Available</p>
                    <p style="margin: 15px 0 5px 0; color: #f59e0b; font-weight: bold;">Reason: {rejection_reason}</p>
                </div>
            </div>
            
            {f'''
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">💬 Message from Dr. {specialist_name}</h3>
                <p style="color: #92400e; line-height: 1.6; margin: 0; font-style: italic;">"{specialist_message}"</p>
            </div>
            ''' if specialist_message else ''}
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #81d4fa;">
                <h3 style="color: #0277bd; margin: 0 0 10px 0;">🔄 Alternative Options</h3>
                <ul style="color: #0277bd; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Browse other available specialists in your area</li>
                    <li>Try requesting an appointment for a different time</li>
                    <li>Consider online consultation options</li>
                    <li>Contact our support team for personalized recommendations</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">Find Other Specialists</a>
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Contact Support</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Don't worry - there are many qualified specialists available to help you. We're committed to connecting you with the right mental health professional for your needs.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Appointment Update
    
    Dear {patient_name},
    
    We wanted to update you on your appointment request with Dr. {specialist_name}. Unfortunately, your request could not be accommodated at this time.
    
    Request Details:
    • Specialist: Dr. {specialist_name}
    • Status: Not Available
    • Reason: {rejection_reason}
    
    {f'Message from Dr. {specialist_name}: "{specialist_message}"' if specialist_message else ''}
    
    Alternative Options:
    • Browse other available specialists in your area
    • Try requesting an appointment for a different time
    • Consider online consultation options
    • Contact our support team for personalized recommendations
    
    Don't worry - there are many qualified specialists available to help you.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [patient_email], text)
            
        logger.info(f"Appointment rejected notification sent successfully to {patient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Appointment rejected notification failed: {str(e)}")
        return False

def send_session_started_notification(patient_email: str, patient_name: str, specialist_name: str, session_id: str):
    """
    Send notification to patient when session starts
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Session started notification for {patient_email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MindMate - Your Session with Dr. {specialist_name} Has Started"
    msg["From"] = smtp_user
    msg["To"] = patient_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Session Started</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">🎯 Your Session Has Started!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear {patient_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Your therapy session with Dr. {specialist_name} has officially begun. You can now join the session and start your consultation.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h3 style="color: #8b5cf6; margin: 0 0 15px 0;">🎯 Session Details</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Specialist:</strong> Dr. {specialist_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Session ID:</strong> {session_id}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> Active</p>
                    <p style="margin: 15px 0 5px 0; color: #8b5cf6; font-weight: bold;">Ready to Join</p>
                </div>
            </div>
            
            <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c4b5fd;">
                <h3 style="color: #7c3aed; margin: 0 0 10px 0;">💡 Session Tips</h3>
                <ul style="color: #7c3aed; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Find a quiet, comfortable space for your session</li>
                    <li>Ensure you have a stable internet connection</li>
                    <li>Have any relevant documents or notes ready</li>
                    <li>Be open and honest about your concerns</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #8b5cf6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">Join Session</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you're having trouble joining the session, please contact our support team immediately.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Your Session Has Started
    
    Dear {patient_name},
    
    Your therapy session with Dr. {specialist_name} has officially begun. You can now join the session and start your consultation.
    
    Session Details:
    • Specialist: Dr. {specialist_name}
    • Session ID: {session_id}
    • Status: Active
    • Ready to Join
    
    Session Tips:
    • Find a quiet, comfortable space for your session
    • Ensure you have a stable internet connection
    • Have any relevant documents or notes ready
    • Be open and honest about your concerns
    
    If you're having trouble joining the session, please contact our support team immediately.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [patient_email], text)
            
        logger.info(f"Session started notification sent successfully to {patient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Session started notification failed: {str(e)}")
        return False

def send_session_completed_notification(patient_email: str, patient_name: str, specialist_name: str, session_id: str):
    """
    Send notification to patient when session is completed
    Returns True if successful, False otherwise
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        logger.warning("SMTP configuration not found. Email will not be sent.")
        logger.info(f"DEV MODE: Session completed notification for {patient_email}")
        return True
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MindMate - Your Session with Dr. {specialist_name} Has Ended"
    msg["From"] = smtp_user
    msg["To"] = patient_email
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">MindMate</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Session Completed</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">✅ Session Completed</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Dear {patient_name},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Your therapy session with Dr. {specialist_name} has been completed. Thank you for taking this important step in your mental health journey.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
                <h3 style="color: #6b7280; margin: 0 0 15px 0;">📋 Session Summary</h3>
                <div style="display: grid; gap: 8px;">
                    <p style="margin: 5px 0; color: #666;"><strong>Specialist:</strong> Dr. {specialist_name}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Session ID:</strong> {session_id}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> Completed</p>
                    <p style="margin: 15px 0 5px 0; color: #6b7280; font-weight: bold;">Ready for Review</p>
                </div>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
                <h3 style="color: #0369a1; margin: 0 0 10px 0;">⭐ Share Your Experience</h3>
                <p style="color: #0369a1; line-height: 1.6; margin: 0;">
                    Your feedback helps us improve our services and helps other patients find the right specialists. Please take a moment to review your session.
                </p>
            </div>
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #6ee7b7;">
                <h3 style="color: #059669; margin: 0 0 10px 0;">🔄 Next Steps</h3>
                <ul style="color: #059669; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Review your session and provide feedback</li>
                    <li>Follow any recommendations from your specialist</li>
                    <li>Schedule follow-up appointments if needed</li>
                    <li>Continue your mental health journey</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #f59e0b; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 10px;">Leave Review</a>
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">Schedule Follow-up</a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Thank you for choosing MindMate for your mental health care. We hope this session was helpful and look forward to supporting you on your journey.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 MindMate. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    MindMate - Your Session Has Been Completed
    
    Dear {patient_name},
    
    Your therapy session with Dr. {specialist_name} has been completed. Thank you for taking this important step in your mental health journey.
    
    Session Summary:
    • Specialist: Dr. {specialist_name}
    • Session ID: {session_id}
    • Status: Completed
    • Ready for Review
    
    Share Your Experience:
    Your feedback helps us improve our services and helps other patients find the right specialists. Please take a moment to review your session.
    
    Next Steps:
    • Review your session and provide feedback
    • Follow any recommendations from your specialist
    • Schedule follow-up appointments if needed
    • Continue your mental health journey
    
    Thank you for choosing MindMate for your mental health care.
    """
    
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, [patient_email], text)
            
        logger.info(f"Session completed notification sent successfully to {patient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Session completed notification failed: {str(e)}")
        return False

__all__ = [
    #all functions in this file utils/email_utils.py with their signatures in comments
    
    
    "send_verification_email",
    # send_verification_email(email: str, otp: str, user_type=None, user_name=None):
    # """
    # Send verification email with OTP
    # Returns True if successful, False otherwise
    # """
    
    "send_password_reset_email",
    #send_password_reset_email(email: str, reset_token: str, first_name: str = None):
     # """ Send password reset email with token
    # Returns True if successful, False otherwise
    # """
     
    "send_notification_email",
    # send_notification_email(to_email: str, subject: str, content: str):
    #"""Send a notification email to the specified recipient.
    # Returns True if successful, False otherwise
    #"""
    
    "send_secret_code_email",
    #  send_secret_code_email(email: str, first_name: str, action: str, timestamp: datetime):
    # """
    # Send secret code notification email (set/update/remove)
    # Uses the existing send_notification_email function
    # Returns True if successful, False otherwise
    # 
    # Args:
        # email: Recipient email address
        # first_name: Patient's first name
        # action: Action performed ('set', 'update', 'remove')
        # timestamp: When the action was performed
    # """
    
    "send_login_notification_email",
    #send_login_notification_email(email: str, first_name: str, client_ip: str, login_time: datetime):
    # """
    # Send login notification email to patient
    # Returns True if successful, False otherwise
    # """
    # "send_patient_registration_completion_email"
    
    
    # send_specialist_registration_completion_email(email: str, first_name: str, last_name: str, specialization: str):
    #"""Send registration completion email to patient
    # Returns True if successful, False otherwise
    #"""
    
    "send_specialist_registration_completion_email",
    # send_specialist_registration_completion_email(email: str, first_name: str, last_name: str, specialization: str):
    #"""Send registration completion email to specialist with status pending
    # Returns True if successful, False otherwise
    #"""
    
    "send_specialist_approval_email",
    # send_specialist_approval_email(email: str, first_name: str, last_name: str, specialization: str, status: str, admin_notes: str = None):
    #"""Send approval status email to specialist (approved/rejected)
    # Returns True if successful, False otherwise
    #"""
    
    "send_admin_specialist_registration_notification"
    # send_admin_specialist_registration_notification(admin_email: str, specialist_email: str, first_name: str, last_name: str, specialization: str, registration_date: str = None):
    # """Send notification to admin when a new specialist registers
    # Returns True if successful, False otherwise
    #"""
    
    "generate_otp",
    # generate_otp():
    # """Generate a 6-digit OTP"""
    
    
    "get_otp_expiry",
    # get_otp_expiry():
    # """Get OTP expiry time (10 minutes from now)"""
    
    "is_otp_valid",
    # is_otp_valid(otp_expiry: datetime) -> bool:    
    # """Check if OTP is still valid"""
    
    "get_admin_emails_for_notifications",
    # get_admin_emails_for_notifications(db) -> list:
    # """Get all active admin emails for notifications"""
    
    "send_admin_notification_email",
    # send_admin_notification_email(admin_email: str, specialist_data: dict):
    # """Send notification to admin about new specialist registration"""
    
    # Appointment Workflow Email Functions
    "send_appointment_request_notification",
    # send_appointment_request_notification(specialist_email: str, specialist_name: str, patient_name: str, presenting_concern: str, request_message: str = None, consultation_mode: str = "online", fee: float = 0):
    # """Send notification to specialist about new appointment request"""
    
    "send_appointment_approved_notification",
    # send_appointment_approved_notification(patient_email: str, patient_name: str, specialist_name: str, scheduled_start: str, scheduled_end: str, consultation_mode: str = "online", specialist_message: str = None):
    # """Send notification to patient about approved appointment"""
    
    "send_appointment_rejected_notification",
    # send_appointment_rejected_notification(patient_email: str, patient_name: str, specialist_name: str, rejection_reason: str, specialist_message: str = None):
    # """Send notification to patient about rejected appointment"""
    
    "send_session_started_notification",
    # send_session_started_notification(patient_email: str, patient_name: str, specialist_name: str, session_id: str):
    # """Send notification to patient when session starts"""
    
    "send_session_completed_notification",
    # send_session_completed_notification(patient_email: str, patient_name: str, specialist_name: str, session_id: str):
    # """Send notification to patient when session is completed"""

]





