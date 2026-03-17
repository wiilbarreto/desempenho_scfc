import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, Video, Activity, ClipboardList, ChevronRight, Search,
  Plus, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Minus, Eye, BarChart3, Calendar, Star, Shield, Zap, Target,
  ArrowLeft, Play, FileText, UserCheck, Award, Crosshair, Flag,
  BookOpen, Send, Settings, ChevronDown, ChevronUp, Layers,
  Dumbbell, Circle, MapPin, Lock, Clipboard, Package, User,
  CheckSquare, XCircle, Timer, RefreshCw, Sun, Moon, Trash2, Edit3,
} from "lucide-react";

// ═══════════════════════════════════════════════
// GOOGLE SHEETS CSV PARSER — Live data fetch
// ═══════════════════════════════════════════════
const SHEETS_CSV_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThRhCTfsLmX3ftpF-0m2UwZeDNBWjn5TxnDCBB3i5W82bh1dNW8m-sbORNTX5FBA/pub?output=csv";
const GID = { cadastro:2058075615, coletivo:1880381548, individual:2098013514, videos:789793586, calendario:429987536 };

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  // Auto-detect delimiter: semicolon (pt-BR), comma, or tab
  const firstLine = lines[0];
  const sep = firstLine.includes("\t") ? "\t" : firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const splitLine = (line) => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === sep && !inQ) { vals.push(cur.trim().replace(/\r/g, "")); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur.trim().replace(/\r/g, ""));
    return vals;
  };
  const headers = splitLine(firstLine).map(h => h.replace(/^"|"$/g, ""));
  console.log("[BFSA parseCSV]", { sep: sep === "\t" ? "TAB" : sep, headers, lineCount: lines.length });
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

function ptNum(s) {
  if (!s || s === "") return null;
  return parseFloat(String(s).replace(",", "."));
}

