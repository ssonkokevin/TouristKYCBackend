import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadDocument, deleteDocument, getDocumentRaw } from "../services/documentsService.js";
import { uploadMiddleware } from "../services/uploadService.js";

export const documentsRouter = Router();

const typeSchema = z.enum(["application_form", "passport_bio_page", "visa_page", "subscriber_photo"]);

// Intentionally NOT behind requireAuth: the dashboard renders this as a plain
// <img src="..."> / link href, which can't attach the app's Bearer token.
// This matches the existing exposure level of Supabase public-bucket URLs
// and the /uploads static mount — anyone with the URL (subscriber id is a
// UUID) can view it, same as before this change.
documentsRouter.get("/subscribers/:id/:type/raw", async (req, res, next) => {
  try {
    const type = typeSchema.parse(req.params.type);
    const doc = await getDocumentRaw(req.params.id, type);
    if (doc.redirectUrl) {
      res.redirect(302, doc.redirectUrl);
      return;
    }
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.type(doc.mimeType || "application/octet-stream").send(doc.buffer);
  } catch (err) {
    next(err);
  }
});

documentsRouter.use(requireAuth);

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
