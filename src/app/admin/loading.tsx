export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="skeleton" style={{ height: 32, width: 240 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 96 }} />
      </div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