async function fetchSheet(gid) {
  const url = `${SHEETS_CSV_BASE}&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet ${gid}: ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
    console.warn(`[BFSA] Sheet ${gid} returned HTML instead of CSV. Check if the spreadsheet is published.`);
    return [];
  }
  const rows = parseCSV(text);
  if (rows.length === 0) console.warn(`[BFSA] Sheet ${gid}: 0 rows parsed. First 200 chars:`, text.substring(0, 200));
  return rows;
}

function getField(r, ...keys) { for(const k of keys) { if(r[k]) return r[k]; } return ""; }
function getAdv(r) { return getField(r, "Adversário", "Adversario", "adversário", "adversario"); }
function getComp(r) { return getField(r, "Comp", "comp", "Competição", "competição", "Competicao"); }
function mapColetivo(rows) {
  return rows.filter(r => getComp(r) && getAdv(r)).map((r, i) => ({
    id: i + 1, data: r.Data || "", adv: getAdv(r), comp: getComp(r), res: r.Res,
    pl: r.Placar || "", mand: r.Local === "C", form: r.Sistema || "",
    rod: parseInt((r.Rodada || "").replace("R", "")) || i + 1,
    escudo: r.escudo || r.Escudo || "",
    posJogoDone: true, videosDone: true, adversarioDone: true,
    xg: ptNum(r.xG), xgC: ptNum(r.xGA), posse: ptNum(r["Posse%"]),
    passes: ptNum(r.Passes), passCrt: ptNum(r["Pass Crt"]), passPct: ptNum(r["Pass%"]),
    remates: ptNum(r.Remates), remAlvo: ptNum(r["Rem Alvo"]), remPct: ptNum(r["Rem%"]),
    cruz: ptNum(r.Cruzamentos), cruzCrt: ptNum(r["Cruz Crt"]), cruzPct: ptNum(r["Cruz%"]),
    duelos: null, duelPct: ptNum(r["Duelos%"]),
    recup: ptNum(r.Recup), perdas: ptNum(r.Perdas), ppda: ptNum(r.PPDA),
    intercep: ptNum(r.Intercep), ataqPos: ptNum(r["Ataq Pos"]), contraAtaq: ptNum(r["Contra-Ataq"]),
    bpRem: ptNum(r["BP Rem"]), toquesArea: ptNum(r["Toques Área"]),
    intensidade: ptNum(r.Intensidade), faltas: ptNum(r.Faltas),
    cartAm: ptNum(r["Cart Am"]), cartVm: ptNum(r["Cart Vm"]),
    gm: ptNum(r.GM), gs: ptNum(r.GS),
  }));
}

function mapCalendario(rows) {
  return rows.filter(r => getComp(r) && getAdv(r)).map(r => ({
    comp: getComp(r), rodada: r.Rodada || r.rodada || "", data: r.Data || r.data || "", adv: getAdv(r), local: r.Local || r.local || "",
    escudo: r.escudo || r.Escudo || "",
    adv_ok: r.ADV === "✓", pre_ok: r.PRE === "✓", pos_ok: r.POS === "✓",
    dat_ok: r.DAT === "✓", wys_ok: r.WYS === "✓", tre_ok: r.TRE === "✓",
    bsp_ok: r.BSP === "✓", ind_ok: r.IND === "✓",
  }));
}

function mapVideos(rows) {
  return rows.filter(r => r["Título"] || r.Titulo).map((r, i) => ({
    id: i + 1,
    titulo: r["Título"] || r.Titulo || "",
    tipo: r.Tipo || "clip_individual",
    plat: r.Plataforma || r.Plat || "google_drive",
    atleta: r.Atleta || "",
    partida: r.Partida || "",
    dur: r["Duração"] || r.Dur || "",
    data: r.Data || "",
    link: r.Link || r.URL || "",
    linkAlt: r["Link Alt"] || r["Link Alternativo"] || "",
  }));
}

function useSheets() {
  const [livePartidas, setLivePartidas] = useState(null);
  const [liveCalendario, setLiveCalendario] = useState(null);
  const [liveVideos, setLiveVideos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const sync = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [colRows, calRows, vidRows] = await Promise.all([
        fetchSheet(GID.coletivo), fetchSheet(GID.calendario), fetchSheet(GID.videos),
      ]);
      const p = mapColetivo(colRows);
      const c = mapCalendario(calRows);
      const v = mapVideos(vidRows);
      console.log("[BFSA Sync]", {rawRows:{col:colRows.length,cal:calRows.length,vid:vidRows.length}, mapped:{p:p.length,c:c.length,v:v.length}, colHeaders: colRows[0] && Object.keys(colRows[0]), calHeaders: calRows[0] && Object.keys(calRows[0])});
      if (p.length > 0) setLivePartidas(p);
      if (c.length > 0) setLiveCalendario(c);
      if (v.length > 0) setLiveVideos(v);
      const total = p.length + c.length + v.length;
      if (total === 0 && (colRows.length > 0 || calRows.length > 0)) {
        setError("CSV carregado mas headers não bateram. Veja console (F12).");
      }
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
    } catch (e) { console.error("[BFSA Sync Error]", e); setError(e.message); }
    finally { setLoading(false); }
  }, []);

  return { livePartidas, liveCalendario, liveVideos, loading, lastSync, error, sync };
}

// ═══════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════
// Botafogo SP identity: preto + vermelho + branco
const CDark = {
  bg: "#0a0a0e", bgCard: "rgba(18,18,24,0.65)", bgCardHover: "rgba(26,26,34,0.75)",
  bgInput: "rgba(12,12,18,0.8)", bgSidebar: "rgba(10,10,14,0.92)",
  border: "rgba(255,255,255,0.07)", borderActive: "#d4232b",
  gold: "#d4232b", goldLight: "#ff3b3b", goldDim: "rgba(212,35,43,0.12)",
  goldGlow: "rgba(212,35,43,0.25)",
  text: "#f0eee9", textDim: "#5a6070", textMid: "#8a92a4",
  green: "#22c55e", greenDim: "rgba(34,197,94,0.12)",
  red: "#ef4444", redDim: "rgba(239,68,68,0.12)",
  yellow: "#f59e0b", yellowDim: "rgba(245,158,11,0.12)",
  blue: "#3b82f6", blueDim: "rgba(59,130,246,0.12)",
  purple: "#8b5cf6", purpleDim: "rgba(139,92,246,0.12)",
  cyan: "#06b6d4", cyanDim: "rgba(6,182,212,0.12)",
  glass: "backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);",
  shadow: "0 4px 24px rgba(0,0,0,0.25)",
  shadowHover: "0 8px 32px rgba(0,0,0,0.35)",
};
const CLight = {
  bg: "#f0f2f5", bgCard: "rgba(255,255,255,0.82)", bgCardHover: "rgba(245,246,250,0.92)",
  bgInput: "rgba(240,241,246,0.9)", bgSidebar: "rgba(255,255,255,0.96)",
  border: "rgba(0,0,0,0.08)", borderActive: "#d4232b",
  gold: "#c41e28", goldLight: "#e02d2d", goldDim: "rgba(196,30,40,0.08)",
  goldGlow: "rgba(196,30,40,0.15)",
  text: "#1a1b2e", textDim: "#8a92a4", textMid: "#5a6070",
  green: "#16a34a", greenDim: "rgba(22,163,74,0.08)",
  red: "#dc2626", redDim: "rgba(220,38,38,0.07)",
  yellow: "#d97706", yellowDim: "rgba(217,119,6,0.08)",
  blue: "#2563eb", blueDim: "rgba(37,99,235,0.08)",
  purple: "#7c3aed", purpleDim: "rgba(124,58,237,0.08)",
  cyan: "#0891b2", cyanDim: "rgba(8,145,178,0.08)",
  glass: "backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
};
let C = CDark;
const font = "'Inter','DM Sans','Helvetica Neue',Arial,sans-serif";
const fontD = "'DM Sans','Inter','Helvetica Neue',sans-serif";

// ═══════════════════════════════════════════════
// DATA — Paulistão 2026 (Wyscout real) + contexto BFSA
// ═══════════════════════════════════════════════
const PB = "https://raw.githubusercontent.com/caiofelipead/performance_dashboard/main/public/players/";
const ATLETAS = [
  { id:1,nome:"Victor Souza",pos:"GK",num:1,status:"ativo",foto:`${PB}VICTOR%20SOUZA.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:2,nome:"Jonathan Lemos",pos:"RB",num:2,status:"ativo",foto:`${PB}JONATHAN.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:3,nome:"Éricson",pos:"CB",num:3,status:"ativo",foto:`${PB}ERICSON.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:4,nome:"Gustavo Vilar",pos:"CB",num:4,status:"ativo",foto:`${PB}GUSTAVO%20VILAR.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:5,nome:"Leandro Maciel",pos:"CDM",num:5,status:"ativo",foto:`${PB}LEANDRO%20MACIEL.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:6,nome:"Patrick Brey",pos:"LB",num:6,status:"ativo",foto:`${PB}PATRICK%20BREY.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:7,nome:"Kelvin Giacobe",pos:"RW",num:7,status:"ativo",foto:`${PB}KELVIN.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:8,nome:"Éverton Morelli",pos:"CDM",num:8,status:"ativo",foto:`${PB}MORELLI.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:9,nome:"Hygor Cléber",pos:"ST",num:9,status:"ativo",foto:`${PB}HYGOR.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:10,nome:"Rafael Gava",pos:"CAM",num:10,status:"ativo",foto:`${PB}RAFAEL%20GAVA.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:11,nome:"Jéfferson Nem",pos:"LW",num:11,status:"ativo",foto:`${PB}JEFFERSON%20NEM.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:12,nome:"Jordan Esteves",pos:"GK",num:12,status:"ativo",foto:`${PB}JORDAN.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:13,nome:"Wallace Fortuna",pos:"CB",num:13,status:"ativo",foto:`${PB}WALLACE.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:14,nome:"Carlão",pos:"CB",num:14,status:"ativo",foto:`${PB}CARLOS%20EDUARDO.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:15,nome:"Guilherme Mariano",pos:"CB",num:15,status:"ativo",foto:`${PB}GUI%20MARIANO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:16,nome:"Matheus Sales",pos:"CDM",num:16,status:"ativo",foto:`${PB}MATHEUS%20SALES.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:17,nome:"Guilherme Queiróz",pos:"ST",num:17,status:"ativo",foto:`${PB}GUILHERME%20QUEIROZ.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:19,nome:"Maranhão",pos:"RW",num:19,status:"ativo",foto:`${PB}MARANHAO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:20,nome:"Marquinho",pos:"CAM",num:20,status:"ativo",foto:`${PB}MARQUINHO%20JR..png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:21,nome:"Luizão",pos:"ST",num:21,status:"ativo",foto:`${PB}LUIZAO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:22,nome:"Gabriel Inocêncio",pos:"RB",num:22,status:"ativo",foto:`${PB}GABRIEL%20INOCENCIO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:23,nome:"Wesley Pinheiro",pos:"LW",num:23,status:"ativo",foto:`${PB}WESLEY.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:25,nome:"Brenno Klippel",pos:"GK",num:25,status:"ativo",foto:`${PB}BRENNO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:26,nome:"Felipe Vieira",pos:"LB",num:26,status:"ativo",foto:`${PB}FELIPE%20VIEIRA.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:27,nome:"Darlan Batista",pos:"CB",num:27,status:"ativo",foto:`${PB}DARLAN.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:29,nome:"Thiaguinho",pos:"CDM",num:29,status:"ativo",foto:`${PB}THIAGUINHO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:30,nome:"Zé Hugo",pos:"RW",num:30,status:"ativo",foto:`${PB}ZE%20HUGO.png`,videos:"",tend:"subindo",cat:"profissional" },
  { id:31,nome:"Pedro Tortello",pos:"CDM",num:0,status:"ativo",foto:`${PB}PEDRO%20TORTELLO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:32,nome:"Thalles",pos:"ST",num:0,status:"ativo",foto:`${PB}THALLES.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:33,nome:"Hebert Badaró",pos:"CB",num:0,status:"ativo",foto:`${PB}HEBERT.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:34,nome:"Érik",pos:"CDM",num:0,status:"ativo",foto:`${PB}ERIK.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:35,nome:"Adriano",pos:"GK",num:0,status:"ativo",foto:`${PB}ADRIANO.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:36,nome:"Whalacy Ermeliano",pos:"LW",num:0,status:"ativo",foto:`${PB}WHALACY.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:37,nome:"Yuri Felipe",pos:"CDM",num:0,status:"ativo",foto:`${PB}YURI.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:38,nome:"Henrique Teles",pos:"LB",num:0,status:"ativo",foto:`${PB}HENRIQUE%20TELES.png`,videos:"",tend:"estavel",cat:"profissional" },
  { id:39,nome:"Felipe Penha",pos:"CAM",num:0,status:"ativo",foto:"",videos:"",tend:"estavel",cat:"profissional" },
  { id:40,nome:"Pedrinho",pos:"RB",num:0,status:"ativo",foto:`${PB}PEDRINHO.png`,videos:"",tend:"estavel",cat:"profissional" },
];

// Hardcoded data removed — all data now driven by Google Sheets.

