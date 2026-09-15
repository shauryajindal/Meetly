import bcrypt from "bcrypt"
import { User } from "../models/user.model.js"
import ApiError from "../utils/api-error.js"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js"
import { Session } from "../models/sessions.model.js"
import { PasswordReset } from "../models/password-reset.model.js"
import { AuthIdentity } from "../models/AuthIdentity.model.js"
import { EmailVerification } from "../models/emailVerification.model.js"
import { sendVerificationEmail } from "./email.service.js";
import { googleClient } from "../config/google.auth.js"
import { createSessionForUser } from "./session.service.js";

export const registerUser = async ({ fullname,username, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await User.findOne({ email: normalizedEmail })

  if (existingUser) {
    throw new ApiError(409,"User already exists")
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await User.create({
    fullname,
    username: username,
    email: normalizedEmail,
  })
  await AuthIdentity.create({
    user: user._id,
    provider: "password",
    providerAccountId: null,
    passwordHash:hashedPassword
  })

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const otpHash = await bcrypt.hash(otp, 12)

  await EmailVerification.create({
     user: user._id,
     otpHash,
     expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  await sendVerificationEmail({
    email: user.email,
    otp
  });

  console.log("EMAIL VERIFICATION OTP:", otp);
  
  return {
    id:user._id,
    email: user.email,
    name: user.fullname,
    bio: user.bio,
    avatar:user.avatar
  }
}

export const loginUser = async ({ email, password, ipAddress, userAgent }) => {
  const normalizedEmail = email.toLowerCase().trim()

  const user = await User.findOne({ email: normalizedEmail })

  if (!user) {
    throw new ApiError(401,"Invalid email or password")
  }
  if (!user.emailVerified) {
    throw new ApiError(
      403,
      "Please verify your email before logging in"
    );
  }
  
  const identity = await AuthIdentity.findOne({
    user: user._id,
    provider:"password"
  }).select("+passwordHash")

  if (!identity) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordCorrect = await bcrypt.compare(password, identity.passwordHash)


  if (!isPasswordCorrect) {
    throw new ApiError(401,"Password is incorrect")
  }

  const sessionTokens = await createSessionForUser({
    userId: user._id,
    userAgent,
    ipAddress
  });
  
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio:user.bio
    },
    accessToken: sessionTokens.accessToken,
     refreshToken: sessionTokens.refreshToken
 }
  
}

export const refreshSession = async ({ refreshToken }) => {
   console.log("SERVICE GOT:", !!refreshToken);
  if (!refreshToken) {
    throw new ApiError(401,"Refresh Token required")
  }

  let decodedToken;

  try {
    decodedToken=verifyRefreshToken(refreshToken)
  } catch (err) {
    throw new ApiError(401,"Invalid or xpired refresh token")
  }

  const session = await Session.findOne({
    user: decodedToken.userId,
    _id:decodedToken.sessionId,
    revokedAt:null
  }).select("+refreshTokenHash")
  
  if (!session) {
    throw new ApiError(401, "Session not found or revoked");
  }

  const isTokenValid = await bcrypt.compare(
    refreshToken,
    session.refreshTokenHash
  );

  if (!isTokenValid) {
     throw new ApiError(401, "Invalid refresh token");
   }
 
   if (session.expiresAt < new Date()) {
     throw new ApiError(401, "Session expired");
  }
  
   const newAccessToken = generateAccessToken({
     userId: decodedToken.userId,
   });
 
   const newRefreshToken = generateRefreshToken({
     userId: decodedToken.userId,
     sessionId:session._id
   });

   const newRefreshTokenHash = await bcrypt.hash(
      newRefreshToken,
      12
    );
  
    session.refreshTokenHash = newRefreshTokenHash;
  session.lastUsedAt = new Date();
  
    await session.save();
  
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
}

export const logoutUser = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new ApiError(401,"refreshToken is required")
  }
  let decodedToken;

  try {
    decodedToken=verifyRefreshToken(refreshToken)
  } catch (err) {
    // Token is already invalid/expired.
      // We can still clear the cookie in the controller.
      return
  }

  const session = await Session.findOneAndUpdate(
    {
      _id: decodedToken.sessionId,
      user: decodedToken.userId,
      revokedAt: null
    },
    {
      revokedAt: new Date()
    }
  );
  
  if (!session) {
    return;
  }
}

export const logoutAllSessions = async ({ userId }) => {
  await Session.updateMany(
    {
      user: userId,
      revokedAt: null
    },
    {
      revokedAt: new Date()
    }
  );
};

export const verifyEmailService = async ({ email, otp }) => {
  if (!otp) {
    throw new ApiError(400,"otp is required")
  }
  const normalizedEmail = email.toLowerCase().trim()
  
  const user = await User.findOne({ email: normalizedEmail })

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.emailVerified) {
    throw new ApiError(400, "Email is already verified");
  }
  
  const verification = await EmailVerification.findOne({
    user: user._id,
    verifiedAt:null,
  }).select("+otpHash")

  if (!verification) {
    throw new ApiError(401,"Invalid verification request")
  }

  if (verification.expiresAt < new Date()) {
    throw new ApiError(400,"Otp is invalid or expired")
  }

  if (verification.attempts >= 3) {
    throw new ApiError(400,"too many incorrect attempts")
  }

  const otpIsValid = await bcrypt.compare(otp, verification.otpHash)

  if (!otpIsValid) {
    verification.attempts += 1,
      await verification.save()
    
      throw new ApiError(400,"Otp is incorrect")
  }

  verification.verifiedAt = Date.now()
  await verification.save()

  user.isActive= true,
   user.emailVerified=true

  await user.save()

  return {
    message:"user verified successfully"
  }
  
}

