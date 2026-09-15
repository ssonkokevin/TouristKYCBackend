import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { getByVisaType, getByPurpose, getByNationality, getSimProvisioningTrend } from "../services/reportsService.js";
import { iterateSubscribersForExport } from "../services/subscriberService.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

reportsRouter.get("/by-visa-type", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByVisaType(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/by-purpose-of-visit", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByPurpose(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/by-nationality", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByNationality(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/sim-provisioning-trend", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getSimProvisioningTrend(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const REGISTRATIONS_CSV_HEADER = [
  "Surname",
  "Given name(s)",
  "Sex",
  "ID type",
  "Passport number",
  "Date of birth",
  "Visa expiry date",
  "SIM type",
  "MSISDN",
  "Date of registration",
  "Verified by",
  "Status",
];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function statusWithDate(sub: any): string {
  if (sub.status === "suspended" && sub.suspension?.suspendedAt) {
    return `Suspended · ${new Date(sub.suspension.suspendedAt).toISOString().slice(0, 10)}`;
  }
  if (sub.status === "deregistered" && sub.deregistration?.deregisteredAt) {
    return `Deregistered · ${new Date(sub.deregistration.deregisteredAt).toISOString().slice(0, 10)}`;
  }
  return sub.status === "active" ? "Active" : sub.status;
}

// Streams every subscriber matching the current Reports date-range filter as
// CSV — deliberately not loaded into the browser first (large exports would
// otherwise mean pulling thousands of full subscriber records to the
// client). Same permission level as viewing a full customer profile
// (requireAuth) since the app has no more granular role system today; DOB
// and passport number are included here for compliance even though DOB is
// never rendered in the on-screen table.
reportsRouter.get("/registrations/export", async (req, res, next) => {
  try {
    const { registered_from, registered_to } = z
      .object({ registered_from: z.coerce.date().optional(), registered_to: z.coerce.date().optional() })
      .parse(req.query);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="registrations_export.csv"`);
    res.write(REGISTRATIONS_CSV_HEADER.join(",") + "\n");

    for await (const sub of iterateSubscribersForExport({ registered_from, registered_to })) {
      const row = [
        sub.surname,
        sub.otherNames,
        sub.gender ?? "",
        sub.idType ?? "",
        sub.passportNumber,
        sub.dateOfBirth ? new Date(sub.dateOfBirth).toISOString().slice(0, 10) : "",
        new Date(sub.visaExpiryDate).toISOString().slice(0, 10),
        sub.simInventory?.type ?? "",
        sub.msisdnPool?.[0]?.msisdn ?? "",
        new Date(sub.registeredAt).toISOString().slice(0, 10),
        sub.registeredBy ?? "",
        statusWithDate(sub),
      ];
      res.write(row.map(csvEscape).join(",") + "\n");
    }

    res.end();
  } catch (err) {
    next(err);
  }
});
