import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, getMe } from "../services/authService.js";
import { requireAuth, AuthRequest } from "../middleware/requireAuth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

authRouter.post("/register", async (_req, res) => {
  res.status(410).json({ error: "Gone", message: "Self-service registration is disabled. Accounts are provisioned internally." });
});

// Google Sign-In disabled — plain-HTTP, no-domain deployment can't satisfy
// Google's HTTPS-origin requirement. Never re-enable this without TLS + a
// real domain in place. See authService.ts for the corresponding commented
// -out loginWithGoogle().
// const googleLoginSchema = z.object({ idToken: z.string().min(1) });
// authRouter.post("/google", loginLimiter, async (req, res, next) => {
//   try {
//     const { idToken } = googleLoginSchema.parse(req.body);
//     const result = await loginWithGoogle(idToken);
//     res.json(result);
//   } catch (err) {
//     next(err);
//   }
// });

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
