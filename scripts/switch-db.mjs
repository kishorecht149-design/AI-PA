import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

const target = process.argv[2]?.toLowerCase();

if (!target || !["supabase", "postgres", "postgresql", "sqlite"].includes(target)) {
  console.log(`
Usage:
  npm run switch-db supabase   # Switch schema to Supabase (PostgreSQL)
  npm run switch-db sqlite     # Switch schema to Local SQLite
`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, "utf-8");

if (["supabase", "postgres", "postgresql"].includes(target)) {
  // Replace datasource db block with postgresql + directUrl
  const postgresBlock = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

  schema = schema.replace(/datasource db\s*\{[\s\S]*?\}/, postgresBlock);
  fs.writeFileSync(schemaPath, schema, "utf-8");

  console.log("✅ Successfully configured prisma/schema.prisma for Supabase (PostgreSQL)!");
  console.log("   Provider: postgresql");
  console.log("   Connection Pooler URL: DATABASE_URL (Port 6543)");
  console.log("   Direct Migration URL: DIRECT_URL (Port 5432)");
  console.log("\nNext Steps:");
  console.log("1. Add your Supabase DATABASE_URL and DIRECT_URL to your .env file or Vercel Environment Variables.");
  console.log("2. Run 'npx prisma db push' to create all tables in Supabase.");
  console.log("3. Run 'npm run db:seed' to populate your initial data into Supabase.");
} else if (target === "sqlite") {
  const sqliteBlock = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;

  schema = schema.replace(/datasource db\s*\{[\s\S]*?\}/, postgresBlock => sqliteBlock);
  fs.writeFileSync(schemaPath, schema, "utf-8");

  console.log("✅ Successfully configured prisma/schema.prisma for local SQLite!");
  console.log("   Provider: sqlite");
  console.log("   Database: dev.db");
}
