import { describe, expect, it } from "vitest";
import { buildSuspendedSms, buildVisaExpiryWarningSms, buildWelcomeSms } from "./smsTemplates.js";

describe("customer SMS templates", () => {
  it("uses the requested welcome message structure", () => {
    expect(buildWelcomeSms({ msisdn: "256724072407" })).toBe(
      "Welcome to Uganda! Your eSIM number 256724072407. We hope you enjoy your stay. For assistance, contact the service desk."
    );
  });

  it("warns 14 days before visa expiry", () => {
    const expiry = new Date("2026-10-20T00:00:00Z");

    expect(buildVisaExpiryWarningSms({ firstName: "John", visaExpiryDate: expiry, msisdn: "256724072407" })).toContain(
      "your visa expires on 20 Oct 2026"
    );
    expect(buildVisaExpiryWarningSms({ firstName: "John", visaExpiryDate: expiry, msisdn: "256724072407" })).toContain(
      "will be suspended if your visa is not renewed"
    );
  });

  it("states that a suspended number cannot be provisioned again", () => {
    expect(buildSuspendedSms({ msisdn: "256724072407" })).toBe(
      "Your mobile number 256724072407 has been suspended because your visa is no longer valid. It cannot be provisioned again. Please contact the service desk for assistance."
    );
  });
});
