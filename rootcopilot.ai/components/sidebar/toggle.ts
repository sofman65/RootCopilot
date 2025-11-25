export function toggle<T>(set: Set<T>, setter: (v: Set<T>) => void, val: T) {
  const next = new Set(set);
  next.has(val) ? next.delete(val) : next.add(val);
  setter(next);
}
