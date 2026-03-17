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
  CheckSquare, XCircle, Timer, RefreshCw, Sun, Moon,
} from "lucide-react";

// ═══════════════════════════════════════════════
// GOOGLE SHEETS CSV PARSER — Live data fetch
// ═══════════════════════════════════════════════
const SHEETS_CSV_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThRhCTfsLmX3ftpF-0m2UwZeDNBWjn5TxnDCBB3i5W82bh1dNW8m-sbORNTX5FBA/pub?output=csv";
const GID = { cadastro:2058075615, coletivo:1880381548, individual:2098013514, videos:789793586, calendario:429987536 };

function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
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
  return parseCSV(await res.text());
}

function mapColetivo(rows) {
  return rows.filter(r => r.Comp && r.Adversário).map((r, i) => ({
    id: i + 1, data: r.Data || "", adv: r["Adversário"], comp: r.Comp, res: r.Res,
    pl: r.Placar || "", mand: r.Local === "C", form: r.Sistema || "",
    rod: parseInt((r.Rodada || "").replace("R", "")) || i + 1,
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
  return rows.filter(r => r.Comp && r["Adversário"]).map(r => ({
    comp: r.Comp, rodada: r.Rodada, data: r.Data, adv: r["Adversário"], local: r.Local,
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
      if (p.length > 0) setLivePartidas(p);
      if (c.length > 0) setLiveCalendario(c);
      if (v.length > 0) setLiveVideos(v);
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
    } catch (e) { setError(e.message); }
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

// ═══════════════════════════════════════════════
// DATA SOURCE — Google Sheets (published CSV)
// ═══════════════════════════════════════════════
const SHEETS_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThRhCTfsLmX3ftpF-0m2UwZeDNBWjn5TxnDCBB3i5W82bh1dNW8m-sbORNTX5FBA/pub?output=csv";
const SHEET_GIDS = { cadastro:2058075615, coletivo:1880381548, individual:2098013514, videos:789793586, calendario:429987536 };

// Fallback data — Wyscout Team Stats Paulistão 2026 (synced from Google Sheets 17/03)
const PARTIDAS = [
  { id:1,data:"16/02",adv:"Capivariano",comp:"Paulistão",res:"D",pl:"0-1",mand:true,form:"4-2-3-1",rod:8,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.75,xgC:1.32,posse:55.03,passes:386,passCrt:318,passPct:82.38,remates:10,remAlvo:2,remPct:20,cruz:28,cruzCrt:13,cruzPct:46.43,duelos:173,duelPct:52.02,recup:76,perdas:111,ppda:10.14,intercep:40,ataqPos:30,contraAtaq:2,bpRem:3,toquesArea:25,intensidade:14.66,faltas:7,cartAm:1,cartVm:0,gm:0,gs:1 },
  { id:2,data:"07/02",adv:"Guarani",comp:"Paulistão",res:"V",pl:"2-0",mand:false,form:"4-3-3",rod:7,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.88,xgC:0.57,posse:41.79,passes:274,passCrt:201,passPct:73.36,remates:9,remAlvo:5,remPct:55.56,cruz:14,cruzCrt:3,cruzPct:21.43,duelos:193,duelPct:42.49,recup:61,perdas:111,ppda:9.78,intercep:37,ataqPos:24,contraAtaq:1,bpRem:2,toquesArea:17,intensidade:14.44,faltas:23,cartAm:6,cartVm:0,gm:2,gs:0 },
  { id:3,data:"02/02",adv:"Palmeiras",comp:"Paulistão",res:"V",pl:"1-0",mand:true,form:"4-2-3-1",rod:6,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.92,xgC:1.29,posse:39.25,passes:263,passCrt:205,passPct:77.95,remates:12,remAlvo:5,remPct:41.67,cruz:11,cruzCrt:3,cruzPct:27.27,duelos:153,duelPct:49.67,recup:60,perdas:89,ppda:13.38,intercep:31,ataqPos:16,contraAtaq:5,bpRem:5,toquesArea:10,intensidade:14.05,faltas:15,cartAm:7,cartVm:1,gm:1,gs:0 },
  { id:4,data:"25/01",adv:"Novorizontino",comp:"Paulistão",res:"D",pl:"0-2",mand:false,form:"4-2-3-1",rod:5,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.31,xgC:1.14,posse:61.27,passes:549,passCrt:458,passPct:83.42,remates:8,remAlvo:2,remPct:25,cruz:9,cruzCrt:2,cruzPct:22.22,duelos:148,duelPct:47.3,recup:75,perdas:124,ppda:15.86,intercep:26,ataqPos:26,contraAtaq:0,bpRem:2,toquesArea:9,intensidade:17.98,faltas:8,cartAm:2,cartVm:0,gm:0,gs:2 },
  { id:5,data:"23/01",adv:"Primavera SP",comp:"Paulistão",res:"V",pl:"1-0",mand:true,form:"4-2-3-1",rod:4,posJogoDone:true,videosDone:true,adversarioDone:true,xg:1.87,xgC:0.87,posse:55.45,passes:358,passCrt:280,passPct:78.21,remates:22,remAlvo:9,remPct:40.91,cruz:22,cruzCrt:7,cruzPct:31.82,duelos:171,duelPct:43.27,recup:75,perdas:121,ppda:7.11,intercep:47,ataqPos:29,contraAtaq:0,bpRem:9,toquesArea:25,intensidade:14.97,faltas:13,cartAm:2,cartVm:0,gm:1,gs:0 },
  { id:6,data:"18/01",adv:"RB Bragantino",comp:"Paulistão",res:"D",pl:"0-5",mand:false,form:"4-2-3-1",rod:3,posJogoDone:true,videosDone:true,adversarioDone:true,xg:1.84,xgC:1.78,posse:50.65,passes:413,passCrt:352,passPct:85.23,remates:13,remAlvo:4,remPct:30.77,cruz:15,cruzCrt:6,cruzPct:40,duelos:185,duelPct:53.51,recup:81,perdas:110,ppda:14.5,intercep:28,ataqPos:24,contraAtaq:0,bpRem:4,toquesArea:15,intensidade:16.73,faltas:7,cartAm:1,cartVm:0,gm:0,gs:5 },
  { id:7,data:"15/01",adv:"Noroeste",comp:"Paulistão",res:"E",pl:"1-1",mand:true,form:"4-1-3-2",rod:2,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.84,xgC:1.68,posse:43.9,passes:225,passCrt:136,passPct:60.44,remates:13,remAlvo:4,remPct:30.77,cruz:16,cruzCrt:3,cruzPct:18.75,duelos:209,duelPct:44.02,recup:91,perdas:155,ppda:9.67,intercep:40,ataqPos:24,contraAtaq:0,bpRem:6,toquesArea:15,intensidade:14.06,faltas:18,cartAm:1,cartVm:0,gm:1,gs:1 },
  { id:8,data:"11/01",adv:"Velo Clube",comp:"Paulistão",res:"E",pl:"0-0",mand:false,form:"4-3-3",rod:1,posJogoDone:true,videosDone:true,adversarioDone:true,xg:0.31,xgC:0.67,posse:55.72,passes:352,passCrt:300,passPct:85.23,remates:6,remAlvo:2,remPct:33.33,cruz:10,cruzCrt:3,cruzPct:30,duelos:169,duelPct:47.93,recup:55,perdas:92,ppda:8.8,intercep:26,ataqPos:23,contraAtaq:0,bpRem:2,toquesArea:8,intensidade:15.82,faltas:15,cartAm:1,cartVm:1,gm:0,gs:0 },
];

const PROX_ADV = { nome:"Fortaleza", data:"21/03", comp:"Série B R1", form:"4-3-3", status:"em_andamento", analista:"Semir", progresso:35 };

const ANALISTAS = [
  { id:1,nome:"Semir",cargo:"Analista",foco:"Individual / Adversário",concluidas:32,total:38,atrasadas:1,qualidade:7.8,tempoMedio:145 },
  { id:2,nome:"Cassio",cargo:"Analista",foco:"Individual / Pós-jogo",concluidas:35,total:40,atrasadas:0,qualidade:8.1,tempoMedio:130 },
];



const TREINOS = [
  { id:1,data:"16/03",tipo:"tatico",intens:"alta",dur:90,obj:"Transição defensiva + compactação",destaque:"Leandro Maciel, Éricson",obs:"Foco pré-Série B" },
  { id:2,data:"14/03",tipo:"tecnico",intens:"media",dur:75,obj:"Finalização + cruzamentos",destaque:"Kelvin Giacobe, Hygor Cléber",obs:"Boa produtividade" },
  { id:3,data:"13/03",tipo:"fisico",intens:"maxima",dur:60,obj:"Resistência + sprints",destaque:"-",obs:"Todos aptos" },
  { id:4,data:"12/03",tipo:"bola_parada",intens:"media",dur:45,obj:"Escanteios ofensivos e defensivos",destaque:"Gustavo Vilar (aéreo)",obs:"Corrigiu vulnerabilidade 1º pau" },
  { id:5,data:"11/03",tipo:"jogo_treino",intens:"alta",dur:90,obj:"Simulação tática — sistema vs Fortaleza",destaque:"Rafael Gava, Wesley Pinheiro",obs:"Time A venceu 2x0" },
  { id:6,data:"10/03",tipo:"tatico",intens:"media",dur:80,obj:"Saída de bola sob pressão + progressão",destaque:"Éverton Morelli",obs:"Revisão modelo de jogo" },
  { id:7,data:"08/03",tipo:"regenerativo",intens:"baixa",dur:40,obj:"Recuperação ativa pós-Paulistão",destaque:"-",obs:"Apenas atletas com +6 jogos" },
];

const MODELO_JOGO = {
  formacao: "4-2-3-1 / 4-3-3",
  principios: [
    { fase: "Ataque Organizado", desc: "Posse orientada com progressão pelos corredores. Laterais com overlap, pontas buscam 1v1. Meia-atacante entre linhas." },
    { fase: "Transição Ofensiva", desc: "Verticalidade imediata. Primeiro passe progressivo. Pontas arrancam no espaço. Centroavante oferece profundidade." },
    { fase: "Defesa Organizada", desc: "Bloco médio-alto. Pressing coordenado por triggers. Compactação entre linhas ≤35m. PPDA alvo: <11." },
    { fase: "Transição Defensiva", desc: "Pressing imediato pós-perda (6s). Se não recuperar, recuar e compactar. Faltas táticas no meio." },
  ],
  ultimaRevisao: "10/03/2026",
  versao: "2.2",
};

const BOLAS_PARADAS = {
  ofensivas: [
    { nome: "Escanteio curto + cruzamento 2º pau", sucesso: "3/12", gols: 1 },
    { nome: "Falta frontal - batida direta", sucesso: "2/8", gols: 1 },
    { nome: "Escanteio fechado 1º pau - desvio", sucesso: "4/16", gols: 0 },
    { nome: "Lateral longo - zona de cabeceio", sucesso: "1/5", gols: 0 },
  ],
  defensivas: [
    { ponto: "Zona do 1º pau vulnerável em escanteios", frequencia: "6 chances sofridas em 8 jogos — CORRIGIDO em treino 12/03" },
    { ponto: "Falta central - barreira desalinhada", frequencia: "1 gol sofrido vs Noroeste (R2)" },
    { ponto: "Segundas bolas em escanteio defensivo", frequencia: "3 chances sofridas — monitorar" },
  ],
};


const PROTOCOLOS = [
  { cat: "Nomenclatura", regra: "[DATA]_[TIPO]_[DETALHE] — Ex: 2026-03-21_adv_fortaleza.pptx" },
  { cat: "Prazos", regra: "Adversário: D-2 | Pós-jogo: D+1 | Dados individuais: D+1 | Preleção: D-1" },
  { cat: "Prioridades", regra: "Urgente: pré-jogo | Alta: pós-jogo | Média: desenvolvimento | Baixa: referência" },
  { cat: "Aprovação", regra: "Todo material externo passa pelo Head Scout antes de sair do departamento" },
  { cat: "Atraso", regra: "Auto-flagged no sistema. 2+ atrasos/mês = conversa formal" },
  { cat: "Confidencialidade", regra: "Materiais não saem sem autorização do Head Scout" },
  { cat: "Plataformas", regra: "Wyscout: tática + clips | InStat: dados físicos | Transfermarkt: mercado" },
];

const CALENDARIO_SERIE_B = [
  {comp:"Série B",rodada:"R1",data:"21/03",adv:"Fortaleza",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R2",data:"01/04",adv:"América-MG",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R3",data:"05/04",adv:"São Bernardo",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R4",data:"10/04",adv:"Criciúma",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R5",data:"19/04",adv:"Atlético-GO",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R6",data:"26/04",adv:"Cuiabá",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R7",data:"03/05",adv:"Náutico",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R8",data:"10/05",adv:"Novorizontino",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R9",data:"17/05",adv:"Goiás",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R10",data:"24/05",adv:"Athletic",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R11",data:"31/05",adv:"Ponte Preta",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R12",data:"10/06",adv:"Vila Nova-GO",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R13",data:"14/06",adv:"Operário-PR",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R14",data:"21/06",adv:"Ceará",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R15",data:"28/06",adv:"CRB",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R16",data:"05/07",adv:"Avaí",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R17",data:"12/07",adv:"Sport",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R18",data:"19/07",adv:"Londrina",local:"F",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
  {comp:"Série B",rodada:"R19",data:"26/07",adv:"Juventude",local:"C",adv_ok:false,pre_ok:false,pos_ok:false,dat_ok:false,wys_ok:false,tre_ok:false,bsp_ok:false,ind_ok:false},
];

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
function DashboardPage({nav,tarefas=[],videos=[]}) {
  const ativos=ATLETAS.filter(a=>a.status==="ativo").length;
  const vit=PARTIDAS.filter(p=>p.res==="V").length;
  const emp=PARTIDAS.filter(p=>p.res==="E").length;
  const der=PARTIDAS.filter(p=>p.res==="D").length;
  const atrasadas=tarefas.filter(t=>t.status==="atrasada");
  const pendentes=tarefas.filter(t=>t.status!=="concluida");
  const chartData=PARTIDAS.map(p=>({j:`vs ${p.adv}`,r:p.res==="V"?3:p.res==="E"?1:0})).reverse();
  const subindo=ATLETAS.filter(a=>a.status==="ativo"&&a.tend==="subindo");

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      <StatCard label="Atletas Ativos" value={ativos} icon={Users}/>
      <StatCard label="Jogos" value={PARTIDAS.length} sub={`${vit}V ${emp}E ${der}D`} icon={Shield} accent={C.green}/>
      <StatCard label="Vídeos" value={videos.length} icon={Video} accent={C.blue}/>
      <StatCard label="Tarefas Pendentes" value={pendentes.length} icon={ClipboardList} accent={C.yellow}/>
      <StatCard label="Atrasadas" value={atrasadas.length} icon={AlertTriangle} accent={atrasadas.length>0?C.red:C.green}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <SH title="Próximo Adversário"/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.red}44`}}><Crosshair size={24} color={C.red}/></div>
          <div style={{flex:1}}>
            <div style={{fontFamily:fontD,fontSize:22,color:C.text,fontWeight:700}}>{PROX_ADV.nome}</div>
            <div style={{fontFamily:font,fontSize:11,color:C.textDim}}>{PROX_ADV.comp} · {PROX_ADV.data} · {PROX_ADV.form}</div>
            <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
              <ProgressBar pct={PROX_ADV.progresso} color={C.yellow}/>
              <span style={{fontFamily:fontD,fontSize:14,color:C.yellow}}>{PROX_ADV.progresso}%</span>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <SH title="Resultados Recentes"/>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={28}>
            <XAxis dataKey="j" tick={{fill:C.textDim,fontSize:9,fontFamily:font}} axisLine={false} tickLine={false}/>
            <Bar dataKey="r" radius={[3,3,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.r===3?C.green:e.r===1?C.yellow:C.red}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
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
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontFamily:font,fontSize:11,color:C.textDim}}>Formação base: <span style={{color:C.gold,fontWeight:700}}>{MODELO_JOGO.formacao}</span></div>
        <div style={{fontFamily:font,fontSize:10,color:C.textDim,marginTop:2}}>Última revisão: {MODELO_JOGO.ultimaRevisao} · Versão {MODELO_JOGO.versao}</div>
      </div>
      <Badge color={C.green}>VIGENTE</Badge>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {MODELO_JOGO.principios.map((p,i)=>{
        const colors=[C.green,C.gold,C.red,C.blue];
        const icons=[Zap,TrendingUp,Shield,ArrowLeft];
        const I=icons[i];
        return <Card key={i}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:6,background:`${colors[i]}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><I size={16} color={colors[i]}/></div>
            <div style={{fontFamily:fontD,fontSize:16,color:colors[i],fontWeight:700,textTransform:"uppercase"}}>{p.fase}</div>
          </div>
          <div style={{fontFamily:font,fontSize:12,color:C.textMid,lineHeight:"1.6"}}>{p.desc}</div>
        </Card>;
      })}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: ADVERSÁRIO
// ═══════════════════════════════════════════════
function AdversarioPage() {
  return <div>
    <Card style={{marginBottom:16,backgroundImage:`linear-gradient(135deg,${C.redDim} 0%,transparent 50%)`}}>
      <SH title="Em Andamento — Próximo Jogo"/>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.red}44`}}><Crosshair size={28} color={C.red}/></div>
        <div style={{flex:1}}>
          <div style={{fontFamily:fontD,fontSize:26,color:C.text,fontWeight:700}}>{PROX_ADV.nome}</div>
          <div style={{fontFamily:font,fontSize:12,color:C.textDim}}>{PROX_ADV.comp} · {PROX_ADV.data} · Formação esperada: {PROX_ADV.form}</div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <ProgressBar pct={PROX_ADV.progresso} color={PROX_ADV.progresso>=80?C.green:C.yellow}/>
            <span style={{fontFamily:fontD,fontSize:16,color:C.yellow}}>{PROX_ADV.progresso}%</span>
          </div>
        </div>
      </div>
    </Card>
    <Card style={{marginBottom:16}}>
      <SH title="Checklist — Análise de Adversário"/>
      {[
        {label:"Jogos do adversário baixados (Wyscout/InStat)",done:true},
        {label:"Formação principal e variações identificadas",done:true},
        {label:"Jogadores-chave + características mapeados",done:false},
        {label:"Pontos fortes analisados",done:false},
        {label:"Vulnerabilidades exploráveis identificadas",done:false},
        {label:"Transições (ofensiva + defensiva) analisadas",done:false},
        {label:"Bolas paradas do adversário (ofensivas + defensivas)",done:false},
        {label:"Clips editados e organizados por tema",done:false},
        {label:"Apresentação montada (PPT/PDF)",done:false},
        {label:"Revisão Head Scout (Caio)",done:false},
        {label:"Entrega ao corpo técnico (D-2)",done:false},
      ].map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<8?`1px solid ${C.border}08`:"none"}}>
          {item.done?<CheckCircle size={14} color={C.green}/>:<Circle size={14} color={C.textDim}/>}
          <span style={{fontFamily:font,fontSize:12,color:item.done?C.textMid:C.text,textDecoration:item.done?"line-through":"none"}}>{item.label}</span>
        </div>
      ))}
    </Card>
    <Card>
      <SH title="Análises Anteriores — Paulistão"/>
      {PARTIDAS.filter(p=>p.adversarioDone).map(p=>(
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:4,marginBottom:4,border:`1px solid ${C.border}`}}>
          <ResBadge r={p.res}/>
          <span style={{fontFamily:fontD,fontSize:16,color:C.text,fontWeight:700,width:50,textAlign:"center"}}>{p.pl}</span>
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
function PrelecaoPage({videos=[]}) {
  const prelecoes=videos.filter(v=>v.tipo==="prelecao");
  return <div>
    <Card style={{marginBottom:16,backgroundImage:`linear-gradient(135deg,${C.purpleDim} 0%,transparent 50%)`}}>
      <SH title="Próxima Preleção"/>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:48,height:48,borderRadius:6,background:`${C.purple}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={22} color={C.purple}/></div>
        <div style={{flex:1}}>
          <div style={{fontFamily:fontD,fontSize:20,color:C.text}}>vs {PROX_ADV.nome} — D-1 (20/03)</div>
          <div style={{fontFamily:font,fontSize:11,color:C.textDim}}>Depende da análise de adversário ({PROX_ADV.progresso}% concluída)</div>
        </div>
        <Badge color={PROX_ADV.progresso>=80?C.yellow:C.textDim}>{PROX_ADV.progresso>=80?"PRONTO P/ MONTAR":"AGUARDANDO ANÁLISE"}</Badge>
      </div>
    </Card>
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
function PartidasPage({videos=[]}) {
  return <div>
    <SH title="Partidas + Pós-Jogo" count={PARTIDAS.length}/>
    {PARTIDAS.map(p=>(
      <Card key={p.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:50,textAlign:"center"}}><ResBadge r={p.res}/></div>
        <div style={{fontFamily:fontD,fontSize:22,color:C.text,fontWeight:700,width:55,textAlign:"center"}}>{p.pl}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:font,fontSize:13,color:C.text,fontWeight:600}}>{p.mand?"Botafogo-SP":p.adv} vs {p.mand?p.adv:"Botafogo-SP"}</div>
          <div style={{fontFamily:font,fontSize:10,color:C.textDim}}>R{p.rod} · {p.data} · {p.form} · xG {p.xg.toFixed(2)} / xGA {p.xgC.toFixed(2)}</div>
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
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <SH title="Ofensivas"/>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:11}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {["Jogada","Taxa","Gols"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",color:C.textDim,fontSize:9,textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>{BOLAS_PARADAS.ofensivas.map((b,i)=>(
            <tr key={i}><td style={{padding:"8px",color:C.text}}>{b.nome}</td><td style={{padding:"8px",color:C.textMid}}>{b.sucesso}</td><td style={{padding:"8px",color:b.gols>0?C.green:C.textDim,fontWeight:b.gols>0?700:400,fontFamily:fontD,fontSize:16}}>{b.gols}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card>
        <SH title="Vulnerabilidades Defensivas"/>
        {BOLAS_PARADAS.defensivas.map((b,i)=>(
          <div key={i} style={{padding:"10px",borderRadius:4,background:C.redDim,border:`1px solid ${C.red}22`,marginBottom:6}}>
            <div style={{fontFamily:font,fontSize:12,color:C.text,fontWeight:600}}>{b.ponto}</div>
            <div style={{fontFamily:font,fontSize:10,color:C.red,marginTop:2}}>{b.frequencia}</div>
          </div>
        ))}
      </Card>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════
// PAGE: TREINOS
// ═══════════════════════════════════════════════
function TreinosPage() {
  const tipoColor={tatico:C.gold,tecnico:C.blue,fisico:C.green,bola_parada:C.purple,jogo_treino:C.cyan,regenerativo:C.yellow};
  return <div>
    <SH title="Sessões de Treino" count={TREINOS.length}/>
    {TREINOS.map(t=>(
      <Card key={t.id} style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"center",minWidth:50}}><div style={{fontFamily:fontD,fontSize:16,color:C.text}}>{t.data}</div></div>
          <div style={{width:6,height:40,borderRadius:3,background:tipoColor[t.tipo]||C.textDim}}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <Badge color={tipoColor[t.tipo]}>{t.tipo.replace("_"," ")}</Badge>
              <Badge color={t.intens==="maxima"?C.red:t.intens==="alta"?C.yellow:t.intens==="media"?C.blue:C.textDim}>{t.intens}</Badge>
              <span style={{fontFamily:font,fontSize:10,color:C.textDim}}>{t.dur} min</span>
            </div>
            <div style={{fontFamily:font,fontSize:12,color:C.text,marginTop:4}}>{t.obj}</div>
            {t.destaque!=="-"&&<div style={{fontFamily:font,fontSize:10,color:C.green,marginTop:2}}>Destaque: {t.destaque}</div>}
            {t.obs&&<div style={{fontFamily:font,fontSize:10,color:C.textDim,marginTop:2}}>{t.obs}</div>}
          </div>
        </div>
      </Card>
    ))}
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
function AtletaDetailPage({id,onBack,videos=[]}) {
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

    <Card style={{marginBottom:14}}><SH title="Partidas Coletivas — Paulistão 2026" count={PARTIDAS.length}/>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:font,fontSize:11}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["R","Adversário","Res","Placar","xG","xGA","Posse%","PPDA"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:C.textDim,fontSize:9,textTransform:"uppercase",fontWeight:600}}>{h}</th>)}</tr></thead>
        <tbody>{PARTIDAS.map((p,i)=>(
          <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=C.bgCardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"8px 10px",color:C.textDim}}>{p.rod}</td>
            <td style={{padding:"8px 10px",color:C.text}}>{p.adv}</td>
            <td style={{padding:"8px 10px"}}><ResBadge r={p.res}/></td>
            <td style={{padding:"8px 10px",color:C.text,fontFamily:fontD,fontSize:14}}>{p.pl}</td>
            <td style={{padding:"8px 10px",color:C.green}}>{p.xg.toFixed(2)}</td>
            <td style={{padding:"8px 10px",color:C.red}}>{p.xgC.toFixed(2)}</td>
            <td style={{padding:"8px 10px",color:C.text}}>{p.posse}%</td>
            <td style={{padding:"8px 10px",color:C.textMid}}>{p.ppda.toFixed(1)}</td>
          </tr>
        ))}</tbody>
      </table>
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
    <div style={{display:"grid",gridTemplateColumns:`repeat(${ANALISTAS.length},1fr)`,gap:14,marginBottom:16}}>
      {ANALISTAS.map(a=>{
        const taxa=Math.round((a.concluidas/a.total)*100);
        const bc=taxa>=85?C.green:taxa>=70?C.yellow:C.red;
        return <Card key={a.id}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><UserCheck size={18} color={C.gold}/></div>
            <div><div style={{fontFamily:font,fontSize:13,color:C.text,fontWeight:700}}>{a.nome}</div><div style={{fontFamily:font,fontSize:9,color:C.textDim,textTransform:"uppercase"}}>{a.cargo} · {a.foco}</div></div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontFamily:font,fontSize:9,color:C.textDim,textTransform:"uppercase"}}>Taxa Conclusão</span>
              <span style={{fontFamily:fontD,fontSize:13,color:bc,fontWeight:700}}>{taxa}%</span>
            </div>
            <ProgressBar pct={taxa} color={bc}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{textAlign:"center",padding:"7px 0",borderRadius:4,background:C.bgInput}}><div style={{fontFamily:fontD,fontSize:16,color:C.text}}>{a.concluidas}/{a.total}</div><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Concluídas</div></div>
            <div style={{textAlign:"center",padding:"7px 0",borderRadius:4,background:a.atrasadas>0?C.redDim:C.bgInput}}><div style={{fontFamily:fontD,fontSize:16,color:a.atrasadas>0?C.red:C.green}}>{a.atrasadas}</div><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Atrasadas</div></div>
            <div style={{textAlign:"center",padding:"7px 0",borderRadius:4,background:C.bgInput}}><Nota v={a.qualidade}/><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Qualidade</div></div>
            <div style={{textAlign:"center",padding:"7px 0",borderRadius:4,background:C.bgInput}}><div style={{fontFamily:fontD,fontSize:16,color:C.text}}>{a.tempoMedio}'</div><div style={{fontFamily:font,fontSize:8,color:C.textDim,textTransform:"uppercase"}}>Tempo Médio</div></div>
          </div>
        </Card>;
      })}
    </div>
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
    <Card>
      <SH title="Protocolos do Departamento"/>
      {PROTOCOLOS.map((p,i)=>(
        <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<PROTOCOLOS.length-1?`1px solid ${C.border}08`:"none"}}>
          <div style={{fontFamily:font,fontSize:11,color:C.gold,fontWeight:700,minWidth:120,textTransform:"uppercase"}}>{p.cat}</div>
          <div style={{fontFamily:font,fontSize:12,color:C.textMid}}>{p.regra}</div>
        </div>
      ))}
    </Card>
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
  const [isDark,setIsDark]=useState(true);
  const sheets = useSheets();

  // Update theme colors before render
  C = isDark ? CDark : CLight;

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),60000);return()=>clearInterval(t)},[]);
  useEffect(()=>{sheets.sync()},[]);// eslint-disable-line

  const partidas = sheets.livePartidas || PARTIDAS;
  const calendario = sheets.liveCalendario || CALENDARIO_SERIE_B;
  const videos = sheets.liveVideos || [];

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
    if(sub==="atleta-detail") return <AtletaDetailPage id={selId} onBack={goBack} videos={videos}/>;
    switch(page){
      case "dashboard": return <DashboardPage nav={nav} tarefas={tarefas} videos={videos}/>;
      case "modelo-jogo": return <ModeloJogoPage/>;
      case "adversario": return <AdversarioPage/>;
      case "prelecao": return <PrelecaoPage videos={videos}/>;
      case "partidas": return <PartidasPage videos={videos}/>;
      case "bolas-paradas": return <BolasParadasPage/>;
      case "treinos": return <TreinosPage/>;
      case "atletas": return <AtletasPage nav={nav}/>;
      case "videos": return <VideosPage videos={videos}/>;
      case "analistas": return <AnalistasPage tarefas={tarefas} addTarefa={addTarefa} updateTarefa={updateTarefa} removeTarefa={removeTarefa} showAddTarefa={showAddTarefa} setShowAddTarefa={setShowAddTarefa}/>;
      case "protocolos": return <ProtocolosPage/>;
      default: return <DashboardPage nav={nav} tarefas={tarefas} videos={videos}/>;
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
                  {item.id==="adversario"&&PROX_ADV.progresso<100&&<span style={{width:16,height:16,borderRadius:"50%",background:C.yellow,color:C.bg,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>!</span>}
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
          {sheets.error && <div style={{fontFamily:font,fontSize:8,color:C.red,textAlign:"center"}}>✗ Erro sync</div>}
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
