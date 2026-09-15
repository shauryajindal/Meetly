import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/api-response.js"
import {
  registerUser, loginUser,
  refreshSession, logoutUser, logoutAllSessions
  , verifyEmailService, resendVerificationOtp,
  forgotPasswordService, resetPasswordService,
  googleLoginService
} from "../services/auth.service.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/api-error.js"
import { googleClient } from "../config/google.auth.js"

export const register = asyncHandler(async (req, res) => {
  const { fullname,username, email, password } = req.body

  const user = await registerUser({fullname, username, email, password })

  return res.status(201).json(new ApiResponse(201,user,"User registered successfully"))
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body 

  const result = await loginUser({ email, password ,userAgent:req.headers["user-agent"],ipAddress:req.ip})

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.status(200).json(new ApiResponse(200, {
    user: result.user,
    accessToken: result.accessToken
  }, "Login successfull"))
})

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "-password"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        id: user._id,
        name: user.fullname,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
      },
      "User fetched successfully"
    )
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const  refreshToken = req.cookies.refreshToken 
  const result = await refreshSession({ refreshToken })

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.status(200).json(new ApiResponse(200, {
    accessToken:result.accessToken
  }, "Access Token refreshed successfully"))
  
})

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  console.log("LOGOUT REFRESH TOKEN EXISTS:", !!refreshToken);

  await logoutUser({ refreshToken });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json(
    new ApiResponse(200, {}, "User logged out successfully")
  );
});

export const logoutAll = asyncHandler(async (req, res) => {
  await logoutAllSessions({
    userId: req.user.userId
  });

  res.clearCookie("refreshToken");

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Logged out from all sessions successfully"
    )
  );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const result = await verifyEmailService({
    email,
    otp
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      "Email verified successfully"
    )
  );
});

export const resendVerificationOtpController = asyncHandler(
  async (req, res) => {
    const { email } = req.body;

    const result = await resendVerificationOtp({
      email
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Verification OTP resent successfully"
      )
    );
  }
);

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  const result = await forgotPasswordService({ email })

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      "Password reset OTP sent successfully"
    )
  );
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await resetPasswordService({ email, otp, newPassword })

  res.status(200).json(
    new ApiResponse(200,
      result,
    "Password reset successfully"
    )
  )
})

export const googleLoginController = asyncHandler(async (req, res) => {
  const { code } = req.query;

  const result = await googleLoginService({
    code,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(
      `${process.env.FRONTEND_URL}/pages/dashboard.html?accessToken=${result.accessToken}`
  );
});

export const googleAuthRedirectController = asyncHandler(async (req, res) => {
  const authUrl =  googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt:"select_account"
  })
  console.log("GOOGLE AUTH URL:", authUrl);
  res.redirect(authUrl)
})