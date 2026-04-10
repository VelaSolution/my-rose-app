export default function HQLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "-64px" }}>
      {children}
    </div>
  );
}
