import { Router } from "express";
import {
  create,
  getMeeting,
  update,
  start,
  end,
  joinMeetingController,
  leaveMeetingController,
  getMyMeetingsController,
  removeMeetingController
} from "../controllers/meeting.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware, create);

router.get("/", authMiddleware, getMyMeetingsController);

router.get("/:roomId", authMiddleware, getMeeting);

router.patch("/:roomId", authMiddleware, update);

router.post("/:roomId/start", authMiddleware, start);

router.post("/:roomId/end", authMiddleware, end);

router.post(
  "/:roomId/join",
  authMiddleware,
  joinMeetingController
);

router.post(
  "/:roomId/leave",
  authMiddleware,
  leaveMeetingController
);

router.delete("/:roomId", authMiddleware, removeMeetingController);


export default router;