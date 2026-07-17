function addDays(dateValue, offsetDays) {
  const baseDate = parseDateValue(dateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
  return formatDateValue(nextDate);
}

function addMonthsDateValue(dateValue, offsetMonths) {
  const baseDate = parseDateValue(dateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + offsetMonths, baseDate.getDate());
  return formatDateValue(nextDate);
}

function addClampedMonthsDateValue(dateValue, offsetMonths) {
  const baseDate = parseDateValue(dateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const targetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + offsetMonths, 1);
  const targetMonthLastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return formatDateValue(new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(baseDate.getDate(), targetMonthLastDay)
  ));
}

function formatDateValue(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function uniqueList(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function cartesianProduct(arrays) {
  if (!arrays.length) return [];
  return arrays.reduce(
    (acc, values) => acc.flatMap((item) => values.map((value) => [...item, value])),
    [[]]
  );
}

function normalizeFilterName(filterLabel) {
  return String(filterLabel || "")
    .replace(/（.*?）/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function formatFilterDisplayLabel(filterLabel) {
  return String(filterLabel || "")
    .replace(/（多选）/g, "")
    .replace(/\(多选\)/g, "")
    .trim();
}

function buildFilterKey(ownerType, ownerId, filterName) {
  return `${ownerType}|${ownerId}|${filterName}`;
}

function parseOpenFilterKey(openFilterKey) {
  const [ownerType, ownerId, ...rest] = String(openFilterKey || "").split("|");
  return { ownerType, ownerId, filterName: rest.join("|") };
}

function getFilterPopoverPosition(rect) {
  const width = Math.max(Math.round(rect.width), 280);
  const maxLeft = window.innerWidth - width - 16;
  const left = Math.min(Math.max(16, Math.round(rect.left)), Math.max(16, maxLeft));
  const estimatedHeight = 420;
  const openAbove = rect.bottom + estimatedHeight > window.innerHeight - 20 && rect.top > estimatedHeight;
  const maxTop = Math.max(16, window.innerHeight - estimatedHeight - 16);
  const top = openAbove
    ? Math.max(16, Math.round(rect.top - estimatedHeight - 10))
    : Math.min(maxTop, Math.max(16, Math.round(rect.bottom + 10)));
  return { top, left, width };
}

function formatDisplayTitle(text) {
  return String(text || "")
    .replace(/走势/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return `rgba(74,143,216,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildAxisTicks(maxValue, segmentCount = 4) {
  return Array.from({ length: segmentCount + 1 }, (_, index) => Number(((maxValue / segmentCount) * index).toFixed(1)));
}

function formatAxisTickValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function createFrame(count) {
  return {
    left: 76,
    right: 662,
    top: 28,
    bottom: 240,
    width: 586,
    height: 212,
    count,
  };
}

function createWideFrame(count) {
  return {
    left: 76,
    right: 1024,
    top: 28,
    bottom: 240,
    width: 948,
    height: 212,
    count,
  };
}

function getFrameXPosition(frame, index, count) {
  const step = count <= 1 ? 0 : frame.width / (count - 1);
  return Number((frame.left + step * index).toFixed(1));
}

function getFrameMinStep(frame, count) {
  return count <= 1 ? frame.width : frame.width / Math.max(1, count - 1);
}

function summarizeFilterSelection(filterName, selectedValues) {
  const values = (selectedValues || []).filter(Boolean);
  if (!values.length) return `请选择${filterName}`;
  if (values.length <= 2) return values.join("、");
  return `${values.slice(0, 2).join("、")}等${values.length}项`;
}

function callMockAdapter(method, ...args) {
  if (typeof mockAdapter[method] !== "function") {
    throw new Error(`dashboardMockAdapter.${method} is required before app.js loads.`);
  }
  return mockAdapter[method](...args);
}

function buildMetricValues(seed, count, modifier) {
  return callMockAdapter("buildMetricValues", seed, count, modifier);
}

function buildBarValues(seed, count, modifier) {
  return callMockAdapter("buildBarValues", seed, count, modifier);
}

function formatMetricValue(value, yLabel) {
  if (yLabel.includes("%")) return `${Number(value).toFixed(1)}%`;
  if (yLabel.includes("亿元")) return Number(value).toFixed(1);
  return Number(value).toFixed(1);
}

function buildTableRow(label, seed, index, modifier) {
  return callMockAdapter("buildTableRow", label, seed, index, modifier);
}

function createSignature(seq, filterState) {
  const merged = Object.keys(filterState)
    .sort()
    .map((key) => `${key}:${(filterState[key] || []).join("|")}`)
    .join(";");
  return [...`${seq}-${merged}`].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}
