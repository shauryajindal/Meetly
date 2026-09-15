import nodemailer from "nodemailer";

console.log("SMTP HOST:", process.env.SMTP_HOST);
console.log("SMTP PORT:", process.env.SMTP_PORT);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});


export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("SMTP server is ready");
  } catch (error) {
    console.error("SMTP connection failed:", error);
  }
};

export const sendVerificationEmail = async ({ email, otp }) => {
  await transporter.sendMail({
    from: `"Zoom Clone" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Verify your email",
    text: `Your email verification OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <h2>Verify your email</h2>
      <p>Your verification OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP expires in 10 minutes.</p>
    `
  });
};