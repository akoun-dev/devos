#!/usr/bin/env python3
"""Génération de TASKS.xlsx — Backlog central du système multi-agents.
Conforme au skill xlsx (templates/base.py) et au protocole section 5 (19 colonnes).
"""
import sys, os

XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.styles import Font, Alignment, PatternFill
from templates.base import (
    setup_sheet, style_header_row, style_data_row, style_total_row,
    auto_fit_columns, font_body, font_caption,
    ACCENT_POSITIVE, ACCENT_WARNING, ACCENT_NEGATIVE, NEUTRAL_600,
    PRIMARY,
)

OUT = "/home/z/my-project/.ai/TASKS.xlsx"

HEADERS = [
    "ID", "Epic", "Fonctionnalité", "Sous-tâche", "Description",
    "Rôle Assigné", "Statut", "Progression", "Priorité",
    "Dépendance Inter-Agents", "Fichiers concernés", "Tests",
    "Résultat test", "Bugs", "Commits liés", "Review Status",
    "Date début", "Date fin", "Commentaires",
]

ROWS = [
    ("TASK-001", "BOOTSTRAP", "Prise en charge du projet", "Analyse complète du codebase",
     "Scan arborescence + lecture fichiers critiques (package.json, page.tsx, layout.tsx, api/route.ts, schema.prisma, db.ts, next.config.ts, Caddyfile, eslint.config.mjs, globals.css) + vérification runtime (dev.log, GET / 200)",
     "Tech Lead (Agent 1)", "TERMINÉ", 1.0, "P1",
     "Aucune", "package.json; src/app/*; prisma/schema.prisma; src/lib/db.ts; next.config.ts; eslint.config.mjs; Caddyfile",
     "Inspection manuelle + smoke tests S1-S4", "PASS", 0,
     "— (lecture seule)", "NON REQUISE (analyse)", "2026-10-25", "2026-10-25",
     "Projet = scaffold vierge sans code métier. Constats tracés dans PROJECT_CONTEXT.md §6"),
    ("TASK-002", "BOOTSTRAP", "Prise en charge du projet", "Dossier de pilotage .ai/ (gouvernance)",
     "Création des 30+ fichiers de gouvernance : contexte, architecture, contrats API, design system, guides a11y/perf, journaux, handoffs, ADR, workflows",
     "Tech Lead (Agent 1) + Doc", "TERMINÉ", 1.0, "P1",
     "TASK-001", ".ai/** (30+ fichiers)", "Revue cohérence interne", "PASS", 0,
     "— (non commité à ce stade)", "EN COURS (demandée à Reviewer)", "2026-10-25", "2026-10-25",
     "Conformité à la structure exigée par le protocole (section 4)"),
    ("TASK-003", "BOOTSTRAP", "Prise en charge du projet", "Backlog central TASKS.xlsx + worklog.md",
     "Création du fichier de suivi central (19 colonnes normées) et du worklog partagé inter-agents",
     "QA (Agent 2)", "TERMINÉ", 1.0, "P1",
     "TASK-002", ".ai/TASKS.xlsx; worklog.md", "Validation structure (validate xlsx)", "PASS", 0,
     "—", "EN COURS (demandée à Reviewer)", "2026-10-25", "2026-10-25",
     "Source de vérité du suivi ; miroir lisible : .ai/TASKS.md"),
    ("TASK-004", "BOOTSTRAP", "Prise en charge du projet", "AUDIT GLOBAL #001 (baseline)",
     "Audit de référence : cohérence doc↔code, dette technique initiale, conformité système, santé multi-agents. Livrables : AUDIT-001 + AUDIT_REPORT + DEBT_REPORT + SYSTEM_COMPLIANCE",
     "Audit Global", "EN COURS", 0.4, "P1",
     "TASK-002, TASK-003", ".ai/AUDITS/AUDIT-001-2026-10-25.md; .ai/AUDIT_REPORT.md; .ai/DEBT_REPORT.md; .ai/SYSTEM_COMPLIANCE.md",
     "Auto-audit du système (checklist section 16)", "EN ATTENTE", 0,
     "—", "—", "2026-10-25", "—",
     "Déclencheur : initialisation du système (audit de référence avant toute feature)"),
    ("TASK-005", "PRODUIT", "Fonctionnalités à définir", "En attente des exigences CTO",
     "Aucune exigence fonctionnelle reçue. Dès réception : lifecycle complet Phase 0 (UX) → Phase 7 (rétro) + audit périodique",
     "QA (Agent 2) + Tech Lead", "À FAIRE", 0.0, "P1",
     "TASK-004", "—", "—", "—", 0, "—", "—", "—", "—",
     "Le CTO (utilisateur) définit le produit cible ; le système exécute le lifecycle complet"),
]

