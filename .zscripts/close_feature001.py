#!/usr/bin/env python3
"""Clôture FEATURE-001 dans TASKS.xlsx (Task ID 19/20 — AGENT DOC+COMMIT+QA).
- TASK-006 → TERMINÉ 100% PASS
- Ajout TASK-007→014 (jalons M1→M7 + Phase 5/6), Epic=PRODUIT, 19 colonnes
- TOTAL recalculé (14 tâches, 100%) + purge de la note dupliquée (bug cosmétique latent)
- STATISTIQUES recalées (plages H/I/O 5..18, dette à jour)
"""
import sys, os

XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from templates.base import style_data_row, style_total_row, font_body

ACCENT_POSITIVE = "1B7D46"
ACCENT_WARNING = "D4820A"
NEUTRAL_600 = "8C8A84"

OUT = "/home/z/my-project/.ai/TASKS.xlsx"
wb = load_workbook(OUT)
ws = wb["TASKS"]

FEAT = "DevOS — Assistant vocal proactif"
REVIEW = "REV-003 APPROUVÉE"
DAY = "2026-10-25"

# (ID, Sous-tâche, Description, Rôle, Dépendance, Fichiers, Tests, Résultat, Commits, Commentaires)
NEW = [
    ("TASK-007", "M1 — Préférences vocales (schéma + API + UI 9 réglages)",
     "Modèle VoicePreferences (singleton, défauts actifs AC-001), GET/PUT /api/voice-preferences (Zod strict), écran Paramètres 9 réglages FR-006 persistés serveur + miroir localStorage",
     "Backend+Frontend", "TASK-006 (contrat API v1)",
     "prisma/schema.prisma; src/app/api/voice-preferences/; src/components/assistant/settings-screen.tsx; src/hooks/use-voice-assistant.ts",
     "curl PUT prefs (400 invalide) + E2E réglages persistés vérifiés après reload (AC-005)",
     "PASS", "7ddb0c9 + f2485b5",
     "Volume 0..1, offsets 1..10080, HH:mm, jours CSV validés serveur"),
    ("TASK-008", "M2 — Scheduler + Notifications (tick, dédup, Web Notifications)",
     "POST /api/assistant/tick (état dérivé, ADR-002), hook client tick 30 s + tick immédiat, Web Notifications API permission explicite + bannière, dédup ReminderLog",
     "Backend+Frontend", "TASK-007",
     "src/lib/assistant/scheduler.ts; src/app/api/assistant/tick/; src/lib/assistant/notifications.ts; src/hooks/use-voice-assistant.ts",
     "tick idempotent ×2 (2e = []) + E2E rappel « dans 15 minutes » (AC-002) + anti-frénésie new_task 29 s (FR-002)",
     "PASS", "7ddb0c9 + f2485b5",
     "Raison anti_frenesie tracée en DB ; fenêtre de grâce 15 min"),
    ("TASK-009", "M3 — TTS Web Speech + messages préparés",
     "File speechSynthesis séquentielle (voix locales, zéro réseau), templates FR ×3 styles fidèles aux faits, reformulation LLM optionnelle",
     "Frontend", "TASK-007, TASK-008",
     "src/lib/assistant/{tts,templates}.ts; src/lib/assistant/ai.ts; src/components/assistant/assistant-panel.tsx",
     "E2E annonces prononcées + test-voice (AC-004 : 3 styles + reformulation IA fidèle aux faits)",
     "PASS", "f2485b5",
     "Repli toast si synthèse indisponible ; jamais de crash si API absente"),
    ("TASK-010", "M4 — EventListener tâches/échéances/priorités",
     "Annonces new_task / deadline / priority générées par le tick (types séparés, bucket priorité 1/jour/tâche, catégorie autorisée)",
     "Backend", "TASK-008",
     "src/lib/assistant/scheduler.ts; src/app/api/tasks/**",
     "E2E 3 types d'annonces séparés (AC-003) + priorités (AC-012)",
     "PASS", "7ddb0c9",
     "Recalcul automatique après mutation tâche (AC-007 : terminée → plus rien)"),
    ("TASK-011", "M5 — Heures silencieuses + anti-doublons",
     "Heures silencieuses wrap minuit + jours CSV, override urgences, spoken=false jamais rejouée, anti-doublons @@unique([taskId,type,scheduledFor]) + snooze→retrigger",
     "Backend+QA", "TASK-008",
     "src/lib/assistant/{scheduler,quiet-hours}.ts; prisma/schema.prisma (ReminderLog)",
     "E2E 70 s / 2+ ticks sans doublon (AC-008) + badge « Silencieux — non prononcée » + DB status='expire' (AC-009)",
     "PASS", "7ddb0c9",
     "Snooze UI → DB status='reporte' + snoozedUntil, re-déclenchement à l'échéance"),
    ("TASK-012", "M6 — AIOrchestrator LLM + fallback templates",
     "Reformulation LLM serveur (z-ai SDK), prompt système strict anti-invention, timeout 4 s, fallback template automatique, privacyMode (faits filtrés)",
     "Backend+Sécurité", "TASK-008, TASK-009",
     "src/lib/assistant/ai.ts; src/lib/assistant/templates.ts",
     "test-voice source ia/template + fallback 429 observé → template (AC-012 : templates d'abord, LLM décoratif)",
     "PASS", "7ddb0c9",
     "3 bugs corrigés en revue interne : 429 séquentiel, fuite privacyMode, urgent retrigger"),
    ("TASK-013", "M7 — Sync + ADR arrière-plan Android/Linux (documenté)",
     "Sandbox : sync = état dérivé recalculé par tick ; arrière-plan natif Android (WorkManager/AlarmManager) et Linux (systemd) non réalisables ici → ADR-001 documenté, aucune simulation trompeuse",
     "TechLead+Doc", "ADR-001, ADR-002",
     ".ai/ADR/ADR-001-adaptation-plateforme.md; .ai/ADR/ADR-002-scheduler-independant-ia.md",
     "Revue documentaire ADR-001 (AC-011 = N/A justifié, hors sandbox)",
     "N/A justifié", "docs — session clôture",
     "ADR cible Flutter à produire dans le dépôt cible"),
    ("TASK-014", "Phase 5/6 — E2E navigateur + journaux + commits",
     "Campagne E2E navigateur FEATURE-001 (AC-002→005, 008→010, 012, FR-002 ; mobile 390px, 0 erreur console/page), journaux (TEST_PLAN, REVIEW_LOG, CHANGELOG, DAILY_STANDUP, TEAM_STATUS), TASKS.xlsx/md, session de commits conventionnels",
     "QA+DOC+COMMIT", "TASK-007→013, REV-003",
     ".ai/TEST_PLAN.md; .ai/REVIEW_LOG.md; .ai/CHANGELOG.md; .ai/TASKS.xlsx; .ai/COMMIT_LOG.md; worklog.md",
     "E2E agent-browser complet + validate xlsx passed + git log conventionnel",
     "PASS", "7ddb0c9, f2485b5, eb1a3d9 + docs",
     "Lint exit 0 · tsc 0 erreur · headers sécurité actifs · GET / 200"),
]

