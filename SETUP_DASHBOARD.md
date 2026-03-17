# PASSO A PASSO — Dashboard Panther Performance

## O que você vai ter rodando

```
Google Sheets (dados Wyscout) ──→ React Dashboard (localhost:3000)
       ↕ sync ao vivo              ↕ fallback hardcoded
   Planilha publicada           panther_performance.jsx
```

O dashboard puxa dados direto da sua planilha Google Sheets publicada. Sem backend necessário para a fase inicial.

---

## PASSO 1 — Instalar Node.js

Se ainda não tem:

**Mac:**
```bash
brew install node
```

**Windows:** Baixar em https://nodejs.org (LTS)

**Verificar:**
```bash
node -v   # ≥ 18
npm -v    # ≥ 9
```

---

## PASSO 2 — Criar projeto React

```bash
npx create-react-app panther-performance
cd panther-performance
```

---

## PASSO 3 — Instalar dependências

```bash
npm install recharts lucide-react
```

---

## PASSO 4 — Copiar o componente

Copie o arquivo `panther_performance.jsx` para dentro de `src/`:

```bash
cp /caminho/para/panther_performance.jsx src/PantherPerformance.jsx
```

---

## PASSO 5 — Configurar App.js

Abra `src/App.js` e substitua TODO o conteúdo por:

```javascript
import React from 'react';
import PantherPerformance from './PantherPerformance';

function App() {
  return <PantherPerformance />;
}

export default App;
```

---

## PASSO 6 — Configurar CSS

Abra `src/index.css` e substitua TODO o conteúdo por:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background-color: #090b0f;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.6;
}
html, body, #root { width: 100%; height: 100%; }
```

---

## PASSO 7 — Rodar

```bash
npm start
```

Abre automaticamente em **http://localhost:3000**

---

## PASSO 8 — Sincronizar com Google Sheets

O dashboard já está conectado à sua planilha publicada. Na sidebar (canto inferior esquerdo), existe o botão **"Sync Google Sheets"**.

Ao clicar:
- Puxa aba **Coletivo** (dados de partida Wyscout Team Stats)
- Puxa aba **Calendário** (controle de processos por rodada)
- Atualiza o dashboard em tempo real

**Pré-requisito:** A planilha deve estar publicada na web:
1. Google Sheets → Arquivo → Compartilhar → Publicar na web
2. Selecionar "Documento inteiro" → "CSV"
3. A URL base já está hardcoded no JSX

---

## Estrutura final

```
panther-performance/
├── public/
│   └── index.html
├── src/
│   ├── PantherPerformance.jsx   ← componente principal (996 linhas)
│   ├── App.js                   ← wrapper (5 linhas)
│   ├── index.css                ← tema dark
│   └── index.js                 ← entry point (não mexer)
└── package.json
```

---

## Checklist pós-setup

- [ ] Tema dark (#090b0f) com dourado (#c9a227) aparece
- [ ] Fonts JetBrains Mono + Oswald carregam (verificar DevTools → Network)
- [ ] 12 módulos navegáveis na sidebar esquerda
- [ ] 37 atletas listados em ELENCO → Atletas
- [ ] 8 partidas do Paulistão em OPERACIONAL → Partidas
- [ ] Charts (barras, radar, área) renderizando
- [ ] Botão "Sync Google Sheets" funciona e mostra ✓ com horário
- [ ] Série B R1 (Fortaleza, 21/03) aparece no dashboard como próximo adversário

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `npm start` falha | Deletar `node_modules` + `package-lock.json`, rodar `npm install` |
| Porta 3000 em uso | `lsof -i :3000` → `kill -9 PID` |
| Fonts não carregam | Normal em primeira carga — fonts são importadas via CSS no JSX |
| Sync Google Sheets falha | Verificar que a planilha está publicada na web (passo 8) |
| Charts vazios | Verificar console do browser (F12) para erros de dados |
| Tela branca | Verificar que `App.js` importa `PantherPerformance` corretamente |

---

## Próxima fase (opcional): Backend + PostgreSQL

Quando quiser persistência, histórico e endpoints REST:

1. Instalar PostgreSQL: `brew install postgresql@15`
2. Criar banco: `CREATE DATABASE bfsa_performance;`
3. Rodar schema: `psql -f performance_schema.sql`
4. Rodar FastAPI: `uvicorn backend_api:app --reload`
5. Swagger em http://localhost:8000/docs
6. Importar XLSX: `curl -X POST http://localhost:8000/api/importar/xlsx -F "file=@BFSA_Dados_2026.xlsx"`

Arquivos necessários (já entregues): `backend_api.py`, `performance_schema.sql`