// ═══════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════
const Badge = ({children,color=C.gold,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:font,color,background:bg||`${color}22`,border:`1px solid ${color}33`}}>{children}</span>
);
const StatusDot = ({s}) => {
  const m={ativo:C.green,lesionado:C.red,emprestado:C.yellow};
  return <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:m[s]||C.textDim,boxShadow:`0 0 5px ${m[s]||C.textDim}66`}}/>;
};
const Tend = ({t}) => t==="subindo"?<TrendingUp size={13} color={C.green}/>:t==="descendo"?<TrendingDown size={13} color={C.red}/>:<Minus size={13} color={C.textDim}/>;
const Nota = ({v}) => {
  let c=C.red; if(v>=7.5)c=C.green;else if(v>=6.5)c=C.gold;else if(v>=5.5)c=C.yellow;
  return <span style={{fontFamily:fontD,fontSize:17,fontWeight:700,color:c}}>{v.toFixed(1)}</span>;
};
const PrioBadge = ({p}) => {
  const m={urgente:{c:C.red,l:"URGENTE"},alta:{c:C.yellow,l:"ALTA"},media:{c:C.blue,l:"MÉDIA"},baixa:{c:C.textDim,l:"BAIXA"}};
  const x=m[p]||m.media; return <Badge color={x.c}>{x.l}</Badge>;
};
const ResBadge = ({r}) => {
  const m={V:{c:C.green,bg:C.greenDim},D:{c:C.red,bg:C.redDim},E:{c:C.yellow,bg:C.yellowDim}};
  const x=m[r]||m.E; return <Badge color={x.c} bg={x.bg}>{r}</Badge>;
};
const Escudo = ({src,size=20}) => src ? (
  <img src={src} alt="" style={{width:size,height:size,objectFit:"contain",borderRadius:2,flexShrink:0}} onError={e=>{e.target.style.display="none"}}/>
) : null;
const PlatBadge = ({p}) => {
  const m={youtube:"#FF0000",vimeo:"#1AB7EA",google_drive:"#0F9D58",wyscout:"#FF6B00",instat:"#6366f1"};
  return <Badge color={m[p]||C.textDim}>{p.replace("_"," ")}</Badge>;
};
const StatCard = ({label,value,sub,icon:I,accent=C.gold}) => (
  <div style={{background:C.bgCard,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,boxShadow:C.shadow}}>
    <div style={{width:40,height:40,borderRadius:8,background:`${accent}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><I size={18} color={accent}/></div>
    <div>
      <div style={{fontSize:22,fontWeight:700,fontFamily:fontD,color:C.text,letterSpacing:"0.02em"}}>{value}</div>
      <div style={{fontSize:10,color:C.textDim,fontFamily:font,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:C.textMid,fontFamily:font,marginTop:1}}>{sub}</div>}
    </div>
  </div>
);
const SH = ({title,count,action,onAction}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <h2 style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{title}</h2>
      {count!==undefined&&<span style={{fontFamily:font,fontSize:10,color:C.gold,background:C.goldDim,padding:"2px 7px",borderRadius:3}}>{count}</span>}
    </div>
    {action&&<button onClick={onAction} style={{background:C.gold,color:C.bg,border:"none",padding:"5px 12px",borderRadius:4,cursor:"pointer",fontFamily:font,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:4}}><Plus size={12}/>{action}</button>}
  </div>
);
const SearchBar = ({ph,val,onChange}) => (
  <div style={{position:"relative",marginBottom:14}}>
    <Search size={14} color={C.textDim} style={{position:"absolute",left:10,top:9}}/>
    <input type="text" placeholder={ph} value={val} onChange={e=>onChange(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"7px 10px 7px 32px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:font,fontSize:12,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.borderActive} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);
const Tabs = ({items,active,onChange}) => (
  <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
    {items.map(t=><button key={t} onClick={()=>onChange(t)} style={{padding:"3px 10px",borderRadius:3,border:`1px solid ${active===t?C.gold:C.border}`,background:active===t?C.goldDim:"transparent",color:active===t?C.gold:C.textDim,fontFamily:font,fontSize:10,cursor:"pointer",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{t}</button>)}
  </div>
);
const ProgressBar = ({pct,color=C.green}) => (
  <div style={{width:"100%",height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
    <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:color,boxShadow:`0 0 6px ${color}66`,transition:"width 0.4s ease"}}/>
  </div>
);
const Card = ({children,onClick,style:s}) => (
  <div onClick={onClick} style={{background:C.bgCard,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:`1px solid ${C.border}`,borderRadius:10,padding:16,cursor:onClick?"pointer":"default",transition:"all 0.2s ease",boxShadow:C.shadow,...s}} onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`${C.shadowHover}, 0 0 0 1px ${C.gold}33`}}} onMouseLeave={e=>{if(onClick){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=C.shadow}}}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════════
function DashboardPage({nav,tarefas=[],videos=[],partidas=[],proxAdv}) {
  const ativos=ATLETAS.filter(a=>a.status==="ativo").length;
  const vit=partidas.filter(p=>p.res==="V").length;
  const emp=partidas.filter(p=>p.res==="E").length;
  const der=partidas.filter(p=>p.res==="D").length;
  const atrasadas=tarefas.filter(t=>t.status==="atrasada");
  const pendentes=tarefas.filter(t=>t.status!=="concluida");
  const chartData=partidas.map(p=>({j:`vs ${p.adv}`,r:p.res==="V"?3:p.res==="E"?1:0})).reverse();
  const subindo=ATLETAS.filter(a=>a.status==="ativo"&&a.tend==="subindo");

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      <StatCard label="Atletas Ativos" value={ativos} icon={Users}/>
      <StatCard label="Jogos" value={partidas.length} sub={`${vit}V ${emp}E ${der}D`} icon={Shield} accent={C.green}/>
      <StatCard label="Vídeos" value={videos.length} icon={Video} accent={C.blue}/>
      <StatCard label="Tarefas Pendentes" value={pendentes.length} icon={ClipboardList} accent={C.yellow}/>
      <StatCard label="Atrasadas" value={atrasadas.length} icon={AlertTriangle} accent={atrasadas.length>0?C.red:C.green}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      {proxAdv ? <Card>
        <SH title="Próximo Adversário"/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.red}44`,overflow:"hidden"}}>
            {proxAdv.escudo?<img src={proxAdv.escudo} alt={proxAdv.nome} style={{width:38,height:38,objectFit:"contain"}}/>:<Crosshair size={24} color={C.red}/>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:fontD,fontSize:22,color:C.text,fontWeight:700}}>{proxAdv.nome}</div>
            <div style={{fontFamily:font,fontSize:11,color:C.textDim}}>{proxAdv.comp} · {proxAdv.data} · {proxAdv.form}</div>
            <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
              <ProgressBar pct={proxAdv.progresso} color={C.yellow}/>
              <span style={{fontFamily:fontD,fontSize:14,color:C.yellow}}>{proxAdv.progresso}%</span>
            </div>
          </div>
        </div>
      </Card> : <Card><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Sincronize com Google Sheets para ver o próximo adversário.</div></Card>}
      <Card>
        <SH title="Resultados Recentes"/>
        {chartData.length>0 ? <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={28}>
            <XAxis dataKey="j" tick={{fill:C.textDim,fontSize:9,fontFamily:font}} axisLine={false} tickLine={false}/>
            <Bar dataKey="r" radius={[3,3,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.r===3?C.green:e.r===1?C.yellow:C.red}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer> : <div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Nenhuma partida carregada.</div>}
      </Card>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card>
        <SH title="Tendência Positiva" count={subindo.length}/>
        {subindo.map((a,i)=>(
          <div key={a.id} onClick={()=>nav("atleta-detail",a.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:4,cursor:"pointer",background:i===0?C.goldDim:"transparent",border:i===0?`1px solid ${C.gold}33`:"1px solid transparent",marginBottom:2}} onMouseEnter={e=>{if(i!==0)e.currentTarget.style.background=C.bgCardHover}} onMouseLeave={e=>{if(i!==0)e.currentTarget.style.background="transparent"}}>
            {a.foto?<img src={a.foto} alt={a.nome} style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.gold}33`}}/>:<div style={{width:28,height:28,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fontD,fontSize:12,color:C.gold}}>{a.num||"—"}</div>}
            <div style={{flex:1}}>
              <div style={{fontFamily:font,fontSize:12,color:C.text,fontWeight:600}}>{a.nome}</div>
              <div style={{fontFamily:font,fontSize:9,color:C.textDim}}>{a.pos}</div>
            </div>
            <Tend t={a.tend}/>
          </div>
        ))}
      </Card>
      <Card>
        <SH title="Cobrança — Pendentes" count={pendentes.length}/>
        <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:220,overflowY:"auto"}}>
          {pendentes.slice(0,6).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:4,background:t.atraso>0||t.status==="atrasada"?C.redDim:"transparent",border:`1px solid ${t.atraso>0||t.status==="atrasada"?`${C.red}33`:C.border}`}}>
              {t.atraso>0||t.status==="atrasada"?<AlertTriangle size={14} color={C.red}/>:<Clock size={14} color={C.textDim}/>}
              <div style={{flex:1}}>
                <div style={{fontFamily:font,fontSize:11,color:C.text}}>{t.titulo}</div>
                <div style={{fontFamily:font,fontSize:9,color:C.textDim}}>{t.analista} · {t.prazo}{(t.atraso>0||t.status==="atrasada")&&<span style={{color:C.red,fontWeight:700}}> · ATRASADA</span>}</div>
              </div>
              <PrioBadge p={t.prio}/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: MODELO DE JOGO
// ═══════════════════════════════════════════════
function ModeloJogoPage() {
  const fases = [
    { fase:"Organização Ofensiva", color:C.blue, icon:Zap,
      regras:[
        {se:"Setor bloqueado",entao:"Jogar para trás e mudar corredor",pq:"Criar novos ângulos e desorganizar o bloco"},
        {se:"Sob pressão",entao:"Entrelinhas ou bola nas costas",pq:"Usar a pressão contra o adversário"},
        {se:"Espaço disponível",entao:"Triangulações e losangos de apoio",pq:"Manter ritmo e conexão entre linhas"},
        {se:"Marcação zonal baixa",entao:"Circular até abrir corredor interno",pq:"Atrair e explorar o lado oposto"},
        {se:"Em progressão ofensiva",entao:"Cobertura defensiva preventiva",pq:"Evitar exposição a contra-ataques"},
      ]},
    { fase:"Transição Ofensiva", color:C.green, icon:TrendingUp,
      regras:[
        {se:"Recuperação em zona de pressão",entao:"Passe vertical imediato",pq:"Explorar desequilíbrio antes da recomposição"},
        {se:"Recuperação sob pressão",entao:"Mudar corredor",pq:"Aliviar e criar nova linha de progressão"},
        {se:"Espaço nas costas",entao:"Diagonal em profundidade",pq:"Atacar a ruptura defensiva"},
        {se:"Sem opção vertical",entao:"Condução 1x1 para atrair",pq:"Abrir espaços para companheiros"},
        {se:"Adversário recomposto",entao:"Circular e reorganizar ataque posicional",pq:"Não forçar — construir com paciência"},
      ]},
    { fase:"Organização Defensiva", color:C.yellow, icon:Shield,
      regras:[
        {se:"Adversário sai jogando curto",entao:"Pressão alta coordenada",pq:"Induzir erro e recuperar em zona perigosa"},
        {se:"Zagueiro recua pro goleiro",entao:"Pressionar goleiro e fechar linhas",pq:"Forçar bola longa ou erro"},
        {se:"Adversário perto da área",entao:"Compactar e dominar duelos",pq:"Densidade máxima no último terço"},
        {se:"Jogo pelo corredor central",entao:"Funilar e fechar espaços internos",pq:"Proteger eixo central"},
        {se:"Pressão vencida",entao:"Reagrupar atrás da bola",pq:"Evitar rupturas entre linhas"},
      ]},
    { fase:"Transição Defensiva", color:C.red, icon:AlertTriangle,
      regras:[
        {se:"Perda de posse",entao:"Pressionar até 8 segundos",pq:"Recuperar no terço ofensivo"},
        {se:"Não recuperou rápido",entao:"Falta tática ou recompor",pq:"Interromper contra-ataque"},
        {se:"Fora da zona de pressão",entao:"Funil para as laterais",pq:"Proteger eixo central"},
        {se:"Pressão vencida",entao:"Reagrupar atrás da linha da bola",pq:"Reequilibrar setores"},
        {se:"Superioridade adversária",entao:"Temporizar e chamar cobertura",pq:"Ganhar tempo para reposicionamento"},
      ]},
  ];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontFamily:fontD,fontSize:18,color:C.text,fontWeight:700}}>Modelo de Jogo Tencati</div>
        <div style={{fontFamily:font,fontSize:11,color:C.textDim,marginTop:2}}>Estrutura SE → ENTÃO → PORQUÊ</div>
      </div>
      <Badge color={C.green}>VIGENTE</Badge>
    </div>
    {fases.map((f,fi)=>{
      const I=f.icon;
      return <Card key={fi} style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:32,height:32,borderRadius:6,background:`${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><I size={16} color={f.color}/></div>
          <div style={{fontFamily:fontD,fontSize:14,color:f.color,fontWeight:700,textTransform:"uppercase"}}>{f.fase}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {f.regras.map((r,ri)=>(
            <div key={ri} style={{padding:12,borderRadius:6,border:`1px solid ${f.color}22`,background:`${f.color}06`}}>
              <div style={{fontFamily:font,fontSize:11,color:C.text,fontWeight:700,marginBottom:4}}>SE {r.se}</div>
              <div style={{fontFamily:font,fontSize:11,color:C.text}}><span style={{fontWeight:700,color:f.color}}>ENTÃO:</span> {r.entao}</div>
              <div style={{fontFamily:font,fontSize:10,color:C.textDim,marginTop:2}}>{r.pq}</div>
            </div>
          ))}
        </div>
      </Card>;
    })}
    <div style={{fontFamily:font,fontSize:9,color:C.textDim,textAlign:"center",marginTop:8}}>Comissão Técnica Tencati 3 · Base conceitual para treinamento e análise tática</div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: ADVERSÁRIO
// ═══════════════════════════════════════════════
function AdversarioPage({partidas=[],calendario=[],proxAdv}) {
  const escudoMap=Object.fromEntries([...partidas,...calendario].filter(x=>x.escudo).map(x=>[x.adv,x.escudo]));
  const [checklist,setChecklist]=useState([]);
  const [editingIdx,setEditingIdx]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [newItem,setNewItem]=useState("");
  const toggleCheck=(i)=>setChecklist(prev=>prev.map((item,idx)=>idx===i?{...item,done:!item.done}:item));
  const removeItem=(i)=>setChecklist(prev=>prev.filter((_,idx)=>idx!==i));
  const addItem=()=>{if(newItem.trim()){setChecklist(prev=>[...prev,{label:newItem.trim(),done:false}]);setNewItem("");}};
  const startEdit=(i)=>{setEditingIdx(i);setEditVal(checklist[i].label);};
  const saveEdit=(i)=>{if(editVal.trim()){setChecklist(prev=>prev.map((item,idx)=>idx===i?{...item,label:editVal.trim()}:item));}setEditingIdx(null);};
  const doneCount=checklist.filter(c=>c.done).length;
  return <div>
    {proxAdv && <Card style={{marginBottom:16,backgroundImage:`linear-gradient(135deg,${C.redDim} 0%,transparent 50%)`}}>
      <SH title="Em Andamento — Próximo Jogo"/>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.red}44`,overflow:"hidden"}}>
          {proxAdv.escudo?<img src={proxAdv.escudo} alt={proxAdv.nome} style={{width:44,height:44,objectFit:"contain"}}/>:<Crosshair size={28} color={C.red}/>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:fontD,fontSize:26,color:C.text,fontWeight:700}}>{proxAdv.nome}</div>
          <div style={{fontFamily:font,fontSize:12,color:C.textDim}}>{proxAdv.comp} · {proxAdv.data} · Formação esperada: {proxAdv.form}</div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <ProgressBar pct={proxAdv.progresso} color={proxAdv.progresso>=80?C.green:C.yellow}/>
            <span style={{fontFamily:fontD,fontSize:16,color:C.yellow}}>{proxAdv.progresso}%</span>
          </div>
        </div>
      </div>
    </Card>}
    <Card style={{marginBottom:16}}>
      <SH title="Checklist — Análise de Adversário" count={`${doneCount}/${checklist.length}`}/>
      <div style={{marginBottom:10}}>
        <ProgressBar pct={Math.round((doneCount/checklist.length)*100)} color={doneCount===checklist.length?C.green:C.yellow}/>
      </div>
      {checklist.length===0&&<div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:"12px 0",textAlign:"center"}}>Nenhum item no checklist. Adicione abaixo.</div>}
      {checklist.map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<checklist.length-1?`1px solid ${C.border}08`:"none"}} onMouseEnter={e=>e.currentTarget.style.background=C.bgCardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{cursor:"pointer",display:"flex"}} onClick={()=>toggleCheck(i)}>
            {item.done?<CheckCircle size={14} color={C.green}/>:<Circle size={14} color={C.textDim}/>}
          </div>
          {editingIdx===i?(
            <input value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={()=>saveEdit(i)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(i);if(e.key==="Escape")setEditingIdx(null);}} autoFocus style={{flex:1,fontFamily:font,fontSize:12,color:C.text,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 6px",outline:"none"}}/>
          ):(
            <span style={{flex:1,fontFamily:font,fontSize:12,color:item.done?C.textMid:C.text,textDecoration:item.done?"line-through":"none",cursor:"pointer"}} onClick={()=>toggleCheck(i)}>{item.label}</span>
          )}
          <Edit3 size={12} color={C.textDim} style={{cursor:"pointer",opacity:0.5,flexShrink:0}} onClick={()=>startEdit(i)}/>
          <Trash2 size={12} color={C.red} style={{cursor:"pointer",opacity:0.5,flexShrink:0}} onClick={()=>removeItem(i)}/>
        </div>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
        <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addItem();}} placeholder="Novo item..." style={{flex:1,fontFamily:font,fontSize:12,color:C.text,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",outline:"none"}}/>
        <div onClick={addItem} style={{cursor:"pointer",background:C.green,borderRadius:4,padding:"4px 8px",display:"flex",alignItems:"center",gap:4}}>
          <Plus size={12} color="#fff"/><span style={{fontFamily:font,fontSize:11,color:"#fff",fontWeight:600}}>Adicionar</span>
        </div>
      </div>
    </Card>
    <Card>
      <SH title="Análises Anteriores — Paulistão"/>
      {partidas.filter(p=>p.adversarioDone).map(p=>(
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:4,marginBottom:4,border:`1px solid ${C.border}`}}>
          <ResBadge r={p.res}/>
          <span style={{fontFamily:fontD,fontSize:16,color:C.text,fontWeight:700,width:50,textAlign:"center"}}>{p.pl}</span>
          <Escudo src={p.escudo||escudoMap[p.adv]} size={22}/>
          <div style={{flex:1}}>
            <span style={{fontFamily:font,fontSize:12,color:C.text}}>vs {p.adv}</span>
            <span style={{fontFamily:font,fontSize:10,color:C.textDim,marginLeft:8}}>R{p.rod} · {p.data}</span>
          </div>
          <Badge color={C.green}>COMPLETA</Badge>
        </div>
      ))}
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: PRELEÇÃO
// ═══════════════════════════════════════════════
function PrelecaoPage({videos=[],proxAdv}) {
  const prelecoes=videos.filter(v=>v.tipo==="prelecao");
  return <div>
    {proxAdv ? <Card style={{marginBottom:16,backgroundImage:`linear-gradient(135deg,${C.purpleDim} 0%,transparent 50%)`}}>
      <SH title="Próxima Preleção"/>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:48,height:48,borderRadius:6,background:`${C.purple}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={22} color={C.purple}/></div>
        <div style={{flex:1}}>
          <div style={{fontFamily:fontD,fontSize:20,color:C.text}}>vs {proxAdv.nome} — {proxAdv.data}</div>
          <div style={{fontFamily:font,fontSize:11,color:C.textDim}}>Depende da análise de adversário ({proxAdv.progresso}% concluída)</div>
        </div>
        <Badge color={proxAdv.progresso>=80?C.yellow:C.textDim}>{proxAdv.progresso>=80?"PRONTO P/ MONTAR":"AGUARDANDO ANÁLISE"}</Badge>
      </div>
    </Card> : <Card style={{marginBottom:16}}><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Sincronize com Google Sheets para ver a próxima preleção.</div></Card>}
    <Card>
      <SH title="Preleções Anteriores" count={prelecoes.length}/>
      {prelecoes.map(v=>(
        <div key={v.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:4,border:`1px solid ${C.border}`,marginBottom:4,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <Play size={14} color={C.purple}/><div style={{flex:1}}><div style={{fontFamily:font,fontSize:12,color:C.text}}>{v.titulo}</div><div style={{fontFamily:font,fontSize:9,color:C.textDim}}>{v.data} · {v.dur}</div></div><PlatBadge p={v.plat}/>
        </div>
      ))}
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: PARTIDAS
// ═══════════════════════════════════════════════
function PartidasPage({videos=[],partidas=[]}) {
  return <div>
    <SH title="Partidas + Pós-Jogo" count={partidas.length}/>
    {partidas.length===0&&<Card><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Nenhuma partida carregada. Sincronize com Google Sheets.</div></Card>}
    {partidas.map(p=>(
      <Card key={p.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:50,textAlign:"center"}}><ResBadge r={p.res}/></div>
        <div style={{fontFamily:fontD,fontSize:22,color:C.text,fontWeight:700,width:55,textAlign:"center"}}>{p.pl}</div>
        <Escudo src={p.escudo} size={24}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:font,fontSize:13,color:C.text,fontWeight:600}}>{p.mand?"Botafogo-SP":p.adv} vs {p.mand?p.adv:"Botafogo-SP"}</div>
          <div style={{fontFamily:font,fontSize:10,color:C.textDim}}>R{p.rod} · {p.data} · {p.form}{p.xg!=null?` · xG ${p.xg.toFixed(2)}`:""}{p.xgC!=null?` / xGA ${p.xgC.toFixed(2)}`:""}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Badge color={p.posJogoDone?C.green:C.yellow}>{p.posJogoDone?"PÓS ✓":"PENDENTE"}</Badge>
          <Badge color={C.blue}><Video size={9}/> {videos.filter(v=>v.partida===p.adv).length}</Badge>
        </div>
      </Card>
    ))}
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: BOLAS PARADAS
// ═══════════════════════════════════════════════
function BolasParadasPage() {
  return <div>
    <Card><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Dados serão alimentados via Google Sheets.</div></Card>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: TREINOS
// ═══════════════════════════════════════════════
function TreinosPage() {
  return <div>
    <Card><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Dados serão alimentados via Google Sheets.</div></Card>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: ATLETAS
// ═══════════════════════════════════════════════
function AtletasPage({nav}) {
  const [search,setSearch]=useState("");
  const [fp,setFp]=useState("TODAS");
  const posicoes=["TODAS",...new Set(ATLETAS.map(a=>a.pos))];
  const filtered=ATLETAS.filter(a=>{
    const ms=a.nome.toLowerCase().includes(search.toLowerCase());
    const mp=fp==="TODAS"||a.pos===fp;
    return ms&&mp;
  });
  return <div>
    <SearchBar ph="Buscar atleta..." val={search} onChange={setSearch}/>
    <Tabs items={posicoes} active={fp} onChange={setFp}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {filtered.map(a=>(
        <Card key={a.id} onClick={()=>nav("atleta-detail",a.id)}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            {a.foto?<img src={a.foto} alt={a.nome} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.gold}33`}}/>:<div style={{width:42,height:42,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fontD,fontSize:18,color:C.gold,fontWeight:700,border:`2px solid ${C.gold}33`}}>{a.num||"—"}</div>}
            <div style={{flex:1}}>
              <div style={{fontFamily:font,fontSize:13,color:C.text,fontWeight:700}}>{a.nome}</div>
              <div style={{display:"flex",gap:4,alignItems:"center",marginTop:2}}><StatusDot s={a.status}/><span style={{fontFamily:font,fontSize:9,color:C.textDim,textTransform:"uppercase"}}>{a.status}</span></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
            <div style={{textAlign:"center"}}><div style={{fontFamily:fontD,fontSize:16,color:C.gold}}>{a.pos}</div><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Posição</div></div>
            <div style={{textAlign:"center"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Tend t={a.tend}/><span style={{fontFamily:font,fontSize:10,color:C.textDim}}>{a.tend}</span></div><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Tendência</div></div>
          </div>
        </Card>
      ))}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: ATLETA DETAIL
// ═══════════════════════════════════════════════
function AtletaDetailPage({id,onBack,videos=[],partidas=[]}) {
  const a=ATLETAS.find(x=>x.id===id)||ATLETAS[0];
  const aVideos=videos.filter(v=>v.atleta===a.nome);
  const posStats = {
    GK: ["Defesas","Gols Sofridos","Clean Sheets","xG Sofrido","Saídas"],
    CB: ["Duelos Aéreos","Interceptações","Cortes","Passes Longos","Duelos%"],
    RB: ["Cruzamentos","Dribles","Interceptações","Passes Crt","Duelos%"],
    LB: ["Cruzamentos","Dribles","Interceptações","Passes Crt","Duelos%"],
    CDM: ["Recuperações","Passes","Interceptações","Duelos%","PPDA contrib"],
    CAM: ["Passes Decisivos","Finalizações","Dribles","Chances Criadas","xG"],
    RW: ["Dribles","Finalizações","Cruzamentos","Gols","Assistências"],
    LW: ["Dribles","Finalizações","Cruzamentos","Gols","Assistências"],
    ST: ["Gols","xG","Finalizações","Rem no Alvo%","Toques na Área"],
  };
  const statsForPos = posStats[a.pos] || ["Jogos","Minutos","Notas"];
  return <div>
    <button onClick={onBack} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontFamily:font,fontSize:11,display:"flex",alignItems:"center",gap:4,marginBottom:14,padding:0}}><ArrowLeft size={13}/>VOLTAR</button>
    <Card style={{marginBottom:16,backgroundImage:`linear-gradient(135deg,${C.goldDim} 0%,transparent 50%)`}}>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        {a.foto?<img src={a.foto} alt={a.nome} style={{width:70,height:70,borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.gold}55`}}/>:<div style={{width:70,height:70,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fontD,fontSize:32,color:C.gold,fontWeight:700,border:`3px solid ${C.gold}55`}}>{a.num||"—"}</div>}
        <div style={{flex:1}}>
          <div style={{fontFamily:fontD,fontSize:26,color:C.text,fontWeight:700,textTransform:"uppercase"}}>{a.nome}</div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <Badge color={C.gold}>{a.pos}</Badge>
            <Badge color={a.status==="ativo"?C.green:C.red}>{a.status}</Badge>
            <div style={{display:"flex",alignItems:"center",gap:3}}><Tend t={a.tend}/><span style={{fontFamily:font,fontSize:9,color:C.textDim,textTransform:"uppercase"}}>{a.tend}</span></div>
          </div>
        </div>
      </div>
    </Card>
    <Card style={{marginBottom:14}}><SH title={`Stats por Posição — ${a.pos}`}/>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(statsForPos.length,5)},1fr)`,gap:8}}>
        {statsForPos.map((s,i)=>(
          <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRadius:4,background:C.bgInput,border:`1px solid ${C.border}`}}>
            <div style={{fontFamily:fontD,fontSize:16,color:C.gold}}>—</div>
            <div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase",marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{fontFamily:font,fontSize:10,color:C.textDim,marginTop:6,fontStyle:"italic"}}>Dados individuais alimentados via planilha (aba Individual).</div>
    </Card>

    <Card style={{marginBottom:14}}><SH title="Partidas Coletivas" count={partidas.length}/>
      {partidas.length>0 ? <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:11}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["R","Adversário","Res","Placar","xG","xGA","Posse%","PPDA"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:C.textDim,fontSize:9,textTransform:"uppercase",fontWeight:600}}>{h}</th>)}</tr></thead>
        <tbody>{partidas.map((p,i)=>(
          <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=C.bgCardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"8px 10px",color:C.textDim}}>{p.rod}</td>
            <td style={{padding:"8px 10px",color:C.text}}><div style={{display:"flex",alignItems:"center",gap:6}}><Escudo src={p.escudo} size={16}/>{p.adv}</div></td>
            <td style={{padding:"8px 10px"}}><ResBadge r={p.res}/></td>
            <td style={{padding:"8px 10px",color:C.text,fontFamily:fontD,fontSize:14}}>{p.pl}</td>
            <td style={{padding:"8px 10px",color:C.green}}>{p.xg!=null?p.xg.toFixed(2):"—"}</td>
            <td style={{padding:"8px 10px",color:C.red}}>{p.xgC!=null?p.xgC.toFixed(2):"—"}</td>
            <td style={{padding:"8px 10px",color:C.text}}>{p.posse!=null?`${p.posse}%`:"—"}</td>
            <td style={{padding:"8px 10px",color:C.textMid}}>{p.ppda!=null?p.ppda.toFixed(1):"—"}</td>
          </tr>
        ))}</tbody>
      </table> : <div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Nenhuma partida carregada.</div>}
      <div style={{fontFamily:font,fontSize:10,color:C.textDim,marginTop:8,padding:"6px 10px",background:C.bgInput,borderRadius:4}}>
        Dados individuais por atleta alimentados via planilha Wyscout → API.
      </div>
    </Card>

    <Card><SH title="Vídeos" count={aVideos.length}/>
      {aVideos.length>0?aVideos.map(v=>(
        <div key={v.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:4,border:`1px solid ${C.border}`,marginBottom:4,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <Play size={14} color={C.gold}/><div style={{flex:1}}><div style={{fontFamily:font,fontSize:12,color:C.text}}>{v.titulo}</div><div style={{fontFamily:font,fontSize:9,color:C.textDim}}>{v.data} · {v.dur}</div></div><PlatBadge p={v.plat}/>
        </div>
      )):<div style={{fontFamily:font,fontSize:11,color:C.textDim,padding:10}}>Nenhum vídeo individual cadastrado.</div>}
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: VÍDEOS
// ═══════════════════════════════════════════════
function VideosPage({videos=[]}) {
  const [search,setSearch]=useState("");
  const [ft,setFt]=useState("TODOS");
  const tipos=["TODOS","jogo_completo","clip_individual","analise_adversario","treino","prelecao","bola_parada","modelo_jogo"];
  const tipoLabel={jogo_completo:"Jogos",clip_individual:"Individual",analise_adversario:"Adversário",treino:"Treinos",prelecao:"Preleção",bola_parada:"Bola Parada",modelo_jogo:"Modelo Jogo"};
  const filtered=videos.filter(v=>(v.titulo.toLowerCase().includes(search.toLowerCase()))&&(ft==="TODOS"||v.tipo===ft));
  return <div>
    <SearchBar ph="Buscar vídeo..." val={search} onChange={setSearch}/>
    <Tabs items={tipos.map(t=>tipoLabel[t]||t)} active={tipoLabel[ft]||ft} onChange={label=>{const key=Object.entries(tipoLabel).find(([k,v])=>v===label);setFt(key?key[0]:label==="TODOS"?"TODOS":label);}}/>
    {videos.length===0&&<div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center",background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>Nenhum vídeo carregado. Sincronize com Google Sheets para carregar os vídeos da planilha.</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
      {filtered.map(v=>{
        const videoLink = v.link || v.linkAlt || "";
        return <Card key={v.id} onClick={videoLink?()=>window.open(videoLink,"_blank"):undefined}>
          <div style={{width:"100%",height:80,borderRadius:4,marginBottom:10,background:`linear-gradient(135deg,${C.bgInput},${C.bgCardHover})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center"}}><Play size={16} color={C.gold} fill={C.gold}/></div>
            {v.dur&&<span style={{position:"absolute",bottom:4,right:6,fontFamily:font,fontSize:9,color:C.text,background:"rgba(0,0,0,0.7)",padding:"1px 5px",borderRadius:2}}>{v.dur}</span>}
            {videoLink&&<span style={{position:"absolute",top:4,right:6,fontFamily:font,fontSize:8,color:C.green,background:"rgba(0,0,0,0.7)",padding:"1px 5px",borderRadius:2}}>LINK</span>}
          </div>
          <div style={{fontFamily:font,fontSize:12,color:C.text,fontWeight:600,marginBottom:4}}>{v.titulo}</div>
          {v.atleta&&<div style={{fontFamily:font,fontSize:10,color:C.gold,marginBottom:4}}>Atleta: {v.atleta}</div>}
          <div style={{display:"flex",gap:4}}><PlatBadge p={v.plat}/><Badge>{tipoLabel[v.tipo]||v.tipo}</Badge></div>
        </Card>;
      })}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: ANALISTAS
