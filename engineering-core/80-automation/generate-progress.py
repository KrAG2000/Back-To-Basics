#!/usr/bin/env python3
"""Generate local progress data for the engineering-core dashboard."""

from __future__ import annotations

import fnmatch
import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any


SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parents[2]
COURSE_ROOT = REPO_ROOT / "engineering-core"
CONTROL_TOWER = COURSE_ROOT / "00-control-tower"
DASHBOARD_DATA = COURSE_ROOT / "90-dashboard" / "data"

RULES_PATH = CONTROL_TOWER / "tracker-rules.yaml"
WORLD_MAP_PATH = CONTROL_TOWER / "world-map.yaml"
LESSONS_PATH = CONTROL_TOWER / "lesson-index.yaml"

MANIFEST_PATH = DASHBOARD_DATA / ".repo-manifest.json"
ACTIVITY_LOG_PATH = DASHBOARD_DATA / ".activity-log.json"
PROGRESS_JSON_PATH = DASHBOARD_DATA / "progress.json"
PROGRESS_JS_PATH = DASHBOARD_DATA / "progress.js"


@dataclass
class ScopeMatch:
    scope_id: str
    label: str


def load_jsonish(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def posix(path: Path) -> str:
    return path.as_posix()


def matches_any(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def hash_file(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest() -> dict[str, dict[str, Any]]:
    if not MANIFEST_PATH.exists():
        return {}
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_activity_log() -> list[dict[str, Any]]:
    if not ACTIVITY_LOG_PATH.exists():
        return []
    with ACTIVITY_LOG_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def classify_path(path: str, rules: dict[str, Any]) -> ScopeMatch:
    fallback = rules["fallback"]
    for rule in rules["pathRules"]:
        if matches_any(path, rule["include"]) and not matches_any(path, rule.get("exclude", [])):
            return ScopeMatch(rule["id"], rule["label"])
    return ScopeMatch(fallback["id"], fallback["label"])


def scan_repo(rules: dict[str, Any]) -> dict[str, dict[str, Any]]:
    manifest: dict[str, dict[str, Any]] = {}
    ignore_globs = rules["ignoreGlobs"]

    for file_path in REPO_ROOT.rglob("*"):
        if not file_path.is_file():
            continue

        relative = posix(file_path.relative_to(REPO_ROOT))
        if matches_any(relative, ignore_globs):
            continue

        stat = file_path.stat()
        manifest[relative] = {
            "size": stat.st_size,
            "mtime": round(stat.st_mtime, 6),
            "sha1": hash_file(file_path),
        }

    return manifest


def diff_manifests(
    previous: dict[str, dict[str, Any]],
    current: dict[str, dict[str, Any]],
    rules: dict[str, Any],
) -> list[dict[str, Any]]:
    timestamp = datetime.now().astimezone().isoformat()
    events: list[dict[str, Any]] = []

    previous_paths = set(previous)
    current_paths = set(current)

    for path in sorted(current_paths - previous_paths):
        scope = classify_path(path, rules)
        events.append({"timestamp": timestamp, "type": "created", "path": path, "scopeId": scope.scope_id, "scopeLabel": scope.label})

    for path in sorted(previous_paths - current_paths):
        scope = classify_path(path, rules)
        events.append({"timestamp": timestamp, "type": "deleted", "path": path, "scopeId": scope.scope_id, "scopeLabel": scope.label})

    for path in sorted(previous_paths & current_paths):
        if previous[path]["sha1"] != current[path]["sha1"]:
            scope = classify_path(path, rules)
            events.append({"timestamp": timestamp, "type": "updated", "path": path, "scopeId": scope.scope_id, "scopeLabel": scope.label})

    return events


def run_git_log() -> list[dict[str, Any]]:
    format_marker = "__COMMIT__"
    command = [
        "git",
        "log",
        "--date=iso-strict",
        f"--pretty=format:{format_marker}%n%H%n%ad%n%s",
        "--name-only",
        "-n",
        "200",
    ]

    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    if result.returncode != 0:
        return []

    commits: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line == format_marker:
            if current:
                commits.append(current)
            current = {"hash": "", "date": "", "message": "", "paths": []}
            continue

        if current is None:
            continue

        if not current["hash"]:
            current["hash"] = line
        elif not current["date"]:
            current["date"] = line
        elif not current["message"]:
            current["message"] = line
        else:
            current["paths"].append(line)

    if current:
        commits.append(current)

    return commits


def append_commit_activity(log: list[dict[str, Any]], rules: dict[str, Any], commits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    existing_commit_hashes = {
        entry.get("commitHash")
        for entry in log
        if entry.get("type") == "commit" and entry.get("commitHash")
    }

    for commit in commits:
        if commit["hash"] in existing_commit_hashes:
            continue

        matched_scopes = []
        for path in commit["paths"]:
            scope = classify_path(path, rules)
            if scope.scope_id != rules["fallback"]["id"]:
                matched_scopes.append({"id": scope.scope_id, "label": scope.label})

        primary = matched_scopes[0] if matched_scopes else rules["fallback"]
        log.append(
            {
                "timestamp": commit["date"],
                "type": "commit",
                "path": commit["paths"][0] if commit["paths"] else "",
                "scopeId": primary["id"],
                "scopeLabel": primary["label"],
                "commitHash": commit["hash"],
                "message": commit["message"],
                "paths": commit["paths"],
                "scopes": matched_scopes,
            }
        )

    return log


def normalize_date(timestamp: str) -> str:
    return datetime.fromisoformat(timestamp).astimezone().date().isoformat()


def build_daily_timeline(log: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "date": "",
            "created": 0,
            "updated": 0,
            "deleted": 0,
            "commitCount": 0,
            "paths": set(),
            "messages": [],
        }
    )

    for entry in log:
        day = normalize_date(entry["timestamp"])
        bucket = grouped[day]
        bucket["date"] = day

        if entry["type"] in {"created", "updated", "deleted"}:
            bucket[entry["type"]] += 1
            if entry.get("path"):
                bucket["paths"].add(entry["path"])
        elif entry["type"] == "commit":
            bucket["commitCount"] += 1
            if entry.get("message"):
                bucket["messages"].append(entry["message"])
            for path in entry.get("paths", []):
                bucket["paths"].add(path)

    timeline = []
    for day in sorted(grouped.keys(), reverse=True):
        bucket = grouped[day]
        timeline.append(
            {
                "date": bucket["date"],
                "created": bucket["created"],
                "updated": bucket["updated"],
                "deleted": bucket["deleted"],
                "commitCount": bucket["commitCount"],
                "pathCount": len(bucket["paths"]),
                "messages": bucket["messages"][:5],
            }
        )

    return timeline[:21]


def compute_streak(active_days: list[str]) -> int:
    if not active_days:
        return 0

    unique_days = sorted({date.fromisoformat(day) for day in active_days}, reverse=True)
    streak = 1

    for index in range(1, len(unique_days)):
        difference = (unique_days[index - 1] - unique_days[index]).days
        if difference == 1:
            streak += 1
        else:
            break

    return streak


def build_world_progress(
    worlds: list[dict[str, Any]],
    rules: dict[str, Any],
    log: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    weights = rules["eventWeights"]
    score_by_world = defaultdict(int)

    for entry in log:
        if entry["type"] == "commit":
            seen_worlds = {scope["id"] for scope in entry.get("scopes", [])}
            for world_id in seen_worlds:
                score_by_world[world_id] += weights["commit"]
            continue

        if entry["scopeId"].startswith("world-"):
            score_by_world[entry["scopeId"]] += weights[entry["type"]]

    progress_by_world: dict[str, dict[str, Any]] = {}
    for world in worlds:
        target = world["defaultXp"]
        points = min(score_by_world[world["id"]], target)
        progress_by_world[world["id"]] = {
            "id": world["id"],
            "slug": world["slug"],
            "title": world["title"],
            "summary": world["summary"],
            "bossProjectId": world["bossProjectId"],
            "progressPercent": int((points / target) * 100) if target else 100,
            "points": points,
            "targetPoints": target,
            "isUnlocked": False,
        }

    for world in worlds:
        prerequisites = world["prerequisites"]
        is_unlocked = not prerequisites or all(progress_by_world[world_id]["progressPercent"] >= 70 for world_id in prerequisites)
        progress_by_world[world["id"]]["isUnlocked"] = is_unlocked

    return [progress_by_world[world["id"]] for world in worlds]


def build_general_summary(log: list[dict[str, Any]], fallback_id: str) -> dict[str, Any]:
    file_events = [entry for entry in log if entry["type"] != "commit" and entry["scopeId"] == fallback_id]
    commits = [entry for entry in log if entry["type"] == "commit"]
    active_days = [normalize_date(entry["timestamp"]) for entry in log]

    return {
        "trackedFileEvents": len(file_events),
        "commitCount": len(commits),
        "activeDays": len(set(active_days)),
    }


def recent_items(log: list[dict[str, Any]], item_type: str, limit: int) -> list[dict[str, Any]]:
    items = [entry for entry in log if entry["type"] == item_type]
    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items[:limit]


def build_today_summary(log: list[dict[str, Any]]) -> dict[str, Any]:
    today = datetime.now().astimezone().date().isoformat()
    entries = [entry for entry in log if normalize_date(entry["timestamp"]) == today and entry["type"] != "commit"]
    commits = [entry for entry in log if normalize_date(entry["timestamp"]) == today and entry["type"] == "commit"]

    return {
        "date": today,
        "created": [entry["path"] for entry in entries if entry["type"] == "created"][:20],
        "updated": [entry["path"] for entry in entries if entry["type"] == "updated"][:20],
        "deleted": [entry["path"] for entry in entries if entry["type"] == "deleted"][:20],
        "commitMessages": [entry["message"] for entry in commits][:10],
    }


def build_lessons_overview(lesson_index: dict[str, Any]) -> dict[str, Any]:
    by_world = defaultdict(int)
    for lesson in lesson_index["lessons"]:
        by_world[lesson["worldId"]] += 1
    return dict(sorted(by_world.items()))


def select_current_boss(world_progress: list[dict[str, Any]]) -> dict[str, Any] | None:
    unlocked = [world for world in world_progress if world["isUnlocked"]]
    if not unlocked:
        return None
    unlocked.sort(key=lambda world: (world["progressPercent"], world["id"]))
    return {
        "worldId": unlocked[0]["id"],
        "worldTitle": unlocked[0]["title"],
        "bossProjectId": unlocked[0]["bossProjectId"],
    }


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def main() -> int:
    ensure_directory(DASHBOARD_DATA)

    rules = load_jsonish(RULES_PATH)
    world_map = load_jsonish(WORLD_MAP_PATH)
    lesson_index = load_jsonish(LESSONS_PATH)

    previous_manifest = read_manifest()
    current_manifest = scan_repo(rules)

    baseline_only = not previous_manifest
    new_events = [] if baseline_only else diff_manifests(previous_manifest, current_manifest, rules)
    activity_log = read_activity_log()
    activity_log.extend(new_events)
    activity_log = append_commit_activity(activity_log, rules, run_git_log())
    activity_log.sort(key=lambda item: item["timestamp"])

    world_progress = build_world_progress(world_map["worlds"], rules, activity_log)
    timeline = build_daily_timeline(activity_log)
    active_days = [item["date"] for item in timeline]
    payload = {
        "generatedAt": datetime.now().astimezone().isoformat(),
        "baselineMode": baseline_only,
        "repoRoot": str(REPO_ROOT),
        "courseRoot": "engineering-core",
        "today": build_today_summary(activity_log),
        "streak": compute_streak(active_days),
        "dailyTimeline": timeline,
        "worldProgress": world_progress,
        "currentBossProject": select_current_boss(world_progress),
        "generalRepoActivity": build_general_summary(activity_log, rules["fallback"]["id"]),
        "recentFileEvents": recent_items(activity_log, "updated", 10) + recent_items(activity_log, "created", 10),
        "recentCommits": recent_items(activity_log, "commit", 10),
        "lessonCounts": build_lessons_overview(lesson_index),
    }

    save_json(MANIFEST_PATH, current_manifest)
    save_json(ACTIVITY_LOG_PATH, activity_log[-2000:])
    save_json(PROGRESS_JSON_PATH, payload)

    with PROGRESS_JS_PATH.open("w", encoding="utf-8") as handle:
        handle.write("window.__ENGINEERING_CORE_PROGRESS__ = ")
        json.dump(payload, handle, indent=2)
        handle.write(";\n")

    print(f"Progress data written to {PROGRESS_JSON_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
