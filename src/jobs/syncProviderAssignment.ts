import { notifyProviderAssignment } from "../services/providerClient.js";
import { activateSimInventory } from "../services/simInventoryService.js";
import { activateMsisdn } from "../services/msisdnPoolService.js";
import { emitSimActivated } from "../sockets/index.js";

export async function handleSyncProviderAssignment(
  subscriberId: string,
  simInventoryId: string,
  msisdnId: string
) {
  try {
    await notifyProviderAssignment({ subscriberId, simInventoryId, msisdnId });

    await activateSimInventory(simInventoryId);
    await activateMsisdn(msisdnId);

    emitSimActivated({ subscriberId, simInventoryId, msisdnId });
    return { success: true };
  } catch (err: any) {
    // Retry exhaustion / final failure notification is handled by BullMQ.
    throw err;
  }
}

export default async function syncProviderAssignment() {
  // This job is triggered by the queue, not scheduled directly.
}