// ═══════════════════════════════════════════════
function AddTarefaForm({onAdd,onCancel}) {
  const [titulo,setTitulo]=useState("");
  const [analista,setAnalista]=useState("Semir");
  const [prazo,setPrazo]=useState("");
  const [prio,setPrio]=useState("media");
  const [tipo,setTipo]=useState("analise_adversario");
  const submit=()=>{if(!titulo.trim())return;onAdd({titulo,analista,prazo,prio,tipo,status:"pendente"})};
  return <Card style={{marginBottom:12,border:`1px solid ${C.gold}44`}}>
    <SH title="Nova Tarefa"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
      <div><div style={{fontFamily:font,fontSize:9,color:C.textDim,marginBottom:3,textTransform:"uppercase"}}>Título</div><input value={titulo} onChange={e=>setTitulo(e.target.value)} style={{width:"100%",padding:"6px 8px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:font,fontSize:11,outline:"none"}} placeholder="Descrição da tarefa..."/></div>
      <div><div style={{fontFamily:font,fontSize:9,color:C.textDim,marginBottom:3,textTransform:"uppercase"}}>Analista</div><select value={analista} onChange={e=>setAnalista(e.target.value)} style={{width:"100%",padding:"6px 8px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:font,fontSize:11}}><option value="Semir">Semir</option><option value="Cassio">Cassio</option><option value="Caio">Caio</option></select></div>
      <div><div style={{fontFamily:font,fontSize:9,color:C.textDim,marginBottom:3,textTransform:"uppercase"}}>Prazo</div><input value={prazo} onChange={e=>setPrazo(e.target.value)} style={{width:"100%",padding:"6px 8px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:font,fontSize:11,outline:"none"}} placeholder="dd/mm"/></div>
      <div><div style={{fontFamily:font,fontSize:9,color:C.textDim,marginBottom:3,textTransform:"uppercase"}}>Prioridade</div><select value={prio} onChange={e=>setPrio(e.target.value)} style={{width:"100%",padding:"6px 8px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:font,fontSize:11}}><option value="urgente">Urgente</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div>
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button onClick={onCancel} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.textDim,fontFamily:font,fontSize:10,cursor:"pointer"}}>Cancelar</button>
      <button onClick={submit} style={{padding:"5px 12px",background:C.gold,border:"none",borderRadius:4,color:C.bg,fontFamily:font,fontSize:10,fontWeight:700,cursor:"pointer"}}>Adicionar</button>
    </div>
  </Card>;
}

function AnalistasPage({tarefas=[],addTarefa,updateTarefa,removeTarefa,showAddTarefa,setShowAddTarefa}) {
  const atrasadas=tarefas.filter(t=>t.status==="atrasada");
  return <div>
    {atrasadas.length>0&&<Card style={{backgroundImage:`linear-gradient(135deg,${C.redDim} 0%,transparent 40%)`,border:`1px solid ${C.red}33`}}>
      <SH title="Tarefas Atrasadas" count={atrasadas.length}/>
      {atrasadas.map(t=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:4,border:`1px solid ${C.red}22`,background:`${C.red}08`,marginBottom:4}}>
          <AlertTriangle size={16} color={C.red}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:font,fontSize:12,color:C.text,fontWeight:600}}>{t.titulo}</div>
            <div style={{fontFamily:font,fontSize:10,color:C.textDim}}><span style={{color:C.red,fontWeight:700}}>{t.analista}</span> · Prazo: {t.prazo}</div>
          </div>
          <PrioBadge p={t.prio}/>
        </div>
      ))}
    </Card>}
    {showAddTarefa&&<AddTarefaForm onAdd={addTarefa} onCancel={()=>setShowAddTarefa(false)}/>}
    <Card style={{marginTop:16}}>
      <SH title="Todas as Tarefas" count={tarefas.length} action="Nova Tarefa" onAction={()=>setShowAddTarefa(true)}/>
      {tarefas.length===0&&<div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:16,textAlign:"center"}}>Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para adicionar.</div>}
      {tarefas.map(t=>{
        const sc={concluida:C.green,em_andamento:C.yellow,pendente:C.textDim,atrasada:C.red};
        return <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:4,border:`1px solid ${C.border}`,marginBottom:4}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:sc[t.status]||C.textDim,cursor:"pointer"}} onClick={()=>{const next={pendente:"em_andamento",em_andamento:"concluida",concluida:"pendente",atrasada:"em_andamento"};updateTarefa(t.id,{status:next[t.status]||"pendente"})}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:font,fontSize:11,color:C.text}}>{t.titulo}</div>
            <div style={{fontFamily:font,fontSize:9,color:C.textDim}}>{t.analista} · {t.prazo}</div>
          </div>
          <Badge color={sc[t.status]}>{(t.status||"pendente").replace("_"," ")}</Badge>
          <PrioBadge p={t.prio}/>
          <button onClick={()=>removeTarefa(t.id)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><XCircle size={14} color={C.red}/></button>
        </div>;
      })}
    </Card>
  </div>;
}


