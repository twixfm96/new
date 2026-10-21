/** Local-calendar dates are stored as YYYY-MM-DD, never as UTC timestamps. */
export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  weekdays: number[];
  createdAt: string;
  completions: string[];
};

export type AppData = {
  version: 1;
  habits: Habit[];
  demo: boolean;
  settings: {
    theme: "light" | "dark" | "system";
    weekStartsOn: 0 | 1;
  };
};

export type HabitStats = {
  total: number;
  currentStreak: number;
  longestStreak: number;
  rate: number;
  last30Completed: number;
  last30Scheduled: number;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function dateKey(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid date");
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key))
    throw new RangeError("Invalid calendar date");
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (dateKey(date) !== key) throw new RangeError("Invalid calendar date");
  return date;
}

export function addDays(key: string, days: number): string {
  if (!Number.isInteger(days)) throw new RangeError("Days must be an integer");
  const date = parseDate(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function weekDates(anchor: string, weekStartsOn: 0 | 1 = 1): string[] {
  const offset = (parseDate(anchor).getDay() - weekStartsOn + 7) % 7;
  const start = addDays(anchor, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** month is zero based, matching Date.getMonth(); always returns a 6-week grid. */
export function monthDates(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): string[] {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 0 ||
    month > 11
  ) {
    throw new RangeError("Invalid year or month");
  }
  const first = new Date(0);
  first.setHours(12, 0, 0, 0);
  first.setFullYear(year, month, 1);
  const start = weekDates(dateKey(first), weekStartsOn)[0];
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function isScheduled(habit: Habit, key: string): boolean {
  return (
    key >= habit.createdAt && habit.weekdays.includes(parseDate(key).getDay())
  );
}

function previousScheduled(habit: Habit, key: string): string | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const previous = addDays(key, -offset);
    if (previous < habit.createdAt) return null;
    if (isScheduled(habit, previous)) return previous;
  }
  return null;
}

function percentage(completed: number, scheduled: number): number {
  return scheduled ? Math.round((completed / scheduled) * 100) : 0;
}

/** Future and off-schedule checks are retained; only past scheduled checks affect streaks/rates. */
export function habitStats(
  habit: Habit,
  today: string = dateKey(),
): HabitStats {
  parseDate(today);
  const completed = new Set(habit.completions.filter((key) => key <= today));
  const scheduledCompleted = [...completed]
    .filter((key) => isScheduled(habit, key))
    .sort();
  let longestStreak = 0;
  let running = 0;
  let lastCompleted: string | null = null;
  for (const key of scheduledCompleted) {
    running =
      lastCompleted && previousScheduled(habit, key) === lastCompleted
        ? running + 1
        : 1;
    longestStreak = Math.max(longestStreak, running);
    lastCompleted = key;
  }

  // An unfinished today is still in progress and does not break yesterday's streak.
  const expected =
    isScheduled(habit, today) && completed.has(today)
      ? today
      : previousScheduled(habit, today);
  const currentStreak =
    expected !== null && lastCompleted === expected ? running : 0;
  let last30Completed = 0;
  let last30Scheduled = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const key = addDays(today, -offset);
    if (isScheduled(habit, key)) {
      last30Scheduled += 1;
      if (completed.has(key)) last30Completed += 1;
    }
  }
  return {
    total: completed.size,
    currentStreak,
    longestStreak,
    rate: percentage(last30Completed, last30Scheduled),
    last30Completed,
    last30Scheduled,
  };
}

export function dashboardStats(
  habits: Habit[],
  today: string = dateKey(),
): {
  todayDone: number;
  todayTotal: number;
  rate: number;
  total: number;
  bestStreak: number;
} {
  let todayDone = 0;
  let todayTotal = 0;
  let total = 0;
  let bestStreak = 0;
  let completed = 0;
  let scheduled = 0;
  for (const habit of habits) {
    if (isScheduled(habit, today)) {
      todayTotal += 1;
      if (habit.completions.includes(today)) todayDone += 1;
    }
    const stats = habitStats(habit, today);
    total += stats.total;
    bestStreak = Math.max(bestStreak, stats.longestStreak);
    completed += stats.last30Completed;
    scheduled += stats.last30Scheduled;
  }
  return {
    todayDone,
    todayTotal,
    rate: percentage(completed, scheduled),
    total,
    bestStreak,
  };
}

export function monthlyStats(
  habits: Habit[],
  year: number,
  month: number,
  today: string = dateKey(),
): {
  completed: number;
  scheduled: number;
  rate: number;
} {
  parseDate(today);
  let completed = 0;
  let scheduled = 0;
  const dates = monthDates(year, month, 1).filter((key) => {
    const date = parseDate(key);
    return (
      date.getFullYear() === year && date.getMonth() === month && key <= today
    );
  });
  for (const habit of habits) {
    const checks = new Set(habit.completions);
    for (const key of dates) {
      if (isScheduled(habit, key)) {
        scheduled += 1;
        if (checks.has(key)) completed += 1;
      }
    }
  }
  return { completed, scheduled, rate: percentage(completed, scheduled) };
}

/** Set one date explicitly so repeated completion events cannot undo a check. */
export function setCompletion(
  habit: Habit,
  key: string,
  completed: boolean,
): Habit {
  parseDate(key);
  if (habit.completions.includes(key) === completed) return habit;
  const checks = new Set(habit.completions);
  if (completed) checks.add(key);
  else checks.delete(key);
  return {
    ...habit,
    createdAt: completed && key < habit.createdAt ? key : habit.createdAt,
    completions: [...checks].sort(),
  };
}

/** Backfilling extends tracking history; removing a check preserves its start. */
export function toggleCompletion(habit: Habit, key: string): Habit {
  return setCompletion(habit, key, !habit.completions.includes(key));
}

export function createEmptyData(): AppData {
  return {
    version: 1,
    habits: [],
    demo: false,
    settings: { theme: "light", weekStartsOn: 1 },
  };
}

export function createDemoData(today: string = dateKey()): AppData {
  parseDate(today);
  const definitions = [
    {
      name: "Читать 20 минут",
      icon: "📖",
      color: "#719b82",
      category: "Развитие",
      streak: 8,
    },
    {
      name: "Пить больше воды",
      icon: "💧",
      color: "#89a1c4",
      category: "Здоровье",
      streak: 4,
    },
    {
      name: "Утренняя зарядка",
      icon: "🏃",
      color: "#c6a66e",
      category: "Здоровье",
      streak: 6,
    },
    {
      name: "Медитация",
      icon: "🧘",
      color: "#ad8fba",
      category: "Осознанность",
      streak: 0,
    },
    {
      name: "Прогулка на свежем воздухе",
      icon: "🌿",
      color: "#ce8d78",
      category: "Здоровье",
      streak: 2,
    },
  ];
  const habits = definitions.map((definition, index): Habit => {
    const completions: string[] = [];
    for (let offset = 59; offset >= 0; offset -= 1) {
      let done = (offset * 7 + index * 11) % 13 < 10 - index;
      if (offset === 0) done = index === 0 || index === 2;
      else if (offset <= definition.streak) done = true;
      else if (offset === definition.streak + 1) done = false;
      if (done) completions.push(addDays(today, -offset));
    }
    return {
      id: `demo-${index + 1}`,
      name: definition.name,
      icon: definition.icon,
      color: definition.color,
      category: definition.category,
      weekdays: [...ALL_DAYS],
      createdAt: addDays(today, -59),
      completions,
    };
  });
  return { ...createEmptyData(), habits, demo: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Validate imports/storage without trusting arbitrary JSON or mutating the input. */
export function validateAppData(value: unknown): AppData | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.demo !== "boolean" ||
    !Array.isArray(value.habits) ||
    value.habits.length > 1000 ||
    !isRecord(value.settings)
  )
    return null;
  const { theme, weekStartsOn } = value.settings;
  if (theme !== "light" && theme !== "dark" && theme !== "system") return null;
  if (weekStartsOn !== 0 && weekStartsOn !== 1) return null;
  const ids = new Set<string>();
  const habits: Habit[] = [];
  for (const item of value.habits) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      item.id.length > 128 ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 80 ||
      typeof item.icon !== "string" ||
      !item.icon ||
      item.icon.length > 32 ||
      typeof item.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(item.color) ||
      typeof item.category !== "string" ||
      !item.category.trim() ||
      item.category.length > 40 ||
      !isDateKey(item.createdAt) ||
      !Array.isArray(item.weekdays) ||
      !item.weekdays.length ||
      item.weekdays.length > 7 ||
      !item.weekdays.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      ) ||
      new Set(item.weekdays).size !== item.weekdays.length ||
      !Array.isArray(item.completions) ||
      item.completions.length > 40000 ||
      !item.completions.every(isDateKey) ||
      new Set(item.completions).size !== item.completions.length
    )
      return null;
    ids.add(item.id);
    habits.push({
      id: item.id,
      name: item.name.trim(),
      icon: item.icon,
      color: item.color,
      category: item.category.trim(),
      createdAt: item.createdAt,
      weekdays: [...new Set(item.weekdays as number[])].sort((a, b) => a - b),
      completions: [...new Set(item.completions as string[])].sort(),
    });
  }
  return {
    version: 1,
    habits,
    demo: value.demo,
    settings: { theme, weekStartsOn },
  };
}
