const RESEND_API_URL = "https://api.resend.com/emails";

export const verifyEmailConnection = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return;
  }

  console.log("Resend email service is configured");
};

export const sendVerificationEmail = async ({ email, otp }) => {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `Zoom Clone <onboarding@resend.dev>`,
      to: [email],
      subject: "Verify your email",
      text: `Your email verification OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <h2>Verify your email</h2>
        <p>Your email verification OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Resend email failed:", data);
    throw new Error(data.message || "Failed to send email");
  }

  console.log("Verification email sent:", data.id);

  return data;
};
