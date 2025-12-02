import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
    <html lang="en">
      <body className={inter.className}>
        <ProvidersWrapper>
          <div className="fixed top-4 right-4 z-50">
            <ConnectButton />
          </div>
          {children}
        </ProvidersWrapper>
      </body>
    </html>
  );
}
