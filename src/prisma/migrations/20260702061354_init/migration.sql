-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('available', 'reserved', 'provisioned', 'assigned', 'active', 'suspended', 'deactivated', 'quarantined');

-- CreateEnum
CREATE TYPE "MsisdnStatus" AS ENUM ('available', 'reserved', 'provisioned', 'assigned', 'active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('active', 'suspended', 'deregistered');

-- CreateEnum
CREATE TYPE "VisitPurpose" AS ENUM ('tourism', 'business', 'study', 'transit', 'medical', 'other');

-- CreateEnum
CREATE TYPE "SuspensionReason" AS ENUM ('visa_expired', 'manual_review', 'fraud_suspected', 'payment_issue', 'other');

-- CreateEnum
CREATE TYPE "DeregistrationReason" AS ENUM ('visa_expired_deregistered', 'lost_card', 'change_of_number', 'customer_not_interested', 'voluntary_deregistration', 'fraud_suspected', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('visa_expiring_soon', 'visa_expired_suspended', 'provider_sync_failed', 'sim_pool_low');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'success', 'failed', 'timeout');

-- CreateTable
CREATE TABLE "sim_inventory" (
    "id" UUID NOT NULL,
    "imsi" VARCHAR(15) NOT NULL,
    "iccid" VARCHAR(20) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'esim',
    "category" VARCHAR(50) NOT NULL DEFAULT 'tourist',
    "batch_id" VARCHAR(50),
    "status" "ResourceStatus" NOT NULL DEFAULT 'available',
    "reserved_by" VARCHAR(100),
    "reserved_at" TIMESTAMP(3),
    "reservation_expires_at" TIMESTAMP(3),
    "provisioned_at" TIMESTAMP(3),
    "provider_confirmation_ref" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sim_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msisdn_pool" (
    "id" UUID NOT NULL,
    "msisdn" VARCHAR(15) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'tourist',
    "status" "MsisdnStatus" NOT NULL DEFAULT 'available',
    "reserved_by" VARCHAR(100),
    "reserved_at" TIMESTAMP(3),
    "reservation_expires_at" TIMESTAMP(3),
    "sim_inventory_id" UUID,
    "assigned_subscriber_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "msisdn_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nationalities" (
    "code" CHAR(2) NOT NULL,
    "code3" CHAR(3),
    "name" TEXT NOT NULL,
    "flag_emoji" VARCHAR(8),
    "region" VARCHAR(50),

    CONSTRAINT "nationalities_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "id" UUID NOT NULL,
    "surname" VARCHAR(100) NOT NULL,
    "other_names" VARCHAR(150) NOT NULL,
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "nationality_code" CHAR(2) NOT NULL,
    "passport_number" VARCHAR(50) NOT NULL,
    "passport_expiry" DATE,
    "visa_type" VARCHAR(50),
    "visa_number" VARCHAR(50),
    "visa_expiry_date" DATE NOT NULL,
    "purpose_of_visit" "VisitPurpose",
    "entry_point" VARCHAR(100),
    "arrival_date" DATE,
    "intended_duration_days" INTEGER,
    "accommodation" VARCHAR(150),
    "sim_inventory_id" UUID,
    "msisdn_id" UUID,
    "subscriber_photo_url" VARCHAR(500),
    "passport_bio_page_url" VARCHAR(500),
    "visa_page_url" VARCHAR(500),
    "application_form_url" VARCHAR(500),
    "status" "SubscriberStatus" NOT NULL DEFAULT 'active',
    "agent_id" VARCHAR(100),
    "agent_name" VARCHAR(150),
    "registration_booth" VARCHAR(20),
    "registered_by" VARCHAR(100),
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspensions" (
    "subscriberId" UUID NOT NULL,
    "reason" "SuspensionReason" NOT NULL,
    "reason_note" TEXT,
    "suspended_by" VARCHAR(100) NOT NULL,
    "suspended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspensions_pkey" PRIMARY KEY ("subscriberId")
);

-- CreateTable
CREATE TABLE "deregistrations" (
    "subscriberId" UUID NOT NULL,
    "reason" "DeregistrationReason" NOT NULL,
    "reason_note" TEXT,
    "operator" VARCHAR(100) NOT NULL,
    "deregistered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deregistrations_pkey" PRIMARY KEY ("subscriberId")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subscriber_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_log" (
    "id" UUID NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "sim_inventory_id" UUID,
    "subscriber_id" UUID,
    "endpoint" VARCHAR(200),
    "request_payload" JSONB,
    "response_payload" JSONB,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "http_status_code" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sim_inventory_imsi_key" ON "sim_inventory"("imsi");

-- CreateIndex
CREATE UNIQUE INDEX "sim_inventory_iccid_key" ON "sim_inventory"("iccid");

-- CreateIndex
CREATE INDEX "sim_inventory_status_idx" ON "sim_inventory"("status");

-- CreateIndex
CREATE INDEX "sim_inventory_batch_id_idx" ON "sim_inventory"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "msisdn_pool_msisdn_key" ON "msisdn_pool"("msisdn");

-- CreateIndex
CREATE UNIQUE INDEX "msisdn_pool_sim_inventory_id_key" ON "msisdn_pool"("sim_inventory_id");

-- CreateIndex
CREATE INDEX "msisdn_pool_status_idx" ON "msisdn_pool"("status");

-- CreateIndex
CREATE INDEX "msisdn_pool_assigned_subscriber_id_idx" ON "msisdn_pool"("assigned_subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_sim_inventory_id_key" ON "subscribers"("sim_inventory_id");

-- CreateIndex
CREATE INDEX "subscribers_nationality_code_idx" ON "subscribers"("nationality_code");

-- CreateIndex
CREATE INDEX "subscribers_visa_expiry_date_idx" ON "subscribers"("visa_expiry_date");

-- CreateIndex
CREATE INDEX "subscribers_status_idx" ON "subscribers"("status");

-- CreateIndex
CREATE INDEX "subscribers_registered_at_idx" ON "subscribers"("registered_at");

-- CreateIndex
CREATE INDEX "subscribers_passport_number_idx" ON "subscribers"("passport_number");

-- CreateIndex
CREATE INDEX "subscribers_sim_inventory_id_idx" ON "subscribers"("sim_inventory_id");

-- CreateIndex
CREATE INDEX "subscribers_agent_id_idx" ON "subscribers"("agent_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "provider_sync_log_status_idx" ON "provider_sync_log"("status");

-- CreateIndex
CREATE INDEX "provider_sync_log_created_at_idx" ON "provider_sync_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "msisdn_pool" ADD CONSTRAINT "msisdn_pool_sim_inventory_id_fkey" FOREIGN KEY ("sim_inventory_id") REFERENCES "sim_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "msisdn_pool" ADD CONSTRAINT "msisdn_pool_assigned_subscriber_id_fkey" FOREIGN KEY ("assigned_subscriber_id") REFERENCES "subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_nationality_code_fkey" FOREIGN KEY ("nationality_code") REFERENCES "nationalities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_sim_inventory_id_fkey" FOREIGN KEY ("sim_inventory_id") REFERENCES "sim_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspensions" ADD CONSTRAINT "suspensions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deregistrations" ADD CONSTRAINT "deregistrations_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_sync_log" ADD CONSTRAINT "provider_sync_log_sim_inventory_id_fkey" FOREIGN KEY ("sim_inventory_id") REFERENCES "sim_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_sync_log" ADD CONSTRAINT "provider_sync_log_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
