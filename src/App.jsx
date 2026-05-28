import { useState, useMemo } from "react";

const KEY = "finaura_v3";
const fmt = (n) => "UGX " + Math.abs(Number(n)||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",");
const uid = () => Math.random().toString(36).slice(2,8);
const today = () => new Date().toISOString().split("T")[0];
const monthKey = (date) => date ? date.slice(0,7) : "";
const monthLabel = (ym) => { const [y,m] = ym.split("-"); return new Date(y,m-1).toLocaleString("default",{month:"long",year:"numeric"}); };

const DEFAULT_ACCOUNTS = [
  { id:"mtn",       name:"MTN MoMo",       balance:0, color:"#FF8C00", emoji:"📱" },
  { id:"cash",      name:"Cash",           balance:0, color:"#2E7D32", emoji:"💵" },
  { id:"stanbic",   name:"Stanbic",        balance:0, color:"#1565C0", emoji:"🏦" },
  { id:"stanchart", name:"Stanchart",      balance:0, color:"#6A1B9A", emoji:"🏦" },
  { id:"momosav",   name:"MoMo Savings",   balance:0, color:"#E65100", emoji:"🐷" },
  { id:"iclub",     name:"Investors Club", balance:0, color:"#00695C", emoji:"🤝" },
  { id:"hmc",       name:"HMC (SACCO)",    balance:0, color:"#C62828", emoji:"🏛️" },
  { id:"nssf",      name:"NSSF",           balance:0, color:"#283593", emoji:"🛡️" },
];

const INC_SOURCES = ["Karveli Salary","Freelance","Investment Return","Kito Salary","Rental Income","Other"];
const EXP_CATS    = ["Food & Groceries","Eating Out","Transport","Rent / Housing","Shopping","Health","Entertainment","Utilities","Phone / Data","Hair","Nails","Beauty","Savings Contributions","Gifting","Giving / Tithe","Loan Given","Other"];
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
  return { accounts:DEFAULT_ACCOUNTS, income:[], expenses:[], savings:[], kSales:[], kExpenses:[], kSalary:[], kInventory:[], debts:{ iOwe:[], owedMe:[], business:[] }, challenges:[], transfers:[], budgets:{}, recurring:[], customCats:[] };
}
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

