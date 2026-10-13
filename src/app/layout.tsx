import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";
import { ThemeProvider } from "@/lib/themes/theme-provider";

export const metadata: Metadata = {
  title: "AMAHAS — Intelligent Personal Operating System for Students",
  description:
    "Autonomous Multimodal Holographic Assistant System for academics, GATE/ESE preparation, systems research, and lifelong learning.",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/amahas-symbol.png",
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('amahas_theme_pref');
    var themeId = 'amahas-signature';
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed.activeThemeId) themeId = parsed.activeThemeId;
    }
    document.documentElement.setAttribute('data-theme', themeId);
    var lightThemes = ['daylight', 'pure-white', 'sea-breeze', 'morning-dawn', 'sky', 'light-classic'];
    if (lightThemes.indexOf(themeId) !== -1) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const userName = user?.name || "Kishore";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-200"
      >
        <ThemeProvider>
          <AppShell userName={userName}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
