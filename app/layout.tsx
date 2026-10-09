import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { PeriodProvider } from "@/components/period-context";
import { ThemeProvider } from "@/components/theme-context";
import { PrivacyProvider } from "@/components/privacy-context";
import { CustomDialogProvider } from "@/components/ui/custom-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { WarmupTrigger } from "@/components/warmup-trigger";
import { PwaRegister } from "@/components/pwa-register";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  title: "Kamael Finance",
  description: "Plataforma de gestão financeira executiva",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kamael Finance",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[#f8fafc] text-slate-900 dark:bg-[#09090b] dark:text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <PrivacyProvider>
            <PeriodProvider>
              <CustomDialogProvider>
                <WarmupTrigger />
                <PwaRegister />
                <AppShell>{children}</AppShell>
              </CustomDialogProvider>
            </PeriodProvider>
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


