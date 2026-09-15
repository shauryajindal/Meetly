const API_BASE_URL = CONFIG.API_BASE_URL;

const resetPasswordForm =
  document.getElementById("resetPasswordForm");

const resetButton =
  document.getElementById("resetButton");

const errorMessage =
  document.getElementById("errorMessage");

const successMessage =
  document.getElementById("successMessage");


const params = new URLSearchParams(window.location.search);
const email = params.get("email");


if (!email) {
  errorMessage.textContent =
    "No email address provided.";

  resetButton.disabled = true;
}


resetPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const otp = document.getElementById("otp").value.trim();
  const newPassword =
    document.getElementById("newPassword").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;

  errorMessage.textContent = "";
  successMessage.textContent = "";


  if (!/^\d{6}$/.test(otp)) {
    errorMessage.textContent =
      "Please enter a valid 6-digit OTP.";

    return;
  }


  if (newPassword !== confirmPassword) {
    errorMessage.textContent =
      "Passwords do not match.";

    return;
  }


  resetButton.disabled = true;
  resetButton.textContent = "Resetting...";


  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/reset-password`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      }
    );


    const data = await response.json();


    if (!response.ok) {
      throw new Error(
        data.message || "Password reset failed"
      );
    }


    console.log("Password reset successful:", data);


    successMessage.textContent =
      "Password reset successfully. Redirecting to login...";


    setTimeout(() => {
      window.location.href =
        "/pages/login.html";
    }, 1500);

  } catch (error) {

    console.error(
      "Password reset error:",
      error
    );

    errorMessage.textContent =
      error.message;

  } finally {

    resetButton.disabled = false;
    resetButton.textContent = "Reset Password";
  }
});