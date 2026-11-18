import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MORANO", template: "%s · MORANO" },
  description: "Sua casa. Sob controle.",
  applicationName: "MORANO",
};

export const viewport: Viewport = {
  themeColor: "#F5F2EC",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inter.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
