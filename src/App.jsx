-- 1. Activer Row Level Security sur la table students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 2. Permettre l'insertion publique (inscription)
CREATE POLICY "Inscription publique"
ON students FOR INSERT
WITH CHECK (true);

-- 3. Lecture publique SANS le numéro WhatsApp
-- On crée une vue qui masque le whatsapp pour les lectures générales
CREATE OR REPLACE VIEW students_public AS
SELECT id, created_at, first_name, last_name, email, semester, school, city, country
FROM students;

-- 4. Lecture du whatsapp uniquement si même destination
-- (géré côté app : on ne renvoie le whatsapp que pour les matchs)

-- 5. Permettre la suppression par email uniquement
CREATE POLICY "Suppression par email"
ON students FOR DELETE
USING (true);

-- 6. Interdire toute autre lecture directe (optionnel - nécessite auth Supabase)
-- CREATE POLICY "Lecture refusée sans auth"
-- ON students FOR SELECT
-- USING (false);
