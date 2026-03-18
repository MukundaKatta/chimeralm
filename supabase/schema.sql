-- ChimeraLM Database Schema for Supabase

-- Architectures table
CREATE TABLE IF NOT EXISTS architectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    layers JSONB NOT NULL DEFAULT '[]',
    total_params BIGINT DEFAULT 0,
    estimated_flops DOUBLE PRECISION DEFAULT 0,
    estimated_memory BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE architectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own architectures"
    ON architectures FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own architectures"
    ON architectures FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own architectures"
    ON architectures FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own architectures"
    ON architectures FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Research papers table
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors TEXT[] DEFAULT '{}',
    abstract TEXT DEFAULT '',
    url TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper annotations table
CREATE TABLE IF NOT EXISTS paper_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    highlight TEXT DEFAULT '',
    position JSONB DEFAULT '{"page": 1, "x": 0, "y": 0}',
    parent_id UUID REFERENCES paper_annotations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paper_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view annotations"
    ON paper_annotations FOR SELECT
    USING (true);

CREATE POLICY "Users can insert annotations"
    ON paper_annotations FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Data mix configurations
CREATE TABLE IF NOT EXISTS data_mix_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    components JSONB NOT NULL DEFAULT '[]',
    total_tokens DOUBLE PRECISION DEFAULT 0,
    curriculum_stages JSONB DEFAULT '[]',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_mix_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data mixes"
    ON data_mix_configs FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_architectures_user ON architectures(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_paper ON paper_annotations(paper_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user ON paper_annotations(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER architectures_updated_at
    BEFORE UPDATE ON architectures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER data_mix_configs_updated_at
    BEFORE UPDATE ON data_mix_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
