const { test, expect } = require("@playwright/test");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PROTOTYPE_ROOT = path.resolve(__dirname, "..", "prototype");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};
const TEXT = {
  dashboardTitle: "\u98ce\u9669\u7ba1\u7406\u9a7e\u9a76\u8231",
  pages: [
    "\u5229\u7387\u98ce\u9669",
    "\u6d41\u52a8\u6027\u98ce\u9669",
    "\u4e1a\u52a1\u53d8\u52a8\u5206\u6790",
  ],
  removedPage: "\u6c47\u7387\u98ce\u9669",
  removedInterestTitles: [
    "\u57fa\u51c6\u98ce\u9669",
    "\u671f\u6743\u6027\u98ce\u9669",
    "\u503a\u5238\u4fee\u6b63\u4e45\u671f",
  ],
  interestBondBlock: "\u503a\u5238\u6295\u8d44",
  interestBondWidgetTitles: [
    "\u503a\u5238\u6295\u8d44\u89c4\u6a21",
    "\u503a\u5238\u6295\u8d44\u4e45\u671f",
  ],
  removedLiquidityTitles: [
    "\u8d44\u91d1\u5907\u4ed8",
    "\u5206\u884c\u4e2a\u6027\u5316\u76d1\u7ba1\u6307\u6807",
  ],
  liquidityFundingBlock: "\u8d44\u91d1\u878d\u5165",
  liquidityFundingWidgetTitles: [
    "\u540c\u4e1a\u878d\u5165\u6700\u957f\u671f\u9650",
    "\u540c\u4e1a\u878d\u5165\u671f\u9650\u7ed3\u6784",
  ],
  businessTypes: [
    "\u81ea\u8425\u8d37\u6b3e",
    "\u503a\u5238\u6295\u8d44",
    "\u540c\u4e1a\u8d44\u4ea7",
    "\u81ea\u8425\u975e\u6807\u6295\u8d44",
    "\u5b58\u653e\u592e\u884c",
    "\u5185\u90e8\u4ea4\u6613\u8d44\u4ea7",
    "\u6d3b\u671f\u5b58\u6b3e",
    "\u5b9a\u671f\u5b58\u6b3e",
    "\u540c\u4e1a\u8d1f\u503a",
    "\u53d1\u884c\u503a\u5238",
    "\u4e2d\u592e\u884c\u501f\u6b3e",
    "\u79df\u8d41\u8d1f\u503a",
    "\u5185\u90e8\u4ea4\u6613\u8d1f\u503a",
    "\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8",
    "\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536",
  ],
  businessChangeTitles: [
    "\u8d44\u4ea7\u8d1f\u503a\u89c4\u6a21\u53ca\u589e\u901f",
    "\u5206\u4e1a\u52a1\u89c4\u6a21\u53ca\u589e\u901f",
    "\u8d44\u4ea7\u8d1f\u503a\u7ed3\u6784\u4e00\u89c8\u8868",
    "\u65b0\u53d1\u751f\u8d44\u4ea7\u8d1f\u503a\u89c4\u6a21\u53ca\u589e\u901f",
    "\u5206\u4e1a\u52a1\u65b0\u53d1\u751f\u89c4\u6a21\u53ca\u589e\u901f",
    "\u65b0\u53d1\u751f\u4e1a\u52a1\u8d44\u4ea7\u8d1f\u503a\u7ed3\u6784\u4e00\u89c8\u8868",
    "\u5230\u671f\u8d44\u4ea7\u8d1f\u503a\u89c4\u6a21\u53ca\u589e\u901f",
    "\u5206\u4e1a\u52a1\u5230\u671f\u89c4\u6a21\u53ca\u589e\u901f",
    "\u5230\u671f\u4e1a\u52a1\u8d44\u4ea7\u8d1f\u503a\u7ed3\u6784\u4e00\u89c8\u8868",
  ],
  mergedEveTableTitle: "\u5404\u5e01\u79cd\u6700\u5927\u7ecf\u6d4e\u4ef7\u503c\u53d8\u52a8",
  removedEveTableTitle: "6\u79cd\u60c5\u666f\u4e0b\u7ecf\u6d4e\u4ef7\u503c\u53d8\u52a8\u8868",
  interestRiskSimulationTitle: "\u5229\u7387\u98ce\u9669\u6a21\u62df\u6d4b\u7b97",
  liquidityRiskSimulationTitle: "\u6d41\u52a8\u6027\u98ce\u9669\u6a21\u62df\u6d4b\u7b97",
  simulationButton: "\u6a21\u62df\u6d4b\u7b97",
  aiEyebrow: "AI\u667a\u80fd\u5206\u6790",
  aiConclusion: "\u667a\u80fd\u7ed3\u8bba",
};

