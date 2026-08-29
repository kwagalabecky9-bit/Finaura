import { useState, useMemo, useEffect } from "react";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPA_URL = "https://xlzdfueighmmipldadti.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemRmdWVpZ2htbWlwbGRhZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjYxNDQsImV4cCI6MjA4OTg0MjE0NH0.g1eMi2Ar3Rf6pWG_T4MChGMhCH0X3wfYpFMcUvi_qaE";
const SUPA_ID  = "becca";

async function loadFromSupabase() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/finaura_data?user_id=eq.${SUPA_ID}&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    const rows = await res.json();
    if (rows && rows[0] && rows[0].data && Object.keys(rows[0].data).length > 0) return rows[0].data;
  } catch {}
  return null;
}

async function saveToSupabase(d) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/finaura_data?user_id=eq.${SUPA_ID}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ data: d, updated_at: new Date().toISOString() })
    });
  } catch {}
}

const KEY = "finaura_v3";
const fmt = (n) => "UGX " + Math.abs(Number(n)||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",");
const uid = () => Math.random().toString(36).slice(2,8);
const today = () => new Date().toISOString().split("T")[0];
const monthKey = (date) => date ? date.slice(0,7) : "";
const monthLabel = (ym) => { const [y,m] = ym.split("-"); return new Date(y,m-1).toLocaleString("default",{month:"long",year:"numeric"}); };

const DEFAULT_ACCOUNTS = [
  { id:"mtn",       name:"MTN MoMo",       balance:0, color:"#FF8C00", emoji:"📱" },
  { id:"cash",      name:"Cash",           balance:0, color:"#1B7A4E", emoji:"💵" },
  { id:"stanbic",   name:"Stanbic",        balance:0, color:"#1A5276", emoji:"🏦" },
  { id:"stanchart", name:"Stanchart",      balance:0, color:"#6A1B9A", emoji:"🏦" },
  { id:"momosav",   name:"MoMo Savings",   balance:0, color:"#E65100", emoji:"🐷" },
  { id:"iclub",     name:"Investors Club", balance:0, color:"#7B52A8", emoji:"🤝" },
  { id:"hmc",       name:"HMC (SACCO)",    balance:0, color:"#C0392B", emoji:"🏛️" },
  { id:"nssf",      name:"NSSF",           balance:0, color:"#283593", emoji:"🛡️" },
];

const INC_SOURCES = ["Karveli Salary","TS27 Salary","Freelance","Investment Return","Kito Salary","Rental Income","Loan Received","Bonus","Gifts","Tips","Other"];
const EXP_CATS    = ["Food & Groceries","Eating Out","Transport","Rent / Housing","Shopping","SHEIN","Health","Entertainment","Utilities","Phone / Data","Hair","Nails","Beauty","Laundry","House Cleaning","Delivery Fees","Savings Contributions","Gifting","Giving / Tithe","Mobile Money Fees","Loan Given","Other"];
const KITO_CATS   = ["Stock / Materials","Packaging","Transport","Marketing","Equipment","Labour","Other"];

// Build bubble grid from image pattern — scaled to user's total
function buildBubbles(total) {
  // 100 equal bubbles — each = total / 100
  const perBubble = Math.round(total / 100);
  return Array.from({ length: 100 }, (_, i) => ({ id: i, value: perBubble, done: false }));
}

function load() {
  try {
    const d = localStorage.getItem(KEY);
    if (d) {
      const p = JSON.parse(d);
      return {
        accounts:   p.accounts    || DEFAULT_ACCOUNTS,
        income:     p.income      || [],
        expenses:   p.expenses    || [],
        savings:    p.savings     || [],
        kSales:     p.kSales      || [],
        kExpenses:  p.kExpenses   || [],
        kSalary:    p.kSalary     || [],
        kInventory: p.kInventory  || [],
        debts:      p.debts       || { iOwe:[], owedMe:[], business:[] },
        challenges: p.challenges  || [],
        transfers:  p.transfers   || [],
        budgets:    p.budgets     || {},
        recurring:  p.recurring   || [],
        customCats: p.customCats  || [],
      };
    }
  } catch {}
  return { accounts:DEFAULT_ACCOUNTS, income:[], expenses:[], savings:[], kSales:[], kExpenses:[], kSalary:[], kInventory:[], debts:{ iOwe:[], owedMe:[], business:[] }, challenges:[], transfers:[], budgets:{}, recurring:[], customCats:[], customInc:[] };
}
function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
  saveToSupabase(d);
}

// ── shared styles ─────────────────────────────────────────────────────────────
const S = {
  page:    { background:"#F5F0FF", minHeight:"100vh", maxWidth:430, margin:"0 auto", fontFamily:"system-ui,sans-serif", paddingBottom:72 },
  header:  { background:"#7B52A8", padding:"16px 16px 10px", borderBottom:"1px solid #6A3F99", position:"sticky", top:0, zIndex:10 },
  nav:     { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#fff", borderTop:"2px solid #F0E8FF", display:"flex" },
  overlay: { position:"fixed", inset:0, background:"#0006", zIndex:50, display:"flex", alignItems:"flex-end" },
  sheet:   { background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 20px 44px", width:"100%", boxSizing:"border-box", maxHeight:"90vh", overflowY:"auto" },
  lbl:     { fontSize:11, color:"#999", textTransform:"uppercase", letterSpacing:1.2, marginBottom:4, fontWeight:700, display:"block" },
  inp:     { width:"100%", border:"1.5px solid #E0E0E0", borderRadius:12, padding:"12px 14px", fontSize:15, boxSizing:"border-box", outline:"none", background:"#FAF7FF", marginBottom:14, fontFamily:"system-ui,sans-serif" },
  sel:     { width:"100%", border:"1.5px solid #E0E0E0", borderRadius:12, padding:"12px 14px", fontSize:14, boxSizing:"border-box", outline:"none", background:"#FAF7FF", marginBottom:14, fontFamily:"system-ui,sans-serif" },
  pad:     { padding:"0 16px" },
};

const btn  = (color="#7B52A8") => ({ width:"100%", background:color, color:"#fff", border:`2px solid ${color}`, borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer", marginBottom:8, boxShadow:`0 3px 10px ${color}33` });
const navB = (active) => ({ flex:1, padding:"10px 4px 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, borderTop:active?"3px solid #7B52A8":"3px solid transparent" });

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:2, background:"#EEE", margin:"0 auto 16px" }}/>
        <div style={{ fontSize:18, fontWeight:800, color:"#2C1654", marginBottom:16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function TxRow({ label, sub, right, rightColor="#2C1654", tag, onDel, onEdit }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 0", borderBottom:"1px solid #F0F0F0" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, color:"#2C1654", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
        <div style={{ color:"#999", fontSize:11, marginTop:1 }}>{sub}</div>
      </div>
      {tag && <span style={{ background:"#FFF3E0", color:"#E65100", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>{tag}</span>}
      <div style={{ fontWeight:800, color:rightColor, fontSize:14, whiteSpace:"nowrap", flexShrink:0 }}>{right}</div>
      {onEdit && <button onClick={onEdit} style={{ background:"#EAF2F8", border:"none", color:"#1A5276", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✏️</button>}
      {onDel && <button onClick={onDel} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign:"center", padding:"28px 0", color:"#BBB" }}><div style={{ fontSize:30, marginBottom:8 }}>📭</div><div style={{ fontSize:13 }}>{text}</div></div>;
}

// Group transactions by month then sort by date within each month
function groupByMonth(items) {
  const groups = {};
  items.forEach(x => {
    const mk = x.date ? x.date.slice(0,7) : "unknown";
    if (!groups[mk]) groups[mk] = [];
    groups[mk].push(x);
  });
  // Sort months newest first, dates within month newest first
  return Object.entries(groups)
    .sort(([a],[b]) => b.localeCompare(a))
    .map(([mk, txs]) => ({
      mk,
      label: mk === "unknown" ? "Unknown Date" : new Date(mk+"-01").toLocaleString("default",{month:"long",year:"numeric"}),
      txs: txs.sort((a,b) => (b.date||"").localeCompare(a.date||"")),
      total: txs.reduce((s,x)=>s+ +x.amount,0)
    }));
}

function MonthGroup({ label, total, color, bg, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:16 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", background:bg, borderRadius:12, padding:"10px 14px",
        cursor:"pointer", marginBottom: open?8:0 }}>
        <div>
          <div style={{ fontWeight:800, color, fontSize:13 }}>{label}</div>
          <div style={{ fontSize:11, color:color+"99", marginTop:1 }}>{open?"tap to collapse":"tap to expand"}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontWeight:900, color, fontSize:15 }}>{total}</div>
          <span style={{ color, fontSize:12 }}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && children}
    </div>
  );
}

function SubTabs({ tabs, active, onChange, color="#7B52A8" }) {
  return (
    <div style={{ display:"flex", gap:8, padding:"14px 16px 8px" }}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>onChange(t)} style={{ flex:1, padding:"9px 4px", borderRadius:12, border:"none", background:active===t?color:"#fff", color:active===t?"#fff":"#999", fontWeight:700, fontSize:12, cursor:"pointer", textTransform:"capitalize", boxShadow:active===t?`0 2px 8px ${color}44`:"none" }}>{t}</button>
      ))}
    </div>
  );
}

