"use client";

import { useEffect, useMemo, useState } from "react";

type View = "overview" | "chat" | "models" | "traces" | "settings" | "evaluations" | "teams" | "keys";
type ThemeMode = "light" | "dark";

const navItems: { id: View; label: string; short: string }[] = [
  { id: "overview", label: "Operations overview", short: "OV" },
  { id: "chat", label: "AI workspace", short: "AI" },
  { id: "models", label: "Model catalog", short: "MO" },
  { id: "traces", label: "Trace explorer", short: "TR" },
  { id: "settings", label: "Configuration", short: "CO" },
];

const governanceItems: { id: View; label: string; short: string }[] = [
  { id: "evaluations", label: "Evaluations", short: "EV" },
  { id: "teams", label: "Teams & access", short: "TA" },
  { id: "keys", label: "API keys", short: "AK" },
];

const allNavigationItems = [...navItems, ...governanceItems];

const modelHealth = [
  { name: "Orion Pro 4.1", provider: "Vertex", status: "Healthy", latency: "740 ms", usage: 84 },
  { name: "Nova Reasoning", provider: "Bedrock", status: "Healthy", latency: "1.12 s", usage: 67 },
  { name: "Atlas 3.5", provider: "Azure AI", status: "Degraded", latency: "2.84 s", usage: 49 },
  { name: "Scribe Small", provider: "Internal", status: "Healthy", latency: "380 ms", usage: 33 },
];

const traceRows = [
  { id: "trc_8F21A", app: "Audience Insights", model: "Orion Pro 4.1", team: "Data Science", cost: "$0.084", duration: "1.26 s", score: "0.94", status: "Success", time: "10:42:18" },
  { id: "trc_8F219", app: "Content Assist", model: "Atlas 3.5", team: "Studios", cost: "$0.116", duration: "3.88 s", score: "0.42", status: "Failed", time: "10:41:52" },
  { id: "trc_8F218", app: "Support Copilot", model: "Nova Reasoning", team: "Guest Care", cost: "$0.042", duration: "1.91 s", score: "0.88", status: "Success", time: "10:40:31" },
  { id: "trc_8F217", app: "Campaign Studio", model: "Orion Pro 4.1", team: "Marketing", cost: "$0.063", duration: "1.08 s", score: "0.91", status: "Success", time: "10:39:04" },
  { id: "trc_8F216", app: "Knowledge Search", model: "Scribe Small", team: "Enterprise", cost: "$0.009", duration: "0.62 s", score: "0.78", status: "Warning", time: "10:38:47" },
];

function Sparkline({ color = "var(--violet)" }: { color?: string }) {
  return (
    <svg className="sparkline" viewBox="0 0 116 36" role="img" aria-label="Seven day increasing trend">
      <path d="M2 31 C13 30 17 22 28 25 S45 12 55 18 S74 25 83 12 S100 8 114 3" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}><span className="badge-dot" />{children}</span>;
}

function Header({ title, theme, onTheme, onMenu }: { title: string; theme: ThemeMode; onTheme: () => void; onMenu: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={onMenu}>☰</button>
        <div>
          <p className="eyebrow">StudioAI / Platform operations</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        <button className="environment"><span className="live-dot" /> Production <span aria-hidden="true">⌄</span></button>
        <button className="icon-button" aria-label="Toggle color mode" onClick={onTheme}>{theme === "light" ? "◐" : "☀"}</button>
        <button className="icon-button notification" aria-label="Notifications">◎<span /></button>
        <button className="avatar" aria-label="Open user menu">VM</button>
      </div>
    </header>
  );
}