STATUS_STYLE = {
    "TERMINÉ":  (ACCENT_POSITIVE, "E8F5E9"),
    "EN COURS": (ACCENT_WARNING,  "FEF9E7"),
    "À FAIRE":  (NEUTRAL_600,     "FFFFFF"),
    "BLOQUÉ":   (ACCENT_NEGATIVE, "FDEDEC"),
}
PRIO_STYLE = {"P0": ACCENT_NEGATIVE, "P1": ACCENT_WARNING, "P2": PRIMARY, "P3": NEUTRAL_600, "P4": NEUTRAL_600}

wb = Workbook()
wb.properties.creator = "Z.ai"

# ---------- Feuille 1 : TASKS ----------
ws = wb.active
ws.title = "TASKS"
setup_sheet(ws, title="Backlog Central — Système Multi-Agents", last_col=len(HEADERS) + 1)

ws.cell(row=3, column=2, value="Source de vérité du suivi · Mise à jour : 2026-10-25 · Projet : nextjs_tailwind_shadcn_ts v0.2.1")
ws.cell(row=3, column=2).font = font_caption()

for col, h in enumerate(HEADERS, 2):
    ws.cell(row=4, column=col, value=h)
style_header_row(ws, 4, 2, len(HEADERS) + 1)

for i, row in enumerate(ROWS):
    r = 5 + i
    for j, val in enumerate(row):
        ws.cell(row=r, column=2 + j, value=val)
    style_data_row(ws, r, 2, len(HEADERS) + 1, i)

    prog = ws.cell(row=r, column=2 + HEADERS.index("Progression"))
    prog.number_format = "0%"
    prog.alignment = Alignment(horizontal="center", vertical="center")

    status_cell = ws.cell(row=r, column=2 + HEADERS.index("Statut"))
    color, bg = STATUS_STYLE.get(status_cell.value, (NEUTRAL_600, "FFFFFF"))
    status_cell.font = Font(name=font_body().name, size=10, bold=True, color=color)
    status_cell.fill = PatternFill("solid", start_color=bg, end_color=bg)

    prio_cell = ws.cell(row=r, column=2 + HEADERS.index("Priorité"))
    pc = PRIO_STYLE.get(prio_cell.value, NEUTRAL_600)
    prio_cell.font = Font(name=font_body().name, size=10, bold=True, color=pc)
    prio_cell.alignment = Alignment(horizontal="center", vertical="center")

    bug_cell = ws.cell(row=r, column=2 + HEADERS.index("Bugs"))
    if isinstance(bug_cell.value, (int, float)) and bug_cell.value > 0:
        bug_cell.font = Font(name=font_body().name, size=10, bold=True, color=ACCENT_NEGATIVE)

last_data_row = 4 + len(ROWS)

total_row = last_data_row + 1
ws.cell(row=total_row, column=2, value="TOTAL")
ws.cell(row=total_row, column=2 + HEADERS.index("ID")).value = f"{len(ROWS)} tâches"
done = sum(1 for r in ROWS if r[6] == "TERMINÉ")
prog_col = 2 + HEADERS.index("Progression")
ws.cell(row=total_row, column=prog_col, value=round(sum(r[7] for r in ROWS) / len(ROWS), 4))
ws.cell(row=total_row, column=2 + HEADERS.index("Bugs")).value = sum(r[13] for r in ROWS)
ws.cell(row=total_row, column=2 + HEADERS.index("Commentaires")).value = (
    f"Terminées : {done} · En cours : {sum(1 for r in ROWS if r[6]=='EN COURS')} · "
    f"À faire : {sum(1 for r in ROWS if r[6]=='À FAIRE')} · Bloquées : 0"
)
style_total_row(ws, total_row, 2, len(HEADERS) + 1)
ws.cell(row=total_row, column=prog_col).number_format = "0%"

