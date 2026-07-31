import { releaseExpiredReservations as releaseSim } from "../services/simInventoryService.js";
import { releaseExpiredReservations as releaseMsisdn } from "../services/msisdnPoolService.js";
import { jobsLogger } from "../lib/logger.js";

export default async function releaseExpiredReservations() {
  const sim = await releaseSim();
  const msisdn = await releaseMsisdn();
  jobsLogger.info("Released expired reservations", { sim_released: sim.released, msisdn_released: msisdn.released });
}
