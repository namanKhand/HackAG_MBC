import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientLayout from "../components/ClientLayout";
import "./globals.css";
import { ProvidersWrapper } from "../components/ProvidersWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Base Poker",
  description: "On-chain Poker on Base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-black`} suppressHydrationWarning>
        <ProvidersWrapper>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
