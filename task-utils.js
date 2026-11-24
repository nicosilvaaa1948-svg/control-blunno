const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseIsoDate(value) {
  const match = DATE_RE.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function formatIsoDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Calculates the next recurrence strictly after referenceDate.
 * Old overdue reminders therefore jump to the next valid future occurrence
 * instead of generating one overdue occurrence after another.
 */
export function nextTaskOccurrenceDate(task, referenceDate) {
  const start = parseIsoDate(task?.dueDate);
  const reference = parseIsoDate(referenceDate);
  const repeat = String(task?.repeat || "none");
  if (!start || !reference) return null;
  if (repeat === "none") return null;

  if (repeat === "daily" || repeat === "weekly") {
    const stepDays = repeat === "daily" ? 1 : 7;
    const elapsedDays = Math.floor((reference.getTime() - start.getTime()) / DAY_MS);
    const cycles = Math.max(1, Math.floor(elapsedDays / stepDays) + 1);
    return formatIsoDate(new Date(start.getTime() + cycles * stepDays * DAY_MS));
  }

  if (repeat === "monthly") {
    const storedAnchorDay = Number(task?.seriesAnchorDay);
    const anchorDay = Number.isInteger(storedAnchorDay) && storedAnchorDay >= 1 && storedAnchorDay <= 31 ? storedAnchorDay : start.getUTCDate();
    const startingMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    for (let cycle = 1; cycle <= 2400; cycle++) {
      const monthIndex = startingMonth + cycle;
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const candidate = new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay)));
      if (candidate.getTime() > reference.getTime()) return formatIsoDate(candidate);
    }
  }

  return null;
}
