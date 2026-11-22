#!/usr/bin/env bash
set -euo pipefail

workflow=$1
slot_start=${2:-}
if [[ -z "$slot_start" ]]; then
  # Les deux lancements d’un créneau partagent la même heure locale.
  read -r minutes hour _ <<< "$(jq -er '.schedule' "$GITHUB_EVENT_PATH")"
  slot_start="$hour:${minutes%%,*}"
fi

local_start=$(TZ=Europe/Paris date -d "today $slot_start" +%s)
since=$(date -u -d "@$local_start" +%FT%TZ)
if successful_runs=$(gh api --method GET "repos/$GITHUB_REPOSITORY/actions/workflows/$workflow/runs" \
  -f "branch=$GITHUB_REF_NAME" -f status=success -f "created=>=$since" -F per_page=1 --jq '.total_count'); then
  if [[ "$successful_runs" -gt 0 ]]; then
    echo "skip=true" >> "$GITHUB_OUTPUT"
    echo "Le créneau a déjà une collecte réussie."
  fi
else
  echo "::warning::Historique des exécutions indisponible. La collecte est lancée."
fi
