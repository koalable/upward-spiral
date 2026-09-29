// Where you are on a page, as one small address kept in the URL (#tab, #wgoals/goal/<id>, #wgoals/goal/<id>/<milestone>).
// The back gesture walks back through it, and any screen can be linked to directly. Pure.
export const parseRoute = (hash) => {
  const [tab = "", kind, goal = "", ms = ""] = String(hash || "").replace(/^#/, "").split("/").map(decodeURIComponent);
  if (tab === "settings") return { tab: "customize" }; // older links from the gear
  return kind === "goal" && goal ? { tab, goal, ...(ms ? { ms } : {}) } : { tab };
};

export const formatRoute = (r) => `#${[r.tab, ...(r.goal ? ["goal", r.goal, ...(r.ms ? [r.ms] : [])] : [])].map(encodeURIComponent).join("/")}`;
