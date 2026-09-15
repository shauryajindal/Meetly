const API_BASE_URL = CONFIG.API_BASE_URL;

const verifyForm = document.getElementById("verifyForm");
const verifyButton = document.getElementById("verifyButton");
const resendButton = document.getElementById("resendButton");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

const params = new URLSearchParams(window.location.search);
const email = params.get("email");

if (!email) {
  errorMessage.textContent = "No email address provided.";
  verifyButton.disabled = true;
  resendButton.disabled = true;
}


// -------------------------
// VERIFY OTP
// -------------------------

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const otp = document.getElementById("otp").value.trim();

  errorMessage.textContent = "";
  successMessage.textContent = "";

  if (!/^\d{6}$/.test(otp)) {
    errorMessage.textContent = "Please enter a valid 6-digit OTP.";
    return;
  }

  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/verify-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          otp,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Email verification failed"
      );
    }

    console.log("Email verified:", data);

    successMessage.textContent =
      "Email verified successfully. Redirecting to login...";

    setTimeout(() => {
      window.location.href = "/pages/login.html";
    }, 1500);

  } catch (error) {
    console.error("Verification error:", error);
    errorMessage.textContent = error.message;

  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify Email";
  }
});


// -------------------------
// RESEND OTP
// -------------------------

resendButton.addEventListener("click", async () => {

  errorMessage.textContent = "";
  successMessage.textContent = "";

  if (!email) {
    errorMessage.textContent = "No email address provided.";
    return;
  }

  resendButton.disabled = true;
  resendButton.textContent = "Sending...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/resend-verification`,
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
        data.message || "Failed to resend OTP"
      );
    }

    console.log("OTP resent:", data);

    successMessage.textContent =
      "A new verification OTP has been sent to your email.";

  } catch (error) {
    console.error("Resend OTP error:", error);
    errorMessage.textContent = error.message;

  } finally {
    resendButton.disabled = false;
    resendButton.textContent = "Resend OTP";
  }
});