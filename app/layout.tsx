import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { PeriodProvider } from "@/components/period-context";
import { ThemeProvider } from "@/components/theme-context";
import { CustomDialogProvider } from "@/components/ui/custom-dialog-provider";
import { AppShell } from "@/components/app-shell";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kamael Finance",
  description: "Plataforma de gestão financeira executiva",
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
      <body className="min-h-full flex bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <PeriodProvider>
            <CustomDialogProvider>
              <AppShell>{children}</AppShell>
            </CustomDialogProvider>
          </PeriodProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


