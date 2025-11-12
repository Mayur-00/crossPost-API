import express from "express";
import { login, logout, register, registerWithGoogle, user } from "../controllers/user.controller";
import { authorize } from "../middlewares/auth.middleware";
const router = express.Router();

router.post("/google", registerWithGoogle);
router.post("/register", register);
router.post('/login', login);
router.get("/logout",authorize, logout);
router.get("/user",authorize, user);

export default router;