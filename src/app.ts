import express, { Request, Response } from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import { handleError } from "./middlewares/error.middleware";
import cors from "cors";
import { authorize } from "./middlewares/auth.middleware";
import { ApiResponse } from "./utils/apiResponse";
import cookieParser from "cookie-parser";
dotenv.config();
export const app = express();

app.use(
  cors({
    origin:"http://localhost:5173",
    credentials: true,
  })
  
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ limit: "16kb", extended: true }));

app.get("/", authorize, (req: Request, res: Response) => {
  const user = req.user;
  res.status(200).json(new ApiResponse(200, user, "data fetched success"));
});

app.use("/api/v1/auth", authRoutes);

app.use(handleError);
