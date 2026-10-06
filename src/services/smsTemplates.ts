export interface SmsTemplateData {
  firstName?: string;
  visaExpiryDate?: Date;
  msisdn?: string;
}

const formatDate = (value?: Date) =>
  value ? value.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" }) : "your visa expiry date";

export function buildWelcomeSms(data: SmsTemplateData) {
  return `Welcome to Uganda! Your eSIM number ${data.msisdn ?? "is now active"}. We hope you enjoy your stay. For assistance, contact the service desk.`;
}

export function buildVisaExpiryWarningSms(data: SmsTemplateData) {
  const firstName = data.firstName?.trim() || "Tourist";
  const expiryDate = formatDate(data.visaExpiryDate);
  return `Hello ${firstName}, your visa expires on ${expiryDate}. Your mobile number will be suspended if your visa is not renewed. Please contact the immigration or service desk before expiry.`;
}

export function buildSuspendedSms(data: SmsTemplateData) {
  return `Your mobile number ${data.msisdn ?? "is"} has been suspended because your visa is no longer valid. It cannot be provisioned again. Please contact the service desk for assistance.`;
}
