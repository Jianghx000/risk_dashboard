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
  expect(eveScopeModels.legal.numerator[0]).toBe(Math.max(...eveScopeModels.legal.scenarios.map((item) => Math.abs(item.values[0]))));
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
  const eveComparisonSelect = eveProcessModal.locator("[data-eve-process-comparison]");
  await expect(eveComparisonSelect).toHaveValue("");
  await expect(eveComparisonSelect.locator("option").first()).toContainText("\u4e0a\u4e00\u671f\uff08\u9ed8\u8ba4\uff1a");
  await expect(eveComparisonSelect.locator("option")).toHaveCount(4);
  const defaultComparisonLabel = await eveComparisonSelect.locator("option").first().textContent();
  await expect(eveProcessModal.locator(".eve-process-node__change").first()).toContainText("\u8f83\u57fa\u671f");
  await expect(eveProcessModal).not.toContainText("\u8f83\u4e0a\u671f");
  expect(await page.evaluate(() => getProcessComparisonIndex(
    appState.eveProcessModal,
    appState.eveProcessModal.dateIndex,
    appState.eveProcessModal.labels.length
  ))).toBe(2);
  await eveComparisonSelect.selectOption("0");
  expect(await page.evaluate(() => appState.eveProcessModal.comparisonIndex)).toBe(0);
  await expect(eveComparisonSelect.locator("option").first()).toHaveText(defaultComparisonLabel);
  await eveComparisonSelect.selectOption("");
  expect(await page.evaluate(() => appState.eveProcessModal.comparisonIndex)).toBeNull();
  const eveNumeratorNode = eveProcessModal.locator('[data-eve-process-node="numerator"]');
  await expect(eveProcessModal).toContainText("\u672c\u5916\u5e01\u5408\u8ba1\u4e00\u7ea7\u8d44\u672c\u51c0\u989d");
  await expect(eveProcessModal.locator('[data-eve-process-node="denominator"] .eve-process-node__action')).toHaveCount(0);
  await expect(eveNumeratorNode.locator(".eve-process-node__action")).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await eveNumeratorNode.locator(".eve-process-node__action").click();
  await expect(eveNumeratorNode.locator(".eve-process-node__action")).toContainText("\u70b9\u51fb\u6536\u56de");
  await expect(eveProcessModal).toContainText("\u5e73\u884c\u4e0a\u79fb");
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
  expect(repricingMaturityRanges).toHaveLength(13);
  expect(repricingMaturityRanges.map((range) => range.tenorBucket)).toEqual([
    "\u9694\u591c", "\u9694\u591c~1\u4e2a\u6708", "1~2\u4e2a\u6708", "2~3\u4e2a\u6708", "3~4\u4e2a\u6708", "4~5\u4e2a\u6708", "5~6\u4e2a\u6708",
    "6~7\u4e2a\u6708", "7~8\u4e2a\u6708", "8~9\u4e2a\u6708", "9~10\u4e2a\u6708", "10~11\u4e2a\u6708", "11~12\u4e2a\u6708",
  ]);
  await expect(maturityDistributionWidget.locator("svg")).toContainText(repricingMaturityRanges[0].label);
  await expect(maturityDistributionWidget.locator("svg")).toContainText(repricingMaturityRanges[12].label);
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
  await durationGapWidget.locator('[data-repricing-duration-gap-point="true"]').nth(3).click({ force: true });
  await expect(durationGapWidget.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await expect(durationGapWidget.locator(".eve-point-popover")).not.toContainText("\u8d44\u4ea7\u4e45\u671f");
  await durationGapWidget.locator(".eve-point-popover__action").click();
  await expect(page.locator("#repricingDurationGapProcessModal [data-repricing-duration-gap-process-comparison]")).toHaveValue("");
  await expect(page.locator("#repricingDurationGapProcessModal")).toContainText("\u8f83\u57fa\u671f");
  await expect(page.locator("#repricingDurationGapProcessModal")).toContainText("\u8d44\u4ea7\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f\u7f3a\u53e3 = \u8d44\u4ea7\u91cd\u5b9a\u4ef7\u4e45\u671f - \u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await expect(page.locator("#repricingDurationGapProcessModal")).toContainText("\u8d44\u4ea7\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await expect(page.locator("#repricingDurationGapProcessModal")).toContainText("\u8d1f\u503a\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await page.locator('[data-repricing-duration-gap-process-node="asset-duration"] .eve-process-node__action').click();
  await expect(page.locator("#repricingDurationGapProcessModal")).toContainText("\u81ea\u8425\u8d37\u6b3e");
  await expect(page.locator('[data-repricing-duration-gap-process-node="asset-duration"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await page.locator('[data-repricing-duration-gap-process-node="asset-duration"] .eve-process-node__action').click();
  await expect(page.locator('[data-repricing-duration-gap-process-node="asset-duration"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(page.locator("#repricingDurationGapProcessModal")).not.toContainText("\u81ea\u8425\u8d37\u6b3e");
  await page.locator('[data-repricing-duration-gap-process-node="asset-duration"] .eve-process-node__action').click();
  await page.locator('[data-repricing-duration-gap-process-node="asset-duration"] [data-process-sparkline]').click();
  await expect(page.locator("#processSparklinePreview")).toContainText("\u8d44\u4ea7\u91cd\u5b9a\u4ef7\u4e45\u671f");
  await page.locator('#processSparklinePreview button[data-close-process-sparkline="true"]').click();
  await page.keyboard.press("Escape");
  const repricingGapWidget = page.locator('article[data-widget-seq="9"]');
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
  await expect(page.locator("#repricingGapProcessModal [data-repricing-gap-process-comparison]")).toHaveValue("");
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u8f83\u57fa\u671f");
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3\u7387 = \u91cd\u5b9a\u4ef7\u7f3a\u53e3 \u00f7 \u603b\u751f\u606f\u8d44\u4ea7\u89c4\u6a21\uff08\u5254\u9664\u5185\u90e8\u4ea4\u6613\uff09");
  await page.locator('[data-repricing-gap-process-node="numerator"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u8d44\u4ea7\u7aef\u91cd\u5b9a\u4ef7\u89c4\u6a21\uff08\u4e0d\u542b\u5185\u90e8\u4ea4\u6613\uff09");
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-leaf-group")).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="adjusted-assets"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-leaf-group")).toHaveCount(1);
  const numeratorNodeBox = await page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="numerator"]').boundingBox();
  const assetNodeBox = await page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="adjusted-assets"]').boundingBox();
  const assetLeafBox = await page.locator("#repricingGapProcessModal .repricing-gap-leaf-group").boundingBox();
  expect(numeratorNodeBox).not.toBeNull();
  expect(assetNodeBox).not.toBeNull();
  expect(assetLeafBox).not.toBeNull();
  expect(Math.abs(assetNodeBox.width - numeratorNodeBox.width)).toBeLessThan(2);
  expect(assetLeafBox.x).toBeGreaterThan(assetNodeBox.x + assetNodeBox.width);
  for (const key of ["self-operated-loans", "investment-assets", "interbank-assets", "non-standard-investments", "central-bank-deposits"]) {
    await expect(page.locator(`#repricingGapProcessModal [data-repricing-gap-process-node="${key}"]`)).toHaveCount(1);
  }
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="bank-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="adjusted-liabilities"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-leaf-group")).toHaveCount(2);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="bank-book-receivable"]')).toHaveCount(0);
  await page.locator('[data-repricing-gap-process-node="trading-book-derivative-gap"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-leaf-group")).toHaveCount(3);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u6536");
  await expect(page.locator("#repricingGapProcessModal")).toContainText("\u4ea4\u6613\u8d26\u7c3f\u8868\u5916\u884d\u751f\u54c1\u5e94\u4ed8");
  await page.locator('[data-repricing-gap-process-node="adjusted-assets"] .eve-process-node__action').click();
  await expect(page.locator("#repricingGapProcessModal .repricing-gap-leaf-group")).toHaveCount(2);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="self-operated-loans"]')).toHaveCount(0);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="term-deposits"]')).toHaveCount(1);
  await expect(page.locator('#repricingGapProcessModal [data-repricing-gap-process-node="trading-book-receivable"]')).toHaveCount(1);
  await expect(page.locator('[data-repricing-gap-process-node="trading-book-derivative-gap"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await expect(page.locator('[data-repricing-gap-process-node="numerator"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u6536\u56de");
  await page.locator('[data-repricing-gap-process-node="numerator"] .eve-process-node__action').click();
  await expect(page.locator('[data-repricing-gap-process-node="numerator"] .eve-process-node__action')).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(page.locator("#repricingGapProcessModal")).not.toContainText("\u8d44\u4ea7\u7aef\u91cd\u5b9a\u4ef7\u89c4\u6a21\uff08\u4e0d\u542b\u5185\u90e8\u4ea4\u6613\uff09");
  await page.locator('[data-repricing-gap-process-node="numerator"] .eve-process-node__action').click();
  await page.locator('[data-repricing-gap-process-node="numerator"] [data-process-sparkline]').click();
  await expect(page.locator("#processSparklinePreview")).toContainText("\u91cd\u5b9a\u4ef7\u7f3a\u53e3");
  await page.locator('#processSparklinePreview button[data-close-process-sparkline="true"]').click();
  await page.keyboard.press("Escape");
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
  const liquidityComparisonSelect = page.locator("#liquidityProcessModal [data-liquidity-process-comparison]");
  await expect(liquidityComparisonSelect).toHaveValue("");
  await expect(liquidityComparisonSelect.locator("option").first()).toContainText("\u4e0a\u4e00\u671f\uff08\u9ed8\u8ba4\uff1a");
  await liquidityComparisonSelect.selectOption("0");
  expect(await page.evaluate(() => appState.liquidityProcessModal.comparisonIndex)).toBe(0);
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u8f83\u57fa\u671f");
  const lcrModel = await page.evaluate(() => buildLiquidityDiagnosticModel({ seq: 42 }, { labels: ["2026-01"], signature: 7, kind: "lcr" }));
  expect(lcrModel.components.hqla[0]).toBe(Number((
    lcrModel.components.level1Assets[0] + lcrModel.components.level2AAssets[0] + lcrModel.components.level2BAssets[0]
  ).toFixed(1)));
  expect(lcrModel.components.rawNetOutflows[0]).toBe(Number((
    lcrModel.components.cashOutflows[0] - lcrModel.components.cashInflows[0]
  ).toFixed(1)));
  expect(lcrModel.components.adjustedNetOutflows[0]).toBe(Math.max(
    lcrModel.components.rawNetOutflows[0],
    lcrModel.components.minimumNetOutflows[0]
  ));
  expect(lcrModel.ratios[0]).toBe(Number(((lcrModel.components.hqla[0] / lcrModel.components.adjustedNetOutflows[0]) * 100).toFixed(1)));
  await expect(page.locator("#liquidityProcessModal")).toContainText("LCR = \u5408\u683c\u4f18\u8d28\u6d41\u52a8\u6027\u8d44\u4ea7HQLA \u00f7 \u7ecf\u8c03\u6574\u540e\u51c0\u73b0\u91d1\u6d41\u51fa");
  await page.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action').click();
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
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u53ef\u7528\u7684\u7a33\u5b9a\u8d44\u91d1");
  await expect(page.locator("#liquidityProcessModal")).toContainText("\u6240\u9700\u7684\u7a33\u5b9a\u8d44\u91d1");
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
    expect(components.maturityGap[0]).toBe(Number((
      components.assetTotal[0] + components.offBalanceIncome[0]
      - components.liabilityTotal[0] - components.offBalanceExpense[0]
    ).toFixed(1)));
    expect(components.cumulativeMaturityGap[0]).toBe(Number((
      components.maturityGap[0] + components.internalTransactionAssets[0] - components.internalTransactionLiabilities[0]
    ).toFixed(1)));
    expect(model.numerator[0]).toBe(Number((
      components.cumulativeMaturityGap[0]
      + components.demandDeposits[0] - components.noteDemandDeposits[0]
      + components.demandPlacements[0] - components.noteDemandPlacements[0]
    ).toFixed(1)));
    expect(model.denominator[0]).toBe(Number((
      components.assetTotal[0] + components.offBalanceIncome[0] - components.internalTransactionAssets[0]
    ).toFixed(1)));
    expect(model.ratios[0]).toBe(Number(((model.numerator[0] / model.denominator[0]) * 100).toFixed(1)));
  }
  await liquidityGapWidget.locator('[data-liquidity-point="true"]').nth(3).dispatchEvent("click");
  await expect(liquidityGapWidget.locator(".eve-point-popover__grid > div")).toHaveCount(2);
  await liquidityGapWidget.locator(".eve-point-popover__action").click();
  const liquidityGapProcessModal = page.locator("#liquidityProcessModal");
  await expect(liquidityGapProcessModal).toContainText("30D\u6d41\u52a8\u6027\u7f3a\u53e3\u7387 = 30D\u7d2f\u8ba1\u6d41\u52a8\u6027\u7f3a\u53e3 \u00f7 30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d44\u4ea7");
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="numerator"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("3.5.2 \u6d3b\u671f\u5b58\u6b3e");
  await expect(liquidityGapProcessModal).toContainText("\u9644\u6ce8\uff1a\u6d3b\u671f\u5b58\u6b3e");
  await expect(liquidityGapProcessModal).toContainText("3.2 \u6d3b\u671f\u5b58\u653e");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="internal-transaction-assets"]')).toHaveCount(0);
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="cumulative-maturity-gap"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("\u7d2f\u8ba1\u5230\u671f\u671f\u9650\u7f3a\u53e3 = \u5230\u671f\u671f\u9650\u7f3a\u53e3 + \u5185\u90e8\u4ea4\u6613\u8d44\u4ea7 - \u5185\u90e8\u4ea4\u6613\u8d1f\u503a");
  await expect(liquidityGapProcessModal.locator('[data-liquidity-process-node="asset-total"]')).toHaveCount(0);
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="maturity-gap"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("\u5230\u671f\u671f\u9650\u7f3a\u53e3 = \u8d44\u4ea7\u603b\u8ba1 + \u8868\u5916\u6536\u5165 - \u8d1f\u503a\u5408\u8ba1 - \u8868\u5916\u652f\u51fa");
  await liquidityGapProcessModal.locator('[data-liquidity-process-node="denominator"] .eve-process-node__action').click();
  await expect(liquidityGapProcessModal).toContainText("30D\u7d2f\u8ba1\u5230\u671f\u8868\u5185\u5916\u8d44\u4ea7 = \u8d44\u4ea7\u603b\u8ba1 + \u8868\u5916\u6536\u5165 - \u5185\u90e8\u4ea4\u6613\u8d44\u4ea7");
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
  await expect(liquidityRatioProcessModal).toContainText("1.1 \u73b0\u91d1");
  await expect(liquidityRatioProcessModal).toContainText("1.9 \u5176\u4ed6\u4e00\u4e2a\u6708\u5185\u5230\u671f\u53ef\u53d8\u73b0\u7684\u8d44\u4ea7");
  await expect(liquidityAssetNodeAction).toContainText("\u70b9\u51fb\u6536\u56de");
  await liquidityAssetNodeAction.click();
  await expect(liquidityAssetNodeAction).toContainText("\u70b9\u51fb\u5c55\u5f00");
  await expect(liquidityRatioProcessModal.locator('[data-liquidity-process-node="liquidity-cash"]')).toHaveCount(0);
  const liquidityLiabilityNodeAction = liquidityRatioProcessModal.locator('[data-liquidity-process-node="denominator"] .eve-process-node__action');
  await liquidityLiabilityNodeAction.click();
  await expect(liquidityRatioProcessModal).toContainText("\u6d3b\u671f\u5b58\u6b3e");
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

test("\u4e1a\u52a1\u53d8\u52a8\u5206\u6790\u5173\u952e\u6807\u9898\u5b8c\u6574", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
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
  for (const title of TEXT.businessChangeTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.locator('[data-open-business-methodology="true"]')).toHaveCount(8);
  await expect(page.locator('[data-widget-seq="79"] [data-open-business-methodology]')).toHaveCount(0);
  await expect(page.locator('[data-widget-seq="80"] [data-open-business-methodology]')).toHaveCount(0);

  const methodologyModal = page.locator("#businessMethodologyModal");
  await page.locator('[data-widget-seq="83"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("\u6708\u5ea6\u65b0\u53d1\u751f\u4e1a\u52a1\u8ba1\u7b97\u903b\u8f91");
  await expect(methodologyModal).toContainText("\u672c\u6708\u672b\u4e0e\u4e0a\u6708\u672b");
  await expect(methodologyModal).not.toContainText("\u8fde\u7eed\u4e24\u5929");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="85"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("\u65b0\u53d1\u751f\u4e1a\u52a1\u65e5\u5ea6\u6c47\u603b\u8ba1\u7b97\u903b\u8f91");
  await expect(methodologyModal).toContainText("\u8fde\u7eed\u4e24\u5929");
  await expect(methodologyModal).toContainText("\u6bcf\u65e5\u65b0\u53d1\u751f\u4e1a\u52a1\u8fdb\u884c\u6c47\u603b");
  await expect(methodologyModal).not.toContainText("\u672c\u6708\u672b\u4e0e\u4e0a\u6708\u672b");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="90"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("\u6708\u5ea6\u5230\u671f\u4e1a\u52a1\u8ba1\u7b97\u903b\u8f91");
  await expect(methodologyModal).toContainText("\u4f59\u989d\u51cf\u5c11\u7684\u90e8\u5206");
  await methodologyModal.getByRole("button", { name: "\u5173\u95ed", exact: true }).click();

  await page.locator('[data-widget-seq="97"] [data-open-business-methodology]').click();
  await expect(methodologyModal).toContainText("\u5230\u671f\u4e1a\u52a1\u65e5\u5ea6\u6c47\u603b\u8ba1\u7b97\u903b\u8f91");
  await expect(methodologyModal).toContainText("\u6bcf\u65e5\u5230\u671f\u4e1a\u52a1\u8fdb\u884c\u6c47\u603b");
  await page.keyboard.press("Escape");
  await expect(methodologyModal).toHaveAttribute("aria-hidden", "true");
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
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5e01\u79cd", "\u65b0\u53d1\u751f\u91d1\u989d", "\u5229\u7387", "\u539f\u59cb\u671f\u9650",
  ]);
  expect(liquidityDetailHeaders["97"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u5230\u671f\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5e01\u79cd", "\u5230\u671f\u91d1\u989d", "\u5229\u7387", "\u5269\u4f59\u671f\u9650",
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
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u8d77\u59cb\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u65b0\u53d1\u751f\u91d1\u989d", "\u5229\u7387", "\u5229\u7387\u7c7b\u578b", "\u5229\u7387\u57fa\u51c6", "\u5229\u5dee",
    "\u539f\u59cb\u671f\u9650", "\u91cd\u5b9a\u4ef7\u5468\u671f", "\u4e0b\u4e00\u91cd\u5b9a\u4ef7\u65e5", "\u91cd\u5b9a\u4ef7\u4e45\u671f",
  ]);
  expect(businessDetailHeaders["97"]).toEqual([
    "\u4e1a\u52a1\u7f16\u53f7", "\u5ba2\u6237", "\u5230\u671f\u65e5", "\u5408\u540c\u5230\u671f\u65e5", "\u5230\u671f\u91d1\u989d", "\u5230\u671f\u524d\u5229\u7387", "\u5229\u7387\u7c7b\u578b", "\u5229\u7387\u57fa\u51c6", "\u5229\u5dee",
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

test("\u673a\u6784\u591a\u9009\u540e\u77e9\u9635\u8868\u6309\u673a\u6784\u5206\u7ec4\u5c55\u793a", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[2], exact: true }).click();
  await page.evaluate(() => {
    const businessPage = data.pages.find((item) => item.name === "业务变动分析") || getCurrentPage();
    appState.pageFilters[businessPage.id] = {
      ...(appState.pageFilters[businessPage.id] || {}),
      机构: ["法人汇总", "境内汇总"],
    };
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
  await expect(simulationModal.locator("[data-repricing-base-upload]").locator("..")).toContainText("\u4e0a\u4f20\u7f3a\u53e3\u8868");
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

  const targetDateInput = simulationModal.locator('[data-repricing-base-date]');
  await targetDateInput.fill("2026-08-31");
  await targetDateInput.blur();
  await expect(simulationModal).toContainText("\u57fa\u51c6\u7f3a\u53e3\u7387");
  const repricingBaseOptions = simulationModal.locator("[data-repricing-quick-config]");
  await expect(repricingBaseOptions).toHaveCount(2);
  await expect(repricingBaseOptions).toHaveText([
    "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c",
    "\u81ea\u4e3b\u7f16\u5236",
  ]);
  await expect(simulationModal.getByRole("button", { name: "\u5f53\u524d\u7f3a\u53e3\u8868\u5e73\u79fb", exact: true })).toHaveCount(0);
  await simulationModal.getByRole("button", { name: "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c", exact: true }).click();
  await expect(simulationModal.getByRole("button", { name: "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c", exact: true })).toHaveClass(/is-active/);
  await expect(simulationModal).toContainText("\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c");
  await simulationModal.getByRole("button", { name: "\u81ea\u4e3b\u7f16\u5236", exact: true }).click();
  await expect(simulationModal.getByRole("button", { name: "\u81ea\u4e3b\u7f16\u5236", exact: true })).toHaveClass(/is-active/);
  await expect(simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] [data-repricing-base-cell]').first()).toHaveValue("0");

  const firstBaseCell = simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] [data-repricing-base-cell]').first();
  await firstBaseCell.fill("88.8");
  await firstBaseCell.blur();
  await expect(simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] [data-repricing-base-cell]').first()).toHaveValue("88.8");
  const csvHeader = ["\u4e1a\u52a1\u7c7b\u522b", "\u6c47\u603b", "\u9694\u591c", "\u9694\u591c~1\u4e2a\u6708", ...Array.from({ length: 11 }, (_, index) => `${index + 1}~${index + 2}\u4e2a\u6708`)];
  const csvValues = ["\u81ea\u8425\u8d37\u6b3e", "91", ...Array.from({ length: 13 }, (_, index) => String(index + 1))];
  await simulationModal.locator('[data-repricing-base-upload]').setInputFiles({
    name: "repricing-gap.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`${csvHeader.join(",")}\n${csvValues.join(",")}`, "utf8"),
  });
  await expect(simulationModal).toContainText("repricing-gap.csv");
  await expect(simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] [data-repricing-base-cell]').first()).toHaveValue("1");
  await simulationModal.getByRole("button", { name: "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c", exact: true }).click();

  await expect(simulationModal.locator('[data-repricing-simulation-entry]')).toHaveCount(1);
  await expect(simulationModal.getByText("\u53d1\u751f\u65f6\u95f4", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u4e1a\u52a1\u7c7b\u578b", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u89c4\u6a21\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u91cd\u5b9a\u4ef7\u9891\u7387", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u4e0b\u6b21\u91cd\u5b9a\u4ef7\u65f6\u95f4", { exact: true })).toBeVisible();
  const scaleField = simulationModal.locator('[data-repricing-simulation-field="scale"]');
  await scaleField.fill("-25.5");
  await expect(scaleField).toHaveValue("-25.5");
  await simulationModal.locator('[data-repricing-simulation-field="occurrenceDate"]').fill("2026-08-20");
  await simulationModal.locator('[data-repricing-simulation-field="repricingMonths"]').selectOption("3");
  await simulationModal.locator('[data-repricing-simulation-field="nextRepricingDate"]').fill("2026-11-20");
  await simulationModal.locator('[data-repricing-simulation-field="scale"]').fill("100");
  await simulationModal.locator('[data-repricing-simulation-field="scale"]').blur();
  await expect(simulationModal.locator('[data-repricing-simulation-entry="0"]')).not.toContainText("\u8ba1\u5165");
  const baseBucketValue = Number(await simulationModal.locator('[data-repricing-base-row="\u81ea\u8425\u8d37\u6b3e"] [data-repricing-base-cell]').nth(3).inputValue());
  const resultBucketValue = Number(await simulationModal.locator('[data-repricing-result-row="\u81ea\u8425\u8d37\u6b3e"] td').nth(4).textContent());
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
  await expect(repricingGapWidget.locator(".simulation-summary--widget")).toContainText("\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c");
  await expect(repricingGapWidget.locator(".simulation-summary--widget")).toContainText("\u89c4\u6a21\u51c0\u989d\uff1a100\u4ebf\u5143");
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
  const liquidityBaseOptions = simulationModal.locator("[data-liquidity-gap-quick-config]");
  await expect(liquidityBaseOptions).toHaveCount(2);
  await expect(liquidityBaseOptions).toHaveText([
    "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c",
    "\u81ea\u4e3b\u7f16\u5236",
  ]);
  await expect(simulationModal.getByRole("button", { name: "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c", exact: true })).toHaveClass(/is-active/);
  await expect(simulationModal.getByRole("button", { name: "\u5f53\u524d\u73b0\u91d1\u6d41\u7f3a\u53e3\u8868", exact: true })).toHaveCount(0);
  await simulationModal.getByRole("button", { name: "\u81ea\u4e3b\u7f16\u5236", exact: true }).click();
  await expect(simulationModal.getByRole("button", { name: "\u81ea\u4e3b\u7f16\u5236", exact: true })).toHaveClass(/is-active/);
  await simulationModal.getByRole("button", { name: "\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c", exact: true }).click();
  await expect(simulationModal.locator("[data-liquidity-gap-base-upload]").locator("..")).toContainText("\u4e0a\u4f20\u7f3a\u53e3\u8868");
  await expect(simulationModal).not.toContainText("\u4e0a\u4f20\u73b0\u91d1\u6d41\u7f3a\u53e3\u8868");
  await expect(liquidityBaselineTable.locator("thead th")).toHaveText([
    "\u4e1a\u52a1\u7c7b\u522b",
    ...TEXT.liquidityCashFlowBuckets,
  ]);
  await expect(liquidityBaselineTable.locator("tbody tr")).toHaveCount(TEXT.liquidityBusinessTableCategories.length);
  await expect(liquidityBaselineTable.locator('[data-liquidity-gap-base-total="\u8d44\u4ea7"]')).toContainText("\u8d44\u4ea7\u5408\u8ba1");
  await expect(liquidityBaselineTable.locator('[data-liquidity-gap-base-total="\u8d1f\u503a"]')).toContainText("\u8d1f\u503a\u5408\u8ba1");
  await expect(simulationModal.locator('[data-liquidity-gap-simulation-field="businessType"] option')).toHaveCount(TEXT.liquidityBusinessTypes.length);
  await expect(simulationModal.getByText("\u53d1\u751f\u65f6\u95f4", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u4e1a\u52a1\u7c7b\u578b", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u89c4\u6a21\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u7b2c\u4e00\u7b14\u73b0\u91d1\u6d41\u65e5\u671f", { exact: true })).toBeVisible();
  await expect(simulationModal.getByText("\u7b2c\u4e00\u7b14\u73b0\u91d1\u6d41\u91d1\u989d\uff08\u4ebf\u5143\uff09", { exact: true })).toBeVisible();
  await expect(simulationModal.locator('[data-liquidity-gap-simulation-entry="0"] [data-liquidity-cash-flow-row]')).toHaveCount(1);
  await simulationModal.getByRole("button", { name: "\u589e\u52a0\u73b0\u91d1\u6d41", exact: true }).click();
  await expect(simulationModal.locator('[data-liquidity-gap-simulation-entry="0"] [data-liquidity-cash-flow-row]')).toHaveCount(2);
  const liquidityBaseDate = await simulationModal.locator("[data-liquidity-gap-base-date]").inputValue();
  const secondCashFlowDate = await page.evaluate((date) => addDays(date, 10), liquidityBaseDate);
  await simulationModal.locator('[data-liquidity-gap-entry-index="0"][data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="date"]').fill(secondCashFlowDate);
  await simulationModal.locator('[data-liquidity-gap-entry-index="0"][data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="amount"]').fill("25");
  await simulationModal.locator('[data-liquidity-gap-entry-index="0"][data-liquidity-cash-flow-index="1"][data-liquidity-cash-flow-field="amount"]').blur();
  const liquidityBaseBucketValue = Number(await liquidityBaselineTable.locator('[data-liquidity-gap-base-row="\u5404\u9879\u8d37\u6b3e"] [data-liquidity-gap-base-cell]').nth(2).inputValue());
  const liquidityResultBucketValue = Number(await simulationModal.locator('[data-liquidity-gap-result-row="\u5404\u9879\u8d37\u6b3e"] td').nth(2).textContent());
  expect(Number((liquidityResultBucketValue - liquidityBaseBucketValue).toFixed(1))).toBe(25);
  await expect(simulationModal.getByRole("heading", { name: "\u6d4b\u7b97\u540e\u73b0\u91d1\u6d41\u7f3a\u53e3\u8868", exact: true })).toBeVisible();
  await simulationModal.getByRole("button", { name: "\u5e94\u7528\u6d4b\u7b97", exact: true }).click();
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u5b58\u91cf\u5230\u671f\u4e0d\u7eed\u4f5c");
  await expect(liquidityGapWidget.locator(".simulation-summary--widget")).toContainText("\u73b0\u91d1\u6d41\uff1a2\u7b14");
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
  await expect(bondDurationWidget.locator(".chart-legend--limits .chart-legend__item--limit")).toHaveCount(2);
  await expect(bondDurationWidget).toContainText("香港 / 外币折美元 限额 <=4年");
  await expect(bondDurationWidget).toContainText("香港 / 人民币 限额 <=4年");

  await setPageFilters(page, "利率风险", { 机构: ["香港分行"], 币种: ["港币", "美元"] });
  await expect(repricingGapWidget.locator(".chart-legend--limits .chart-legend__item--limit")).toHaveCount(2);
  await expect(repricingGapWidget).toContainText("香港 / 港币 限额 <=50%");
  await expect(repricingGapWidget).toContainText("香港 / 美元 限额 <=16%");
  await expect(repricingDurationGapWidget.locator(".chart-legend--limits")).toHaveCount(0);
  await expect(repricingDurationGapWidget.locator("svg line[stroke-dasharray]")).toHaveCount(0);

  await setPageFilters(page, "利率风险", { 机构: ["香港分行", "纽约分行"], 币种: ["外币折美元"] });
  await expect(bondDurationWidget).not.toContainText("限额");

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
