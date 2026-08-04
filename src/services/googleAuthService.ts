import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  if (!config.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid Google token");
  }

  if (!payload.email_verified || !payload.email) {
    const error = new Error("Google email is not verified");
    (error as any).statusCode = 401;
    throw error;
  }

  // Enforce domain allowlist if configured. Default to hamiltel.com when not set.
  const allowedDomains = (config.ALLOWED_EMAIL_DOMAINS || "hamiltel.com")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const domain = payload.email.split("@")[1]?.toLowerCase();
  if (!domain || !allowedDomains.includes(domain)) {
    const error = new Error("Email domain is not authorized");
    (error as any).statusCode = 403;
    throw error;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
    aud: payload.aud,
    iss: payload.iss,
  };
}
