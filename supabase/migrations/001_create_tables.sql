-- ============================================================
-- Migração inicial: criação das tabelas para o pipeline CME
-- ============================================================

-- Tabela principal de eventos CME
CREATE TABLE IF NOT EXISTS cme_events (
    id BIGSERIAL PRIMARY KEY,
    activity_id TEXT UNIQUE NOT NULL,
    start_time TIMESTAMPTZ,
    source_location TEXT,
    note TEXT,
    instruments JSONB DEFAULT '[]',
    speed NUMERIC,
    type TEXT,
    is_earth_directed BOOLEAN DEFAULT FALSE,
    latitude NUMERIC,
    longitude NUMERIC,
    half_angle NUMERIC,
    link TEXT,
    linked_events JSONB DEFAULT '[]',
    record_hash TEXT UNIQUE NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cme_events_start_time ON cme_events(start_time);
CREATE INDEX IF NOT EXISTS idx_cme_events_speed ON cme_events(speed);
CREATE INDEX IF NOT EXISTS idx_cme_events_earth_directed ON cme_events(is_earth_directed);

-- Tabela de registro de execuções do pipeline
CREATE TABLE IF NOT EXISTS execucoes (
    id BIGSERIAL PRIMARY KEY,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    registros_processados INTEGER DEFAULT 0,
    lotes INTEGER DEFAULT 0,
    erros INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('concluido', 'erro_parcial', 'erro_critico')),
    detalhes TEXT
);

-- Índice para consultas recentes
CREATE INDEX IF NOT EXISTS idx_execucoes_executed_at ON execucoes(executed_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cme_events_updated_at
    BEFORE UPDATE ON cme_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Habilitar RLS nas tabelas
ALTER TABLE cme_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucoes ENABLE ROW LEVEL SECURITY;

-- Políticas para cme_events:
-- Leitura pública (dashboard no navegador com chave anon)
CREATE POLICY "Allow public read access" ON cme_events
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Escrita apenas para service_role (pipeline GitHub Actions)
CREATE POLICY "Allow service_role full access" ON cme_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Políticas para execucoes:
-- Leitura pública (para visualizar histórico de execuções)
CREATE POLICY "Allow public read access" ON execucoes
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Escrita apenas para service_role
CREATE POLICY "Allow service_role full access" ON execucoes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
