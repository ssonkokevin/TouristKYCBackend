import { prisma } from "../lib/prisma.js";
import { uploadFile } from "./uploadService.js";

const fieldMap: Record<string, string> = {
  application_form: "applicationFormUrl",
  passport_bio_page: "passportBioPageUrl",
  visa_page: "visaPageUrl",
  subscriber_photo: "subscriberPhotoUrl",
};

export async function uploadDocument(subscriberId: string, type: string, file: any) {
  const field = fieldMap[type];
  if (!field) {
    const error = new Error("Invalid document type");
    (error as any).statusCode = 400;
    throw error;
  }

  const path = `subscribers/${subscriberId}/${type}/${file.originalname || "document"}`;
  const url = await uploadFile(file, path);

  return prisma.subscriber.update({
    where: { id: subscriberId },
    data: { [field]: url },
    select: { id: true, [field]: true },
  });
}

export async function deleteDocument(subscriberId: string, type: string) {
  const field = fieldMap[type];
  if (!field) {
    const error = new Error("Invalid document type");
    (error as any).statusCode = 400;
    throw error;
  }

  return prisma.subscriber.update({
    where: { id: subscriberId },
    data: { [field]: null },
    select: { id: true, [field]: true },
  });
}
