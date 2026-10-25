"""Task 25 — TASKS.xlsx : insertion TASK-016 (AUDIT-003) + resynchronisation TOTAL/STATISTIQUES.
Motif : copies de styles ligne 19 (TASK-015), plages STATISTIQUES étendues à H5:H20 (fin du drift DEBT-018-partiel).
"""
from copy import copy

from openpyxl import load_workbook

PATH = "/home/z/my-project/.ai/TASKS.xlsx"

wb = load_workbook(PATH)
ws = wb["TASKS"]

# 1. Localiser la ligne TOTAL
total_row = None
for r in range(5, ws.max_row + 1):
    if ws.cell(row=r, column=2).value == "TOTAL":
        total_row = r
        break
assert total_row == 20, f"TOTAL attendu en 20, trouvé {total_row}"

heights = {
    r: ws.row_dimensions[r].height
    for r in list(ws.row_dimensions.keys())
    if ws.row_dimensions[r].height is not None
}

# 2. Insérer la ligne TASK-016 juste avant TOTAL
ws.insert_rows(total_row)
new_row = total_row  # 20
src_row = 19
for c in range(2, 21):
    src = ws.cell(row=src_row, column=c)
    dst = ws.cell(row=new_row, column=c)
    dst._style = copy(src._style)

# restaurer les hauteurs décalées
for old_r, h in heights.items():
    target = old_r + 1 if old_r >= total_row else old_r
    ws.row_dimensions[target].height = h

values = {
    2: "TASK-016",
    3: "PRODUIT",
    4: "DevOS — Authentification (FEATURE-AUTH)",
    5: "AUDIT GLOBAL #003 post-FEATURE-AUTH (Task 24)",
    6: (
        "Audit global 10 dimensions (méthodologie AUDIT-002 réutilisée) : gates lint/tsc/curl/git, "
        "24 vérifications curl auth + isolation inter-users ×2, ADR-003 + contrats v1.1, plan d'action "
        "AUDIT-002 §9 (deps next 16.4.3 / zod 4.6.7 / next-auth retiré — bun audit 0 CRITIQUE, CSP, vague 2 "
        "ESLint, purge DB), DEBT-021 confirmé OUVERT. Livrables : AUDITS/AUDIT-003-2026-10-25.md, "
        "AUDIT_REPORT.md, DEBT_REPORT.md, SYSTEM_COMPLIANCE.md"
    ),
    7: "Audit Global (+ soldes CTO Task 23 / 24-ter / 24-quater)",
    8: "TERMINÉ",
    9: 1,
    10: "P1",
    11: "TASK-015 (FEATURE-AUTH), règle « audit après chaque feature », AUDIT-002 §9",
    12: (
        ".ai/AUDITS/AUDIT-003-2026-10-25.md; .ai/AUDIT_REPORT.md; .ai/DEBT_REPORT.md; "
        ".ai/SYSTEM_COMPLIANCE.md; .ai/COMMIT_LOG.md"
    ),
    13: (
        "bun run lint exit 0 · bunx tsc exit 2 (4 erreurs seed) → exit 0 après fix (DEBT-022, Task 24-ter) · "
        "bun audit 0 CRITIQUE · 24 vérifications curl (cycle auth complet + isolation inter-users B→A : 404 "
        "génériques) · E2E navigateur Task 23 (inscription → app → déconnexion → reconnexion, 0 erreur console)"
    ),
    14: "PASS",
    15: 0,
    16: "audit pur — 0 code applicatif modifié ; commit gouvernance de clôture (fin de session Task 24/25)",
    17: (
        "Verdict AUTORISÉ SOUS CONDITION — 77/100 stable vs AUDIT-002 · sécurité +16 (78) · conditions "
        "n°1 (seed/tsc) et DEBT-019 soldées immédiatement · REV-004 rétrospective J+1"
    ),
    18: "2026-10-25",
    19: "2026-10-25",
    20: (
        "0 CRITIQUE · 2 MAJEUR · 5 MINEUR · dette 22 items (14 TRAITÉ) · restant avant prod réelle : "
        "CSP (DEBT-013) + rate limiting (DEBT-021) + purge 6 comptes de démo (DEBT-020)"
    ),
}
for c, v in values.items():
    ws.cell(row=new_row, column=c).value = v

# 3. Ligne TOTAL (décalée en 21)
tr = total_row + 1
ws.cell(row=tr, column=3).value = "16 tâches"
ws.cell(row=tr, column=9).value = 1
ws.cell(row=tr, column=15).value = 0
ws.cell(row=tr, column=20).value = "Terminées : 16 · En cours : 0 · À faire : 0 · Bloquées : 0"

# 4. STATISTIQUES — plages étendues aux lignes 5..20 (16 tâches) + indicateurs à jour
st = wb["STATISTIQUES"]
st["C5"] = 16
st["C6"] = '=COUNTIF(TASKS!H5:H20,"TERMINÉ")'
st["C7"] = '=COUNTIF(TASKS!H5:H20,"EN COURS")'
st["C8"] = '=COUNTIF(TASKS!H5:H20,"À FAIRE")'
st["C9"] = '=COUNTIF(TASKS!H5:H20,"BLOQUÉ")'
st["C10"] = "=SUM(TASKS!O5:O20)"
st["C11"] = "=AVERAGE(TASKS!I5:I20)"
st["C12"] = "77 / 100 (AUDIT-003) · AUTORISÉ SOUS CONDITION (conditions 022/019 soldées)"
st["D12"] = ".ai/AUDIT_REPORT.md"
st["C13"] = 22
st["D13"] = ".ai/DEBT_REPORT.md (14 TRAITÉ · 3 EN COURS · 1 REPORTÉ · 1 ACCEPTÉE · 3 OUVERTS)"

wb.save(PATH)
print("TASKS.xlsx mis à jour : TASK-016 insérée en ligne 20, TOTAL en 21, STATISTIQUES resynchronisées.")