// ── shared styles ─────────────────────────────────────────────────────────────
const S = {
  page:    { background:"#F5F5F5", minHeight:"100vh", maxWidth:430, margin:"0 auto", fontFamily:"system-ui,sans-serif", paddingBottom:72 },
  header:  { background:"#fff", padding:"16px 16px 10px", borderBottom:"1px solid #E0E0E0", position:"sticky", top:0, zIndex:10 },
  nav:     { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#fff", borderTop:"1px solid #EEE", display:"flex" },
  overlay: { position:"fixed", inset:0, background:"#0006", zIndex:50, display:"flex", alignItems:"flex-end" },
  sheet:   { background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 20px 44px", width:"100%", boxSizing:"border-box", maxHeight:"90vh", overflowY:"auto" },
  lbl:     { fontSize:11, color:"#999", textTransform:"uppercase", letterSpacing:1.2, marginBottom:4, fontWeight:700, display:"block" },
  inp:     { width:"100%", border:"1.5px solid #E0E0E0", borderRadius:12, padding:"12px 14px", fontSize:15, boxSizing:"border-box", outline:"none", background:"#FAFAFA", marginBottom:14, fontFamily:"system-ui,sans-serif" },
  sel:     { width:"100%", border:"1.5px solid #E0E0E0", borderRadius:12, padding:"12px 14px", fontSize:14, boxSizing:"border-box", outline:"none", background:"#FAFAFA", marginBottom:14, fontFamily:"system-ui,sans-serif" },
  pad:     { padding:"0 16px" },
};

const btn  = (color="#E8552A") => ({ width:"100%", background:color, color:"#fff", border:`2px solid ${color}`, borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer", marginBottom:8, boxShadow:`0 3px 10px ${color}33` });
const navB = (active) => ({ flex:1, padding:"10px 4px 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, borderTop:active?"3px solid #E8552A":"3px solid transparent" });

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:2, background:"#EEE", margin:"0 auto 16px" }}/>
        <div style={{ fontSize:18, fontWeight:800, color:"#1A1A1A", marginBottom:16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function TxRow({ label, sub, right, rightColor="#333", tag, onDel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 0", borderBottom:"1px solid #F0F0F0" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, color:"#1A1A1A", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
        <div style={{ color:"#999", fontSize:11, marginTop:1 }}>{sub}</div>
      </div>
      {tag && <span style={{ background:"#FFF3E0", color:"#E65100", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>{tag}</span>}
      <div style={{ fontWeight:800, color:rightColor, fontSize:14, whiteSpace:"nowrap", flexShrink:0 }}>{right}</div>
      {onDel && <button onClick={onDel} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign:"center", padding:"28px 0", color:"#BBB" }}><div style={{ fontSize:30, marginBottom:8 }}>📭</div><div style={{ fontSize:13 }}>{text}</div></div>;
}

function SubTabs({ tabs, active, onChange, color="#E8552A" }) {
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
    save(nd); setData(nd);
    setQF({type:"expense",date:today(),category:allCats[0],source:INC_SOURCES[0],note:"",amount:"",accountId:"",isLoan:false});
    setSheet(null);
  };

  return (
    <>
      <div style={{ margin:16, borderRadius:20, padding:"24px 20px", background:"linear-gradient(135deg,#E8552A,#E8852A)", color:"#fff", boxShadow:"0 6px 20px #E8552A44" }}>
        <div style={{ fontSize:11, opacity:0.8, textTransform:"uppercase", letterSpacing:1 }}>Total Wealth</div>
        <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, margin:"4px 0 2px" }}>{fmt(total)}</div>
        <div style={{ fontSize:12, opacity:0.75 }}>{data.accounts.length} accounts</div>
      </div>
      <div style={{ display:"flex", gap:10, padding:"0 16px", marginBottom:12 }}>
        <StatBox label="Income" value={totalIn} bg="#E8F5E9" color="#2E7D32"/>
        <StatBox label="Spent" value={totalOut} bg="#FFEBEE" color="#C62828"/>
      </div>
      <div style={{ display:"flex", gap:10, padding:"0 16px", marginBottom:12 }}>
        <StatBox label="Net Cash" value={totalIn-totalOut} bg={totalIn-totalOut>=0?"#E8F5E9":"#FFEBEE"} color={totalIn-totalOut>=0?"#2E7D32":"#C62828"}/>
        <StatBox label="Kito Profit" value={kitoNet} bg={kitoNet>=0?"#FFF8E1":"#FFEBEE"} color={kitoNet>=0?"#F57F17":"#C62828"}/>
      </div>
      <div style={{ margin:"0 16px 12px", background:"#fff", borderRadius:16, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#333", marginBottom:12 }}>💳 Debt Snapshot</div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>😬</div><div style={{ fontWeight:800, color:"#C62828", fontSize:15 }}>{fmt(iOweTotal)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>I owe</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>🙌</div><div style={{ fontWeight:800, color:"#2E7D32", fontSize:15 }}>{fmt(owedMeTotal)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>Owed me</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:22 }}>🏪</div><div style={{ fontWeight:800, color:"#F57F17", fontSize:15 }}>{fmt(bizDebt)}</div><div style={{ color:"#999", fontSize:11, marginTop:2 }}>Biz debts</div></div>
        </div>
      </div>
      <div style={{ margin:"0 16px 80px", background:"#fff", borderRadius:16, padding:16 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#333", marginBottom:12 }}>Account Breakdown</div>
        {data.accounts.filter(a=> +a.balance>0).length===0
          ? <div style={{ color:"#AAA", fontSize:13, textAlign:"center", padding:"16px 0" }}>Set your balances in Accounts tab 👆</div>
          : data.accounts.filter(a=> +a.balance>0).map(a=>(
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #F5F5F5" }}>
                <span style={{ fontSize:18 }}>{a.emoji}</span>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#333" }}>{a.name}</span>
                <span style={{ fontWeight:800, color:a.color, fontSize:14 }}>{fmt(a.balance)}</span>
              </div>
            ))
        }
      </div>

      {/* Floating + button */}
      <button onClick={()=>setSheet("quick")} style={{
        position:"fixed", bottom:80, right:20, width:56, height:56, borderRadius:"50%",
        background:"linear-gradient(135deg,#E8552A,#E8852A)", color:"#fff", border:"none",
        fontSize:28, fontWeight:300, cursor:"pointer", zIndex:40,
        boxShadow:"0 4px 16px #E8552A66", display:"flex", alignItems:"center", justifyContent:"center"
      }}>+</button>

      {/* Quick log sheet */}
      <Sheet open={sheet==="quick"} onClose={()=>setSheet(null)} title="⚡ Quick Log">
        {/* Type toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {["expense","income"].map(t=>(
            <button key={t} onClick={()=>setQF(f=>({...f,type:t}))} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:qF.type===t?(t==="expense"?"#C62828":"#2E7D32"):"#F5F5F5", color:qF.type===t?"#fff":"#999", fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
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
        {/* Loan toggle */}
        <div onClick={()=>setQF(f=>({...f,isLoan:!f.isLoan}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:qF.isLoan?"#E8F5E9":"#F5F5F5", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${qF.isLoan?"#2E7D32":"#CCC"}`, background:qF.isLoan?"#2E7D32":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {qF.isLoan && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:qF.isLoan?"#2E7D32":"#555" }}>
              {qF.type==="expense"?"This is a loan I gave someone 💸":"This is money I borrowed 🤝"}
            </div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts tab</div>
          </div>
        </div>
        <button style={btn(qF.type==="expense"?"#C62828":"#2E7D32")} onClick={logQuick}>Log It ✓</button>
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
    save(nd);setData(nd);setSheet(null);
  };
  const addAcct = () => {
    if (!newName.trim()) return;
    const cols=["#E53935","#8E24AA","#00897B","#F4511E","#039BE5"];
    const nd={...data,accounts:[...data.accounts,{id:uid(),name:newName.trim(),balance:0,color:cols[data.accounts.length%cols.length],emoji:"💰"}]};
    save(nd);setData(nd);setNN("");setSheet(null);
  };
  const delAcct = (id) => { const nd={...data,accounts:data.accounts.filter(a=>a.id!==id)};save(nd);setData(nd); };

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
    save(nd);setData(nd);
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
    save(nd);setData(nd);
  };

  return (
    <>
      <SubTabs tabs={["accounts","transfers"]} active={sub} onChange={setSub} color="#1565C0"/>

      {sub==="accounts" && <>
        <div style={{ padding:"6px 16px", fontSize:13, color:"#999" }}>Tap a card to update balance</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"8px 16px 14px" }}>
          {data.accounts.map(a=>(
            <div key={a.id} onClick={()=>{setSel(a);setEB(String(a.balance));setSheet("edit");}} style={{ background:"#fff", borderRadius:16, padding:"14px 12px", borderLeft:`4px solid ${a.color}`, cursor:"pointer", boxShadow:"0 2px 8px #0001" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{a.emoji}</div>
              <div style={{ fontSize:12, fontWeight:700, color:a.color, marginBottom:2 }}>{a.name}</div>
              <div style={{ fontSize:16, fontWeight:900, color:"#1A1A1A" }}>{fmt(a.balance)}</div>
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
              <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#333" }}>{a.name}</span>
              <span style={{ fontWeight:800, color:a.color, fontSize:13 }}>{fmt(a.balance)}</span>
              <button onClick={()=>delAcct(a.id)} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>
          ))}
        </div>
      </>}

      {sub==="transfers" && <>
        <div style={S.pad}>
          <button style={btn("#1565C0")} onClick={()=>setSheet("transfer")}>↔ Transfer Between Accounts</button>
          {data.transfers.length===0
            ? <Empty text="No transfers yet"/>
            : data.transfers.map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 0", borderBottom:"1px solid #F0F0F0" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:"#1A1A1A", fontSize:14 }}>{t.fromName} → {t.toName}</div>
                    <div style={{ color:"#999", fontSize:11 }}>{t.date}{t.note?" · "+t.note:""}</div>
                  </div>
                  <div style={{ fontWeight:800, color:"#1565C0", fontSize:14 }}>{fmt(t.amount)}</div>
                  <button onClick={()=>delTransfer(t)} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))
          }
        </div>
      </>}

      <Sheet open={sheet==="edit"} onClose={()=>setSheet(null)} title={`${sel?.emoji} ${sel?.name}`}>
        <label style={S.lbl}>Balance (UGX)</label>
        <input style={S.inp} type="number" value={editBal} onChange={e=>setEB(e.target.value)} autoFocus/>
        <button style={btn(sel?.color||"#E8552A")} onClick={saveBal}>Save Balance</button>
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
        <button style={btn("#1565C0")} onClick={doTransfer}>Transfer Now</button>
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

  const addIncome = () => {
    if (!iF.amount||!iF.accountId) return;
    const acct=data.accounts.find(a=>a.id===iF.accountId);
    let nd={...data,income:[{id:uid(),...iF,acctName:acct?.name||""},...data.income],accounts:data.accounts.map(a=>a.id===iF.accountId?{...a,balance:+a.balance+ +iF.amount}:a)};
    if (iF.isBorrowed) nd.debts={...nd.debts,iOwe:[{id:uid(),name:iF.note||"Borrowed",amount:iF.amount,due:"",note:"From income log",paid:false},...nd.debts.iOwe]};
    save(nd);setData(nd);setIF({date:today(),source:INC_SOURCES[0],note:"",amount:"",accountId:"",isBorrowed:false});setSheet(null);
  };
  const addExpense = () => {
    if (!eF.amount||!eF.accountId) return;
    const acct=data.accounts.find(a=>a.id===eF.accountId);
    let nd={...data,expenses:[{id:uid(),...eF,acctName:acct?.name||""},...data.expenses],accounts:data.accounts.map(a=>a.id===eF.accountId?{...a,balance:+a.balance- +eF.amount}:a)};
    if (eF.isLoan) nd.debts={...nd.debts,owedMe:[{id:uid(),name:eF.note||"Loan",amount:eF.amount,due:"",note:"From expense log",paid:false},...nd.debts.owedMe]};
    save(nd);setData(nd);setEF({date:today(),category:EXP_CATS[0],note:"",amount:"",accountId:"",isLoan:false});setSheet(null);
  };
  const addSavings = () => {
    if (!sF.name) return;
    const nd={...data,savings:[{id:uid(),...sF},...data.savings]};
    save(nd);setData(nd);setSF({name:"",goal:"",current:""});setSheet(null);
  };
  const delIncome  = (id,amt,acId) => { const nd={...data,income:data.income.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance- +amt}:a)};save(nd);setData(nd); };
  const delExpense = (id,amt,acId) => { const nd={...data,expenses:data.expenses.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance+ +amt}:a)};save(nd);setData(nd); };
  const delSaving  = (id) => { const nd={...data,savings:data.savings.filter(s=>s.id!==id)};save(nd);setData(nd); };
  const updSaving  = (id,val) => { const nd={...data,savings:data.savings.map(s=>s.id===id?{...s,current:val}:s)};save(nd);setData(nd); };

  // recurring
  const [rF, setRF] = useState({ name:"", type:"income", source:INC_SOURCES[0], category:EXP_CATS[0], amount:"", accountId:"", frequency:"monthly", dayOfMonth:"1" });
  const recurring = data.recurring || [];
  const addRecurring = () => {
    if (!rF.name||!rF.amount||!rF.accountId) return;
    const nd={...data,recurring:[{id:uid(),...rF,lastLogged:""},...recurring]};
    save(nd);setData(nd);
    setRF({name:"",type:"income",source:INC_SOURCES[0],category:EXP_CATS[0],amount:"",accountId:"",frequency:"monthly",dayOfMonth:"1"});
    setSheet(null);
  };
  const delRecurring = (id) => { const nd={...data,recurring:recurring.filter(r=>r.id!==id)};save(nd);setData(nd); };
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
    save(nd);setData(nd);
  };

  const totalIn  = data.income.reduce((s,x)=>s+ +x.amount,0);
  const totalOut = data.expenses.reduce((s,x)=>s+ +x.amount,0);

  return (
    <>
      <SubTabs tabs={["income","expenses","savings","recurring"]} active={sub} onChange={setSub}/>
      <div style={S.pad}>
        {sub==="income" && <>
          <div style={{ background:"#E8F5E9", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#2E7D32", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Total Income</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#2E7D32" }}>{fmt(totalIn)}</div>
          </div>
          <button style={btn("#2E7D32")} onClick={()=>setSheet("income")}>+ Add Income</button>
          {data.income.length===0?<Empty text="No income recorded yet"/>:data.income.map(x=><TxRow key={x.id} label={x.source} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#2E7D32" tag={x.acctName} onDel={()=>delIncome(x.id,x.amount,x.accountId)}/>)}
        </>}
        {sub==="expenses" && <>
          <div style={{ background:"#FFEBEE", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#C62828", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Total Spent</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#C62828" }}>{fmt(totalOut)}</div>
          </div>
          <button style={btn("#C62828")} onClick={()=>setSheet("expense")}>+ Add Expense</button>
          {data.expenses.length===0?<Empty text="No expenses yet"/>:data.expenses.map(x=><TxRow key={x.id} label={x.category} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#C62828" tag={x.acctName} onDel={()=>delExpense(x.id,x.amount,x.accountId)}/>)}
        </>}
        {sub==="savings" && <>
          <button style={btn("#7B1FA2")} onClick={()=>setSheet("savings")}>+ New Goal</button>
          {data.savings.length===0?<Empty text="No savings goals yet"/>:data.savings.map(g=>{
            const pct=g.goal>0?Math.min(100,(g.current/g.goal)*100):0;
            return (
              <div key={g.id} style={{ background:"#F3E5F5", borderRadius:16, padding:"14px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:"#7B1FA2", fontSize:14 }}>{g.name}</span>
                  <button onClick={()=>delSaving(g.id)} style={{ background:"none", border:"none", color:"#999", cursor:"pointer", fontSize:18 }}>×</button>
                </div>
                <div style={{ background:"#fff", borderRadius:6, height:8, marginBottom:8 }}>
                  <div style={{ width:pct+"%", height:8, borderRadius:6, background:"linear-gradient(90deg,#7B1FA2,#E91E8C)" }}/>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#7B1FA2", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Saved</div>
                    <input type="number" value={g.current} onChange={e=>updSaving(g.id,e.target.value)} style={{ width:"100%", border:"1.5px solid #CE93D8", borderRadius:8, padding:"6px 10px", color:"#7B1FA2", fontSize:14, fontWeight:800, outline:"none", boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Goal</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#555", padding:"8px 0" }}>{fmt(g.goal)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Done</div>
                    <div style={{ fontSize:18, fontWeight:900, color:"#7B1FA2" }}>{Math.round(pct)}%</div>
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
        <div onClick={()=>setIF(f=>({...f,isBorrowed:!f.isBorrowed}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:iF.isBorrowed?"#FFEBEE":"#F5F5F5", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${iF.isBorrowed?"#C62828":"#CCC"}`, background:iF.isBorrowed?"#C62828":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {iF.isBorrowed && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:iF.isBorrowed?"#C62828":"#555" }}>This is money I borrowed 🤝</div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts → I Owe</div>
          </div>
        </div>
        <button style={btn("#2E7D32")} onClick={addIncome}>Save Income</button>
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
              save(nd);setData(nd);setEF(f=>({...f,category:nc}));e.target.value="";
            }
          }}/>
        <label style={S.lbl}>From Account *</label><select style={S.sel} value={eF.accountId} onChange={e=>setEF(f=>({...f,accountId:e.target.value}))}><option value="">Select account…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX) *</label><input style={S.inp} type="number" value={eF.amount} onChange={e=>setEF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={eF.note} onChange={e=>setEF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        {/* Loan given toggle */}
        <div onClick={()=>setEF(f=>({...f,isLoan:!f.isLoan}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:eF.isLoan?"#E8F5E9":"#F5F5F5", borderRadius:12, marginBottom:14, cursor:"pointer" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${eF.isLoan?"#2E7D32":"#CCC"}`, background:eF.isLoan?"#2E7D32":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {eF.isLoan && <span style={{ color:"#fff", fontSize:14 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:eF.isLoan?"#2E7D32":"#555" }}>This is a loan I gave someone 💸</div>
            <div style={{ fontSize:11, color:"#999" }}>Auto-adds to Debts → Owed to Me</div>
          </div>
        </div>
        <button style={btn("#C62828")} onClick={addExpense}>Save Expense</button>
      </Sheet>
      <Sheet open={sheet==="savings"} onClose={()=>setSheet(null)} title="New Savings Goal">
        <label style={S.lbl}>Goal Name *</label><input style={S.inp} type="text" value={sF.name} onChange={e=>setSF(f=>({...f,name:e.target.value}))} placeholder="e.g. Emergency Fund"/>
        <label style={S.lbl}>Target Amount (UGX)</label><input style={S.inp} type="number" value={sF.goal} onChange={e=>setSF(f=>({...f,goal:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Already Saved (UGX)</label><input style={S.inp} type="number" value={sF.current} onChange={e=>setSF(f=>({...f,current:e.target.value}))} placeholder="0"/>
        <button style={btn("#7B1FA2")} onClick={addSavings}>Create Goal</button>
      </Sheet>

      {/* ── RECURRING ── */}
      {sub==="recurring" && <>
        <div style={{ background:"#E3F2FD", borderRadius:14, padding:"12px 14px", marginBottom:12, fontSize:12, color:"#1565C0" }}>
          💡 Set up regular income or expenses once. Tap <b>Log Now</b> each month when it happens — it auto-records and updates your account balance.
        </div>
        <button style={btn("#1565C0")} onClick={()=>setSheet("recurring")}>+ Add Recurring Transaction</button>
        {recurring.length===0
          ? <div style={{textAlign:"center",padding:"28px 0",color:"#BBB"}}><div style={{fontSize:30,marginBottom:8}}>🔁</div><div style={{fontSize:13}}>No recurring transactions yet</div></div>
          : recurring.map(r=>(
              <div key={r.id} style={{background:r.type==="income"?"#E8F5E9":"#FFEBEE",borderRadius:14,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:700,color:"#1A1A1A",fontSize:14}}>{r.name}</div>
                    <div style={{color:"#999",fontSize:11}}>{r.frequency} · {r.type==="income"?r.source:r.category} · Day {r.dayOfMonth}</div>
                    {r.lastLogged && <div style={{color:"#999",fontSize:11}}>Last logged: {r.lastLogged}</div>}
                  </div>
                  <button onClick={()=>delRecurring(r.id)} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:18}}>×</button>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800,color:r.type==="income"?"#2E7D32":"#C62828",fontSize:16}}>{fmt(r.amount)}</div>
                  <button onClick={()=>logRecurring(r)} style={{background:r.type==="income"?"#2E7D32":"#C62828",color:"#fff",border:"none",borderRadius:10,padding:"7px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Log Now ✓</button>
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
            <button key={t} onClick={()=>setRF(f=>({...f,type:t}))} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:rF.type===t?(t==="income"?"#2E7D32":"#C62828"):"#F5F5F5",color:rF.type===t?"#fff":"#999",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
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
        <button style={btn("#1565C0")} onClick={addRecurring}>Save Recurring</button>
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
    save(nd);setData(nd);setSF({date:today(),item:"",qty:"1",price:"",note:"",accountId:""});setSheet(null);
  };
  const addExp = () => {
    if (!eF.amount||!eF.accountId) return;
    const acct=data.accounts.find(a=>a.id===eF.accountId);
    const nd={...data,kExpenses:[{id:uid(),...eF,acctName:acct?.name||""},...data.kExpenses],accounts:data.accounts.map(a=>a.id===eF.accountId?{...a,balance:+a.balance- +eF.amount}:a)};
    save(nd);setData(nd);setEF({date:today(),category:KITO_CATS[0],note:"",amount:"",accountId:""});setSheet(null);
  };
  const paySalary = () => {
    if (!salF.amount||!salF.accountId) return;
    const acct=data.accounts.find(a=>a.id===salF.accountId);
    const nd={...data,
      kSalary:[{id:uid(),...salF,acctName:acct?.name||""},...data.kSalary],
      income:[{id:uid(),date:salF.date,source:"Kito Salary",note:salF.note,amount:salF.amount,accountId:salF.accountId,acctName:acct?.name||""},...data.income],
      accounts:data.accounts.map(a=>a.id===salF.accountId?{...a,balance:+a.balance+ +salF.amount}:a)
    };
    save(nd);setData(nd);setSalF({date:today(),amount:"",note:"Salary",accountId:""});setSheet(null);
  };
  const addInv = () => {
    if (!invF.name) return;
    const nd={...data,kInventory:[{id:uid(),...invF},...data.kInventory]};
    save(nd);setData(nd);setInvF({name:"",qty:"",unit:"pcs",costPerUnit:"",reorderAt:""});setSheet(null);
  };
  const delSale=(id,price,qty,acId)=>{ const nd={...data,kSales:data.kSales.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance- +price* +qty}:a)};save(nd);setData(nd); };
  const delExp=(id,amt,acId)=>{ const nd={...data,kExpenses:data.kExpenses.filter(x=>x.id!==id),accounts:data.accounts.map(a=>a.id===acId?{...a,balance:+a.balance+ +amt}:a)};save(nd);setData(nd); };
  const delSal=(id)=>{ const nd={...data,kSalary:data.kSalary.filter(x=>x.id!==id)};save(nd);setData(nd); };
  const delInv=(id)=>{ const nd={...data,kInventory:data.kInventory.filter(x=>x.id!==id)};save(nd);setData(nd); };
  const updInv=(id,field,val)=>{ const nd={...data,kInventory:data.kInventory.map(i=>i.id===id?{...i,[field]:val}:i)};save(nd);setData(nd); };

  return (
    <>
      <div style={{ display:"flex", gap:8, padding:"14px 16px 8px" }}>
        <StatBox label="Sales" value={totalSales} bg="#E8F5E9" color="#2E7D32"/>
        <StatBox label="Costs" value={totalExp} bg="#FFEBEE" color="#C62828"/>
        <StatBox label="Profit" value={profit} bg={profit>=0?"#FFF8E1":"#FFEBEE"} color={profit>=0?"#F57F17":"#C62828"}/>
      </div>
      <div style={{ margin:"10px 16px", background:"#FFF8E1", borderRadius:16, padding:"14px 16px", border:"1.5px solid #FFE082" }}>
        <div style={{ fontWeight:800, color:"#F57F17", marginBottom:4 }}>💸 Pay Yourself</div>
        <div style={{ color:"#999", fontSize:12, marginBottom:10 }}>Move money from Kito to personal income cleanly. No more borrowing 😄</div>
        <button style={{ ...btn("#F57F17"), width:"auto", padding:"8px 18px", marginBottom:0 }} onClick={()=>setSheet("salary")}>Pay My Salary</button>
      </div>
      <SubTabs tabs={["sales","expenses","inventory","salary"]} active={sub} onChange={setSub} color="#F57F17"/>
      <div style={S.pad}>
        {sub==="sales"&&<><button style={btn("#2E7D32")} onClick={()=>setSheet("sale")}>+ Record Sale</button>{data.kSales.length===0?<Empty text="No sales yet"/>:data.kSales.map(x=><TxRow key={x.id} label={x.item||"Sale"} sub={`${x.date} · ${x.qty} unit(s)${x.note?" · "+x.note:""}`} right={fmt(+x.price* +x.qty)} rightColor="#2E7D32" tag={x.acctName} onDel={()=>delSale(x.id,x.price,x.qty,x.accountId)}/>)}</>}
        {sub==="expenses"&&<><button style={btn("#C62828")} onClick={()=>setSheet("exp")}>+ Add Expense</button>{data.kExpenses.length===0?<Empty text="No expenses yet"/>:data.kExpenses.map(x=><TxRow key={x.id} label={x.category} sub={`${x.date}${x.note?" · "+x.note:""}`} right={fmt(x.amount)} rightColor="#C62828" tag={x.acctName} onDel={()=>delExp(x.id,x.amount,x.accountId)}/>)}</>}
        {sub==="inventory"&&<><button style={btn()} onClick={()=>setSheet("inv")}>+ Add Item</button>{data.kInventory.length===0?<Empty text="No inventory yet"/>:data.kInventory.map(inv=>{const low= +inv.qty<= +inv.reorderAt&&inv.reorderAt;return(<div key={inv.id} style={{ background:low?"#FFEBEE":"#fff", borderRadius:14, padding:"12px 14px", marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><div><div style={{ fontWeight:700, color:"#1A1A1A" }}>{inv.name}</div><div style={{ color:"#999", fontSize:11 }}>{fmt(inv.costPerUnit)} per {inv.unit}</div></div><div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>{low&&<span style={{ background:"#FFEBEE", color:"#C62828", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Low Stock</span>}<button onClick={()=>delInv(inv.id)} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", fontSize:18 }}>×</button></div></div><div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:11, color:"#999", fontWeight:700, textTransform:"uppercase" }}>Qty:</span><input type="number" value={inv.qty} onChange={e=>updInv(inv.id,"qty",e.target.value)} style={{ width:60, border:"1.5px solid #E0E0E0", borderRadius:8, padding:"5px 8px", fontSize:14, outline:"none" }}/><span style={{ color:"#999", fontSize:12 }}>{inv.unit} · reorder ≤{inv.reorderAt}</span></div></div>);})}</>}
        {sub==="salary"&&<><div style={{ color:"#999", fontSize:12, marginBottom:12 }}>Each payment also goes into Personal income automatically.</div>{data.kSalary.length===0?<Empty text="No salary transfers yet"/>:data.kSalary.map(x=><TxRow key={x.id} label="Salary Transfer" sub={`${x.date} · ${x.note}`} right={fmt(x.amount)} rightColor="#F57F17" tag={x.acctName} onDel={()=>delSal(x.id)}/>)}</>}
      </div>

      <Sheet open={sheet==="sale"} onClose={()=>setSheet(null)} title="Record Sale">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={sF.date} onChange={e=>setSF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Item</label><input style={S.inp} type="text" value={sF.item} onChange={e=>setSF(f=>({...f,item:e.target.value}))} placeholder="e.g. Gold bangle"/>
        <label style={S.lbl}>Qty</label><input style={S.inp} type="number" value={sF.qty} onChange={e=>setSF(f=>({...f,qty:e.target.value}))}/>
        <label style={S.lbl}>Price per unit (UGX)</label><input style={S.inp} type="number" value={sF.price} onChange={e=>setSF(f=>({...f,price:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Into Account *</label><select style={S.sel} value={sF.accountId} onChange={e=>setSF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={sF.note} onChange={e=>setSF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <button style={btn("#2E7D32")} onClick={addSale}>Save Sale</button>
      </Sheet>
      <Sheet open={sheet==="exp"} onClose={()=>setSheet(null)} title="Kito Expense">
        <label style={S.lbl}>Date</label><input style={S.inp} type="date" value={eF.date} onChange={e=>setEF(f=>({...f,date:e.target.value}))}/>
        <label style={S.lbl}>Category</label><select style={S.sel} value={eF.category} onChange={e=>setEF(f=>({...f,category:e.target.value}))}>{KITO_CATS.map(c=><option key={c}>{c}</option>)}</select>
        <label style={S.lbl}>From Account *</label><select style={S.sel} value={eF.accountId} onChange={e=>setEF(f=>({...f,accountId:e.target.value}))}><option value="">Select…</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}</select>
        <label style={S.lbl}>Amount (UGX)</label><input style={S.inp} type="number" value={eF.amount} onChange={e=>setEF(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Note</label><input style={S.inp} type="text" value={eF.note} onChange={e=>setEF(f=>({...f,note:e.target.value}))} placeholder="Optional"/>
        <button style={btn("#C62828")} onClick={addExp}>Save Expense</button>
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
  const [sub, setSub]     = useState("iOwe");
  const [sheet, setSheet] = useState(null);
  const [form, setForm]   = useState({ name:"", amount:"", due:"", note:"" });

  const SECS = {
    iOwe:     { label:"I Owe",        color:"#C62828", bg:"#FFEBEE", emoji:"😬" },
    owedMe:   { label:"Owed to Me",   color:"#2E7D32", bg:"#E8F5E9", emoji:"🙌" },
    business: { label:"Business Debt",color:"#F57F17", bg:"#FFF8E1", emoji:"🏪" },
  };
  const sec   = SECS[sub];
  const items  = data.debts[sub]||[];
  const unpaid = items.filter(x=>!x.paid);
  const paid   = items.filter(x=>x.paid);
  const total  = unpaid.reduce((s,x)=>s+ +x.amount,0);

  const addDebt = () => {
    if (!form.name||!form.amount) return;
    const nd={...data,debts:{...data.debts,[sub]:[{id:uid(),...form,paid:false},...data.debts[sub]]}};
    save(nd);setData(nd);setForm({name:"",amount:"",due:"",note:""});setSheet(null);
  };
  const toggle=(id)=>{ const nd={...data,debts:{...data.debts,[sub]:data.debts[sub].map(x=>x.id===id?{...x,paid:!x.paid}:x)}};save(nd);setData(nd); };
  const del=(id)=>{ const nd={...data,debts:{...data.debts,[sub]:data.debts[sub].filter(x=>x.id!==id)}};save(nd);setData(nd); };

  return (
    <>
      <div style={{ display:"flex", gap:8, padding:"14px 16px 8px" }}>
        {Object.entries(SECS).map(([k,s])=>(
          <button key={k} onClick={()=>setSub(k)} style={{ flex:1, padding:"9px 4px", borderRadius:12, border:"none", background:sub===k?s.color:"#fff", color:sub===k?"#fff":"#999", fontWeight:700, fontSize:11, cursor:"pointer", boxShadow:sub===k?`0 2px 8px ${s.color}44`:"none" }}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <div style={S.pad}>
        <div style={{ background:sec.bg, borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:11, color:sec.color, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Outstanding · {sec.label}</div>
          <div style={{ fontSize:26, fontWeight:900, color:sec.color }}>{fmt(total)}</div>
        </div>
        <button style={btn(sec.color)} onClick={()=>setSheet("add")}>+ Add Entry</button>
        {unpaid.length===0?<Empty text="All clear! 🎉"/>:unpaid.map(x=>(
          <div key={x.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:"1px solid #F0F0F0" }}>
            <button onClick={()=>toggle(x.id)} style={{ width:26, height:26, borderRadius:"50%", border:`2.5px solid ${sec.color}`, background:"none", cursor:"pointer", flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, color:"#1A1A1A", fontSize:14 }}>{x.name}</div>
              {x.note&&<div style={{ color:"#999", fontSize:11 }}>{x.note}</div>}
              {x.due&&<div style={{ color:"#F57F17", fontSize:11, fontWeight:600 }}>Due {x.due}</div>}
            </div>
            <div style={{ fontWeight:800, color:sec.color, fontSize:14 }}>{fmt(x.amount)}</div>
            <button onClick={()=>del(x.id)} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:26, height:26, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        ))}
        {paid.length>0&&<div style={{ marginTop:20 }}>
          <div style={{ fontSize:11, color:"#999", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>Settled ✓</div>
          {paid.map(x=>(
            <div key={x.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #F5F5F5", opacity:0.5 }}>
              <button onClick={()=>toggle(x.id)} style={{ width:26, height:26, borderRadius:"50%", border:"none", background:"#2E7D32", cursor:"pointer", color:"#fff", fontSize:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✓</button>
              <div style={{ flex:1, color:"#999", fontSize:13, textDecoration:"line-through" }}>{x.name}</div>
              <div style={{ color:"#999", fontSize:13 }}>{fmt(x.amount)}</div>
              <button onClick={()=>del(x.id)} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", fontSize:18 }}>×</button>
            </div>
          ))}
        </div>}
      </div>
      <Sheet open={sheet==="add"} onClose={()=>setSheet(null)} title={`Add · ${sec.label}`}>
        <label style={S.lbl}>{sub==="business"?"Supplier / Lender":"Name"} *</label>
        <input style={S.inp} type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Who?" autoFocus/>
        <label style={S.lbl}>Amount (UGX) *</label>
        <input style={S.inp} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/>
        <label style={S.lbl}>Due Date</label>
        <input style={S.inp} type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/>
        <label style={S.lbl}>Note</label>
        <input style={S.inp} type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="What for?"/>
        <button style={btn(sec.color)} onClick={addDebt}>Save</button>
      </Sheet>
    </>
  );
}

// ── SAVINGS CHALLENGE ─────────────────────────────────────────────────────────
function Challenge({ data, setData }) {
  const [sheet, setSheet]   = useState(null);
  const [cName, setCName]   = useState("");
  const [cTotal, setCTotal] = useState("");

  const challenges = data.challenges || [];

  const createChallenge = () => {
    if (!cName||!cTotal) return;
    const bubbles = buildBubbles(parseFloat(cTotal));
    const nd = { ...data, challenges:[{ id:uid(), name:cName, total:parseFloat(cTotal), bubbles, createdAt:today() }, ...challenges] };
    save(nd);setData(nd);setCName("");setCTotal("");setSheet(null);
  };

  const toggleBubble = (cid, bid) => {
    const nd = { ...data, challenges: data.challenges.map(c => c.id===cid
      ? { ...c, bubbles: c.bubbles.map(b => b.id===bid ? {...b, done:!b.done} : b) }
      : c
    )};
    save(nd);setData(nd);
  };

  const delChallenge = (id) => {
    const nd = { ...data, challenges: data.challenges.filter(c=>c.id!==id) };
    save(nd);setData(nd);
  };

  return (
    <>
      <div style={{ padding:"14px 16px 0" }}>
        <button style={btn("#00695C")} onClick={()=>setSheet("new")}>+ New Savings Challenge</button>
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
                <div style={{ fontWeight:800, color:"#1A1A1A", fontSize:16 }}>{c.name}</div>
                <div style={{ color:"#999", fontSize:12, marginTop:2 }}>Goal: {fmt(c.total)}</div>
              </div>
              <button onClick={()=>delChallenge(c.id)} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>

            {/* Progress */}
            <div style={{ background:"#F5F5F5", borderRadius:8, height:10, marginBottom:6 }}>
              <div style={{ width:pct+"%", height:10, borderRadius:8, background:"linear-gradient(90deg,#00695C,#4CAF50)", transition:"width 0.3s" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:12, color:"#00695C", fontWeight:700 }}>{fmt(saved)} saved</span>
              <span style={{ fontSize:12, color:"#999" }}>{done}/{total} bubbles · {pct}%</span>
            </div>

            {/* Bubble grid */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {c.bubbles.map(b => (
                <button key={b.id} onClick={()=>toggleBubble(c.id, b.id)}
                  style={{
                    width:30, height:30, borderRadius:"50%",
                    border:`2px solid ${b.done?"#00695C":"#DDD"}`,
                    background: b.done?"#00695C":"#fff",
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
              <div style={{ textAlign:"center", marginTop:14, padding:"10px", background:"#E8F5E9", borderRadius:12 }}>
                <div style={{ fontSize:24 }}>🎉</div>
                <div style={{ fontWeight:800, color:"#2E7D32", fontSize:14 }}>Challenge Complete!</div>
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
        <div style={{ background:"#E8F5E9", borderRadius:12, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#2E7D32" }}>
          💡 We'll create a bubble grid like the image — tap each bubble as you save that amount!
        </div>
        <button style={btn("#00695C")} onClick={createChallenge}>Create Challenge</button>
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
    save(nd); setData(nd); setSheet(null); setEditAmt("");
  };

  const delBudget = (cat) => {
    const nb = { ...budgets }; delete nb[cat];
    const nd = { ...data, budgets: nb }; save(nd); setData(nd);
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
        <div style={{ background:"#E3F2FD", borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:12, color:"#1565C0", fontWeight:700, marginBottom:2 }}>📅 {monthLabel(curMonth)}</div>
          <div style={{ fontSize:12, color:"#555" }}>
            Set monthly limits per category. You'll see red when you go over. 🚨
          </div>
          {overCount > 0 && (
            <div style={{ marginTop:8, background:"#FFEBEE", borderRadius:10, padding:"8px 10px", color:"#C62828", fontWeight:700, fontSize:13 }}>
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
            <button style={btn("#1565C0")} onClick={saveBudget}>Save Budget Limit</button>
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
              const barColor = pct < 70 ? "#2E7D32" : pct < 90 ? "#F57F17" : "#C62828";
              const remaining = limit - spent;

              return (
                <div key={cat} style={{ background: over?"#FFEBEE":"#fff", borderRadius:16, padding:"14px", marginBottom:12, border: over?"1.5px solid #FFCDD2":"1.5px solid #F0F0F0" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#1A1A1A", fontSize:14 }}>{cat}</div>
                      <div style={{ fontSize:11, color:"#999", marginTop:1 }}>Limit: {fmt(limit)}</div>
                    </div>
                    <div style={{ textAlign:"right", display:"flex", gap:8, alignItems:"center" }}>
                      {over && <span style={{ background:"#FFEBEE", color:"#C62828", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>OVER!</span>}
                      <button onClick={()=>openEdit(cat)} style={{ background:"#E3F2FD", border:"none", color:"#1565C0", borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Edit</button>
                      <button onClick={()=>delBudget(cat)} style={{ background:"#FFEBEE", border:"none", color:"#E53935", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    </div>
                  </div>

                  {/* Bar */}
                  <div style={{ background:"#F0F0F0", borderRadius:6, height:10, marginBottom:6 }}>
                    <div style={{ width:pct+"%", height:10, borderRadius:6, background:barColor, transition:"width 0.3s" }}/>
                  </div>

                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:over?"#C62828":"#333" }}>
                      {fmt(spent)} spent
                    </span>
                    <span style={{ fontSize:12, color: over?"#C62828":"#2E7D32", fontWeight:700 }}>
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
        <button style={btn("#1565C0")} onClick={saveBudget}>Save</button>
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

  const [month, setMonth] = useState(allMonths[0]||monthKey(today()));
  const [view,  setView]  = useState("overview");

  const f=(arr)=>arr.filter(x=>monthKey(x.date)===month);
  const mInc=f(data.income), mExp=f(data.expenses), mKS=f(data.kSales), mKE=f(data.kExpenses);
  const totalIn=mInc.reduce((s,x)=>s+ +x.amount,0);
  const totalOut=mExp.reduce((s,x)=>s+ +x.amount,0);
  const kitoSales=mKS.reduce((s,x)=>s+ +x.price* +x.qty,0);
  const kitoExp=mKE.reduce((s,x)=>s+ +x.amount,0);
  const budgets = data.budgets || {};

  const expByCat=EXP_CATS.map(cat=>({cat,total:mExp.filter(x=>x.category===cat).reduce((s,x)=>s+ +x.amount,0),budget:budgets[cat]||0})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const incBySrc=INC_SOURCES.map(src=>({src,total:mInc.filter(x=>x.source===src).reduce((s,x)=>s+ +x.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const kitoByCat=KITO_CATS.map(cat=>({cat,total:mKE.filter(x=>x.category===cat).reduce((s,x)=>s+ +x.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const maxExp=expByCat[0]?.total||1, maxInc=incBySrc[0]?.total||1, maxKit=kitoByCat[0]?.total||1;
  const COLORS=["#E8552A","#2A7BE8","#2E7D32","#7B1FA2","#F57F17","#C62828","#00695C","#283593","#E91E8C","#00897B","#FF8C00"];

  return (
    <>
      <div style={{ padding:"14px 16px 0" }}>
        <label style={S.lbl}>Select Month</label>
        <select style={S.sel} value={month} onChange={e=>setMonth(e.target.value)}>
          {allMonths.length===0?<option value={monthKey(today())}>{monthLabel(monthKey(today()))}</option>:allMonths.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>
      <SubTabs tabs={["overview","expenses","income","kito"]} active={view} onChange={setView} color="#2A7BE8"/>
      <div style={S.pad}>
        {view==="overview"&&<>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}><StatBox label="Income" value={totalIn} bg="#E8F5E9" color="#2E7D32"/><StatBox label="Spent" value={totalOut} bg="#FFEBEE" color="#C62828"/></div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}><StatBox label="Net Personal" value={totalIn-totalOut} bg={totalIn-totalOut>=0?"#E8F5E9":"#FFEBEE"} color={totalIn-totalOut>=0?"#2E7D32":"#C62828"}/><StatBox label="Kito Profit" value={kitoSales-kitoExp} bg={kitoSales-kitoExp>=0?"#FFF8E1":"#FFEBEE"} color={kitoSales-kitoExp>=0?"#F57F17":"#C62828"}/></div>
          {allMonths.length===0&&<Empty text="Add transactions to see monthly reports"/>}
        </>}
        {view==="expenses"&&<>
          <div style={{ background:"#FFEBEE", borderRadius:16, padding:"12px 14px", marginBottom:14 }}><div style={{ fontSize:11, color:"#C62828", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Total Spent</div><div style={{ fontSize:22, fontWeight:900, color:"#C62828" }}>{fmt(totalOut)}</div></div>
          {expByCat.length===0?<Empty text="No expenses this month"/>:expByCat.map((x,i)=>{
            const over = x.budget > 0 && x.total > x.budget;
            const barW = x.budget > 0 ? Math.min(100,(x.total/x.budget)*100) : (x.total/maxExp*100);
            const barC = x.budget===0 ? COLORS[i%COLORS.length] : over ? "#C62828" : x.total/x.budget > 0.8 ? "#F57F17" : "#2E7D32";
            return (
              <div key={x.cat} style={{ marginBottom:14, background: over?"#FFF5F5":"transparent", borderRadius:12, padding: over?"10px":"0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{x.cat}</span>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {over && <span style={{ background:"#FFEBEE", color:"#C62828", borderRadius:20, padding:"1px 6px", fontSize:10, fontWeight:700 }}>OVER!</span>}
                    <span style={{ fontSize:13, fontWeight:800, color: over?"#C62828":"#333" }}>{fmt(x.total)}</span>
                  </div>
                </div>
                <div style={{ background:"#F0F0F0", borderRadius:6, height:10 }}><div style={{ width:barW+"%", height:10, borderRadius:6, background:barC }}/></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
                  <span style={{ fontSize:11, color:"#999" }}>{Math.round(x.total/totalOut*100)}% of spending</span>
                  {x.budget > 0 && <span style={{ fontSize:11, color: over?"#C62828":"#2E7D32", fontWeight:600 }}>Budget: {fmt(x.budget)}</span>}
                </div>
              </div>
            );
          })}
        </>}
        {view==="income"&&<>
          <div style={{ background:"#E8F5E9", borderRadius:16, padding:"12px 14px", marginBottom:14 }}><div style={{ fontSize:11, color:"#2E7D32", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Total Income</div><div style={{ fontSize:22, fontWeight:900, color:"#2E7D32" }}>{fmt(totalIn)}</div></div>
          {incBySrc.length===0?<Empty text="No income this month"/>:incBySrc.map((x,i)=>(
            <div key={x.src} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{x.src}</span><span style={{ fontSize:13, fontWeight:800, color:"#2E7D32" }}>{fmt(x.total)}</span></div>
              <div style={{ background:"#F0F0F0", borderRadius:6, height:10 }}><div style={{ width:(x.total/maxInc*100)+"%", height:10, borderRadius:6, background:COLORS[i%COLORS.length] }}/></div>
              <div style={{ fontSize:11, color:"#999", marginTop:2 }}>{Math.round(x.total/totalIn*100)}% of income</div>
            </div>
          ))}
        </>}
        {view==="kito"&&<>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}><StatBox label="Kito Sales" value={kitoSales} bg="#E8F5E9" color="#2E7D32"/><StatBox label="Kito Costs" value={kitoExp} bg="#FFEBEE" color="#C62828"/></div>
          {kitoByCat.length===0?<Empty text="No Kito expenses this month"/>:kitoByCat.map((x,i)=>(
            <div key={x.cat} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{x.cat}</span><span style={{ fontSize:13, fontWeight:800, color:"#F57F17" }}>{fmt(x.total)}</span></div>
              <div style={{ background:"#F0F0F0", borderRadius:6, height:10 }}><div style={{ width:(x.total/maxKit*100)+"%", height:10, borderRadius:6, background:COLORS[i%COLORS.length] }}/></div>
            </div>
          ))}
        </>}
      </div>
    </>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
const DEFAULT_TABS = [
  { id:"home",      emoji:"🏠", label:"Home"     },
  { id:"accounts",  emoji:"💳", label:"Accounts" },
  { id:"personal",  emoji:"👤", label:"Personal" },
  { id:"kito",      emoji:"💎", label:"Kito"     },
  { id:"debts",     emoji:"📋", label:"Debts"    },
  { id:"challenge", emoji:"🎯", label:"Goals"    },
  { id:"budget",    emoji:"💰", label:"Budget"   },
  { id:"reports",   emoji:"📊", label:"Reports"  },
];

const TAB_ORDER_KEY = "finaura_tab_order";
function loadTabOrder() {
  try { const o = localStorage.getItem(TAB_ORDER_KEY); return o ? JSON.parse(o) : DEFAULT_TABS.map(t=>t.id); } catch { return DEFAULT_TABS.map(t=>t.id); }
}

export default function App() {
  const [data, setData] = useState(load);
  const [tab,  setTab]  = useState("home");
  const [tabOrder, setTabOrder] = useState(loadTabOrder);
  const [dragId, setDragId] = useState(null);
  const dateStr = new Date().toLocaleDateString("en-UG",{ weekday:"long", day:"numeric", month:"long" });

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
            <div style={{ fontSize:22, fontWeight:900, color:"#E8552A" }}>Finaura</div>
            <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{dateStr}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {overCount>0 && <div style={{ background:"#FFEBEE", color:"#C62828", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800 }}>⚠️ {overCount} over budget</div>}
            <div style={{ background:"#FFF0EB", color:"#E8552A", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:800 }}>UGX</div>
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
              style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 10px", borderRadius:10, border:"none", background:tab===t.id?"#FFF0EB":"transparent", color:tab===t.id?"#E8552A":"#999", fontWeight:tab===t.id?800:500, fontSize:11, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, position:"relative", opacity:dragId===t.id?0.5:1 }}>
              <span style={{ fontSize:16 }}>{t.emoji}</span>
              <span>{t.label}</span>
              {t.id==="budget" && overCount>0 && <div style={{ position:"absolute", top:4, right:6, width:8, height:8, borderRadius:"50%", background:"#C62828" }}/>}
            </button>
          ))}
        </div>
        <div style={{ fontSize:10, color:"#CCC", textAlign:"center", paddingBottom:2 }}>hold & drag tabs to reorder</div>
      </div>

      {tab==="home"      && <Home      data={data} setData={setData}/>}
      {tab==="accounts"  && <Accounts  data={data} setData={setData}/>}
      {tab==="personal"  && <Personal  data={data} setData={setData}/>}
      {tab==="kito"      && <Kito      data={data} setData={setData}/>}
      {tab==="debts"     && <Debts     data={data} setData={setData}/>}
      {tab==="challenge" && <Challenge data={data} setData={setData}/>}
      {tab==="budget"    && <Budget    data={data} setData={setData}/>}
      {tab==="reports"   && <Reports   data={data}/>}
    </div>
  );
}
