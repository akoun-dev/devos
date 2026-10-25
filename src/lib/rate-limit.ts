/**
 * rate-limit.ts — limiteur de débit mémoire (durcissement sécurité pré-prod, DEBT-021).
 *
 * Fenêtre fixe en mémoire locale du process (pile « Local memory caching » du
 * projet — zéro middleware applicatif, zéro dépendance externe).
 *
 * Limites de portée documentées (posture sandbox, cf. ADR-003 / AUDIT-002) :
 *  - mono-processus : si déploiement multi-instances, déplacer le contrôle côté
 *    passerelle (Caddy `rate_limit`) ou vers un store partagé ;
 *  - purge paresseuse : les fenêtres expirées ne sont balayées qu'au franchissement
 *    d'un seuil de taille (aucun timer en tâche de fond) ;
 *  - l'IP provient du premier saut de `x-forwarded-for` (posé par la passerelle),
 *    repli « local » pour un accès direct sans passerelle.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Au-delà de ce nombre d'entrées, un balayage des fenêtres expirées est déclenché. */
const PRUNE_THRESHOLD = 5_000;

export interface RateLimitVerdict {
  allowed: boolean;
  /** Secondes à attendre avant la prochaine tentative (0 si autorisé). */
  retryAfterSec: number;
  /** Tentatives restantes dans la fenêtre courante. */
  remaining: number;
}

/** IP cliente (premier saut x-forwarded-for) ou « local » si absent (accès direct). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "local";
}

/** Arbitre une tentative pour une clé donnée dans une fenêtre fixe (limite, durée). */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitVerdict {
  const now = Date.now();

  if (buckets.size >= PRUNE_THRESHOLD) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return { allowed: true, retryAfterSec: 0, remaining: limit - bucket.count };
}
