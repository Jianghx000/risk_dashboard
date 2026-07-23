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

function isIsoMonthEnd(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return day === new Date(year, month, 0).getDate();
}

const TEXT = {
  dashboardTitle: "\u98ce\u9669\u5206\u6790\u89c6\u56fe",
  pages: [
    "\u5229\u7387\u98ce\u9669",
    "\u6d41\u52a8\u6027\u98ce\u9669",
    "\u4e1a\u52a1\u53d8\u52a8\u5206\u6790",
  ],
  removedPage: "\u6c47\u7387\u98ce\u9669",
  removedInvestmentFinancePage: "\u6295\u878d\u8d44\u4e1a\u52a1",
  removedInterestTitles: [
    "\u57fa\u51c6\u98ce\u9669",
    "\u671f\u6743\u6027\u98ce\u9669",
    "\u5404\u5e01\u79cd\u89c4\u6a21\u53ca\u5360\u6bd4",
    "\u8d44\u4ea7/\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f\u4e0e\u5dee\u503c",
    "\u5206\u4e1a\u52a1\u91cd\u5b9a\u4ef7\u4e45\u671f",
  ],
  interestBondBlock: "\u503a\u5238\u6295\u8d44",
  interestPortfolioDurationTitle: "\u503a\u5238\u4fee\u6b63\u4e45\u671f",
  investmentFinanceBondWidgetTitles: [
    "\u503a\u5238\u6295\u8d44\u89c4\u6a21",
  ],
  removedLiquidityTitles: [
    "\u8d44\u91d1\u5907\u4ed8",
    "\u5206\u884c\u4e2a\u6027\u5316\u76d1\u7ba1\u6307\u6807",
    "\u672a\u676530\u5929\u73b0\u91d1\u51c0\u6d41\u51fa\u91cf",
    "\u4f18\u8d28\u6d41\u52a8\u6027\u8d44\u4ea7HQLA",
    "HQLA\u89c4\u6a21\u5206\u5e03\u7ed3\u6784",
    "\u53ef\u7528\u7a33\u5b9a\u8d44\u91d1\u89c4\u6a21",
    "\u4e1a\u52a1\u6240\u9700\u7a33\u5b9a\u8d44\u91d1",
    "\u6d41\u52a8\u6027\u8d44\u4ea7\u548c\u6d41\u52a8\u6027\u8d1f\u503a",
    "30\u65e5\u6d41\u52a8\u6027\u7f3a\u53e3\u89c4\u6a21",
    "\u8d44\u91d1\u878d\u5165",
    "\u540c\u4e1a\u878d\u5165\u6700\u957f\u671f\u9650",
    "\u540c\u4e1a\u878d\u5165\u671f\u9650\u7ed3\u6784",
  ],
  businessTypes: [
    "\u81ea\u8425\u8d37\u6b3e",
    "\u6295\u8d44\u7c7b\u8d44\u4ea7",
    "\u540c\u4e1a\u8d44\u4ea7",
    "\u81ea\u8425\u975e\u6807\u6295\u8d44",
    "\u5185\u90e8\u4ea4\u6613\u8d44\u4ea7",
    "\u6d3b\u671f\u5b58\u6b3e",
    "\u5b9a\u671f\u5b58\u6b3e",
    "\u540c\u4e1a\u8d1f\u503a",
    "\u5b58\u653e\u592e\u884c",
    "\u53d1\u884c\u503a\u5238",
    "\u5411\u592e\u884c\u501f\u6b3e",
    "\u79df\u8d41\u8d1f\u503a",
    "\u5185\u90e8\u4ea4\u6613\u8d1f\u503a",
    "\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8",
    "\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536",
  ],
  liquidityBusinessTypes: [
    "\u73b0\u91d1",
    "\u5b58\u653e\u592e\u884c\u6b3e\u9879",
    "\u5b58\u653e\u540c\u4e1a",
    "\u62c6\u653e\u540c\u4e1a",
    "\u4e70\u5165\u8fd4\u552e",
    "\u5404\u9879\u8d37\u6b3e",
    "\u503a\u5238",
    "\u80a1\u7968",
    "\u5176\u4ed6\u6295\u8d44",
    "\u6301\u6709\u540c\u4e1a\u5b58\u5355",
    "\u5176\u4ed6\u8d44\u4ea7",
    "\u8868\u5916\u6536\u5165",
    "\u5411\u592e\u884c\u501f\u6b3e",
    "\u5b9a\u671f\u5b58\u653e",
    "\u6d3b\u671f\u5b58\u653e",
    "\u540c\u4e1a\u62c6\u5165",
    "\u5356\u51fa\u56de\u8d2d",
    "\u5b9a\u671f\u5b58\u6b3e",
    "\u6d3b\u671f\u5b58\u6b3e",
    "\u53d1\u884c\u503a\u5238",
    "\u53d1\u884c\u540c\u4e1a\u5b58\u5355",
    "\u5176\u4ed6\u8d1f\u503a",
    "\u8868\u5916\u652f\u51fa",
  ],
  liquidityBusinessTableCategories: [
    "\u8d44\u4ea7\u5408\u8ba1",
    "\u73b0\u91d1",
    "\u5b58\u653e\u592e\u884c\u6b3e\u9879",
    "\u5b58\u653e\u540c\u4e1a",
    "\u62c6\u653e\u540c\u4e1a",
    "\u4e70\u5165\u8fd4\u552e",
    "\u5404\u9879\u8d37\u6b3e",
    "\u503a\u5238",
    "\u80a1\u7968",
    "\u5176\u4ed6\u6295\u8d44",
    "\u6301\u6709\u540c\u4e1a\u5b58\u5355",
    "\u5176\u4ed6\u8d44\u4ea7",
    "\u8868\u5916\u6536\u5165",
    "\u8d1f\u503a\u5408\u8ba1",
    "\u5411\u592e\u884c\u501f\u6b3e",
    "\u5b9a\u671f\u5b58\u653e",
    "\u6d3b\u671f\u5b58\u653e",
    "\u540c\u4e1a\u62c6\u5165",
    "\u5356\u51fa\u56de\u8d2d",
    "\u5b9a\u671f\u5b58\u6b3e",
    "\u6d3b\u671f\u5b58\u6b3e",
    "\u53d1\u884c\u503a\u5238",
    "\u53d1\u884c\u540c\u4e1a\u5b58\u5355",
    "\u5176\u4ed6\u8d1f\u503a",
    "\u8868\u5916\u652f\u51fa",
  ],
  liquidityCashFlowBuckets: [
    "\u6b21\u65e5",
    "2\u65e5\u81f37\u65e5",
    "8\u65e5\u81f330\u65e5",
    "31\u65e5\u81f390\u65e5",
    "91\u65e5\u81f31\u5e74",
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

async function setPageFilters(page, pageName, filters) {
  await page.evaluate(({ targetPageName, nextFilters }) => {
    const targetPage = data.pages.find((item) => item.name === targetPageName);
    if (!targetPage) throw new Error(`Unknown page: ${targetPageName}`);
    appState.pageFilters[targetPage.id] = {
      ...(appState.pageFilters[targetPage.id] || {}),
      ...nextFilters,
    };
    render();
  }, { targetPageName: pageName, nextFilters: filters });
}

async function expectAllProcessNodesHaveImpact(modal) {
  const resultNodes = modal.locator(".eve-process-node--result");
  const factorNodes = modal.locator(".eve-process-node:not(.eve-process-node--result):not(.eve-process-node--intermediate)");
  expect(await factorNodes.count()).toBeGreaterThan(0);
  await expect(resultNodes.locator(".eve-process-node__impact")).toHaveCount(0);
  await expect(factorNodes.locator(".eve-process-node__impact")).toHaveCount(await factorNodes.count());
  const factorTexts = await factorNodes.allTextContents();
  expect(factorTexts.every((text) => text.includes("增量") && text.includes("增速") && text.includes("影响"))).toBeTruthy();
  await expect(modal).not.toContainText("\u5f71\u54cd --");
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
  await expect(page.locator(".system-menu > .system-menu__item > span:nth-child(2)")).toHaveText([
    "\u98ce\u9669\u5206\u6790\u89c6\u56fe",
    "\u9650\u989d\u7ba1\u7406",
    "\u538b\u529b\u6d4b\u8bd5",
    "\u5e02\u573a\u6570\u636e\u7ba1\u7406",
  ]);
  await expect(page.locator("#pageTabs .page-tab")).toHaveText(TEXT.pages);
  for (const title of TEXT.pages) {
    await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: TEXT.removedPage, exact: true })).toHaveCount(0);
  const globalFilterBar = page.locator("#globalFilterBar");
  for (const removedBlock of ["\u6838\u5fc3\u98ce\u9669\u6307\u6807", "\u7f3a\u53e3\u98ce\u9669"]) {
    await expect(globalFilterBar.getByRole("button", { name: removedBlock, exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: removedBlock, exact: true })).toHaveCount(0);
  }
  await expect(globalFilterBar.locator(".global-filter-tab")).toHaveCount(0);
  await expect(globalFilterBar.locator('[data-owner-type="page"][data-filter-name="\u673a\u6784"]')).toHaveCount(1);
  await expect(globalFilterBar.locator('[data-owner-type="page"][data-filter-name="\u5e01\u79cd"]')).toHaveCount(1);
  await expect(page.locator(".block-section")).toHaveCount(0);
  await expect(page.locator(".area-card")).toHaveCount(0);
  for (const sectionTitle of [
    "\u6700\u5927\u7ecf\u6d4e\u4ef7\u503c\u53d8\u52a8\u6bd4\u4f8b",
    "\u51c0\u5229\u606f\u6536\u5165\u6ce2\u52a8\u7387",
    "\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387",
    "\u91cd\u5b9a\u4ef7\u4e45\u671f",
    "\u6295\u8d44\u7ec4\u5408\u4e45\u671f",
  ]) {
    await expect(globalFilterBar.getByRole("button", { name: sectionTitle, exact: true })).toHaveCount(0);
  }
  await expect(page.locator("#dashboardView").locator('[data-owner-type="area"][data-filter-name="\u673a\u6784"]')).toHaveCount(0);
  await expect(page.locator("#dashboardView").locator('[data-owner-type="area"][data-filter-name="\u5e01\u79cd"]')).toHaveCount(0);
  for (const title of TEXT.removedInterestTitles) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  for (const removedSeq of ["5", "8", "10", "11", "16", "17"]) {
    await expect(page.locator(`article[data-widget-seq="${removedSeq}"]`)).toHaveCount(0);
  }
  await expect(page.locator("#dashboardView article.widget-card h4").nth(1)).toHaveText("\u51c0\u5229\u606f\u6536\u5165\u6ce2\u52a8");
  await expect(page.getByRole("heading", { name: TEXT.mergedEveTableTitle, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "\u5404\u5e01\u79cd\u51c0\u5229\u606f\u6536\u5165\u6ce2\u52a8", exact: true })).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="13"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "\u6708\u65e5\u5747\u53e3\u5f84", exact: true })).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="9"]')).toBeVisible();
  await expect(page.locator('article[data-widget-seq="15"]')).toBeVisible();
  expect(await page.evaluate(() => window.dashboardDomainConfig.businessDurationOptions)).toEqual(TEXT.businessTypes);
  await expect(page.locator('article[data-widget-seq="901"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="902"]')).toHaveCount(0);
  const eveWidget = page.locator('article[data-widget-seq="1"]');
  const eveScopeModels = await page.evaluate(() => {
    const legal = buildEveDiagnosticModel({ seq: 1 }, {
      labels: ["2026-01", "2026-02"],
      signature: 13,
      filterState: { \u673a\u6784: ["\u6cd5\u4eba\u6c47\u603b"] },
    });
    const overseas = buildEveDiagnosticModel({ seq: 1 }, {
      labels: ["2026-01", "2026-02"],
      signature: 13,
      filterState: { \u673a\u6784: ["\u9999\u6e2f\u5206\u884c"] },
    });
    return { legal, overseas };
  });
  expect(eveScopeModels.legal.numerator[0]).toBe(Math.max(...eveScopeModels.legal.scenarios.map((item) => -item.values[0])));
  expect(eveScopeModels.legal.capital).toEqual(eveScopeModels.legal.legalTierOne);
  expect(eveScopeModels.legal.denominatorTitle).toBe("\u672c\u5916\u5e01\u5408\u8ba1\u4e00\u7ea7\u8d44\u672c\u51c0\u989d");
  expect(eveScopeModels.overseas.capital).toEqual(eveScopeModels.overseas.overseasAllocatedCapital);
  expect(eveScopeModels.overseas.denominatorTitle).toBe("\u672c\u5916\u5e01\u5408\u8ba1\u4e00\u7ea7\u8d44\u672c\u51c0\u989d");
  expect(eveScopeModels.overseas.usesOverseasAllocatedCapital).toBeTruthy();
  await eveWidget.locator('[data-eve-point="true"]').first().click({ force: true });
  const evePointPopover = eveWidget.locator(".eve-point-popover");
  await expect(evePointPopover.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await expect(evePointPopover).toContainText("\u65e5\u671f");
  await expect(evePointPopover).toContainText("\u53d6\u503c");
  await expect(evePointPopover).not.toContainText("\u8ddd\u9650\u989d");
  await expect(evePointPopover).not.toContainText("\u6700\u4e0d\u5229\u60c5\u666f");
  await eveWidget.getByRole("heading", { name: "\u6700\u5927\u7ecf\u6d4e\u4ef7\u503c\u53d8\u52a8\u6bd4\u4f8b\uff08\u25b3EVE \uff09", exact: true }).click();
  await expect(eveWidget.locator(".eve-point-popover")).toHaveCount(0);

  await eveWidget.locator('[data-eve-point="true"]').nth(3).click({ force: true });
  await eveWidget.locator(".eve-point-popover__action").click();
  await expect(eveWidget.locator(".eve-point-popover")).toHaveCount(0);
  const eveProcessModal = page.locator("#eveProcessModal");
  const eveComparisonSlider = eveProcessModal.locator('[data-process-date-slider="comparison"]');
  const eveCurrentSlider = eveProcessModal.locator('[data-process-date-slider="current"]');
  await expect(eveProcessModal.locator("[data-process-date-slider]")).toHaveCount(2);
  await expect(eveProcessModal.locator("select")).toHaveCount(0);
  await expect(eveComparisonSlider).toHaveAttribute("min", "0");
  await expect(eveCurrentSlider).toHaveAttribute("min", "0");
  expect(await eveComparisonSlider.getAttribute("max")).toBe(await eveCurrentSlider.getAttribute("max"));
  expect(Number(await eveCurrentSlider.inputValue())).toBe(Number(await eveCurrentSlider.getAttribute("max")));
  expect(Number(await eveComparisonSlider.inputValue())).toBe(Number(await eveCurrentSlider.inputValue()) - 1);
  const eveTimelineAlignment = await eveProcessModal.locator("[data-process-date-range]").evaluate((range) => {
    const comparison = range.querySelector('[data-process-date-slider="comparison"]');
    const current = range.querySelector('[data-process-date-slider="current"]');
    const maximum = Math.max(1, Number(current.max));
    const axisTicks = [...range.parentElement.querySelectorAll(".eve-process-slider__axis span")];
    return {
      comparisonPosition: parseFloat(range.style.getPropertyValue("--comparison-position")),
      expectedComparisonPosition: (Number(comparison.value) / maximum) * 100,
      currentPosition: parseFloat(range.style.getPropertyValue("--current-position")),
      expectedCurrentPosition: (Number(current.value) / maximum) * 100,
      tickCount: axisTicks.length,
      firstTickLeft: axisTicks[0]?.style.left,
      lastTickLeft: axisTicks.at(-1)?.style.left,
      tickLineHeight: axisTicks[0] ? getComputedStyle(axisTicks[0], "::before").height : "",
    };
  });
  expect(eveTimelineAlignment.comparisonPosition).toBeCloseTo(eveTimelineAlignment.expectedComparisonPosition, 3);
  expect(eveTimelineAlignment.currentPosition).toBeCloseTo(eveTimelineAlignment.expectedCurrentPosition, 3);
  expect(eveTimelineAlignment.tickCount).toBe(Number(await eveCurrentSlider.getAttribute("max")) + 1);
  expect(eveTimelineAlignment.firstTickLeft).toBe("0%");
  expect(eveTimelineAlignment.lastTickLeft).toBe("100%");
  expect(eveTimelineAlignment.tickLineHeight).toBe("7px");
  await expect(eveProcessModal).toContainText("\u6bd4\u8f83\u57fa\u671f");
  await expect(eveProcessModal).toContainText("\u5f53\u524d\u65e5\u671f");
  await expect(eveProcessModal).toContainText("△EVE = 六情景最大经济价值损失 ÷ 本外币合计一级资本净额");
  await expect(eveProcessModal.locator(".eve-process-node__change").first()).toContainText("\u8f83\u57fa\u671f");
  await expect(eveProcessModal.locator('[data-eve-process-node="eve"] .eve-process-node__impact')).toHaveCount(0);
  await expect(eveProcessModal.locator('[data-eve-process-node="numerator"]')).toContainText("\u589e\u91cf");
  await expect(eveProcessModal.locator('[data-eve-process-node="numerator"]')).toContainText("\u589e\u901f");
  await expect(eveProcessModal.locator('[data-eve-process-node="numerator"]')).toContainText("\u5f71\u54cd");
  await expect(eveProcessModal).not.toContainText("\u8f83\u4e0a\u671f");
  const earlierCurrentIndex = Math.max(1, Number(await eveCurrentSlider.inputValue()) - 2);
  await eveCurrentSlider.evaluate((node, value) => {
    node.value = String(value);
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, earlierCurrentIndex);
  expect(await page.evaluate(() => appState.eveProcessModal.dateIndex)).toBe(earlierCurrentIndex);
  expect(await page.evaluate(() => appState.eveProcessModal.comparisonIndex)).toBe(earlierCurrentIndex - 1);
  await eveComparisonSlider.evaluate((node) => {
    node.value = "0";
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(await page.evaluate(() => appState.eveProcessModal.comparisonIndex)).toBe(0);
  const eveNumeratorNode = eveProcessModal.locator('[data-eve-process-node="numerator"]');
  await expect(eveNumeratorNode.locator('[data-process-marker="comparison"]')).toHaveCount(1);
  await expect(eveNumeratorNode.locator('[data-process-marker="current"]')).toHaveCount(1);
  await expect(eveNumeratorNode.locator('[data-process-period-line="true"]')).toHaveCount(1);
  await expect(eveProcessModal).toContainText("\u672c\u5916\u5e01\u5408\u8ba1\u4e00\u7ea7\u8d44\u672c\u51c0\u989d");
  await expect(eveProcessModal.locator('[data-eve-process-node="denominator"] .eve-process-node__action')).toHaveCount(0);
  await expect(eveNumeratorNode.locator(".eve-process-node__action")).toContainText("\u70b9\u51fb\u5c55\u5f00");
    await eveNumeratorNode.locator(".eve-process-node__action").click();
    await expect(eveNumeratorNode.locator(".eve-process-node__action")).toContainText("\u70b9\u51fb\u6536\u56de");
    await expect(eveProcessModal).toContainText("六情景最大经济价值损失 = MAX");
    await expect(eveProcessModal).toContainText("= -MIN（六情景经济价值变动）");
    await expect(eveProcessModal).not.toContainText("正式归因");
    await expect(eveProcessModal).not.toContainText("混合状态执行Shapley");
    await expect(eveProcessModal).not.toContainText("情景切换仅作辅助状态");
    await expect(eveProcessModal.locator('[data-eve-process-node="same-worst-scenario"]')).toHaveCount(0);
    await expect(eveProcessModal.locator('[data-eve-process-node="worst-scenario-switch"]')).toHaveCount(0);
    await expect(eveProcessModal).toContainText("\u5e73\u884c\u4e0a\u79fb");
    const eveScenarioCards = eveProcessModal.locator('[data-eve-process-node^="scenario:"]');
    await expect(eveScenarioCards).toHaveCount(6);
    await expect(eveScenarioCards.locator(".eve-process-node__impact")).toHaveCount(6);
    await expectAllProcessNodesHaveImpact(eveProcessModal);
  const eveScenarioWidths = await eveProcessModal.locator(".eve-process-scenario-strip .eve-process-node").evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().width))
  );
  expect(new Set(eveScenarioWidths)).toEqual(new Set([276]));
  await eveNumeratorNode.locator(".eve-process-node__action").click();
  await expect(eveNumeratorNode.locator(".eve-process-node__action")).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await page.evaluate(() => {
    appState.pageFilters["interest-risk"].\u673a\u6784 = ["\u9999\u6e2f\u5206\u884c"];
    renderEveProcessModal();
  });
  const overseasDenominatorAction = eveProcessModal.locator('[data-eve-process-node="denominator"] .eve-process-node__action');
  await expect(overseasDenominatorAction).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await overseasDenominatorAction.click();
  await expect(eveProcessModal).toContainText("\u5883\u5916\u5206\u884cRWA");
  await expect(eveProcessModal).toContainText("\u6cd5\u4ebaRWA");
  await expect(eveProcessModal).toContainText("\u6cd5\u4eba\u672c\u5916\u5e01\u5408\u8ba1\u4e00\u7ea7\u8d44\u672c\u51c0\u989d");
  await expect(eveProcessModal).toContainText("本外币合计一级资本净额 = 境外分行RWA ÷ 法人RWA × 法人本外币合计一级资本净额");
  await expectAllProcessNodesHaveImpact(eveProcessModal);
  await expect(overseasDenominatorAction).toContainText("\u70b9\u51fb\u6536\u56de");
  await page.evaluate(() => {
    appState.pageFilters["interest-risk"].\u673a\u6784 = ["\u6cd5\u4eba\u6c47\u603b"];
    renderEveProcessModal();
  });
  await page.keyboard.press("Escape");
  const maturityDistributionWidget = page.locator('article[data-widget-seq="14"]');
  await expect(maturityDistributionWidget).toBeVisible();
  await expect(maturityDistributionWidget).toHaveClass(/widget-card--full/);
  await expect(maturityDistributionWidget.locator(".area-subtab")).toHaveCount(0);
  await expect(maturityDistributionWidget).toContainText("\u9010\u7b14\u91cd\u5b9a\u4ef7\u660e\u7ec6");
  const repricingMaturityRanges = await page.evaluate(() => getRepricingMaturityDateRanges());
  expect(repricingMaturityRanges).toHaveLength(12);
  expect(repricingMaturityRanges.map((range) => range.tenorBucket)).toEqual([
    "\u9694\u591c", "1~2\u4e2a\u6708", "2~3\u4e2a\u6708", "3~4\u4e2a\u6708", "4~5\u4e2a\u6708", "5~6\u4e2a\u6708",
    "6~7\u4e2a\u6708", "7~8\u4e2a\u6708", "8~9\u4e2a\u6708", "9~10\u4e2a\u6708", "10~11\u4e2a\u6708", "11~12\u4e2a\u6708",
  ]);
  await expect(maturityDistributionWidget.locator("svg")).toContainText(repricingMaturityRanges[0].tenorBucket);
  await expect(maturityDistributionWidget.locator("svg")).toContainText(repricingMaturityRanges[11].tenorBucket);
  await expect(maturityDistributionWidget.locator("svg")).not.toContainText(repricingMaturityRanges[0].label);
  await expect(maturityDistributionWidget.locator(".repricing-maturity-chart__axis-title")).toHaveText("\u91cd\u5b9a\u4ef7\u671f\u9650");
  expect(await maturityDistributionWidget.locator("[data-repricing-maturity-cell]").count()).toBeGreaterThan(0);
  await maturityDistributionWidget.locator('[data-repricing-maturity-cell][data-business-type="\u6295\u8d44\u7c7b\u8d44\u4ea7"]').first().click();
  await expect(maturityDistributionWidget.locator(".repricing-maturity-detail")).toContainText("\u6295\u8d44\u7c7b\u8d44\u4ea7");
  await expect(maturityDistributionWidget.locator(".repricing-maturity-detail")).toContainText("\u5ba2\u6237/\u53d1\u884c\u4eba");
  await expect(maturityDistributionWidget.locator(".repricing-maturity-detail")).toContainText("\u91cd\u5b9a\u4ef7\u91d1\u989d");
  await expect(maturityDistributionWidget.locator(".repricing-maturity-detail")).toContainText("\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5");
  const repricingGapRow = await page.evaluate(() => {
    const gapWidget = document.querySelector('article[data-widget-seq="9"]');
    const durationGapWidget = document.querySelector('article[data-widget-seq="15"]');
    if (!gapWidget || !durationGapWidget) return null;
    const gapRect = gapWidget.getBoundingClientRect();
    const durationGapRect = durationGapWidget.getBoundingClientRect();
    return {
      sameRow: Math.abs(gapRect.top - durationGapRect.top) < 8,
      gapRight: gapRect.right,
      durationGapLeft: durationGapRect.left,
    };
  });
  expect(repricingGapRow).not.toBeNull();
  expect(repricingGapRow.sameRow).toBeTruthy();
  expect(repricingGapRow.gapRight).toBeLessThanOrEqual(repricingGapRow.durationGapLeft);
  await expect(page.locator('article[data-widget-seq="9"]')).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387");
  await expect(page.locator('article[data-widget-seq="9"]').getByRole("tab", { name: "\u6708\u9891", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.locator('article[data-widget-seq="9"]').getByRole("tab", { name: "\u65e5\u9891", exact: true }).click();
  await expect(page.locator('article[data-widget-seq="9"]').getByRole("tab", { name: "\u65e5\u9891", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387\uff08\u6708\u9891\uff09", { exact: true })).toHaveCount(0);
  await expect(page.getByText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387\uff08\u65e5\u9891\uff09", { exact: true })).toHaveCount(0);
  const durationGapWidget = page.locator('article[data-widget-seq="15"]');
  await expect(durationGapWidget).toContainText("\u8d44\u4ea7\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f\u7f3a\u53e3");
  const durationGapPointCount = await durationGapWidget.locator('[data-repricing-duration-gap-point="true"]').count();
  expect(durationGapPointCount).toBeGreaterThan(0);
  await expect(durationGapWidget.locator('[data-repricing-duration-gap-bar="asset"]')).toHaveCount(durationGapPointCount);
  await expect(durationGapWidget.locator('[data-repricing-duration-gap-bar="liability"]')).toHaveCount(durationGapPointCount);
  await expect(durationGapWidget.locator(".repricing-duration-gap-line")).toHaveCount(1);
  await expect(durationGapWidget.locator(".chart-legend")).toContainText("\u8d44\u4ea7\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await expect(durationGapWidget.locator(".chart-legend")).toContainText("\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await expect(durationGapWidget.locator(".chart-legend")).toContainText("\u8d44\u4ea7\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f\u7f3a\u53e3");
  await durationGapWidget.locator('[data-repricing-duration-gap-point="true"]').nth(3).click({ force: true });
  await expect(durationGapWidget.locator(".eve-point-popover__grid > div")).toHaveCount(4);
  await expect(durationGapWidget.locator(".eve-point-popover")).toContainText("\u8d44\u4ea7\u4e45\u671f");
  await expect(durationGapWidget.locator(".eve-point-popover")).toContainText("\u8d1f\u503a\u4e45\u671f");
  await expect(durationGapWidget.locator(".eve-point-popover")).toContainText("\u4e45\u671f\u7f3a\u53e3");
  await expect(durationGapWidget.locator(".eve-point-popover__action")).toHaveCount(0);
  await expect(durationGapWidget.getByRole("button", { name: "\u67e5\u770b\u8ba1\u7b97\u8fc7\u7a0b", exact: true })).toHaveCount(0);
  const repricingGapWidget = page.locator('article[data-widget-seq="9"]');
  await expect(repricingGapWidget.locator('[data-filter-name="活期存款"] .filter-select__value')).toHaveText("不含");
  await expect(repricingGapWidget.locator('[data-filter-name="表外衍生品"] .filter-select__value')).toHaveText("含银行账簿和交易账簿");
  const repricingCaliberModels = await page.evaluate(() => {
    const build = (demandDepositScope, derivativeScope) => buildRepricingGapDiagnosticModel({ seq: 9 }, {
      pageId: "interest-risk",
      labels: ["2026-01", "2026-02"],
      filterState: {
        机构: ["法人汇总"],
        活期存款: [demandDepositScope],
        表外衍生品: [derivativeScope],
      },
    });
    return {
      defaultModel: build("不含", "含银行账簿和交易账簿"),
      withDemandDeposits: build("含", "含银行账簿和交易账簿"),
      withoutDerivatives: build("不含", "不含"),
      withBankBookOnly: build("不含", "仅含银行账簿"),
    };
  });
  const { defaultModel, withDemandDeposits, withoutDerivatives, withBankBookOnly } = repricingCaliberModels;
  expect(defaultModel.supportsAttribution).toBeTruthy();
  expect(withDemandDeposits.supportsAttribution).toBeFalsy();
  expect(withoutDerivatives.supportsAttribution).toBeFalsy();
  expect(withBankBookOnly.supportsAttribution).toBeFalsy();
  expect(defaultModel.liabilityItems.map((item) => item.title)).not.toContain("活期存款");
  const demandDepositItem = withDemandDeposits.liabilityItems.find((item) => item.title === "活期存款");
  expect(demandDepositItem).toBeTruthy();
  expect(withDemandDeposits.totalInterestAssets[0]).toBe(defaultModel.totalInterestAssets[0]);
  expect(withDemandDeposits.numerator[0]).toBeCloseTo(defaultModel.numerator[0] - demandDepositItem.values[0], 10);
  expect(withoutDerivatives.bankBookDerivativeGap[0]).toBe(0);
  expect(withoutDerivatives.tradingBookDerivativeGap[0]).toBe(0);
  expect(withBankBookOnly.bankBookDerivativeGap[0]).toBe(defaultModel.bankBookDerivativeGap[0]);
  expect(withBankBookOnly.tradingBookDerivativeGap[0]).toBe(0);
  const repricingScopeModels = await page.evaluate(() => {
    const build = (organization) => buildRepricingGapDiagnosticModel({ seq: 9 }, {
      pageId: "interest-risk",
      labels: ["2026-01", "2026-02"],
      signature: 17,
      filterState: { \u673a\u6784: [organization] },
    });
    return { aggregate: build("\u6cd5\u4eba\u6c47\u603b"), branch: build("\u9999\u6e2f\u5206\u884c") };
  });
  expect(repricingScopeModels.aggregate.includesInternalTransactions).toBeFalsy();
  expect(repricingScopeModels.branch.includesInternalTransactions).toBeTruthy();
  expect(repricingScopeModels.aggregate.assetItems.map((item) => item.title)).not.toContain("\u5185\u90e8\u4ea4\u6613\u8d44\u4ea7");
  expect(repricingScopeModels.branch.assetItems.map((item) => item.title)).toContain("\u5185\u90e8\u4ea4\u6613\u8d44\u4ea7");
  for (const model of [repricingScopeModels.aggregate, repricingScopeModels.branch]) {
    expect(model.numerator[0]).toBe(Number((
      model.adjustedInterestAssets[0]
      - model.adjustedInterestLiabilities[0]
      + model.bankBookDerivativeGap[0]
      + model.tradingBookDerivativeGap[0]
    ).toFixed(1)));
    expect(model.tradingBookDerivativeGap[0]).toBe(Number((model.tradingBookReceivable[0] - model.tradingBookPayable[0]).toFixed(1)));
    expect(model.totalInterestAssets[0]).toBe(Number(model.totalInterestAssetItems.reduce(
      (sum, item) => sum + item.values[0], 0
    ).toFixed(1)));
  }
  await repricingGapWidget.scrollIntoViewIfNeeded();
  await repricingGapWidget.locator('[data-repricing-gap-point="true"]').nth(3).click({ force: true });
  await page.getByRole("button", { name: "\u67e5\u770b\u8ba1\u7b97\u8fc7\u7a0b", exact: true }).click();
  await expect(page.locator("#repricingGapProcessModal [data-process-date-slider]")).toHaveCount(2);
  await expect(page.locator("#repricingGapProcessModal select")).toHaveCount(0);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u8f83\u57fa\u671f");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="ratio"] [data-process-marker]')).toHaveCount(2);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="ratio"] [data-process-period-line="true"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="ratio"] .eve-process-node__impact')).toHaveCount(0);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387 = \u91cd\u5b9a\u4ef7\u7f3a\u53e3 \u00f7 \u603b\u751f\u606f\u8d44\u4ea7\u89c4\u6a21\uff08\u5254\u9664\u5185\u90e8\u4ea4\u6613\uff09");
  await expect(page.locator("#repricingGapProcessModal")).toContainText("重定价缺口 = 资产端业务重定价规模 - 负债端业务重定价规模 + 银行账簿表外衍生品缺口 + 交易账簿表外衍生品缺口");
  await expect(page.locator("#repricingGapProcessModal")).not.toContainText("\u56db\u7c7b\u4e1a\u52a1\u5f71\u54cd\u4e4b\u548c");
  await expect(page.locator("#repricingGapProcessModal")).not.toContainText("\u5f71\u54cd\u5f52\u56e0");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="numerator"] .eve-process-node__impact')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="denominator"] .eve-process-node__impact')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal .repricing-gap-attribution-card--branch')).toHaveCount(4);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).toContainText("\u8d44\u4ea7\u7aef\u4e1a\u52a1");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).toContainText("\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).toContainText("\u603b\u89c4\u6a21");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).toContainText("\u5f71\u54cd");
  const assetBranchMetrics = page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"] .repricing-gap-attribution-card__metric');
  await expect(assetBranchMetrics).toHaveCount(2);
  await expect(assetBranchMetrics.nth(0)).toContainText("\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(assetBranchMetrics.nth(0).locator(".repricing-gap-attribution-card__metric-impact")).toContainText("\u5f71\u54cd");
  await expect(assetBranchMetrics.nth(1)).toContainText("\u603b\u89c4\u6a21");
  await expect(assetBranchMetrics.nth(1).locator(".repricing-gap-attribution-card__metric-impact")).toContainText("\u5f71\u54cd");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"] > .repricing-gap-attribution-card__select .repricing-gap-attribution-card__impact')).toContainText("\u5408\u8ba1\u5f71\u54cd");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).not.toContainText("\u5f53\u524d\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]')).not.toContainText("\u5f53\u524d\u603b\u751f\u606f\u8d44\u4ea7");
  for (const derivativeGapKey of ["bank-book-derivative-gap", "trading-book-derivative-gap"]) {
    const derivativeGapCard = page.locator(`#repricingGapProcessModal [data-repricing-gap-process-node="${derivativeGapKey}"]`);
    await expect(derivativeGapCard).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3");
    await expect(derivativeGapCard).not.toContainText("\u5f53\u524d\u51c0\u7f3a\u53e3");
  }
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-business-expansion")).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="adjusted-assets"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-business-expansion")).toHaveCount(1);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("重定价规模 = Σ（一年内各期限桶 × 期限权重）；总规模 = 一年内期限桶合计 + 一年外及无明确重定价期限资产");
  const numeratorNodeBox = await page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="numerator"]').boundingBox();
  const assetNodeBox = await page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]').boundingBox();
  const assetLeafBox = await page.locator("#repricingGapProcessModal .repricing-gap-business-expansion").boundingBox();
  expect(numeratorNodeBox).not.toBeNull();
  expect(assetNodeBox).not.toBeNull();
  expect(assetLeafBox).not.toBeNull();
  expect(Math.abs(assetNodeBox.width - numeratorNodeBox.width)).toBeLessThan(2);
  expect(assetLeafBox.x).toBeGreaterThan(assetNodeBox.x + assetNodeBox.width);
  for (const key of ["self-operated-loans", "investment-assets", "interbank-assets", "non-standard-investments", "central-bank-deposits"]) {
    await expect(page.locator(`#repricingGapProcessModal [data-repricing-gap-process-node="${key}"]`)).toHaveCount(1);
  }
  const loanRepricingCard = page.locator('#repricingGapProcessModal [data-repricing-gap-business-card="self-operated-loans"]');
  const repricingLeafWidths = await page.locator("#repricingGapProcessModal .repricing-gap-business-strip .repricing-gap-attribution-card").evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().width))
  );
  expect(new Set(repricingLeafWidths)).toEqual(new Set([276]));
  await expect(loanRepricingCard).toContainText("\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(loanRepricingCard).toContainText("\u603b\u89c4\u6a21");
  await expect(loanRepricingCard).not.toContainText("\u5f53\u524d\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(loanRepricingCard).not.toContainText("\u5f53\u524d\u603b\u751f\u606f\u8d44\u4ea7");
  await expect(loanRepricingCard).toContainText("\u589e\u91cf");
  await expect(loanRepricingCard).toContainText("\u589e\u901f");
  await expect(loanRepricingCard).toContainText("\u5f71\u54cd");
  const loanRepricingMetrics = loanRepricingCard.locator(".repricing-gap-attribution-card__metric");
  await expect(loanRepricingMetrics).toHaveCount(2);
  await expect(loanRepricingMetrics.nth(0).locator(".repricing-gap-attribution-card__metric-impact")).toContainText("\u5f71\u54cd");
  await expect(loanRepricingMetrics.nth(1).locator(".repricing-gap-attribution-card__metric-impact")).toContainText("\u5f71\u54cd");
  await expect(loanRepricingCard.locator(".repricing-gap-attribution-card__impact")).toContainText("\u5408\u8ba1\u5f71\u54cd");
  const [loanRepricingScaleBox, loanTotalScaleBox] = await Promise.all([
    loanRepricingMetrics.nth(0).boundingBox(),
    loanRepricingMetrics.nth(1).boundingBox(),
  ]);
  const loanCombinedImpactBox = await loanRepricingCard.locator(".repricing-gap-attribution-card__impact").boundingBox();
  expect(loanRepricingScaleBox).not.toBeNull();
  expect(loanTotalScaleBox).not.toBeNull();
  expect(loanCombinedImpactBox).not.toBeNull();
  expect(Math.abs(loanRepricingScaleBox.y - loanTotalScaleBox.y)).toBeLessThan(2);
  expect(Math.abs(loanRepricingScaleBox.width - loanTotalScaleBox.width)).toBeLessThan(2);
  expect(loanTotalScaleBox.x).toBeGreaterThan(loanRepricingScaleBox.x + loanRepricingScaleBox.width - 2);
  expect(loanCombinedImpactBox.y).toBeGreaterThan(
    Math.max(
      loanRepricingScaleBox.y + loanRepricingScaleBox.height,
      loanTotalScaleBox.y + loanTotalScaleBox.height
    ) - 2
  );
  await expect(loanRepricingCard.locator(".eve-process-sparkline")).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="bank-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="adjusted-liabilities"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-business-expansion")).toHaveCount(2);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="bank-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="trading-book-derivative-gap"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-business-expansion")).toHaveCount(3);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("交易账簿表外衍生品缺口 = 交易账簿表外衍生品应收 - 交易账簿表外衍生品应付");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536");
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).toContainText("\u91cd\u5b9a\u4ef7\u89c4\u6a21");
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).not.toContainText("\u5f53\u524d\u89c4\u6a21");
  const repricingAttributionCards = page.locator("#repricingGapProcessModal .repricing-gap-attribution-card");
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-attribution-card .eve-process-node__impact")).toHaveCount(await repricingAttributionCards.count());
  await expect(page.locator("#repricingGapProcessModal")).not.toContainText("\u5f71\u54cd --");
  await page.locator('[data-repricing-gap-process-node="adjusted-assets"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-business-expansion")).toHaveCount(2);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).toHaveCount(1);
  await expect(page.locator('[data-repricing-gap-process-node="trading-book-derivative-gap"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await page.locator('[data-repricing-gap-process-node="numerator"] [data-process-sparkline]').click();
  await expect(page.locator("#processSparklinePreview")).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3");
  await page.locator('#processSparklinePreview button[data-close-process-sparkline="true"]').click();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    appState.widgetFilters[9] = {
      ...(appState.widgetFilters[9] || {}),
      活期存款: ["含"],
      表外衍生品: ["含银行账簿和交易账簿"],
    };
    render();
  });
  const nonDefaultRepricingGapWidget = page.locator('article[data-widget-seq="9"]');
  await nonDefaultRepricingGapWidget.locator('[data-repricing-gap-point="true"]').nth(3).click({ force: true });
  await expect(nonDefaultRepricingGapWidget.locator(".eve-point-popover__hint")).toContainText("仅“不含活期存款、含银行账簿和交易账簿表外衍生品”口径支持拆解归因");
  await expect(nonDefaultRepricingGapWidget.locator('[data-open-repricing-gap-process="true"]')).toHaveCount(0);
  await page.evaluate(() => {
    appState.widgetFilters[9] = {
      ...(appState.widgetFilters[9] || {}),
      活期存款: ["不含"],
      表外衍生品: ["含银行账簿和交易账簿"],
    };
    appState.repricingGapPointPopover = null;
    render();
  });
  await expect(page.locator("#globalFilterBar").getByRole("button", { name: TEXT.interestBondBlock, exact: true })).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="60"]').getByRole("heading", { name: TEXT.interestPortfolioDurationTitle, exact: true })).toBeVisible();
  expect(await page.locator('article[data-widget-seq="60"] svg polyline').count()).toBeGreaterThan(0);
  for (const title of TEXT.investmentFinanceBondWidgetTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  const bondScaleBarCount = await page.locator('article[data-widget-seq="59"] svg rect').evaluateAll((nodes) =>
    nodes.filter((node) => Number(node.getAttribute("height") || 0) > 4).length
  );
  expect(bondScaleBarCount).toBeGreaterThan(0);
  await expect(page.locator('article[data-widget-seq="59"] .chart-stage')).toContainText("2026-01");
  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  for (const removedBlock of ["\u6838\u5fc3\u98ce\u9669\u6307\u6807", "\u73b0\u91d1\u6d41\u9519\u914d"]) {
    await expect(globalFilterBar.getByRole("button", { name: removedBlock, exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: removedBlock, exact: true })).toHaveCount(0);
  }
  await expect(globalFilterBar.locator(".global-filter-tab")).toHaveCount(0);
  await expect(globalFilterBar.locator('[data-owner-type="page"][data-filter-name="\u673a\u6784"]')).toHaveCount(1);
  await expect(globalFilterBar.locator('[data-owner-type="page"][data-filter-name="\u5e01\u79cd"]')).toHaveCount(1);
  for (const sectionTitle of [
    "\u6d41\u52a8\u6027\u8986\u76d6\u7387LCR",
    "\u51c0\u7a33\u5b9a\u8d44\u91d1\u6bd4\u7387NSFR",
    "\u6d41\u52a8\u6027\u6bd4\u4f8b",
    "\u6d41\u52a8\u6027\u7f3a\u53e3",
  ]) {
    await expect(globalFilterBar.getByRole("button", { name: sectionTitle, exact: true })).toHaveCount(0);
  }
  for (const title of TEXT.removedLiquidityTitles) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  await expect(page.locator('article[data-widget-seq="43"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="44"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="45"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="47"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="48"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="50"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="55"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="56"]')).toHaveCount(0);
  const lcrWidget = page.locator('article[data-widget-seq="42"]');
  await expect(lcrWidget.getByRole("heading", { name: "\u6d41\u52a8\u6027\u8986\u76d6\u7387LCR", exact: true })).toBeVisible();
  await lcrWidget.locator('[data-liquidity-point="true"]').nth(3).dispatchEvent("click");
  await lcrWidget.locator(".eve-point-popover__action").click();
  const liquidityComparisonSlider = page.locator('#liquidityProcessModal [data-process-date-slider="comparison"]');
  const liquidityCurrentSlider = page.locator('#liquidityProcessModal [data-process-date-slider="current"]');
  await expect(page.locator("#liquidityProcessModal [data-process-date-slider]")).toHaveCount(2);
  await expect(page.locator("#liquidityProcessModal select")).toHaveCount(0);
  expect(Number(await liquidityCurrentSlider.inputValue())).toBe(Number(await liquidityCurrentSlider.getAttribute("max")));
  expect(Number(await liquidityComparisonSlider.inputValue())).toBe(Number(await liquidityCurrentSlider.inputValue()) - 1);
  await liquidityComparisonSlider.evaluate((node) => {
    node.value = "0";
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(await page.evaluate(() => appState.liquidityProcessModal.comparisonIndex)).toBe(0);
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u8f83\u57fa\u671f");
  await expect(page.locator('#liquidityProcessModal [data-liquidity-process-node="ratio"] [data-process-marker]')).toHaveCount(2);
  await expect(page.locator('#liquidityProcessModal [data-liquidity-process-node="ratio"] [data-process-period-line="true"]')).toHaveCount(1);
  const lcrModel = await page.evaluate(() => buildLiquidityDiagnosticModel({ seq: 42 }, { labels: ["2026-01"], signature: 7, kind: "lcr" }));
  expect(lcrModel.components.hqla[0]).toBeCloseTo(
    lcrModel.components.level1Assets[0] + lcrModel.components.level2AAssets[0] + lcrModel.components.level2BAssets[0],
    12
  );
  expect(lcrModel.components.rawNetOutflows[0]).toBeCloseTo(
    lcrModel.components.cashOutflows[0] - lcrModel.components.cashInflows[0],
    12
  );
  expect(lcrModel.components.adjustedNetOutflows[0]).toBe(Math.max(
    lcrModel.components.rawNetOutflows[0],
    lcrModel.components.minimumNetOutflows[0]
  ));
  expect(lcrModel.ratios[0]).toBeCloseTo(
    (lcrModel.components.hqla[0] / lcrModel.components.adjustedNetOutflows[0]) * 100,
    12
  );
  await expect(page.locator("#liquidityProcessModal")).toContainText("LCR = \u5408\u683c\u4f18\u8d28\u6d41\u52a8\u6027\u8d44\u4ea7HQLA \u00f7 \u7ecf\u8c03\u6574\u540e\u51c0\u73b0\u91d1\u6d41\u51fa");
  await page.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action').click();
  await expect(page.locator("#liquidityProcessModal")).toContainText("合格优质流动性资产HQLA = 一级资产 + 2A资产 + 2B资产");
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u4e00\u7ea7\u8d44\u4ea7");
  await expect(page.locator("#liquidityProcessModal")).toContainText("2A\u8d44\u4ea7");
  await expect(page.locator("#liquidityProcessModal")).toContainText("2B\u8d44\u4ea7");
  await page.locator('[data-liquidity-process-node="denominator"] .eve-process-node__action').click();
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u539f\u59cb\u51c0\u73b0\u91d1\u6d41\u51fa");
  await expect(page.locator("#liquidityProcessModal")).toContainText("25%\u73b0\u91d1\u6d41\u51fa");
  await expect(page.locator("#liquidityProcessModal")).toContainText("max\uff08\u539f\u59cb\u51c0\u73b0\u91d1\u6d41\u51fa\uff0c0.25 \u00d7 \u73b0\u91d1\u6d41\u51fa\uff09");
  await expect(page.locator('#liquidityProcessModal [data-liquidity-process-node="cash-outflow"]')).toHaveCount(0);
  await page.locator('[data-liquidity-process-node="raw-net-outflow"] .eve-process-node__action').click();
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u672a\u676530\u5929\u73b0\u91d1\u6d41\u51fa\u91cf");
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u672a\u676530\u5929\u73b0\u91d1\u6d41\u5165\u91cf");
  await expect(page.locator("#liquidityProcessModal")).not.toContainText("正式归因因素为现金流出和现金流入");
  await expect(page.locator("#liquidityProcessModal")).not.toContainText("分支切换是内生计算状态");
  await expect(page.locator('[data-liquidity-process-node="constraint-branch-switch"]')).toHaveCount(0);
  await expect(page.locator('[data-liquidity-process-node="raw-net-outflow"] .eve-process-node__impact')).toHaveCount(0);
  await expect(page.locator('[data-liquidity-process-node="minimum-net-outflow"] .eve-process-node__impact')).toHaveCount(0);
  const rawNetOutflowBox = await page.locator('#liquidityProcessModal [data-liquidity-process-node="raw-net-outflow"]').boundingBox();
  const cashOutflowBox = await page.locator('#liquidityProcessModal [data-liquidity-process-node="cash-outflow"]').boundingBox();
  expect(rawNetOutflowBox).not.toBeNull();
  expect(cashOutflowBox).not.toBeNull();
  expect(cashOutflowBox.x).toBeGreaterThan(rawNetOutflowBox.x + rawNetOutflowBox.width);
  expect(Math.abs(cashOutflowBox.y - rawNetOutflowBox.y)).toBeLessThan(90);
  await expectAllProcessNodesHaveImpact(page.locator("#liquidityProcessModal"));
  const lcrFactorWidths = await page.locator("#liquidityProcessModal .liquidity-process-component-strip--ratio > .eve-process-node").evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().width))
  );
  expect(new Set(lcrFactorWidths)).toEqual(new Set([270]));
  const lcrFactorLayout = await page.locator('#liquidityProcessModal [data-liquidity-process-node="level-1-assets"]').evaluate((node) => {
    const title = node.querySelector(".eve-process-node__title strong").getBoundingClientRect();
    const value = node.querySelector(".eve-process-node__value").getBoundingClientRect();
    const comparisons = node.querySelector(".eve-process-node__comparisons").getBoundingClientRect();
    return {
      titleAndValueShareTopRow: Math.abs(title.top - value.top) < 10 && value.left > title.left,
      comparisonsBelowValue: comparisons.top >= value.bottom - 1,
    };
  });
  expect(lcrFactorLayout.titleAndValueShareTopRow).toBeTruthy();
  expect(lcrFactorLayout.comparisonsBelowValue).toBeTruthy();
  await expect(page.locator('[data-liquidity-process-node="raw-net-outflow"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await expect(page.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await page.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action').click();
  await expect(page.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(page.locator('[data-liquidity-process-node="level-1-assets"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  const nsfrWidget = page.locator('article[data-widget-seq="46"]');
  await expect(nsfrWidget.getByRole("heading", { name: "\u51c0\u7a33\u5b9a\u8d44\u91d1\u6bd4\u4f8bNSFR", exact: true })).toBeVisible();
  await nsfrWidget.locator('[data-liquidity-point="true"]').nth(3).dispatchEvent("click");
  await nsfrWidget.locator(".eve-point-popover__action").click();
  await expect(page.locator("#liquidityProcessModal")).toContainText("NSFR = 可用的稳定资金 ÷ 所需的稳定资金");
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u53ef\u7528\u7684\u7a33\u5b9a\u8d44\u91d1");
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u6240\u9700\u7684\u7a33\u5b9a\u8d44\u91d1");
  await expectAllProcessNodesHaveImpact(page.locator("#liquidityProcessModal"));
  await expect(page.locator('#liquidityProcessModal [data-liquidity-process-node="numerator"] .eve-process-node__action')).toHaveCount(0);
  await page.keyboard.press("Escape");
  const liquidityGapWidget = page.locator('article[data-widget-seq="49"]');
  await expect(liquidityGapWidget.getByRole("heading", { name: "\u6d41\u52a8\u6027\u7f3a\u53e3", exact: true })).toBeVisible();
  const liquidityRatioWidget = page.locator('article[data-widget-seq="53"]');
  await expect(liquidityRatioWidget.getByRole("heading", { name: "\u6d41\u52a8\u6027\u6bd4\u4f8b", exact: true })).toBeVisible();
  const liquidityRatioModel = await page.evaluate(() => buildLiquidityDiagnosticModel(
    { seq: 53 },
    { labels: ["2026-01"], signature: 19, kind: "liquidityRatio" }
  ));
  expect(liquidityRatioModel.components.liquidityAssetItems).toHaveLength(9);
  expect(liquidityRatioModel.components.liquidityLiabilityItems).toHaveLength(7);
  const interbankAssetItem = liquidityRatioModel.components.liquidityAssetItems.find(
    (item) => item.key === "liquidity-interbank-net-assets"
  );
  const interbankLiabilityItem = liquidityRatioModel.components.liquidityLiabilityItems.find(
    (item) => item.key === "liquidity-interbank-net-liabilities"
  );
  expect(interbankAssetItem.values[0] * interbankLiabilityItem.values[0]).toBe(0);
  expect(interbankAssetItem.values[0] - interbankLiabilityItem.values[0]).toBe(
    liquidityRatioModel.components.interbankNetPosition[0]
  );
  expect(liquidityRatioModel.numerator[0]).toBe(Number(liquidityRatioModel.components.liquidityAssetItems.reduce(
    (sum, item) => sum + item.values[0], 0
  ).toFixed(1)));
  expect(liquidityRatioModel.denominator[0]).toBe(Number(liquidityRatioModel.components.liquidityLiabilityItems.reduce(
    (sum, item) => sum + item.values[0], 0
  ).toFixed(1)));
  const liquidityGapRatioRow = await page.evaluate(() => {
    const gapWidget = document.querySelector('article[data-widget-seq="49"]');
    const ratioWidget = document.querySelector('article[data-widget-seq="53"]');
    if (!gapWidget || !ratioWidget) return null;
    const gapRect = gapWidget.getBoundingClientRect();
    const ratioRect = ratioWidget.getBoundingClientRect();
    return {
      sameRow: Math.abs(gapRect.top - ratioRect.top) < 8,
      gapBeforeRatio: gapRect.right <= ratioRect.left,
    };
  });
  expect(liquidityGapRatioRow).not.toBeNull();
  expect(liquidityGapRatioRow.sameRow).toBeTruthy();
  expect(liquidityGapRatioRow.gapBeforeRatio).toBeTruthy();
  const liquidityGapModels = await page.evaluate(() => ["1D", "7D", "30D", "3M", "1Y"].map((tenor) =>
    buildLiquidityGapDiagnosticModel({ seq: 49 }, {
      labels: ["2026-01"],
      signature: 23,
      filterState: { \u671f\u9650\u957f\u5ea6: [tenor], \u53e3\u5f84: ["\u65f6\u70b9"] },
    })
  ));
  for (const model of liquidityGapModels) {
    const components = model.components;
    expect(components.dueOnOffBalanceAssets[0]).toBe(Number((
      components.assetTotal[0] + components.offBalanceIncome[0] + components.internalTransactionAssets[0]
    ).toFixed(1)));
    expect(components.dueOnOffBalanceLiabilities[0]).toBe(Number((
      components.liabilityTotal[0] + components.offBalanceExpense[0] + components.internalTransactionLiabilities[0]
    ).toFixed(1)));
    expect(components.demandDepositAdjustment[0]).toBe(Number((
      components.demandDeposits[0] - components.noteDemandDeposits[0]
    ).toFixed(1)));
    expect(components.demandPlacementAdjustment[0]).toBe(Number((
      components.demandPlacements[0] - components.noteDemandPlacements[0]
    ).toFixed(1)));
    expect(components.adjustedDueOnOffBalanceLiabilities[0]).toBe(Number((
      components.dueOnOffBalanceLiabilities[0]
      - components.demandDepositAdjustment[0]
      - components.demandPlacementAdjustment[0]
    ).toFixed(1)));
    expect(model.numerator[0]).toBe(Number((
      components.dueOnOffBalanceAssets[0]
      - components.adjustedDueOnOffBalanceLiabilities[0]
    ).toFixed(1)));
    expect(model.denominator[0]).toBe(components.dueOnOffBalanceAssets[0]);
    expect(model.ratios[0]).toBeCloseTo((
      100 - (components.adjustedDueOnOffBalanceLiabilities[0] / components.dueOnOffBalanceAssets[0]) * 100
    ), 12);
    expect(model.ratios[0]).toBeCloseTo((model.numerator[0] / model.denominator[0]) * 100, 12);
  }
  const liquidityGapAmountBar = liquidityGapWidget.locator('[data-liquidity-point="true"][data-liquidity-metric="amount"]').nth(3);
  await liquidityGapAmountBar.dispatchEvent("click");
  await expect(liquidityGapWidget.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await expect(liquidityGapWidget.locator(".eve-point-popover__grid")).toContainText("\u7f3a\u53e3\u89c4\u6a21");
  await liquidityGapWidget.locator(".eve-point-popover__action").click();
  const liquidityGapAmountProcessModal = page.locator("#liquidityProcessModal");
  await expect(liquidityGapAmountProcessModal).toContainText("30D\u6d41\u52a8\u6027\u7f3a\u53e3 = 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d44\u4ea7\uff08\u542b\u5185\u90e8\u4ea4\u6613\uff09- 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d1f\u503a\uff08\u542b\u5185\u90e8\u4ea4\u6613\uff09+ 30D\u6d3b\u671f\u5b58\u6b3e\u8c03\u6574 + 30D\u6d3b\u671f\u5b58\u653e\u8c03\u6574");
  await expect(liquidityGapAmountProcessModal.locator(".liquidity-gap-amount-expression > .eve-process-expansion__formula")).toHaveCount(0);
  await expect(liquidityGapAmountProcessModal).not.toContainText("\u5254\u9664\u5185\u90e8\u4ea4\u6613");
  await expect(liquidityGapAmountProcessModal.locator('[data-liquidity-process-node="gap"]')).toHaveCount(1);
  await expect(liquidityGapAmountProcessModal.locator('[data-liquidity-gap-constant="true"]')).toHaveCount(0);
  for (const key of ["due-on-off-balance-assets", "due-on-off-balance-liabilities", "demand-deposit-adjustment", "demand-placement-adjustment"]) {
    await expect(liquidityGapAmountProcessModal.locator(`[data-liquidity-process-node="${key}"]`)).toHaveCount(1);
  }
  await liquidityGapAmountProcessModal.locator('[data-liquidity-process-node="due-on-off-balance-assets"] .eve-process-node__action').click();
  await expect(liquidityGapAmountProcessModal).toContainText("30D累计到期表内外资产（含内部交易） = 30D累计到期表内资产 + 表外收入 + 内部交易资产");
  await expect(liquidityGapAmountProcessModal.locator('[data-liquidity-process-node="asset-total"]')).toContainText("30D累计到期表内资产");
  await expect(liquidityGapAmountProcessModal.locator('[data-liquidity-process-node="asset-total"]')).not.toContainText("表内外资产");
  await expect(liquidityGapAmountProcessModal.locator('[data-liquidity-process-node="internal-transaction-assets"]')).toHaveCount(1);
  const liquidityGapLeafWidths = await liquidityGapAmountProcessModal.locator(".liquidity-gap-process-strip .eve-process-node").evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().width))
  );
  expect(new Set(liquidityGapLeafWidths)).toEqual(new Set([270]));
  const firstLiquidityGapLeafLayout = await liquidityGapAmountProcessModal.locator(".liquidity-gap-process-strip .eve-process-node").first().evaluate((node) => {
    const title = node.querySelector(".eve-process-node__title").getBoundingClientRect();
    const metric = node.querySelector(".eve-process-node__metric").getBoundingClientRect();
    const value = node.querySelector(".eve-process-node__value").getBoundingClientRect();
    const comparisons = node.querySelector(".eve-process-node__comparisons").getBoundingClientRect();
    return {
      titleTop: Math.round(title.top),
      metricTop: Math.round(metric.top),
      titleRight: Math.round(title.right),
      metricLeft: Math.round(metric.left),
      valueRight: Math.round(value.right),
      comparisonsTop: Math.round(comparisons.top),
      cardRight: Math.round(node.getBoundingClientRect().right),
    };
  });
  expect(Math.abs(firstLiquidityGapLeafLayout.titleTop - firstLiquidityGapLeafLayout.metricTop)).toBeLessThanOrEqual(2);
  expect(firstLiquidityGapLeafLayout.metricLeft).toBeGreaterThanOrEqual(firstLiquidityGapLeafLayout.titleRight);
  expect(firstLiquidityGapLeafLayout.comparisonsTop).toBeGreaterThan(firstLiquidityGapLeafLayout.metricTop);
  expect(firstLiquidityGapLeafLayout.valueRight).toBeLessThan(firstLiquidityGapLeafLayout.cardRight);
  await expectAllProcessNodesHaveImpact(liquidityGapAmountProcessModal);
  await page.keyboard.press("Escape");

  await liquidityGapWidget.locator('[data-liquidity-point="true"][data-liquidity-metric="ratio"]').nth(3).dispatchEvent("click");
  await expect(liquidityGapWidget.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await liquidityGapWidget.locator(".eve-point-popover__action").click();
  const liquidityGapProcessModal = page.locator("#liquidityProcessModal");
  const liquidityGapFormulaSteps = liquidityGapProcessModal.locator(".eve-process-formula__step");
  await expect(liquidityGapFormulaSteps).toHaveCount(2);
  await expect(liquidityGapFormulaSteps.nth(0)).toContainText("监管公式：30D流动性缺口率 = [30D累计到期表内外资产（含内部交易）- 30D累计到期表内外负债（含内部交易，调整活期）] ÷ 30D累计到期表内外资产（含内部交易）");
  await expect(liquidityGapFormulaSteps.nth(1)).toContainText("等价变形：30D流动性缺口率 = 100% - 30D累计到期表内外负债（含内部交易，调整活期）÷ 30D累计到期表内外资产（含内部交易");
  await expect(liquidityGapProcessModal.locator("[data-liquidity-gap-formula-stage]")).toHaveCount(0);
  await expect(liquidityGapProcessModal.locator("[data-liquidity-regulatory-node]")).toHaveCount(0);
  await expect(liquidityGapProcessModal).toContainText("30D\u6d41\u52a8\u6027\u7f3a\u53e3\u7387 = 100% - 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d1f\u503a\uff08\u542b\u5185\u90e8\u4ea4\u6613\uff0c\u8c03\u6574\u6d3b\u671f\uff09\u00f7 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d44\u4ea7\uff08\u542b\u5185\u90e8\u4ea4\u6613");
  await expect(liquidityGapProcessModal).not.toContainText("\u5254\u9664\u5185\u90e8\u4ea4\u6613");
  await expect(liquidityGapProcessModal).not.toContainText("\u7ecf\u6d3b\u671f\u8c03\u6574\u540e\u7684\u5230\u671f\u51c0\u8d1f\u503a");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-gap-constant="true"]')).toContainText("100%");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="numerator"]')).toHaveCount(0);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="denominator"]')).toHaveCount(0);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="adjusted-due-on-off-balance-liabilities"]')).toHaveCount(1);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="due-on-off-balance-assets"]')).toHaveCount(1);
  for (const key of ["due-on-off-balance-liabilities", "demand-deposit-adjustment", "demand-placement-adjustment"]) {
    await expect(liquidityGapProcessModal.locator(`[data-liquidity-process-node="${key}"]`)).toHaveCount(0);
  }
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="adjusted-due-on-off-balance-liabilities"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d1f\u503a\uff08\u542b\u5185\u90e8\u4ea4\u6613\uff0c\u8c03\u6574\u6d3b\u671f\uff09 = 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d1f\u503a\uff08\u542b\u5185\u90e8\u4ea4\u6613\uff09- 30D\u6d3b\u671f\u5b58\u6b3e\u8c03\u6574 - 30D\u6d3b\u671f\u5b58\u653e\u8c03\u6574");
  for (const key of ["due-on-off-balance-liabilities", "demand-deposit-adjustment", "demand-placement-adjustment"]) {
    await expect(liquidityGapProcessModal.locator(`[data-liquidity-process-node="${key}"]`)).toHaveCount(1);
  }
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="internal-transaction-assets"]')).toHaveCount(0);
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="due-on-off-balance-liabilities"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D累计到期表内外负债（含内部交易） = 30D累计到期表内负债 + 表外支出 + 内部交易负债");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="liability-total"]')).toHaveCount(1);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="liability-total"]')).toContainText("30D累计到期表内负债");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="liability-total"]')).not.toContainText("表内外负债");
  const dueLiabilityBox = await liquidityGapProcessModal.locator('[data-liquidity-process-node="due-on-off-balance-liabilities"]').boundingBox();
  const liabilityTotalBox = await liquidityGapProcessModal.locator('[data-liquidity-process-node="liability-total"]').boundingBox();
  expect(dueLiabilityBox).not.toBeNull();
  expect(liabilityTotalBox).not.toBeNull();
  expect(liabilityTotalBox.x).toBeGreaterThan(dueLiabilityBox.x + dueLiabilityBox.width);
  expect(Math.abs(liabilityTotalBox.y - dueLiabilityBox.y)).toBeLessThan(90);
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="demand-deposit-adjustment"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D\u6d3b\u671f\u5b58\u6b3e\u8c03\u6574 = 3.5.2\u6d3b\u671f\u5b58\u6b3e - \u9644\u6ce8\u6d3b\u671f\u5b58\u6b3e");
  await expect(liquidityGapProcessModal).toContainText("3.5.2 \u6d3b\u671f\u5b58\u6b3e");
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="demand-placement-adjustment"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D\u6d3b\u671f\u5b58\u653e\u8c03\u6574 = 3.2\u6d3b\u671f\u5b58\u653e - \u9644\u6ce8\u6d3b\u671f\u5b58\u653e");
  await expect(liquidityGapProcessModal).toContainText("3.2 \u6d3b\u671f\u5b58\u653e");
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="due-on-off-balance-assets"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D累计到期表内外资产（含内部交易） = 30D累计到期表内资产 + 表外收入 + 内部交易资产");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="asset-total"]')).toHaveCount(1);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="asset-total"]')).toContainText("30D累计到期表内资产");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="asset-total"]')).not.toContainText("表内外资产");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="liability-total"]')).toHaveCount(1);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="demand-deposits"]')).toHaveCount(1);
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="demand-placements"]')).toHaveCount(1);
  await expectAllProcessNodesHaveImpact(liquidityGapProcessModal);
  await page.keyboard.press("Escape");
  expect(await liquidityRatioWidget.locator("svg polyline").count()).toBeGreaterThan(0);
  await liquidityRatioWidget.locator('[data-liquidity-point="true"]').nth(3).dispatchEvent("click");
  await expect(liquidityRatioWidget.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await liquidityRatioWidget.locator(".eve-point-popover__action").click();
  const liquidityRatioProcessModal = page.locator("#liquidityProcessModal");
  await expect(liquidityRatioProcessModal).toContainText("\u6d41\u52a8\u6027\u6bd4\u4f8b = \u6d41\u52a8\u6027\u8d44\u4ea7 \u00f7 \u6d41\u52a8\u6027\u8d1f\u503a");
  await expect(liquidityRatioProcessModal).toContainText("\u6d41\u52a8\u6027\u8d44\u4ea7");
  await expect(liquidityRatioProcessModal).toContainText("\u6d41\u52a8\u6027\u8d1f\u503a");
  const liquidityAssetNodeAction = liquidityRatioProcessModal.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action');
  await liquidityAssetNodeAction.click();
  await expect(liquidityRatioProcessModal).toContainText("流动性资产 = 1.1 现金 + 1.2 黄金");
  await expect(liquidityRatioProcessModal).toContainText("1.1 \u73b0\u91d1");
  await expect(liquidityRatioProcessModal).toContainText("1.9 \u5176\u4ed6\u4e00\u4e2a\u6708\u5185\u5230\u671f\u53ef\u53d8\u73b0\u7684\u8d44\u4ea7");
  await expectAllProcessNodesHaveImpact(liquidityRatioProcessModal);
  await expect(liquidityAssetNodeAction).toContainText("\u70b9\u51fb\u6536\u56de");
  await liquidityAssetNodeAction.click();
  await expect(liquidityAssetNodeAction).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(liquidityRatioProcessModal.locator('[data-liquidity-process-node="liquidity-cash"]')).toHaveCount(0);
  const liquidityLiabilityNodeAction = liquidityRatioProcessModal.locator('[data-liquidity-process-node="denominator"] .eve-process-node__action');
  await liquidityLiabilityNodeAction.click();
  await expect(liquidityRatioProcessModal).toContainText("流动性负债 = 2.1 活期存款（不含财政性存款） + 2.2 一个月内到期的定期存款");
  await expect(liquidityRatioProcessModal).toContainText("\u6d3b\u671f\u5b58\u6b3e");
  await expectAllProcessNodesHaveImpact(liquidityRatioProcessModal);
  await expect(liquidityLiabilityNodeAction).toContainText("\u70b9\u51fb\u6536\u56de");
  await liquidityLiabilityNodeAction.click();
  await expect(liquidityLiabilityNodeAction).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(liquidityRatioProcessModal.locator('[data-liquidity-process-node="liquidity-demand-deposits"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(liquidityGapWidget.locator('[data-filter-name="\u671f\u9650\u957f\u5ea6"][data-filter-value="30D"]')).toHaveClass(/is-active/);
  await expect(liquidityGapWidget.locator('[data-filter-name="\u53e3\u5f84"][data-filter-value="\u65f6\u70b9"]')).toHaveClass(/is-active/);
  await expect(liquidityGapWidget.locator('[data-filter-name="\u671f\u9650\u957f\u5ea6"][data-filter-value="1Y"]')).toHaveCount(1);
  await liquidityGapWidget.locator('[data-filter-name="\u671f\u9650\u957f\u5ea6"][data-filter-value="1Y"]').click();
  await expect(liquidityGapWidget.locator('[data-filter-name="\u53e3\u5f84"]')).toHaveCount(0);
  await expect(liquidityGapWidget.locator(".chart-legend")).toContainText("1Y\u7f3a\u53e3\u89c4\u6a21");
  await liquidityGapWidget.locator('[data-filter-name="\u671f\u9650\u957f\u5ea6"][data-filter-value="1D"]').click();
  await expect(liquidityGapWidget.locator('[data-filter-name="\u53e3\u5f84"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="57"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="58"]')).toHaveCount(0);
  const futureFundingFlowWidget = page.locator('article[data-widget-seq="54"]');
  await expect(futureFundingFlowWidget).toContainText("\u5f53\u65e5\u51c0\u989d");
  await expect(futureFundingFlowWidget).toContainText("\u7d2f\u8ba1\u51c0\u989d");
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-business-legend__group")).toHaveCount(2);
  await expect(futureFundingFlowWidget.locator('[data-liquidity-legend-group="asset"]')).toContainText("\u8d44\u4ea7\u53ca\u8868\u5916\u6536\u5165");
  await expect(futureFundingFlowWidget.locator('[data-liquidity-legend-group="liability"]')).toContainText("\u8d1f\u503a\u53ca\u8868\u5916\u652f\u51fa");
  expect(await futureFundingFlowWidget.locator(".future-funding-flow-business-legend").evaluate((element) =>
    element.scrollHeight <= element.clientHeight
  )).toBeTruthy();
  await expect(futureFundingFlowWidget.locator('[data-filter-name="\u4e1a\u52a1\u7c7b\u578b"].is-selected')).toHaveCount(TEXT.liquidityBusinessTypes.length);
  for (const businessType of TEXT.liquidityBusinessTypes) {
    await expect(futureFundingFlowWidget.locator(`[data-filter-value="${businessType}"]`)).toHaveClass(/is-selected/);
  }
  const visibleBarCount = await futureFundingFlowWidget.locator("svg rect").evaluateAll((nodes) =>
    nodes.filter((node) => Number(node.getAttribute("height") || 0) > 4).length
  );
  expect(visibleBarCount).toBeGreaterThan(0);
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-detail")).toContainText("\u8d44\u91d1\u6d41\u660e\u7ec6");
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-detail")).toContainText("\u73b0\u91d1\u6d41\u65e5");
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-detail")).toContainText("\u4e1a\u52a1\u7c7b\u522b");
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-detail")).toContainText("\u4ea4\u6613\u5bf9\u624b");
  await futureFundingFlowWidget.locator('[data-future-funding-flow-cell][data-business-type="\u503a\u5238"]').first().click();
  await expect(futureFundingFlowWidget.locator(".future-funding-flow-detail")).toContainText("\u503a\u5238\u8d44\u91d1\u6d41\u660e\u7ec6");
  await futureFundingFlowWidget.getByRole("button", { name: "\u6570\u636e", exact: true }).click();
  await expect(futureFundingFlowWidget).toContainText("\u4e1a\u52a1\u660e\u7ec6");
  await expect(futureFundingFlowWidget).toContainText("\u4e1a\u52a1\u7f16\u53f7");

  await expect(page.getByRole("button", { name: TEXT.removedInvestmentFinancePage, exact: true })).toHaveCount(0);
});

test("计算过程影响归因逐级加总一致", async ({ page }) => {
  await openPage(page);
  const audits = await page.evaluate(() => {
    const labels = ["2026-01", "2026-02"];
    const selectedIndex = 1;
    const comparisonIndex = 0;
    const results = [];
    const sum = (map, keys) => keys.reduce((total, key) => total + Number(map[key] || 0), 0);
    const add = (name, parent, children) => results.push({ name, parent: Number(parent || 0), children: Number(children || 0) });

    const eveModel = buildEveDiagnosticModel({ seq: 1 }, {
      labels,
      signature: 31,
      filterState: { 机构: ["香港分行"] },
    });
    const eveImpacts = buildEveProcessImpactMap(eveModel, selectedIndex, comparisonIndex);
    add("EVE顶层", eveImpacts.eve, eveImpacts.numerator + eveImpacts.denominator);
    const eveScenarioKeys = eveModel.scenarios.map((scenario) => `scenario:${scenario.key}`);
    add("EVE六情景", eveImpacts.numerator, sum(eveImpacts, eveScenarioKeys));
    add("EVE境外资本", eveImpacts.denominator, sum(eveImpacts, ["overseas-rwa", "legal-rwa", "legal-tier-one"]));
    if (eveImpacts.attributionMethod !== "six-scenario-shapley-and-capital-grouped-owen"
      || eveImpacts.scenarioAttribution?.scenarioSelection !== "maximumLoss"
      || eveImpacts.scenarioAttribution?.stateCount !== 64
      || eveImpacts["same-worst-scenario"] !== undefined
      || eveImpacts["worst-scenario-switch"] !== undefined) {
      throw new Error("△EVE未采用六情景Shapley及资本分组Owen正式口径");
    }
    const maxLossModel = {
      scenarios: [
        { key: "largeGain", name: "大幅正向增加", values: [200, 250] },
        { key: "actualLoss", name: "实际损失", values: [-120, -130] },
      ],
    };
    if (getEveWorstScenarioSnapshot(maxLossModel, 1).key !== "actualLoss") {
      throw new Error("△EVE错误采用绝对值最大而非最大损失情景");
    }
    const tieModel = {
      scenarios: [
        { key: "a", name: "情景A", values: [-80, -90] },
        { key: "b", name: "情景B", values: [-70, -90] },
      ],
      numerator: [80, 90],
      capital: [100, 100],
      ratios: [80, 90],
      usesOverseasAllocatedCapital: false,
    };
    const tieImpacts = buildEveProcessImpactMap(tieModel, 1, 0);
    if (tieImpacts.scenarioAttribution.currentWorstKey !== "a" || tieImpacts.scenarioAttribution.switched) {
      throw new Error("当期最不利情景并列时应优先沿用基期情景");
    }
    const switchingModel = {
      scenarios: [
        { key: "up", name: "上移", values: [-120, -130] },
        { key: "down", name: "下移", values: [-100, -140] },
      ],
    };
    const switching = calculateEveScenarioShapleyImpacts(switchingModel, 1, 0);
    if (Math.abs(switching.amountImpacts.up - 5) > 1e-9
      || Math.abs(switching.amountImpacts.down - 15) > 1e-9
      || Math.abs(switching.amountImpactTotal - 20) > 1e-9) {
      throw new Error("△EVE情景切换未内生分配到六情景Shapley影响");
    }

    const lcrModel = buildLiquidityDiagnosticModel({ seq: 42 }, { labels, signature: 37, kind: "lcr" });
    const lcrImpacts = buildLiquidityProcessImpactMap(lcrModel, selectedIndex, comparisonIndex, "ratio");
    add("LCR顶层", lcrImpacts.ratio, lcrImpacts.numerator + lcrImpacts.denominator);
    add("LCR分子", lcrImpacts.numerator, sum(lcrImpacts, ["level-1-assets", "level-2a-assets", "level-2b-assets"]));
    add("LCR分母", lcrImpacts.denominator, sum(lcrImpacts, ["cash-outflow", "cash-inflow"]));
    if (lcrImpacts.attributionMethod !== "direct-max-grouped-owen-4-paths"
      || lcrImpacts.lcrBridge?.pathCount !== 4
      || lcrImpacts.lcrBridge?.effectivePathCount !== 4
      || lcrImpacts.lcrBridge?.structuralPathCount !== 24
      || lcrImpacts["constraint-branch-switch"] !== undefined) {
      throw new Error("LCR未采用逐步重算max的24条正式路径及4类等价路径环境");
    }
    const switchModel = {
      kind: "lcr",
      labels,
      numerator: [40, 40],
      denominator: [40, 25],
      ratios: [100, 160],
      components: {
        hqla: [40, 40],
        level1Assets: [40, 40],
        level2AAssets: [0, 0],
        level2BAssets: [0, 0],
        cashOutflows: [100, 100],
        cashInflows: [60, 90],
        rawNetOutflows: [40, 10],
        minimumNetOutflows: [25, 25],
        adjustedNetOutflows: [40, 25],
      },
    };
    const switchImpacts = buildLiquidityProcessImpactMap(switchModel, selectedIndex, comparisonIndex, "ratio");
    add("LCR分支切换顶层", switchImpacts.ratio, switchImpacts.numerator + switchImpacts.denominator);
    add("LCR分支切换分母", switchImpacts.denominator, sum(switchImpacts, ["cash-outflow", "cash-inflow"]));
    if (!switchImpacts.lcrBridge.switched
      || switchImpacts.lcrBridge.baseBranch !== "raw"
      || switchImpacts.lcrBridge.currentBranch !== "minimum") {
      throw new Error("LCR约束分支辅助状态识别错误");
    }
    const lcrMaxEdgeModel = {
      kind: "lcr",
      labels,
      numerator: [100, 100],
      denominator: [100, 100],
      ratios: [100, 100],
      components: {
        hqla: [100, 100],
        level1Assets: [100, 100],
        level2AAssets: [0, 0],
        level2BAssets: [0, 0],
        cashOutflows: [200, 300],
        cashInflows: [100, 200],
        rawNetOutflows: [100, 100],
        minimumNetOutflows: [50, 75],
        adjustedNetOutflows: [100, 100],
      },
    };
    const lcrMaxEdgeImpacts = buildLiquidityProcessImpactMap(lcrMaxEdgeModel, selectedIndex, comparisonIndex, "ratio");
    add("LCR逐步重算max边界", 0, lcrMaxEdgeImpacts["cash-outflow"] + lcrMaxEdgeImpacts["cash-inflow"]);
    if (Math.abs(lcrMaxEdgeImpacts["cash-outflow"] + 75) > 1e-10
      || Math.abs(lcrMaxEdgeImpacts["cash-inflow"] - 75) > 1e-10) {
      throw new Error("LCR现金流出、现金流入未按4条路径逐步重算max");
    }

    const nsfrModel = buildLiquidityDiagnosticModel({ seq: 46 }, { labels, signature: 41, kind: "nsfr" });
    const nsfrImpacts = buildLiquidityProcessImpactMap(nsfrModel, selectedIndex, comparisonIndex, "ratio");
    add("NSFR顶层", nsfrImpacts.ratio, nsfrImpacts.numerator + nsfrImpacts.denominator);
    const offsettingNsfr = {
      kind: "nsfr",
      numerator: [120, 126],
      denominator: [100, 105],
      ratios: [120, 120],
    };
    const offsettingNsfrImpacts = buildLiquidityProcessImpactMap(offsettingNsfr, selectedIndex, comparisonIndex, "ratio");
    add("NSFR总变化为零仍保留正负影响", 0, offsettingNsfrImpacts.numerator + offsettingNsfrImpacts.denominator);
    if (Math.abs(offsettingNsfrImpacts.numerator) < 1e-10 || Math.abs(offsettingNsfrImpacts.denominator) < 1e-10) {
      throw new Error("NSFR不应在总变化为零时清零两个因素的抵销贡献");
    }

    const liquidityRatioModel = buildLiquidityDiagnosticModel({ seq: 53 }, { labels, signature: 43, kind: "liquidityRatio" });
    const liquidityRatioImpacts = buildLiquidityProcessImpactMap(liquidityRatioModel, selectedIndex, comparisonIndex, "ratio");
    add("流动性比例顶层", liquidityRatioImpacts.ratio, liquidityRatioImpacts.numerator + liquidityRatioImpacts.denominator);
    add("流动性比例资产端", liquidityRatioImpacts.numerator, sum(liquidityRatioImpacts, liquidityRatioModel.components.liquidityAssetItems.map((item) => item.key)));
    add("流动性比例负债端", liquidityRatioImpacts.denominator, sum(liquidityRatioImpacts, liquidityRatioModel.components.liquidityLiabilityItems.map((item) => item.key)));
    add("流动性比例同业联合因素", liquidityRatioImpacts["interbank-net-position"], sum(liquidityRatioImpacts, ["liquidity-interbank-net-assets", "liquidity-interbank-net-liabilities"]));
    if (liquidityRatioImpacts.attributionMethod !== "three-group-owen-with-interbank-zero-bridge-6-paths"
      || liquidityRatioImpacts.liquidityRatioBridge?.jointFactor !== true
      || liquidityRatioImpacts.liquidityRatioBridge?.pathCount !== 6) {
      throw new Error("流动性比例未采用三组Owen及同业净头寸零点桥接正式口径");
    }
    const crossingLiquidityRatioModel = {
      kind: "liquidityRatio",
      ratios: [150, 110],
      numerator: [120, 110],
      denominator: [80, 100],
      components: {
        interbankNetPosition: [20, -10],
        liquidityOtherAssetItems: [{ key: "other-assets", title: "其他流动性资产", values: [100, 110] }],
        liquidityOtherLiabilityItems: [{ key: "other-liabilities", title: "其他流动性负债", values: [80, 90] }],
        liquidityAssetItems: [
          { key: "other-assets", title: "其他流动性资产", values: [100, 110] },
          { key: "liquidity-interbank-net-assets", title: "同业资产方净额", values: [20, 0] },
        ],
        liquidityLiabilityItems: [
          { key: "other-liabilities", title: "其他流动性负债", values: [80, 90] },
          { key: "liquidity-interbank-net-liabilities", title: "同业负债方净额", values: [0, 10] },
        ],
      },
    };
    const crossingImpacts = buildLiquidityProcessImpactMap(crossingLiquidityRatioModel, selectedIndex, comparisonIndex, "ratio");
    add("流动性比例跨零桥接顶层", -40, crossingImpacts.numerator + crossingImpacts.denominator);
    add("流动性比例跨零桥接同业", crossingImpacts["interbank-net-position"], sum(crossingImpacts, ["liquidity-interbank-net-assets", "liquidity-interbank-net-liabilities"]));
    if (!crossingImpacts.liquidityRatioBridge?.switched
      || Math.abs(crossingImpacts["liquidity-interbank-net-assets"] + 23.61111111111111) > 1e-9
      || Math.abs(crossingImpacts["liquidity-interbank-net-liabilities"] + 13.10185185185185) > 1e-9) {
      throw new Error("流动性比例同业净头寸跨零时未按每条Owen路径分别计算资产端和负债端影响");
    }

    const liquidityGapModel = buildLiquidityGapDiagnosticModel({ seq: 49 }, {
      labels,
      signature: 47,
      filterState: { 期限长度: ["30D"], 口径: ["时点"] },
    });
    const gapAmountImpacts = buildLiquidityProcessImpactMap(liquidityGapModel, selectedIndex, comparisonIndex, "amount");
    add("流动性缺口顶层", gapAmountImpacts.gap, sum(gapAmountImpacts, ["due-on-off-balance-assets", "due-on-off-balance-liabilities", "demand-deposit-adjustment", "demand-placement-adjustment"]));
    add("流动性缺口资产端", gapAmountImpacts["due-on-off-balance-assets"], sum(gapAmountImpacts, ["asset-total", "off-balance-income", "internal-transaction-assets"]));
    add("流动性缺口负债端", gapAmountImpacts["due-on-off-balance-liabilities"], sum(gapAmountImpacts, ["liability-total", "off-balance-expense", "internal-transaction-liabilities"]));
    add("流动性缺口活期存款", gapAmountImpacts["demand-deposit-adjustment"], sum(gapAmountImpacts, ["demand-deposits", "note-demand-deposits"]));
    add("流动性缺口活期存放", gapAmountImpacts["demand-placement-adjustment"], sum(gapAmountImpacts, ["demand-placements", "note-demand-placements"]));
    const offsetGapModel = {
      components: {
        assetTotal: [60, 70], offBalanceIncome: [20, 10], internalTransactionAssets: [20, 20],
        liabilityTotal: [70, 70], offBalanceExpense: [10, 10], internalTransactionLiabilities: [10, 10],
        demandDeposits: [5, 5], noteDemandDeposits: [1, 1], demandPlacements: [3, 3], noteDemandPlacements: [1, 1],
        dueOnOffBalanceAssets: [100, 100], dueOnOffBalanceLiabilities: [90, 90],
        demandDepositAdjustment: [4, 4], demandPlacementAdjustment: [2, 2],
        adjustedDueOnOffBalanceLiabilities: [84, 84], liquidityGap: [16, 16],
      },
    };
    const offsetGapImpacts = buildLiquidityGapAmountProcessImpactMap(offsetGapModel, selectedIndex, comparisonIndex);
    add("流动性缺口资产合计不变仍保留末级抵销", 0, sum(offsetGapImpacts, ["asset-total", "off-balance-income", "internal-transaction-assets"]));
    if (Math.abs(offsetGapImpacts["asset-total"]) < 1e-10 || Math.abs(offsetGapImpacts["off-balance-income"]) < 1e-10) {
      throw new Error("流动性缺口不应在父节点变化为零时清零末级抵销贡献");
    }

    const gapRatioImpacts = buildLiquidityProcessImpactMap(liquidityGapModel, selectedIndex, comparisonIndex, "ratio");
    add("流动性缺口率顶层", gapRatioImpacts.ratio, gapRatioImpacts["adjusted-due-on-off-balance-liabilities"] + gapRatioImpacts["due-on-off-balance-assets"]);
    add("流动性缺口率调整后负债", gapRatioImpacts["adjusted-due-on-off-balance-liabilities"], sum(gapRatioImpacts, ["due-on-off-balance-liabilities", "demand-deposit-adjustment", "demand-placement-adjustment"]));
    add("流动性缺口率资产端", gapRatioImpacts["due-on-off-balance-assets"], sum(gapRatioImpacts, ["asset-total", "off-balance-income", "internal-transaction-assets"]));

    const repricingModel = buildRepricingGapDiagnosticModel({ seq: 9 }, {
      labels,
      signature: 53,
      pageId: "interest-risk",
      filterState: { 机构: ["法人汇总"] },
    });
    const repricingImpacts = buildRepricingGapProcessImpactMap(repricingModel, selectedIndex, comparisonIndex);
    add("重定价缺口率顶层", repricingImpacts.ratio, sum(repricingImpacts, ["adjusted-assets", "adjusted-liabilities", "bank-book-derivative-gap", "trading-book-derivative-gap"]));
    add("重定价缺口率资产端", repricingImpacts["adjusted-assets"], sum(repricingImpacts, repricingModel.assetItems.map((item) => item.key)));
    add("重定价缺口率资产端一年内联动", repricingImpacts["adjusted-assets:withinOneYear"], sum(repricingImpacts, repricingModel.assetItems.map((item) => `${item.key}:withinOneYear`)));
    add("重定价缺口率资产端一年外", repricingImpacts["adjusted-assets:beyondOneYear"], sum(repricingImpacts, repricingModel.assetItems.map((item) => `${item.key}:beyondOneYear`)));
    add("重定价缺口率负债端", repricingImpacts["adjusted-liabilities"], sum(repricingImpacts, repricingModel.liabilityItems.map((item) => item.key)));
    add("重定价缺口率银行账簿衍生品", repricingImpacts["bank-book-derivative-gap"], sum(repricingImpacts, ["bank-book-receivable", "bank-book-payable"]));
    add("重定价缺口率交易账簿衍生品", repricingImpacts["trading-book-derivative-gap"], sum(repricingImpacts, ["trading-book-receivable", "trading-book-payable"]));
    repricingModel.assetItems.forEach((item) => {
      add(`重定价缺口率${item.title}两项因素`, repricingImpacts[item.key], sum(repricingImpacts, [
        `${item.key}:withinOneYear`, `${item.key}:beyondOneYear`,
      ]));
      const totalItem = repricingModel.totalInterestAssetItems.find((candidate) => candidate.key === `total-${item.key}`);
      const withinBuckets = item.withinOneYearBucketSeries.map((series) => Number(series[selectedIndex]));
      const withinScale = withinBuckets.reduce((total, value) => total + value, 0);
      const adjustedScale = withinBuckets.reduce((total, value, index) => (
        total + value * repricingModel.repricingWeights[index]
      ), 0);
      if (!totalItem
        || withinScale > Number(totalItem.values[selectedIndex]) + 1e-7
        || Math.abs(adjustedScale - Number(item.values[selectedIndex])) > 1e-7) {
        throw new Error(`重定价缺口率${item.title}期限桶未与重定价规模、总规模勾稽`);
      }
    });
    if (repricingImpacts.attributionMethod !== "three-level-nested-owen-with-joint-within-year-factor"
      || repricingImpacts.linkedWithinYearFactor !== true
      || repricingImpacts.withinOneYearBucketCount !== repricingModel.repricingWeights.length
      || repricingImpacts["adjusted-assets:repricingScale"] !== undefined
      || repricingImpacts["adjusted-assets:totalScale"] !== undefined) {
      throw new Error("重定价缺口率未采用一年内期限桶联合替换的正式三层嵌套Owen口径");
    }
    if (repricingImpacts.numerator !== undefined || repricingImpacts.denominator !== undefined) {
      throw new Error("重定价缺口率不应再把分子和分母作为独立归因因素");
    }

    let strictRejected = false;
    try {
      getProcessSeriesValue([null], 0);
    } catch (error) {
      strictRejected = error instanceof TypeError;
    }
    if (!strictRejected) throw new Error("页面归因实现未拒绝null或隐式类型转换");
    return results;
  });

  expect(audits.length).toBeGreaterThanOrEqual(18);
  for (const audit of audits) {
    expect(Math.abs(audit.parent - audit.children), audit.name).toBeLessThan(1e-7);
  }
});

test("可交互SVG图形支持键盘且不被辅助技术隐藏", async ({ page }) => {
  await openPage(page);
  const auditInteractiveTargets = async (selectors) => page.locator(selectors.join(",")).evaluateAll((nodes) => ({
    count: nodes.length,
    missingRole: nodes.filter((node) => node.getAttribute("role") !== "button").length,
    missingTabIndex: nodes.filter((node) => node.getAttribute("tabindex") !== "0").length,
    hiddenBySvg: nodes.filter((node) => node.closest("svg")?.getAttribute("aria-hidden") === "true").length,
    missingName: nodes.filter((node) => !String(node.getAttribute("aria-label") || "").trim()).length,
  }));

  const interestSelectors = [
    "[data-eve-point]",
    "[data-repricing-gap-point]",
    "[data-repricing-duration-gap-point]",
    "[data-repricing-maturity-cell]",
  ];
  const interestAudit = await auditInteractiveTargets(interestSelectors);
  expect(interestAudit.count).toBeGreaterThan(0);
  expect(interestAudit).toMatchObject({ missingRole: 0, missingTabIndex: 0, hiddenBySvg: 0, missingName: 0 });
  await page.locator("[data-eve-point]").nth(2).press("Enter");
  await expect(page.locator('article[data-widget-seq="1"] .eve-point-popover')).toBeVisible();

  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  const liquiditySelectors = ["[data-liquidity-point]", "[data-future-funding-flow-cell]"];
  const liquidityAudit = await auditInteractiveTargets(liquiditySelectors);
  expect(liquidityAudit.count).toBeGreaterThan(0);
  expect(liquidityAudit).toMatchObject({ missingRole: 0, missingTabIndex: 0, hiddenBySvg: 0, missingName: 0 });
  for (const businessType of ["现金", "活期存款"]) {
    const disabledSegments = page.locator(`[data-future-funding-flow-detail-disabled="true"][data-business-type="${businessType}"]`);
    expect(await disabledSegments.count()).toBeGreaterThan(0);
    await expect(page.locator(`[data-future-funding-flow-cell][data-business-type="${businessType}"]`)).toHaveCount(0);
    await expect(disabledSegments.first()).not.toHaveAttribute("role", "button");
    await expect(disabledSegments.first()).not.toHaveAttribute("tabindex", "0");
  }
  const liquidityPoint = page.locator("[data-liquidity-point]").nth(2);
  await liquidityPoint.press(" ");
  await expect(liquidityPoint.locator("xpath=ancestor::article[1]").locator(".eve-point-popover")).toBeVisible();
  const futureSegment = page.locator("[data-future-funding-flow-cell]").nth(1);
  await futureSegment.press("Enter");
  await expect(futureSegment).toHaveClass(/is-active/);
  await expect(page.locator("[data-future-funding-flow-cell].is-active")).toHaveCount(1);
});

test("模拟基准与计算过程各层数据保持闭合", async ({ page }) => {
  await openPage(page);
  const audit = await page.evaluate(() => {
    const interestPage = data.pages.find((item) => item.id === "interest-risk");
    appState.currentPageId = interestPage.id;
    appState.pageFilters[interestPage.id] = { 机构: ["法人汇总"], 币种: ["全折人民币"] };
    const repricingDraft = createRepricingGapSimulationDraftFromScenario(null);
    appState.simulationDraft = repricingDraft;
    const repricingScenario = normalizeRepricingGapSimulationScenario(interestPage, repricingDraft);
    appState.pageSimulations[interestPage.id] = repricingScenario;
    const repricingModel = buildRepricingGapDiagnosticModel(findWidgetBySeq(9).widget, { pageId: interestPage.id });
    const repricingIndex = repricingModel.simulationTargetIndex;
    const sumAt = (items, index) => items.reduce((sum, item) => sum + Number(item.values[index] || 0), 0);
    const repricingBranches = {
      totalInterestAssets: sumAt(repricingModel.totalInterestAssetItems, repricingIndex),
      adjustedInterestAssets: sumAt(repricingModel.assetItems, repricingIndex),
      adjustedInterestLiabilities: sumAt(repricingModel.liabilityItems, repricingIndex),
      bankBookDerivativeGap: Number((repricingModel.bankBookReceivable[repricingIndex] - repricingModel.bankBookPayable[repricingIndex]).toFixed(1)),
      tradingBookDerivativeGap: Number((repricingModel.tradingBookReceivable[repricingIndex] - repricingModel.tradingBookPayable[repricingIndex]).toFixed(1)),
    };
    const scopeMatrix = Object.fromEntries(
      getRepricingGapSimulationBusinessTypes().map((businessType) => [
        businessType,
        REPRICING_GAP_BUCKETS.map(() => 0),
      ])
    );
    scopeMatrix["自营贷款"][0] = 100;
    scopeMatrix["内部交易资产"][0] = 20;
    scopeMatrix["内部交易负债"][0] = 10;
    scopeMatrix["活期存款"][0] = 30;
    const legalScopeMetrics = calculateRepricingGapMatrixMetrics(scopeMatrix, { includesInternalTransactions: false });
    const overseasScopeMetrics = calculateRepricingGapMatrixMetrics(scopeMatrix, { includesInternalTransactions: true });

    const liquidityPage = data.pages.find((item) => item.id === "liquidity-risk");
    appState.currentPageId = liquidityPage.id;
    appState.pageFilters[liquidityPage.id] = { 机构: ["法人汇总"], 币种: ["全折人民币"] };
    const liquidityDraft = createLiquidityGapSimulationDraftFromScenario(null);
    appState.simulationDraft = liquidityDraft;
    const liquidityScenario = normalizeLiquidityGapSimulationScenario(liquidityPage, liquidityDraft);
    appState.pageSimulations[liquidityPage.id] = liquidityScenario;
    const liquidityModel = buildLiquidityGapDiagnosticModel(findWidgetBySeq(49).widget, {
      pageId: liquidityPage.id,
      filterState: { 期限长度: ["30D"], 口径: ["时点"] },
    });
    const liquidityIndex = liquidityModel.simulationTargetIndex;
    const bucketIndex = 2;
    const components = liquidityModel.components;
    return {
      repricing: {
        targetIndex: repricingIndex,
        includesInternalTransactions: repricingScenario.includesInternalTransactions,
        metrics: repricingScenario.baseMetrics,
        branches: repricingBranches,
        numerator: repricingModel.numerator[repricingIndex],
        ratio: repricingModel.ratios[repricingIndex],
        hasInternalAssetLeaf: repricingModel.assetItems.some((item) => item.title.includes("内部交易")),
        hasInternalLiabilityLeaf: repricingModel.liabilityItems.some((item) => item.title.includes("内部交易")),
        legalScopeMetrics,
        overseasScopeMetrics,
      },
      liquidity: {
        targetIndex: liquidityIndex,
        expectedGap: liquidityScenario.baseMetrics.cumulativeTotals[bucketIndex],
        expectedRatio: liquidityScenario.baseMetrics.gapRatios[bucketIndex],
        expectedSimulatedGap: liquidityScenario.simulatedMetrics.cumulativeTotals[bucketIndex],
        expectedSimulatedRatio: liquidityScenario.simulatedMetrics.gapRatios[bucketIndex],
        gap: components.liquidityGap[liquidityIndex],
        ratio: liquidityModel.ratios[liquidityIndex],
        simulatedGap: liquidityModel.simulatedLiquidityGap[liquidityIndex],
        simulatedRatio: liquidityModel.simulatedRatios[liquidityIndex],
        assetClosure: components.assetTotal[liquidityIndex]
          + components.offBalanceIncome[liquidityIndex]
          + components.internalTransactionAssets[liquidityIndex],
        assets: components.dueOnOffBalanceAssets[liquidityIndex],
        liabilityClosure: components.liabilityTotal[liquidityIndex]
          + components.offBalanceExpense[liquidityIndex]
          + components.internalTransactionLiabilities[liquidityIndex],
        liabilities: components.dueOnOffBalanceLiabilities[liquidityIndex],
        formulaGap: components.dueOnOffBalanceAssets[liquidityIndex]
          - components.dueOnOffBalanceLiabilities[liquidityIndex]
          + components.demandDepositAdjustment[liquidityIndex]
          + components.demandPlacementAdjustment[liquidityIndex],
      },
    };
  });

  expect(audit.repricing.targetIndex).toBeGreaterThanOrEqual(0);
  expect(audit.repricing.includesInternalTransactions).toBeFalsy();
  expect(audit.repricing.hasInternalAssetLeaf).toBeFalsy();
  expect(audit.repricing.hasInternalLiabilityLeaf).toBeFalsy();
  [
    "totalInterestAssets",
    "adjustedInterestAssets",
    "adjustedInterestLiabilities",
    "bankBookDerivativeGap",
    "tradingBookDerivativeGap",
  ].forEach((key) => {
    expect(audit.repricing.branches[key]).toBeCloseTo(audit.repricing.metrics[key], 10);
  });
  expect(audit.repricing.numerator).toBeCloseTo(audit.repricing.metrics.repricingGap, 10);
  expect(audit.repricing.ratio).toBeCloseTo(audit.repricing.metrics.ratio, 10);
  expect(audit.repricing.legalScopeMetrics).toMatchObject({
    totalInterestAssets: 100,
    adjustedInterestAssets: 100,
    adjustedInterestLiabilities: 0,
    repricingGap: 100,
  });
  expect(audit.repricing.overseasScopeMetrics).toMatchObject({
    totalInterestAssets: 120,
    adjustedInterestAssets: 120,
    adjustedInterestLiabilities: 10,
    repricingGap: 110,
  });
  expect(audit.liquidity.targetIndex).toBeGreaterThanOrEqual(0);
  expect(audit.liquidity.gap).toBe(audit.liquidity.expectedGap);
  expect(audit.liquidity.ratio).toBe(audit.liquidity.expectedRatio);
  expect(audit.liquidity.simulatedGap).toBe(audit.liquidity.expectedSimulatedGap);
  expect(audit.liquidity.simulatedRatio).toBe(audit.liquidity.expectedSimulatedRatio);
  expect(audit.liquidity.assetClosure).toBe(audit.liquidity.assets);
  expect(audit.liquidity.liabilityClosure).toBe(audit.liquidity.liabilities);
  expect(audit.liquidity.formulaGap).toBeCloseTo(audit.liquidity.gap, 8);
});

test("\u4e1a\u52a1\u53d8\u52a8\u5206\u6790\u5173\u952e\u6807\u9898\u5b8c\u6574", async ({ page }) => {
  await openPage(page);
  const sharedRiskStartDate = await page.evaluate(() => appState.globalStartDate);
  await expect(page.locator("#globalStartDate")).toHaveCount(0);
  await expect(page.locator("#sharedDateControls")).toBeVisible();
  const selectedSharedEndDate = await page.evaluate(() => addClampedMonthsDateValue(appState.globalEndDate, -2));
  await page.locator("#globalEndDate").fill(selectedSharedEndDate);
  await page.locator("#globalEndDate").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  await expect(page.locator("#sharedDateControls")).toBeVisible();
  await expect(page.locator("#businessDateControls")).toHaveCount(0);
  await expect(page.locator("#businessStartDate")).toHaveCount(0);
  await expect(page.locator("#businessEndDate")).toHaveCount(0);
  await expect(page.locator("#globalEndDate")).toHaveValue(selectedSharedEndDate);
  const sharedDateState = await page.evaluate(() => ({
    globalRange: [appState.globalStartDate, appState.globalEndDate],
    hasBusinessStartDate: Object.prototype.hasOwnProperty.call(appState, "businessStartDate"),
    hasBusinessEndDate: Object.prototype.hasOwnProperty.call(appState, "businessEndDate"),
    completedMonthEnd: getLatestCompletedBusinessMonthEnd(appState.globalEndDate),
  }));
  expect(sharedDateState.globalRange).toEqual([sharedRiskStartDate, selectedSharedEndDate]);
  expect(sharedDateState.hasBusinessStartDate).toBeFalsy();
  expect(sharedDateState.hasBusinessEndDate).toBeFalsy();
  for (const widgetSeq of [72, 73, 83, 84, 90, 91]) {
    await expect(page.locator(`[data-widget-seq="${widgetSeq}"] .chart-stage`)).toContainText(sharedDateState.completedMonthEnd.slice(5, 7));
  }
  await page.getByRole("button", { name: TEXT.pages[0], exact: true }).click();
  await expect(page.locator("#sharedDateControls")).toBeVisible();
  await expect(page.locator("#globalStartDate")).toHaveCount(0);
  await expect(page.locator("#globalEndDate")).toHaveValue(selectedSharedEndDate);
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  await expect(page.locator("#globalEndDate")).toHaveValue(selectedSharedEndDate);
  const businessSections = [
    { id: "area-stock", title: "\u5b58\u91cf\u4e1a\u52a1", widgets: ["72", "73", "79", "80"] },
    { id: "area-new", title: "\u65b0\u53d1\u751f\u4e1a\u52a1", widgets: ["83", "84", "89", "85"] },
    { id: "area-maturity", title: "\u5230\u671f\u4e1a\u52a1", widgets: ["90", "91", "96", "97"] },
  ];
  await expect(page.locator("#dashboardView .business-analysis-section")).toHaveCount(3);
  for (const sectionConfig of businessSections) {
    const section = page.locator(`[data-business-section="${sectionConfig.id}"]`);
    await expect(section.getByRole("heading", { name: sectionConfig.title, exact: true })).toBeVisible();
    for (const widgetSeq of sectionConfig.widgets) {
      await expect(section.locator(`article[data-widget-seq="${widgetSeq}"]`)).toHaveCount(1);
    }
  }
  let businessChartLogicalCount = 6;
  let stockStructureLogicalCount = 1;
  let stockDetailLogicalCount = 1;
  for (const widgetSeq of [72, 73]) {
    const widget = page.locator(`[data-widget-seq="${widgetSeq}"]`);
    const monthTab = widget.locator('[role="tab"][data-filter-name="\u9891\u7387"][data-filter-value="\u6708\u9891"]');
    const dayTab = widget.locator('[role="tab"][data-filter-name="\u9891\u7387"][data-filter-value="\u65e5\u9891"]');
    await expect(monthTab).toHaveAttribute("aria-selected", "true");
    await expect(dayTab).toHaveAttribute("aria-selected", "false");
    await dayTab.click();
    await expect(dayTab).toHaveAttribute("aria-selected", "true");
    const dailyAxisLabels = await widget.locator(".axis-label--x").allTextContents();
    expect(dailyAxisLabels.some((label) => /^\d{1,2}\/\d{2}$/.test(label))).toBeTruthy();
    await monthTab.click();
    await expect(monthTab).toHaveAttribute("aria-selected", "true");
  }
  for (const title of TEXT.businessChangeTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.locator('[data-open-business-methodology="true"]')).toHaveCount(8);
  await expect(page.locator('[data-widget-seq="79"] [data-open-business-methodology]')).toHaveCount(0);
  await expect(page.locator('[data-widget-seq="80"] [data-open-business-methodology]')).toHaveCount(0);

  const methodologyModal = page.locator("#businessMethodologyModal");
  await page.locator('[data-widget-seq="83"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("新发生业务月末轧差计算逻辑");
  await expect(methodologyModal).toContainText("基于本月末与上月末两个时点的业务编号明细数据进行轧差，计算当月新发生业务");
  await expect(methodologyModal).not.toContainText("独立于利率风险和流动性风险");
  await expect(methodologyModal).not.toContainText("计算公式为");
  await expect(methodologyModal).not.toContainText("\u8fde\u7eed\u4e24\u5929");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="85"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("新发生业务月末轧差计算逻辑");
  await expect(methodologyModal).toContainText("计算当月新发生业务");
  await expect(methodologyModal).not.toContainText("\u8fde\u7eed\u4e24\u5929");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="90"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("到期业务月末轧差计算逻辑");
  await expect(methodologyModal).toContainText("基于本月末与上月末两个时点的业务编号明细数据进行轧差，计算当月到期业务");
  await expect(methodologyModal).not.toContainText("未来合同到期的区间");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="97"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("到期业务月末轧差计算逻辑");
  await expect(methodologyModal).toContainText("计算当月到期业务");
  await expect(methodologyModal).not.toContainText("\u8fde\u7eed\u4e24\u5929");
  await page.keyboard.press("Escape");
  await expect(methodologyModal).toHaveAttribute("aria-hidden", "true");
  const monthlyDiffAudit = await page.evaluate(() => {
    const chartContext = {
      analysisPerspective: "interestBalanceStructure",
      filterState: { 机构: ["法人汇总"], 币种: ["全折人民币"] },
    };
    const currentMonth = getBusinessMonthKeyFromDateValue(getDefaultGlobalEndDate());
    const previousMonth = formatBusinessMonthKey(getBusinessMonthSerial(currentMonth) - 1);
    const dateRange = [getBusinessMonthEndDate(previousMonth), getBusinessMonthEndDate(currentMonth)];
    const sum = (rows) => Number(rows.reduce((total, row) => total + row.amountValue, 0).toFixed(1));
    const auditScope = (scope) => {
      const previousRows = buildMonthlyBusinessChangeFacts(scope, previousMonth, chartContext);
      const currentRows = buildMonthlyBusinessChangeFacts(scope, currentMonth, chartContext);
      const rangeRows = buildBusinessChangeFactsForDateRange(scope, chartContext, dateRange);
      return {
        months: [...new Set(rangeRows.map((row) => row.statMonth))].sort(),
        monthlyTotal: Number((sum(previousRows) + sum(currentRows)).toFixed(1)),
        rangeTotal: sum(rangeRows),
        comparisonDatesComplete: rangeRows.every((row) => row.comparisonStartDate && row.comparisonEndDate),
      };
    };
    return {
      previousMonth,
      currentMonth,
      newBusiness: auditScope("new"),
      maturity: auditScope("maturity"),
      configuredKeys: [83, 84, 85, 89, 90, 91, 96, 97].map((seq) => window.dashboardConfig.widgetBehavior[String(seq)].methodologyKey),
      methodologyKeys: Object.keys(window.dashboardDomainConfig.businessChangeMethodology).sort(),
    };
  });
  for (const audit of [monthlyDiffAudit.newBusiness, monthlyDiffAudit.maturity]) {
    expect(audit.months).toEqual([monthlyDiffAudit.previousMonth, monthlyDiffAudit.currentMonth]);
    expect(audit.rangeTotal).toBe(audit.monthlyTotal);
    expect(audit.comparisonDatesComplete).toBeTruthy();
  }
  expect(monthlyDiffAudit.configuredKeys).toEqual([
    "newMonthly", "newMonthly", "newMonthly", "newMonthly",
    "maturityMonthly", "maturityMonthly", "maturityMonthly", "maturityMonthly",
  ]);
  expect(monthlyDiffAudit.methodologyKeys).toEqual(["maturityMonthly", "newMonthly"]);
  const newBusinessMonthEndControls = page.locator('[data-widget-seq="89"] select[data-inline-date-filter][data-month-end-only="true"]');
  await expect(newBusinessMonthEndControls).toHaveCount(2);
  await expect(page.locator('[data-widget-seq="89"] .chart-inline-control--daterange')).toContainText("统计月末区间");
  await expect(page.locator('[data-widget-seq="89"] .chart-inline-control--daterange')).toContainText("开始月末");
  await expect(page.locator('[data-widget-seq="89"] .chart-inline-control--daterange')).toContainText("结束月末");
  const newBusinessMonthEndAudit = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('[data-widget-seq="89"] select[data-month-end-only="true"]')];
    return {
      values: controls.map((control) => control.value),
      options: controls.flatMap((control) => [...control.options].map((option) => option.value)),
    };
  });
  expect(newBusinessMonthEndAudit.values.every((value) => isIsoMonthEnd(value))).toBeTruthy();
  expect(newBusinessMonthEndAudit.options.every((value) => isIsoMonthEnd(value))).toBeTruthy();
  const newBusinessRangeOptions = await newBusinessMonthEndControls.nth(0).locator("option").evaluateAll((options) => options.map((option) => option.value));
  expect(newBusinessRangeOptions.length).toBeGreaterThan(3);
  const localNewBusinessRange = [
    newBusinessRangeOptions[newBusinessRangeOptions.length - 3],
    newBusinessRangeOptions[newBusinessRangeOptions.length - 2],
  ];
  await newBusinessMonthEndControls.nth(0).selectOption(localNewBusinessRange[0]);
  await newBusinessMonthEndControls.nth(1).selectOption(localNewBusinessRange[1]);
  await page.locator('[data-widget-seq="79"] [data-open-business-detail="true"]').first().click();
  await page.locator('[data-widget-seq="89"] [data-open-business-detail="true"]').first().click();
  await expect(page.locator('[data-widget-seq="80"] .business-detail-context__meta')).toContainText(`\u622a\u81f3 ${selectedSharedEndDate}`);
  await expect(page.locator('[data-widget-seq="85"] .business-detail-context__meta')).toContainText(`${localNewBusinessRange[0]} \u81f3 ${localNewBusinessRange[1]}`);
  const stockStructureValueBeforeDateChange = await page.locator('[data-widget-seq="79"] tbody tr').first().locator("td").nth(2).textContent();
  const changedSharedEndDate = await page.evaluate(() => addClampedMonthsDateValue(appState.globalEndDate, -1));
  await page.locator("#globalEndDate").fill(changedSharedEndDate);
  await page.locator("#globalEndDate").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(newBusinessMonthEndControls.nth(0)).toHaveValue(localNewBusinessRange[0]);
  await expect(newBusinessMonthEndControls.nth(1)).toHaveValue(localNewBusinessRange[1]);
  await expect(page.locator('[data-widget-seq="80"] .business-detail-context__meta')).toContainText(`\u622a\u81f3 ${changedSharedEndDate}`);
  await expect(page.locator('[data-widget-seq="85"] .business-detail-context__meta')).toContainText(`${localNewBusinessRange[0]} \u81f3 ${localNewBusinessRange[1]}`);
  const stockStructureValueAfterDateChange = await page.locator('[data-widget-seq="79"] tbody tr').first().locator("td").nth(2).textContent();
  expect(stockStructureValueAfterDateChange).not.toBe(stockStructureValueBeforeDateChange);
  const businessTrendRows = await page.evaluate(() => {
    const pairs = [["72", "73"], ["83", "84"], ["90", "91"]];
    return pairs.map(([leftSeq, rightSeq]) => {
      const left = document.querySelector(`article[data-widget-seq="${leftSeq}"]`);
      const right = document.querySelector(`article[data-widget-seq="${rightSeq}"]`);
      if (!left || !right) return { leftSeq, rightSeq, exists: false };
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return {
        leftSeq,
        rightSeq,
        exists: true,
        sameRow: Math.abs(leftRect.top - rightRect.top) < 8,
        leftBeforeRight: leftRect.right <= rightRect.left,
      };
    });
  });
  for (const row of businessTrendRows) {
    expect(row.exists, `${row.leftSeq}/${row.rightSeq} should exist`).toBeTruthy();
    expect(row.sameRow, `${row.leftSeq}/${row.rightSeq} should be on one row`).toBeTruthy();
    expect(row.leftBeforeRight, `${row.leftSeq}/${row.rightSeq} should be side by side`).toBeTruthy();
  }

  const perspectiveSwitch = page.locator('#dashboardView [role="tablist"][aria-label="\u4e1a\u52a1\u53d8\u52a8\u5206\u6790\u89c6\u89d2"]');
  const interestPerspectiveTab = perspectiveSwitch.getByRole("tab", { name: "\u5229\u7387\u98ce\u9669", exact: true });
  const liquidityPerspectiveTab = perspectiveSwitch.getByRole("tab", { name: "\u6d41\u52a8\u6027\u98ce\u9669", exact: true });
  await expect(interestPerspectiveTab).toHaveAttribute("aria-selected", "true");
  await expect(liquidityPerspectiveTab).toHaveAttribute("aria-selected", "false");

  await liquidityPerspectiveTab.click();
  await expect(liquidityPerspectiveTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "\u603b\u8d44\u4ea7\u4e0e\u603b\u8d1f\u503a\u89c4\u6a21\u53ca\u589e\u901f", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "\u5206\u4e1a\u52a1\u7c7b\u522b\u89c4\u6a21\u53ca\u589e\u901f", exact: true })).toBeVisible();
  await expect(page.locator('[data-widget-seq="72"] .chart-legend')).toContainText("\u603b\u8d44\u4ea7\u89c4\u6a21");
  await expect(page.locator('[data-widget-seq="72"] .chart-legend')).toContainText("\u603b\u8d1f\u503a\u589e\u901f");
  await expect(page.locator('[data-widget-seq="73"] .chart-legend')).toContainText("\u73b0\u91d1");
  await expect(page.locator('[data-widget-seq="73"] .chart-legend')).toContainText("\u5b9a\u671f\u5b58\u6b3e");
  businessChartLogicalCount += 6;
  stockStructureLogicalCount += 1;
  stockDetailLogicalCount += 1;
  expect(businessChartLogicalCount).toBe(12);
  expect(stockStructureLogicalCount).toBe(2);
  expect(stockDetailLogicalCount).toBe(2);
  for (const widgetSeq of [72, 73]) {
    const widget = page.locator(`[data-widget-seq="${widgetSeq}"]`);
    await expect(widget.locator('[role="tab"][data-filter-name="\u9891\u7387"][data-filter-value="\u6708\u9891"]')).toBeVisible();
    await expect(widget.locator('[role="tab"][data-filter-name="\u9891\u7387"][data-filter-value="\u65e5\u9891"]')).toBeVisible();
  }

  const liquidityStructureWidget = page.locator('article[data-widget-seq="79"]');
  await expect(liquidityStructureWidget.getByRole("heading", { name: "\u6d41\u52a8\u6027\u98ce\u9669\u4e1a\u52a1\u7ed3\u6784\u4e00\u89c8\u8868", exact: true })).toBeVisible();
  await expect(liquidityStructureWidget.locator("thead")).toContainText("\u65b9\u5411");
  const liquidityOverviewHeaders = await page.evaluate(() => Object.fromEntries(
    ["79", "89", "96"].map((seq) => [
      seq,
      [...document.querySelectorAll(`[data-widget-seq="${seq}"] thead tr:last-child th`)].map((cell) => cell.textContent.trim()),
    ])
  ));
  expect(liquidityOverviewHeaders["79"]).toEqual([
    "\u89c4\u6a21", "\u5e73\u5747\u5229\u7387", "\u5e73\u5747\u539f\u59cb\u671f\u9650", "\u5e73\u5747\u5269\u4f59\u671f\u9650",
  ]);
  expect(liquidityOverviewHeaders["89"]).toEqual([
    "\u89c4\u6a21", "\u5e73\u5747\u5229\u7387", "\u5e73\u5747\u539f\u59cb\u671f\u9650",
  ]);
  expect(liquidityOverviewHeaders["96"]).toEqual([
    "\u89c4\u6a21", "\u5e73\u5747\u5229\u7387", "\u5e73\u5747\u5269\u4f59\u671f\u9650",
  ]);
  const liquidityTableCategories = await liquidityStructureWidget.locator("tbody tr").evaluateAll((rows) => rows.map((row) => {
    const cells = [...row.querySelectorAll("td")];
    return (cells[0]?.classList.contains("chart-table__group-cell") ? cells[1] : cells[0])?.textContent.trim();
  }));
  expect(liquidityTableCategories).toEqual(TEXT.liquidityBusinessTableCategories);
  await liquidityStructureWidget.getByRole("button", { name: "\u67e5\u770b\u660e\u7ec6", exact: true }).first().click();
  await page.locator('[data-widget-seq="89"]').getByRole("button", { name: "\u67e5\u770b\u660e\u7ec6", exact: true }).first().click();
  await page.locator('[data-widget-seq="96"]').getByRole("button", { name: "\u67e5\u770b\u660e\u7ec6", exact: true }).first().click();
  const currentSharedEndDate = await page.locator("#globalEndDate").inputValue();
  await expect(page.locator('[data-widget-seq="80"] .business-detail-context__meta')).toContainText(`\u622a\u81f3 ${currentSharedEndDate}`);
  await expect(page.locator('[data-widget-seq="85"] .business-detail-context__meta')).toContainText(`${localNewBusinessRange[0]} \u81f3 ${localNewBusinessRange[1]}`);
  await expect(page.locator('[data-widget-seq="89"] select[data-inline-date-filter]').nth(0)).toHaveValue(localNewBusinessRange[0]);
  await expect(page.locator('[data-widget-seq="89"] select[data-inline-date-filter]').nth(1)).toHaveValue(localNewBusinessRange[1]);
  const liquidityDetailHeaders = await page.evaluate(() => Object.fromEntries(
    ["80", "85", "97"].map((seq) => [
      seq,
      [...document.querySelectorAll(`[data-widget-seq="${seq}"] thead th`)].map((cell) => cell.textContent.trim()),
    ])
  ));
  expect(liquidityDetailHeaders["80"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5e01\u79cd", "\u4f59\u989d", "\u5229\u7387", "\u539f\u59cb\u671f\u9650", "\u5269\u4f59\u671f\u9650",
  ]);
  expect(liquidityDetailHeaders["85"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u53d1\u751f\u6708\u4efd", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5e01\u79cd", "\u65b0\u53d1\u751f\u91d1\u989d", "\u5229\u7387", "\u539f\u59cb\u671f\u9650",
  ]);
  expect(liquidityDetailHeaders["97"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u5230\u671f\u6708\u4efd", "\u5230\u671f\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5e01\u79cd", "\u5230\u671f\u91d1\u989d", "\u5229\u7387", "\u5269\u4f59\u671f\u9650",
  ]);
  await expect(page.locator("[data-open-liquidity-cashflow]")).toHaveCount(0);

  await interestPerspectiveTab.click();
  await expect(interestPerspectiveTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "\u8d44\u4ea7\u8d1f\u503a\u89c4\u6a21\u53ca\u589e\u901f", exact: true })).toBeVisible();
  const interestOverviewHeaders = await page.evaluate(() => Object.fromEntries(
    ["79", "89", "96"].map((seq) => [
      seq,
      [...document.querySelectorAll(`[data-widget-seq="${seq}"] thead tr:last-child th`)].map((cell) => cell.textContent.trim()),
    ])
  ));
  expect(interestOverviewHeaders["79"]).toEqual([
    "\u89c4\u6a21", "\u56fa\u606f\u5360\u6bd4", "\u52a0\u6743\u4e45\u671f", "\u5e73\u5747\u5269\u4f59\u671f\u9650", "\u5e73\u5747\u5229\u7387",
  ]);
  expect(interestOverviewHeaders["89"]).toEqual([
    "\u89c4\u6a21", "\u56fa\u606f\u5360\u6bd4", "\u52a0\u6743\u4e45\u671f", "\u5e73\u5747\u539f\u59cb\u671f\u9650", "\u5e73\u5747\u5229\u7387",
  ]);
  expect(interestOverviewHeaders["96"]).toEqual([
    "\u89c4\u6a21", "\u56fa\u606f\u5360\u6bd4", "\u52a0\u6743\u4e45\u671f", "\u5e73\u5747\u5269\u4f59\u671f\u9650", "\u5e73\u5747\u5229\u7387",
  ]);
  const futureMonthLabels = await page.evaluate(() => buildFutureMaturityMonthlyLabels());
  expect(futureMonthLabels).toHaveLength(6);
  for (const futureMonthLabel of futureMonthLabels) {
    await expect(page.locator('[data-widget-seq="90"] .chart-stage')).toContainText(futureMonthLabel);
    await expect(page.locator('[data-widget-seq="91"] .chart-stage')).toContainText(futureMonthLabel);
  }
  await expect(page.locator('[data-widget-seq="90"] .maturity-future-band')).toHaveCount(1);
  await expect(page.locator('[data-widget-seq="91"] .maturity-future-band')).toHaveCount(1);
  for (const widgetSeq of [90, 91]) {
    const maturityTrendWidget = page.locator(`[data-widget-seq="${widgetSeq}"]`);
    expect(await maturityTrendWidget.locator("svg polyline").count()).toBeGreaterThan(0);
    await expect(maturityTrendWidget.locator('svg polyline[stroke-dasharray]')).toHaveCount(0);
    expect(await maturityTrendWidget.locator(`rect[data-business-change-month="${futureMonthLabels[0]}"]`).count()).toBeGreaterThan(0);
  }
  const maturityStructureWidget = page.locator('article[data-widget-seq="96"]');
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u5386\u53f2\u5b9e\u9645\u5230\u671f", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true })).toBeVisible();
  await expect(maturityStructureWidget.locator('select[data-inline-date-filter][data-month-end-only="true"]')).toHaveCount(2);
  const maturityRanges = await page.evaluate(() => {
    const cutoff = getLatestCompletedBusinessMonthEnd(getDefaultGlobalEndDate());
    const historyRange = normalizeWidgetBusinessStructureDateRange(96, [], null, "\u5386\u53f2\u65f6\u95f4\u533a\u95f4\uff08\u8d77\u6b62\uff09");
    const futureRange = normalizeWidgetBusinessStructureDateRange(96, [], null, "\u672a\u6765\u65f6\u95f4\u533a\u95f4\uff08\u8d77\u6b62\uff09");
    const isMonthEnd = (value) => {
      const date = parseDateValue(value);
      return Boolean(date) && date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };
    return {
      cutoff,
      historyRange,
      futureRange,
      historyAllMonthEnds: historyRange.every(isMonthEnd),
      futureStartsOnNextDay: futureRange[0] === addDays(cutoff, 1),
    };
  });
  expect(maturityRanges.historyRange.every((value) => value <= maturityRanges.cutoff)).toBeTruthy();
  expect(maturityRanges.futureRange.every((value) => value > maturityRanges.cutoff)).toBeTruthy();
  expect(maturityRanges.historyAllMonthEnds).toBeTruthy();
  expect(maturityRanges.futureStartsOnNextDay).toBeTruthy();
  const maturityHistoryControls = maturityStructureWidget.locator('select[data-inline-date-filter][data-month-end-only="true"]');
  const maturityHistoryOptions = await maturityHistoryControls.nth(0).locator("option").evaluateAll((options) => options.map((option) => option.value));
  const localMaturityHistoryRange = [
    maturityHistoryOptions[Math.max(0, maturityHistoryOptions.length - 3)],
    maturityHistoryOptions[Math.max(0, maturityHistoryOptions.length - 2)],
  ];
  await maturityHistoryControls.nth(0).selectOption(localMaturityHistoryRange[0]);
  await maturityHistoryControls.nth(1).selectOption(localMaturityHistoryRange[1]);
  await maturityStructureWidget.getByRole("button", { name: "\u67e5\u770b\u660e\u7ec6", exact: true }).first().click();
  await expect(page.locator('[data-widget-seq="97"] .business-detail-context__meta')).toContainText(`${localMaturityHistoryRange[0]} \u81f3 ${localMaturityHistoryRange[1]}`);
  const sharedEndBeforeMaturityRangeAudit = await page.locator("#globalEndDate").inputValue();
  const sharedEndAfterMaturityRangeAudit = await page.evaluate(() => addClampedMonthsDateValue(appState.globalEndDate, -1));
  await page.locator("#globalEndDate").fill(sharedEndAfterMaturityRangeAudit);
  await page.locator("#globalEndDate").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(sharedEndAfterMaturityRangeAudit).not.toBe(sharedEndBeforeMaturityRangeAudit);
  await expect(maturityHistoryControls.nth(0)).toHaveValue(localMaturityHistoryRange[0]);
  await expect(maturityHistoryControls.nth(1)).toHaveValue(localMaturityHistoryRange[1]);
  await expect(page.locator('[data-widget-seq="97"] .business-detail-context__meta')).toContainText(`${localMaturityHistoryRange[0]} \u81f3 ${localMaturityHistoryRange[1]}`);
  await maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true }).click();
  await expect(maturityStructureWidget.getByRole("tab", { name: "\u672a\u6765\u5408\u540c\u5230\u671f", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(maturityStructureWidget.locator('select[data-inline-date-filter][data-month-end-only="true"]')).toHaveCount(0);
  const maturityFutureControls = maturityStructureWidget.locator('input[type="date"][data-inline-date-filter][data-date-granularity="day"]');
  await expect(maturityFutureControls).toHaveCount(2);
  await expect(maturityStructureWidget.locator('[data-daily-date-range="true"]')).toContainText("\u5f00\u59cb\u65e5\u671f");
  await expect(maturityStructureWidget.locator('[data-daily-date-range="true"]')).toContainText("\u7ed3\u675f\u65e5\u671f");
  const futureDailySelection = await page.evaluate(() => {
    const dateRange = normalizeWidgetBusinessStructureDateRange(96, [], null, "\u672a\u6765\u65f6\u95f4\u533a\u95f4\uff08\u8d77\u6b62\uff09");
    const chartContext = {
      analysisPerspective: getActiveAnalysisPerspective(),
      filterState: { \u673a\u6784: ["\u6cd5\u4eba\u6c47\u603b"], \u5e01\u79cd: ["\u5168\u6298\u4eba\u6c11\u5e01"] },
      signature: 1,
    };
    const facts = buildBusinessChangeFactsForDateRange("maturity", chartContext, dateRange, { future: true });
    const selected = facts.find((row) => {
      const date = parseDateValue(row.contractMaturityDate);
      return date && date.getDate() !== new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }) || facts[0];
    return {
      date: selected?.contractMaturityDate || dateRange[0],
      businessType: selected?.businessType || "\u81ea\u8425\u8d37\u6b3e",
      allFactsWithinRange: facts.every((row) => row.contractMaturityDate >= dateRange[0] && row.contractMaturityDate <= dateRange[1]),
    };
  });
  expect(futureDailySelection.allFactsWithinRange).toBeTruthy();
  for (let index = 0; index < 2; index += 1) {
    await maturityFutureControls.nth(index).fill(futureDailySelection.date);
    await maturityFutureControls.nth(index).evaluate((element) => element.dispatchEvent(new Event("change", { bubbles: true })));
  }
  const selectedMaturityFutureRange = await maturityFutureControls.evaluateAll((controls) => controls.map((control) => control.value));
  expect(selectedMaturityFutureRange).toEqual([futureDailySelection.date, futureDailySelection.date]);
  await maturityStructureWidget.locator(`[data-open-business-detail][data-business-type="${futureDailySelection.businessType}"]`).click();
  await expect(page.locator('[data-widget-seq="97"] .business-detail-context__meta')).toContainText(`${selectedMaturityFutureRange[0]} \u81f3 ${selectedMaturityFutureRange[1]}`);
  await expect(page.locator('[data-widget-seq="97"] tbody')).toContainText(futureDailySelection.date);
  const crossBoundaryAudit = await page.evaluate(() => {
    const cutoff = getDefaultGlobalEndDate();
    const futureStart = addDays(cutoff, 1);
    return {
      futureStart,
      range: normalizeWidgetBusinessStructureDateRange(96, [futureStart, cutoff], 0),
    };
  });
  expect(crossBoundaryAudit.range[0]).toBe(crossBoundaryAudit.range[1]);
  expect(crossBoundaryAudit.range[0]).toBe(crossBoundaryAudit.futureStart);
  await page.evaluate(() => {
    appState.businessDrilldowns = {
      "80": { businessType: "\u6295\u8d44\u7c7b\u8d44\u4ea7", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 79 },
      "85": { businessType: "\u6295\u8d44\u7c7b\u8d44\u4ea7", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 89 },
      "97": { businessType: "\u81ea\u8425\u8d37\u6b3e", category: "\u751f\u606f\u8d44\u4ea7", sourceWidgetSeq: 96 },
    };
    render();
  });
  const businessDetailHeaders = await page.evaluate(() => Object.fromEntries(
    ["80", "85", "97"].map((seq) => [
      seq,
      [...document.querySelectorAll(`[data-widget-seq="${seq}"] thead th`)].map((cell) => cell.textContent.trim()),
    ])
  ));
  expect(businessDetailHeaders["80"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u4f59\u989d", "\u5229\u7387", "\u5229\u7387\u7c7b\u578b", "\u5229\u7387\u57fa\u51c6", "\u5229\u5dee",
    "\u539f\u59cb\u671f\u9650", "\u5269\u4f59\u671f\u9650", "\u91cd\u5b9a\u4ef7\u5468\u671f", "\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5", "\u91cd\u5b9a\u4ef7\u4e45\u671f",
  ]);
  expect(businessDetailHeaders["85"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u53d1\u751f\u6708\u4efd", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u65b0\u53d1\u751f\u91d1\u989d", "\u5229\u7387", "\u5229\u7387\u7c7b\u578b", "\u5229\u7387\u57fa\u51c6", "\u5229\u5dee",
    "\u539f\u59cb\u671f\u9650", "\u91cd\u5b9a\u4ef7\u5468\u671f", "\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5", "\u91cd\u5b9a\u4ef7\u4e45\u671f",
  ]);
  expect(businessDetailHeaders["97"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u5230\u671f\u6708\u4efd", "\u5230\u671f\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5230\u671f\u91d1\u989d", "\u5230\u671f\u524d\u5229\u7387", "\u5229\u7387\u7c7b\u578b", "\u5229\u7387\u57fa\u51c6", "\u5229\u5dee",
    "\u5269\u4f59\u671f\u9650", "\u91cd\u5b9a\u4ef7\u5468\u671f", "\u91cd\u5b9a\u4ef7\u4e45\u671f",
  ]);
  await expect(page.locator('[data-widget-seq="80"] tbody tr').first().locator("td").first()).toContainText(".IB");
  const stockRateBenchmarks = await page.locator('[data-widget-seq="80"] table').evaluate((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
    const rateTypeIndex = headers.indexOf("\u5229\u7387\u7c7b\u578b");
    const benchmarkIndex = headers.indexOf("\u5229\u7387\u57fa\u51c6");
    const spreadIndex = headers.indexOf("\u5229\u5dee");
    return [...table.querySelectorAll("tbody tr")].map((row) => {
      const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent.trim());
      return { rateType: cells[rateTypeIndex], benchmark: cells[benchmarkIndex], spread: cells[spreadIndex] };
    });
  });
  expect(stockRateBenchmarks.some((row) => row.rateType === "\u56fa\u5b9a")).toBeTruthy();
  expect(stockRateBenchmarks.some((row) => row.rateType === "\u6d6e\u52a8")).toBeTruthy();
  expect(stockRateBenchmarks.every((row) =>
    row.rateType === "\u56fa\u5b9a"
      ? row.benchmark === "\u56fa\u5b9a\u5229\u7387" && row.spread === "\u4e0d\u9002\u7528"
      : row.benchmark !== "\u56fa\u5b9a\u5229\u7387" && /^\+\d+bp$/.test(row.spread)
  )).toBeTruthy();
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

test("EVE\u548cNII\u5e01\u79cd\u77e9\u9635\u8868\u5df2\u79fb\u9664", async ({ page }) => {
  await openPage(page);
  await expect(page.getByRole("heading", { name: TEXT.mergedEveTableTitle, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "\u5404\u5e01\u79cd\u51c0\u5229\u606f\u6536\u5165\u6ce2\u52a8", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: TEXT.removedEveTableTitle, exact: true })).toHaveCount(0);
  await expect(page.locator('[data-widget-seq="5"]')).toHaveCount(0);
  await expect(page.locator('[data-widget-seq="8"]')).toHaveCount(0);
  await expect(page.locator("#dashboardView article.widget-card h4").nth(1)).toHaveText("\u51c0\u5229\u606f\u6536\u5165\u6ce2\u52a8");
});

test("\u673a\u6784\u548c\u5e01\u79cd\u53ea\u652f\u6301\u5355\u9009", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  const organizationFilter = page.locator('#globalFilterBar [data-filter-name="机构"]');
  await organizationFilter.click();
  await expect(page.locator('#filterModal [role="radiogroup"]')).toBeVisible();
  await page.locator('#filterModal [data-filter-name="机构"][data-filter-value="境内汇总"]').click();
  expect(await page.evaluate(() => appState.pageFilters["business-change"].机构)).toEqual(["境内汇总"]);
  await expect(organizationFilter).toContainText("境内汇总");
  const businessStructureHeader = page.locator('[data-widget-seq="79"] thead').first();
  await expect(businessStructureHeader).toContainText("境内汇总");
  await expect(businessStructureHeader).not.toContainText("法人汇总");

  const currencyFilter = page.locator('#globalFilterBar [data-filter-name="币种"]');
  await currencyFilter.click();
  await page.locator('#filterModal [data-filter-name="币种"][data-filter-value="美元"]').click();
  expect(await page.evaluate(() => appState.pageFilters["business-change"].币种)).toEqual(["美元"]);
  await expect(currencyFilter).toContainText("美元");
});

test("\u9875\u9762\u7ea7\u65f6\u95f4\u7b5b\u9009\u53ea\u5141\u8bb8\u4fee\u6539\u7ed3\u675f\u65f6\u95f4", async ({ page }) => {
  await openPage(page);
  await expect(page.locator("#globalStartDate")).toHaveCount(0);
  const defaultRange = await page.evaluate(() => [appState.globalStartDate, appState.globalEndDate]);
  const endDate = page.locator("#globalEndDate");
  await expect(endDate).toHaveAttribute("min", defaultRange[0]);
  const selectedEndDate = await page.evaluate(() => addClampedMonthsDateValue(appState.globalEndDate, -1));
  await endDate.fill(selectedEndDate);
  await endDate.evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const updatedRange = await page.evaluate(() => [appState.globalStartDate, appState.globalEndDate]);
  expect(updatedRange[0]).toBe(defaultRange[0]);
  expect(updatedRange[1]).toBe(selectedEndDate);
});

test("\u6a21\u62df\u6d4b\u7b97\u548cAI\u5f39\u7a97\u53ef\u4ee5\u6253\u5f00", async ({ page }) => {
  await openPage(page);
  await expect(page.locator("#globalFilterBar").getByRole("button", { name: TEXT.simulationButton, exact: true })).toHaveCount(0);
  const repricingGapWidget = page.locator('article[data-widget-seq="9"]');
  const repricingSimulationButton = repricingGapWidget.getByRole("button", { name: TEXT.simulationButton, exact: true });
  await expect(repricingSimulationButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(repricingSimulationButton).toHaveCSS("background-color", "rgb(52, 120, 212)");
  await repricingSimulationButton.click();
  const simulationModal = page.locator("#simulationModal");
  await expect(simulationModal.getByRole("heading", { name: TEXT.simulationButton, exact: true })).toBeVisible();
  await expect(simulationModal.getByRole("heading", { name: "\u57fa\u51c6\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u8868", exact: true })).toBeVisible();
  const baselineTable = simulationModal.locator(".repricing-base-table").first();
  await expect(simulationModal).toContainText("当前机构口径剔除内部交易；负债端不含活期存款");
  await expect(baselineTable.locator('[data-repricing-base-row="\u6d3b\u671f\u5b58\u6b3e"]')).toHaveClass(/is-excluded-from-metric/);
  await expect(baselineTable.locator('[data-repricing-base-row="\u5185\u90e8\u4ea4\u6613\u8d44\u4ea7"]')).toHaveClass(/is-excluded-from-metric/);
  await expect(simulationModal).toContainText("\u5f53\u524d\u57fa\u51c6\uff1a\u5f53\u524d\u65f6\u70b9\u7f3a\u53e3\u8868");
  await expect(baselineTable.locator("thead th").nth(0)).toHaveText("\u4e1a\u52a1\u7c7b\u522b");
  await expect(baselineTable.locator("thead th:not(:first-child)")).toHaveCount(14);
  await expect(simulationModal.locator('[data-repricing-base-total="\u751f\u606f\u8d44\u4ea7"]')).toBeVisible();
  await expect(simulationModal.locator('[data-repricing-base-total="\u4ed8\u606f\u8d1f\u503a"]')).toBeVisible();
  const repricingDerivativeTypes = [
    "\u94f6\u884c\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536",
    "\u94f6\u884c\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8",
    "\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536",
    "\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8",
  ];
  for (const derivativeType of repricingDerivativeTypes) {
    await expect(baselineTable.locator(`[data-repricing-base-row="${derivativeType}"]`)).toBeVisible();
  }

  const currentEndDate = await page.locator("#globalEndDate").inputValue();
  await expect(simulationModal.locator('[data-simulation-base-date="repricing"]')).toContainText(currentEndDate);
  await expect(simulationModal.locator('[data-repricing-base-date]')).toHaveCount(0);
  await expect(simulationModal.locator('[data-repricing-quick-config]')).toHaveCount(0);
  await expect(simulationModal.locator('[data-repricing-base-upload]')).toHaveCount(0);
  await expect(simulationModal.getByText("\u57fa\u51c6\u751f\u6210\u65b9\u5f0f", { exact: true })).toHaveCount(0);
  await expect(simulationModal.getByText("\u4e0a\u4f20\u7f3a\u53e3\u8868", { exact: true })).toHaveCount(0);
  await expect(simulationModal.locator("[data-simulation-mode-tab]")).toHaveCount(0);
  await expect(simulationModal.getByText("套期交易模拟测算", { exact: true })).toHaveCount(0);
  await expect(baselineTable.locator("input")).toHaveCount(0);
  const repricingBaselineAudit = await page.evaluate(() => ({
    baseDate: getRepricingGapSimulationDraft().baseDate,
    baseMatrix: getRepricingGapSimulationDraft().baseMatrix,
    currentMatrix: buildCurrentRepricingGapMatrix(),
  }));
  expect(repricingBaselineAudit.baseDate).toBe(currentEndDate);
  expect(repricingBaselineAudit.baseMatrix).toEqual(repricingBaselineAudit.currentMatrix);
  await expect(simulationModal).toContainText("\u57fa\u51c6\u7f3a\u53e3\u7387");
  await expect(simulationModal.locator('[data-repricing-simulation-entry]')).toHaveCount(2);
  const repricingUseSection = simulationModal.locator('[data-simulation-funding-role="\u8d44\u91d1\u8fd0\u7528"]');
  const repricingSourceSection = simulationModal.locator('[data-simulation-funding-role="\u8d44\u91d1\u6765\u6e90"]');
  await expect(repricingUseSection).toContainText("\u8d44\u91d1\u8fd0\u7528");
  await expect(repricingSourceSection).toContainText("\u8d44\u91d1\u6765\u6e90");
  await expect(repricingUseSection.locator('[data-repricing-simulation-entry]')).toHaveCount(1);
  await expect(repricingSourceSection.locator('[data-repricing-simulation-entry]')).toHaveCount(1);
  await expect(repricingUseSection.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u8fd0\u7528\u4e1a\u52a1", exact: true })).toBeVisible();
  await expect(repricingSourceSection.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u6765\u6e90\u4e1a\u52a1", exact: true })).toBeVisible();
  await expect(repricingUseSection.getByText("\u53d1\u751f\u65f6\u95f4", { exact: true })).toBeVisible();
  await expect(repricingUseSection.getByText("\u4e1a\u52a1\u7c7b\u578b", { exact: true })).toBeVisible();
  await expect(repricingUseSection.getByText("\u89c4\u6a21\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  await expect(repricingUseSection.getByText("\u91cd\u5b9a\u4ef7\u9891\u7387", { exact: true })).toBeVisible();
  await expect(repricingUseSection.getByText("\u4e0b\u6b21\u91cd\u5b9a\u4ef7\u65f6\u95f4", { exact: true })).toBeVisible();
  const scaleField = repricingUseSection.locator('[data-repricing-simulation-field="scale"]');
  await scaleField.fill("-25.5");
  await expect(scaleField).toHaveValue("-25.5");
  const repricingOccurrenceDate = await page.evaluate((date) => addDays(date, 30), currentEndDate);
  const repricingNextDate = await page.evaluate((date) => addMonthsDateValue(date, 3), repricingOccurrenceDate);
  await repricingUseSection.locator('[data-repricing-simulation-field="occurrenceDate"]').fill(repricingOccurrenceDate);
  await repricingUseSection.locator('[data-repricing-simulation-field="repricingMonths"]').selectOption("3");
  await repricingUseSection.locator('[data-repricing-simulation-field="nextRepricingDate"]').fill(repricingNextDate);
  await repricingUseSection.locator('[data-repricing-simulation-field="scale"]').fill("100");
  await repricingUseSection.locator('[data-repricing-simulation-field="scale"]').blur();
  const repricingBucketIndex = await page.evaluate(
    ({ baseDate, nextDate }) => getRepricingGapBucketIndex(baseDate, nextDate),
    { baseDate: currentEndDate, nextDate: repricingNextDate }
  );
  const baseBucketValue = Number(await simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] td').nth(repricingBucketIndex + 1).textContent());
  const resultBucketValue = Number(await simulationModal.locator('[data-repricing-result-row="\u81ea\u8425\u8d37\u6b3e"] td').nth(repricingBucketIndex + 1).textContent());
  expect(Number((resultBucketValue - baseBucketValue).toFixed(1))).toBe(100);
  await expect(simulationModal.getByRole("heading", { name: "\u6d4b\u7b97\u540e\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u8868", exact: true })).toBeVisible();
  for (const derivativeType of repricingDerivativeTypes) {
    await expect(simulationModal.locator(`[data-repricing-result-row="${derivativeType}"]`)).toBeVisible();
  }
  await expect(simulationModal.locator(".repricing-simulation-result-metrics")).toContainText("\u6d4b\u7b97\u540e\u7f3a\u53e3\u7387");
  await expect(simulationModal.locator(".repricing-simulation-result-metrics")).not.toContainText("\u6d4b\u7b97\u540e\u91cd\u5b9a\u4ef7\u7f3a\u53e3");
  const baselineRatioText = await simulationModal.locator(".repricing-simulation-result-metrics strong").nth(0).textContent();
  const simulatedRatioText = await simulationModal.locator(".repricing-simulation-result-metrics strong").nth(1).textContent();
  expect(simulatedRatioText).not.toBe(baselineRatioText);
  await simulationModal.getByRole("button", { name: "\u5e94\u7528\u6d4b\u7b97", exact: true }).click();
  await expect(repricingGapWidget.locator(".simulation-summary--widget")).toContainText("\u5f53\u524d\u65f6\u70b9\u7f3a\u53e3\u8868");
  await expect(repricingGapWidget.locator(".simulation-summary--widget")).toContainText("\u65b0\u4e1a\u52a1\uff1a2\u7b14");
  await expect(repricingGapWidget.locator(".simulation-summary--widget")).toContainText("\u65b0\u589e\u89c4\u6a21\u5408\u8ba1\uff1a150\u4ebf\u5143");
  await expect(repricingGapWidget).toContainText("\u57fa\u51c6\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387");
  await expect(repricingGapWidget).toContainText("\u6d4b\u7b97\u540e\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387");
  expect(await repricingGapWidget.locator("svg polyline").count()).toBeGreaterThanOrEqual(2);
  await expect(repricingGapWidget.locator('[data-repricing-simulation-point="true"]')).toHaveCount(1);

  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  const liquidityGapWidget = page.locator('article[data-widget-seq="49"]');
  await expect(liquidityGapWidget.getByRole("button", { name: TEXT.simulationButton, exact: true })).toHaveCount(1);
  await liquidityGapWidget.getByRole("button", { name: TEXT.simulationButton, exact: true }).click();
  await expect(simulationModal.getByRole("heading", { name: "\u57fa\u51c6\u73b0\u91d1\u6d41\u7f3a\u53e3\u8868", exact: true })).toBeVisible();
  const liquidityBaselineTable = simulationModal.locator(".liquidity-gap-base-table").first();
  await expect(simulationModal).toContainText("\u5f53\u524d\u57fa\u51c6\uff1a\u5f53\u524d\u65f6\u70b9\u7f3a\u53e3\u8868");
  await expect(simulationModal.locator('[data-simulation-base-date="liquidity"]')).toContainText(currentEndDate);
  await expect(simulationModal.locator('[data-liquidity-gap-base-date]')).toHaveCount(0);
  await expect(simulationModal.locator('[data-liquidity-gap-quick-config]')).toHaveCount(0);
  await expect(simulationModal.locator('[data-liquidity-gap-base-upload]')).toHaveCount(0);
  await expect(liquidityBaselineTable.locator("input")).toHaveCount(0);
  const liquidityBaselineAudit = await page.evaluate(() => ({
    baseDate: getLiquidityGapSimulationDraft().baseDate,
    baseMatrix: getLiquidityGapSimulationDraft().baseMatrix,
    currentMatrix: buildCurrentLiquidityCashFlowGapMatrix(),
  }));
  expect(liquidityBaselineAudit.baseDate).toBe(currentEndDate);
  expect(liquidityBaselineAudit.baseMatrix).toEqual(liquidityBaselineAudit.currentMatrix);
  await expect(liquidityBaselineTable.locator("thead th")).toHaveText([
    "\u4e1a\u52a1\u7c7b\u522b",
    ...TEXT.liquidityCashFlowBuckets,
  ]);
  await expect(liquidityBaselineTable.locator("tbody tr")).toHaveCount(TEXT.liquidityBusinessTableCategories.length);
  await expect(liquidityBaselineTable.locator('[data-liquidity-gap-base-total="\u8d44\u4ea7"]')).toContainText("\u8d44\u4ea7\u5408\u8ba1");
  await expect(liquidityBaselineTable.locator('[data-liquidity-gap-base-total="\u8d1f\u503a"]')).toContainText("\u8d1f\u503a\u5408\u8ba1");
  await expect(simulationModal.locator('[data-liquidity-gap-simulation-entry]')).toHaveCount(2);
  const liquidityUseSection = simulationModal.locator('[data-simulation-funding-role="\u8d44\u91d1\u8fd0\u7528"]');
  const liquiditySourceSection = simulationModal.locator('[data-simulation-funding-role="\u8d44\u91d1\u6765\u6e90"]');
  await expect(liquidityUseSection.locator('[data-liquidity-gap-simulation-entry]')).toHaveCount(1);
  await expect(liquiditySourceSection.locator('[data-liquidity-gap-simulation-entry]')).toHaveCount(1);
  await expect(liquidityUseSection.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u8fd0\u7528\u4e1a\u52a1", exact: true })).toBeVisible();
  await expect(liquiditySourceSection.getByRole("button", { name: "\u65b0\u589e\u8d44\u91d1\u6765\u6e90\u4e1a\u52a1", exact: true })).toBeVisible();
  const liquidityRoleOptionAudit = await page.evaluate(() => {
    const draft = getLiquidityGapSimulationDraft();
    return draft.entries.map((entry) => ({
      role: entry.fundingRole,
      businessType: entry.businessType,
      derivedRole: getLiquiditySimulationFundingRoleByBusinessType(entry.businessType),
    }));
  });
  expect(liquidityRoleOptionAudit.every((item) => item.role === item.derivedRole)).toBeTruthy();
  await expect(liquidityUseSection.getByText("\u53d1\u751f\u65f6\u95f4", { exact: true })).toBeVisible();
  await expect(liquidityUseSection.getByText("\u4e1a\u52a1\u7c7b\u578b", { exact: true })).toBeVisible();
  await expect(liquidityUseSection.getByText("\u89c4\u6a21\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  await expect(liquidityUseSection.getByText("\u7b2c\u4e00\u7b14\u73b0\u91d1\u6d41\u65e5\u671f", { exact: true })).toBeVisible();
  await expect(liquidityUseSection.getByText("\u7b2c\u4e00\u7b14\u73b0\u91d1\u6d41\u91d1\u989d\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  const liquidityUseEntry = liquidityUseSection.locator('[data-liquidity-gap-simulation-entry]').first();
  const liquidityUseEntryIndex = await liquidityUseEntry.getAttribute("data-liquidity-gap-simulation-entry");
  await expect(liquidityUseEntry.locator('[data-liquidity-cash-flow-row]')).toHaveCount(1);
  const liquidityGapRatioDenominatorAudit = await page.evaluate(() => {
    const businessTypes = getLiquidityGapSimulationBusinessTypes();
    const matrix = Object.fromEntries(businessTypes.map((businessType) => [
      businessType,
      [0, 0, 0, 0, 0],
    ]));
    matrix[businessTypes[0]] = [100, 20, 30, 40, 50];
    matrix[businessTypes[1]] = [-40, -10, -15, -20, -25];
    return calculateLiquidityCashFlowGapMetrics(matrix);
  });
  expect(liquidityGapRatioDenominatorAudit.gapRatios).toEqual(
    liquidityGapRatioDenominatorAudit.cumulativeTotals.map((gap, bucketIndex) =>
      liquidityGapRatioDenominatorAudit.cumulativeInflows[bucketIndex]
        ? Number(((gap / liquidityGapRatioDenominatorAudit.cumulativeInflows[bucketIndex]) * 100).toFixed(2))
        : 0
    )
  );
  expect(liquidityGapRatioDenominatorAudit.gapRatios[0]).toBe(60);
  await liquidityUseSection.getByRole("button", { name: "\u589e\u52a0\u73b0\u91d1\u6d41", exact: true }).click();
  const refreshedLiquidityUseEntry = simulationModal.locator(`[data-liquidity-gap-simulation-entry="${liquidityUseEntryIndex}"]`);
  await expect(refreshedLiquidityUseEntry.locator('[data-liquidity-cash-flow-row]')).toHaveCount(2);
  const secondCashFlowDate = await page.evaluate((date) => addDays(date, 10), currentEndDate);
  await refreshedLiquidityUseEntry.locator('[data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="date"]').fill(secondCashFlowDate);
  await refreshedLiquidityUseEntry.locator('[data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="amount"]').fill("25");
  await refreshedLiquidityUseEntry.locator('[data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="amount"]').blur();
  const liquidityBaseBucketValue = Number(await liquidityBaselineTable.locator('[data-liquidity-gap-base-row="\u5404\u9879\u8d37\u6b3e"] td').nth(2).textContent());
  const liquidityResultBucketValue = Number(await simulationModal.locator('[data-liquidity-gap-result-row="\u5404\u9879\u8d37\u6b3e"] td').nth(2).textContent());
  expect(Number((liquidityResultBucketValue - liquidityBaseBucketValue).toFixed(1))).toBe(25);
  await expect(simulationModal.getByRole("heading", { name: "\u6d4b\u7b97\u540e\u73b0\u91d1\u6d41\u7f3a\u53e3\u8868", exact: true })).toBeVisible();
  await simulationModal.getByRole("button", { name: "\u5e94\u7528\u6d4b\u7b97", exact: true }).click();
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u5f53\u524d\u65f6\u70b9\u7f3a\u53e3\u8868");
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u65b0\u4e1a\u52a1\uff1a2\u7b14");
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u73b0\u91d1\u6d41\uff1a3\u7b14");
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u57fa\u51c61\u5e74\u7d2f\u8ba1\u7f3a\u53e3");
  await expect(liquidityGapWidget.locator('[data-liquidity-gap-simulation-point="true"]')).toHaveCount(1);
  await expect(liquidityGapWidget.locator('[data-liquidity-gap-simulation-bar="true"]')).toHaveCount(1);

  await page.locator("[data-open-insight]").first().click();
  await expect(page.getByText(TEXT.aiEyebrow, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: TEXT.aiConclusion, exact: true })).toBeVisible();
});

test("管理限额按单机构及所选币种和附加口径匹配显示", async ({ page }) => {
  await openPage(page);
  const configuredCurrencies = await page.evaluate(() => window.dashboardConfig.filters.options.币种);
  expect(configuredCurrencies).toEqual(expect.arrayContaining(["全折美元", "全折欧元", "港币"]));
  expect(configuredCurrencies).not.toContain("港元");

  const eveWidget = page.locator('article[data-widget-seq="1"]');
  const repricingGapWidget = page.locator('article[data-widget-seq="9"]');
  const repricingDurationGapWidget = page.locator('article[data-widget-seq="15"]');
  const bondDurationWidget = page.locator('article[data-widget-seq="60"]');
  const bondScaleWidget = page.locator('article[data-widget-seq="59"]');
  await expect(eveWidget).toContainText("法人 / 全折人民币 限额 <=15%");
  await expect(repricingGapWidget).not.toContainText("限额");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["港币"] });
  await expect(eveWidget).not.toContainText("限额");
  await expect(repricingGapWidget).toContainText("香港 / 港币 限额 <=50%");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["欧元"] });
  await expect(repricingGapWidget).not.toContainText("限额");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["全折美元"] });
  await expect(bondScaleWidget).toContainText("香港 / 全折美元 债券投资规模 限额 <=142亿美元");
  await expect(bondScaleWidget).toContainText("香港 / 全折美元 非金融企业债券投资规模 限额 <=5亿美元");
  await expect(bondDurationWidget).not.toContainText("限额");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["外币折美元"] });
  await expect(bondDurationWidget).toContainText("香港 / 外币折美元 限额 <=4年");
  await expect(bondScaleWidget).not.toContainText("限额");

  await setPageFilters(page, "利率风险", {
    机构: ["香港分行"],
    币种: ["外币折美元", "人民币"],
  });
  await expect(bondDurationWidget.locator(".chart-legend--limits .chart-legend__item--limit")).toHaveCount(1);
  await expect(bondDurationWidget).toContainText("香港 / 外币折美元 限额 <=4年");
  await expect(bondDurationWidget).not.toContainText("香港 / 人民币 限额 <=4年");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["港币", "美元"] });
  await expect(repricingGapWidget.locator(".chart-legend--limits .chart-legend__item--limit")).toHaveCount(1);
  await expect(repricingGapWidget).toContainText("香港 / 港币 限额 <=50%");
  await expect(repricingGapWidget).not.toContainText("香港 / 美元 限额 <=16%");
  await expect(repricingDurationGapWidget.locator(".chart-legend--limits")).toHaveCount(0);
  await expect(repricingDurationGapWidget.locator("svg line[stroke-dasharray]")).toHaveCount(0);

  await setPageFilters(page, "利率风险", { 机构: ["香港分行", "纽约分行"], 币种: ["外币折美元"] });
  await expect(bondDurationWidget).toContainText("香港 / 外币折美元 限额 <=4年");

  await page.getByRole("button", { name: "流动性风险", exact: true }).click();
  await setPageFilters(page, "流动性风险", { 机构: ["新加坡分行"], 币种: ["全折美元"] });
  const liquidityGapWidget = page.locator('article[data-widget-seq="49"]');
  await expect(liquidityGapWidget).toContainText("新加坡 / 全折美元 / 时点 限额 >=-5.5亿美元");
  await liquidityGapWidget.locator('[data-filter-name="口径"][data-filter-value="月日均"]').click();
  await expect(liquidityGapWidget).toContainText("新加坡 / 全折美元 / 月日均 限额 >=-5亿美元");
  await expect(liquidityGapWidget).not.toContainText(">=-5.5亿美元");
  await liquidityGapWidget.locator('[data-filter-name="期限长度"][data-filter-value="1D"]').click();
  await expect(liquidityGapWidget).not.toContainText("限额");

  await setPageFilters(page, "流动性风险", { 机构: ["纽约分行"], 币种: ["全折人民币"] });
  const liquidityRatioWidget = page.locator('article[data-widget-seq="53"]');
  await expect(liquidityRatioWidget).toContainText("纽约 / 全折人民币 限额 >=25%");
  await setPageFilters(page, "流动性风险", { 机构: ["纽约分行"], 币种: ["人民币"] });
  await expect(liquidityRatioWidget).not.toContainText("限额");

  await expect(page.locator('article[data-widget-seq="42"]')).not.toContainText("限额");
  await expect(page.locator('article[data-widget-seq="46"]')).not.toContainText("限额");
  await expect(page.locator('article[data-widget-seq="57"]')).toHaveCount(0);
  await expect(page.locator('article[data-widget-seq="58"]')).toHaveCount(0);
});