# --- 1) Clôture TASK-006 (row 10) ---
assert ws.cell(row=10, column=2).value == "TASK-006", f"TASK-006 attendu, trouvé {ws.cell(row=10, column=2).value}"
ws.cell(row=10, column=8, value="TERMINÉ")
ws.cell(row=10, column=8).font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_POSITIVE)
ws.cell(row=10, column=8).fill = PatternFill("solid", start_color="E8F5E9", end_color="E8F5E9")
ws.cell(row=10, column=9, value=1.0)
ws.cell(row=10, column=9).number_format = "0%"
ws.cell(row=10, column=14, value="PASS")
ws.cell(row=10, column=16, value="7ddb0c9, f2485b5, eb1a3d9 + docs")
ws.cell(row=10, column=17, value=REVIEW)
ws.cell(row=10, column=19, value=DAY)
ws.cell(row=10, column=20, value="FEATURE-001 livrée de bout en bout (M1→M7) ; E2E navigateur validé avec preuves ; revue REV-003 approuvée")

# --- 1bis) Purge de la note dupliquée (bug latent : rows 12/13 identiques) et de l'ancienne ligne TOTAL (row 11, sera recalée en 19) ---
for r in (11, 12, 13, 14):
    for c in range(2, 21):
        ws.cell(row=r, column=c).value = None  # NB : cell(..., value=None) est un no-op openpyxl

# --- 2) Ajout TASK-007→014 (rows 11..18) ---
start = 11
for i, (tid, sub, desc, role, dep, files, tests, res, commits, com) in enumerate(NEW):
    r = start + i
    assert ws.cell(row=r, column=2).value is None, f"Row {r} non libre : {ws.cell(row=r, column=2).value}"
    ws.cell(row=r, column=2, value=tid)
    ws.cell(row=r, column=3, value="PRODUIT")
    ws.cell(row=r, column=4, value=FEAT)
    ws.cell(row=r, column=5, value=sub)
    ws.cell(row=r, column=6, value=desc)
    ws.cell(row=r, column=7, value=role)
    ws.cell(row=r, column=8, value="TERMINÉ")
    ws.cell(row=r, column=9, value=1.0)
    ws.cell(row=r, column=10, value="P1")
    ws.cell(row=r, column=11, value=dep)
    ws.cell(row=r, column=12, value=files)
    ws.cell(row=r, column=13, value=tests)
    ws.cell(row=r, column=14, value=res)
    ws.cell(row=r, column=15, value=0)
    ws.cell(row=r, column=16, value=commits)
    ws.cell(row=r, column=17, value=REVIEW)
    ws.cell(row=r, column=18, value=DAY)
    ws.cell(row=r, column=19, value=DAY)
    ws.cell(row=r, column=20, value=com)
    style_data_row(ws, r, 2, 20, 5 + 1 + i)  # banding après TASK-006 (index 5)
    # Style statut
    ws.cell(row=r, column=8).font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_POSITIVE)
    ws.cell(row=r, column=8).fill = PatternFill("solid", start_color="E8F5E9", end_color="E8F5E9")
    # Progression centrée %
    ws.cell(row=r, column=9).number_format = "0%"
    ws.cell(row=r, column=9).alignment = Alignment(horizontal="center", vertical="center")
    # Priorité
    ws.cell(row=r, column=10).font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_WARNING)
    ws.cell(row=r, column=10).alignment = Alignment(horizontal="center", vertical="center")
    # Résultat test : N/A en neutre, PASS en vert
    if res != "PASS":
        ws.cell(row=r, column=14).font = Font(name=font_body().name, size=10, bold=True, color=NEUTRAL_600)

