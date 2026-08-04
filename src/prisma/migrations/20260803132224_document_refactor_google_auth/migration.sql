/*
  Warnings:

  - You are about to drop the column `application_form_url` on the `subscribers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_bio_page_url` on the `subscribers` table. All the data in the column will be lost.
  - You are about to drop the column `subscriber_photo_url` on the `subscribers` table. All the data in the column will be lost.
  - You are about to drop the column `visa_page_url` on the `subscribers` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('subscriber_photo', 'application_form', 'passport_bio_page', 'visa_page');

-- AlterTable
ALTER TABLE "subscribers" DROP COLUMN "application_form_url",
DROP COLUMN "passport_bio_page_url",
DROP COLUMN "subscriber_photo_url",
DROP COLUMN "visa_page_url";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "subscriber_documents" (
    "id" UUID NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriber_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_documents_subscriber_id_type_key" ON "subscriber_documents"("subscriber_id", "type");

-- AddForeignKey
ALTER TABLE "subscriber_documents" ADD CONSTRAINT "subscriber_documents_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
