import axios from "axios";
import { config } from "../config.js";
import { auditLogger } from "../lib/logger.js";

interface ProviderOperationResult {
  retCode?: string | number;
  retMesg?: string;
  [key: string]: unknown;
}

function normalizeProviderPayload(data: unknown): ProviderOperationResult {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return normalizeProviderPayload(JSON.parse(data));
    } catch {
      return { retMesg: data };
    }
  }
  if (typeof data === "object") {
    return data as ProviderOperationResult;
  }
  return { retMesg: String(data) };
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
  auditLogger.info("Calling BSAG lifecycle endpoint", {
    endpoint,
    msisdn,
    authScheme: "client_credentials",
  });

  try {
    const response = await axios.post(endpoint, { msisdn }, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: config.PROVIDER_TIMEOUT_MS,
    });

    const result = normalizeProviderPayload(response.data);
    const retCode = String(result.retCode ?? "").trim();
    const retMesg = String(result.retMesg ?? "").trim();

    auditLogger.info("BSAG lifecycle response received", {
      endpoint,
      msisdn,
      retCode,
      retMesg,
      status: response.status,
      raw: response.data,
    });

    if (retCode !== "000000") {
      throw new Error(
        `BSAG lifecycle operation failed with code "${retCode || "unknown"}" message "${retMesg || "no message returned"}"`
      );
    }

    return result;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      const payload = normalizeProviderPayload(error.response.data);
      const retCode = String(payload.retCode ?? error.response.statusText ?? "").trim();
      const retMesg = String(payload.retMesg ?? error.message ?? "").trim();
      const raw = error.response.data;

      auditLogger.error("BSAG lifecycle request failed", {
        endpoint,
        msisdn,
        httpStatus: error.response.status,
        retCode,
        retMesg,
        raw,
      });

      throw new Error(
        `BSAG lifecycle operation failed with HTTP ${error.response.status}, code "${retCode || "unknown"}", message "${retMesg || "no message returned"}", raw=${JSON.stringify(raw)}`
      );
    }

    throw error;
  }
}

export async function suspendMsisdnWithProvider(msisdn: string) {
  return callProviderLifecycle(config.BSAG_SUSPEND_ENDPOINT, msisdn);
}

export async function terminateMsisdnWithProvider(msisdn: string) {
  return callProviderLifecycle(config.BSAG_TERMINATION_ENDPOINT, msisdn);
}
