-- Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Tabela de tarefas
CREATE TABLE tarefas (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  analista VARCHAR(50),
  prazo VARCHAR(10),
  prio VARCHAR(20) DEFAULT 'media',
  tipo VARCHAR(50) DEFAULT 'analise_adversario',
  status VARCHAR(20) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) com acesso público para leitura/escrita
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público tarefas" ON tarefas
  FOR ALL USING (true) WITH CHECK (true);

-- Index para performance
CREATE INDEX idx_tarefas_status ON tarefas(status);
CREATE INDEX idx_tarefas_created ON tarefas(created_at DESC);
