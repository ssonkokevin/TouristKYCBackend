-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "agent_number" VARCHAR(50),
ADD COLUMN     "id_type" VARCHAR(20),
ADD COLUMN     "passport_issue_date" DATE,
ADD COLUMN     "registration_type" VARCHAR(50),
ADD COLUMN     "visa_issue_date" DATE;
