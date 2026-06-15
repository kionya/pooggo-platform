import type { Metadata } from "next";
import { notoSerifKr } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "PooGGo Global — K-Medical Concierge",
  description: "Trusted concierge for international patients seeking Korean medical & beauty care.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSerifKr.variable}>
      <body>{children}</body>
    </html>
  );
}
