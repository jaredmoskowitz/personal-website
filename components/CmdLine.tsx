interface Props {
  children: React.ReactNode;
}

export default function CmdLine({ children }: Props) {
  return (
    <div className="tm-cmdline">
      <span style={{ color: 'var(--green)' }}>jared@jaredmoskowitz</span>
      <span className="tm-dim">:</span>
      <span className="tm-acc">~$</span>
      <span className="tm-ink" style={{ fontSize: 16, fontWeight: 500 }}>{children}</span>
    </div>
  );
}
