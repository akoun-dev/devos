/**
 * task25_reset_akoun.ts — recréation du compte CTO après perte de la base (INC-003).
 * Le mot de passe est transmis via variable d'environnement TASK25_PW (JAMAIS en dur
 * dans ce fichier, qui est versionné) : PW="$(...)" bun .zscripts/task25_reset_akoun.ts
 * Hash bcryptjs coût 10 — identique à src/lib/auth.ts (BCRYPT_COST).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const EMAIL = "akoun@devos.test";

async function main() {
  const pw = process.env.TASK25_PW;
  if (!pw || pw.length < 12) {
    throw new Error("TASK25_PW manquante ou trop courte (12 caractères minimum).");
  }
  const passwordHash = await bcrypt.hash(pw, 10);
  const user = await db.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, name: "Akoun" },
    create: { email: EMAIL, name: "Akoun", passwordHash },
  });
  console.log(`[reset] OK — compte ${user.email} (name=${user.name}) prêt.`);
  console.log(`[reset] hash prefix=${passwordHash.slice(0, 7)} (aucun secret affiché).`);
}

main()
  .catch((e) => {
    console.error("[reset] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