function Sidebar({ active, setActive, open, close }: { active: View; setActive: (view: View) => void; open: boolean; close: () => void }) {
  return (
    <>
      {open && <button className="backdrop" aria-label="Close navigation" onClick={close} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><span /></div><div><strong>StudioAI</strong><small>Control Center</small></div></div>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => (
            <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => { setActive(item.id); close(); }}>
              <span className="nav-icon">{item.short}</span><span>{item.label}</span>{active === item.id && <i />}
            </button>
          ))}
          <p className="nav-label secondary">Governance</p>
          {governanceItems.map((item) => (
            <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => { setActive(item.id); close(); }}>
              <span className="nav-icon">{item.short}</span><span>{item.label}</span>{active === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="budget-head"><span>Monthly platform budget</span><strong>68%</strong></div>
          <div className="budget-bar"><span /></div>
          <p>$47,620 of $70,000 used</p>
          <button><span className="nav-icon">?</span><span>Help & documentation</span></button>
        </div>
      </aside>
    </>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [range, setRange] = useState("30");
  const [application, setApplication] = useState("All applications");
  const [status, setStatus] = useState("All statuses");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("Total requests");
  const rangeScale = range === "7" ? 0.31 : range === "90" ? 2.74 : 1;
  const appScale = application === "All applications" ? 1 : application === "Content Assist" ? 0.34 : 0.22;
  const requestTotal = 1.84 * rangeScale * appScale;
  const metrics = [
    { label: "Total requests", value: `${requestTotal.toFixed(requestTotal < 1 ? 2 : 1)}M`, delta: "+12.4%", tone: "violet", detail: "Request volume is tracking 8% above the monthly forecast." },
    { label: "Estimated cost", value: `$${(47.6 * rangeScale * appScale).toFixed(1)}K`, delta: "+6.8%", tone: "blue", detail: "Spend remains within the approved platform budget." },
    { label: "P95 latency", value: application === "Content Assist" ? "2.84 s" : "2.48 s", delta: "-8.1%", tone: "green", detail: "Latency improved after the latest gateway routing update." },
    { label: "Evaluation pass", value: application === "Support Copilot" ? "94.2%" : "91.7%", delta: "+2.3%", tone: "amber", detail: "Quality is above the 90% production target." },
  ];
  const baseBars = [44, 54, 48, 69, 64, 78, 74, 86, 75, 92, 88, 98, 86, 92];
  const bars = baseBars.map((height) => Math.max(18, Math.round(height * (application === "All applications" ? 1 : .76))));
  const selectedDetail = metrics.find((metric) => metric.label === selectedMetric)?.detail;
  const visibleTraces = status === "All statuses" ? traceRows.slice(0, 4) : traceRows.filter((row) => row.status === status).slice(0, 4);
  return (
    <div className="page-grid">
      <section className="main-column">
        <div className="section-heading">
          <div><h2>Good morning, Victor</h2><p>Here’s how your AI platform is performing today.</p></div>
          <div className="filter-row">
            <label className="sr-only" htmlFor="date-range">Date range</label>
            <select id="date-range" value={range} onChange={(event) => setRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
            <label className="sr-only" htmlFor="application-filter">Application</label>
            <select id="application-filter" value={application} onChange={(event) => setApplication(event.target.value)}><option>All applications</option><option>Content Assist</option><option>Support Copilot</option></select>
            <button className={`filter-button ${filtersOpen ? "active" : ""}`} aria-label="Toggle advanced filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>≡</button>
          </div>
        </div>
        {filtersOpen && <div className="filter-panel"><div><span>Request status</span>{["All statuses", "Success", "Failed", "Warning"].map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item}</button>)}</div><button className="reset-filter" onClick={() => { setRange("30"); setApplication("All applications"); setStatus("All statuses"); }}>Reset filters</button></div>}
        <div className="metric-grid">
          {metrics.map(({ label, value, delta, tone }) => (
            <button type="button" className={`metric-card ${selectedMetric === label ? "selected" : ""}`} key={label} aria-pressed={selectedMetric === label} onClick={() => setSelectedMetric(label)}>
              <div className="metric-top"><span>{label}</span><span aria-hidden="true">•••</span></div>
              <div className="metric-value"><strong>{value}</strong><Sparkline color={`var(--${tone})`} /></div>
              <p><span className="positive">{delta}</span> vs previous period</p>
            </button>
          ))}
        </div>
        <div className="insight-strip" aria-live="polite"><span>Insight</span><strong>{selectedMetric}</strong><p>{selectedDetail}</p></div>
        <article className="panel usage-panel">
          <div className="panel-head"><div><h3>Request volume</h3><p>Successful and failed requests across all applications</p></div><div className="legend"><span><i className="success-key" />Successful</span><span><i className="error-key" />Failed</span></div></div>
          <div className="chart-wrap">
            <div className="y-labels"><span>120K</span><span>80K</span><span>40K</span><span>0</span></div>
            <div className="bar-chart" role="img" aria-label="Request volume rose from 44,000 to 92,000 daily requests over the past fourteen days">
              {bars.map((height, i) => <div className="bar-col" key={i} title={`${Math.round(height * 1.2)}K requests`}><div className="bar-stack" style={{ height: `${height}%` }}><span className="bar-fail" /><span className="bar-success" /></div><small>{i % 2 === 0 ? `Jul ${i + 17}` : ""}</small></div>)}
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><h3>Recent traces</h3><p>Latest requests across the AI portfolio</p></div><button className="text-button" onClick={() => onNavigate("traces")}>View all traces →</button></div>
          <div className="table-scroll">
            <table><thead><tr><th>Trace ID</th><th>Application</th><th>Model</th><th>Duration</th><th>Eval</th><th>Status</th></tr></thead>
              <tbody>{visibleTraces.length ? visibleTraces.map((row) => <tr key={row.id}><td><button className="trace-link" onClick={() => onNavigate("traces")}>{row.id}</button></td><td>{row.app}</td><td>{row.model}</td><td>{row.duration}</td><td><strong>{row.score}</strong></td><td><Badge tone={row.status.toLowerCase()}>{row.status}</Badge></td></tr>) : <tr><td colSpan={6} className="empty-row">No traces match the selected status.</td></tr>}</tbody>
            </table>
          </div>
        </article>
      </section>
      <aside className="right-column">
        <article className="panel health-panel">
          <div className="panel-head"><div><h3>Model health</h3><p>Live gateway status</p></div><span className="refresh">Updated now</span></div>
          <div className="health-list">{modelHealth.map((model) => <div className="health-item" key={model.name}><div className="model-monogram">{model.name.slice(0, 2).toUpperCase()}</div><div className="health-copy"><strong>{model.name}</strong><span>{model.provider} · {model.latency}</span></div><Badge tone={model.status === "Healthy" ? "success" : "warning"}>{model.status}</Badge></div>)}</div>
          <button className="full-button" onClick={() => onNavigate("models")}>Manage model catalog</button>
        </article>
        <article className="panel cost-panel">
          <div className="panel-head"><div><h3>Cost by model</h3><p>Current billing period</p></div><button>•••</button></div>
          <div className="donut-row"><div className="donut"><div><strong>$47.6K</strong><span>Total spend</span></div></div><div className="donut-legend"><span><i className="v" />Orion Pro <b>42%</b></span><span><i className="b" />Nova <b>28%</b></span><span><i className="c" />Atlas <b>19%</b></span><span><i className="g" />Other <b>11%</b></span></div></div>
        </article>
        <article className="panel alert-panel"><div className="alert-icon">!</div><div><strong>Latency threshold exceeded</strong><p>Atlas 3.5 P95 latency is 38% above target.</p><button onClick={() => onNavigate("traces")}>Investigate traces →</button></div></article>
      </aside>
    </div>
  );
}

function ChatWorkspace() {
  const [streaming, setStreaming] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("I analyzed the latest 12,481 support interactions. Three themes drove 71% of negative sentiment: delayed activation, unclear billing adjustments, and password recovery friction.\n\nThe strongest opportunity is activation messaging. Customers who received proactive status updates were 34% less likely to contact support again within seven days.");
  useEffect(() => {
    if (!streaming) return;
    const full = "Based on the current operations data, I recommend prioritizing Atlas 3.5 latency remediation, then expanding the proactive activation workflow. This combination should improve both platform reliability and guest satisfaction without increasing model spend.";
    setAnswer("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 4;
      setAnswer(full.slice(0, index));
      if (index >= full.length) { window.clearInterval(timer); setStreaming(false); }
    }, 30);
    return () => window.clearInterval(timer);
  }, [streaming]);
  return (
    <div className="chat-layout">
      <aside className="conversation-list"><button className="new-chat">＋ New conversation</button><label className="search-box"><span>⌕</span><input aria-label="Search conversations" placeholder="Search conversations" /></label><p className="nav-label">Today</p>{["Support sentiment summary", "Q3 campaign concepts", "Attraction wait-time analysis"].map((name, i) => <button className={i === 0 ? "conversation active" : "conversation"} key={name}><span>{name}</span><small>{i === 0 ? "8 min" : `${i + 1} hr`}</small></button>)}</aside>
      <section className="chat-main">
        <div className="chat-head"><div><h2>Support sentiment summary</h2><p>Private workspace · Saved automatically</p></div><button className="model-picker"><span className="model-dot" />Orion Pro 4.1 <span>⌄</span></button></div>
        <div className="messages">
          <div className="message user-message"><div className="message-avatar">VM</div><div><strong>You</strong><p>Summarize the top customer-support pain points from this month and recommend the highest-impact action.</p><div className="file-chip">▣ July_support_feedback.csv <span>2.4 MB</span></div></div></div>
          <div className="message assistant-message"><div className="assistant-avatar">S</div><div><div className="assistant-meta"><strong>StudioAI</strong><span>Orion Pro 4.1</span></div><div className="answer" aria-live="polite">{answer}{streaming && <span className="cursor" />}</div><div className="response-foot"><span>1,284 tokens</span><span>1.42 s</span><span>$0.038</span><div /><button aria-label="Copy response">Copy</button><button aria-label="Helpful response">Good</button><button aria-label="Unhelpful response">Needs work</button></div><details className="sources"><summary>3 sources used</summary><p>July support feedback · Guest care taxonomy · Monthly service report</p></details></div></div>
        </div>
        <form className="composer" onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) { setStreaming(true); setPrompt(""); } }}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Message StudioAI" placeholder="Ask StudioAI anything…" rows={2} /><div className="composer-actions"><div><button type="button" aria-label="Attach file">＋</button><button type="button">Sources: on</button></div>{streaming ? <button type="button" className="send" onClick={() => setStreaming(false)}>■ Stop</button> : <button className="send" type="submit">Send ↑</button>}</div><small>StudioAI can make mistakes. Verify important information.</small></form>
      </section>
    </div>
  );
}