function StatBox({ label, value, bg, color }) {
  return (
    <div style={{ flex:1, background:bg, borderRadius:16, padding:"12px" }}>
      <div style={{ fontSize:10, color:color+"bb", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:900, color }}>{fmt(value)}</div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
// ── NET WORTH GRAPH ───────────────────────────────────────────────────────────
function NetWorthGraph({ data, currentTotal }) {
  // Build monthly net worth from income/expense history
  // We use income - expenses per month as a proxy for net change
  // and show cumulative picture month by month
  const points = useMemo(() => {
    const allTx = [
      ...data.income.map(x=>({date:x.date, amt:+x.amount})),
      ...data.expenses.map(x=>({date:x.date, amt:- +x.amount})),
      ...data.kSales.map(x=>({date:x.date, amt:+x.price* +x.qty})),
      ...data.kExpenses.map(x=>({date:x.date, amt:- +x.amount})),
    ].filter(x=>x.date);

    if (allTx.length === 0) return [];

    // Group net change by month
    const byMonth = {};
    allTx.forEach(x => {
      const mk = x.date.slice(0,7);
      byMonth[mk] = (byMonth[mk]||0) + x.amt;
    });

    // Sort months
    const months = Object.keys(byMonth).sort();
    if (months.length === 0) return [];

    // Build cumulative — start from (currentTotal - sum of all recorded changes)
    const totalRecorded = Object.values(byMonth).reduce((s,v)=>s+v,0);
    let running = currentTotal - totalRecorded;

    return months.map(mk => {
      running += byMonth[mk];
      return {
        mk,
        label: new Date(mk+"-01").toLocaleString("default",{month:"short",year:"2-digit"}),
        value: running,
      };
    });
  }, [data, currentTotal]);

  if (points.length < 2) {
    return (
      <div style={{ margin:"0 16px 12px", background:"#fff", borderRadius:16, padding:"16px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#2C1654", marginBottom:6 }}>📈 Net Worth Over Time</div>
        <div style={{ color:"#BBB", fontSize:12, textAlign:"center", padding:"16px 0" }}>
          Keep logging for a month to see your growth graph here 🌱
        </div>
      </div>
    );
  }

  const W = 358; // chart width (fits 390px phone with 16px padding each side)
  const H = 110;
  const PAD = { top:12, right:8, bottom:28, left:8 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const vals   = points.map(p=>p.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range  = maxVal - minVal || 1;

  const xStep = cW / Math.max(points.length - 1, 1);
  const toX   = i  => PAD.left + i * xStep;
  const toY   = v  => PAD.top + cH - ((v - minVal) / range) * cH;

  // Build SVG polyline path
  const pathD = points.map((p,i) => `${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");

  // Fill area under line
  const fillD = pathD + ` L${toX(points.length-1).toFixed(1)},${(PAD.top+cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top+cH).toFixed(1)} Z`;

  const isGrowing = points[points.length-1].value >= points[0].value;
  const lineColor = isGrowing ? "#1B7A4E" : "#C0392B";
  const fillColor = isGrowing ? "#2E7D3222" : "#C6282822";

  // Show only first, last, and a few middle labels
  const labelEvery = Math.ceil(points.length / 4);

  return (
    <div style={{ margin:"0 16px 12px", background:"#fff", borderRadius:16, padding:"14px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"#2C1654" }}>📈 Net Worth Over Time</div>
          <div style={{ fontSize:11, color:"#999", marginTop:2 }}>{points.length} month{points.length!==1?"s":"s"} of data</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:lineColor, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>
            {isGrowing ? "▲ Growing" : "▼ Declining"}
          </div>
          <div style={{ fontSize:12, color:lineColor, fontWeight:700, marginTop:2 }}>
            {isGrowing?"+":""}{fmt(points[points.length-1].value - points[0].value)}
          </div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block", overflow:"visible" }}>
        {/* Zero line if values cross zero */}
        {minVal < 0 && maxVal > 0 && (
          <line x1={PAD.left} y1={toY(0)} x2={W-PAD.right} y2={toY(0)}
            stroke="#D5C5F0" strokeWidth="1" strokeDasharray="4,3"/>
        )}

        {/* Fill */}
        <path d={fillD} fill={fillColor}/>

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"/>

        {/* Dots + labels */}
        {points.map((p,i) => {
          const x = toX(i), y = toY(p.value);
          const showLabel = i===0 || i===points.length-1 || i%labelEvery===0;
          const isLast = i===points.length-1;
          return (
            <g key={p.mk}>
              <circle cx={x} cy={y} r={isLast?5:3}
                fill={isLast?lineColor:"#fff"} stroke={lineColor} strokeWidth="2"/>
              {showLabel && (
                <text x={x} y={H-4} textAnchor="middle"
                  fontSize="9" fill="#999" fontFamily="system-ui,sans-serif">
                  {p.label}
                </text>
              )}
              {isLast && (
                <text x={x} y={y-10} textAnchor={x > W*0.7?"end":"middle"}
                  fontSize="9" fill={lineColor} fontWeight="bold" fontFamily="system-ui,sans-serif">
                  {fmt(p.value).replace("UGX ","")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Home({ data, setData }) {
  const total    = data.accounts.reduce((s,a)=>s+ +a.balance,0);
  const totalIn  = data.income.reduce((s,x)=>s+ +x.amount,0);
  const totalOut = data.expenses.reduce((s,x)=>s+ +x.amount,0);
  const kitoNet  = data.kSales.reduce((s,x)=>s+ +x.price* +x.qty,0) - data.kExpenses.reduce((s,x)=>s+ +x.amount,0) - data.kSalary.reduce((s,x)=>s+ +x.amount,0);
  const iOweTotal   = data.debts.iOwe.filter(x=>!x.paid).reduce((s,x)=>s+ +x.amount,0);
  const owedMeTotal = data.debts.owedMe.filter(x=>!x.paid).reduce((s,x)=>s+ +x.amount,0);
  const bizDebt     = data.debts.business.filter(x=>!x.paid).reduce((s,x)=>s+ +x.amount,0);
  const [sheet, setSheet] = useState(null);
  const allCats = [...EXP_CATS, ...(data.customCats||[])];
  const [qF, setQF] = useState({ type:"expense", date:today(), category:allCats[0], source:INC_SOURCES[0], note:"", amount:"", accountId:"", isLoan:false });
  const [qKito, setQKito] = useState({ date:today(), item:"", category:"Jewellery", qty:"1", price:"", payMode:"Cash", accountId:"", customer:"" });

  const logKitoSale = () => {
    if (!qKito.price || !qKito.accountId) return;
    const acct = data.accounts.find(a=>a.id===qKito.accountId);
    const amt  = +qKito.price * +qKito.qty;
    const saleEntry = {
      id:uid(), date:qKito.date, item:qKito.item||"Sale",
      category:qKito.category, qty:qKito.qty, price:qKito.price,
      note: qKito.customer ? `Customer: ${qKito.customer}` : "",
      accountId:qKito.accountId, acctName:acct?.name||"",
      payMode:qKito.payMode
    };
    // Also add to customer book if name given and not already there
    let customers = data.customers || [];
    if (qKito.customer) {
      const exists = customers.find(c=>c.name.toLowerCase()===qKito.customer.toLowerCase());
      if (!exists) {
        customers = [{id:uid(), name:qKito.customer, phone:"", location:"", firstOrder:qKito.date, notes:"Added from quick sale"}, ...customers];
      }
    }
    const nd = {
      ...data,
      kSales: [saleEntry, ...data.kSales],
      customers,
      accounts: data.accounts.map(a=>a.id===qKito.accountId?{...a,balance:+a.balance+amt}:a)
    };
    setData(nd);
    setQKito({date:today(), item:"", category:"Jewellery", qty:"1", price:"", payMode:"Cash", accountId:"", customer:""});
    setSheet(null);
  };

  const logQuick = () => {
    if (!qF.amount||!qF.accountId) return;
    const acct = data.accounts.find(a=>a.id===qF.accountId);
    const acctName = acct?.name||"";
    let nd = {...data};
    if (qF.type==="expense") {
      const entry = {id:uid(),date:qF.date,category:qF.category,note:qF.note,amount:qF.amount,accountId:qF.accountId,acctName};
      nd.expenses = [entry,...nd.expenses];
      nd.accounts = nd.accounts.map(a=>a.id===qF.accountId?{...a,balance:+a.balance- +qF.amount}:a);
      if (qF.isLoan) nd.debts = {...nd.debts, owedMe:[{id:uid(),name:qF.note||"Loan",amount:qF.amount,due:"",note:"Quick log",paid:false},...nd.debts.owedMe]};
    } else {
      const entry = {id:uid(),date:qF.date,source:qF.source,note:qF.note,amount:qF.amount,accountId:qF.accountId,acctName};
      nd.income = [entry,...nd.income];
      nd.accounts = nd.accounts.map(a=>a.id===qF.accountId?{...a,balance:+a.balance+ +qF.amount}:a);
      if (qF.isLoan) nd.debts = {...nd.debts, iOwe:[{id:uid(),name:qF.note||"Borrowed",amount:qF.amount,due:"",note:"Quick log",paid:false},...nd.debts.iOwe]};
    }
    setData(nd);
    setQF({type:"expense",date:today(),category:allCats[0],source:INC_SOURCES[0],note:"",amount:"",accountId:"",isLoan:false});
    setSheet(null);
  };

  return (
    <>
      <div style={{ margin:16, borderRadius:20, padding:"24px 20px", background:"linear-gradient(135deg,#6B3DAE,#9B6FD0)", color:"#fff", boxShadow:"0 6px 20px #7B52A844" }}>
        <div style={{ fontSize:11, opacity:0.8, textTransform:"uppercase", letterSpacing:1 }}>Total Wealth</div>
        <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, margin:"4px 0 2px" }}>{fmt(total)}</div>
        <div style={{ fontSize:12, opacity:0.75 }}>{data.accounts.length} accounts</div>
      </div>
      <div style={{ display:"flex", gap:10, padding:"0 16px", marginBottom:12 }}>
        <StatBox label="Income" value={totalIn} bg="#E8F5EF" color="#1B7A4E"/>
        <StatBox label="Spent" value={totalOut} bg="#FDECEA" color="#C0392B"/>
      </div>
      <div style={{ display:"flex", gap:10, padding:"0 16px", marginBottom:12 }}>
        <StatBox label="Net Cash" value={totalIn-totalOut} bg={totalIn-totalOut>=0?"#E8F5EF":"#FDECEA"} color={totalIn-totalOut>=0?"#1B7A4E":"#C0392B"}/>
        <StatBox label="Kito Profit" value={kitoNet} bg={kitoNet>=0?"#FFF8E1":"#FDECEA"} color={kitoNet>=0?"#F57F17":"#C0392B"}/>
      </div>
      {/* ── NET WORTH GRAPH ── */}
      <NetWorthGraph data={data} currentTotal={total}/>

      <div style={{ margin:"0 16px 12px", background:"#fff", borderRadius:16, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#2C1654", marginBottom:12 }}>💳 Debt Snapshot</div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>😬</div><div style={{ fontWeight:800, color:"#C0392B", fontSize:15 }}>{fmt(iOweTotal)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>I owe</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>🙌</div><div style={{ fontWeight:800, color:"#1B7A4E", fontSize:15 }}>{fmt(owedMeTotal)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>Owed me</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>🏪</div><div style={{ fontWeight:800, color:"#F57F17", fontSize:15 }}>{fmt(bizDebt)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>Biz debts</div></div>
        </div>
      </div>
      <div style={{ margin:"0 16px 80px", background:"#fff", borderRadius:16, padding:16 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#2C1654", marginBottom:12 }}>Account Breakdown</div>
        {data.accounts.filter(a=> +a.balance>0).length===0
          ? <div style={{ color:"#AAA", fontSize:13, textAlign:"center", padding:"16px 0" }}>Set your balances in Accounts tab 👆</div>
          : data.accounts.filter(a=> +a.balance>0).map(a=>(
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #F5F5F5" }}>
                <span style={{ fontSize:18 }}>{a.emoji}</span>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#2C1654" }}>{a.name}</span>
                <span style={{ fontWeight:800, color:a.color, fontSize:14 }}>{fmt(a.balance)}</span>
              </div>
            ))
        }
      </div>

      {/* Floating buttons */}
      {/* 💎 Kito quick sale */}
      <button onClick={()=>setSheet("kito")} style={{
        position:"fixed", bottom:80, right:84, width:56, height:56, borderRadius:"50%",
        background:"linear-gradient(135deg,#9B6FD0,#B48FE8)", color:"#fff", border:"none",
        fontSize:22, cursor:"pointer", zIndex:40,
        boxShadow:"0 4px 16px #D4820A66", display:"flex", alignItems:"center", justifyContent:"center"
      }}>💎</button>
      {/* ⚡ Quick personal log */}
      <button onClick={()=>setSheet("quick")} style={{
        position:"fixed", bottom:80, right:20, width:56, height:56, borderRadius:"50%",
        background:"linear-gradient(135deg,#E8552A,#E8852A)", color:"#fff", border:"none",
        fontSize:28, fontWeight:300, cursor:"pointer", zIndex:40,
        boxShadow:"0 4px 16px #E8552A66", display:"flex", alignItems:"center", justifyContent:"center"
      }}>+</button>

      {/* Quick personal log sheet */}
      <Sheet open={sheet==="quick"} onClose={()=>setSheet(null)} title="⚡ Quick Log">
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {["expense","income"].map(t=>(
            <button key={t} onClick={()=>setQF(f=>({...f,type:t}))} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:qF.type===t?(t==="expense"?"#C0392B":"#1B7A4E"):"#F5F0FF", color:qF.type===t?"#fff":"#999", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
          ))}
        </div>
        <label style={S.lbl}>Date</label>
        <input style={S.inp} type="date" value={qF.date} onChange={e=>setQF(f=>({...f,date:e.target.value}))}/>
        {qF.type==="expense"
          ? <><label style={S.lbl}>Category</label>
            <select style={S.sel} value={qF.category} onChange={e=>setQF(f=>({...f,category:e.target.value}))}>
              {allCats.map(c=><option key={c}>{c}</option>)}
            </select></>
          : <><label style={S.lbl}>Source</label>
            <select style={S.sel} value={qF.source} onChange={e=>setQF(f=>({...f,source:e.target.value}))}>
              {INC_SOURCES.map(s=><option key={s}>{s}</option>)}
            </select></>
        }
        <label style={S.lbl}>{qF.type==="expense"?"From":"Into"} Account *</label>
        <select style={S.sel} value={qF.accountId} onChange={e=>setQF(f=>({...f,accountId:e.target.value}))}>
          <option value="">Select account…</option>
          {data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
        </select>
        <label style={S.lbl}>Amount (UGX) *</label>
        <input style={S.inp} type="number" value={qF.amount} onChange={e=>setQF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label>
        <input style={S.inp} type="text" value={qF.note} onChange={e=>setQF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <div onClick={()=>setQF(f=>({...f,isLoan:!f.isLoan}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:qF.isLoan?"#E8F5EF":"#F5F0FF", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${qF.isLoan?"#1B7A4E":"#CCC"}`, background:qF.isLoan?"#1B7A4E":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {qF.isLoan && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:qF.isLoan?"#1B7A4E":"#4A3870" }}>
              {qF.type==="expense"?"This is a loan I gave someone 💸":"This is money I borrowed 🤝"}
            </div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts tab</div>
          </div>
        </div>
        <button style={btn(qF.type==="expense"?"#C0392B":"#1B7A4E")} onClick={logQuick}>Log It ✓</button>
      </Sheet>

      {/* 💎 Kito quick sale sheet */}
      <Sheet open={sheet==="kito"} onClose={()=>setSheet(null)} title="💎 Quick Kito Sale">
        <div style={{ background:"#FFF8E1", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#D4820A", fontWeight:600 }}>
          Sale logged here goes straight into Kito sales + updates your account balance
        </div>
        <label style={S.lbl}>Date</label>
        <input style={S.inp} type="date" value={qKito.date} onChange={e=>setQKito(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Item / Product *</label>
        <input style={S.inp} type="text" value={qKito.item} onChange={e=>setQKito(f=>({...f,item:e.target.value}))} placeholder="e.g. Gold bracelet"/>
        <label style={S.lbl}>Category</label>
        <select style={S.sel} value={qKito.category} onChange={e=>setQKito(f=>({...f,category:e.target.value}))}>
          {["Jewellery","Phone Cases","Watch Straps","Notebooks","Accessories","Custom Gifts","Other"].map(c=><option key={c}>{c}</option>)}
        </select>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label style={S.lbl}>Qty</label>
            <input style={{...S.inp}} type="number" value={qKito.qty} onChange={e=>setQKito(f=>({...f,qty:e.target.value}))} placeholder="1"/>
          </div>
          <div style={{ flex:2 }}>
            <label style={S.lbl}>Price per unit (UGX) *</label>
            <input style={{...S.inp}} type="number" value={qKito.price} onChange={e=>setQKito(f=>({...f,price:e.target.value}))} placeholder="0"/>
          </div>
        </div>
        {qKito.price && qKito.qty && <div style={{ background:"#E8F5EF", borderRadius:10, padding:"8px 12px", marginBottom:14, fontWeight:700, color:"#1B7A4E", fontSize:14 }}>
          Total: {fmt(+qKito.price * +qKito.qty)}
        </div>}
        <label style={S.lbl}>Payment Mode</label>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {["Cash","Mobile Money","Deposit"].map(m=>(
            <button key={m} onClick={()=>setQKito(f=>({...f,payMode:m}))} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none", fontSize:11, fontWeight:700, cursor:"pointer",
              background:qKito.payMode===m?"#1B7A4E":"#F5F0FF", color:qKito.payMode===m?"#fff":"#999" }}>{m}</button>
          ))}
        </div>
        <label style={S.lbl}>Into Account *</label>
        <select style={S.sel} value={qKito.accountId} onChange={e=>setQKito(f=>({...f,accountId:e.target.value}))}>
          <option value="">Select account…</option>
          {data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
        </select>
        <label style={S.lbl}>Customer Name</label>
        <input style={S.inp} type="text" value={qKito.customer} onChange={e=>setQKito(f=>({...f,customer:e.target.value}))} placeholder="Optional but useful!"/>
        <button style={btn("#D4820A")} onClick={logKitoSale}>Record Sale ✓</button>
      </Sheet>
    </>
  );
}

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
function Accounts({ data, setData }) {
  const [sheet, setSheet] = useState(null);
  const [sel, setSel]     = useState(null);
  const [editBal, setEB]  = useState("");
  const [newName, setNN]  = useState("");
  // transfer form
  const [tFrom, setTFrom] = useState("");
  const [tTo,   setTTo]   = useState("");
  const [tAmt,  setTAmt]  = useState("");
  const [tNote, setTNote] = useState("");
  const [sub,   setSub]   = useState("accounts");

  const saveBal = () => {
    const nd={...data,accounts:data.accounts.map(a=>a.id===sel.id?{...a,balance:parseFloat(editBal)||0}:a)};
    setData(nd);setSheet(null);
  };
  const addAcct = () => {
    if (!newName.trim()) return;
    const cols=["#E53935","#8E24AA","#00897B","#F4511E","#039BE5"];
    const nd={...data,accounts:[...data.accounts,{id:uid(),name:newName.trim(),balance:0,color:cols[data.accounts.length%cols.length],emoji:"💰"}]};
    setData(nd);setNN("");setSheet(null);
  };
  const delAcct = (id) => { const nd={...data,accounts:data.accounts.filter(a=>a.id!==id)};setData(nd); };

  const doTransfer = () => {
    if (!tFrom||!tTo||!tAmt||tFrom===tTo) return;
    const amt = parseFloat(tAmt)||0;
    const fromAcct = data.accounts.find(a=>a.id===tFrom);
    const toAcct   = data.accounts.find(a=>a.id===tTo);
    const tx = { id:uid(), date:today(), from:tFrom, fromName:fromAcct?.name||"", to:tTo, toName:toAcct?.name||"", amount:amt, note:tNote };
    const nd = {
      ...data,
      transfers: [tx, ...data.transfers],
      accounts: data.accounts.map(a => {
        if (a.id===tFrom) return {...a, balance:+a.balance - amt};
        if (a.id===tTo)   return {...a, balance:+a.balance + amt};
        return a;
      })
    };
    setData(nd);
    setTFrom("");setTTo("");setTAmt("");setTNote("");setSheet(null);
  };

  const delTransfer = (tx) => {
    const nd = {
      ...data,
      transfers: data.transfers.filter(t=>t.id!==tx.id),
      accounts: data.accounts.map(a => {
        if (a.id===tx.from) return {...a, balance:+a.balance + +tx.amount};
        if (a.id===tx.to)   return {...a, balance:+a.balance - +tx.amount};
        return a;
      })
    };
    setData(nd);
  };

  return (
    <>
      <SubTabs tabs={["accounts","transfers"]} active={sub} onChange={setSub} color="#1A5276"/>

      {sub==="accounts" && <>
        <div style={{ padding:"6px 16px", fontSize:13, color:"#999" }}>Tap a card to update balance</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"8px 16px 14px" }}>
          {data.accounts.map(a=>(
            <div key={a.id} onClick={()=>{setSel(a);setEB(String(a.balance));setSheet("edit");}} style={{ background:"#fff", borderRadius:16, padding:"14px 12px", borderLeft:`4px solid ${a.color}`, cursor:"pointer", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{a.emoji}</div>
              <div style={{ fontSize:12, fontWeight:700, color:a.color, marginBottom:2 }}>{a.name}</div>
              <div style={{ fontSize:16, fontWeight:900, color:"#2C1654" }}>{fmt(a.balance)}</div>
            </div>
          ))}
          <div onClick={()=>setSheet("add")} style={{ background:"#fff", borderRadius:16, padding:"14px 12px", border:"2px dashed #DDD", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:90, gap:4 }}>
            <div style={{ fontSize:28, color:"#CCC" }}>+</div>
            <div style={{ fontSize:12, color:"#AAA", fontWeight:600 }}>Add Account</div>
          </div>
        </div>
        <div style={S.pad}>
          {data.accounts.map(a=>(
            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #F0F0F0" }}>
              <span style={{ fontSize:20 }}>{a.emoji}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#2C1654" }}>{a.name}</span>
              <span style={{ fontWeight:800, color:a.color, fontSize:13 }}>{fmt(a.balance)}</span>
              <button onClick={()=>delAcct(a.id)} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>
          ))}
        </div>
      </>}

      {sub==="transfers" && <>
        <div style={S.pad}>
          <button style={btn("#1A5276")} onClick={()=>setSheet("transfer")}>↔ Transfer Between Accounts</button>
          {data.transfers.length===0
            ? <Empty text="No transfers yet"/>
            : data.transfers.map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 0", borderBottom:"1px solid #F0F0F0" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:"#2C1654", fontSize:14 }}>{t.fromName} → {t.toName}</div>
                    <div style={{ color:"#999", fontSize:11 }}>{t.date}{t.note?" · "+t.note:""}</div>
                  </div>
                  <div style={{ fontWeight:800, color:"#1A5276", fontSize:14 }}>{fmt(t.amount)}</div>
                  <button onClick={()=>delTransfer(t)} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))
          }
        </div>
      </>}

      <Sheet open={sheet==="edit"} onClose={()=>setSheet(null)} title={`${sel?.emoji} ${sel?.name}`}>
        <label style={S.lbl}>Balance (UGX)</label>
        <input style={S.inp} type="number" value={editBal} onChange={e=>setEB(e.target.value)} autoFocus/>
        <button style={btn(sel?.color||"#7B52A8")} onClick={saveBal}>Save Balance</button>
      </Sheet>

      <Sheet open={sheet==="add"} onClose={()=>setSheet(null)} title="Add Account">
        <label style={S.lbl}>Account Name</label>
        <input style={S.inp} type="text" value={newName} onChange={e=>setNN(e.target.value)} placeholder="e.g. Equity Bank" autoFocus/>
        <button style={btn()} onClick={addAcct}>Add Account</button>
      </Sheet>

      <Sheet open={sheet==="transfer"} onClose={()=>setSheet(null)} title="↔ Transfer Money">
        <label style={S.lbl}>From Account *</label>
        <select style={S.sel} value={tFrom} onChange={e=>setTFrom(e.target.value)}>
          <option value="">Select…</option>
          {data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name} — {fmt(a.balance)}</option>)}
        </select>
        <label style={S.lbl}>To Account *</label>
        <select style={S.sel} value={tTo} onChange={e=>setTTo(e.target.value)}>
          <option value="">Select…</option>
          {data.accounts.filter(a=>a.id!==tFrom).map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
        </select>
        <label style={S.lbl}>Amount (UGX) *</label>
        <input style={S.inp} type="number" value={tAmt} onChange={e=>setTAmt(e.target.value)} placeholder="0"/>
        <label style={S.lbl}>Note</label>
        <input style={S.inp} type="text" value={tNote} onChange={e=>setTNote(e.target.value)} placeholder="Optional"/>
        <button style={btn("#1A5276")} onClick={doTransfer}>Transfer Now</button>
      </Sheet>
    </>
  );
}

// ── PERSONAL ──────────────────────────────────────────────────────────────────
function Personal({ data, setData }) {
  const [sub, setSub]     = useState("income");
  const [sheet, setSheet] = useState(null);
  const [iF, setIF] = useState({ date:today(), source:INC_SOURCES[0], note:"", amount:"", accountId:"", isBorrowed:false });
  const [eF, setEF] = useState({ date:today(), category:EXP_CATS[0], note:"", amount:"", accountId:"", isLoan:false });
  const [sF, setSF] = useState({ name:"", goal:"", current:"" });

  const [editTx, setEditTx] = useState(null); // {type, tx}
  const [editF, setEditF]   = useState({});

  const openEdit = (type, tx) => {
    setEditTx({type, tx});
    setEditF({...tx});
    setSheet("edit");
  };

  const saveEdit = () => {
    if (!editF.amount || !editF.accountId) return;
    const section = editTx.type === "income" ? "income" : "expenses";
    const old = editTx.tx;
    const acct = data.accounts.find(a=>a.id===editF.accountId);
    // Reverse old balance effect
    const isInc = editTx.type === "income";
    let accounts = data.accounts.map(a => {
      if (a.id === old.accountId) return {...a, balance: isInc ? +a.balance - +old.amount : +a.balance + +old.amount};
      return a;
    });
    // Apply new balance effect
    accounts = accounts.map(a => {
      if (a.id === editF.accountId) return {...a, balance: isInc ? +a.balance + +editF.amount : +a.balance - +editF.amount};
      return a;
    });
    const updated = {...editF, acctName: acct?.name||""};
    const nd = {...data,
      [section]: data[section].map(x => x.id === old.id ? updated : x),
      accounts
    };
    setData(nd); setSheet(null); setEditTx(null);
  };

  const addIncome = () => {
    if (!iF.amount||!iF.accountId) return;
    const acct=data.accounts.find(a=>a.id===iF.accountId);
    let nd={...data,income:[{id:uid(),...iF,acctName:acct?.name||""},...data.income],accounts:data.accounts.map(a=>a.id===iF.accountId?{...a,balance:+a.balance+ +iF.amount}:a)};
    if (iF.isBorrowed || iF.source==="Loan Received") nd.debts={...nd.debts,iOwe:[{id:uid(),name:iF.note||"Loan",amount:iF.amount,due:"",note:"Added from income",paid:false,remaining:+iF.amount},...nd.debts.iOwe]};
    setData(nd);setIF({date:today(),source:INC_SOURCES[0],note:"",amount:"",accountId:"",isBorrowed:false});setSheet(null);
  };
  const addExpense = () => {
    if (!eF.amount||!eF.accountId) return;
    const acct=data.accounts.find(a=>a.id===eF.accountId);
    let nd={...data,expenses:[{id:uid(),...eF,acctName:acct?.name||""},...data.expenses],accounts:data.accounts.map(a=>a.id===eF.accountId?{...a,balance:+a.balance- +eF.amount}:a)};
    if (eF.isLoan) nd.debts={...nd.debts,owedMe:[{id:uid(),name:eF.note||"Loan",amount:eF.amount,due:"",note:"From expense log",paid:false},...nd.debts.owedMe]};
    setData(nd);setEF({date:today(),category:EXP_CATS[0],note:"",amount:"",accountId:"",isLoan:false});setSheet(null);
  };
  const addSavings = () => {
    if (!sF.name) return;
    const nd={...data,savings:[{id:uid(),...sF},...data.savings]};
    setData(nd);setSF({name:"",goal:"",current:""});setSheet(null);
  };
  const delIncome  = (id,amt,acId) => { const nd={...data,income:data.income.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance- +amt}:a)};setData(nd); };
  const delExpense = (id,amt,acId) => { const nd={...data,expenses:data.expenses.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance+ +amt}:a)};setData(nd); };
  const delSaving  = (id) => { const nd={...data,savings:data.savings.filter(s=>s.id!==id)};setData(nd); };
  const updSaving  = (id,val) => { const nd={...data,savings:data.savings.map(s=>s.id===id?{...s,current:val}:s)};setData(nd); };

  // recurring
  const [rF, setRF] = useState({ name:"", type:"income", source:INC_SOURCES[0], category:EXP_CATS[0], amount:"", accountId:"", frequency:"monthly", dayOfMonth:"1" });
  const recurring = data.recurring || [];
  const addRecurring = () => {
    if (!rF.name||!rF.amount||!rF.accountId) return;
    const nd={...data,recurring:[{id:uid(),...rF,lastLogged:""},...recurring]};
    setData(nd);
    setRF({name:"",type:"income",source:INC_SOURCES[0],category:EXP_CATS[0],amount:"",accountId:"",frequency:"monthly",dayOfMonth:"1"});
    setSheet(null);
  };
  const delRecurring = (id) => { const nd={...data,recurring:recurring.filter(r=>r.id!==id)};setData(nd); };
  const logRecurring = (r) => {
    const acct=data.accounts.find(a=>a.id===r.accountId);
    const isIncome = r.type==="income";
    const nd = {
      ...data,
      recurring: recurring.map(x=>x.id===r.id?{...x,lastLogged:today()}:x),
      income:    isIncome ? [{id:uid(),date:today(),source:r.source,note:r.name,amount:r.amount,accountId:r.accountId,acctName:acct?.name||""},...data.income] : data.income,
      expenses:  !isIncome ? [{id:uid(),date:today(),category:r.category,note:r.name,amount:r.amount,accountId:r.accountId,acctName:acct?.name||""},...data.expenses] : data.expenses,
      accounts:  data.accounts.map(a=>a.id===r.accountId?{...a,balance:isIncome?+a.balance+ +r.amount:+a.balance- +r.amount}:a)
    };
    setData(nd);
  };

  const totalIn  = data.income.reduce((s,x)=>s+ +x.amount,0);
  const totalOut = data.expenses.reduce((s,x)=>s+ +x.amount,0);

  return (
    <>
      <SubTabs tabs={["income","expenses","savings","recurring"]} active={sub} onChange={setSub}/>
      <div style={S.pad}>
        {sub==="income" && <>
          <div style={{ background:"#E8F5EF", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#1B7A4E", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Total Income</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#1B7A4E" }}>{fmt(totalIn)}</div>
          </div>
          <button style={btn("#1B7A4E")} onClick={()=>setSheet("income")}>+ Add Income</button>
          {data.income.length===0?<Empty text="No income recorded yet"/>:groupByMonth(data.income).map(g=>(
              <MonthGroup key={g.mk} label={g.label} total={fmt(g.total)} color="#1B7A4E" bg="#E8F5EF">
                {g.txs.map(x=><TxRow key={x.id} label={x.source} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#1B7A4E" tag={x.acctName} onEdit={()=>openEdit("income",x)} onDel={()=>delIncome(x.id,x.amount,x.accountId)}/>)}
              </MonthGroup>
            ))}
        </>}
        {sub==="expenses" && <>
          <div style={{ background:"#FDECEA", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#C0392B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Total Spent</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#C0392B" }}>{fmt(totalOut)}</div>
          </div>
          <button style={btn("#C0392B")} onClick={()=>setSheet("expense")}>+ Add Expense</button>
          {data.expenses.length===0?<Empty text="No expenses yet"/>:groupByMonth(data.expenses).map(g=>(
              <MonthGroup key={g.mk} label={g.label} total={fmt(g.total)} color="#C0392B" bg="#FDECEA">
                {g.txs.map(x=><TxRow key={x.id} label={x.category} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#C0392B" tag={x.acctName} onEdit={()=>openEdit("expense",x)} onDel={()=>delExpense(x.id,x.amount,x.accountId)}/>)}
              </MonthGroup>
            ))}
        </>}
        {sub==="savings" && <>
          <button style={btn("#7B52A8")} onClick={()=>setSheet("savings")}>+ New Goal</button>
          {data.savings.length===0?<Empty text="No savings goals yet"/>:data.savings.map(g=>{
            const pct=g.goal>0?Math.min(100,(g.current/g.goal)*100):0;
            return (
              <div key={g.id} style={{ background:"#EDE0FF", borderRadius:16, padding:"14px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:"#7B52A8", fontSize:14 }}>{g.name}</span>
                  <button onClick={()=>delSaving(g.id)} style={{ background:"none", border:"none", color:"#999", cursor:"pointer", fontSize:18 }}>×</button>
                </div>
                <div style={{ background:"#fff", borderRadius:6, height:8, marginBottom:8 }}>
                  <div style={{ width:pct+"%", height:8, borderRadius:6, background:"linear-gradient(90deg,#7B1FA2,#E91E8C)" }}/>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#7B52A8", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Saved</div>
                    <input type="number" value={g.current} onChange={e=>updSaving(g.id,e.target.value)} style={{ width:"100%", border:"1.5px solid #CE93D8", borderRadius:8, padding:"6px 10px", color:"#7B52A8", fontSize:14, fontWeight:800, outline:"none", boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Goal</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#4A3870", padding:"8px 0" }}>{fmt(g.goal)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Done</div>
                    <div style={{ fontSize:18, fontWeight:900, color:"#7B52A8" }}>{Math.round(pct)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>}
      </div>

      <Sheet open={sheet==="income"} onClose={()=>setSheet(null)} title="Add Income">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={iF.date} onChange={e=>setIF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Source</label><select style={S.sel} value={iF.source} onChange={e=>setIF(f=>({...f,source:e.target.value}))}>{INC_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
        <label style={S.lbl}>Into Account *</label><select style={S.sel} value={iF.accountId} onChange={e=>setIF(f=>({...f,accountId:e.target.value}))}><option value="">Select account…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX) *</label><input style={S.inp} type="number" value={iF.amount} onChange={e=>setIF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={iF.note} onChange={e=>setIF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <div onClick={()=>setIF(f=>({...f,isBorrowed:!f.isBorrowed}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:iF.isBorrowed?"#FDECEA":"#F5F0FF", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${iF.isBorrowed?"#C0392B":"#CCC"}`, background:iF.isBorrowed?"#C0392B":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {iF.isBorrowed && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:iF.isBorrowed?"#C0392B":"#4A3870" }}>This is money I borrowed 🤝</div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts → I Owe</div>
          </div>
        </div>
        <button style={btn("#1B7A4E")} onClick={addIncome}>Save Income</button>
      </Sheet>
      <Sheet open={sheet==="expense"} onClose={()=>setSheet(null)} title="Add Expense">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={eF.date} onChange={e=>setEF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Category</label>
        <select style={S.sel} value={eF.category} onChange={e=>setEF(f=>({...f,category:e.target.value}))}>
          {[...EXP_CATS,...(data.customCats||[])].map(c=><option key={c}>{c}</option>)}
        </select>
        <label style={S.lbl}>Or add new category</label>
        <input style={{...S.inp,marginBottom:14}} type="text" placeholder="Type new category + press Add"
          id="newCatInput" onKeyDown={e=>{
            if(e.key==="Enter"&&e.target.value.trim()){
              const nc=e.target.value.trim();
              const nd={...data,customCats:[...(data.customCats||[]),nc]};
              setData(nd);setEF(f=>({...f,category:nc}));e.target.value="";
            }
          }}/>
        <label style={S.lbl}>From Account *</label><select style={S.sel} value={eF.accountId} onChange={e=>setEF(f=>({...f,accountId:e.target.value}))}><option value="">Select account…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX) *</label><input style={S.inp} type="number" value={eF.amount} onChange={e=>setEF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={eF.note} onChange={e=>setEF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        {/* Loan given toggle */}
        <div onClick={()=>setEF(f=>({...f,isLoan:!f.isLoan}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:eF.isLoan?"#E8F5EF":"#F5F0FF", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${eF.isLoan?"#1B7A4E":"#CCC"}`, background:eF.isLoan?"#1B7A4E":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {eF.isLoan && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:eF.isLoan?"#1B7A4E":"#4A3870" }}>This is a loan I gave someone 💸</div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts → Owed to Me</div>
          </div>
        </div>
        <button style={btn("#C0392B")} onClick={addExpense}>Save Expense</button>
      </Sheet>
      <Sheet open={sheet==="savings"} onClose={()=>setSheet(null)} title="New Savings Goal">
        <label style={S.lbl}>Goal Name *</label><input style={S.inp} type="text" value={sF.name} onChange={e=>setSF(f=>({...f,name:e.target.value}))} placeholder="e.g. Emergency Fund"/>
        <label style={S.lbl}>Target Amount (UGX)</label><input style={S.inp} type="number" value={sF.goal} onChange={e=>setSF(f=>({...f,goal:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Already Saved (UGX)</label><input style={S.inp} type="number" value={sF.current} onChange={e=>setSF(f=>({...f,current:e.target.value}))} placeholder="0"/>
        <button style={btn("#7B52A8")} onClick={addSavings}>Create Goal</button>
      </Sheet>

      <Sheet open={sheet==="edit"} onClose={()=>{setSheet(null);setEditTx(null);}} title={`✏️ Edit ${editTx?.type==="income"?"Income":"Expense"}`}>
        {editTx && <>
          <label style={S.lbl}>Date</label>
          <input style={S.inp} type="date" value={editF.date||""} onChange={e=>setEditF(f=>({...f,date:e.target.value}))}/>
          {editTx.type==="income"
            ? <><label style={S.lbl}>Source</label>
                <select style={S.sel} value={editF.source||""} onChange={e=>setEditF(f=>({...f,source:e.target.value}))}>
                  {INC_SOURCES.map(s=><option key={s}>{s}</option>)}
                </select></>
            : <><label style={S.lbl}>Category</label>
                <select style={S.sel} value={editF.category||""} onChange={e=>setEditF(f=>({...f,category:e.target.value}))}>
                  {[...EXP_CATS,...(data.customCats||[])].map(c=><option key={c}>{c}</option>)}
                </select></>
          }
          <label style={S.lbl}>Account</label>
          <select style={S.sel} value={editF.accountId||""} onChange={e=>setEditF(f=>({...f,accountId:e.target.value}))}>
            <option value="">Select account…</option>
            {data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
          </select>
          <label style={S.lbl}>Amount (UGX)</label>
          <input style={S.inp} type="number" value={editF.amount||""} onChange={e=>setEditF(f=>({...f,amount:e.target.value}))}/>
          <label style={S.lbl}>Note</label>
          <input style={S.inp} type="text" value={editF.note||""} onChange={e=>setEditF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
          <button style={btn("#1A5276")} onClick={saveEdit}>Save Changes</button>
        </>}
      </Sheet>

      {/* ── RECURRING ── */}
      {sub==="recurring" && <>
        <div style={{ background:"#EAF2F8", borderRadius:14, padding:"12px 14px", marginBottom:12, fontSize:12, color:"#1A5276" }}>
          💡 Set up regular income or expenses once. Tap <b>Log Now</b> each month when it happens — it auto-records and updates your account balance.
        </div>
        <button style={btn("#1A5276")} onClick={()=>setSheet("recurring")}>+ Add Recurring Transaction</button>
        {recurring.length===0
          ? <div style={{textAlign:"center",padding:"28px 0",color:"#BBB"}}><div style={{fontSize:30,marginBottom:8}}>🔁</div><div style={{fontSize:13}}>No recurring transactions yet</div></div>
          : recurring.map(r=>(
              <div key={r.id} style={{background:r.type==="income"?"#E8F5EF":"#FDECEA",borderRadius:14,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:700,color:"#2C1654",fontSize:14}}>{r.name}</div>
                    <div style={{color:"#999",fontSize:11}}>{r.frequency} · {r.type==="income"?r.source:r.category} · Day {r.dayOfMonth}</div>
                    {r.lastLogged && <div style={{color:"#999",fontSize:11}}>Last logged: {r.lastLogged}</div>}
                  </div>
                  <button onClick={()=>delRecurring(r.id)} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:18}}>×</button>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800,color:r.type==="income"?"#1B7A4E":"#C0392B",fontSize:16}}>{fmt(r.amount)}</div>
                  <button onClick={()=>logRecurring(r)} style={{background:r.type==="income"?"#1B7A4E":"#C0392B",color:"#fff",border:"none",borderRadius:10,padding:"7px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Log Now ✓</button>
                </div>
              </div>
          ))
        }
      </>}

      <Sheet open={sheet==="recurring"} onClose={()=>setSheet(null)} title="Add Recurring Transaction">
        <label style={S.lbl}>Name *</label><input style={S.inp} type="text" value={rF.name} onChange={e=>setRF(f=>({...f,name:e.target.value}))} placeholder="e.g. Karveli Salary" autoFocus/>
        <label style={S.lbl}>Type</label>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["income","expense"].map(t=>(
            <button key={t} onClick={()=>setRF(f=>({...f,type:t}))} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:rF.type===t?(t==="income"?"#1B7A4E":"#C0392B"):"#F5F0FF",color:rF.type===t?"#fff":"#999",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
          ))}
        </div>
        {rF.type==="income"
          ? <><label style={S.lbl}>Source</label><select style={S.sel} value={rF.source} onChange={e=>setRF(f=>({...f,source:e.target.value}))}>{INC_SOURCES.map(s=><option key={s}>{s}</option>)}</select></>
          : <><label style={S.lbl}>Category</label><select style={S.sel} value={rF.category} onChange={e=>setRF(f=>({...f,category:e.target.value}))}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></>
        }
        <label style={S.lbl}>Account *</label><select style={S.sel} value={rF.accountId} onChange={e=>setRF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX) *</label><input style={S.inp} type="number" value={rF.amount} onChange={e=>setRF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Frequency</label>
        <select style={S.sel} value={rF.frequency} onChange={e=>setRF(f=>({...f,frequency:e.target.value}))}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
        </select>
        <label style={S.lbl}>Day of Month (for monthly)</label><input style={S.inp} type="number" value={rF.dayOfMonth} onChange={e=>setRF(f=>({...f,dayOfMonth:e.target.value}))} placeholder="e.g. 25"/>
        <button style={btn("#1A5276")} onClick={addRecurring}>Save Recurring</button>
      </Sheet>
    </>
  );
}

// ── KITO ──────────────────────────────────────────────────────────────────────
function Kito({ data, setData }) {
  const [sub, setSub]     = useState("sales");
  const [sheet, setSheet] = useState(null);
  const [sF, setSF] = useState({ date:today(), item:"", qty:"1", price:"", note:"", accountId:"" });
  const [eF, setEF] = useState({ date:today(), category:KITO_CATS[0], note:"", amount:"", accountId:"" });
  const [salF, setSalF] = useState({ date:today(), amount:"", note:"Salary", accountId:"" });
  const [invF, setInvF] = useState({ name:"", qty:"", unit:"pcs", costPerUnit:"", reorderAt:"" });

  const totalSales  = data.kSales.reduce((s,x)=>s+ +x.price* +x.qty,0);
  const totalExp    = data.kExpenses.reduce((s,x)=>s+ +x.amount,0);
  const totalSalary = data.kSalary.reduce((s,x)=>s+ +x.amount,0);
  const profit      = totalSales-totalExp-totalSalary;

  const addSale = () => {
    if (!sF.price||!sF.accountId) return;
    const acct=data.accounts.find(a=>a.id===sF.accountId);
    const amt= +sF.price* +sF.qty;
    const nd={...data,kSales:[{id:uid(),...sF,acctName:acct?.name||""},...data.kSales],accounts:data.accounts.map(a=>a.id===sF.accountId?{...a,balance:+a.balance+amt}:a)};
    setData(nd);setSF({date:today(),item:"",qty:"1",price:"",note:"",accountId:""});setSheet(null);
  };
  const addExp = () => {
    if (!eF.amount||!eF.accountId) return;
    const acct=data.accounts.find(a=>a.id===eF.accountId);
    const nd={...data,kExpenses:[{id:uid(),...eF,acctName:acct?.name||""},...data.kExpenses],accounts:data.accounts.map(a=>a.id===eF.accountId?{...a,balance:+a.balance- +eF.amount}:a)};
    setData(nd);setEF({date:today(),category:KITO_CATS[0],note:"",amount:"",accountId:""});setSheet(null);
  };
  const paySalary = () => {
    if (!salF.amount||!salF.accountId) return;
    const acct=data.accounts.find(a=>a.id===salF.accountId);
    const nd={...data,
      kSalary:[{id:uid(),...salF,acctName:acct?.name||""},...data.kSalary],
      income:[{id:uid(),date:salF.date,source:"Kito Salary",note:salF.note,amount:salF.amount,accountId:salF.accountId,acctName:acct?.name||""},...data.income],
      accounts:data.accounts.map(a=>a.id===salF.accountId?{...a,balance:+a.balance+ +salF.amount}:a)
    };
    setData(nd);setSalF({date:today(),amount:"",note:"Salary",accountId:""});setSheet(null);
  };
  const addInv = () => {
    if (!invF.name) return;
    const nd={...data,kInventory:[{id:uid(),...invF},...data.kInventory]};
    setData(nd);setInvF({name:"",qty:"",unit:"pcs",costPerUnit:"",reorderAt:""});setSheet(null);
  };
  const delSale=(id,price,qty,acId)=>{ const nd={...data,kSales:data.kSales.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance- +price* +qty}:a)};setData(nd); };
  const delExp=(id,amt,acId)=>{ const nd={...data,kExpenses:data.kExpenses.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance+ +amt}:a)};setData(nd); };
  const delSal=(id)=>{ const nd={...data,kSalary:data.kSalary.filter(x=>x.id!==id)};setData(nd); };
  const delInv=(id)=>{ const nd={...data,kInventory:data.kInventory.filter(x=>x.id!==id)};setData(nd); };
  const updInv=(id,field,val)=>{ const nd={...data,kInventory:data.kInventory.map(i=>i.id===id?{...i,[field]:val}:i)};setData(nd); };

  return (
    <>
      <div style={{ display:"flex", gap:8, padding:"14px 16px 8px" }}>
        <StatBox label="Sales" value={totalSales} bg="#E8F5EF" color="#1B7A4E"/>
        <StatBox label="Costs" value={totalExp} bg="#FDECEA" color="#C0392B"/>
        <StatBox label="Profit" value={profit} bg={profit>=0?"#FFF8E1":"#FDECEA"} color={profit>=0?"#F57F17":"#C0392B"}/>
      </div>
      <div style={{ margin:"10px 16px", background:"#FFF8E1", borderRadius:16, padding:"14px 16px", border:"1.5px solid #FFE082" }}>
        <div style={{ fontWeight:800, color:"#F57F17", marginBottom:4 }}>💸 Pay Yourself</div>
        <div style={{ color:"#999", fontSize:12, marginBottom:10 }}>Move money from Kito to personal income cleanly. No more borrowing 😄</div>
        <button style={{ ...btn("#F57F17"), width:"auto", padding:"8px 18px", marginBottom:0 }} onClick={()=>setSheet("salary")}>Pay My Salary</button>
      </div>
      <SubTabs tabs={["sales","expenses","inventory","salary"]} active={sub} onChange={setSub} color="#F57F17"/>
      <div style={S.pad}>
        {sub==="sales"&&<><button style={btn("#1B7A4E")} onClick={()=>setSheet("sale")}>+ Record Sale</button>{data.kSales.length===0?<Empty text="No sales yet"/>:groupByMonth(data.kSales.map(x=>({...x,amount:+x.price* +x.qty}))).map(g=>(
              <MonthGroup key={g.mk} label={g.label} total={fmt(g.total)} color="#1B7A4E" bg="#E8F5EF">
                {g.txs.map(x=><TxRow key={x.id} label={x.item||"Sale"} sub={`${x.date} · ${x.qty} unit(s)${x.note?" · "+x.note:""}`} right={fmt(+x.price* +x.qty)} rightColor="#1B7A4E" tag={x.acctName} onDel={()=>delSale(x.id,x.price,x.qty,x.accountId)}/>)}
              </MonthGroup>
            ))}</>}
        {sub==="expenses"&&<><button style={btn("#C0392B")} onClick={()=>setSheet("exp")}>+ Add Expense</button>{data.kExpenses.length===0?<Empty text="No expenses yet"/>:groupByMonth(data.kExpenses).map(g=>(
              <MonthGroup key={g.mk} label={g.label} total={fmt(g.total)} color="#C0392B" bg="#FDECEA">
                {g.txs.map(x=><TxRow key={x.id} label={x.category} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#C0392B" tag={x.acctName} onDel={()=>delExp(x.id,x.amount,x.accountId)}/>)}
              </MonthGroup>
            ))}</>}
        {sub==="inventory"&&<><button style={btn()} onClick={()=>setSheet("inv")}>+ Add Item</button>{data.kInventory.length===0?<Empty text="No inventory yet"/>:data.kInventory.map(inv=>{const low= +inv.qty<= +inv.reorderAt&&inv.reorderAt;return(<div key={inv.id} style={{ background:low?"#FDECEA":"#fff", borderRadius:14, padding:"12px 14px", marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><div><div style={{ fontWeight:700, color:"#2C1654" }}>{inv.name}</div><div style={{ color:"#999", fontSize:11 }}>{fmt(inv.costPerUnit)} per {inv.unit}</div></div><div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>{low&&<span style={{ background:"#FDECEA", color:"#C0392B", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Low Stock</span>}<button onClick={()=>delInv(inv.id)} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", fontSize:18 }}>×</button></div></div><div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:11, color:"#999", fontWeight:700, textTransform:"uppercase" }}>Qty:</span><input type="number" value={inv.qty} onChange={e=>updInv(inv.id,"qty",e.target.value)} style={{ width:60, border:"1.5px solid #E0E0E0", borderRadius:8, padding:"5px 8px", fontSize:14, outline:"none" }}/><span style={{ color:"#999", fontSize:12 }}>{inv.unit} · reorder ≤{inv.reorderAt}</span></div></div>);})}</>}
        {sub==="salary"&&<><div style={{ color:"#999", fontSize:12, marginBottom:12 }}>Each payment also goes into Personal income automatically.</div>{data.kSalary.length===0?<Empty text="No salary transfers yet"/>:data.kSalary.map(x=><TxRow key={x.id} label="Salary Transfer" sub={`${x.date} · ${x.note}`} right={fmt(x.amount)} rightColor="#F57F17" tag={x.acctName} onDel={()=>delSal(x.id)}/>)}</>}
      </div>

      <Sheet open={sheet==="sale"} onClose={()=>setSheet(null)} title="Record Sale">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={sF.date} onChange={e=>setSF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Item</label><input style={S.inp} type="text" value={sF.item} onChange={e=>setSF(f=>({...f,item:e.target.value}))} placeholder="e.g. Gold bangle"/>
        <label style={S.lbl}>Qty</label><input style={S.inp} type="number" value={sF.qty} onChange={e=>setSF(f=>({...f,qty:e.target.value}))}/>
        <label style={S.lbl}>Price per unit (UGX)</label><input style={S.inp} type="number" value={sF.price} onChange={e=>setSF(f=>({...f,price:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Into Account *</label><select style={S.sel} value={sF.accountId} onChange={e=>setSF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={sF.note} onChange={e=>setSF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <button style={btn("#1B7A4E")} onClick={addSale}>Save Sale</button>
      </Sheet>
      <Sheet open={sheet==="exp"} onClose={()=>setSheet(null)} title="Kito Expense">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={eF.date} onChange={e=>setEF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Category</label><select style={S.sel} value={eF.category} onChange={e=>setEF(f=>({...f,category:e.target.value}))}>{KITO_CATS.map(c=><option key={c}>{c}</option>)}</select>
        <label style={S.lbl}>From Account *</label><select style={S.sel} value={eF.accountId} onChange={e=>setEF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX)</label><input style={S.inp} type="number" value={eF.amount} onChange={e=>setEF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={eF.note} onChange={e=>setEF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <button style={btn("#C0392B")} onClick={addExp}>Save Expense</button>
      </Sheet>
      <Sheet open={sheet==="salary"} onClose={()=>setSheet(null)} title="Pay Yourself">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={salF.date} onChange={e=>setSalF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Amount (UGX) *</label><input style={S.inp} type="number" value={salF.amount} onChange={e=>setSalF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Into Account *</label><select style={S.sel} value={salF.accountId} onChange={e=>setSalF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={salF.note} onChange={e=>setSalF(f=>({...f,note:e.target.value}))}/>
        <button style={btn("#F57F17")} onClick={paySalary}>Transfer to Personal</button>
      </Sheet>
      <Sheet open={sheet==="inv"} onClose={()=>setSheet(null)} title="Add Inventory Item">
        <label style={S.lbl}>Item Name *</label><input style={S.inp} type="text" value={invF.name} onChange={e=>setInvF(f=>({...f,name:e.target.value}))} placeholder="e.g. Gold wire"/>
        <label style={S.lbl}>Current Qty</label><input style={S.inp} type="number" value={invF.qty} onChange={e=>setInvF(f=>({...f,qty:e.target.value}))}/>
        <label style={S.lbl}>Unit</label><select style={S.sel} value={invF.unit} onChange={e=>setInvF(f=>({...f,unit:e.target.value}))}>{["pcs","kg","g","metres","rolls","boxes","sets"].map(u=><option key={u}>{u}</option>)}</select>
        <label style={S.lbl}>Cost per unit (UGX)</label><input style={S.inp} type="number" value={invF.costPerUnit} onChange={e=>setInvF(f=>({...f,costPerUnit:e.target.value}))}/>
        <label style={S.lbl}>Reorder when qty ≤</label><input style={S.inp} type="number" value={invF.reorderAt} onChange={e=>setInvF(f=>({...f,reorderAt:e.target.value}))}/>
        <button style={btn()} onClick={addInv}>Save Item</button>
      </Sheet>
    </>
  );
}

// ── DEBTS ─────────────────────────────────────────────────────────────────────
function Debts({ data, setData }) {
  const [sub,      setSub]      = useState("iOwe");
  const [sheet,    setSheet]    = useState(null);
  const [form,     setForm]     = useState({ name:"", amount:"", due:"", note:"", interestRate:"", interestType:"monthly" });
  const [paySheet, setPaySheet] = useState(null);
  const [payAmt,   setPayAmt]   = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editSheet, setEditSheet] = useState(null);
  const [editForm,  setEditForm]  = useState({});

  const SECS = {
    iOwe:     { label:"I Owe",         color:"#C0392B", bg:"#FDECEA", emoji:"😬" },
    owedMe:   { label:"Owed to Me",    color:"#1B7A4E", bg:"#E8F5EF", emoji:"🙌" },
    business: { label:"Business Debt", color:"#F57F17", bg:"#FFF8E1", emoji:"🏪" },
  };
  const sec    = SECS[sub];
  const items  = data.debts[sub] || [];
  const unpaid = items.filter(x=>!x.paid);
  const paid   = items.filter(x=>x.paid);
  const total  = unpaid.reduce((s,x)=>s+ +x.amount, 0);

  const addDebt = () => {
    if (!form.name||!form.amount) return;
    const nd={...data,debts:{...data.debts,[sub]:[{id:uid(),...form,paid:false},...data.debts[sub]]}};
    setData(nd);setForm({name:"",amount:"",due:"",note:""});setSheet(null);
  };

  const toggle = (id) => {
    const nd={...data,debts:{...data.debts,[sub]:data.debts[sub].map(x=>x.id===id?{...x,paid:!x.paid}:x)}};
    setData(nd);
  };

  const del = (id) => {
    const nd={...data,debts:{...data.debts,[sub]:data.debts[sub].filter(x=>x.id!==id)}};
    setData(nd);
  };

  const openPay = (e, x) => {
    e.stopPropagation();
    setPaySheet(x);
    setPayAmt("");
  };

  const makePayment = () => {
    if (!payAmt||!paySheet) return;
    const amt = parseFloat(payAmt);
    const nd = {...data, debts:{...data.debts,[sub]:data.debts[sub].map(x=>{
      if (x.id!==paySheet.id) return x;
      const remaining = +x.amount - amt;
      return remaining<=0
        ? {...x, amount:0, paid:true}
        : {...x, amount:remaining, note:(x.note||"")+` | Paid ${fmt(amt)} on ${today()}`};
    })}};
    setData(nd);setPaySheet(null);setPayAmt("");
  };

  return (
    <>
      {/* Section tabs */}
      <div style={{ display:"flex", gap:8, padding:"14px 16px 8px" }}>
        {Object.entries(SECS).map(([k,s])=>(
          <button key={k} onClick={()=>{setSub(k);setExpanded(null);}} style={{ flex:1, padding:"9px 4px", borderRadius:12, border:"none", background:sub===k?s.color:"#fff", color:sub===k?"#fff":"#999", fontWeight:700, fontSize:11, cursor:"pointer", boxShadow:sub===k?`0 2px 8px ${s.color}44`:"none" }}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div style={S.pad}>
        {/* Total outstanding */}
        <div style={{ background:sec.bg, borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:11, color:sec.color, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Outstanding · {sec.label}</div>
          <div style={{ fontSize:26, fontWeight:900, color:sec.color }}>{fmt(total)}</div>
          <div style={{ fontSize:12, color:sec.color+"99", marginTop:4 }}>{unpaid.length} entr{unpaid.length===1?"y":"ies"} · tap any to see details</div>
        </div>

        <button style={btn(sec.color)} onClick={()=>setSheet("add")}>+ Add Entry</button>

        {/* Unpaid entries */}
        {unpaid.length===0
          ? <Empty text="All clear! 🎉"/>
          : unpaid.map(x=>{
              const isOpen = expanded===x.id;
              return (
                <div key={x.id} style={{ borderRadius:14, marginBottom:8,
                  background: isOpen?sec.bg+"55":"#fff",
                  border:`1.5px solid ${isOpen?sec.color+"44":"#EDE0FF"}`,
                  overflow:"hidden" }}>
                  {/* Main row — tappable */}
                  <div onClick={()=>setExpanded(e=>e===x.id?null:x.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer" }}>
                    <button onClick={e=>{e.stopPropagation();toggle(x.id);}}
                      style={{ width:26, height:26, borderRadius:"50%", border:`2.5px solid ${sec.color}`,
                        background:"none", cursor:"pointer", flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:"#2C1654", fontSize:14 }}>{x.name}</div>
                      {x.due && <div style={{ color:"#F57F17", fontSize:11, fontWeight:600 }}>Due {x.due}</div>}
                    </div>
                    <div style={{ fontWeight:800, color:sec.color, fontSize:15 }}>{fmt(x.amount)}</div>
                    <span style={{ fontSize:11, color:"#999" }}>{isOpen?"▲":"▼"}</span>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding:"0 14px 14px" }}>
                      {x.note && (
                        <div style={{ background:"#fff", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
                          <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Note</div>
                          <div style={{ fontSize:13, color:"#2C1654" }}>{x.note}</div>
                        </div>
                      )}
                      <div style={{ background:"#fff", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
                        <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Amount</div>
                        <div style={{ fontSize:18, fontWeight:900, color:sec.color }}>{fmt(x.amount)}</div>
                      </div>
                      {x.due && (
                        <div style={{ background:"#FFF8E1", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
                          <div style={{ fontSize:10, color:"#F57F17", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Due Date</div>
                          <div style={{ fontSize:13, color:"#F57F17", fontWeight:700 }}>{x.due}</div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={e=>openPay(e,x)} style={{ flex:1, background:"#E8F5EF", border:"none", color:"#1B7A4E", borderRadius:10, padding:"10px", fontWeight:700, fontSize:13, cursor:"pointer" }}>💸 Pay Partial</button>
                        <button onClick={e=>{e.stopPropagation();toggle(x.id);}} style={{ flex:1, background:sec.bg, border:`1.5px solid ${sec.color}`, color:sec.color, borderRadius:10, padding:"10px", fontWeight:700, fontSize:13, cursor:"pointer" }}>✓ Mark Settled</button>
                        <button onClick={e=>{e.stopPropagation();del(x.id);}} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:10, padding:"10px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        }

        {/* Settled */}
        {paid.length>0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>Settled ✓</div>
            {paid.map(x=>(
              <div key={x.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                borderBottom:"1px solid #F5F5F5", opacity:0.5 }}>
                <button onClick={()=>toggle(x.id)} style={{ width:26, height:26, borderRadius:"50%", border:"none",
                  background:"#1B7A4E", cursor:"pointer", color:"#fff", fontSize:14, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>✓</button>
                <div style={{ flex:1, color:"#999", fontSize:13, textDecoration:"line-through" }}>{x.name}</div>
                <div style={{ color:"#999", fontSize:13 }}>{fmt(x.amount)}</div>
                <button onClick={()=>del(x.id)} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", fontSize:18 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Partial payment sheet */}
      <Sheet open={!!paySheet} onClose={()=>setPaySheet(null)} title="💸 Make a Payment">
        {paySheet && <>
          <div style={{ background:"#E8F5EF", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontWeight:700, color:"#1B7A4E", fontSize:14 }}>{paySheet.name}</div>
            <div style={{ color:"#999", fontSize:12, marginTop:2 }}>Outstanding: {fmt(paySheet.amount)}</div>
          </div>
          <label style={S.lbl}>Amount Paying Now (UGX) *</label>
          <input style={S.inp} type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="0" autoFocus/>
          {payAmt && <div style={{ color:"#1B7A4E", fontSize:13, fontWeight:600, marginBottom:14 }}>
            Remaining after this payment: {fmt(Math.max(0, +paySheet.amount - +payAmt))}
          </div>}
          <button style={btn("#1B7A4E")} onClick={makePayment}>Record Payment</button>
        </>}
      </Sheet>

      {/* Add debt sheet */}
      <Sheet open={sheet==="add"} onClose={()=>setSheet(null)} title={`Add · ${sec.label}`}>
        <label style={S.lbl}>{sub==="business"?"Supplier / Lender":"Name"} *</label>
        <input style={S.inp} type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Who?" autoFocus/>
        <label style={S.lbl}>Amount (UGX) *</label>
        <input style={S.inp} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Due Date</label>
        <input style={S.inp} type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/>
        <label style={S.lbl}>Interest Rate % (optional)</label>
        <input style={S.inp} type="number" value={form.interestRate} onChange={e=>setForm(f=>({...f,interestRate:e.target.value}))} placeholder="e.g. 5"/>
        {form.interestRate && +form.interestRate > 0 && <>
          <label style={S.lbl}>Interest Type</label>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {["monthly","annual"].map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,interestType:t}))}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize",
                  background:form.interestType===t?"#D4820A":"#F5F0FF", color:form.interestType===t?"#fff":"#999" }}>{t}</button>
            ))}
          </div>
          <div style={{ background:"#FFF8E1", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#D4820A", fontWeight:600 }}>
            Interest: {fmt(Math.round(+form.amount * +form.interestRate / 100))} / {form.interestType==="monthly"?"month":"year"}
          </div>
        </>}
        <label style={S.lbl}>Note</label>
        <input style={S.inp} type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="What for?"/>
        <button style={btn(sec.color)} onClick={addDebt}>Save</button>
      </Sheet>

      {/* Edit debt sheet */}
      <Sheet open={!!editSheet} onClose={()=>setEditSheet(null)} title="✏️ Edit Entry">
        {editSheet && <>
          <label style={S.lbl}>Name *</label>
          <input style={S.inp} type="text" value={editForm.name||""} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} autoFocus/>
          <label style={S.lbl}>Amount (UGX) *</label>
          <input style={S.inp} type="number" value={editForm.amount||""} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))}/>
          <label style={S.lbl}>Due Date</label>
          <input style={S.inp} type="date" value={editForm.due||""} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))}/>
          <label style={S.lbl}>Interest Rate %</label>
          <input style={S.inp} type="number" value={editForm.interestRate||""} onChange={e=>setEditForm(f=>({...f,interestRate:e.target.value}))} placeholder="0"/>
          {editForm.interestRate && +editForm.interestRate > 0 && (
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {["monthly","annual"].map(t=>(
                <button key={t} onClick={()=>setEditForm(f=>({...f,interestType:t}))}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize",
                    background:editForm.interestType===t?"#D4820A":"#F5F0FF", color:editForm.interestType===t?"#fff":"#999" }}>{t}</button>
              ))}
            </div>
          )}
          <label style={S.lbl}>Note</label>
          <input style={S.inp} type="text" value={editForm.note||""} onChange={e=>setEditForm(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
          <button style={btn(sec.color)} onClick={saveEdit}>Save Changes</button>
        </>}
      </Sheet>
    </>
  );
}

// ── SAVINGS CHALLENGE ─────────────────────────────────────────────────────────
function Challenge({ data, setData }) {
  const [sheet, setSheet]   = useState(null);
  const [cName, setCName]       = useState("");
  const [cTotal, setCTotal]     = useState("");
  const [cBubbles, setCBubbles] = useState("100");

  const challenges = data.challenges || [];

  const createChallenge = () => {
    if (!cName||!cTotal) return;
    const numBubbles = Math.max(5, Math.min(200, parseInt(cBubbles)||100));
    const perBubble = Math.round(parseFloat(cTotal) / numBubbles);
    const bubbles = Array.from({ length: numBubbles }, (_, i) => ({ id: i, value: perBubble, done: false }));
    const nd = { ...data, challenges:[{ id:uid(), name:cName, total:parseFloat(cTotal), bubbles, createdAt:today() }, ...challenges] };
    setData(nd);setCName("");setCTotal("");setSheet(null);
  };

  const toggleBubble = (cid, bid) => {
    const nd = { ...data, challenges: data.challenges.map(c => c.id===cid
      ? { ...c, bubbles: c.bubbles.map(b => b.id===bid ? {...b, done:!b.done} : b) }
      : c
    )};
    setData(nd);
  };

  const delChallenge = (id) => {
    const nd = { ...data, challenges: data.challenges.filter(c=>c.id!==id) };
    setData(nd);
  };

  return (
    <>
      <div style={{ padding:"14px 16px 0" }}>
        <button style={btn("#7B52A8")} onClick={()=>setSheet("new")}>+ New Savings Challenge</button>
      </div>

      {challenges.length===0 && (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"#BBB" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎯</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#888", marginBottom:4 }}>No challenges yet</div>
          <div style={{ fontSize:12 }}>Create one and tap bubbles as you save!</div>
        </div>
      )}

      {challenges.map(c => {
        const done  = c.bubbles.filter(b=>b.done).length;
        const total = c.bubbles.length;
        const saved = c.bubbles.filter(b=>b.done).reduce((s,b)=>s+ +b.value,0);
        const pct   = Math.round((done/total)*100);

        return (
          <div key={c.id} style={{ margin:"0 16px 20px", background:"#fff", borderRadius:20, padding:16 }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:800, color:"#2C1654", fontSize:16 }}>{c.name}</div>
                <div style={{ color:"#999", fontSize:12, marginTop:2 }}>Goal: {fmt(c.total)}</div>
              </div>
              <button onClick={()=>delChallenge(c.id)} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>

            {/* Progress */}
            <div style={{ background:"#F5F0FF", borderRadius:8, height:10, marginBottom:6 }}>
              <div style={{ width:pct+"%", height:10, borderRadius:8, background:"linear-gradient(90deg,#00695C,#4CAF50)", transition:"width 0.3s" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:12, color:"#7B52A8", fontWeight:700 }}>{fmt(saved)} saved</span>
              <span style={{ fontSize:12, color:"#999" }}>{done}/{total} bubbles · {pct}%</span>
            </div>

            {/* Bubble grid */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {c.bubbles.map(b => (
                <button key={b.id} onClick={()=>toggleBubble(c.id, b.id)}
                  style={{
                    width:30, height:30, borderRadius:"50%",
                    border:`2px solid ${b.done?"#7B52A8":"#DDD"}`,
                    background: b.done?"#7B52A8":"#fff",
                    color: b.done?"#fff":"#777",
                    fontSize:7, fontWeight:700, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 0.15s",
                    boxShadow: b.done?"0 2px 6px #00695C44":"none"
                  }}>
                  {b.done ? "✓" : fmt(b.value).replace("UGX ","").replace(/,000,000/,"M").replace(/,000/,"k")}
                </button>
              ))}
            </div>

            {pct===100 && (
              <div style={{ textAlign:"center", marginTop:14, padding:"10px", background:"#E8F5EF", borderRadius:12 }}>
                <div style={{ fontSize:24 }}>🎉</div>
                <div style={{ fontWeight:800, color:"#1B7A4E", fontSize:14 }}>Challenge Complete!</div>
              </div>
            )}
          </div>
        );
      })}

      <Sheet open={sheet==="new"} onClose={()=>setSheet(null)} title="🎯 New Savings Challenge">
        <label style={S.lbl}>Challenge Name *</label>
        <input style={S.inp} type="text" value={cName} onChange={e=>setCName(e.target.value)} placeholder="e.g. Holiday Fund"/>
        <label style={S.lbl}>Total Amount to Save (UGX) *</label>
        <input style={S.inp} type="number" value={cTotal} onChange={e=>setCTotal(e.target.value)} placeholder="e.g. 500000"/>
        <label style={S.lbl}>Number of Bubbles (5–200)</label>
        <input style={S.inp} type="number" value={cBubbles} onChange={e=>setCBubbles(e.target.value)} placeholder="100"/>
        <div style={{ background:"#E8F5EF", borderRadius:12, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#1B7A4E" }}>
          💡 Each bubble = {cTotal && cBubbles ? fmt(Math.round(parseFloat(cTotal||0)/Math.max(1,parseInt(cBubbles||100)))) : "UGX 0"}. Tap each one as you save it!
        </div>
        <button style={btn("#7B52A8")} onClick={createChallenge}>Create Challenge</button>
      </Sheet>
    </>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
// ── BUDGET LIMITS ─────────────────────────────────────────────────────────────
function Budget({ data, setData }) {
  const [sheet, setSheet] = useState(null);
  const [editCat, setEditCat] = useState("");
  const [editAmt, setEditAmt] = useState("");

  const budgets = data.budgets || {};
  const curMonth = monthKey(today());
  const mExp = data.expenses.filter(x => monthKey(x.date) === curMonth);

  const spentByCat = {};
  EXP_CATS.forEach(c => { spentByCat[c] = mExp.filter(x=>x.category===c).reduce((s,x)=>s+ +x.amount,0); });

  const saveBudget = () => {
    if (!editCat || !editAmt) return;
    const nd = { ...data, budgets: { ...budgets, [editCat]: parseFloat(editAmt)||0 } };
    setData(nd); setSheet(null); setEditAmt("");
  };

  const delBudget = (cat) => {
    const nb = { ...budgets }; delete nb[cat];
    const nd = { ...data, budgets: nb }; setData(nd);
  };

  const openEdit = (cat) => { setEditCat(cat); setEditAmt(String(budgets[cat]||"")); setSheet("edit"); };

  // categories with budgets set
  const withBudget = EXP_CATS.filter(c => budgets[c]);
  // categories without budgets
  const withoutBudget = EXP_CATS.filter(c => !budgets[c]);

  // count overbudget for home screen alert
  const overCount = withBudget.filter(c => spentByCat[c] > budgets[c]).length;

  return (
    <>
      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ background:"#EAF2F8", borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:12, color:"#1A5276", fontWeight:700, marginBottom:2 }}>📅 {monthLabel(curMonth)}</div>
          <div style={{ fontSize:12, color:"#4A3870" }}>
            Set monthly limits per category. You'll see red when you go over. 🚨
          </div>
          {overCount > 0 && (
            <div style={{ marginTop:8, background:"#FDECEA", borderRadius:10, padding:"8px 10px", color:"#C0392B", fontWeight:700, fontSize:13 }}>
              ⚠️ {overCount} categor{overCount===1?"y":"ies"} over budget this month!
            </div>
          )}
        </div>

        {/* Set new budget */}
        <div style={{ marginBottom:14 }}>
          <label style={S.lbl}>Set Budget for a Category</label>
          <select style={S.sel} value={editCat} onChange={e=>setEditCat(e.target.value)}>
            <option value="">Select category…</option>
            {EXP_CATS.map(c=><option key={c} value={c}>{c}{budgets[c]?" ✓":""}</option>)}
          </select>
          {editCat && <>
            <label style={S.lbl}>Monthly Limit (UGX)</label>
            <input style={S.inp} type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} placeholder="e.g. 200000"/>
            <button style={btn("#1A5276")} onClick={saveBudget}>Save Budget Limit</button>
          </>}
        </div>

        {/* Budget cards */}
        {withBudget.length === 0
          ? <Empty text="No budgets set yet — add one above!"/>
          : withBudget.map(cat => {
              const spent   = spentByCat[cat] || 0;
              const limit   = budgets[cat];
              const pct     = Math.min(100, Math.round((spent/limit)*100));
              const over    = spent > limit;
              const barColor = pct < 70 ? "#1B7A4E" : pct < 90 ? "#F57F17" : "#C0392B";
              const remaining = limit - spent;

              return (
                <div key={cat} style={{ background: over?"#FDECEA":"#fff", borderRadius:16, padding:"14px", marginBottom:12, border: over?"1.5px solid #FFCDD2":"1.5px solid #F0F0F0" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#2C1654", fontSize:14 }}>{cat}</div>
                      <div style={{ fontSize:11, color:"#999", marginTop:1 }}>Limit: {fmt(limit)}</div>
                    </div>
                    <div style={{ textAlign:"right", display:"flex", gap:8, alignItems:"center" }}>
                      {over && <span style={{ background:"#FDECEA", color:"#C0392B", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>OVER!</span>}
                      <button onClick={()=>openEdit(cat)} style={{ background:"#EAF2F8", border:"none", color:"#1A5276", borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Edit</button>
                      <button onClick={()=>delBudget(cat)} style={{ background:"#FDECEA", border:"none", color:"#E53935", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    </div>
                  </div>

                  {/* Bar */}
                  <div style={{ background:"#EDE0FF", borderRadius:6, height:10, marginBottom:6 }}>
                    <div style={{ width:pct+"%", height:10, borderRadius:6, background:barColor, transition:"width 0.3s" }}/>
                  </div>

                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:over?"#C0392B":"#2C1654" }}>
                      {fmt(spent)} spent
                    </span>
                    <span style={{ fontSize:12, color: over?"#C0392B":"#1B7A4E", fontWeight:700 }}>
                      {over ? `${fmt(Math.abs(remaining))} over!` : `${fmt(remaining)} left`}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>

      <Sheet open={sheet==="edit"} onClose={()=>setSheet(null)} title={`Edit Budget · ${editCat}`}>
        <label style={S.lbl}>Monthly Limit (UGX)</label>
        <input style={S.inp} type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} autoFocus/>
        <button style={btn("#1A5276")} onClick={saveBudget}>Save</button>
      </Sheet>
    </>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({ data }) {
  const allMonths = useMemo(() => {
    const keys = new Set();
    [...data.income,...data.expenses,...data.kSales,...data.kExpenses].forEach(x=>{ if(x.date) keys.add(monthKey(x.date)); });
    return Array.from(keys).sort().reverse();
  }, [data]);

  const [month,    setMonth]    = useState(allMonths[0]||monthKey(today()));
  const [view,     setView]     = useState("overview");
  const [expanded, setExpanded] = useState(null); // currently drilled-down category

  const f=(arr)=>arr.filter(x=>monthKey(x.date)===month);
  const mInc=f(data.income), mExp=f(data.expenses), mKS=f(data.kSales), mKE=f(data.kExpenses);
  const totalIn=mInc.reduce((s,x)=>s+ +x.amount,0);
  const totalOut=mExp.reduce((s,x)=>s+ +x.amount,0);
  const kitoSales=mKS.reduce((s,x)=>s+ +x.price* +x.qty,0);
  const kitoExp=mKE.reduce((s,x)=>s+ +x.amount,0);
  const budgets = data.budgets || {};

  const allExpCats = [...EXP_CATS,...(data.customCats||[])];
  const expByCat=allExpCats.map(cat=>({cat,total:mExp.filter(x=>x.category===cat).reduce((s,x)=>s+ +x.amount,0),budget:budgets[cat]||0})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const incBySrc=INC_SOURCES.map(src=>({src,total:mInc.filter(x=>x.source===src).reduce((s,x)=>s+ +x.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const kitoByCat=KITO_CATS.map(cat=>({cat,total:mKE.filter(x=>x.category===cat).reduce((s,x)=>s+ +x.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const maxExp=expByCat[0]?.total||1, maxInc=incBySrc[0]?.total||1, maxKit=kitoByCat[0]?.total||1;
  const COLORS=["#7B52A8","#0E7C7B","#1B7A4E","#7B52A8","#F57F17","#C0392B","#7B52A8","#283593","#E91E8C","#00897B","#FF8C00"];

  const toggle = (key) => setExpanded(e => e===key ? null : key);

  // Drill-down list component
  const DrillDown = ({ items, color, emptyText }) => (
    <div style={{ background:"#FAF7FF", borderRadius:10, margin:"8px 0 4px", overflow:"hidden",
      border:"1px solid #F0F0F0" }}>
      {items.length===0
        ? <div style={{ padding:"10px 14px", color:"#BBB", fontSize:12 }}>{emptyText}</div>
        : items.map((tx,i) => (
          <div key={tx.id||i} style={{ display:"flex", alignItems:"center", gap:8,
            padding:"9px 14px", borderBottom: i<items.length-1?"1px solid #F0F0F0":"none",
            background: i%2===0?"#FAF7FF":"#FFF" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:"#2C1654", fontWeight:500,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {tx.note || tx.source || tx.category || "—"}
              </div>
              <div style={{ fontSize:11, color:"#999", marginTop:1 }}>
                {tx.date}{tx.acctName ? " · " + tx.acctName : ""}
              </div>
            </div>
            <div style={{ fontWeight:800, color, fontSize:13, whiteSpace:"nowrap" }}>
              {fmt(tx.amount)}
            </div>
          </div>
        ))
      }
    </div>
  );

  return (
    <>
      <div style={{ padding:"14px 16px 0" }}>
        <label style={S.lbl}>Select Month</label>
        <select style={S.sel} value={month} onChange={e=>{setMonth(e.target.value);setExpanded(null);}}>
          {allMonths.length===0?<option value={monthKey(today())}>{monthLabel(monthKey(today()))}</option>:allMonths.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>
      <SubTabs tabs={["overview","expenses","income","kito"]} active={view} onChange={v=>{setView(v);setExpanded(null);}} color="#0E7C7B"/>
      <div style={S.pad}>
        {view==="overview"&&<>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}><StatBox label="Income" value={totalIn} bg="#E8F5EF" color="#1B7A4E"/><StatBox label="Spent" value={totalOut} bg="#FDECEA" color="#C0392B"/></div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}><StatBox label="Net Personal" value={totalIn-totalOut} bg={totalIn-totalOut>=0?"#E8F5EF":"#FDECEA"} color={totalIn-totalOut>=0?"#1B7A4E":"#C0392B"}/><StatBox label="Kito Profit" value={kitoSales-kitoExp} bg={kitoSales-kitoExp>=0?"#FFF8E1":"#FDECEA"} color={kitoSales-kitoExp>=0?"#F57F17":"#C0392B"}/></div>
          {allMonths.length===0&&<Empty text="Add transactions to see monthly reports"/>}
        </>}

        {view==="expenses"&&<>
          <div style={{ background:"#FDECEA", borderRadius:16, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#C0392B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Total Spent</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#C0392B" }}>{fmt(totalOut)}</div>
          </div>
          <div style={{ fontSize:11, color:"#999", marginBottom:10, textAlign:"center" }}>Tap any category to see the transactions inside</div>
          {expByCat.length===0?<Empty text="No expenses this month"/>:expByCat.map((x,i)=>{
            const over = x.budget > 0 && x.total > x.budget;
            const barW = x.budget > 0 ? Math.min(100,(x.total/x.budget)*100) : (x.total/maxExp*100);
            const barC = x.budget===0 ? COLORS[i%COLORS.length] : over ? "#C0392B" : x.total/x.budget > 0.8 ? "#F57F17" : "#1B7A4E";
            const isOpen = expanded === x.cat;
            const txItems = mExp.filter(tx=>tx.category===x.cat).sort((a,b)=>b.date.localeCompare(a.date));
            return (
              <div key={x.cat} style={{ marginBottom:10, background: over?"#FFF5F5":isOpen?"#F8F8F8":"transparent",
                borderRadius:14, padding:"12px", border: isOpen?`1.5px solid ${COLORS[i%COLORS.length]}33`:"1.5px solid transparent",
                cursor:"pointer" }} onClick={()=>toggle(x.cat)}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#2C1654" }}>{x.cat}</span>
                    <span style={{ fontSize:10, color:COLORS[i%COLORS.length], background:COLORS[i%COLORS.length]+"18",
                      borderRadius:20, padding:"1px 6px", fontWeight:600 }}>{txItems.length}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {over && <span style={{ background:"#FDECEA", color:"#C0392B", borderRadius:20, padding:"1px 6px", fontSize:10, fontWeight:700 }}>OVER!</span>}
                    <span style={{ fontSize:13, fontWeight:800, color: over?"#C0392B":"#2C1654" }}>{fmt(x.total)}</span>
                    <span style={{ fontSize:12, color:"#999" }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                <div style={{ background:"#EDE0FF", borderRadius:6, height:8 }}>
                  <div style={{ width:barW+"%", height:8, borderRadius:6, background:barC }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:11, color:"#999" }}>{Math.round(x.total/totalOut*100)}% of spending</span>
                  {x.budget > 0 && <span style={{ fontSize:11, color: over?"#C0392B":"#1B7A4E", fontWeight:600 }}>Budget: {fmt(x.budget)}</span>}
                </div>
                {isOpen && <DrillDown items={txItems} color="#C0392B" emptyText="No transactions"/>}
              </div>
            );
          })}
        </>}

        {view==="income"&&<>
          <div style={{ background:"#E8F5EF", borderRadius:16, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#1B7A4E", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Total Income</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#1B7A4E" }}>{fmt(totalIn)}</div>
          </div>
          <div style={{ fontSize:11, color:"#999", marginBottom:10, textAlign:"center" }}>Tap any source to see the transactions inside</div>
          {incBySrc.length===0?<Empty text="No income this month"/>:incBySrc.map((x,i)=>{
            const isOpen = expanded === x.src;
            const txItems = mInc.filter(tx=>tx.source===x.src).sort((a,b)=>b.date.localeCompare(a.date));
            return (
              <div key={x.src} style={{ marginBottom:10, background:isOpen?"#F8FFF8":"transparent",
                borderRadius:14, padding:"12px", border: isOpen?`1.5px solid ${COLORS[i%COLORS.length]}33`:"1.5px solid transparent",
                cursor:"pointer" }} onClick={()=>toggle(x.src)}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#2C1654" }}>{x.src}</span>
                    <span style={{ fontSize:10, color:COLORS[i%COLORS.length], background:COLORS[i%COLORS.length]+"18",
                      borderRadius:20, padding:"1px 6px", fontWeight:600 }}>{txItems.length}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#1B7A4E" }}>{fmt(x.total)}</span>
                    <span style={{ fontSize:12, color:"#999" }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                <div style={{ background:"#EDE0FF", borderRadius:6, height:8 }}>
                  <div style={{ width:(x.total/maxInc*100)+"%", height:8, borderRadius:6, background:COLORS[i%COLORS.length] }}/>
                </div>
                <div style={{ fontSize:11, color:"#999", marginTop:4 }}>{Math.round(x.total/totalIn*100)}% of income</div>
                {isOpen && <DrillDown items={txItems} color="#1B7A4E" emptyText="No transactions"/>}
              </div>
            );
          })}
        </>}

        {view==="kito"&&<>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <StatBox label="Kito Sales" value={kitoSales} bg="#E8F5EF" color="#1B7A4E"/>
            <StatBox label="Kito Costs" value={kitoExp} bg="#FDECEA" color="#C0392B"/>
          </div>
          <div style={{ fontSize:11, color:"#999", marginBottom:10, textAlign:"center" }}>Tap any category to see transactions</div>
          {kitoByCat.length===0?<Empty text="No Kito expenses this month"/>:kitoByCat.map((x,i)=>{
            const isOpen = expanded === "kito_"+x.cat;
            const txItems = mKE.filter(tx=>tx.category===x.cat).sort((a,b)=>b.date.localeCompare(a.date));
            return (
              <div key={x.cat} style={{ marginBottom:10, background:isOpen?"#FFFAF0":"transparent",
                borderRadius:14, padding:"12px", border: isOpen?`1.5px solid ${COLORS[i%COLORS.length]}33`:"1.5px solid transparent",
                cursor:"pointer" }} onClick={()=>toggle("kito_"+x.cat)}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#2C1654" }}>{x.cat}</span>
                    <span style={{ fontSize:10, color:COLORS[i%COLORS.length], background:COLORS[i%COLORS.length]+"18",
                      borderRadius:20, padding:"1px 6px", fontWeight:600 }}>{txItems.length}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#F57F17" }}>{fmt(x.total)}</span>
                    <span style={{ fontSize:12, color:"#999" }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                <div style={{ background:"#EDE0FF", borderRadius:6, height:8 }}>
                  <div style={{ width:(x.total/maxKit*100)+"%", height:8, borderRadius:6, background:COLORS[i%COLORS.length] }}/>
                </div>
                {isOpen && <DrillDown items={txItems.map(t=>({...t,amount:t.amount,note:t.note||t.category}))} color="#F57F17" emptyText="No transactions"/>}
              </div>
            );
          })}
        </>}
      </div>
    </>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
// ── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ data, setData }) {
  const [section, setSection] = useState("expCats");
  const [newItem, setNewItem] = useState("");
  const [editItem, setEditItem] = useState(null); // { index, value, type }
  const [editVal,  setEditVal]  = useState("");

  const customExp = data.customCats || [];
  const customInc = data.customInc  || [];

  const allExpCats = [...EXP_CATS,  ...customExp];
  const allIncSrcs = [...INC_SOURCES, ...customInc];

  const addCat = () => {
    if (!newItem.trim()) return;
    if (section === "expCats") {
      if (allExpCats.includes(newItem.trim())) return;
      setData({...data, customCats:[...customExp, newItem.trim()]});
    } else {
      if (allIncSrcs.includes(newItem.trim())) return;
      setData({...data, customInc:[...customInc, newItem.trim()]});
    }
    setNewItem("");
  };

  const delCat = (name) => {
    if (section === "expCats") {
      setData({...data, customCats: customExp.filter(c=>c!==name)});
    } else {
      setData({...data, customInc: customInc.filter(c=>c!==name)});
    }
  };

  const openEdit = (name, type) => { setEditItem({name, type}); setEditVal(name); };
  const saveEdit = () => {
    if (!editVal.trim() || !editItem) return;
    if (editItem.type === "expCats") {
      setData({...data, customCats: customExp.map(c=>c===editItem.name?editVal.trim():c),
        expenses: data.expenses.map(x=>x.category===editItem.name?{...x,category:editVal.trim()}:x)});
    } else {
      setData({...data, customInc: customInc.map(c=>c===editItem.name?editVal.trim():c),
        income: data.income.map(x=>x.source===editItem.name?{...x,source:editVal.trim()}:x)});
    }
    setEditItem(null);
  };

  const cats  = section==="expCats" ? allExpCats  : allIncSrcs;
  const builtIn = section==="expCats" ? EXP_CATS : INC_SOURCES;
  const color = section==="expCats" ? "#C0392B" : "#1B7A4E";
  const bg    = section==="expCats" ? "#FDECEA" : "#E8F5EF";

  return (
    <>
      <SubTabs tabs={["expCats","incSrcs"]} active={section} onChange={setSection} color="#7B52A8"/>
      <div style={S.pad}>
        <div style={{ fontSize:12, color:"#999", marginBottom:14, background:"#F5F0FF", borderRadius:10, padding:"10px 14px" }}>
          {section==="expCats"
            ? "🏷️ Manage your expense categories. Built-in ones can't be deleted but you can add your own."
            : "💰 Manage your income sources. Built-in ones can't be deleted but you can add your own."}
        </div>

        {/* Add new */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input style={{...S.inp, marginBottom:0, flex:1}}
            type="text" value={newItem}
            onChange={e=>setNewItem(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCat()}
            placeholder={section==="expCats"?"New category name...":"New income source..."}/>
          <button onClick={addCat} style={{ background:"#7B52A8", color:"#fff", border:"none",
            borderRadius:12, padding:"0 18px", fontWeight:700, fontSize:14, cursor:"pointer",
            flexShrink:0 }}>Add</button>
        </div>

        {/* List */}
        {cats.map((cat, i) => {
          const isBuiltIn = builtIn.includes(cat);
          const isEditing = editItem?.name===cat && editItem?.type===section;
          return (
            <div key={cat} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"11px 12px", marginBottom:6, borderRadius:12,
              background: isBuiltIn?"#F5F0FF":"#fff",
              border:`1.5px solid ${isBuiltIn?"#D5C5F0":"#EDE0FF"}` }}>
              {isEditing ? (
                <>
                  <input style={{...S.inp, marginBottom:0, flex:1, fontSize:13}}
                    type="text" value={editVal} onChange={e=>setEditVal(e.target.value)}
                    autoFocus onKeyDown={e=>e.key==="Enter"&&saveEdit()}/>
                  <button onClick={saveEdit} style={{ background:"#7B52A8", color:"#fff", border:"none",
                    borderRadius:8, padding:"6px 12px", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓</button>
                  <button onClick={()=>setEditItem(null)} style={{ background:"none", border:"none",
                    color:"#999", cursor:"pointer", fontSize:18 }}>×</button>
                </>
              ) : (
                <>
                  <div style={{ flex:1, fontSize:14, fontWeight:isBuiltIn?500:600,
                    color: isBuiltIn?"#7B52A8":"#2C1654" }}>{cat}</div>
                  {isBuiltIn
                    ? <span style={{ fontSize:10, color:"#B39DDB", fontWeight:600,
                        background:"#EDE0FF", borderRadius:20, padding:"2px 8px" }}>built-in</span>
                    : <>
                        <button onClick={()=>openEdit(cat, section)} style={{ background:"#EAF2F8",
                          border:"none", color:"#1A5276", borderRadius:8, padding:"5px 10px",
                          fontSize:12, fontWeight:700, cursor:"pointer" }}>✏️</button>
                        <button onClick={()=>delCat(cat)} style={{ background:"#FDECEA", border:"none",
                          color:"#C0392B", borderRadius:8, padding:"5px 10px",
                          fontSize:12, fontWeight:700, cursor:"pointer" }}>×</button>
                      </>
                  }
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const DEFAULT_TABS = [
  { id:"home",      emoji:"🏠", label:"Home"     },
  { id:"accounts",  emoji:"💳", label:"Accounts" },
  { id:"personal",  emoji:"👤", label:"Personal" },
  { id:"kito",      emoji:"💎", label:"Kito"     },
  { id:"debts",     emoji:"📋", label:"Debts"    },
  { id:"challenge", emoji:"🎯", label:"Goals"    },
  { id:"budget",    emoji:"💰", label:"Budget"   },
  { id:"reports",   emoji:"📊", label:"Reports"  },
  { id:"settings",  emoji:"⚙️", label:"Settings" },
];

const TAB_ORDER_KEY = "finaura_tab_order";
function loadTabOrder() {
  try { const o = localStorage.getItem(TAB_ORDER_KEY); return o ? JSON.parse(o) : DEFAULT_TABS.map(t=>t.id); } catch { return DEFAULT_TABS.map(t=>t.id); }
}

export default function App() {
  const [data,      setDataRaw]   = useState(load);
  const setData = (d) => { const v = typeof d==="function"?d(data):d; setDataRaw(v); save(v); };
  const [tab,       setTab]       = useState("home");
  const [tabOrder,  setTabOrder]  = useState(loadTabOrder);
  const [dragId,    setDragId]    = useState(null);
  const [syncing,   setSyncing]   = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQ,   setSearchQ]   = useState("");
  const dateStr = new Date().toLocaleDateString("en-UG",{ weekday:"long", day:"numeric", month:"long" });

  // Load from Supabase on first open
  useEffect(() => {
    loadFromSupabase().then(remote => {
      if (remote) {
        const merged = {
          accounts:   remote.accounts    || DEFAULT_ACCOUNTS,
          income:     remote.income      || [],
          expenses:   remote.expenses    || [],
          savings:    remote.savings     || [],
          kSales:     remote.kSales      || [],
          kExpenses:  remote.kExpenses   || [],
          kSalary:    remote.kSalary     || [],
          kInventory: remote.kInventory  || [],
          debts:      remote.debts       || { iOwe:[], owedMe:[], business:[] },
          challenges: remote.challenges  || [],
          transfers:  remote.transfers   || [],
          budgets:    remote.budgets     || {},
          recurring:  remote.recurring   || [],
          customCats: remote.customCats  || [],
          customInc:  remote.customInc   || [],
        };
        setData(merged);
        localStorage.setItem(KEY, JSON.stringify(merged));
      }
      setSyncing(false);
    });
  }, []);

  // Search across all data
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    data.income.filter(x =>
      [x.source, x.note, x.acctName, x.amount+"", x.date].some(v=>(v||"").toLowerCase().includes(q))
    ).forEach(x => results.push({ type:"Income", label:x.source, sub:`${x.date}${x.note?" · "+x.note:""}`, amount:x.amount, color:"#1B7A4E", tag:x.acctName }));
    data.expenses.filter(x =>
      [x.category, x.note, x.acctName, x.amount+"", x.date].some(v=>(v||"").toLowerCase().includes(q))
    ).forEach(x => results.push({ type:"Expense", label:x.category, sub:`${x.date}${x.note?" · "+x.note:""}`, amount:x.amount, color:"#C0392B", tag:x.acctName }));
    data.kSales.filter(x =>
      [x.item, x.note, x.acctName, (x.price*x.qty)+"", x.date, x.category].some(v=>(v||"").toLowerCase().includes(q))
    ).forEach(x => results.push({ type:"Kito Sale", label:x.item||"Sale", sub:`${x.date} · ${x.qty} unit(s)`, amount:+x.price* +x.qty, color:"#D4820A", tag:x.acctName }));
    data.kExpenses.filter(x =>
      [x.category, x.note, x.acctName, x.amount+"", x.date].some(v=>(v||"").toLowerCase().includes(q))
    ).forEach(x => results.push({ type:"Kito Expense", label:x.category, sub:`${x.date}${x.note?" · "+x.note:""}`, amount:x.amount, color:"#C0392B", tag:x.acctName }));
    [...data.debts.iOwe, ...data.debts.owedMe, ...data.debts.business].filter(x =>
      [x.name, x.note, x.amount+""].some(v=>(v||"").toLowerCase().includes(q))
    ).forEach(x => results.push({ type:"Debt", label:x.name, sub:x.note||"", amount:x.amount, color:"#6A1B9A", tag:x.paid?"Settled":"Unpaid" }));
    return results.slice(0, 50);
  }, [searchQ, data]);



  const tabs = tabOrder.map(id=>DEFAULT_TABS.find(t=>t.id===id)).filter(Boolean);

  const overCount = useMemo(() => {
    const budgets = data.budgets||{};
    const curMonth = monthKey(today());
    const mExp = data.expenses.filter(x=>monthKey(x.date)===curMonth);
    return EXP_CATS.filter(c => budgets[c] && mExp.filter(x=>x.category===c).reduce((s,x)=>s+ +x.amount,0) > budgets[c]).length;
  }, [data]);

  const onDragStart = (id) => setDragId(id);
  const onDragOver  = (e, id) => {
    e.preventDefault();
    if (!dragId || dragId===id) return;
    const arr = [...tabOrder];
    const from = arr.indexOf(dragId), to = arr.indexOf(id);
    arr.splice(from,1); arr.splice(to,0,dragId);
    setTabOrder(arr);
    localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(arr));
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:"#7B52A8" }}>Finaura</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:2 }}>{dateStr}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {overCount>0 && <div style={{ background:"#FDECEA", color:"#C0392B", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800 }}>⚠️ {overCount} over budget</div>}
            {syncing && <div style={{ background:"rgba(255,255,255,0.2)", color:"#FFD700", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:800 }}>⟳ sync</div>}
            <button onClick={()=>{setSearching(true);setSearchQ("");}} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, padding:"6px 10px", fontSize:18, cursor:"pointer" }}>🔍</button>

          </div>
        </div>
        <div style={{ display:"flex", gap:4, marginTop:10, overflowX:"auto", paddingBottom:2 }}>
          {tabs.map(t=>(
            <button key={t.id}
              draggable
              onDragStart={()=>onDragStart(t.id)}
              onDragOver={e=>onDragOver(e,t.id)}
              onDragEnd={()=>setDragId(null)}
              onClick={()=>setTab(t.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 10px", borderRadius:10, border:"none", background:tab===t.id?"rgba(255,255,255,0.25)":"transparent", color:tab===t.id?"#FFD700":"rgba(255,255,255,0.6)", fontWeight:tab===t.id?800:500, fontSize:11, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, position:"relative", opacity:dragId===t.id?0.5:1 }}>
              <span style={{ fontSize:16 }}>{t.emoji}</span>
              <span>{t.label}</span>
              {t.id==="budget" && overCount>0 && <div style={{ position:"absolute", top:4, right:6, width:8, height:8, borderRadius:"50%", background:"#C0392B" }}/>}
            </button>
          ))}
        </div>
        <div style={{ fontSize:10, color:"#CCC", textAlign:"center", paddingBottom:2 }}>hold & drag tabs to reorder</div>
      </div>

      {/* ── SEARCH OVERLAY ── */}
      {searching && (
        <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:100, display:"flex", flexDirection:"column" }}>
          {/* Search header */}
          <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid #EEE", display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"#F5F0FF", borderRadius:12, padding:"10px 14px" }}>
              <span style={{ fontSize:16 }}>🔍</span>
              <input
                autoFocus
                type="text"
                value={searchQ}
                onChange={e=>setSearchQ(e.target.value)}
                placeholder="Search transactions, categories, notes..."
                style={{ flex:1, border:"none", background:"transparent", outline:"none", fontSize:15, fontFamily:"system-ui,sans-serif", color:"#2C1654" }}
              />
              {searchQ && <button onClick={()=>setSearchQ("")} style={{ background:"none", border:"none", color:"#999", cursor:"pointer", fontSize:18 }}>×</button>}
            </div>
            <button onClick={()=>{setSearching(false);setSearchQ("");}} style={{ background:"none", border:"none", color:"#7B52A8", fontWeight:700, fontSize:14, cursor:"pointer", flexShrink:0 }}>Cancel</button>
          </div>

          {/* Results */}
          <div style={{ flex:1, overflowY:"auto", padding:"0 16px" }}>
            {!searchQ && (
              <div style={{ textAlign:"center", padding:"48px 20px", color:"#BBB" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
                <div style={{ fontSize:14, fontWeight:600, color:"#888" }}>Search everything</div>
                <div style={{ fontSize:12, marginTop:6 }}>Income, expenses, Kito sales, debts</div>
              </div>
            )}
            {searchQ && searchResults.length===0 && (
              <div style={{ textAlign:"center", padding:"48px 20px", color:"#BBB" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <div style={{ fontSize:14 }}>No results for "{searchQ}"</div>
              </div>
            )}
            {searchQ && searchResults.length>0 && <>
              <div style={{ padding:"12px 0 4px", fontSize:12, color:"#999", fontWeight:600 }}>
                {searchResults.length} result{searchResults.length!==1?"s":""}
              </div>
              {searchResults.map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:"1px solid #F5F5F5" }}>
                  <div style={{ background:r.color+"18", borderRadius:8, padding:"4px 8px", flexShrink:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:r.color, textTransform:"uppercase", letterSpacing:0.8 }}>{r.type}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:"#2C1654", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.label}</div>
                    <div style={{ color:"#999", fontSize:11, marginTop:1 }}>{r.sub}</div>
                  </div>
                  {r.tag && <span style={{ background:"#FFF3E0", color:"#E65100", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>{r.tag}</span>}
                  <div style={{ fontWeight:800, color:r.color, fontSize:14, whiteSpace:"nowrap", flexShrink:0 }}>{fmt(r.amount)}</div>
                </div>
              ))}
            </>}
          </div>
        </div>
      )}

      {tab==="home"      && <Home      data={data} setData={setData}/>}
      {tab==="accounts"  && <Accounts  data={data} setData={setData}/>}
      {tab==="personal"  && <Personal  data={data} setData={setData}/>}
      {tab==="kito"      && <Kito      data={data} setData={setData}/>}
      {tab==="debts"     && <Debts     data={data} setData={setData}/>}
      {tab==="challenge" && <Challenge data={data} setData={setData}/>}
      {tab==="budget"    && <Budget    data={data} setData={setData}/>}
      {tab==="reports"   && <Reports   data={data}/>}
      {tab==="settings"  && <Settings  data={data} setData={setData}/>}
    </div>
  );
}
