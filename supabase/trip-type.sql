-- À lancer une fois dans Supabase (SQL Editor) avant de mettre le site en ligne.
-- Type de départ : échange (université partenaire), freemover (université hors accords) ou stage.
-- Pour un stage, la colonne « school » contient le nom de l'entreprise.
-- lat / lng : coordonnées de la ville, pour la placer sur la carte quand elle n'est pas dans la liste des partenaires.
alter table students add column if not exists trip_type text not null default 'exchange';
alter table students drop constraint if exists students_trip_type_check;
alter table students add constraint students_trip_type_check check (trip_type in ('exchange', 'freemover', 'internship'));
alter table students add column if not exists lat double precision;
alter table students add column if not exists lng double precision;
notify pgrst, 'reload schema';
