-- 영어회화 기록 저장을 위한 테이블 생성 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. 사용자 프로필 테이블 (auth.users와 연결)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 대화 기록 테이블
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_timestamp ON conversation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_timestamp ON conversation_logs(user_id, timestamp DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- 프로필 조회 정책: 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- 프로필 수정 정책: 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 프로필 생성 정책: 자신의 프로필만 생성 가능
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 대화 기록 조회 정책: 자신의 기록만 조회 가능
CREATE POLICY "Users can view own conversation logs"
    ON conversation_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 대화 기록 생성 정책: 자신의 기록만 생성 가능
CREATE POLICY "Users can insert own conversation logs"
    ON conversation_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 대화 기록 삭제 정책: 자신의 기록만 삭제 가능
CREATE POLICY "Users can delete own conversation logs"
    ON conversation_logs FOR DELETE
    USING (auth.uid() = user_id);

-- 프로필 자동 생성 함수 (회원가입 시 자동으로 프로필 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (auth.users에 새 사용자가 생성될 때 프로필 자동 생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
