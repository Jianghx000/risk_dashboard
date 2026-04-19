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
    "\u6c47\u7387\u98ce\u9669",
    "\u4e1a\u52a1\u53d8\u52a8\u5206\u6790",
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
  for (const title of TEXT.pages) {
    await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
  }
});

test("\u4e1a\u52a1\u53d8\u52a8\u5206\u6790\u5173\u952e\u6807\u9898\u5b8c\u6574", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[3], exact: true }).click();
  for (const title of TEXT.businessChangeTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
});

test("\u6a21\u62df\u6d4b\u7b97\u548cAI\u5f39\u7a97\u53ef\u4ee5\u6253\u5f00", async ({ page }) => {
  await openPage(page);
  await page.getByRole("button", { name: TEXT.pages[1], exact: true }).click();
  await page.getByRole("button", { name: TEXT.simulationButton, exact: true }).click();
  await expect(page.getByRole("heading", { name: TEXT.liquidityRiskSimulationTitle, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: TEXT.liquidityRiskSimulationTitle, exact: true })).toHaveCount(0);

  await page.locator("[data-open-insight]").first().click();
  await expect(page.getByText(TEXT.aiEyebrow, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: TEXT.aiConclusion, exact: true })).toBeVisible();
});
