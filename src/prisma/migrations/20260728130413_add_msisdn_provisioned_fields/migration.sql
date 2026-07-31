-- AlterTable
ALTER TABLE "msisdn_pool" ADD COLUMN     "provider_confirmation_ref" VARCHAR(100),
ADD COLUMN     "provisioned_at" TIMESTAMP(3);
