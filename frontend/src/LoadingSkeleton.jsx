const skeletonStyle = { background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 6 };

export default function LoadingSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #050505 0%, #0a0f1a 40%, #0d1117 100%)", padding: 24 }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          <div style={{ ...skeletonStyle, width: 52, height: 52, borderRadius: "50%" }} />
          <div>
            <div style={{ ...skeletonStyle, width: 180, height: 24, marginBottom: 8 }} />
            <div style={{ ...skeletonStyle, width: 120, height: 12 }} />
          </div>
        </div>
        <div style={{ ...skeletonStyle, height: 60, marginBottom: 24 }} />
        <div style={{ ...skeletonStyle, height: 120, marginBottom: 24 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ ...skeletonStyle, height: 20, width: 100, marginBottom: 8 }} />
            <div style={{ ...skeletonStyle, height: 72, marginBottom: 8 }} />
            <div style={{ ...skeletonStyle, height: 72 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
