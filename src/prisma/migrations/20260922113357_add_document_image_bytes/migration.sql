-- AlterTable
ALTER TABLE "subscriber_documents" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "mime_type" VARCHAR(100),
ALTER COLUMN "url" DROP NOT NULL;
