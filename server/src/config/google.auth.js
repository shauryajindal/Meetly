import { OAuth2Client } from "google-auth-library"

console.log("GOOGLE CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE CLIENT SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "LOADED" : "MISSING");
console.log("GOOGLE CALLBACK:", process.env.GOOGLE_CALLBACK_URL);
export const googleClient = new OAuth2Client(
  
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
)