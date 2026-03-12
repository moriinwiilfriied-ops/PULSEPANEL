import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseAuthInit } from "@/src/components/SupabaseAuthInit";
import { DashboardShell } from "@/src/components/DashboardShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulsePanel — Dashboard",
  description: "Tableau de bord campagnes PulsePanel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseAuthInit>
          <DashboardShell>{children}</DashboardShell>
        </SupabaseAuthInit>
      </body>
    </html>
  );
}
