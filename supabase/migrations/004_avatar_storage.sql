-- Migration 004: Avatar Storage & RLS
-- Create avatars bucket (assumes extensions are loaded)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
-- 1. Permettre la lecture publique (si public=true)
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- 2. Permettre l'upload/delete uniquement par le propriétaire (basé sur le path user_id)
-- Structure: avatars/company_id/user_id/avatar.png
CREATE POLICY "User Avatar Ownership" ON storage.objects
    FOR ALL USING (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL 
        AND (storage.foldername(name))[2] = auth.uid()::text
    );
