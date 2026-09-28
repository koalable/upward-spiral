// Paste-in plans for the Work page. The format (one item per line):
//   GOAL: Book marketing launch | due 2027-09-30
//   ## Build email list | due 2026-10-31
//   - Set up Substack welcome email | due 2026-10-05 | 2h
//   - Write lead magnet | due 2026-10-12 | 4h | after: Set up Substack welcome email
// Milestones (##) and tasks (-) belong to the GOAL above them. Everything after the name is optional.

export const PLAN_PROMPT = `Turn my plan into this exact format so I can paste it into my tracker. Rules:
- One goal per "GOAL:" line, with its final deadline.
- Break each goal into milestones (lines starting with "## "), roughly one per month, each with a due date.
- Under each milestone, list small concrete tasks (lines starting with "- "), each doable in one sitting (ideally under 3 hours), with a due date and a time estimate.
- If a task can't start until another is done, add "| after: <exact name of that task>".
- Dates as YYYY-MM-DD. No other text, no bold, no numbering.

Example:
GOAL: Book marketing launch | due 2027-09-30
## Build email list | due 2026-10-31
- Set up Substack welcome email | due 2026-10-05 | 2h
- Write lead magnet | due 2026-10-12 | 4h | after: Set up Substack welcome email
## Pitch podcasts | due 2026-11-30
- List 30 target podcasts | due 2026-11-07 | 3h

My plan:
`;

const DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

function fields(rest) {
  const out = { name: "", due: "", hours: "", after: "" };
  const parts = rest.split("|").map((s) => s.trim()).filter(Boolean);
  out.name = (parts.shift() || "").replace(/\*\*/g, "").trim();
  for (const p of parts) {
    const low = p.toLowerCase();
    if (low.startsWith("after")) out.after = p.replace(/^after\s*:?\s*/i, "").trim();
    else if (DATE.test(p)) out.due = p.match(DATE)[1];
    else if (/^\d+(\.\d+)?\s*(h|hr|hrs|hour|hours)?$/i.test(p)) out.hours = Number(p.match(/\d+(\.\d+)?/)[0]);
    else if (/^\d+\s*(m|min|mins|minutes)$/i.test(p)) out.hours = Math.round((Number(p.match(/\d+/)[0]) / 60) * 100) / 100;
  }
  return out;
}

// Returns new items (with fresh ids) plus any lines it couldn't use.
export function parsePlan(text, makeId, now = Date.now()) {
  const goals = [], milestones = [], tasks = [], skipped = [];
  let goal = null, ms = null, n = 0;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^goal\s*:\s*(.+)$/i))) {
      const f = fields(m[1]);
      goal = { id: makeId("g"), name: f.name, due: f.due };
      goals.push(goal); ms = null;
    } else if ((m = line.match(/^#{2,3}\s+(.+)$/))) {
      if (!goal) { skipped.push(line); continue; }
      const f = fields(m[1]);
      ms = { id: makeId("m"), goal: goal.id, name: f.name, due: f.due };
      milestones.push(ms);
    } else if ((m = line.match(/^(?:[-*•]|\d+[.)])\s+(?:\[\s?\]\s*)?(.+)$/))) {
      if (!goal) { skipped.push(line); continue; }
      const f = fields(m[1]);
      tasks.push({ id: makeId("t"), goal: goal.id, ms: ms?.id || "", name: f.name, due: f.due || ms?.due || "", hours: f.hours, afterName: f.after, done: "", created: now + n++ });
    } else skipped.push(line);
  }
  // Link "after:" names to tasks in the same goal.
  for (const t of tasks) {
    if (t.afterName) {
      const want = t.afterName.toLowerCase();
      const b = tasks.find((x) => x.goal === t.goal && x !== t && x.name.toLowerCase() === want);
      t.after = b ? b.id : "";
      if (!b) skipped.push(`after: ${t.afterName} (no task with that name)`);
    } else t.after = "";
    delete t.afterName;
  }
  return { goals: goals.filter((g) => g.name), milestones, tasks: tasks.filter((t) => t.name), skipped };
}
