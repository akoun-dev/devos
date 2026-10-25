#!/usr/bin/env python3
"""Mise à jour TASKS.xlsx : clôture TASK-005 (contexte DevOS reçu) + ajout TASK-006 (FEATURE-001, en attente GO)."""
import sys, os

XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from templates.base import style_data_row, style_total_row, font_body
ACCENT_POSITIVE = "1B7D46"
ACCENT_NEGATIVE = "C0392B"
ACCENT_WARNING = "D4820A"
NEUTRAL_600 = "8C8A84"

OUT = "/home/z/my-project/.ai/TASKS.xlsx"
wb = load_workbook(OUT)
ws = wb["TASKS"]

# --- 1) Clôture TASK-005 (row 9) : contexte reçu, exigences enregistrées ---
assert ws.cell(row=9, column=2).value == "TASK-005"
ws.cell(row=9, column=8, value="TERMINÉ")
ws.cell(row=9, column=8).font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_POSITIVE)
ws.cell(row=9, column=8).fill = PatternFill("solid", start_color="E8F5E9", end_color="E8F5E9")
ws.cell(row=9, column=9, value=1.0)
ws.cell(row=9, column=9).number_format = "0%"
ws.cell(row=9, column=14, value="PASS")
ws.cell(row=9, column=19, value="2026-10-25")
ws.cell(row=9, column=20, value="Contexte DevOS reçu ; exigences FR-001→010 + AC-001→012 + analyse d'écart plateforme enregistrées dans REQUIREMENTS.md")

# --- 2) TASK-006 en row 10 (ex-TOTAL), TOTAL déplacé en row 11, note en row 13 ---
task6 = (
    "TASK-006", "PRODUIT", "DevOS — Assistant vocal proactif et rappels intelligents",
    "Lifecycle complet FEATURE-001 (Phase 0 UX → Phase 7 rétro)",
    "Implémentation du module adapté au sandbox web (ReminderScheduler, VoiceAssistantService, NotificationService, TextToSpeechProvider, VoicePreferencesRepository, EventListener, SyncIntegration simulée, AIOrchestrator + fallback préparé) — cf. REQUIREMENTS.md §3 et §5",
    "Équipe complète (Lead + Back + Front + QA + agents qualité)", "À FAIRE", 0.0, "P1",
    "TASK-005", "src/** (à créer) ; prisma/schema.prisma ; .ai/SPECS/FEATURE-001*",
    "Gherkin AC-001→012 + E2E navigateur", "—", 0, "—", "—", "—", "—",
    "DÉCLENCHEMENT UNIQUEMENT À LA RÉCEPTION DU SIGNAL « GO » DU CTO",
)
for j, val in enumerate(task6):
    ws.cell(row=10, column=2 + j, value=val)
style_data_row(ws, 10, 2, 20, 5)
ws.cell(row=10, column=8).font = Font(name=font_body().name, size=10, bold=True, color=NEUTRAL_600)
ws.cell(row=10, column=9, value=0.0)
ws.cell(row=9, column=9).number_format = "0%"
ws.cell(row=10, column=9).number_format = "0%"
ws.cell(row=10, column=9).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=10, column=10).font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_WARNING)
ws.cell(row=10, column=10).alignment = Alignment(horizontal="center", vertical="center")
ws.cell(row=10, column=15).font = Font(name=font_body().name, size=10)  # bugs 0 neutre

total_row = 11
ws.cell(row=total_row, column=2, value="TOTAL")
ws.cell(row=total_row, column=3, value="6 tâches")
ws.cell(row=total_row, column=9, value=round(5 / 6, 4))
ws.cell(row=total_row, column=9).number_format = "0%"
ws.cell(row=total_row, column=15, value=0)
ws.cell(row=total_row, column=20, value="Terminées : 5 · En cours : 0 · À faire : 1 · Bloquées : 0")
style_total_row(ws, total_row, 2, 20)
ws.cell(row=total_row, column=9).number_format = "0%"

note_row = 13
ws.cell(row=12, column=2, value=None)  # purge l'ancienne note (position obsolète)
ws.cell(row=note_row, column=2,
        value="Règles de dépendance : Frontend bloqué tant que contrat API non validé · Backend bloqué sur auth/permissions tant que Security non validé · "
              "Aucune tâche TERMINÉE sans commits propres + revue positive · Frontend : + validation a11y + perf · Aucune livraison PROD sans audit global ≥ 60/100.")
ws.cell(row=note_row, column=2).font = Font(size=9, color=NEUTRAL_600)

# --- 3) STATISTIQUES : recalage des plages (5 lignes de données → H5:H10) ---
ws2 = wb["STATISTIQUES"]
ws2.cell(row=5, column=3, value=6)  # Total tâches
first, last = 5, 10
ws2.cell(row=6, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"TERMINÉ")')
ws2.cell(row=7, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"EN COURS")')
ws2.cell(row=8, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"À FAIRE")')
ws2.cell(row=9, column=3, value=f'=COUNTIF(TASKS!H{first}:H{last},"BLOQUÉ")')
ws2.cell(row=10, column=3, value=f'=SUM(TASKS!O{first}:O{last})')
ws2.cell(row=11, column=3, value=f'=AVERAGE(TASKS!I{first}:I{last})')
ws2.cell(row=11, column=3).number_format = "0%"

wb.save(OUT)

# Vérification
wb2 = load_workbook(OUT)
w = wb2["TASKS"]
print("Row 9 :", w.cell(row=9, column=2).value, "→", w.cell(row=9, column=8).value)
print("Row 10 :", w.cell(row=10, column=2).value, "→", w.cell(row=10, column=8).value, "|", str(w.cell(row=10, column=20).value)[:60])
print("Row 11 :", w.cell(row=11, column=2).value, "|", w.cell(row=11, column=3).value, "| prog", w.cell(row=11, column=9).value)
print("OK")
