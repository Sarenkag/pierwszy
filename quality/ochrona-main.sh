#!/usr/bin/env bash
# Włącza ochronę gałęzi main (ruleset GitHub): scalenie tylko przez PR i tylko przy zielonym „Quality Gate”.
# NIE jest uruchamiany automatycznie. Uruchamia go właściciel repo (Grzegorz) po zatwierdzeniu bramki:
#   gh auth login            # konto z prawami administratora repo
#   bash quality/ochrona-main.sh            # podgląd (nic nie zmienia)
#   bash quality/ochrona-main.sh --wlacz    # utworzenie reguły
# Co robi reguła:
#   - wymagany status „Quality Gate” (job quality-gate z .github/workflows/quality-gate.yml), na aktualnym SHA PR (strict),
#   - zmiany na main tylko przez PR, zakaz force-push i usunięcia gałęzi,
#   - administrator repo (właściciel) może świadomie pominąć regułę – to jedyna droga na „zgodę właściciela”,
#     np. przy dodaniu wyjątku do baseline. Automaty (Claude, Codex, auto-merge) nie omijają reguły.
# Wyłączenie: GitHub → Settings → Rules → Rulesets → „OEST Quality Gate” → Delete (albo Disable).
set -euo pipefail
REPO="${REPO:-Sarenkag/pierwszy}"
BODY=$(cat <<'JSON'
{
  "name": "OEST Quality Gate",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [ { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" } ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false, "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": true, "do_not_enforce_on_create": false, "required_status_checks": [ { "context": "Quality Gate", "integration_id": 15368 } ] } }
  ]
}
JSON
)
echo "Repozytorium: $REPO"
echo "Istniejące reguły:"; gh api "repos/$REPO/rulesets" --jq '.[] | "  - \(.name) (id \(.id), \(.enforcement))"' || true
if [ "${1:-}" != "--wlacz" ]; then echo; echo "Podgląd reguły (nic nie zmieniono):"; echo "$BODY"; echo; echo "Aby włączyć: bash quality/ochrona-main.sh --wlacz"; exit 0; fi
echo "$BODY" | gh api -X POST "repos/$REPO/rulesets" --input - --jq '"Włączono: \(.name) (id \(.id))"'
