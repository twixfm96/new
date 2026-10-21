import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  createDemoData,
  createEmptyData,
  dashboardStats,
  dateKey,
  habitStats,
  isScheduled,
  monthDates,
  monthlyStats,
  parseDate,
  toggleCompletion,
  validateAppData,
  weekDates,
} from "./habits.ts";
import type { Habit } from "./habits.ts";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "water",
    name: "Вода",
    icon: "💧",
    color: "#619CBB",
    category: "Здоровье",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    createdAt: "2026-10-01",
    completions: [],
    ...overrides,
  };
}

test("date helpers preserve local dates across leap days, years, and DST", () => {
  assert.equal(dateKey(parseDate("2024-02-29")), "2024-02-29");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2025-12-31", 1), "2026-01-01");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(addDays("2026-11-01", -1), "2026-10-31");
  assert.throws(() => parseDate("2025-02-29"), RangeError);
  assert.throws(() => parseDate("2026-13-01"), RangeError);
});

test("calendar grids respect the selected week start", () => {
  assert.deepEqual(weekDates("2026-10-21", 1), [
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
  ]);
  assert.equal(weekDates("2026-10-21", 0)[0], "2026-10-18");
  assert.equal(monthDates(2026, 1, 1).length, 42);
  assert.equal(monthDates(2026, 1, 1)[0], "2026-01-26");
  assert.equal(monthDates(2026, 1, 0)[0], "2026-02-01");
  assert.throws(() => monthDates(2026, 12, 1), RangeError);
});

test("unfinished today preserves yesterday’s current streak", () => {
  const item = habit({ completions: ["2026-10-19", "2026-10-20"] });
  assert.equal(habitStats(item, "2026-10-21").currentStreak, 2);
  assert.equal(
    habitStats(toggleCompletion(item, "2026-10-21"), "2026-10-21")
      .currentStreak,
    3,
  );
  assert.equal(habitStats(item, "2026-10-22").currentStreak, 0);
});

test("streaks skip unscheduled weekends and break on a missed scheduled date", () => {
  const item = habit({
    weekdays: [1, 2, 3, 4, 5],
    completions: ["2026-10-15", "2026-10-16", "2026-10-19"],
  });
  assert.equal(habitStats(item, "2026-10-18").currentStreak, 2);
  assert.equal(habitStats(item, "2026-10-19").currentStreak, 3);
  assert.equal(habitStats(item, "2026-10-20").currentStreak, 3);
  assert.equal(habitStats(item, "2026-10-21").currentStreak, 0);
  assert.equal(habitStats(item, "2026-10-21").longestStreak, 3);
});

test("historical toggles extend tracking start and remain immutable", () => {
  const original = habit({ createdAt: "2026-10-21" });
  const checked = toggleCompletion(original, "2026-10-19");
  assert.equal(checked.createdAt, "2026-10-19");
  assert.deepEqual(checked.completions, ["2026-10-19"]);
  assert.deepEqual(original.completions, []);
  assert.equal(original.createdAt, "2026-10-21");
  const unchecked = toggleCompletion(checked, "2026-10-19");
  assert.deepEqual(unchecked.completions, []);
  assert.equal(unchecked.createdAt, "2026-10-19");
});

test("future checks do not contribute early; off-schedule checks only count in totals", () => {
  const item = habit({
    weekdays: [1, 2, 3, 4, 5],
    completions: ["2026-10-18", "2026-10-19", "2026-10-22"],
  });
  const stats = habitStats(item, "2026-10-21");
  assert.equal(stats.total, 2);
  assert.equal(stats.last30Completed, 1);
  assert.equal(stats.longestStreak, 1);
  assert.equal(habitStats(item, "2026-10-22").total, 3);
  assert.equal(isScheduled(item, "2026-10-18"), false);
});

