#!/bin/bash

# Ensure openspec CLI is installed
if ! command -v openspec &> /dev/null; then
  echo "Installing openspec CLI..."
  npm install -g @fission-ai/openspec
fi

agy --conversation=ea4d1d9d-d5b4-4293-8bae-06adf0148def
