#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
BUILD_DIR="${DIST_DIR}/build"
STORE_DIR="${BUILD_DIR}/store"
DIRECT_DIR="${BUILD_DIR}/direct"

rm -rf "${DIST_DIR}"
mkdir -p "${STORE_DIR}" "${DIRECT_DIR}"

# Copy source once, then derive store/direct variants from the same baseline.
rsync -a "${ROOT_DIR}/" "${STORE_DIR}/" \
  --exclude ".git/" \
  --exclude ".github/" \
  --exclude ".idea/" \
  --exclude "dist/" \
  --exclude "scripts/" \
  --exclude "updates.xml" \
  --exclude "*.zip" \
  --exclude "*.crx" \
  --exclude "*.DS_Store"

rsync -a "${STORE_DIR}/" "${DIRECT_DIR}/"

# Store package must not include update_url; Store controls updates itself.
python3 - <<'PY' "${STORE_DIR}/manifest.json"
import json
import pathlib
import sys

manifest_path = pathlib.Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest.pop("update_url", None)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
PY

# Direct package requires update_url so self-hosted updates keep working.
python3 - <<'PY' "${DIRECT_DIR}/manifest.json"
import json
import pathlib
import sys

manifest_path = pathlib.Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
if "update_url" not in manifest:
    raise SystemExit("direct manifest is missing update_url")
PY

(
  cd "${STORE_DIR}"
  zip -qr "${DIST_DIR}/tornevall-networks-social-media-tools-store.zip" .
)

(
  cd "${DIRECT_DIR}"
  zip -qr "${DIST_DIR}/tornevall-networks-social-media-tools-direct.zip" .
)

echo "Created: ${DIST_DIR}/tornevall-networks-social-media-tools-store.zip"
echo "Created: ${DIST_DIR}/tornevall-networks-social-media-tools-direct.zip"

