import { verifyAccessToken } from "../utils/jwt.js";
import ApiError from "../utils/api-error.js";
import asyncHandler from "../utils/asyncHandler.js";

const authMiddleware = asyncHandler(async (req, res,next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401,'Unauthorized access')
  }

  const accessToken = authHeader.split(" ")[1] 

  try {
    const decoded = verifyAccessToken(accessToken)
    console.log("DECODED USER:", decoded);

    req.user = decoded 
    next()
  } catch (err) {
    console.log("JWT ERROR:", err);

    throw new ApiError(401,"Invalid or expired access Token")
  }
})


export default authMiddleware