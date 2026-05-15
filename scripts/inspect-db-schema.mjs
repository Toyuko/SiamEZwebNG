import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  console.log("Tables:", JSON.stringify(tables, null, 2));

  const enums = await prisma.$queryRaw`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%Role%' OR t.typname LIKE '%Job%' OR t.typname LIKE '%Freelancer%'
    ORDER BY t.typname, e.enumsortorder`;
  console.log("Enums:", enums);

  const count = await prisma.user.count({ where: { role: "freelancer" } });
  console.log("Freelancer users:", count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
