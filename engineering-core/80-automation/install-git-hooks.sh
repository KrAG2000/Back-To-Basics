#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
hooks_dir="$repo_root/.git/hooks"
generator="$repo_root/engineering-core/80-automation/generate-progress.py"
marker="engineering-core-progress-hook"

install_hook() {
  local hook_name="$1"
  local hook_path="$hooks_dir/$hook_name"
  local backup_path="$hooks_dir/$hook_name.engineering-core.bak"

  if [[ -f "$hook_path" ]] && ! grep -q "$marker" "$hook_path"; then
    mv "$hook_path" "$backup_path"
  fi

  cat > "$hook_path" <<EOF
#!/usr/bin/env bash
# $marker
set -euo pipefail
repo_root="$repo_root"
generator="$generator"
backup_hook="$backup_path"

if [[ -x "\$backup_hook" ]]; then
  "\$backup_hook" "\$@"
fi

python3 "\$generator" >/dev/null 2>&1 || true
EOF

  chmod +x "$hook_path"
}

install_hook "post-commit"
install_hook "post-checkout"
install_hook "post-merge"

python3 "$generator"
echo "Installed engineering-core git hooks."
