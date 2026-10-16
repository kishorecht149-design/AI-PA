#!/usr/bin/env node
/**
 * AMAHAS Owner Authentication Recovery Utility
 *
 * Usage:
 *   node scripts/auth-recovery.mjs
 *   node scripts/auth-recovery.mjs --email=student@amahas.internal --reset-password=NewPassword123!
 *
 * This script securely generates an authenticated session token for the workspace owner
 * without bypassing cryptographic verification.
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SECRET = process.env.AUTH_SECRET || "amahas-local-development-secret-key-32charsmin";

function createSessionToken(payload) {
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith("--email="))?.split("=")[1];
  const resetPassArg = args.find((a) => a.startsWith("--reset-password="))?.split("=")[1];

  let user = null;
  if (emailArg) {
    user = await prisma.user.findUnique({ where: { email: emailArg.toLowerCase() } });
  } else {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.log("No user found in database. Initializing owner workspace account...");
    user = await prisma.user.create({
      data: {
        name: "Kishore",
        email: emailArg || "student@amahas.internal",
        passwordHash: hashPassword(resetPassArg || "KishoreSecure2026!"),
        role: "student",
        profile: {
          create: {
            program: "Autonomous Systems",
            primaryFocus: "AI Operating System & Academics",
          },
        },
        preferences: {
          create: {
            theme: "pure-black",
          },
        },
      },
    });
    console.log(`Created primary user: ${user.name} (${user.email})`);
  } else if (resetPassArg) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(resetPassArg) },
    });
    console.log(`Updated password for ${user.email}`);
  }

  const sessionToken = createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  console.log("\n=======================================================");
  console.log("   AMAHAS OWNER AUTHENTICATION RECOVERY SUCCESSFUL     ");
  console.log("=======================================================");
  console.log(`User ID   : ${user.id}`);
  console.log(`User Name : ${user.name}`);
  console.log(`User Email: ${user.email}`);
  console.log("\nTo authenticate directly in your browser without logging in:");
  console.log(`Cookie Name : amahas_session`);
  console.log(`Cookie Value: ${sessionToken}`);
  console.log("\nOr log in at: http://localhost:3000/login");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("Recovery failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
