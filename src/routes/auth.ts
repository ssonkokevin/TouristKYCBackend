import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh, getMe } from "../services/authService.js";
import { requireAuth, AuthRequest } from "../middleware/requireAuth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const user = await register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await refresh(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
