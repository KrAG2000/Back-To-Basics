# Automation

This folder powers the `engineering-core` dashboard.

## Scripts

- `generate-progress.py`: scans repo activity, parses git history, and writes dashboard data
- `watch-progress.py`: reruns the generator on a simple polling loop for local development
- `install-git-hooks.sh`: installs lightweight hooks so commits and checkouts refresh the dashboard

## Workflow

1. Run `python3 engineering-core/80-automation/generate-progress.py`
2. Open `engineering-core/90-dashboard/index.html`
3. Optionally run `python3 engineering-core/80-automation/watch-progress.py`
4. Optionally install hooks with `bash engineering-core/80-automation/install-git-hooks.sh`
