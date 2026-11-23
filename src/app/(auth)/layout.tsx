import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: [
          "radial-gradient(ellipse 700px 500px at 90% 0%, rgba(240,184,128,0.32), transparent)",
          "radial-gradient(ellipse 500px 400px at 5% 95%, rgba(214,148,90,0.14), transparent)",
          "linear-gradient(165deg, #FFF9F2 0%, #FBF0E4 45%, #F4E2CE 100%)",
        ].join(", "),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
        paddingTop: "clamp(52px, 11vh, 88px)",
        paddingBottom: "clamp(36px, 9vh, 64px)",
      }}
    >
      {/* Logo + tagline */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <Logo size="lg" />
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            fontWeight: 400,
            color: "#725E4F",
            lineHeight: 1.5,
            letterSpacing: "0.01em",
          }}
        >
          Dividir responsabilidades.
          <br />
          Multiplicar o bem-estar.
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255, 250, 244, 0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 24,
          border: "1px solid rgba(110, 70, 35, 0.09)",
          padding: "28px 24px 32px",
          boxShadow:
            "0 1px 2px rgba(90,55,25,.05), 0 8px 28px rgba(90,55,25,.09)",
        }}
      >
        {children}
      </div>
    </main>
  );
}
