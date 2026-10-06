import axios from "axios";
import { config } from "../config.js";

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

  const response = await axios.post(config.BSAG_SMS_ENDPOINT, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: config.PROVIDER_TIMEOUT_MS,
  });

  return response.data;
}
