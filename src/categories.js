// Hiding a category keeps everything about it (its setup, level history, whether it ran your streak) in
// settings.hiddenCats, so "Add back" restores it exactly, with the same id, so all past answers line up again.
// Answers themselves are never deleted: they live on each day and are simply not shown while it's hidden.

export function hideCat(s, id) {
  const at = s.cats.findIndex((q) => q.id === id);
  if (at < 0) return null;
  const [q] = s.cats.splice(at, 1);
  const saved = { ...q, hidden: { at, lead: s.lead === id, floor: (s.floor || []).includes(id) } };
  s.hiddenCats = [...(s.hiddenCats || []).filter((x) => x.id !== id), saved];
  return saved;
}

export function restoreCat(s, id) {
  const saved = (s.hiddenCats || []).find((x) => x.id === id);
  if (!saved) return null;
  s.hiddenCats = s.hiddenCats.filter((x) => x.id !== id);
  if (s.cats.some((q) => q.id === id)) return null; // already back (e.g. added again as a built-in)
  const { hidden, ...q } = saved;
  s.cats.splice(Math.min(hidden?.at ?? s.cats.length, s.cats.length), 0, q);
  if (hidden?.lead && !s.lead) s.lead = id;
  if (hidden?.floor && !s.floor.includes(id)) s.floor.push(id);
  return q;
}
