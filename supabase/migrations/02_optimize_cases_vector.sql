-- Optimisation de la recherche vectorielle (pgvector)
-- À adapter si le nom de votre table est différent de 'cases' ou de la colonne de 'embedding'.

CREATE INDEX IF NOT EXISTS cases_embedding_idx ON case_embeddings 
USING hnsw (embedding vector_ip_ops);

-- Note: 
-- 1. On utilise vector_ip_ops (Inner Product) ou vector_cosine_ops (Cosine) ou vector_l2_ops (L2) 
--    en fonction de ce qui est utilisé dans match_case_embeddings.
-- 2. "m" (max_elements) et "ef_construction" peuvent être passés en paramètres pour tuner hsnw,
--    mais les valeurs par défaut sont généralement bonnes.