// ═══════════════════════════════════════════════
// PAGE: PROTOCOLOS
// ═══════════════════════════════════════════════
function ProtocolosPage() {
  return <div>
    <Card><div style={{fontFamily:font,fontSize:12,color:C.textDim,padding:20,textAlign:"center"}}>Dados serão alimentados via Google Sheets.</div></Card>
  </div>;
}

// ═══════════════════════════════════════════════
// NAV + MAIN APP
// ═══════════════════════════════════════════════
const NAV = [
  { section: "GERAL", items: [{ id:"dashboard",label:"Dashboard",icon:BarChart3 }]},
  { section: "OPERACIONAL", items: [
    { id:"modelo-jogo",label:"Modelo de Jogo",icon:BookOpen },
    { id:"adversario",label:"Adversário",icon:Crosshair },
    { id:"prelecao",label:"Preleção",icon:FileText },
    { id:"partidas",label:"Partidas / Pós-Jogo",icon:Shield },
    { id:"bolas-paradas",label:"Bolas Paradas",icon:Target },
    { id:"treinos",label:"Treinos",icon:Dumbbell },
  ]},
  { section: "ELENCO", items: [
    { id:"atletas",label:"Atletas",icon:Users },
    { id:"videos",label:"Biblioteca de Vídeos",icon:Video },
  ]},
  { section: "GESTÃO", items: [
    { id:"analistas",label:"Analistas",icon:ClipboardList },
    { id:"protocolos",label:"Protocolos",icon:Settings },
  ]},
];

