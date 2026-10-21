import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function openSeptemberCalendar(page: Page, completions: string[] = []) {
  await page.addInitScript((dates) => {
    const key = "ritm.habits.v1";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        demo: false,
        settings: { theme: "light", weekStartsOn: 1 },
        habits: [
          {
            id: "calendar-regression",
            name: "Проверка календаря",
            icon: "💧",
            color: "#619CBB",
            category: "Здоровье",
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            createdAt: "2026-09-01",
            completions: dates,
          },
        ],
      }),
    );
  }, completions);
  await page.goto("./");
  await page
    .locator(".habit-name-button")
    .filter({ hasText: "Проверка календаря" })
    .click();
  await page.getByLabel("Перейти к дате").fill("2026-09-15");
  await page.evaluate(() => document.fonts.ready);
}

async function savedCalendarDates(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ritm.habits.v1")!).habits[0].completions,
  );
}

async function expectDarkBackground(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const channels = getComputedStyle(element)
          .backgroundColor.match(/[\d.]+/g)
          ?.map(Number);
        return {
          opaque: channels?.length === 3 || channels?.[3] === 1,
          dark: !!channels && Math.max(...channels.slice(0, 3)) < 100,
        };
      }),
    )
    .toEqual({ opaque: true, dark: true });
}

test("home cards show a full month and preserve adjacent dates through undo confirmation and reload", async ({
  page,
  isMobile,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-21T09:00:00+03:00"));
  await openSeptemberCalendar(page);
  await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Месяц", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const card = page
    .locator(".habit-row")
    .filter({ hasText: "Проверка календаря" });
  await expect(card.locator(".completion-button")).toHaveCount(42);
  await expect(page.locator(".month-navigation")).toContainText(
    /октябрь 2026/i,
  );
  await page.getByRole("button", { name: "Предыдущий месяц списка" }).click();
  await expect(page.locator(".month-navigation")).toContainText(
    /сентябрь 2026/i,
  );
  await expect(card.locator(".card-calendar-caption")).toContainText(
    /сентябрь 2026/i,
  );

  const day = (n: number) =>
    card.getByRole("button", {
      name: new RegExp(`^Проверка календаря, ${n} сентября 2026`),
    });
  const tapDay = (n: number) => (isMobile ? day(n).tap() : day(n).click());
  await day(15).scrollIntoViewIfNeeded();
  const before = await day(15).locator("span").boundingBox();
  expect((await day(15).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await tapDay(15);
  await tapDay(16);
  await expect(day(15)).toHaveAttribute("aria-pressed", "true");
  await expect(day(16)).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => savedCalendarDates(page))
    .toEqual(["2026-09-15", "2026-09-16"]);
  const after = await day(15).locator("span").boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);

  await tapDay(15);
  const confirmation = page.getByRole("dialog", { name: "Убрать отметку?" });
  await expect(confirmation).toContainText("15 сентября 2026");
  await confirmation.getByRole("button", { name: "Оставить отметку" }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(day(15)).toHaveAttribute("aria-pressed", "true");
  await expect(day(16)).toHaveAttribute("aria-pressed", "true");
  if (!isMobile) await expect(day(15)).toBeFocused();

  await tapDay(15);
  await confirmation
    .getByRole("button", { name: "Убрать отметку", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  await expect(day(15)).toHaveAttribute("aria-pressed", "false");
  await expect(day(16)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".month-navigation")).toContainText(
    /сентябрь 2026/i,
  );
  await expect.poll(() => savedCalendarDates(page)).toEqual(["2026-09-16"]);

  await page.reload();
  await page.getByRole("button", { name: "Предыдущий месяц списка" }).click();
  await expect(day(15)).toHaveAttribute("aria-pressed", "false");
  await expect(day(16)).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator(".completion-button")).toHaveCount(42);
  expect(await savedCalendarDates(page)).toEqual(["2026-09-16"]);
});

test("dark theme covers page, cards, calendars and forms, persists after reload, and navigation remains usable", async ({
  page,
  isMobile,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-21T09:00:00+03:00"));
  await openSeptemberCalendar(page);
  await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  const navigation = page.getByRole("navigation", {
    name: isMobile ? "Разделы приложения" : "Основная навигация",
  });
  await navigation
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await page.getByRole("button", { name: "Тёмная", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expectDarkBackground(page.locator("html"));
  await expectDarkBackground(page.locator("body"));
  for (const panel of await page.locator(".settings-panel").all()) {
    await expectDarkBackground(panel);
  }
  await expectDarkBackground(page.getByLabel("Начало недели", { exact: true }));
  if (isMobile) await expectDarkBackground(navigation);

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Тёмная", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectDarkBackground(page.locator("body"));
  await navigation.getByRole("button", { name: /^Привычки/ }).click();
  if (isMobile) {
    await expect(
      navigation.getByRole("button", { name: "Привычки", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await expectDarkBackground(page.locator(".habit-row").first());
  await expectDarkBackground(
    page.locator(".completion-button[aria-pressed=false]").first(),
  );

  await page.locator(".habit-name-button").first().click();
  await expectDarkBackground(
    page.getByRole("dialog", { name: "Ваша привычка" }),
  );
  await expectDarkBackground(
    page.locator(".calendar-day[aria-pressed=false]").first(),
  );
  await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  await page
    .getByRole("button", { name: "Новая привычка", exact: true })
    .click();
  await expectDarkBackground(
    page.getByRole("dialog", { name: "Новая привычка" }),
  );
  await expectDarkBackground(
    page.getByRole("textbox", { name: "Название привычки" }),
  );
  await expectDarkBackground(page.getByLabel("Категория", { exact: true }));
  await page.getByRole("button", { name: "Отмена", exact: true }).click();

  await navigation
    .getByRole("button", { name: "Статистика", exact: true })
    .click();
  await expect(page).toHaveURL(/#stats$/);
  await expect(
    page.getByRole("heading", { name: "Статистика", exact: true }),
  ).toBeVisible();
  await expectDarkBackground(page.locator("body"));
  await navigation
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await expect(page).toHaveURL(/#settings$/);
  await expect(
    page.getByRole("button", { name: "Тёмная", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("adjacent calendar taps retain the entire month without moving date labels", async ({
  page,
  isMobile,
}) => {
  await openSeptemberCalendar(page);
  const day = (n: number) =>
    page.getByRole("button", { name: new RegExp(`^${n} сентября 2026`) });
  await day(15).scrollIntoViewIfNeeded();
  const before = await day(15).locator("span").boundingBox();
  const targets = await Promise.all([
    day(15).boundingBox(),
    day(16).boundingBox(),
  ]);
  for (const target of targets) {
    expect(target!.height).toBeGreaterThanOrEqual(44);
    const x = target!.x + target!.width / 2;
    const y = target!.y + target!.height / 2;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  }
  await expect(day(15)).toHaveAttribute("aria-pressed", "true");
  await expect(day(16)).toHaveAttribute("aria-pressed", "true");
  const after = await day(15).locator("span").boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);

  for (let n = 1; n <= 30; n++) {
    if (n === 15 || n === 16) continue;
    if (isMobile) await day(n).tap();
    else await day(n).click();
  }
  const allDates = Array.from(
    { length: 30 },
    (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`,
  );
  await expect.poll(() => savedCalendarDates(page)).toEqual(allDates);
  await page.reload();
  await page
    .locator(".habit-name-button")
    .filter({ hasText: "Проверка календаря" })
    .click();
  await page.getByLabel("Перейти к дате").fill("2026-09-15");
  await expect(page.locator(".calendar-day[aria-pressed=true]")).toHaveCount(
    30,
  );
  expect(await savedCalendarDates(page)).toEqual(allDates);
});

test("calendar undo needs confirmation and preserves the month, neighboring date, and focus", async ({
  page,
  isMobile,
}) => {
  const dates = ["2026-09-15", "2026-09-16"];
  await openSeptemberCalendar(page, dates);
  const day15 = page.getByRole("button", { name: /^15 сентября 2026/ });
  const day16 = page.getByRole("button", { name: /^16 сентября 2026/ });
  const tapDay15 = () => (isMobile ? day15.tap() : day15.click());
  await day15.scrollIntoViewIfNeeded();
  const before = await day15.boundingBox();
  await tapDay15();
  const confirmation = page.getByRole("dialog", { name: "Убрать отметку?" });
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator(".modal-wide")).toHaveAttribute("inert", "");
  await expect(confirmation).toContainText("15 сентября 2026");
  expect(await savedCalendarDates(page)).toEqual(dates);
  const cancel = confirmation.getByRole("button", { name: "Оставить отметку" });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(confirmation).not.toBeVisible();
  await expect(day15).toHaveAttribute("aria-pressed", "true");
  await expect(day16).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".calendar-heading")).toContainText(
    /сентябрь 2026/i,
  );
  const after = await day15.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
  if (!isMobile) await expect(day15).toBeFocused();

  await tapDay15();
  await page.keyboard.press("Escape");
  await expect(confirmation).not.toBeVisible();
  expect(await savedCalendarDates(page)).toEqual(dates);
  await tapDay15();
  await confirmation
    .getByRole("button", { name: "Убрать отметку", exact: true })
    .click();
  await expect(day15).toHaveAttribute("aria-pressed", "false");
  await expect(day16).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => savedCalendarDates(page)).toEqual(["2026-09-16"]);
  await page.reload();
  expect(await savedCalendarDates(page)).toEqual(["2026-09-16"]);
});

test("install metadata and icons resolve inside the deployment path", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestUrl).toBeTruthy();
  const response = await request.get(new URL(manifestUrl!, page.url()).href);
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.short_name).toBe("Ритм");
  expect(manifest.start_url).toBe(".");
  expect(manifest.scope).toBe(".");
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(
      new URL(icon.src, response.url()).href,
    );
    expect(iconResponse.ok()).toBeTruthy();
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
    const bytes = await iconResponse.body();
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  }
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(
    (await request.get(new URL(appleIcon!, page.url()).href)).ok(),
  ).toBeTruthy();
});

test("first online load enables offline reload, editing, and history persistence", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".habit-row")).toHaveCount(5);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  // Do not mistake the ordinary HTTP cache for a working service worker.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".habit-row")).toHaveCount(5);
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);

  await page
    .getByRole("button", { name: "Новая привычка", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Название привычки" })
    .fill("Моя офлайн-привычка");
  await page
    .getByRole("button", { name: "Создать привычку", exact: true })
    .click();
  await page
    .locator(".habit-name-button")
    .filter({ hasText: "Моя офлайн-привычка" })
    .click();
  await page.getByLabel("Перейти к дате").fill("2025-03-14");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^14 марта 2025/ })
    .click();
  await page.reload();
  await page
    .locator(".habit-name-button")
    .filter({ hasText: "Моя офлайн-привычка" })
    .click();
  await page.getByLabel("Перейти к дате").fill("2025-03-14");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /^14 марта 2025/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("iPhone installation guidance and responsive layout are accessible", async ({
  page,
  isMobile,
}) => {
  await page.goto("./#settings");
  await page
    .getByRole("button", { name: "Как установить", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Ритм на вашем iPhone" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Safari");
  await expect(dialog).toContainText("Поделиться");
  await expect(dialog).toContainText("На экран");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  if (isMobile) {
    await page.goto("./");
    await page
      .getByRole("button", { name: "Новая привычка", exact: true })
      .click();
    const fontSize = await page
      .getByRole("textbox", { name: "Название привычки" })
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});
