-- À lancer une fois dans Supabase (SQL Editor) avant de mettre le site en ligne.
-- Chaque étudiant apparaît sur la carte (prénom, initiale du nom, école, semestre),
-- visible uniquement par les étudiants connectés. Il peut se retirer dans « Mon espace ».
alter table students add column if not exists show_on_map boolean not null default true;