note_row = total_row + 2
ws.cell(row=note_row, column=2,
        value="Règles de dépendance : Frontend bloqué tant que contrat API non validé · Backend bloqué sur auth/permissions tant que Security non validé · "
              "Aucune tâche TERMINÉE sans commits propres + revue positive · Frontend : + validation a11y + perf · Aucune livraison PROD sans audit global ≥ 60/100.")
ws.cell(row=note_row, column=2).font = font_caption()

dv_status = DataValidation(type="list", formula1='"À FAIRE,EN COURS,TERMINÉ,BLOQUÉ"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv_status)
status_letter = chr(ord('A') + HEADERS.index("Statut") + 1)
dv_status.add(f"{status_letter}5:{status_letter}{last_data_row + 20}")
dv_prio = DataValidation(type="list", formula1='"P0,P1,P2,P3,P4"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv_prio)
prio_letter = chr(ord('A') + HEADERS.index("Priorité") + 1)
dv_prio.add(f"{prio_letter}5:{prio_letter}{last_data_row + 20}")

auto_fit_columns(ws, header_row=4, data_start_row=5)
for col, width in {"E": 34, "F": 40, "K": 34, "L": 34, "S": 38}.items():
    ws.column_dimensions[col].width = width
ws.freeze_panes = "C5"
ws.page_setup.orientation = "landscape"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.print_title_rows = "4:4"

# ---------- Feuille 2 : STATISTIQUES ----------
ws2 = wb.create_sheet("STATISTIQUES")
setup_sheet(ws2, title="Statistiques du Backlog", last_col=4)
stats_headers = ["Indicateur", "Valeur", "Source"]
for col, h in enumerate(stats_headers, 2):
    ws2.cell(row=4, column=col, value=h)
style_header_row(ws2, 4, 2, 4)

first, last = 5, last_data_row
stats = [
    ("Total tâches", n := len(ROWS), "Comptage lignes TASKS"),
    ("Terminées", f'=COUNTIF(TASKS!H{first}:H{last},"TERMINÉ")', "COUNTIF Statut"),
    ("En cours", f'=COUNTIF(TASKS!H{first}:H{last},"EN COURS")', "COUNTIF Statut"),
    ("À faire", f'=COUNTIF(TASKS!H{first}:H{last},"À FAIRE")', "COUNTIF Statut"),
    ("Bloquées", f'=COUNTIF(TASKS!H{first}:H{last},"BLOQUÉ")', "COUNTIF Statut"),
    ("Bugs ouverts", f'=SUM(TASKS!N{first}:N{last})', "SUM colonne Bugs"),
    ("Progression moyenne", f'=AVERAGE(TASKS!I{first}:I{last})', "AVERAGE colonne Progression"),
    ("Score santé projet", "EN COURS (AUDIT-001)", ".ai/AUDIT_REPORT.md"),
    ("Dette technique (items)", "EN COURS (AUDIT-001)", ".ai/DEBT_REPORT.md"),
]
for i, (label, val, src) in enumerate(stats):
    r = 5 + i
    ws2.cell(row=r, column=2, value=label)
    ws2.cell(row=r, column=3, value=val)
    ws2.cell(row=r, column=4, value=src)
    style_data_row(ws2, r, 2, 4, i)
ws2.cell(row=11, column=3).number_format = "0%"
ws2.cell(row=12, column=3).font = Font(name=font_body().name, size=10, color=ACCENT_WARNING, bold=True)
ws2.cell(row=13, column=3).font = Font(name=font_body().name, size=10, color=ACCENT_WARNING, bold=True)
auto_fit_columns(ws2, header_row=4, data_start_row=5)
ws2.column_dimensions["D"].width = 26

wb.save(OUT)
print(f"OK → {OUT}")
