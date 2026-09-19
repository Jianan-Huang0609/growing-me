#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SKILL_DIR="$PROJECT_DIR/skills/growing-me-life-grid-monthly"
OUTPUT_FILE="$PROJECT_DIR/downloads/growing-me-life-grid-monthly-skill.zip"

case "$SKILL_DIR" in
  "$PROJECT_DIR/skills/growing-me-life-grid-monthly") ;;
  *) echo "Refusing unexpected skill path" >&2; exit 1 ;;
esac

test -f "$SKILL_DIR/SKILL.md"
test -f "$SKILL_DIR/references/output-contract.md"
test -f "$SKILL_DIR/references/life-grid-monthly-prompt.md"
test -f "$SKILL_DIR/references/life-grid-monthly.schema.json"
test -f "$SKILL_DIR/references/operating-model.md"
test -f "$SKILL_DIR/references/domain-receipt.schema.json"
test -f "$SKILL_DIR/references/room-lenses.md"
test -f "$SKILL_DIR/references/evaluation-cases.md"

mkdir -p "$PROJECT_DIR/downloads"
rm -f "$OUTPUT_FILE"
cd "$PROJECT_DIR/skills"
zip -qr "$OUTPUT_FILE" growing-me-life-grid-monthly -x '*/__pycache__/*' '*.DS_Store'
unzip -t "$OUTPUT_FILE" >/dev/null
echo "Built $OUTPUT_FILE"
