import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadDocument, deleteDocument } from "../services/documentsService.js";
import { uploadMiddleware } from "../services/uploadService.js";

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

const typeSchema = z.enum(["application_form", "passport_bio_page", "visa_page", "subscriber_photo"]);

documentsRouter.post("/subscribers/:id/:type", uploadMiddleware.single("file"), async (req, res, next) => {
  try {
    const type = typeSchema.parse(req.params.type);
    const result = await uploadDocument(req.params.id, type, req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/subscribers/:id/:type", async (req, res, next) => {
  try {
    const type = typeSchema.parse(req.params.type);
    const result = await deleteDocument(req.params.id, type);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
