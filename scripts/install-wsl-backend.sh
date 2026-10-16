#!/usr/bin/env bash
# Run from the repository root inside WSL Ubuntu as root.
set -euo pipefail
test -f package.json && test -f src/model.ts || { echo 'Run this from the Faultline repository root.'; exit 1; }
if ! command -v docker >/dev/null || ! command -v curl >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io curl ca-certificates
fi
systemctl start docker
mkdir -p .runtime
version=2.121.0
base="https://github.com/supabase/cli/releases/download/v${version}"
# SHA-256 published on the official v2.121.0 release asset page.
verify_archive() {
  (cd .runtime && printf '%s  %s\n' '4b481189efbdc57cf2d37bdee5f1a0d29574314398564b32a6dfb76c0fcf275f' 'supabase_linux_amd64.tar.gz' | sha256sum --check --strict)
}
if ! verify_archive 2>/dev/null; then
  curl -fsSL --retry 3 --connect-timeout 30 -C - "$base/supabase_linux_amd64.tar.gz" -o .runtime/supabase_linux_amd64.tar.gz
  verify_archive
fi
tar -xzf .runtime/supabase_linux_amd64.tar.gz -C .runtime supabase supabase-go
chmod +x .runtime/supabase .runtime/supabase-go
.runtime/supabase --version
echo 'Runtime installed. In Windows PowerShell: npm run backend:start'
