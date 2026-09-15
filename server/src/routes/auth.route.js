import express from "express"
import {
  register, login, getMe, refresh, logout, logoutAll, verifyEmail, resendVerificationOtpController,
  forgotPassword,resetPassword,googleAuthRedirectController,googleLoginController} from "../controllers/auth.controller.js"
import authMiddleware from "../middlewares/auth.middleware.js";


const router = express.Router()

router.post("/register", register)

router.post("/login", login);

router.get("/me", authMiddleware, getMe);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.post(
  "/logout-all",
  authMiddleware,
  logoutAll
);

router.post("/verify-email", verifyEmail);

router.post(
  "/resend-verification",
  resendVerificationOtpController
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);
router.get("/google", googleAuthRedirectController);

router.get("/google/callback", googleLoginController);

export default router