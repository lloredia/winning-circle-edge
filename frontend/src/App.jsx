import { useState, useEffect } from "react";
import LoadingSkeleton from "./LoadingSkeleton.jsx";

// Use same host:3001 when on local network (e.g. Raspberry Pi at 192.168.x.x)
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : `http://${window.location.hostname}:3001`);
const API_KEY = import.meta.env.VITE_API_KEY || "";
const STAKE = 10;

function apiFetch(path) {
  const opts = {};
  if (API_KEY) opts.headers = { "X-API-Key": API_KEY };
  return fetch(`${API_URL}${path}`, opts);
}

const riskColors = { "LOW": "#22c55e", "LOW-MEDIUM": "#84cc16", "MEDIUM": "#eab308", "MEDIUM-HIGH": "#f97316", "HIGH": "#ef4444" };
const typeColors = {
  "NBA": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  "NCAAB": { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  "EPL": { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  "NHL": { bg: "rgba(6,182,212,0.15)", text: "#22d3ee" },
  "MLS": { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
};
const sportLabels = { "EPL": "⚽ PREMIER LEAGUE", "NBA": "🏀 NBA", "NCAAB": "🎓 COLLEGE BASKETBALL", "NHL": "🏒 NHL", "MLS": "⚽ MLS" };

function calcParlay(legs) {
  let d = 1;
  legs.forEach((l) => (d *= l.decimal));
  return {
    decimal: d.toFixed(2),
    american: `+${((d - 1) * 100).toFixed(0)}`,
    payout: (STAKE * d).toFixed(2),
    impliedProb: ((1 / d) * 100).toFixed(4),
  };
}

// Format date for display
function formatDate(d) {
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
}

// Export picks to CSV
function exportCSV(picks, activeLegs) {
  const rows = [["Date", "League", "Pick", "Odds", "Implied", "Risk", "Game", "Edge"]];
  activeLegs.forEach((l) => rows.push([picks.date, l.type, l.pick, l.odds, l.implied, l.risk, l.game, l.edge]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `underdog-edge-${picks.date}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function App() {
  const [picks, setPicks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const loadPicks = (date) => {
    setLoading(true);
    setError(null);
    setPicks(null); // Show skeleton while loading
    apiFetch(`/api/picks/${date}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? `No picks for ${date}` : `Error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPicks(data);
        setSelected(data.legs?.map((_, i) => i) || []);
        setSelectedDate(date);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    apiFetch("/api/history").then((r) => r.json()).then((d) => setHistory(d.dates || []));
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    loadPicks(today);
  }, []);

  if (loading && !picks)
    return <LoadingSkeleton />;

  if (error && !picks)
    return (
      <div style={{ minHeight: "100vh", background: "#050505", color: "#ef4444", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 16, padding: 40, textAlign: "center" }}>
        ❌ {error}<br /><br />
        <span style={{ color: "#64748b", fontSize: 13 }}>Make sure the API server is running:<br />DATA_DIR=./data node services/api-server/server.js</span>
        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <select
              onChange={(e) => { const v = e.target.value; if (v) loadPicks(v); }}
              style={{ padding: "8px 16px", fontSize: 14, background: "#1e293b", color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 6, cursor: "pointer" }}
            >
              <option value="">View past picks...</option>
              {history.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );

  const allLegs = picks.legs || [];
  const activeLegs = selected.map((i) => allLegs[i]);
  const res = calcParlay(activeLegs);
  const sports = [...new Set(allLegs.map((l) => l.type))];

  const toggle = (i) => {
    if (selected.includes(i)) {
      if (selected.length > 2) setSelected(selected.filter((x) => x !== i));
    } else {
      setSelected([...selected, i].sort());
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #050505 0%, #0a0f1a 40%, #0d1117 100%)", color: "#e2e8f0", fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", padding: 0, overflow: "auto" }}>
      {/* WINNING CIRCLE HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)", padding: "20px 24px 12px", borderBottom: "2px solid #fbbf24", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 920, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(251,191,36,0.3), inset 0 1px 2px rgba(255,255,255,0.3)", flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#0a0a0a", letterSpacing: -1 }}>WC</span>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", margin: 0, color: "#fbbf24" }}>WINNING CIRCLE</h1>
              <p style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#64748b", margin: "2px 0 0", fontWeight: 600 }}>ELITE SPORTS ANALYTICS GROUP</p>
            </div>
          </div>
        </div>
      </div>

      {/* UNDERDOG EDGE SUBHEADER + DATE PICKER + EXPORT */}
      <div style={{ background: "linear-gradient(90deg, #dc2626 0%, #b91c1c 40%, #991b1b 70%, #7f1d1d 100%)", padding: "14px 24px", borderBottom: "1px solid #fbbf2444" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", margin: 0, color: "#fff" }}>UNDERDOG EDGE™</h2>
              <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#fbbf24", margin: 0, fontWeight: 700 }}>
                LONGSHOT PARLAY BUILDER • {sports.join(" + ")} • {picks.date}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const dates = [...new Set([today, ...(history || []), picks?.date])].filter(Boolean).sort().reverse();
              return dates.length > 0 && (
                <select
                  value={selectedDate || picks.date}
                  onChange={(e) => loadPicks(e.target.value)}
                  style={{ padding: "6px 12px", fontSize: 12, background: "#1e293b", color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 6, cursor: "pointer" }}
                >
                  {dates.map((d) => (
                    <option key={d} value={d}>{d === today ? "Today" : formatDate(d)}</option>
                  ))}
                </select>
              );
            })()}
            <button
              onClick={() => exportCSV(picks, activeLegs)}
              style={{ padding: "6px 12px", fontSize: 12, background: "#fbbf24", color: "#0a0a0a", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* PAYOUT DASHBOARD */}
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Combined Odds ({activeLegs.length} Legs)</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{res.american}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>$10 Stake → Payout</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>${Number(res.payout).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Implied Probability</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#ef4444", lineHeight: 1 }}>{res.impliedProb}%</div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 6, border: "1px solid rgba(251,191,36,0.2)", fontSize: 11, color: "#fbbf24" }}>
            ⚡ {res.decimal}x multiplier — Click any leg to expand. Toggle checkboxes to customize your parlay.
          </div>
        </div>

        {/* LEGS BY SPORT */}
        {sports.map((sport) => {
          const sportLegs = allLegs.filter((l) => l.type === sport);
          const tc = typeColors[sport] || { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" };
          return (
            <div key={sport}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: tc.text, textTransform: "uppercase" }}>{sportLabels[sport] || sport}</div>
                <div style={{ flex: 1, height: 1, background: `${tc.text}33` }} />
              </div>
              {sportLegs.map((leg) => {
                const i = allLegs.indexOf(leg);
                const isActive = selected.includes(i);
                const isExpanded = expanded === i;
                return (
                  <div key={i} style={{ background: isActive ? "linear-gradient(135deg, #1e293b 0%, #1a2332 100%)" : "rgba(30,41,59,0.3)", border: `1px solid ${isActive ? "#475569" : "#1e293b"}`, borderLeft: `4px solid ${isActive ? tc.text : "#334155"}`, borderRadius: 10, marginBottom: 10, overflow: "hidden", opacity: isActive ? 1 : 0.5, transition: "all 0.2s ease" }}>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : i)}>
                      <div onClick={(e) => { e.stopPropagation(); toggle(i); }} style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${isActive ? "#22c55e" : "#475569"}`, background: isActive ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 14, color: "#0a0a0a", fontWeight: 900 }}>{isActive ? "✓" : ""}</div>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 3, background: tc.bg, color: tc.text, flexShrink: 0 }}>{leg.type}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{leg.icon} {leg.pick}</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{leg.game} • {leg.time}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: leg.odds.startsWith("+") && parseInt(leg.odds.replace("+", "")) > 200 ? "#fbbf24" : leg.odds.startsWith("-") ? "#94a3b8" : "#22c55e", flexShrink: 0 }}>{leg.odds}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, background: `${riskColors[leg.risk]}22`, color: riskColors[leg.risk], border: `1px solid ${riskColors[leg.risk]}44`, flexShrink: 0 }}>{leg.risk}</div>
                      <div style={{ fontSize: 16, color: "#475569", flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e293b" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 14, marginBottom: 14 }}>
                          {[["Spread/Fav", leg.spread], ["Total", leg.ou], ["Implied Prob", leg.implied], ["Decimal", `${leg.decimal}x`]].map(([label, val], j) => (
                            <div key={j} style={{ background: "#0f172a", borderRadius: 6, padding: "8px 10px" }}>
                              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: j === 2 ? "#ef4444" : j === 3 ? "#fbbf24" : "#f1f5f9" }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>📊 Analysis & Rationale</div>
                          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, background: "#0f172a", padding: 12, borderRadius: 6, borderLeft: `3px solid ${tc.text}` }}>{leg.rationale}</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>🎯 Edge</div>
                            <div style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "6px 10px", borderRadius: 4, border: "1px solid rgba(34,197,94,0.2)" }}>{leg.edge}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>🔄 Safer Alternative</div>
                            <div style={{ fontSize: 11, color: "#60a5fa", background: "rgba(96,165,250,0.08)", padding: "6px 10px", borderRadius: 4, border: "1px solid rgba(96,165,250,0.2)" }}>{leg.alt}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* QUICK REFERENCE TABLE */}
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid #334155", borderRadius: 10, padding: "16px 20px", marginTop: 24, marginBottom: 16, overflowX: "auto" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>📋 Quick Reference — {selected.length} Active Legs</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["#", "League", "Pick", "Odds", "Impl.", "Risk"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeLegs.map((l, i) => {
                const tc = typeColors[l.type] || { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" };
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px", color: "#475569", fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: tc.bg, color: tc.text }}>{l.type}</span></td>
                    <td style={{ padding: "8px", color: "#e2e8f0", fontWeight: 600 }}>{l.icon} {l.pick}</td>
                    <td style={{ padding: "8px", color: l.odds.startsWith("-") ? "#94a3b8" : "#fbbf24", fontWeight: 800 }}>{l.odds}</td>
                    <td style={{ padding: "8px", color: "#ef4444" }}>{l.implied}</td>
                    <td style={{ padding: "8px" }}><span style={{ color: riskColors[l.risk], fontSize: 10, fontWeight: 700 }}>{l.risk}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* DISCLAIMER */}
        <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>High-Risk Disclaimer</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
                This is a <strong style={{ color: "#ef4444" }}>longshot parlay</strong> with an implied hit probability of approximately <strong style={{ color: "#ef4444" }}>{res.impliedProb}%</strong>. Never bet more than you can afford to lose. For entertainment only — not financial advice. Verify live lines before placing any wager. If gambling is causing problems, call <strong style={{ color: "#fbbf24" }}>1-800-GAMBLER</strong>. 21+ only.
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 9, color: "#334155", letterSpacing: 2, textTransform: "uppercase" }}>
          WINNING CIRCLE × UNDERDOG EDGE™ • Built by LESLEADS Consulting • {picks.date}
        </div>
      </div>
    </div>
  );
}
