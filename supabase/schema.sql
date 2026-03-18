-- ================================================
-- WhoKnows - Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================

-- Games table
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  join_code TEXT UNIQUE NOT NULL,
  phase TEXT DEFAULT 'setup' CHECK (phase IN ('setup', 'lobby', 'question', 'scores', 'finished')),
  current_question_index INTEGER DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  scores_revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  order_index INTEGER NOT NULL
);

-- Saved quizzes (templates)
CREATE TABLE quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  order_index INTEGER NOT NULL
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  total_score NUMERIC(10,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Answers table
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN DEFAULT false,
  score NUMERIC(10,1) DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, question_id)
);

-- ================================================
-- Server-side scoring function (prevents time cheating)
-- Uses server's now() for accurate elapsed-time calculation
-- ================================================
CREATE OR REPLACE FUNCTION submit_answer(
  p_player_id UUID,
  p_question_id UUID,
  p_game_id UUID,
  p_selected_option TEXT
) RETURNS JSON AS $$
DECLARE
  v_correct_option TEXT;
  v_question_started_at TIMESTAMPTZ;
  v_game_phase TEXT;
  v_elapsed NUMERIC;
  v_score NUMERIC;
  v_is_correct BOOLEAN;
  v_existing UUID;
BEGIN
  -- Prevent duplicate answers
  SELECT id INTO v_existing
  FROM answers
  WHERE player_id = p_player_id AND question_id = p_question_id;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('error', 'Already answered');
  END IF;

  -- Verify the game is in question phase
  SELECT phase, question_started_at
  INTO v_game_phase, v_question_started_at
  FROM games
  WHERE id = p_game_id;

  IF v_game_phase != 'question' THEN
    RETURN json_build_object('error', 'Question is not active');
  END IF;

  -- Look up the correct answer
  SELECT correct_option INTO v_correct_option
  FROM questions
  WHERE id = p_question_id;

  IF v_correct_option IS NULL THEN
    RETURN json_build_object('error', 'Question not found');
  END IF;

  -- Calculate elapsed seconds since question started
  v_elapsed := EXTRACT(EPOCH FROM (now() - v_question_started_at));

  -- Determine correctness
  v_is_correct := (p_selected_option = v_correct_option);

  -- Score = remaining time rounded to 0.1s (only if correct and within 20s)
  IF v_is_correct AND v_elapsed <= 20 THEN
    v_score := ROUND(GREATEST(0, 20 - v_elapsed)::NUMERIC, 1);
  ELSE
    v_score := 0;
  END IF;

  -- Insert the answer record
  INSERT INTO answers (player_id, question_id, selected_option, is_correct, score)
  VALUES (p_player_id, p_question_id, p_selected_option, v_is_correct, v_score);

  -- Add score to player total
  IF v_score > 0 THEN
    UPDATE players SET total_score = total_score + v_score
    WHERE id = p_player_id;
  END IF;

  RETURN json_build_object('is_correct', v_is_correct, 'score', v_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Row Level Security (permissive for MVP)
-- ================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write games" ON games
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read/write questions" ON questions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read/write players" ON players
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read/write answers" ON answers
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write quizzes" ON quizzes
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write quiz_questions" ON quiz_questions
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- Enable Realtime on required tables
-- (games for state changes, players for join notifications)
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
