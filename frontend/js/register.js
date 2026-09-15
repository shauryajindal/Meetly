import { setAccessToken } from "./auth.js";

const API_BASE_URL = CONFIG.API_BASE_URL;

const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const googleButton = document.getElementById("googleButton");
const errorMessage = document.getElementById("errorMessage");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullname = document.getElementById("fullname").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword =
    document.getElementById("confirmPassword").value;

  errorMessage.textContent = "";

  // Frontend password confirmation
  if (password !== confirmPassword) {
    errorMessage.textContent = "Passwords do not match";
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = "Creating account...";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        fullname,
        username,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    console.log("Registration successful:", data.data);

    /*
      Registration does NOT log the user in.

      The backend has already:
      1. Created the user
      2. Created the verification OTP
      3. Sent the OTP to the user's email
    */

    window.location.href =
      `/pages/verify.html?email=${encodeURIComponent(email)}`;

  } catch (error) {
    console.error("Registration error:", error);
    errorMessage.textContent = error.message;
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = "Create Account";
  }
});


googleButton.addEventListener("click", () => {
  window.location.href = `${API_BASE_URL}/auth/google`;
});