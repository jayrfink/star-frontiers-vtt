#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== Installing server dependencies ==="
cd server && npm install

echo "=== Installing client dependencies ==="
cd ../client && npm install

echo "=== Bootstrap complete ==="