function Models() {
  const [selected, setSelected] = useState<(typeof modelHealth)[number] | null>(null);
  return (
    <div className="content-page"><div className="section-heading"><div><h2>Model catalog</h2><p>Manage approved models, routing policies, and team access.</p></div><button className="primary-button">＋ Add model</button></div>
      <div className="toolbar"><label className="search-box wide"><span>⌕</span><input aria-label="Search models" placeholder="Search models or providers" /></label><button>All providers ⌄</button><button>All capabilities ⌄</button></div>
      <div className="model-grid">{modelHealth.map((model, i) => <article className="model-card" key={model.name}><div className="model-card-head"><div className={`model-logo tone-${i}`}>{model.name.slice(0, 2).toUpperCase()}</div><button aria-label={`More options for ${model.name}`}>•••</button></div><Badge tone={model.status === "Healthy" ? "success" : "warning"}>{model.status}</Badge><h3>{model.name}</h3><p>{model.provider} · Text generation</p><div className="capabilities"><span>Chat</span><span>Tools</span>{i < 2 && <span>Vision</span>}</div><dl><div><dt>Avg latency</dt><dd>{model.latency}</dd></div><div><dt>Context</dt><dd>{i % 2 ? "128K" : "1M"}</dd></div><div><dt>30-day usage</dt><dd>{model.usage}%</dd></div></dl><div className="usage-track"><span style={{ width: `${model.usage}%` }} /></div><button className="full-button" onClick={() => setSelected(model)}>View configuration</button></article>)}</div>
      {selected && <div className="drawer-wrap"><button className="backdrop visible" aria-label="Close model details" onClick={() => setSelected(null)} /><aside className="drawer" role="dialog" aria-modal="true" aria-label={`${selected.name} configuration`}><div className="drawer-head"><div><p className="eyebrow">Model configuration</p><h2>{selected.name}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">×</button></div><div className="drawer-body"><Badge tone={selected.status === "Healthy" ? "success" : "warning"}>{selected.status}</Badge><h3>General</h3><label>Display name<input defaultValue={selected.name} /></label><label>Provider<select defaultValue={selected.provider}><option>{selected.provider}</option></select></label><label>Gateway route<input defaultValue={`/v1/${selected.name.toLowerCase().replaceAll(" ", "-")}`} /></label><h3>Traffic policy</h3><div className="form-row"><label>Requests / minute<input type="number" defaultValue="2400" /></label><label>Fallback model<select defaultValue="Scribe Small"><option>Scribe Small</option><option>Nova Reasoning</option></select></label></div><h3>Team access</h3>{["Data Science", "Studios", "Marketing", "Guest Care"].map((team) => <label className="check-row" key={team}><input type="checkbox" defaultChecked />{team}<span>Approved</span></label>)}</div><div className="drawer-actions"><button onClick={() => setSelected(null)}>Cancel</button><button className="primary-button" onClick={() => setSelected(null)}>Save changes</button></div></aside></div>}
    </div>
  );
}

function Traces() {
  const [selected, setSelected] = useState(traceRows[1]);
  const steps = ["User request", "Authentication", "Knowledge retrieval", "Prompt construction", "Model request", "Model response", "Evaluation", "Final output"];
  return (
    <div className="content-page"><div className="section-heading"><div><h2>Trace explorer</h2><p>Investigate requests across every AI application and model.</p></div><button>Export traces ↓</button></div><div className="trace-stats"><div><span>Requests analyzed</span><strong>184,291</strong></div><div><span>Error rate</span><strong className="danger-text">1.8%</strong></div><div><span>Avg duration</span><strong>1.42 s</strong></div><div><span>Avg eval score</span><strong>0.87</strong></div></div>
      <div className="toolbar"><label className="search-box wide"><span>⌕</span><input aria-label="Search traces" placeholder="Search trace ID, user, or application" /></label><button>Status: all ⌄</button><button>Model: all ⌄</button><button>Date: today ⌄</button></div>
      <div className="trace-split"><article className="panel trace-table"><div className="table-scroll"><table><thead><tr><th>Trace</th><th>Application</th><th>Team</th><th>Cost</th><th>Duration</th><th>Eval</th><th>Status</th></tr></thead><tbody>{traceRows.map((row) => <tr key={row.id} className={selected.id === row.id ? "selected" : ""} onClick={() => setSelected(row)}><td><button className="trace-link">{row.id}</button><small>{row.time}</small></td><td>{row.app}<small>{row.model}</small></td><td>{row.team}</td><td>{row.cost}</td><td>{row.duration}</td><td><strong>{row.score}</strong></td><td><Badge tone={row.status.toLowerCase()}>{row.status}</Badge></td></tr>)}</tbody></table></div></article>
        <aside className="panel trace-detail"><div className="panel-head"><div><p className="eyebrow">Trace detail</p><h3>{selected.id}</h3></div><Badge tone={selected.status.toLowerCase()}>{selected.status}</Badge></div><div className="trace-summary"><div><span>Application</span><strong>{selected.app}</strong></div><div><span>Model</span><strong>{selected.model}</strong></div><div><span>Total duration</span><strong>{selected.duration}</strong></div><div><span>Cost</span><strong>{selected.cost}</strong></div></div><h4>Execution timeline</h4><ol className="timeline">{steps.map((step, i) => <li key={step} className={selected.status === "Failed" && i === 5 ? "failed" : ""}><i>{selected.status === "Failed" && i === 5 ? "!" : "✓"}</i><div><strong>{step}</strong><span>{i === 4 ? "2.31 s" : `${12 + i * 7} ms`}</span>{selected.status === "Failed" && i === 5 && <p>Provider timeout: response exceeded 3,000 ms threshold.</p>}</div></li>)}</ol></aside></div>
    </div>
  );
}

function Evaluations() {
  const [suite, setSuite] = useState("Production quality");
  const scores = suite === "Safety regression" ? ["99.2%", "98.7%", "97.9%", "99.6%"] : ["91.7%", "89.4%", "93.1%", "96.8%"];
  const failedCases = [
    { id: "eval_4812", test: "Attribution accuracy", model: "Atlas 3.5", score: "0.42", reason: "Citation did not support the generated claim" },
    { id: "eval_4806", test: "Answer relevance", model: "Scribe Small", score: "0.58", reason: "Response omitted the requested comparison" },
    { id: "eval_4798", test: "Groundedness", model: "Nova Reasoning", score: "0.61", reason: "Two statements were not present in context" },
  ];
  return <div className="content-page"><div className="section-heading"><div><h2>Evaluation dashboard</h2><p>Monitor AI quality, safety, and regression performance.</p></div><button className="primary-button">Run evaluation</button></div><div className="toolbar"><label className="search-box wide"><span>Suite</span><select aria-label="Evaluation suite" value={suite} onChange={(event) => setSuite(event.target.value)}><option>Production quality</option><option>Safety regression</option></select></label><button>Last 30 days</button><button>All models</button></div><div className="trace-stats governance-stats">{[["Pass rate", scores[0]], ["Groundedness", scores[1]], ["Relevance", scores[2]], ["Safety", scores[3]]].map(([label, value], index) => <button key={label} className="governance-stat"><span>{label}</span><strong>{value}</strong><small>{index === 0 ? "+2.3% this period" : "Above target"}</small></button>)}</div><div className="governance-grid"><article className="panel quality-panel"><div className="panel-head"><div><h3>Regression history</h3><p>Pass percentage across the last eight releases</p></div><Badge tone="success">Stable</Badge></div><div className="quality-bars" role="img" aria-label="Evaluation pass rate improved from 84 to 92 percent across eight releases">{[84, 86, 85, 88, 87, 90, 91, 92].map((value, index) => <div key={index}><span style={{ height: `${value}%` }} /><small>v{index + 12}</small></div>)}</div></article><article className="panel rubric-panel"><div className="panel-head"><div><h3>Quality dimensions</h3><p>Weighted evaluation rubric</p></div></div>{[["Correctness", 93], ["Groundedness", 89], ["Relevance", 94], ["Safety", 97]].map(([label, value]) => <div className="rubric-row" key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}</article></div><article className="panel governance-table"><div className="panel-head"><div><h3>Failed test cases</h3><p>Cases requiring reviewer attention</p></div><button>Open review queue</button></div><div className="table-scroll"><table><thead><tr><th>Evaluation</th><th>Test</th><th>Model</th><th>Score</th><th>Explanation</th><th>Status</th></tr></thead><tbody>{failedCases.map((item) => <tr key={item.id}><td><button className="trace-link">{item.id}</button></td><td>{item.test}</td><td>{item.model}</td><td><strong>{item.score}</strong></td><td>{item.reason}</td><td><Badge tone="failed">Review</Badge></td></tr>)}</tbody></table></div></article></div>;
}

function TeamsAccess() {
  const teams = [
    { name: "Data Science", members: 24, role: "Builder", models: "4 models", budget: "$18,000", spend: 72 },
    { name: "Studios", members: 41, role: "User", models: "3 models", budget: "$16,000", spend: 58 },
    { name: "Marketing", members: 33, role: "User", models: "2 models", budget: "$12,000", spend: 81 },
    { name: "Guest Care", members: 68, role: "User", models: "3 models", budget: "$20,000", spend: 64 },
  ];
  const [query, setQuery] = useState("");
  const visibleTeams = teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="content-page"><div className="section-heading"><div><h2>Teams & access</h2><p>Control roles, model access, and monthly AI budgets.</p></div><button className="primary-button">+ Create team</button></div><div className="trace-stats governance-stats"><div><span>Active users</span><strong>166</strong><small>14 active today</small></div><div><span>Teams</span><strong>8</strong><small>4 shown below</small></div><div><span>Budget allocated</span><strong>$70K</strong><small>Monthly</small></div><div><span>Current spend</span><strong>$47.6K</strong><small>68% utilized</small></div></div><div className="toolbar"><label className="search-box wide"><span>⌕</span><input aria-label="Search teams" placeholder="Search teams" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button>All roles</button><button>Export access report</button></div><article className="panel governance-table"><div className="table-scroll"><table><thead><tr><th>Team</th><th>Members</th><th>Default role</th><th>Model access</th><th>Monthly budget</th><th>Spend</th><th>Status</th></tr></thead><tbody>{visibleTeams.map((team) => <tr key={team.name}><td><strong>{team.name}</strong></td><td>{team.members}</td><td>{team.role}</td><td>{team.models}</td><td>{team.budget}</td><td><div className="table-progress"><span style={{ width: `${team.spend}%` }} /></div><small>{team.spend}%</small></td><td><Badge tone="success">Active</Badge></td></tr>)}</tbody></table></div></article></div>;
}

function ApiKeys() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keys, setKeys] = useState([
    { name: "Content Assist Production", prefix: "sk-studio-84f2...", team: "Studios", created: "Jul 12, 2026", expires: "Oct 12, 2026", status: "Active" },
    { name: "Audience Insights", prefix: "sk-studio-19ac...", team: "Data Science", created: "Jun 28, 2026", expires: "Sep 28, 2026", status: "Active" },
    { name: "Campaign Sandbox", prefix: "sk-studio-77bd...", team: "Marketing", created: "May 04, 2026", expires: "Aug 04, 2026", status: "Expiring" },
  ]);
  const createKey = () => { if (!keyName.trim()) return; setKeys([{ name: keyName, prefix: "sk-studio-new1...", team: "Enterprise", created: "Jul 31, 2026", expires: "Oct 31, 2026", status: "Active" }, ...keys]); setKeyName(""); setDialogOpen(false); };
  return <div className="content-page"><div className="section-heading"><div><h2>Virtual API keys</h2><p>Issue scoped credentials with budgets, rate limits, and expiration.</p></div><button className="primary-button" onClick={() => setDialogOpen(true)}>+ Create key</button></div><div className="security-notice"><div>!</div><p><strong>Keys are shown only once when created.</strong><span>Store secrets in an approved vault and rotate them regularly.</span></p></div><div className="trace-stats governance-stats"><div><span>Active keys</span><strong>{keys.filter((key) => key.status === "Active").length}</strong><small>Across 6 teams</small></div><div><span>Requests today</span><strong>62.4K</strong><small>Within rate limits</small></div><div><span>Expiring soon</span><strong>1</strong><small>Within 14 days</small></div><div><span>Revoked this month</span><strong>3</strong><small>Audit retained</small></div></div><article className="panel governance-table"><div className="panel-head"><div><h3>Issued keys</h3><p>Only masked prefixes are displayed</p></div></div><div className="table-scroll"><table><thead><tr><th>Name</th><th>Key prefix</th><th>Team</th><th>Created</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody>{keys.map((key) => <tr key={key.name}><td><strong>{key.name}</strong></td><td><code>{key.prefix}</code></td><td>{key.team}</td><td>{key.created}</td><td>{key.expires}</td><td><Badge tone={key.status === "Active" ? "success" : "warning"}>{key.status}</Badge></td><td><button className="danger-button" onClick={() => setKeys(keys.filter((item) => item.name !== key.name))}>Revoke</button></td></tr>)}</tbody></table></div></article>{dialogOpen && <div className="drawer-wrap"><button className="backdrop visible" aria-label="Close create key dialog" onClick={() => setDialogOpen(false)} /><section className="key-dialog" role="dialog" aria-modal="true" aria-labelledby="create-key-title"><div className="drawer-head"><div><p className="eyebrow">Credential management</p><h2 id="create-key-title">Create virtual API key</h2></div><button className="icon-button" aria-label="Close" onClick={() => setDialogOpen(false)}>×</button></div><div className="drawer-body"><label>Key name<input autoFocus value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="e.g. Support Copilot production" /></label><label>Team<select defaultValue="Enterprise"><option>Enterprise</option><option>Data Science</option><option>Studios</option></select></label><div className="form-row"><label>Monthly limit<input defaultValue="$5,000" /></label><label>Expiration<select defaultValue="90 days"><option>30 days</option><option>90 days</option><option>180 days</option></select></label></div><label>Allowed models<select defaultValue="Approved production models"><option>Approved production models</option><option>All models</option></select></label></div><div className="drawer-actions"><button onClick={() => setDialogOpen(false)}>Cancel</button><button className="primary-button" disabled={!keyName.trim()} onClick={createKey}>Create key</button></div></section></div>}</div>;
}

