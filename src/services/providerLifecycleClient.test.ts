import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
  isAxiosError: vi.fn(() => false),
}));

vi.mock("../config.js", () => ({
  config: {
    BSAG_CLIENT_ID: "client-id",
    BSAG_CLIENT_SECRET: "client-secret",
    BSAG_SCOPE: "bsag",
    BSAG_TOKEN_URL: "https://bsag.auth.test/connect/token",
    BSAG_SUSPEND_ENDPOINT: "https://bsag.test/api/v1/gateway/emrgv1/suspend",
    BSAG_TERMINATION_ENDPOINT: "https://bsag.test/api/v1/gateway/emrgv1/termination",
    PROVIDER_TIMEOUT_MS: 10000,
  },
}));

import { suspendMsisdnWithProvider, terminateMsisdnWithProvider } from "./providerLifecycleClient.js";

describe("provider lifecycle client", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("suspends an MSISDN through BSAG after an OAuth token exchange", async () => {
    const post = vi.mocked(axios.post);
    post
      .mockResolvedValueOnce({ data: { access_token: "token-123" } })
      .mockResolvedValueOnce({ data: { retCode: "000000", retMesg: "Operation Successfully." } });

    const result = await suspendMsisdnWithProvider("256724072407");

    expect(post).toHaveBeenNthCalledWith(
      1,
      "https://bsag.auth.test/connect/token",
      expect.any(URLSearchParams),
      expect.objectContaining({ auth: { username: "client-id", password: "client-secret" } })
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "https://bsag.test/api/v1/gateway/emrgv1/suspend",
      { msisdn: "256724072407" },
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } })
    );
    expect(result).toEqual({ retCode: "000000", retMesg: "Operation Successfully." });
  });

  it("terminates an MSISDN through BSAG", async () => {
    const post = vi.mocked(axios.post);
    post
      .mockResolvedValueOnce({ data: { access_token: "token-456" } })
      .mockResolvedValueOnce({ data: { retCode: "000000", retMesg: "Operation Successfully." } });

    await expect(terminateMsisdnWithProvider("256724072407")).resolves.toEqual({
      retCode: "000000",
      retMesg: "Operation Successfully.",
    });
  });
});
