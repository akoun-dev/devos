/**
 * scripts/seed.ts — jeu de données initial FEATURE-001.
 * Exécution : `bun scripts/seed.ts` (idempotent : ne crée rien si Task n'est pas vide).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existing = await db.task.count();
  if (existing > 0) {
    console.log(`[seed] Table Task déjà peuplée (${existing} tâche(s)) — rien à faire.`);
    return;
  }

  const now = Date.now();
  const inOneHour = new Date(now + 60 * 60 * 1000); // exactement now + 1 h
  const inTwoHours = new Date(now + 2 * 60 * 60 * 1000);
  const inThreeHours = new Date(now + 3 * 60 * 60 * 1000);

  const created = await Promise.all([
    db.task.create({
      data: {
        title: "Finaliser le déploiement du projet DevOS",
        category: "dev",
        priority: "haute",
        dueAt: inOneHour,
        reminderEnabled: true,
      },
    }),
    db.task.create({
      data: {
        title: "Corriger le problème de synchronisation",
        category: "dev",
        priority: "urgente",
        dueAt: inTwoHours,
      },
    }),
    db.task.create({
      data: {
        title: "Vérifier la synchronisation ordinateur-téléphone",
        category: "general",
        priority: "normale",
        dueAt: inThreeHours,
      },
    }),
  ]);

  // Singleton de préférences vocales (défauts du contrat v1).
  await db.voicePreferences.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("[seed] ✅ 3 tâches créées :");
  for (const task of created) {
    console.log(
      `  - ${task.title} [${task.category}/${task.priority}] dueAt=${task.dueAt?.toISOString() ?? "—"} rappel=${task.reminderEnabled}`,
    );
  }
  console.log("[seed] VoicePreferences singleton 'default' prêt (défauts contrat v1).");
}

main()
  .catch((error) => {
    console.error("[seed] Échec :", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
