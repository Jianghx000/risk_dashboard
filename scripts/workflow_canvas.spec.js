const { test, expect } = require("@playwright/test");

const BASE = process.env.WORKFLOW_URL || "http://127.0.0.1:9028";

/** 画布是否被横向截断。回归：加过两侧栏折叠后，调节点宽度/间距很容易把截断带回来。 */
async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector(".board-wrap");
    const board = document.getElementById("platformBoard");
    return board.scrollWidth - wrap.clientWidth;
  });
}

/** 画布右边缘能否滚到——展开侧栏后允许滚动，但绝不能是"看不到"（被裁掉）。 */
async function canReachRightEdge(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector(".board-wrap");
    const board = document.getElementById("platformBoard");
    if (board.scrollWidth <= wrap.clientWidth) return true;
    wrap.scrollLeft = wrap.scrollWidth;
    return Math.abs(wrap.scrollLeft + wrap.clientWidth - wrap.scrollWidth) <= 2;
  });
}

async function isVisible(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return Boolean(el) && getComputedStyle(el).display !== "none";
  }, selector);
}

function boxesOverlap(a, b, slack = 1) {
  return a.left < b.right - slack && a.right > b.left + slack && a.top < b.bottom - slack && a.bottom > b.top + slack;
}

async function nodeBoxes(page) {
  return page.locator(".graph-node").evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        id: node.dataset.node,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        overflow: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1,
        text: node.innerText,
        font: style.fontSize,
      };
    })
  );
}

async function assertNoOverlap(page) {
  const boxes = await nodeBoxes(page);
  expect(boxes.length).toBeGreaterThan(5);
  for (const box of boxes) expect(box.overflow, box.id).toBeFalsy();
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(boxesOverlap(boxes[i], boxes[j]), `${boxes[i].id} overlaps ${boxes[j].id}`).toBeFalsy();
    }
  }
}

test.describe("repricing gap workflow canvas", () => {
  test("replica canvas stays readable on desktop and mobile", async ({ page }) => {
    await page.goto(`${BASE}/workflow`);
    await expect(page.getByRole("heading", { name: "行内复刻图" })).toBeVisible();
    await expect(page.getByRole("button", { name: "实际执行图" })).toHaveCount(0);
    await expect(page.locator("#platformBoard .graph-node")).toHaveCount(10);
    await expect(page.locator("#platformBoard").getByText("追问再触发")).toBeVisible();
    await expect(page.locator('#platformBoard [data-node="start"]')).toContainText("追问入口");
    await assertNoOverlap(page);
    await page.locator('#platformBoard [data-node="start"]').click();
    await expect(page.getByRole("heading", { name: "职责" })).toBeVisible();
    await expect(page.getByText("按顺序添加节点")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#platformBoard .graph-node")).toHaveCount(10);
    await assertNoOverlap(page);
  });

  test("sidebars collapse so the whole replica fits without sideways scrolling", async ({ page }) => {
    // 1680 是常见笔记本宽度；画板约 1616px，任何一栏展开都装不下。
    await page.setViewportSize({ width: 1680, height: 1050 });
    await page.goto(`${BASE}/workflow`);
    await expect(page.locator("#platformBoard .graph-node")).toHaveCount(10);

    // 默认两栏都折叠 → 整张图完整可见，无需滚动
    expect(await isVisible(page, ".left")).toBe(false);
    expect(await isVisible(page, ".right")).toBe(false);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await canReachRightEdge(page)).toBe(true);

    // 点节点自动展开详情栏，"点一下没反应"是不合格的
    await page.locator('#platformBoard [data-node="prompt"]').click();
    await expect(page.getByRole("heading", { name: "职责" })).toBeVisible();
    expect(await isVisible(page, ".right")).toBe(true);

    // 展开详情栏后画布变窄，允许横向滚动，但右边缘必须滚得到（不能被裁掉）
    expect(await canReachRightEdge(page)).toBe(true);

    // 折叠状态跨刷新保持
    await page.reload();
    await expect(page.getByRole("heading", { name: "职责" })).toBeVisible();
    expect(await isVisible(page, ".right")).toBe(true);
    expect(await isVisible(page, ".left")).toBe(false); // 左栏从未打开，仍是收起的

    // 手动收起右栏即回到完整视图（左栏本来就收起）
    await page.locator("#toggleRight").click();
    expect(await isVisible(page, ".left")).toBe(false);
    expect(await isVisible(page, ".right")).toBe(false);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await canReachRightEdge(page)).toBe(true);

    // 展开左栏后仍可滚到右边缘（不允许"被裁掉"）
    await page.locator("#toggleLeft").click();
    expect(await isVisible(page, ".left")).toBe(true);
    expect(await canReachRightEdge(page)).toBe(true);
  });
});
