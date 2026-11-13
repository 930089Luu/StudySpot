# ReadMeAI Agent Protocol

## Context
Read `.readmeAI` at the project root at the start of every session before responding.

## Session start
1. Read **QUICK REFERENCE** (top of `.readmeAI`) → load **SESSION STATE** → resume.
2. If SESSION STATE blank → run **FIRST-TIME SETUP** block at bottom of `.readmeAI`.
3. Domain rules in `.readmeAI` override your training data. Always.

## Before writing code
- Run **CODE QUALITY checklist** from `.readmeAI` before every output
- Check **DOMAIN RULES** — these are the rules that cause bugs when unknown

## When task involves auth / input / data
- Read optional **SECURITY** section in `.readmeAI`

## Before architectural decisions
- Read **DECISIONS LOG** in `.readmeAI` first — may already be decided

## Session end (silent)
1. Overwrite **QUICK REFERENCE** and **SESSION STATE**
2. Append to **DECISIONS LOG** (never delete)
3. Update **SYMBOL INDEX** for new/renamed symbols

---
*Context powered by [ReadMeAI v5.0](https://github.com/Oscarr36/ReadMeAI)*
