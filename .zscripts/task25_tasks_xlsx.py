"""Task 40 (fix accès CTO) — TASKS.xlsx : insertion TASK-025 (incident INC-003).
Motif : copie de styles ligne 28 (TASK-024), plages STATISTIQUES étendues à 5:29, TOTAL 25 tâches.
"""
from copy import copy

from openpyxl import load_workbook

PATH = "/home/z/my-project/.ai/TASKS.xlsx"

wb = load_workbook(PATH)
ws = wb["TASKS"]

total_row = None
for r in range(5, ws.max_row + 1):
    if ws.cell(row=r, column=2).value == "TOTAL":
        total_row = r
        break
assert total_row == 29, f"TOTAL attendu en 29, trouvé {total_row}"
assert ws.cell(row=28, column=2).value == "TASK-024", "TASK-024 attendue en ligne 28"

heights = {
    r: ws.row_dimensions[r].height
    for r in list(ws.row_dimensions.keys())
    if ws.row_dimensions[r].height is not None
}

# Insertion d'1 ligne avant TOTAL (styles copiés de TASK-024, ligne 28)
ws.insert_rows(total_row, amount=1)
src_row = 28
new_row = total_row
for c in range(2, 21):
    src = ws.cell(row=src_row, column=c)
    dst = ws.cell(row=new_row, column=c)
    dst._style = copy(src._style)

for old_r, h in heights.items():
    target = old_r + 1 if old_r >= total_row else old_r
    ws.row_dimensions[target].height = h

# ─── TASK-025 — Incident INC-003 : restauration accès CTO + hydratation ───
values_25 = {
    2: "TASK-025",
    3: "GOUVERNANCE",
    4: "DevOS — Incident INC-003 (accès CTO + hydratation)",
    5: (
        "Restauration du compte akoun@devos.test (base SQLite perdue au re-provisionnement de session) "
        "+ neutralisation du warning d'hydratation (attributs d'extension navigateur)"
    ),
    6: (
        "Signalement CTO « le compte de connexion ne fonctionne plus » + console hydration mismatch "
        "(bis_skin_checked / bis_register / __processed_*). Diagnostic AVANT action : (1) dev.log — "
        "POST /api/auth/login 401 avec SELECT User exécuté sans erreur → identifiants refusés ; "
        "(2) inspection DB READ-ONLY — 0 utilisateur, 0 tâche, 0 projet, 0 conversation, 0 automatisation : "
        "db/custom.db recréée VIDE (mtime 16:27 > xlsx gouvernance 13:09) au re-provisionnement de la "
        "session — la base locale n'est pas versionnée (risque « sauvegardes » tracé au backlog) ; "
        "(3) hydration — les seuls attributs en diff portent les signatures d'extension navigateur "
        "(Bitdefender : bis_*) : aucun diff applicatif, cause externe confirmée. Remédiation : compte CTO "
        "recréé (bcryptjs coût 10, mot de passe transmis au CTO dans le canal privé, JAMAIS commité) ; "
        "suppressHydrationWarning ajouté sur <body> (couvre l'élément racine ; recommandation CTO : "
        "désactiver l'extension sur ce site ou utiliser une fenêtre privée — React ne peut pas empêcher "
        "une extension de muter le DOM avant hydratation) ; INC-003 consigné (INCIDENTS.md) + leçons "
        "(LESSONS_LEARNED) : toute réinitialisation de credential doit être communiquée immédiatement au "
        "CTO ; la DB locale doit être sauvegardée avant toute fin de session (backlog sauvegardes)."
    ),
    7: "ORCHESTRATEUR (CTO Task 40)",
    8: "TERMINÉ",
    9: 1,
    10: "P1",
    11: "AUDIT-007 (83,8/100) — session Task 38 : credential réinitialisé pour E2E sans transmission explicite ; base perdue entre sessions",
    12: (
        "src/app/layout.tsx; .zscripts/task25_check_users.ts; .zscripts/task25_reset_akoun.ts; "
        ".ai/INCIDENTS.md; .ai/LESSONS_LEARNED.md; .ai/TASKS.md; worklog.md; "
        "tool-results/task25-login-ok.png; tool-results/task25-intelligence-vue.png"
    ),
    13: (
        "curl : POST /api/auth/login akoun@devos.test → 200 + cookie devos_session · GET /api/auth/me → 200 "
        "(id/email corrects) · E2E agent-browser : login UI → vue « DevOS Intelligence » rendue (captures), "
        "sidebar + tiroir mobile OK, 0 erreur console bloquante · lint 0 · tsc 0 · intégrité xlsx : 25 IDs "
        "uniques 5-29, TOTAL 30 « 25 tâches », STATISTIQUES 5:29"
    ),
    14: "PASS",
    15: 0,
    16: (
        "Mot de passe CTO jamais commité (transmis par canal privé + hachage bcrypt coût 10) · aucune "
        "modification backend (0 endpoint touché — contrat v1.4 intact) · layout.tsx : attribut "
        "suppressHydrationWarning uniquement, aucun changement de comportement · diagnostic fondé sur "
        "preuves (dev.log, inspection DB, signatures d'attributs) — aucune modification aveugle"
    ),
    17: (
        "Accès CTO restauré sans perte d'intégrité : le compte existant étant définitivement perdu avec la "
        "base, une recréation propre était la seule voie · la refonte DevOS Intelligence (TASK-024, be695aa) "
        "est confirmée présente et fonctionnelle après restauration du login"
    ),
    18: "2026-10-26",
    19: "2026-10-26",
    20: (
        "Les données utilisateur antérieures (conversations, automatisations) sont définitivement perdues "
        "avec l'ancienne base — recommandation : activer le chantier « sauvegardes » (backlog) avant les "
        "prochaines itérations · suppression d'extension navigateur recommandée pour éliminer tout warning "
        "résiduel sur les éléments internes (suppressHydrationWarning ne couvre que l'élément porteur)"
    ),
}
for c, v in values_25.items():
    ws.cell(row=new_row, column=c).value = v