function Settings({ theme, setTheme }: { theme: ThemeMode; setTheme: (theme: ThemeMode) => void }) {
  const [color, setColor] = useState("#6558D9");
  return <div className="content-page settings-page"><div className="section-heading"><div><h2>Configuration center</h2><p>Customize StudioAI for your organization without changing code.</p></div><button className="primary-button">Publish changes</button></div><div className="settings-grid"><article className="panel settings-form"><div className="settings-section"><h3>Brand identity</h3><p>Shown across navigation, sign-in, and shared experiences.</p><div className="logo-upload"><div className="brand-mark large"><span /></div><div><strong>StudioAI mark</strong><small>SVG or PNG, up to 2 MB</small></div><button>Replace</button></div><label>Product name<input defaultValue="StudioAI Control Center" /></label></div><div className="settings-section"><h3>Interface</h3><p>Choose appearance and density defaults.</p><div className="option-label">Color mode</div><div className="choice-grid"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-preview light-preview" />Light</button><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-preview dark-preview" />Dark</button></div><label>Primary color<div className="color-input"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /><input value={color} onChange={(e) => setColor(e.target.value)} /></div></label><label>Interface density<select defaultValue="comfortable"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div><div className="settings-section"><h3>Feature visibility</h3>{["Prompt playground", "Model administration", "Evaluation dashboard", "Virtual API keys"].map((name) => <label className="toggle-row" key={name}><span><strong>{name}</strong><small>Available to authorized workspace roles</small></span><input type="checkbox" defaultChecked /><i /></label>)}</div></article><aside className="panel config-preview"><div className="panel-head"><div><h3>Configuration preview</h3><p>Applies to this installation</p></div><Badge tone="success">Valid JSON</Badge></div><pre>{JSON.stringify({ brand: { name: "StudioAI", logo: "/assets/studio-ai.svg" }, theme: { mode: theme, primaryColor: color, borderRadius: 10, density: "comfortable" }, features: { promptPlayground: true, modelAdministration: true, evaluationDashboard: true } }, null, 2)}</pre><div className="preview-note"><strong>Configuration driven</strong><p>Brand and feature settings can be deployed across environments without rebuilding the interface.</p></div></aside></div></div>;
}

export default function Home() {
  const [active, setActive] = useState<View>("overview");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const title = useMemo(() => allNavigationItems.find((item) => item.id === active)?.label ?? "StudioAI", [active]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar active={active} setActive={setActive} open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="workspace"><Header title={title} theme={theme} onTheme={() => setTheme(theme === "light" ? "dark" : "light")} onMenu={() => setMenuOpen(true)} /><main id="main-content">{active === "overview" && <Dashboard onNavigate={setActive} />}{active === "chat" && <ChatWorkspace />}{active === "models" && <Models />}{active === "traces" && <Traces />}{active === "settings" && <Settings theme={theme} setTheme={setTheme} />}{active === "evaluations" && <Evaluations />}{active === "teams" && <TeamsAccess />}{active === "keys" && <ApiKeys />}</main></div>
    </div>
  );
}
