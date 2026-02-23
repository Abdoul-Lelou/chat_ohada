-- Création de la table chat_history connectée à Auth Supabase
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation de la sécurité RLS (Row Level Security)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (L'utilisateur ne peut voir/modifier que ses propres historiques)
CREATE POLICY "Users can view their own history" ON chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history" ON chat_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON chat_history FOR DELETE USING (auth.uid() = user_id);
