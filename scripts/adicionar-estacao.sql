-- Script SQL para adicionar uma nova estação de impressão
-- Execute este script no console SQL do Supabase

-- 1. Adicionar uma nova estação
INSERT INTO print_stations (name, token, is_active)
VALUES (
  'Estação Bar Principal',           -- Nome da estação
  'bar-principal-2024',              -- Token único (altere para algo único)
  true                               -- Estação ativa
)
RETURNING *;

-- 2. Listar todas as estações cadastradas
SELECT 
  id,
  name,
  token,
  default_printer_name,
  is_active,
  created_at,
  last_seen_at
FROM print_stations
ORDER BY created_at DESC;

-- 3. Atualizar uma estação existente (substitua o UUID)
-- UPDATE print_stations
-- SET 
--   name = 'Novo Nome',
--   default_printer_name = 'Nome da Impressora'
-- WHERE token = 'seu-token-aqui';

-- 4. Desativar uma estação (ao invés de deletar)
-- UPDATE print_stations
-- SET is_active = false
-- WHERE token = 'seu-token-aqui';

-- 5. Verificar jobs de uma estação específica
-- SELECT 
--   pj.id,
--   pj.status,
--   pj.created_at,
--   pj.printed_at,
--   pj.error_message,
--   ps.name as station_name
-- FROM print_jobs pj
-- JOIN print_stations ps ON pj.station_id = ps.id
-- WHERE ps.token = 'seu-token-aqui'
-- ORDER BY pj.created_at DESC
-- LIMIT 10;

-- 6. Criar um job de impressão de teste
-- INSERT INTO print_jobs (station_id, payload, status)
-- VALUES (
--   (SELECT id FROM print_stations WHERE token = 'seu-token-aqui'),
--   E'========================================\n        TESTE DE IMPRESSÃO\n========================================\n\nEste é um teste automático.\nData/Hora: ' || NOW()::TEXT || E'\n\n========================================',
--   'pending'
-- );
