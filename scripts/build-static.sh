#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUTPUT_DIR="$PROJECT_DIR/dist"

case "$OUTPUT_DIR" in
  "$PROJECT_DIR/dist") ;;
  *) echo "Refusing unexpected output path" >&2; exit 1 ;;
esac

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/assets/module-art-v2" "$OUTPUT_DIR/downloads" "$OUTPUT_DIR/examples" "$OUTPUT_DIR/monthly"

node "$PROJECT_DIR/scripts/generate-teaching-example.mjs"
sh "$PROJECT_DIR/scripts/package-monthly-skill.sh"

cp "$PROJECT_DIR/public/index.html" "$OUTPUT_DIR/index.html"

cp "$PROJECT_DIR/assets/life-atlas-background-v1.jpg" "$OUTPUT_DIR/assets/"
cp "$PROJECT_DIR/assets/life-atlas-background-v1.png" "$OUTPUT_DIR/assets/"
cp "$PROJECT_DIR/assets/module-art-v2/"*.png "$OUTPUT_DIR/assets/module-art-v2/"
cp "$PROJECT_DIR/downloads/growing-me-life-grid-monthly-skill.zip" "$OUTPUT_DIR/downloads/"
cp "$PROJECT_DIR/examples/teaching-life-grid-monthly.json" "$OUTPUT_DIR/examples/"

for file in index.html styles.css app.js model.js ledger.js life-grid-monthly-prompt.md life-grid-monthly.schema.json; do
  cp "$PROJECT_DIR/monthly/$file" "$OUTPUT_DIR/monthly/$file"
done

echo "Built static site in $OUTPUT_DIR"