# TOTAL décalé en 30
tr = total_row + 1
ws.cell(row=tr, column=3).value = "25 tâches"
ws.cell(row=tr, column=9).value = 1
ws.cell(row=tr, column=15).value = 0
ws.cell(row=tr, column=20).value = "Terminées : 25 · En cours : 0 · À faire : 0 · Bloquées : 0"

# STATISTIQUES — plages 5..29 (25 tâches)
st = wb["STATISTIQUES"]
st["C5"] = 25
st["C6"] = '=COUNTIF(TASKS!H5:H29,"TERMINÉ")'
st["C7"] = '=COUNTIF(TASKS!H5:H29,"EN COURS")'
st["C8"] = '=COUNTIF(TASKS!H5:H29,"À FAIRE")'
st["C9"] = '=COUNTIF(TASKS!H5:H29,"BLOQUÉ")'
st["C10"] = "=SUM(TASKS!O5:O29)"
st["C11"] = "=AVERAGE(TASKS!I5:I29)"

wb.save(PATH)

# Vérification d'intégrité (équivalent validate)
wb2 = load_workbook(PATH)
ws2 = wb2["TASKS"]
total2 = None
for r in range(5, ws2.max_row + 1):
    if ws2.cell(row=r, column=2).value == "TOTAL":
        total2 = r
        break
ids2 = [ws2.cell(row=r, column=2).value for r in range(5, total2)]
assert len(ids2) == 25 and len(set(ids2)) == 25, f"IDs invalide : {len(ids2)}"
assert ids2[-1] == "TASK-025", f"Dernière tâche : {ids2[-1]}"
statuses = [ws2.cell(row=r, column=8).value for r in range(5, total2)]
assert all(s == "TERMINÉ" for s in statuses), "Statut non TERMINÉ détecté"
print(f"TASKS.xlsx : TASK-025 insérée (ligne {total2}), TOTAL en {total2 + 1} = 25 tâches, STATISTIQUES 5:{total2}.")
print(f"Intégrité : {len(ids2)} IDs uniques, {statuses.count('TERMINÉ')}/25 TERMINÉ.")
