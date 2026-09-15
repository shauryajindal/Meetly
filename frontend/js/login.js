console.log("LOGIN.JS LOADED");
import { setAccessToken } from "./auth.js";
import { getMeApi } from "./api.js";


const API_BASE_URL = CONFIG.API_BASE_URL;

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  console.log("LOGIN FORM SUBMITTED");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  errorMessage.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
     "Content-Type":"application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        email,password
      })
    })

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    const accessToken = data.data.accessToken;

    setAccessToken(accessToken);

    console.log("Login successful:", data.data.user);
    const meData = await getMeApi();
    
    console.log("CURRENT USER:", meData);


    window.location.href = "/pages/dashboard.html";
    console.log("ACCESS TOKEN SAVED");
  } catch (error) {
    console.error("Login error:", error);
   
       errorMessage.textContent = error.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }

  
})