function formatYearMonth(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getExpectedDefaultStartMonthLabel() {
  const monthEnd13MonthsAgo = new Date();
  monthEnd13MonthsAgo.setHours(0, 0, 0, 0);
  monthEnd13MonthsAgo.setDate(1);
  monthEnd13MonthsAgo.setMonth(monthEnd13MonthsAgo.getMonth() - 12);
  monthEnd13MonthsAgo.setDate(0);
  return formatYearMonth(monthEnd13MonthsAgo);
}

let server;
let baseUrl;

function createStaticServer(rootDir) {
  return http.createServer((request, response) => {
    const requestPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
    const safePath = path.normalize(requestPath).replace(/^(\.\.[\\/])+/, "");
    const filePath = path.join(rootDir, safePath);

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500);
        response.end(error.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      response.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream" });
      response.end(content);
    });
  });
}

async function openPage(page) {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: TEXT.dashboardTitle, exact: true })).toBeVisible();
}

test.beforeAll(async () => {
  server = createStaticServer(PROTOTYPE_ROOT);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("\u5165\u53e3\u9875\u548c\u4e00\u7ea7\u5bfc\u822a\u5b58\u5728", async ({ page }) => {
  await openPage(page);
  const expectedEndDate = await page.evaluate(() => {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  await expect(page.locator("#globalEndDate")).toHaveValue(expectedEndDate);
  for (const title of TEXT.pages) {
    await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: TEXT.removedPage, exact: true })).toHaveCount(0);
  for (const title of TEXT.removedInterestTitles) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  await expect(page.locator("#blockPills").getByRole("button", { name: TEXT.interestBondBlock, exact: true })).toBeVisible();
  for (const title of TEXT.interestBondWidgetTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  const bondScaleBarCount = await page.locator('article[data-widget-seq="59"] svg rect').evaluateAll((nodes) =>
    nodes.filter((node) => Number(node.getAttribute("height") || 0) > 4).length
  );
  expect(bondScaleBarCount).toBeGreaterThan(0);
  await expect(page.locator('article[data-widget-seq="59"] .chart-stage')).toContainText("2026-01");
  expect(await page.locator('article[data-widget-seq="60"] svg polyline').count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  for (const title of TEXT.removedLiquidityTitles) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  await expect(page.locator("#blockPills").getByRole("button", { name: TEXT.liquidityFundingBlock, exact: true })).toBeVisible();
  for (const title of TEXT.liquidityFundingWidgetTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  expect(await page.locator('article[data-widget-seq="57"] svg polyline').count()).toBeGreaterThan(0);
  const interbankTenorBarCount = await page.locator('article[data-widget-seq="58"] svg rect').evaluateAll((nodes) =>
    nodes.filter((node) => Number(node.getAttribute("height") || 0) > 4).length
  );
  expect(interbankTenorBarCount).toBeGreaterThan(0);
  const futureFundingFlowWidget = page.locator('article[data-widget-seq="54"]');
  await expect(futureFundingFlowWidget).toContainText("\u5f53\u65e5\u51c0\u989d");
  await expect(futureFundingFlowWidget).toContainText("\u7d2f\u8ba1\u51c0\u989d");
  await expect(futureFundingFlowWidget.locator('[data-filter-name="\u4e1a\u52a1\u7c7b\u578b"].is-selected')).toHaveCount(TEXT.businessTypes.length);
  for (const businessType of TEXT.businessTypes) {
    await expect(futureFundingFlowWidget.locator(`[data-filter-value="${businessType}"]`)).toHaveClass(/is-selected/);
  }
  const visibleBarCount = await futureFundingFlowWidget.locator("svg rect").evaluateAll((nodes) =>
    nodes.filter((node) => Number(node.getAttribute("height") || 0) > 4).length
  );
  expect(visibleBarCount).toBeGreaterThan(0);
  await futureFundingFlowWidget.getByRole("button", { name: "\u6570\u636e", exact: true }).click();
  await expect(futureFundingFlowWidget).toContainText("\u4e1a\u52a1\u660e\u7ec6");
  await expect(futureFundingFlowWidget).toContainText("\u4e1a\u52a1\u7f16\u53f7");
});

test("\u4e1a\u52a1\u53d8\u52a8\u5206\u6790\u5173\u952e\u6807\u9898\u5b8c\u6574", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  for (const title of TEXT.businessChangeTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  const futureMonthLabels = await page.evaluate(() => buildFutureMaturityMonthlyLabels());
  expect(futureMonthLabels).toHaveLength(6);
  for (const futureMonthLabel of futureMonthLabels) {
    await expect(page.locator('[data-widget-seq="90"] .chart-stage')).toContainText(futureMonthLabel);
    await expect(page.locator('[data-widget-seq="91"] .chart-stage')).toContainText(futureMonthLabel);
  }
  await expect(page.locator('[data-widget-seq="90"] .maturity-future-band')).toHaveCount(1);
  await expect(page.locator('[data-widget-seq="91"] .maturity-future-band')).toHaveCount(1);
  const maturityStructureWidget = page.locator('article[data-widget-seq="96"]');
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u5386\u53f2\u5b9e\u9645\u5230\u671f", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true })).toBeVisible();
  await expect(maturityStructureWidget.locator("[data-inline-date-filter]")).toHaveCount(2);
  const maturityRanges = await page.evaluate(() => {
    const cutoff = getDefaultGlobalEndDate();
    const historyRange = normalizeWidgetBusinessStructureDateRange(96, [], null, "\u5386\u53f2\u65f6\u95f4\u533a\u95f4\uff08\u8d77\u6b62\uff09");
    const futureRange = normalizeWidgetBusinessStructureDateRange(96, [], null, "\u672a\u6765\u65f6\u95f4\u533a\u95f4\uff08\u8d77\u6b62\uff09");
    return { cutoff, historyRange, futureRange };
  });
  expect(maturityRanges.historyRange.every((value) => value <= maturityRanges.cutoff)).toBeTruthy();
  expect(maturityRanges.futureRange.every((value) => value > maturityRanges.cutoff)).toBeTruthy();
  await maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true }).click();
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(maturityStructureWidget.locator("[data-inline-date-filter]")).toHaveCount(2);
  const crossBoundaryRange = await page.evaluate(() => {
    const cutoff = getDefaultGlobalEndDate();
    const futureStart = addDays(cutoff, 1);
    return normalizeWidgetBusinessStructureDateRange(96, [futureStart, cutoff], 0);
  });
  expect(crossBoundaryRange[0]).toBe(crossBoundaryRange[1]);
  await page.evaluate(() => {
    appState.businessDrilldowns = {
      "80": { businessType: "\u503a\u5238\u6295\u8d44", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 79 },
      "85": { businessType: "\u503a\u5238\u6295\u8d44", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 89 },
      "97": { businessType: "\u81ea\u8425\u8d37\u6b3e", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 96 },
    };
    render();
  });
  await expect(page.locator('[data-widget-seq="80"] thead')).toContainText("\u503a\u5238\u4ee3\u7801");
  await expect(page.locator('[data-widget-seq="80"] thead')).toContainText("YTM");
  await expect(page.locator('[data-widget-seq="80"] thead')).toContainText("\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5");
  await expect(page.locator('[data-widget-seq="80"] thead')).not.toContainText("\u4ea4\u6613\u65e5\u671f");
  await expect(page.locator('[data-widget-seq="85"] thead')).toContainText("\u4ea4\u6613\u65e5\u671f");
  await expect(page.locator('[data-widget-seq="97"] thead')).toContainText("\u4e1a\u52a1\u7f16\u53f7");
  await expect(page.locator('[data-widget-seq="97"] thead')).toContainText("\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5");
  await expect(page.locator('[data-widget-seq="79"] thead')).toContainText("\u5e73\u5747\u5269\u4f59\u671f\u9650");
  await expect(page.locator('[data-widget-seq="79"] tbody')).toContainText("\u751f\u606f\u8d44\u4ea7\u603b\u8ba1");
  await expect(page.locator('[data-widget-seq="79"] tbody')).toContainText("\u4ed8\u606f\u8d1f\u503a\u603b\u8ba1");
  await expect(page.locator('[data-widget-seq="89"] tbody')).toContainText("\u751f\u606f\u8d44\u4ea7\u603b\u8ba1");
  await expect(page.locator('[data-widget-seq="89"] tbody')).toContainText("\u4ed8\u606f\u8d1f\u503a\u603b\u8ba1");
  await expect(page.locator('[data-widget-seq="96"] tbody')).toContainText("\u751f\u606f\u8d44\u4ea7\u603b\u8ba1");
  await expect(page.locator('[data-widget-seq="96"] tbody')).toContainText("\u4ed8\u606f\u8d1f\u503a\u603b\u8ba1");
  const stockStructureScrolls = await page.locator('article[data-widget-seq="79"] .table-shell').evaluate((node) => node.scrollHeight > node.clientHeight);
  const newStructureScrolls = await page.locator('article[data-widget-seq="89"] .table-shell').evaluate((node) => node.scrollHeight > node.clientHeight);
  expect(stockStructureScrolls).toBeTruthy();
  expect(newStructureScrolls).toBeTruthy();
});

test("EVE\u8868\u5df2\u5408\u5e76\u4e3a\u5355\u4e00\u8868\u683c", async ({ page }) => {
  await openPage(page);
  const mergedHeading = page.getByRole("heading", { name: TEXT.mergedEveTableTitle, exact: true });
  await expect(mergedHeading).toBeVisible();
  await expect(page.getByRole("heading", { name: TEXT.removedEveTableTitle, exact: true })).toHaveCount(0);
  const mergedTable = page.locator('[data-widget-seq="5"] table').first();
  await expect(mergedTable).toContainText("△EVE");
  await expect(mergedTable).toContainText("平行上移");
  await expect(mergedTable).toContainText("短端下降");
});

test("\u673a\u6784\u591a\u9009\u540e\u77e9\u9635\u8868\u6309\u673a\u6784\u5206\u7ec4\u5c55\u793a", async ({ page }) => {
  await openPage(page);
  await page.locator('[data-filter-toggle][data-filter-name="机构"]').first().click();
  await page.locator('[data-filter-option][data-filter-value="境内汇总"]').click();
  const eveHeader = page.locator('[data-widget-seq="5"] thead').first();
  await expect(eveHeader).toContainText("法人汇总");
  await expect(eveHeader).toContainText("境内汇总");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  await page.evaluate(() => {
    Object.values(appState.areaFilters).forEach((state) => {
      if (Array.isArray(state["机构"])) state["机构"] = ["法人汇总", "境内汇总"];
    });
    render();
  });
  const businessStructureHeader = page.locator('[data-widget-seq="79"] thead').first();
  await expect(businessStructureHeader).toContainText("法人汇总");
  await expect(businessStructureHeader).toContainText("境内汇总");
});

test("\u5168\u5c40\u5f00\u59cb\u65f6\u95f4\u4f1a\u540c\u6b65\u66f4\u65b0\u6708\u9891\u6a2a\u5750\u6807", async ({ page }) => {
  await openPage(page);
  const firstChartStage = page.locator(".chart-stage").first();
  const defaultStartMonthLabel = getExpectedDefaultStartMonthLabel();
  await expect(firstChartStage).toContainText(defaultStartMonthLabel);
  await expect(firstChartStage).toContainText("2026-01");

  const startDate = page.locator("#globalStartDate");
  await startDate.fill("2025-09-30");
  await startDate.evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await expect(firstChartStage).toContainText("2025-09");
  await expect(firstChartStage).not.toContainText(defaultStartMonthLabel);
});

test("\u6a21\u62df\u6d4b\u7b97\u548cAI\u5f39\u7a97\u53ef\u4ee5\u6253\u5f00", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.simulationButton, exact: true }).click();
  await expect(page.getByRole("heading", { name: TEXT.interestRiskSimulationTitle, exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "\u65b0\u4e1a\u52a1\u6a21\u62df\u6d4b\u7b97", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "\u5957\u671f\u4ea4\u6613\u6a21\u62df\u6d4b\u7b97", exact: true }).click();
  await expect(page.getByText("\u88ab\u5957\u671f\u9879\u76ee\u7f16\u53f7", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /HT-BOND-2026-014/ }).click();
  await expect(page.locator(".hedge-selected-card")).toContainText("\u503a\u5238");
  await page.locator('[data-hedge-simulation-field="hedgeAmount"]').fill("80");
  await expect(page.getByText("\u5957\u671f\u671f\u9650\uff08\u6708\uff09", { exact: true })).toBeVisible();
  await page.locator('[data-hedge-simulation-field="hedgeTermMonths"]').fill("18");
  await page.getByRole("button", { name: "\u5e94\u7528\u6d4b\u7b97", exact: true }).click();
  await expect(page.locator(".simulation-summary").first()).toContainText("\u5957\u671f\u4ea4\u6613\u6a21\u62df\u6d4b\u7b97");
  await expect(page.locator(".simulation-summary").first()).toContainText("HT-BOND-2026-014");
  await expect(page.locator(".simulation-summary").first()).toContainText("\u5957\u671f\u671f\u9650\uff1a18\u4e2a\u6708");
  await page.locator(".simulation-summary").first().getByRole("button", { name: "\u6e05\u7a7a\u573a\u666f", exact: true }).click();

  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  await page.getByRole("button", { name: TEXT.simulationButton, exact: true }).click();
  await expect(page.getByRole("heading", { name: TEXT.liquidityRiskSimulationTitle, exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "\u5957\u671f\u4ea4\u6613\u6a21\u62df\u6d4b\u7b97", exact: true })).toHaveCount(0);
  await expect(page.locator(".simulation-role-section")).toHaveCount(2);
  await expect(page.locator(".simulation-role-section--source")).toContainText("\u8d44\u91d1\u6765\u6e90");
  await expect(page.locator(".simulation-role-section--use")).toContainText("\u8d44\u91d1\u8fd0\u7528");
  await expect(page.locator(".simulation-entry")).toHaveCount(2);
  await expect(page.locator(".simulation-role-section--source")).toContainText("\u4e1a\u52a1 1");
  await expect(page.locator(".simulation-role-section--use")).toContainText("\u4e1a\u52a1 1");
  await expect(page.getByText("\u4e1a\u52a1\u53d1\u751f\u65e5\u671f", { exact: true })).toHaveCount(0);
  await expect(page.locator(".simulation-entry__remove")).toHaveCount(0);
  await page.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u6765\u6e90\u4e1a\u52a1", exact: true }).click();
  await page.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u8fd0\u7528\u4e1a\u52a1", exact: true }).click();
  await expect(page.locator(".simulation-entry")).toHaveCount(4);
  await page.getByRole("button", { name: "\u5e94\u7528\u6d4b\u7b97", exact: true }).click();
  await expect(page.locator(".simulation-summary").first().getByText("\u65b0\u4e1a\u52a1\u6a21\u62df\u6d4b\u7b97\uff1a4\u7b14", { exact: true })).toBeVisible();
  await expect(page.locator(".simulation-summary").first()).toContainText("\u8d44\u91d1\u65b9\u5411\uff1a");
  await page.locator(".simulation-summary").first().getByRole("button", { name: "\u8c03\u6574\u6a21\u62df\u6d4b\u7b97", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: TEXT.liquidityRiskSimulationTitle, exact: true })).toHaveCount(0);

  await page.locator("[data-open-insight]").first().click();
  await expect(page.getByText(TEXT.aiEyebrow, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: TEXT.aiConclusion, exact: true })).toBeVisible();
});
