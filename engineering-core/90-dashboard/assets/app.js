const progress = window.__ENGINEERING_CORE_PROGRESS__;

function el(id) {
  return document.getElementById(id);
}

function list(items, emptyLabel) {
  if (!items || !items.length) {
    return `<p class="list-empty">${emptyLabel}</p>`;
  }

  return `<ul>${items.map((item) => `<li><code>${item}</code></li>`).join("")}</ul>`;
}

function renderOverview() {
  el("overview-card").innerHTML = `
    <p class="eyebrow">Overview</p>
    <div class="split">
      <div>
        <p class="mini">Generated</p>
        <p class="stat">${new Date(progress.generatedAt).toLocaleDateString()}</p>
      </div>
      <div>
        <p class="mini">Active streak</p>
        <p class="stat">${progress.streak} day${progress.streak === 1 ? "" : "s"}</p>
      </div>
    </div>
    <p class="meta">Repo root: <code>${progress.repoRoot}</code></p>
    <div class="pill-row">
      <span class="pill">${progress.worldProgress.length} worlds tracked</span>
      <span class="pill">${Object.values(progress.lessonCounts).reduce((a, b) => a + b, 0)} lessons indexed</span>
      <span class="pill">${progress.generalRepoActivity.commitCount} commits captured</span>
    </div>
  `;
}

function renderBoss() {
  const boss = progress.currentBossProject;
  el("boss-card").innerHTML = boss
    ? `
      <p class="eyebrow">Current Boss</p>
      <h2>${boss.worldTitle}</h2>
      <p class="meta">Next meaningful project focus for the current unlock chain.</p>
      <div class="pill-row">
        <span class="pill"><code>${boss.bossProjectId}</code></span>
        <span class="pill">${boss.worldId}</span>
      </div>
    `
    : `
      <p class="eyebrow">Current Boss</p>
      <h2>No boss unlocked yet</h2>
      <p class="meta">Start adding work inside the world drill, build quest, boss project, or review folders.</p>
    `;
}

function renderWorlds() {
  el("world-progress").innerHTML = progress.worldProgress
    .map(
      (world) => `
        <article class="world-item">
          <div class="split">
            <div>
              <h3>${world.title}</h3>
              <p class="meta">${world.summary}</p>
            </div>
            <div class="pill">${world.isUnlocked ? "Unlocked" : "Locked"}</div>
          </div>
          <div class="meter"><span style="width:${world.progressPercent}%"></span></div>
          <div class="split">
            <p class="meta">${world.points}/${world.targetPoints} points</p>
            <p class="meta"><code>${world.bossProjectId}</code></p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderToday() {
  const today = progress.today;
  el("today-summary").innerHTML = `
    <div class="pill-row">
      <span class="pill">${today.created.length} created</span>
      <span class="pill">${today.updated.length} updated</span>
      <span class="pill">${today.deleted.length} deleted</span>
      <span class="pill">${today.commitMessages.length} commits</span>
    </div>
    <h3>Created</h3>
    ${list(today.created, "No created files recorded today.")}
    <h3>Updated</h3>
    ${list(today.updated, "No updated files recorded today.")}
    <h3>Deleted</h3>
    ${list(today.deleted, "No deleted files recorded today.")}
  `;
}

function renderGeneralSummary() {
  const general = progress.generalRepoActivity;
  el("general-summary").innerHTML = `
    <div class="pill-row">
      <span class="pill">${general.trackedFileEvents} file events</span>
      <span class="pill">${general.commitCount} commits</span>
      <span class="pill">${general.activeDays} active days</span>
    </div>
    <p class="meta">Work outside the course still appears here so the dashboard stays honest about full-repo momentum.</p>
  `;
}

function renderTimeline() {
  el("timeline").innerHTML = progress.dailyTimeline.length
    ? `<div class="timeline-list">${progress.dailyTimeline
        .map(
          (day) => `
            <article class="timeline-item">
              <div class="split">
                <strong>${day.date}</strong>
                <span class="meta">${day.pathCount} paths</span>
              </div>
              <div class="pill-row">
                <span class="pill">${day.created} created</span>
                <span class="pill">${day.updated} updated</span>
                <span class="pill">${day.deleted} deleted</span>
                <span class="pill">${day.commitCount} commits</span>
              </div>
            </article>
          `
        )
        .join("")}</div>`
    : `<p class="list-empty">No activity recorded yet.</p>`;
}

function renderCommits() {
  el("recent-commits").innerHTML = progress.recentCommits.length
    ? `<div class="commit-list">${progress.recentCommits
        .map(
          (commit) => `
            <article class="commit-item">
              <div class="split">
                <strong>${commit.message}</strong>
                <span class="meta"><code>${commit.commitHash.slice(0, 7)}</code></span>
              </div>
              <p class="meta">${new Date(commit.timestamp).toLocaleString()}</p>
            </article>
          `
        )
        .join("")}</div>`
    : `<p class="list-empty">No commits captured yet.</p>`;
}

renderOverview();
renderBoss();
renderWorlds();
renderToday();
renderGeneralSummary();
renderTimeline();
renderCommits();