export default function PantherPerformance() {
  const [page,setPage]=useState("dashboard");
  const [sub,setSub]=useState(null);
  const [selId,setSelId]=useState(null);
  const [collapsed,setCollapsed]=useState({});
  const [time,setTime]=useState(new Date());
  const [tarefas,setTarefas]=useState([]);
  const [showAddTarefa,setShowAddTarefa]=useState(false);
  const [isDark,setIsDark]=useState(false);
  const sheets = useSheets();

  // Update theme colors before render
  C = isDark ? CDark : CLight;

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),60000);return()=>clearInterval(t)},[]);
  useEffect(()=>{sheets.sync()},[]);// eslint-disable-line

  const partidas = sheets.livePartidas || [];
  const calendario = sheets.liveCalendario || [];
  const videos = sheets.liveVideos || [];

  const proxAdv = calendario.length > 0 ? (() => {
    const pending = calendario.find(c => !c.adv_ok);
    const match = pending || calendario[0];
    return { nome: match.adv, data: match.data, comp: `${match.comp} ${match.rodada}`, form: "", escudo: match.escudo || "", progresso: match.adv_ok ? 100 : 0 };
  })() : null;

  const addTarefa=(t)=>{setTarefas(prev=>[...prev,{...t,id:Date.now()}]);setShowAddTarefa(false)};
  const updateTarefa=(id,updates)=>setTarefas(prev=>prev.map(t=>t.id===id?{...t,...updates}:t));
  const removeTarefa=(id)=>setTarefas(prev=>prev.filter(t=>t.id!==id));

  const nav=(target,id)=>{
    if(target==="atleta-detail"){setSub("atleta-detail");setSelId(id)}
    else{setPage(target);setSub(null);setSelId(null)}
  };
  const goBack=()=>{setSub(null);setSelId(null);setPage("atletas")};
  const atrasadas=tarefas.filter(t=>t.status==="atrasada").length;

  const renderPage=()=>{
    if(sub==="atleta-detail") return <AtletaDetailPage id={selId} onBack={goBack} videos={videos} partidas={partidas}/>;
    switch(page){
      case "dashboard": return <DashboardPage nav={nav} tarefas={tarefas} videos={videos} partidas={partidas} proxAdv={proxAdv}/>;
      case "modelo-jogo": return <ModeloJogoPage/>;
      case "adversario": return <AdversarioPage partidas={partidas} calendario={calendario} proxAdv={proxAdv}/>;
      case "prelecao": return <PrelecaoPage videos={videos} proxAdv={proxAdv}/>;
      case "partidas": return <PartidasPage videos={videos} partidas={partidas}/>;
      case "bolas-paradas": return <BolasParadasPage/>;
      case "treinos": return <TreinosPage/>;
      case "atletas": return <AtletasPage nav={nav}/>;
      case "videos": return <VideosPage videos={videos}/>;
      case "analistas": return <AnalistasPage tarefas={tarefas} addTarefa={addTarefa} updateTarefa={updateTarefa} removeTarefa={removeTarefa} showAddTarefa={showAddTarefa} setShowAddTarefa={setShowAddTarefa}/>;
      case "protocolos": return <ProtocolosPage/>;
      default: return <DashboardPage nav={nav} tarefas={tarefas} videos={videos} partidas={partidas} proxAdv={proxAdv}/>;
    }
  };

  const allItems=NAV.flatMap(s=>s.items);
  const pageTitle=sub==="atleta-detail"?(ATLETAS.find(a=>a.id===selId)?.nome||"Atleta"):allItems.find(n=>n.id===page)?.label||"Dashboard";
  const toggleSection=(s)=>setCollapsed(p=>({...p,[s]:!p[s]}));

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:font,color:C.text,display:"flex",transition:"background 0.3s ease, color 0.3s ease"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.15)"};border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${C.gold}44}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        body{transition:background 0.3s ease}
      `}</style>

      {/* SIDEBAR */}
      <div style={{width:210,minHeight:"100vh",background:C.bgSidebar,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,bottom:0,zIndex:10,overflowY:"auto",transition:"background 0.3s ease, border-color 0.3s ease"}}>
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <img src="/3154_imgbank_1685113109.png" alt="Botafogo FC" style={{width:36,height:36,objectFit:"contain"}} onError={e=>{e.target.style.display="none"}}/>
          <div>
            <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:"0.12em",lineHeight:1}}>BFSA</div>
            <div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.15em"}}>Análise de Desempenho</div>
          </div>
        </div>
        <div style={{padding:"8px 6px",flex:1}}>
          {NAV.map(section=>(
            <div key={section.section} style={{marginBottom:4}}>
              <button onClick={()=>toggleSection(section.section)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",background:"none",border:"none",cursor:"pointer",fontFamily:font,fontSize:9,color:C.textDim,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>
                {section.section}
                {collapsed[section.section]?<ChevronRight size={10}/>:<ChevronDown size={10}/>}
              </button>
              {!collapsed[section.section]&&section.items.map(item=>{
                const active=page===item.id&&!sub;
                const I=item.icon;
                return <button key={item.id} onClick={()=>nav(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",marginBottom:1,borderRadius:4,border:"none",cursor:"pointer",background:active?C.goldDim:"transparent",color:active?C.gold:C.textDim,fontFamily:font,fontSize:11,fontWeight:active?700:500,textAlign:"left",transition:"all 0.12s"}} onMouseEnter={e=>{if(!active){e.currentTarget.style.color=C.text;e.currentTarget.style.background=C.bgCardHover}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.color=C.textDim;e.currentTarget.style.background="transparent"}}}>
                  <I size={14}/>
                  <span style={{flex:1}}>{item.label}</span>
                  {item.id==="analistas"&&atrasadas>0&&<span style={{width:16,height:16,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{atrasadas}</span>}
                  {item.id==="adversario"&&proxAdv&&proxAdv.progresso<100&&<span style={{width:16,height:16,borderRadius:"50%",background:C.yellow,color:C.bg,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>!</span>}
                </button>;
              })}
            </div>
          ))}
        </div>
        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`}}>
          <button onClick={()=>setIsDark(d=>!d)} style={{width:"100%",padding:"7px 8px",background:isDark?C.bgInput:`${C.gold}10`,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8,transition:"all 0.2s ease"}}>
            {isDark?<Sun size={12} color={C.yellow}/>:<Moon size={12} color={C.gold}/>}
            <span style={{fontFamily:font,fontSize:10,color:C.textMid,fontWeight:500}}>{isDark?"Modo Claro":"Modo Escuro"}</span>
          </button>
          <button onClick={sheets.sync} disabled={sheets.loading} style={{width:"100%",padding:"6px 8px",background:sheets.loading?C.bgInput:C.goldDim,border:`1px solid ${C.border}`,borderRadius:6,cursor:sheets.loading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:6}}>
            <RefreshCw size={10} color={C.gold} style={{animation:sheets.loading?"spin 1s linear infinite":"none"}}/>
            <span style={{fontFamily:font,fontSize:9,color:C.gold,fontWeight:500}}>{sheets.loading?"Sincronizando...":"Sync Google Sheets"}</span>
          </button>
          {sheets.lastSync && <div style={{fontFamily:font,fontSize:8,color:C.green,textAlign:"center"}}>✓ {sheets.lastSync}</div>}
          {sheets.error && <div style={{fontFamily:font,fontSize:8,color:C.red,textAlign:"center",wordBreak:"break-all"}}>✗ {sheets.error}</div>}
          <div style={{fontFamily:font,fontSize:9,color:C.textDim,marginTop:4}}>BFSA · Dept. Análise</div>
          <div style={{fontFamily:font,fontSize:8,color:C.textDim,marginTop:1}}>{time.toLocaleDateString("pt-BR")} · {time.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{marginLeft:210,flex:1,padding:"16px 20px",minHeight:"100vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
          <h1 style={{fontFamily:fontD,fontSize:22,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>{pageTitle}</h1>
          <div style={{fontFamily:font,fontSize:10,color:C.textDim}}></div>
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
