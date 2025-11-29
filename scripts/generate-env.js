// scripts/generate-env.js
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

// Carrega o .env da raiz do projeto
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
// aceita SUPABASE_ANON_KEY ou SUPABASE_KEY
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[generate-env] SUPABASE_URL ou SUPABASE_ANON_KEY/KEY não definidos no .env"
  );
  process.exit(1);
}

// Gera o arquivo TypeScript com constantes
const outputDir = path.join(rootDir, "src", "core");
const outputFile = path.join(outputDir, "runtimeEnv.ts");

const fileContent = `// Arquivo gerado automaticamente por scripts/generate-env.js
// NÃO edite manualmente.

export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// AQUI ESTAVA O PROBLEMA: não usar "\\n"
fs.writeFileSync(outputFile, fileContent, {
  encoding: "utf-8",
});

console.log("[generate-env] runtimeEnv.ts gerado com sucesso em", outputFile);
