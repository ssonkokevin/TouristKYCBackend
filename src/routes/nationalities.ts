import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../lib/prisma.js";

export const nationalitiesRouter = Router();

nationalitiesRouter.use(requireAuth);

nationalitiesRouter.get("/", async (_req, res, next) => {
  try {
    const nationalities = await prisma.nationality.findMany({
      orderBy: { name: "asc" },
    });
    res.json(nationalities);
  } catch (err) {
    next(err);
  }
});
