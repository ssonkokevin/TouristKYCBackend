import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { sendWelcomeSms } from "./welcomeSmsClient.js";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
  isAxiosError: vi.fn(() => false),
}));

describe("sendWelcomeSms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an OAuth access token and sends the welcome SMS", async () => {
    const post = vi.mocked(axios.post);
    post
      .mockResolvedValueOnce({ data: { access_token: "token-123" } })
      .mockResolvedValueOnce({ data: { code: "0000", message: "SMS accepted for delivery." } });

    const result = await sendWelcomeSms({
      phoneNumber: "256724072407",
      message: "Welcome to Uganda. Your eSIM is ready.",
    });

    expect(post).toHaveBeenNthCalledWith(
      1,
      "https://bsag.auth.hamiltel.com/connect/token",
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "https://bsag.hamiltel.com/bossapi/v3.0/sms/send",
      { phoneNumber: "256724072407", message: "Welcome to Uganda. Your eSIM is ready." },
      expect.objectContaining({
        headers: { Authorization: "Bearer token-123" },
        timeout: 10000,
      })
    );
    expect(result).toEqual({ code: "0000", message: "SMS accepted for delivery." });
  });

  it("rejects an invalid OAuth response without sending the SMS", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

    await expect(
      sendWelcomeSms({ phoneNumber: "256724072407", message: "Welcome to Uganda" })
    ).rejects.toThrow("BSAG OAuth token response did not include access_token");
    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(1);
  });
});
