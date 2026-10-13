import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";
import { ThemeProvider } from "@/lib/themes/theme-provider";

export const metadata: Metadata = {
  title: "AMAHAS — Autonomous Personal Workspace & Intelligence System",
  description:
    "Autonomous Personal Workspace & Intelligence System for high-performance execution, knowledge architecture, research, and deep focus.",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/amahas-symbol.png",
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('amahas_theme_pref');
    var themeId = 'pure-black';
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
        className="bg-black text-white antialiased selection:bg-white/20 selection:text-white"
      >
        <ThemeProvider>
          <AppShell userName={userName}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
