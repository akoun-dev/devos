/**
 * task25_set_password.ts — réinitialisation ciblée du mot de passe (SANS toucher
 * au nom/profil). Support INC-003 : le CTO s'est inscrit via l'UI (18:30) avec son
 * propre mot de passe puis a perdu la correspondance ; on repose un secret connu
 * transmis dans le canal privé. Le mot de passe transite UNIQUEMENT par
 * l'environnement TASK25_PW (jamais écrit dans ce fichier versionné).
 * Usage : TASK25_PW="$(...)" bun .zscripts/task25_set_password.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const EMAIL = process.env.TASK25_EMAIL ?? "akoun@devos.test";

async function main() {
  const pw = process.env.TASK25_PW;
  if (!pw || pw.length < 8) {
    throw new Error("TASK25_PW manquante ou trop courte (8 caractères minimum).");
  }
  const existing = await db.user.findUnique({ where: { email: EMAIL } });
  if (!existing) {
    throw new Error(`Compte ${EMAIL} introuvable — utiliser task25_reset_akoun.ts pour le créer.`);
  }
  const passwordHash = await bcrypt.hash(pw, 10);
  await db.user.update({ where: { email: EMAIL }, data: { passwordHash } });
  console.log(`[set-password] OK — ${EMAIL} : mot de passe réinitialisé (name conservé : ${existing.name}).`);
  console.log(`[set-password] hash prefix=${passwordHash.slice(0, 7)} (aucun secret affiché).`);
}

main()
  .catch((e) => {
    console.error("[set-password] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
