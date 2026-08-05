import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
// Google Sign-In is disabled (see /auth/google route below) — deployment
// requires HTTPS on a publicly resolvable origin for Google's authorized
// JavaScript origins, which this environment does not use. Kept importable
// in case Google auth is re-enabled later.
// import { verifyGoogleToken } from "./googleAuthService.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// identifier: accepts either an email address or a phone number
const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string(),
});

export async function register(input: unknown) {
  const { email, password, name } = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error("User already exists");
    (error as any).statusCode = 409;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || email, role: "admin" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return user;
}

export async function login(input: unknown) {
  const { identifier, password } = loginSchema.parse(input);
  const isEmail = identifier.includes("@");
  const user = await prisma.user.findUnique({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });
  if (!user) {
    const error = new Error("Invalid credentials");
    (error as any).statusCode = 401;
    throw error;
  }
  if (!user.passwordHash) {
    const error = new Error("Invalid credentials");
    (error as any).statusCode = 401;
    throw error;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error("Invalid credentials");
    (error as any).statusCode = 401;
    throw error;
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.JWT_SECRET,
    { expiresIn: "1d" }
  );
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refresh(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    const error = new Error("User not found");
    (error as any).statusCode = 401;
    throw error;
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.JWT_SECRET,
    { expiresIn: "1d" }
  );
  return { token, user };
}

// Google Sign-In disabled — see note near the top of this file. Kept here
// (commented out) rather than deleted so it can be restored later without
// reconstructing the flow from scratch.
// export async function loginWithGoogle(idToken: string) {
//   const payload = await verifyGoogleToken(idToken);
//
//   let user = await prisma.user.findUnique({
//     where: { email: payload.email },
//   });
//
//   if (!user) {
//     user = await prisma.user.create({
//       data: {
//         email: payload.email,
//         name: payload.name || payload.email,
//         passwordHash: null,
//         role: "viewer",
//       },
//     });
//   }
//
//   const token = jwt.sign(
//     { id: user.id, email: user.email, name: user.name, role: user.role },
//     config.JWT_SECRET,
//     { expiresIn: "1d" }
//   );
//
//   return {
//     token,
//     user: { id: user.id, email: user.email, name: user.name, role: user.role },
//   };
// }

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    const error = new Error("User not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return user;
}
