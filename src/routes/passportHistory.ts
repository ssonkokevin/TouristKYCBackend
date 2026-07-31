import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPassportHistory } from "../services/passportHistoryService.js";

export const passportHistoryRouter = Router();

passportHistoryRouter.use(requireAuth);

passportHistoryRouter.get("/:passportNumber", async (req, res, next) => {
  try {
    const result = await getPassportHistory(req.params.passportNumber);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
