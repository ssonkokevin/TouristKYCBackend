import { DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { uploadFile } from "./uploadService.js";

const validTypes: DocumentType[] = [
  "application_form",
  "passport_bio_page",
  "visa_page",
  "subscriber_photo",
];

export async function uploadDocument(subscriberId: string, type: string, file: any) {
  if (!validTypes.includes(type as DocumentType)) {
    const error = new Error("Invalid document type");
    (error as any).statusCode = 400;
    throw error;
  }

  const documentType = type as DocumentType;

  const path = `subscribers/${subscriberId}/${type}/${file.originalname || "document"}`;
  const url = await uploadFile(file, path);

  return prisma.subscriberDocument.upsert({
    where: {
      subscriberId_type: { subscriberId, type: documentType },
    },
    create: {
      subscriberId,
      type: documentType,
      url,
    },
    update: {
      url,
      uploadedAt: new Date(),
    },
  });
}

export async function getDocumentRaw(subscriberId: string, type: string) {
  if (!validTypes.includes(type as DocumentType)) {
    const error = new Error("Invalid document type");
    (error as any).statusCode = 400;
    throw error;
  }

  const doc = await prisma.subscriberDocument.findUnique({
    where: { subscriberId_type: { subscriberId, type: type as DocumentType } },
  });

  if (!doc || (!doc.imageData && !doc.url)) {
    const error = new Error("Document not found");
    (error as any).statusCode = 404;
    throw error;
  }

  if (doc.imageData) {
    return { buffer: doc.imageData, mimeType: doc.mimeType, redirectUrl: null };
  }

  // Legacy record: bytes were never stored in the DB, only a hosted URL
  // (Supabase or local /uploads) — hand the caller off to it directly.
  return { buffer: null, mimeType: null, redirectUrl: doc.url };
}

export async function deleteDocument(subscriberId: string, type: string) {
  if (!validTypes.includes(type as DocumentType)) {
    const error = new Error("Invalid document type");
    (error as any).statusCode = 400;
    throw error;
  }

  const documentType = type as DocumentType;

  try {
    return await prisma.subscriberDocument.delete({
      where: {
        subscriberId_type: { subscriberId, type: documentType },
      },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      const error = new Error("Document not found");
      (error as any).statusCode = 404;
      throw error;
    }
    throw err;
  }
}
