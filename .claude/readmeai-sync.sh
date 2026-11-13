#!/usr/bin/env bash
# ReadMeAI Autonomous Sync Engine — runs automatically at session end via Stop hook.
# Also called by git post-commit hook. No API calls, no cost.
[[ -f '.readmeAI' ]] || exit 0

LINES=$(wc -l < .readmeAI 2>/dev/null || echo 0)
TOKENS=$(( $(wc -c < .readmeAI 2>/dev/null || echo 0) / 4 ))
printf '\nReadMeAI Sync — %s lines · ~%s tokens\n' "$LINES" "$TOKENS"

# 1. Auto-patch QUICK REFERENCE Last action from last git commit
if git rev-parse --git-dir &>/dev/null 2>&1; then
  LAST_COMMIT=$(git log -1 --format='%s' 2>/dev/null || true)
  LAST_DATE=$(git log -1 --format='%ci' 2>/dev/null | cut -d' ' -f1 || true)
  if [[ -n "$LAST_COMMIT" ]] && grep -q 'Last action' .readmeAI 2>/dev/null; then
    SAFE_MSG=$(printf '%s' "$LAST_COMMIT" | sed 's/[@&/\\]/\\&/g')
    sed -i "s@.*Last action.*@| **Last action** | $LAST_DATE — $SAFE_MSG |@" .readmeAI 2>/dev/null || true
    printf 'ReadMeAI ✓ QUICK REFERENCE auto-patched\n'
  fi

  # 2. Flag new files from last commit not in .readmeAI
  git diff HEAD~1 HEAD --name-status 2>/dev/null | while IFS=$'\t' read -r STATUS FILE; do
    [[ -z "$FILE" ]] && continue
    if [[ "$STATUS" == "A" ]] && ! grep -qF "$FILE" .readmeAI 2>/dev/null; then
      printf '+ New file not in STRUCTURE MAP: %s\n' "$FILE"
    elif [[ "$STATUS" == "D" ]] && grep -qF "$FILE" .readmeAI 2>/dev/null; then
      printf '✗ Deleted file still in .readmeAI: %s\n' "$FILE"
    fi
  done

  # 3. Flag new public symbols not in SYMBOL INDEX
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    ext="${f##*.}"
    case "$ext" in
      js|ts|jsx|tsx|mjs)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -oE "(export (default )?(async )?function|export (const|let|class)) [a-zA-Z_][a-zA-Z0-9_]*" "$f" 2>/dev/null \
          | grep -oE "[a-zA-Z_][a-zA-Z0-9_]*$" | head -5 || true)
        ;;
      py)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^(async )?def [a-zA-Z_]|^class [A-Z]" "$f" 2>/dev/null \
          | grep -oE "(def|class) [a-zA-Z_][a-zA-Z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      go)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^func [A-Z]" "$f" 2>/dev/null \
          | grep -oE "func [A-Z][a-zA-Z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      rs)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^pub (fn|struct|trait) [A-Z]" "$f" 2>/dev/null \
          | grep -oE "(fn|struct|trait) [A-Z][a-zA-Z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      rb)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^(class|module) [A-Z]|^ {0,2}def [a-z]" "$f" 2>/dev/null \
          | grep -oE "(def|class|module) [A-Za-z_][A-Za-z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      php)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^(class|interface|trait) [A-Z]|^ {0,4}(public |protected |static )*function [a-z]" "$f" 2>/dev/null \
          | grep -oE "(function|class|interface|trait) [A-Za-z_][A-Za-z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      kt|kts)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^(class|object|interface|data class|fun) [A-Z]|^ {0,4}fun [a-z]" "$f" 2>/dev/null \
          | grep -oE "(fun|class|object|interface) [A-Za-z_][A-Za-z0-9_]*" | awk '{print $2}' | head -5 || true)
        ;;
      java)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^(public|protected) (static )?(class|interface|enum|[A-Z])" "$f" 2>/dev/null \
          | grep -oE "[A-Za-z_][A-Za-z0-9_]*[[:space:]]*[({]" | grep -oE "^[A-Za-z_][A-Za-z0-9_]*" | head -5 || true)
        ;;
      cs)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^ {0,4}(public|internal|protected) (static |abstract |sealed |partial )*(class|interface|record|struct|[A-Z])" "$f" 2>/dev/null \
          | grep -oE "(class|interface|record|struct|[A-Z][a-zA-Z0-9]*) [A-Za-z_][A-Za-z0-9_]*" | awk '{print $NF}' | head -5 || true)
        ;;
      ex|exs)
        while IFS= read -r sym; do
          grep -qF "$sym" .readmeAI 2>/dev/null || printf '+ New symbol not in SYMBOL INDEX: %s (%s)\n' "$sym" "$f"
        done < <(grep -E "^defmodule [A-Z]|^ {2}def [a-z]" "$f" 2>/dev/null \
          | grep -oE "(defmodule|def) [A-Za-z_.][A-Za-z0-9_.]*" | awk '{print $2}' | head -5 || true)
        ;;
    esac
  done < <(git diff HEAD~1 HEAD --name-only --diff-filter=AM 2>/dev/null | head -10 || true)
fi

# 4. Log session timestamp
mkdir -p .claude
printf '%s | session end\n' "$(date '+%Y-%m-%d %H:%M')" >> .claude/.readmeai.log 2>/dev/null || true