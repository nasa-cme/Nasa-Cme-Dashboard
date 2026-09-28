-- ============================================================
-- Setup inicial do banco de dados Supabase
-- Projeto: DONKI-CME-DB (SN-2026-GRUPO-03-NASA)
-- ============================================================

-- Tabela principal de eventos CME
CREATE TABLE IF NOT EXISTS cme_events (
    id BIGSERIAL PRIMARY KEY,
    activity_id TEXT UNIQUE NOT NULL,
    start_time TIMESTAMPTZ,
    source_location TEXT,
    note TEXT,
    instruments JSONB DEFAULT '[]'::jsonb,
    speed NUMERIC,
    type TEXT,
    is_earth_directed BOOLEAN DEFAULT FALSE,
    latitude NUMERIC,
    longitude NUMERIC,
    half_angle NUMERIC,
    link TEXT,
    linked_events JSONB DEFAULT '[]'::jsonb,
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

DROP TRIGGER IF EXISTS update_cme_events_updated_at ON cme_events;
CREATE TRIGGER update_cme_events_updated_at
    BEFORE UPDATE ON cme_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE cme_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucoes ENABLE ROW LEVEL SECURITY;

-- Políticas para cme_events
DROP POLICY IF EXISTS "Allow public read access" ON cme_events;
CREATE POLICY "Allow public read access" ON cme_events
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access" ON cme_events;
CREATE POLICY "Allow service_role full access" ON cme_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Políticas para execucoes
DROP POLICY IF EXISTS "Allow public read access" ON execucoes;
CREATE POLICY "Allow public read access" ON execucoes
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access" ON execucoes;
CREATE POLICY "Allow service_role full access" ON execucoes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Grants de permissão
-- ============================================================

GRANT SELECT ON cme_events TO anon;
GRANT SELECT ON cme_events TO authenticated;
GRANT ALL ON cme_events TO service_role;

GRANT SELECT ON execucoes TO anon;
GRANT SELECT ON execucoes TO authenticated;
GRANT ALL ON execucoes TO service_role;

-- Grants para sequences (necessários para inserts)
GRANT USAGE, SELECT ON SEQUENCE cme_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE execucoes_id_seq TO service_role;
