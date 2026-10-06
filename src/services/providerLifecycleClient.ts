import axios from "axios";
import { config } from "../config.js";

interface ProviderOperationResult {
  retCode?: string;
  retMesg?: string;
  [key: string]: unknown;
}

function getAccessToken() {
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    scope: config.BSAG_SCOPE,
  });

  return axios.post(config.BSAG_TOKEN_URL, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: {
      username: config.BSAG_CLIENT_ID,
      password: config.BSAG_CLIENT_SECRET,
    },
    timeout: config.PROVIDER_TIMEOUT_MS,
  }).then((response) => {
    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error("BSAG OAuth token response did not include access_token");
    }
    return accessToken;
  });
}

async function callProviderLifecycle(endpoint: string, msisdn: string): Promise<ProviderOperationResult> {
  const accessToken = await getAccessToken();
  const response = await axios.post(endpoint, { msisdn }, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: config.PROVIDER_TIMEOUT_MS,
  });

  const result = response.data as ProviderOperationResult;
  if (result.retCode !== "000000") {
    throw new Error(result.retMesg || `BSAG lifecycle operation failed with code ${result.retCode ?? "unknown"}`);
  }

  return result;
}

export async function suspendMsisdnWithProvider(msisdn: string) {
  return callProviderLifecycle(config.BSAG_SUSPEND_ENDPOINT, msisdn);
}

export async function terminateMsisdnWithProvider(msisdn: string) {
  return callProviderLifecycle(config.BSAG_TERMINATION_ENDPOINT, msisdn);
}
