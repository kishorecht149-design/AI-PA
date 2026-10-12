import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AMAHAS — Intelligent Personal Operating System for Students",
  description:
    "Autonomous Multimodal Holographic Assistant System for academics, GATE/ESE preparation, systems research, and lifelong learning.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const userName = user?.name || "Kishore Kumar";

  return (
    <html lang="en" className="dark">
      <body className="bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-200">
        <AppShell userName={userName}>{children}</AppShell>
      </body>
    </html>
  );
}
