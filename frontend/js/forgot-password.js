const API_BASE_URL = CONFIG.API_BASE_URL;

const forgotPasswordForm =
  document.getElementById("forgotPasswordForm");

const sendOtpButton =
  document.getElementById("sendOtpButton");

const errorMessage =
  document.getElementById("errorMessage");

const successMessage =
  document.getElementById("successMessage");


forgotPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();

  errorMessage.textContent = "";
  successMessage.textContent = "";

  sendOtpButton.disabled = true;
  sendOtpButton.textContent = "Sending...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to send reset OTP"
      );
    }

    console.log("Password reset OTP sent:", data);

    successMessage.textContent =
      "Password reset OTP sent. Redirecting...";

    setTimeout(() => {
      window.location.href =
        `/pages/reset-password.html?email=${encodeURIComponent(email)}`;
    }, 1000);

  } catch (error) {
    console.error("Forgot password error:", error);

    errorMessage.textContent = error.message;

  } finally {
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = "Send OTP";
  }
});