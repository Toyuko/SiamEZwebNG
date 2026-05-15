import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    ORDER BY started_at`;
  console.log("Migrations:", JSON.stringify(migrations, null, 2));

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  console.log("Tables:", tables.map((t) => t.table_name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
