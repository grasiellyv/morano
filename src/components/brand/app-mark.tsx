export function AppMark({ size }: { size: number }) {
  return (
    <div
      className="font-heading flex items-center justify-center rounded-[22%] leading-none font-bold tracking-[-0.035em]"
      style={{ width: size, height: size, fontSize: size * 0.56, background: "#D98A2B", color: "#FBEFE3" }}
    >
      m<span style={{ color: "#2A1B12" }}>.</span>
    </div>
  );
}
