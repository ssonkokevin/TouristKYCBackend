import axios from "axios";
import { config } from "../config.js";
import { auditLogger } from "../lib/logger.js";

export interface WelcomeSmsPayload {
  phoneNumber: string;
  message: string;
}

export async function sendWelcomeSms(payload: WelcomeSmsPayload) {
  const tokenForm = new URLSearchParams({
    grant_type: "client_credentials",
    scope: config.BSAG_SCOPE,
  });

  const tokenResponse = await axios.post(config.BSAG_TOKEN_URL, tokenForm, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: {
      username: config.BSAG_CLIENT_ID,
      password: config.BSAG_CLIENT_SECRET,
    },
    timeout: config.PROVIDER_TIMEOUT_MS,
  });

  const accessToken = tokenResponse.data?.access_token;
  if (!accessToken) {
    throw new Error("BSAG OAuth token response did not include access_token");
  }

  auditLogger.info("Sending welcome SMS via BSAG", {
    phoneNumber: payload.phoneNumber,
    messagePreview: payload.message.slice(0, 160),
  });

  const response = await axios.post(config.BSAG_SMS_ENDPOINT, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: config.PROVIDER_TIMEOUT_MS,
  });

  auditLogger.info("Welcome SMS BSAG response received", {
    phoneNumber: payload.phoneNumber,
    status: response.status,
    responseData: response.data,
  });

  return response.data;
}
