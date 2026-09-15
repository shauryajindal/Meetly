import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "",
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (req, res) => {
    console.log("Health route hit");

    res.status(200).json({
        success: true,
        message: "Server is running"
    });
});

// import routes
import authRoutes from "./routes/auth.route.js";
import meetingRoutes from "./routes/meeting.route.js";

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

// Error middleware MUST be last
import errorMiddleware from "./middlewares/error.middleware.js";

app.use(errorMiddleware);

export default app;