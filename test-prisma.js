const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.event.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());