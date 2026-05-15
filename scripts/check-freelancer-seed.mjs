import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: "freelancer@example.com" },
    include: { freelancerProfile: true },
  });
  console.log(u ? JSON.stringify(u, null, 2) : "NOT FOUND");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
