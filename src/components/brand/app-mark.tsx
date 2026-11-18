export function AppMark({ size }: { size: number }) {
  return (
    <div
      className="bg-sage font-heading text-offwhite flex items-center justify-center rounded-[22%] leading-none font-bold tracking-[-0.035em]"
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      m<span className="text-graphite">.</span>
    </div>
  );
}