last_data_row = start + len(NEW) - 1  # 18

# --- 3) TOTAL (row 19) + purge note dupliquée (rows 12/13) + note unique (row 21) ---
total_row = last_data_row + 1
n_tasks = 5 + 1 + len(NEW)  # 001..005 + 006 + nouveaux = 14
avg = round(sum(1.0 for _ in range(n_tasks)) / n_tasks, 4)
ws.cell(row=total_row, column=2, value="TOTAL")
ws.cell(row=total_row, column=3, value=f"{n_tasks} tâches")
ws.cell(row=total_row, column=9, value=avg)
ws.cell(row=total_row, column=9).number_format = "0%"
ws.cell(row=total_row, column=15, value=0)
ws.cell(row=total_row, column=20, value="Terminées : 14 · En cours : 0 · À faire : 0 · Bloquées : 0")
style_total_row(ws, total_row, 2, 20)
ws.cell(row=total_row, column=9).number_format = "0%"

# Purge de la note dupliquée (bug latent : rows 12 et 13 identiques) puis note unique après le TOTAL
for r in (12, 13, 14):
    ws.cell(row=r, column=2, value=None)
note_row = total_row + 2
ws.cell(row=note_row, column=2,
        value="Règles de dépendance : Frontend bloqué tant que contrat API non validé · Backend bloqué sur auth/permissions tant que Security non validé · "
              "Aucune tâche TERMINÉE sans commits propres + revue positive · Frontend : + validation a11y + perf · Aucune livraison PROD sans audit global ≥ 60/100.")
ws.cell(row=note_row, column=2).font = Font(size=9, color=NEUTRAL_600)

# --- 4) STATISTIQUES : plages recalées H/I/O 5..18 ---
ws2 = wb["STATISTIQUES"]
first, last = 5, last_data_row
ws2.cell(row=5, column=3, value=n_tasks)
ws2.cell(row=6, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"TERMINÉ")')
ws2.cell(row=7, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"EN COURS")')
ws2.cell(row=8, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"À FAIRE")')
ws2.cell(row=9, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"BLOQUÉ")')
ws2.cell(row=10, column=3, value=f'=SUM(TASKS!O{first}:O{last})')
ws2.cell(row=11, column=3, value=f'=AVERAGE(TASKS!I{first}:I{last})')
ws2.cell(row=11, column=3).number_format = "0%"
ws2.cell(row=12, column=3, value="70 / 100 (AUDIT-001) · AUDIT-002 pending")
ws2.cell(row=13, column=3, value=15)
ws2.cell(row=13, column=4, value=".ai/DEBT_REPORT.md (11 TRAITÉ · 2 EN COURS · 1 REPORTÉ · 1 ACCEPTÉE)")

wb.save(OUT)

# --- 5) Vérification programmatique ---
wb2 = load_workbook(OUT)
w = wb2["TASKS"]
ids = [w.cell(row=r, column=2).value for r in range(5, last_data_row + 1)]
assert ids == [f"TASK-{i:03d}" for i in range(1, 15)], ids
statuts = [w.cell(row=r, column=8).value for r in range(5, last_data_row + 1)]
assert all(s == "TERMINÉ" for s in statuts), statuts
print("Rows TASKS :", ids)
print("TOTAL :", w.cell(row=total_row, column=3).value, "| prog", w.cell(row=total_row, column=9).value,
      "|", w.cell(row=total_row, column=20).value)
print("Note rows 12/13/14 purgées :", [w.cell(row=r, column=2).value for r in (12, 13, 14)])
print("STATISTIQUES : total", wb2["STATISTIQUES"].cell(row=5, column=3).value,
      "| dette", wb2["STATISTIQUES"].cell(row=13, column=3).value,
      "|", wb2["STATISTIQUES"].cell(row=13, column=4).value)
print("OK")
