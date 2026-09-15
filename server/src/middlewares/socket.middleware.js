import { verifyAccessToken } from "../utils/jwt.js";

export const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"))
    }

    const decoded = verifyAccessToken(token);
    socket.userId = decoded.userId

    next()
  } catch (err) {
    next(new Error("Invalid or expired access token"))
  }
}