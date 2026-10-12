import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.redirect(new URL("/login", "http://localhost:3000"));
  res.cookies.delete(sessionCookieOptions.name);
  return res;
}
