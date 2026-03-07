import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseAuthInit } from "@/src/components/SupabaseAuthInit";
import { OrgCreditHeader } from "@/src/components/OrgCreditHeader";

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
          <OrgCreditHeader />
          {children}
        </SupabaseAuthInit>
      </body>
    </html>
  );
}
