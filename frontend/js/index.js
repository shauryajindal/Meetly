import { getMeApi } from "./api.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("roomId");

async function routeFromRoot() {

  // ==================================================
  // MEETING ROUTE
  // ==================================================

  // If a roomId exists, this is a meeting URL.
  // Load the existing meeting application.
  if (roomId) {
    document.body.style.visibility = "visible";

    await import("./app.js");

    return;
  }


  // ==================================================
  // AUTH ROUTE
  // ==================================================

  try {

    // This also allows the existing refresh-token
    // mechanism in authFetch() to restore the session.
    await getMeApi();

    // User is authenticated.
    window.location.replace("/pages/dashboard.html");

  } catch (error) {

    console.log("No authenticated session.");

    // User is not authenticated.
    window.location.replace("/pages/login.html");
  }
}

routeFromRoot();