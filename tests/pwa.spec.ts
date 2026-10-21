import { expect, test } from "@playwright/test";

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
