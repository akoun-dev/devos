/**
 * fix40_check_users.ts — inspection READ-ONLY de la table User (incident 401).
 * Aucune écriture. Exécution : bun .zscripts/fix40_check_users.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[check] ${users.length} utilisateur(s) :`);
  for (const u of users) {
    const last6 = u.passwordHash.slice(-6);
    console.log(
      `- ${u.email} | name=${u.name ?? "—"} | createdAt=${u.createdAt.toISOString()} | updatedAt=${u.updatedAt.toISOString()} | hash(prefix)=${u.passwordHash.slice(0, 7)}...${last6}`,
    );
  }
  const counts = {
    tasks: await db.task.count(),
    projects: await db.project.count(),
    notes: await db.note.count(),
    conversations: await db.aiConversation.count(),
    automations: await db.automation.count(),
  };
  console.log(`[check] compteurs : ${JSON.stringify(counts)}`);
}

main()
  .catch((e) => {
    console.error("[check] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
