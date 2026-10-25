/**
 * scripts/seed.ts — jeu de données initial FEATURE-001 (adapté au schéma multi-utilisateurs FEATURE-AUTH — DEBT-022).
 * Exécution : `bun scripts/seed.ts` (idempotent : ne crée rien si Task n'est pas vide).
 * Les tâches de démonstration sont attachées à un utilisateur de démo dédié (demo@devos.test).
 * Politique DEBT-020 : ce compte de démonstration est documenté et doit être purgé avant
 * toute exposition production réelle.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@devos.test";

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

  // Utilisateur de démonstration — Task.userId et VoicePreferences.userId sont requis depuis FEATURE-AUTH.
  const passwordHash = await bcrypt.hash("DevOS-demo-2026", 10);
  const demoUser = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Démo DevOS", passwordHash },
  });

  const created = await Promise.all([
    db.task.create({
      data: {
        title: "Finaliser le déploiement du projet DevOS",
        category: "dev",
        priority: "haute",
        dueAt: inOneHour,
        reminderEnabled: true,
        userId: demoUser.id,
      },
    }),
    db.task.create({
      data: {
        title: "Corriger le problème de synchronisation",
        category: "dev",
        priority: "urgente",
        dueAt: inTwoHours,
        userId: demoUser.id,
      },
    }),
    db.task.create({
      data: {
        title: "Vérifier la synchronisation ordinateur-téléphone",
        category: "general",
        priority: "normale",
        dueAt: inThreeHours,
        userId: demoUser.id,
      },
    }),
  ]);

  // Préférences vocales du compte de démo (défauts du contrat v1 — upsert par userId unique).
  await db.voicePreferences.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id },
  });

  console.log(`[seed] ✅ Utilisateur de démo : ${demoUser.email}`);
  console.log("[seed] ✅ 3 tâches créées :");
  for (const task of created) {
    console.log(
      `  - ${task.title} [${task.category}/${task.priority}] dueAt=${task.dueAt?.toISOString() ?? "—"} rappel=${task.reminderEnabled}`,
    );
  }
  console.log("[seed] VoicePreferences du compte de démo prêt (défauts contrat v1).");
}

main()
  .catch((error) => {
    console.error("[seed] Échec :", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
