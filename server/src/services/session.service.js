import bcrypt from "bcrypt";
import { Session } from "../models/sessions.model.js";
import {
  generateAccessToken,
  generateRefreshToken
} from "../utils/jwt.js";

export const createSessionForUser = async ({
  userId,
  userAgent = "",
  ipAddress = ""
}) => {
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  // 1. Create session first so we get sessionId
  const session = new Session({
    user: userId,
    refreshTokenHash: "pending",
    expiresAt,
    userAgent,
    ipAddress
  });

  await session.save();

  // 2. Now generate refresh token using sessionId
  const refreshToken = generateRefreshToken({
    userId: userId.toString(),
    sessionId: session._id.toString()
  });

  // 3. Store only the hash
  session.refreshTokenHash = await bcrypt.hash(
    refreshToken,
    12
  );

  await session.save();

  // 4. Access token doesn't need sessionId
  const accessToken = generateAccessToken({
    userId: userId.toString()
  });

  return {
    accessToken,
    refreshToken,
    sessionId: session._id
  };
};