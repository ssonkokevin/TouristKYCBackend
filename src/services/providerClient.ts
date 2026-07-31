import axios from "axios";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export interface AssignmentPayload {
  subscriberId: string;
  simInventoryId: string;
  msisdnId: string;
}

export async function notifyProviderAssignment(payload: AssignmentPayload) {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: payload.subscriberId },
    include: {
      simInventory: true,
      msisdnPool: { take: 1 },
      nationality: true,
    },
  });

  if (!subscriber || !subscriber.simInventory) {
    throw new Error("Subscriber or SIM resource not found");
  }

  const msisdn = subscriber.msisdnPool[0];
  if (!msisdn) {
    throw new Error("MSISDN not assigned to subscriber");
  }

  const requestPayload = {
    resource: {
      imsi: subscriber.simInventory.imsi,
      iccid: subscriber.simInventory.iccid,
      msisdn: msisdn.msisdn,
    },
    subscriber: {
      full_name: `${subscriber.otherNames} ${subscriber.surname}`.trim(),
      nationality: subscriber.nationality?.code || subscriber.nationalityCode,
      passport_number: subscriber.passportNumber,
      visa_expiry_date: subscriber.visaExpiryDate,
      registration_booth: subscriber.registrationBooth,
    },
    our_reference: `subscriber_id=${subscriber.id}`,
  };

  const endpoint = `${config.PROVIDER_BASE_URL}${config.PROVIDER_ASSIGN_ENDPOINT}`;

  const syncLog = await prisma.providerSyncLog.create({
    data: {
      direction: "outbound",
      simInventoryId: payload.simInventoryId,
      subscriberId: payload.subscriberId,
      endpoint,
      requestPayload: requestPayload as any,
      status: "pending",
    },
  });

  try {
    const response = await axios.post(endpoint, requestPayload, {
      headers: { Authorization: `Bearer ${config.PROVIDER_API_KEY}` },
      timeout: config.PROVIDER_TIMEOUT_MS,
    });

    await prisma.providerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "success",
        httpStatusCode: response.status,
        responsePayload: response.data as any,
      },
    });

    return { success: true, data: response.data };
  } catch (err: any) {
    await prisma.providerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: axios.isAxiosError(err) && !err.response ? "timeout" : "failed",
        httpStatusCode: err.response?.status,
        errorMessage: err.message,
      },
    });
    throw err;
  }
}
