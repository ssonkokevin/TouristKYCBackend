import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete dependent child records first
  await prisma.notification.deleteMany({});
  console.log("Deleted notifications");

  await prisma.providerSyncLog.deleteMany({});
  console.log("Deleted provider sync logs");

  await prisma.suspension.deleteMany({});
  console.log("Deleted suspensions");

  await prisma.deregistration.deleteMany({});
  console.log("Deleted deregistrations");

  await prisma.subscriberDocument.deleteMany({});
  console.log("Deleted subscriber documents");

  await prisma.subscriber.deleteMany({});
  console.log("Deleted subscribers");

  // Reset SIM inventory to available without deleting real hardware records
  const simReset = await prisma.$executeRaw`
    UPDATE sim_inventory
    SET status = 'available',
        reserved_by = NULL,
        reserved_at = NULL,
        reservation_expires_at = NULL,
        provisioned_at = NULL,
        provider_confirmation_ref = NULL
    WHERE status != 'available'
  `;
  console.log("Reset SIM inventory rows:", simReset);

  // Reset MSISDN pool to available, clearing any pairings
  const msisdnReset = await prisma.$executeRaw`
    UPDATE msisdn_pool
    SET status = 'available',
        reserved_by = NULL,
        reserved_at = NULL,
        reservation_expires_at = NULL,
        provisioned_at = NULL,
        provider_confirmation_ref = NULL,
        sim_inventory_id = NULL,
        assigned_subscriber_id = NULL
    WHERE status != 'available'
  `;
  console.log("Reset MSISDN pool rows:", msisdnReset);

  // Nationalities and users are intentionally left untouched.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
