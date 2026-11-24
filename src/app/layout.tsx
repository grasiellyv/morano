import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Corpo: Plus Jakarta Sans (itens, legendas, badges, botões, inputs, navegação).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

// Títulos e números de destaque: Quincy CF, servida pelo kit do Adobe Fonts
// (fonte comercial, sem arquivo local). O kit só responde a domínios cadastrados
// em fonts.adobe.com → Web Projects; fora deles cai no fallback Georgia.
const QUINCY_KIT = "https://use.typekit.net/tjw1unx.css";

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
    <html lang="pt-BR" className={jakarta.variable}>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={QUINCY_KIT} />
      </head>
      <body className="text-foreground font-sans antialiased">
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
