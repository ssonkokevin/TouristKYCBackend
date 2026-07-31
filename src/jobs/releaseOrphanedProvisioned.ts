import { releaseOrphanedProvisionedResources as releaseSim } from "../services/simInventoryService.js";
import { releaseOrphanedProvisionedResources as releaseMsisdn } from "../services/msisdnPoolService.js";
import { jobsLogger } from "../lib/logger.js";

export default async function releaseOrphanedProvisioned() {
  const sim = await releaseSim();
  const msisdn = await releaseMsisdn();
  jobsLogger.info("Released orphaned provisioned resources", {
    sim_released: sim.released,
    msisdn_released: msisdn.released,
  });
}
