# OHADA Legal Advisor (POC Guinée)

Application Next.js propulsée par Genkit et Gemini pour l'assistance juridique OHADA en Guinée.

## 🚀 Runbook d'installation

### 1. Variables d'environnement
Renseignez les variables suivantes dans votre fichier `.env` ou dans les secrets Firebase App Hosting :

- `SUPABASE_URL` : URL de votre projet Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (admin) de Supabase.
- `GOOGLE_GENAI_API_KEY` : Clé API Google AI (Gemini).

### 2. Initialisation de la base de données
Exécutez les commandes SQL suivantes dans votre éditeur Supabase pour créer les tables et la fonction RPC de recherche vectorielle :

```sql
-- Extension pour les vecteurs
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des cas
CREATE TABLE IF NOT EXISTS cases (
  case_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  country_code TEXT DEFAULT 'GN',
  metadata JSONB
);

-- Table des chunks pour la recherche vectorielle
CREATE TABLE IF NOT EXISTS case_chunks (
  id BIGSERIAL PRIMARY KEY,
  case_id TEXT REFERENCES cases(case_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- Fonction de recherche vectorielle
CREATE OR REPLACE FUNCTION match_cases (
  query_embedding vector(1536),
  query_text TEXT,
  match_count INT DEFAULT 5,
  country_filter TEXT DEFAULT 'GN',
  court_filter TEXT DEFAULT NULL,
  case_type_filter TEXT DEFAULT NULL,
  ohada_act_filter TEXT DEFAULT NULL
) RETURNS TABLE (
  case_id TEXT,
  similarity FLOAT,
  why_similar TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.case_id,
    1 - (cc.embedding <=> query_embedding) AS similarity,
    'Correspondance sémantique avec le texte : ' || substring(query_text, 1, 50) AS why_similar
  FROM case_chunks cc
  JOIN cases c ON cc.case_id = c.case_id
  WHERE c.country_code = country_filter
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Commandes d'exécution
```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

### 4. Indexation des données (Test)
Pour indexer un cas juridique, utilisez le flow Genkit `indexNewCases` via l'interface de développement ou un script interne. 
Cela va chunker le texte (~2500 caractères) et générer les embeddings Gemini.

### 5. Scénario de Test
Copiez-collez ce message dans le chat :
> "Je souhaite créer une SARL en Guinée pour exploiter un local commercial. Quels sont les points de vigilance juridiques majeurs ?"

Le système retournera :
1. Une synthèse humaine.
2. Les cas similaires (ex: Jurisprudence sur le bail commercial ou la création de société).
3. Une checklist d'actions (statuts, enregistrement RCCM, bail, etc.).
4. Les risques (litiges locatifs, défaut de forme).
5. Des citations précises des décisions de justice.
# chat_ohada
