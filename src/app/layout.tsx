import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanças em Família",
  description:
    "Gestão financeira familiar, orçamento, investimentos e patrimônio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
