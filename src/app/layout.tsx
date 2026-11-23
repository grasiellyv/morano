import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MORANO", template: "%s · MORANO" },
  description: "Sua casa. Sob controle.",
  applicationName: "MORANO",
};

export const viewport: Viewport = {
  themeColor: "#FBF0E4",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={dmSans.variable}>
      <body className="text-foreground font-sans antialiased">
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
