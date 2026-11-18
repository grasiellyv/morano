import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

async function loadManrope(): Promise<ArrayBuffer | null> {
  try {
    const signal = AbortSignal.timeout(3000);
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Manrope:wght@700", { signal })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { signal });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function AppleIcon() {
  const font = await loadManrope();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#879080",
        color: "#F5F2EC",
        fontSize: 100,
        fontWeight: 700,
        letterSpacing: "-0.035em",
        fontFamily: font ? "Manrope" : undefined,
      }}
    >
      m<span style={{ color: "#30332F" }}>.</span>
    </div>,
    {
      ...size,
      fonts: font ? [{ name: "Manrope", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