test("adherence uses only scheduled dates since creation, not entire month", () => {
  const item = habit({
    createdAt: "2026-10-19",
    completions: ["2026-10-19", "2026-10-20"],
  });
  const stats = habitStats(item, "2026-10-21");
  assert.equal(stats.last30Scheduled, 3);
  assert.equal(stats.last30Completed, 2);
  assert.equal(stats.rate, 67);
  assert.deepEqual(monthlyStats([item], 2026, 9, "2026-10-21"), {
    completed: 2,
    scheduled: 3,
    rate: 67,
  });
  assert.deepEqual(monthlyStats([item], 2026, 10, "2026-10-21"), {
    completed: 0,
    scheduled: 0,
    rate: 0,
  });
});

test("dashboard rate weights scheduled opportunities instead of averaging percentages", () => {
  const a = habit({
    id: "a",
    createdAt: "2026-10-21",
    completions: ["2026-10-21"],
  });
  const b = habit({
    id: "b",
    createdAt: "2026-10-19",
    completions: ["2026-10-19"],
  });
  assert.deepEqual(dashboardStats([a, b], "2026-10-21"), {
    todayDone: 1,
    todayTotal: 2,
    total: 2,
    rate: 50,
    bestStreak: 1,
  });
  assert.deepEqual(dashboardStats([], "2026-10-21"), {
    todayDone: 0,
    todayTotal: 0,
    total: 0,
    rate: 0,
    bestStreak: 0,
  });
});

test("first day, weekly schedule, and future-created habits have bounded correct streaks", () => {
  assert.equal(
    habitStats(
      habit({ createdAt: "2026-10-21", completions: ["2026-10-21"] }),
      "2026-10-21",
    ).currentStreak,
    1,
  );
  assert.equal(
    habitStats(habit({ createdAt: "2026-10-22" }), "2026-10-21").currentStreak,
    0,
  );
  const weekly = habit({
    weekdays: [3],
    completions: ["2026-10-07", "2026-10-14", "2026-10-21"],
  });
  assert.equal(habitStats(weekly, "2026-10-21").currentStreak, 3);
  assert.equal(habitStats(weekly, "2026-10-27").currentStreak, 3);
});

test("demo data is reproducible, valid, and has exactly two completed habits today", () => {
  const demo = createDemoData("2026-10-21");
  assert.deepEqual(demo, createDemoData("2026-10-21"));
  assert.equal(demo.habits.length, 5);
  assert.equal(dashboardStats(demo.habits, "2026-10-21").todayDone, 2);
  assert.equal(dashboardStats(demo.habits, "2026-10-21").todayTotal, 5);
  assert.deepEqual(validateAppData(demo), demo);
  assert.deepEqual(validateAppData(createEmptyData()), createEmptyData());
});

test("validation rejects corrupt imports, duplicate IDs and completion dates", () => {
  const data = { ...createEmptyData(), habits: [habit()] };
  assert.equal(validateAppData(null), null);
  assert.equal(validateAppData({ ...data, version: 2 }), null);
  assert.equal(
    validateAppData({ ...data, habits: [habit({ weekdays: [] })] }),
    null,
  );
  assert.equal(validateAppData({ ...data, habits: [habit(), habit()] }), null);
  assert.equal(
    validateAppData({
      ...data,
      habits: [habit({ completions: ["2026-02-30"] })],
    }),
    null,
  );
  assert.equal(
    validateAppData({
      ...data,
      habits: [habit({ color: "red; display:none" })],
    }),
    null,
  );
  assert.equal(
    validateAppData({
      ...data,
      habits: [habit({ completions: ["2026-10-21", "2026-10-21"] })],
    }),
    null,
  );
  assert.equal(
    validateAppData({ ...data, habits: [habit({ weekdays: [1, 1] })] }),
    null,
  );
  assert.equal(
    validateAppData({ ...data, habits: [habit({ name: "   " })] }),
    null,
  );
  assert.equal(
    validateAppData({ ...data, habits: [habit({ name: "x".repeat(81) })] }),
    null,
  );
  assert.equal(
    validateAppData({
      ...data,
      habits: [habit({ completions: Array(40001).fill("2026-10-21") })],
    }),
    null,
  );
});
