-- À lancer une fois dans Supabase (SQL Editor) AVANT de mettre le site en ligne.
-- Enregistre, pour chaque étudiant, s'il accepte que ses données soient
-- transmises ou vendues aux partenaires, et la date de son dernier choix.
-- Par défaut : non (les inscrits actuels n'ont pas donné cet accord).
alter table students add column if not exists partner_consent boolean not null default false;
alter table students add column if not exists partner_consent_at timestamptz;
