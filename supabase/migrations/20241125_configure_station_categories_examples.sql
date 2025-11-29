-- Configurar exemplos de categorias para as estações existentes

-- Exemplo 1: Estação Cozinha (apenas Comidas)
UPDATE print_stations 
SET categories = ARRAY['Comidas']
WHERE name ILIKE '%cozinha%' OR name ILIKE '%kitchen%';

-- Exemplo 2: Estação Bar (apenas Bebidas)
UPDATE print_stations 
SET categories = ARRAY['Bebidas']
WHERE name ILIKE '%bar%' AND NOT name ILIKE '%teste%';

-- Exemplo 3: Estação Teste (todas as categorias para testes)
UPDATE print_stations 
SET categories = ARRAY['Comidas', 'Bebidas', 'Outros']
WHERE name ILIKE '%teste%';

-- Ver configuração atual
SELECT 
  id,
  name,
  token,
  categories,
  is_active
FROM print_stations
ORDER BY name;
