-- ============================================================================
-- Dados de referência (times e cidades pré-definidos nos formulários)
-- Execute depois do schema.sql
-- ============================================================================

insert into public.teams (name) values
  ('Avulso'),
  ('Ai que Fome (Tiete)'),
  ('Alcatéia'),
  ('Ecort (Tiete)'),
  ('Luso'),
  ('Runners Sempre Jovens'),
  ('Spazio'),
  ('Team Dani'),
  ('Time Runners (Tiete)'),
  ('Tribo')
on conflict (name) do nothing;

insert into public.cities (name) values
  ('Laranjal Paulista'),
  ('Cerquilho'),
  ('Cesário Lange'),
  ('Conchas'),
  ('Jumirim'),
  ('Pereiras'),
  ('Tiete')
on conflict (name) do nothing;