export const resendVerificationOtp = async ({ email }) => {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.emailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  const verification = await EmailVerification.findOne({
    user: user._id,
    verifiedAt: null,
    invalidatedAt: null
  }).select("+otpHash");

  if (!verification) {
    throw new ApiError(401,"Invalid verification request")
  }

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  
  const otpHash = await bcrypt.hash(otp, 12);

  verification.otpHash = otpHash;
  verification.expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );
  verification.attempts = 0;
  
  await verification.save()
  await sendVerificationEmail({
    email: user.email,
    otp
  });

  // Temporary until email service is implemented
  console.log("NEW EMAIL VERIFICATION OTP:", otp);

  return {
    message: "Verification OTP sent successfully"
  };
};

export const forgotPasswordService = async ({ email }) => {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // If a previous reset request exists, reuse it
  let passwordReset = await PasswordReset.findOne({
    user: user._id,
    usedAt: null
  }).select("+otpHash");

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const otpHash = await bcrypt.hash(otp, 12);

  if (passwordReset) {
    passwordReset.otpHash = otpHash;
    passwordReset.expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );
    passwordReset.attempts = 0;

    await passwordReset.save();
  } else {
    passwordReset = await PasswordReset.create({
      user: user._id,
      otpHash,
      expiresAt: new Date(
        Date.now() + 10 * 60 * 1000
      )
    });
  }

  await sendVerificationEmail({
    email: user.email,
    otp
  });

  return {
    message: "Password reset OTP sent successfully"
  };
};

export const resetPasswordService = async ({ email, otp, newPassword }) => {
  if (!otp || !email || !newPassword) {
    throw new ApiError(400,"otp, email and new password are required")
  }

  const normalizedEmail = email.toLowerCase().trim()

  const user = await User.findOne({
    email:normalizedEmail
  })

  if (!user) {
    throw new ApiError(404, "User with this email doesn't exist")
    
  }

  const passwordReset = await PasswordReset.findOne({
    user: user._id,
    usedAt:null
  }).select("+otpHash")

  if (!passwordReset) {
    throw new ApiError(
      400,
      "Invalid password reset request"
    );
  }

  if (passwordReset.expiresAt < new Date()) {
    throw new ApiError(
      400,
      "OTP is invalid or expired"
    );
  }

  if (passwordReset.attempts >= 3) {
    throw new ApiError(
      400,
      "Too many incorrect attempts"
    );
  }

  const otpIsValid=await bcrypt.compare(otp,passwordReset.otpHash)

  if (!otpIsValid) {
    passwordReset.attempts += 1;
    await passwordReset.save()
    throw new ApiError(401,"Otp is invalid or expired")
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  const authIdentity = await AuthIdentity.findOne({
    user: user._id,
    provider:"password"
  }).select("passwordHash")

  if (!authIdentity) {
    throw new ApiError(
      400,
      "Password authentication is not available for this account"
    );
  }

  authIdentity.passwordHash = hashedPassword;
  
  await authIdentity.save();

  passwordReset.usedAt=new Date()

  await passwordReset.save()

  await Session.updateMany({
    user: user._id,
    revokedAt:null
  }, {
    revokedAt:new Date()
  })

  return {
    message:"Password reset successfully"
  }
}

export const googleLoginService = async ({ code, userAgent, ipAddress }) => {

  if (!code) {
    throw new ApiError(401, "Google Authorization Code is required")
  }

  const { tokens } = await googleClient.getToken(code)

  if (!tokens.id_token) {
    throw new ApiError(400, "Google Auth Failed")
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  }
  )

  const payload = ticket.getPayload()

  if (!payload) {
    throw new ApiError(
      401,
      "Invalid Google identity"
    );
  }

  const {
    sub: googleAccountId,
    email,
    name,
    picture
  } = payload

  if (!email || !googleAccountId) {
    throw new ApiError(
      401,
      "Google account information is incomplete"
    );
  }

  const normalizedEmail = email.toLowerCase().trim()

  let identity = await AuthIdentity.findOne({
    provider: "google",
    providerAccountId: googleAccountId
  })

  let user;
  
  if (identity) {
    user = await User.findById(identity.user)

    if (!user) {
      throw new ApiError(401, "Cant find any such user")
    }
  } else {
    user = await User.findOne({
      email: normalizedEmail
    })

    if (!user) {
      user = await User.create({
        fullname: name || "Google User",
        email: normalizedEmail,
        bio: "",
        avatar: picture || "",
        isActive: true,
        emailVerified: true
      })
    }

    identity = await AuthIdentity.create({
      provider: "google",
      providerAccountId: googleAccountId,
      user: user._id
    })
  }

  const sessionTokens = await createSessionForUser({
    userId: user._id,
    userAgent,
    ipAddress
  })

  return {
    user: {
      id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    },
    accessToken: sessionTokens.accessToken,
    refreshToken: sessionTokens.refreshToken
  };
}
