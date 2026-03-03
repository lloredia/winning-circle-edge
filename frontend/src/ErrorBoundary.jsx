import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", background: "#050505", color: "#ef4444",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", padding: 40, textAlign: "center",
        }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>⚠️</span>
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Something went wrong</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px", background: "#fbbf24", color: "#0a0a0a",
              border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
