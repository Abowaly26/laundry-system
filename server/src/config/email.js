const nodemailer = require('nodemailer');

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send an OTP email
 * @param {string} to - Recipient email
 * @param {string} code - The 6-digit OTP code
 * @param {string} name - Recipient name
 */
const sendOTPEmail = async (to, code, name) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP credentials not configured. OTP email will not be sent, but code is generated.');
    return;
  }

  const mailOptions = {
    from: `"نظام إدارة المغسلة" <${process.env.SMTP_EMAIL}>`,
    to: to,
    subject: 'رمز التحقق (OTP) لتحديث بيانات حسابك',
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; color: #333;">
        <h2>مرحباً ${name}،</h2>
        <p>لقد طلبت تحديث بيانات حسابك في نظام إدارة المغسلة.</p>
        <p>رمز التحقق الخاص بك هو:</p>
        <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
          ${code}
        </div>
        <p>هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط.</p>
        <p>إذا لم تطلب هذا التغيير، يرجى تجاهل هذه الرسالة أو التواصل مع الإدارة.</p>
        <br/>
        <p>مع تحيات،</p>
        <p>إدارة النظام</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendOTPEmail
};
