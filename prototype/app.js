const data = window.dashboardData;
const config = window.dashboardConfig || {};
const mockAdapter = window.dashboardMockAdapter || {};
const FILTER_OPTIONS = config.filters?.options || config.filterOptions || {};
const AREA_FILTER_OPTION_OVERRIDES = config.filters?.areaOverrides || {};
const DEFAULT_FILTER_VALUES = config.filters?.defaults || config.defaultFilters || {};
const AREA_TAB_CONFIG = config.tabs || config.areaSubpages || {};
const WIDGET_FILTER_CONFIG = config.widgetFilters || {};
const SERIES_RULES = config.seriesRules || config.widgetRules || [];
const BUSINESS_DURATION_OPTIONS = ["自营贷款", "债券投资", "同业资产", "存放央行", "内部交易资产", "活期存款", "定期存款", "同业负债", "发行债券", "表外衍生品应付"];
const SIMULATION_COLOR = "#2F6FA3";
const SIMULATION_FILL = "rgba(47, 111, 163, 0.16)";
const RATE_TYPE_OPTIONS = ["固定利率", "浮动利率"];
const REPRICING_FREQUENCY_OPTIONS = [
  { label: "按月重定价", value: "1" },
  { label: "按季重定价", value: "3" },
  { label: "按半年重定价", value: "6" },
  { label: "按年重定价", value: "12" },
  { label: "到期一次性重定价", value: "24" },
];
const BUSINESS_SIDE_MAP = {
  自营贷款: "asset",
  债券投资: "asset",
  同业资产: "asset",
  存放央行: "asset",
  内部交易资产: "asset",
  活期存款: "liability",
  定期存款: "liability",
  同业负债: "liability",
  发行债券: "liability",
  表外衍生品应付: "liability",
};
const SERIES_PALETTE = ["#BC6F51", "#5F8F84", "#D09147", "#9F8CAE", "#C87963", "#7EA998", "#6F3929", "#D8C0AA"];

const appState = {
  currentPageId: data.pages[0]?.id || null,
  activeBlockId: null,
  areaFilters: {},
  areaSubpages: {},
  widgetFilters: {},
  widgetDisplayModes: {},
  openFilterKey: null,
  globalStartDate: null,
  globalEndDate: null,
  pageSimulations: {},
  simulationModalPageId: null,
  simulationDraft: null,
  insightWidgetSeq: null,
};

const pageTabsEl = document.getElementById("pageTabs");
const dashboardViewEl = document.getElementById("dashboardView");
const blockPillsEl = document.getElementById("blockPills");
const filterPopoverEl = document.getElementById("filterModal");
const globalStartInputEl = document.getElementById("globalStartDate");
const globalEndInputEl = document.getElementById("globalEndDate");
const simulationModalEl = ensureOverlayRoot("simulationModal");
const insightModalEl = ensureOverlayRoot("insightModal");
let activeBlockSyncQueued = false;

function render() {
  ensureGlobalDateRange();
  renderGlobalDateRangeControl();
  renderPageTabs();
  renderCurrentPage();
  renderFilterPopover();
  renderSimulationModal();
  renderInsightModal();
  refreshBlockPillState();
  queueActiveBlockSync();
}

function ensureOverlayRoot(id) {
  let node = document.getElementById(id);
  if (node) return node;
  node = document.createElement("div");
  node.id = id;
  node.className = "overlay-root";
  node.setAttribute("aria-hidden", "true");
  document.body.appendChild(node);
  return node;
}

function isSimulationPage(page = getCurrentPage()) {
  const pageName = String(page?.name || "");
  return pageName.includes("利率") || pageName.includes("流动性") || pageName.includes("汇率");
}

function renderPageTabs() {
  pageTabsEl.innerHTML = data.pages
    .map(
      (page) => `
        <button class="page-tab ${page.id === appState.currentPageId ? "is-active" : ""}" data-page-id="${page.id}" type="button">
          ${page.name}
        </button>
      `
    )
    .join("");
}

function renderCurrentPage() {
  const page = getCurrentPage();
  if (!page) return;

  if (!appState.activeBlockId || !page.blocks.find((block) => block.id === appState.activeBlockId)) {
    appState.activeBlockId = page.blocks[0]?.id || null;
  }

  const simulationButton = isSimulationPage(page)
    ? `<button class="toolbar-action toolbar-action--primary" type="button" data-open-simulation="${page.id}">模拟测算</button>`
    : "";
  blockPillsEl.innerHTML = `
    <div class="block-pills__list">
      ${page.blocks
        .map(
          (block) => `
            <button class="block-pill ${block.id === appState.activeBlockId ? "is-active" : ""}" data-block-id="${block.id}" type="button">
              ${block.name}
            </button>
          `
        )
        .join("")}
    </div>
    ${simulationButton}
  `;

  dashboardViewEl.innerHTML = page.blocks.map((block) => renderBlockSection(block)).join("");
}

function renderBlockSection(block) {
  const groupedAreas = groupBlockAreas(block);
  const areaLayoutClass = shouldRenderAreasInPairs(block, groupedAreas) ? " block-section__areas--paired" : "";
  const simulationSummary = renderSimulationSummary();
  return `
    <section class="block-section" id="${block.id}">
      <div class="block-section__header">
        <div class="block-section__title-wrap">
          <h2 class="block-section__title">${formatDisplayTitle(block.name)}</h2>
        </div>
      </div>
      ${simulationSummary}
      <div class="block-section__body">
        <div class="block-section__rail" aria-hidden="true"></div>
        <div class="block-section__areas${areaLayoutClass}">
          ${groupedAreas.map((areaGroup) => renderAreaCard(areaGroup, block)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderAreaCard(areaGroup, block) {
  const areaState = ensureAreaFilterState(areaGroup);
  const areaSubpage = ensureAreaSubpageState(areaGroup);
  const filterGroups = areaGroup.sharedFilters
    .map((filter) =>
      renderFilterGroup(
        "area",
        areaGroup.id,
        filter,
        areaState[normalizeFilterName(filter)] || [],
        getAreaFilterOptions(areaGroup, filter)
      )
    )
    .join("");
  const tabMarkup = areaSubpage.tabs.length
    ? `
      <div class="area-subtabs">
        ${areaSubpage.tabs
          .map(
            (tab) => `
              <button
                class="area-subtab ${tab === areaSubpage.activeTab ? "is-active" : ""}"
                type="button"
                data-area-subtab="${areaGroup.id}"
                data-tab-name="${tab}"
              >
                ${tab}
              </button>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const visibleViewGroups = getVisibleAreaViewGroups(areaGroup, areaSubpage);

  return `
    <article class="area-card">
      <div class="area-card__header">
        <div class="area-card__title-wrap">
          <h3 class="area-card__title">${formatDisplayTitle(areaGroup.name)}</h3>
        </div>
      </div>
      <div class="filter-panel">
        ${filterGroups || `<div class="filter-group"><div class="filter-group__label">无共享筛选项（固定口径）</div></div>`}
      </div>
      ${tabMarkup}
      <div class="area-view-groups">
        ${visibleViewGroups.map((viewGroup) => renderAreaViewGroup(areaGroup, viewGroup, areaState)).join("")}
      </div>
    </article>
  `;
}

function renderAreaViewGroup(areaGroup, viewGroup, areaState) {
  return `
    <section class="area-view-group">
      <div class="widgets-grid">
        ${viewGroup.widgets.map((widget) => renderWidgetCard(areaGroup, widget, areaState)).join("")}
      </div>
    </section>
  `;
}

function getAreaFilterOptions(areaGroup, filterLabel) {
  const filterName = normalizeFilterName(filterLabel);
  const areaOverrides = AREA_FILTER_OPTION_OVERRIDES[areaGroup.name] || {};
  return areaOverrides[filterName] || FILTER_OPTIONS[filterName] || ["默认口径"];
}

function renderFilterGroup(ownerType, ownerId, filterLabel, selectedValues, optionValues = null) {
  const name = normalizeFilterName(filterLabel);
  const openKey = buildFilterKey(ownerType, ownerId, name);
  const isOpen = appState.openFilterKey === openKey;
  const serializedOptions = (optionValues || FILTER_OPTIONS[name] || ["默认口径"]).join("||");
  return `
    <div class="filter-group filter-group--dropdown ${isOpen ? "is-open" : ""}">
      <div class="filter-group__row">
        <div class="filter-group__label">${filterLabel}</div>
        <button
          class="filter-select"
          type="button"
          data-filter-toggle="true"
          data-filter-anchor="${openKey}"
          data-owner-type="${ownerType}"
          data-owner-id="${ownerId}"
          data-filter-name="${name}"
          data-filter-options="${serializedOptions}"
          aria-expanded="${isOpen}"
        >
          <span class="filter-select__value">${summarizeFilterSelection(name, selectedValues)}</span>
          <span class="filter-select__arrow" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function renderFilterPopover() {
  if (!appState.openFilterKey) {
    filterPopoverEl.classList.remove("is-open");
    filterPopoverEl.setAttribute("aria-hidden", "true");
    filterPopoverEl.innerHTML = "";
    return;
  }

  const { ownerType, ownerId, filterName } = parseOpenFilterKey(appState.openFilterKey);
  const anchorEl = document.querySelector(`[data-filter-anchor="${appState.openFilterKey}"]`);
  if (!anchorEl) {
    appState.openFilterKey = null;
    render();
    return;
  }

  const position = getFilterPopoverPosition(anchorEl.getBoundingClientRect());
  const options = anchorEl.dataset.filterOptions
    ? anchorEl.dataset.filterOptions.split("||").filter(Boolean)
    : FILTER_OPTIONS[filterName] || ["默认口径"];
  const selectedValues = getFilterStateBucket(ownerType, ownerId)?.[filterName] || [];

  filterPopoverEl.innerHTML = `
    <div class="filter-popover__scrim" data-filter-modal-close="true"></div>
    <section
      class="filter-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby="filterPopoverTitle"
      style="top:${position.top}px; left:${position.left}px; width:${position.width}px;"
    >
      <div class="filter-popover__header">
        <div>
          <div class="filter-popover__eyebrow">筛选项</div>
          <h3 id="filterPopoverTitle">${filterName}</h3>
        </div>
        <button class="filter-popover__close" type="button" data-filter-modal-close="true">关闭</button>
      </div>
      <div class="filter-popover__summary">已选：${summarizeFilterSelection(filterName, selectedValues)}</div>
      <div class="filter-popover__options">
        ${options
          .map(
            (option) => `
              <button
                class="filter-option ${selectedValues.includes(option) ? "is-selected" : ""}"
                type="button"
                data-owner-type="${ownerType}"
                data-owner-id="${ownerId}"
                data-filter-name="${filterName}"
                data-filter-value="${option}"
                data-filter-option="true"
              >
                <span class="filter-option__check">${selectedValues.includes(option) ? "✓" : ""}</span>
                <span class="filter-option__text">${option}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;

  filterPopoverEl.classList.add("is-open");
  filterPopoverEl.setAttribute("aria-hidden", "false");
}

function renderWidgetCard(areaGroup, widget, areaState) {
  const widgetBehavior = getWidgetBehavior(widget);
  const widgetState = ensureWidgetFilterState(widget, widgetBehavior);
  const chartContext = buildChartContext(widget, areaState, widgetState);
  const displayMode = ensureWidgetDisplayMode(widget);
  const widgetLocalFilters = renderWidgetLocalFilters(widgetBehavior, widgetState, widget.seq);
  const widgetCardClass = shouldSpanFullWidth(widget) ? " widget-card--full" : "";
  const shouldHideHeaderTitle = isFundingFlowScaleWidget(widget);
  const insightButton = `<button class="widget-action widget-action--ai" type="button" data-open-insight="${widget.seq}">AI</button>`;
  const modeSwitch = supportsDisplayToggle(widget)
    ? `
      <div class="widget-display-switch" role="tablist" aria-label="图表显示方式">
        <button class="widget-display-switch__btn ${displayMode === "chart" ? "is-active" : ""}" type="button" data-widget-mode="${widget.seq}" data-mode="chart">图表</button>
        <button class="widget-display-switch__btn ${displayMode === "data" ? "is-active" : ""}" type="button" data-widget-mode="${widget.seq}" data-mode="data">数据</button>
      </div>
    `
    : "";
  return `
    <article class="widget-card${widgetCardClass}" data-widget-seq="${widget.seq}">
      <div class="widget-card__header widget-card__header--clean${shouldHideHeaderTitle ? " widget-card__header--actions-only" : ""}">
        ${shouldHideHeaderTitle ? "" : `<h4 class="widget-card__title">${formatDisplayTitle(widget.title)}</h4>`}
        <div class="widget-card__actions">
          ${insightButton}
          ${modeSwitch}
        </div>
      </div>
      ${widgetLocalFilters}
      <div class="chart-stage">${renderWidgetStage(widget, chartContext, displayMode)}</div>
    </article>
  `;
}

function renderWidgetStage(widget, chartContext, displayMode) {
  if (supportsDisplayToggle(widget) && displayMode === "data") {
    return renderDataView(widget, chartContext);
  }
  return renderChart(widget, chartContext);
}

function renderChart(widget, chartContext) {
  const type = widget.componentType || "";
  if (isFundingFlowScaleWidget(widget)) return renderFundingFlowCompositeChart(widget, chartContext);
  if (isNiiCurrencyMatrixWidget(widget)) return renderNiiCurrencyScenarioTable(widget, chartContext);
  if (isLiquidityGapTenorWidget(widget)) return renderLiquidityGapTenorChart(widget, chartContext);
  if (isThirtyDayLiquidityGapWidget(widget)) return renderThirtyDayLiquidityGapChart(widget, chartContext);
  if (isRepricingScaleGapWidget(widget)) return renderRepricingScaleGapChart(widget, chartContext);
  if (isMaturityDistributionWidget(widget) || type.includes("期限分布")) return renderMaturityDistributionChart(widget, chartContext);
  if (type.includes("表格")) return renderTable(widget, chartContext);
  if (type.includes("双轴") || type.includes("组合")) return renderComboChart(widget, chartContext);
  if (type.includes("分布") || widget.title.includes("占比") || widget.title.includes("分布")) return renderDonut(widget, chartContext);
  if (type.includes("柱状")) return renderBarChart(widget, chartContext);
  return renderLineChart(widget, chartContext);
}

function buildChartContext(widget, areaState, widgetState = {}) {
  const normalizedState = {};
  Object.keys(areaState).forEach((key) => {
    normalizedState[key] = [...(areaState[key] || [])];
  });
  Object.keys(widgetState).forEach((key) => {
    normalizedState[key] = [...(widgetState[key] || [])];
  });

  const seriesSelection = chooseSeriesSelection(widget, normalizedState);
  const allSeriesList = [...seriesSelection.values];
  const legendSeriesList = getLegendSelection(widget.seq, "__legend_series__", allSeriesList);
  const xLabels = applyGlobalDateRangeToLabels(widget, inferXAxisLabels(widget));
  return {
    pageId: appState.currentPageId,
    filterState: normalizedState,
    signature: createSignature(widget.seq, normalizedState),
    seriesList: legendSeriesList.length ? legendSeriesList : allSeriesList.slice(0, 1),
    allSeriesList,
    seriesMode: seriesSelection.label,
    xLabels,
    yLabel: inferYAxisLabel(widget),
  };
}

function getWidgetBehavior(widget) {
  const localFilterMap = new Map();
  const suppressSeriesFilters = new Set();
  const enableSeriesFilters = new Set();

  const widgetFilters = WIDGET_FILTER_CONFIG[String(widget.seq)] || WIDGET_FILTER_CONFIG[widget.seq] || [];
  widgetFilters.forEach((filter) => {
    if (!filter?.name) return;
    localFilterMap.set(filter.name, { ...filter });
  });

  SERIES_RULES.forEach((rule) => {
    if (!matchesWidgetRule(widget, rule.match || rule.when || {})) return;

    (rule.localFilters || []).forEach((filter) => {
      if (!filter?.name) return;
      localFilterMap.set(filter.name, { ...filter });
    });

    (rule.suppress || rule.suppressSeriesFilters || []).forEach((filterName) => suppressSeriesFilters.add(filterName));
    (rule.allow || rule.enableSeriesFilters || []).forEach((filterName) => enableSeriesFilters.add(filterName));
  });

  return {
    localFilters: Array.from(localFilterMap.values()),
    suppressSeriesFilters: Array.from(suppressSeriesFilters),
    enableSeriesFilters: Array.from(enableSeriesFilters),
  };
}

function matchesWidgetRule(widget, match) {
  if (!match || !Object.keys(match).length) return false;
  const widgetSeq = match.widgetSeq != null ? match.widgetSeq : match.seq;
  if (widgetSeq != null && Number(widget.seq) !== Number(widgetSeq)) return false;
  if (match.titleIncludes && !String(widget.title || "").includes(match.titleIncludes)) return false;
  if (match.legendIncludes && !String(widget.legendDescription || "").includes(match.legendIncludes)) return false;
  return true;
}

function renderWidgetLocalFilters(widgetBehavior, widgetState, widgetSeq) {
  const visibleFilters = widgetBehavior.localFilters.filter((filter) => {
    if (filter.renderMode === "legend") return false;
    if (isInlineWidgetFilter(widgetSeq, filter.name)) return false;
    return true;
  });
  if (!visibleFilters.length) return "";
  return `
    <div class="widget-card__filters">
      ${visibleFilters
        .map((filter) => renderFilterGroup("widget", widgetSeq, filter.label || filter.name, widgetState[filter.name] || [], filter.options))
        .join("")}
    </div>
  `;
}

function chooseSeriesSelection(widget, filterState) {
  const widgetBehavior = getWidgetBehavior(widget);
  const suppressedFilters = new Set(widgetBehavior.suppressSeriesFilters || []);
  const enabledSeriesFilters = new Set(widgetBehavior.enableSeriesFilters || []);
  const dimConfigs = [
    { key: "利率情景", label: "情景" },
    { key: "情景", label: "情景" },
    { key: "机构", label: "机构" },
    { key: "币种", label: "币种" },
    { key: "贷款类型", label: "贷款类型" },
    { key: "存款类型", label: "存款类型" },
    { key: "期限长度", label: "期限" },
    { key: "业务类型", label: "业务类型" },
  ];

  const activeDims = dimConfigs
    .map((config) => {
      let values = (filterState[config.key] || []).filter(Boolean);
      if (suppressedFilters.has(config.key)) {
        values = [];
      }
      if ((config.key === "利率情景" || config.key === "情景") && !enabledSeriesFilters.has(config.key)) {
        return null;
      }
      return values.length ? { ...config, values } : null;
    })
    .filter(Boolean);

  const multiDims = activeDims.filter((item) => item.values.length > 1);
  if (multiDims.length > 0) {
    const combinations = cartesianProduct(multiDims.map((item) => item.values)).slice(0, 8);
    const labels = combinations.map((combo) => combo.join(" / "));
    const dimLabel = multiDims.map((item) => item.label).join(" × ");
    return { label: `按${dimLabel}组合拆线`, values: labels };
  }

  const singleDimValues = activeDims.filter((item) => item.values.length === 1);
  if (singleDimValues.length > 0) {
    return {
      label: `按${singleDimValues.map((item) => item.label).join(" / ")}取值`,
      values: [singleDimValues.map((item) => item.values[0]).join(" / ")],
    };
  }

  return { label: "单序列展示", values: ["当前口径"] };
}

function renderLineChart(widget, chartContext) {
  if (isDurationRepricingWidget(widget)) return renderDurationRepricingChart(widget, chartContext);
  const frame = applyFrameAxisLayout(createFrame(chartContext.xLabels.length), widget, chartContext.xLabels);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const seriesDefinitions = [];
  const seriesMarkup = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index);
      const points = buildSeries(widget.seq + index * 17, chartContext.xLabels.length, frame, chartContext.signature + index * 31);
      seriesDefinitions.push({ label, points, role: label.includes("负债") ? "liability" : "line" });
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${index === 0 ? 4 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${index === 0 ? 4.2 : 3.5}" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
      `;
    })
    .join("");
  const simulationOverlay = renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${seriesMarkup}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderComboChart(widget, chartContext) {
  if (isNiiVolatilityWidget(widget)) return renderNiiVolatilityComboChart(widget, chartContext);
  const frame = applyFrameAxisLayout(createFrame(chartContext.xLabels.length), widget, chartContext.xLabels);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const barValues = buildBarValues(widget.seq, chartContext.xLabels.length, chartContext.signature);
  const barWidth = Math.max(24, (getFrameMinStep(frame, chartContext.xLabels.length)) * 0.36);

  const bars = barValues
    .map((value, index) => {
      const x = getFrameXPosition(frame, index, chartContext.xLabels.length) - barWidth / 2;
      const y = frame.bottom - value;
      const fill = index % 2 ? "rgba(156,203,240,0.72)" : "rgba(220,238,255,0.95)";
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${value}" rx="10" fill="${fill}"></rect>`;
    })
    .join("");

  const seriesDefinitions = [];
  const lines = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index);
      const points = buildSeries(widget.seq + 19 + index * 13, chartContext.xLabels.length, frame, chartContext.signature + index * 19);
      seriesDefinitions.push({ label, points, role: label.includes("负债") ? "liability" : "line" });
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("");
  const simulationOverlay = renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${bars}
        ${lines}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderRepricingScaleGapChart(widget, chartContext) {
  const frame = applyFrameAxisLayout(createWideFrame(chartContext.xLabels.length), widget, chartContext.xLabels);
  const axis = renderAxes(frame, chartContext.xLabels, "规模/差额 (亿元)");
  const metricItems = ["资产端重定价规模", "负债端重定价规模", "资产负债差额"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 28 + (value % 84));
  const liabilityValues = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 23).map((value) => 22 + (value % 78));
  const gapValues = assetValues.map((value, index) => Math.max(12, Math.abs(value - liabilityValues[index]) + 8));
  const estimatedStep = getFrameMinStep(frame, chartContext.xLabels.length);
  const columnWidth = Math.max(8, Math.min(18, estimatedStep * 0.22));
  const barGap = Math.max(1, Math.min(2, estimatedStep * 0.04));
  const separators = chartContext.xLabels
    .slice(0, -1)
    .map((_, index) => {
      const x = (getFrameXPosition(frame, index, chartContext.xLabels.length) + getFrameXPosition(frame, index + 1, chartContext.xLabels.length)) / 2;
      return `<line x1="${x}" y1="${frame.top}" x2="${x}" y2="${frame.bottom}" stroke="rgba(95, 143, 132, 0.12)" stroke-width="1"></line>`;
    })
    .join("");

  const assetBars = selectedMetrics.includes("资产端重定价规模")
    ? assetValues
    .map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const x = center - columnWidth - barGap;
      const y = frame.bottom - (frame.height * value) / 100;
      return `<rect x="${x}" y="${y}" width="${columnWidth}" height="${frame.bottom - y}" rx="8" fill="rgba(95, 143, 132, 0.82)"></rect>`;
    })
    .join("")
    : "";

  const liabilityBars = selectedMetrics.includes("负债端重定价规模")
    ? liabilityValues
    .map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const x = center + barGap;
      const y = frame.bottom - (frame.height * value) / 100;
      return `<rect x="${x}" y="${y}" width="${columnWidth}" height="${frame.bottom - y}" rx="8" fill="rgba(216, 192, 170, 0.92)"></rect>`;
    })
    .join("")
    : "";

  const gapPoints = gapValues.map((raw, index) => {
    const x = getFrameXPosition(frame, index, chartContext.xLabels.length);
    const y = frame.bottom - (frame.height * raw) / 100;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  const simulationOverlay = selectedMetrics.includes("资产负债差额")
    ? renderSimulationOverlay(frame, widget, chartContext, [{ label: "资产负债差额", points: gapPoints, role: "gap" }])
    : "";

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 1100 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${separators}
        ${assetBars}
        ${liabilityBars}
        ${selectedMetrics.includes("资产负债差额") ? `
          <polyline fill="none" stroke="#BC6F51" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" points="${gapPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${gapPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="#BC6F51" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
        ` : ""}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "资产端重定价规模", color: "rgba(95, 143, 132, 0.82)" },
          { label: "负债端重定价规模", color: "rgba(216, 192, 170, 0.92)" },
          { label: "资产负债差额", color: "#BC6F51" },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderRepricingScaleGapDataTable(widget, chartContext) {
  const assetValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 28 + (value % 84));
  const liabilityValues = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 23).map((value) => 22 + (value % 78));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>资产端重定价规模</th>
              <th>负债端重定价规模</th>
              <th>资产负债差额</th>
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels
              .map(
                (label, index) => `
                  <tr>
                    <td>${label}</td>
                    <td>${assetValues[index].toFixed(1)}</td>
                    <td>${liabilityValues[index].toFixed(1)}</td>
                    <td>${Math.abs(assetValues[index] - liabilityValues[index]).toFixed(1)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBarChart(widget, chartContext) {
  const labels = chartContext.seriesList.length > 1 ? chartContext.seriesList : chartContext.xLabels.slice(0, 6);
  const frame = applyFrameAxisLayout(createFrame(labels.length), widget, labels);
  const yLabel = chartContext.yLabel;
  const axis = renderAxes(frame, labels, yLabel);
  const values = buildBarValues(widget.seq, labels.length, chartContext.signature);
  const barWidth = Math.max(34, getFrameMinStep(frame, labels.length) * 0.48);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${values
          .map((value, index) => {
            const x = getFrameXPosition(frame, index, labels.length) - barWidth / 2;
            const y = frame.bottom - value;
            const color = getPaletteColor(labels[index], labels, index);
            return `<rect x="${x}" y="${y}" width="${barWidth}" height="${value}" rx="10" fill="${color}"></rect>`;
          })
          .join("")}
      </svg>
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: labels, allSeriesList: labels })}
    </div>
  `;
}

function renderTable(widget, chartContext) {
  if (isEveCurrencyTableWidget(widget)) return renderEveCurrencyTable(widget, chartContext);
  if (isEveScenarioTableWidget(widget)) return renderEveScenarioTable(widget, chartContext);
  if (isDurationGapMatrixWidget(widget)) return renderDurationGapMatrixTable(widget);
  if (String(widget?.title || "").includes("资产负债结构一览表")) return renderBusinessStructureTable(widget, chartContext);
  const rowLabels = chartContext.seriesList.length > 1 ? chartContext.seriesList : buildDefaultTableLabels(widget);
  const rows = rowLabels.slice(0, 5).map((label, index) => buildTableRow(label, widget.seq, index, chartContext.signature));
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>指标A</th>
              <th>指标B</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.name}</td>
                    <td>${row.value1}</td>
                    <td>${row.value2}</td>
                    <td>${row.flag}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBusinessStructureTable(widget, chartContext) {
  const rows = [
    { side: "生息资产", businessType: "自营贷款", scale: 268, fixedRate: "61.2%", duration: "1.8" },
    { side: "生息资产", businessType: "债券投资", scale: 196, fixedRate: "73.5%", duration: "2.4" },
    { side: "生息资产", businessType: "同业资产", scale: 88, fixedRate: "28.4%", duration: "0.7" },
    { side: "付息负债", businessType: "活期存款", scale: 214, fixedRate: "12.6%", duration: "0.3" },
    { side: "付息负债", businessType: "定期存款", scale: 246, fixedRate: "82.1%", duration: "1.5" },
    { side: "付息负债", businessType: "同业负债", scale: 104, fixedRate: "35.7%", duration: "0.8" },
  ];
  const widgetState = appState.widgetFilters[widget.seq] || {};
  const timeRangeText = widgetState["时间区间（起止）"]?.[0];
  const localFilter = timeRangeText
    ? `
      <div class="chart-inline-controls">
        ${renderWidgetInlineControl(widget.seq, "时间区间（起止）", "时间区间（起止）", widgetState["时间区间（起止）"], ["近1个月", "近3个月", "近12个月", "年初至今"])}
      </div>
    `
    : "";
  return `
    <div class="chart-shell chart-shell--data">
      ${localFilter}
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>资产/负债</th>
              <th>业务类型</th>
              <th>规模</th>
              <th>固息占比</th>
              <th>加权久期</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${row.side}</td>
                <td>${row.businessType}</td>
                <td>${row.scale.toFixed(1)}</td>
                <td>${row.fixedRate}</td>
                <td>${row.duration}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDataView(widget, chartContext) {
  const type = widget.componentType || "";
  if (isFundingFlowScaleWidget(widget)) return renderFundingFlowCompositeDataView(widget, chartContext);
  if (isDurationRepricingWidget(widget)) return renderDurationRepricingDataTable(widget, chartContext);
  if (isNiiVolatilityWidget(widget)) return renderNiiVolatilityDataTable(widget, chartContext);
  if (isNiiCurrencyMatrixWidget(widget)) return renderNiiCurrencyScenarioTable(widget, chartContext);
  if (isRepricingScaleGapWidget(widget)) return renderRepricingScaleGapDataTable(widget, chartContext);
  if (isMaturityDistributionWidget(widget) || type.includes("期限分布")) return renderMaturityDistributionDataTable(widget, chartContext);
  if (type.includes("双轴") || type.includes("组合")) return renderComboDataTable(widget, chartContext);
  if (type.includes("柱状")) return renderBarDataTable(widget, chartContext);
  if (type.includes("分布") || widget.title.includes("占比") || widget.title.includes("分布")) return renderDistributionDataTable(widget, chartContext);
  return renderLineDataTable(widget, chartContext);
}

function renderLineDataTable(widget, chartContext) {
  const rows = chartContext.xLabels.map((label, rowIndex) => ({
    label,
    values: chartContext.seriesList.map((seriesLabel, seriesIndex) =>
      buildMetricValues(widget.seq + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 31)[rowIndex]
    ),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${chartContext.seriesList.map((seriesLabel) => `<th>${seriesLabel}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.values.map((value) => `<td>${formatMetricValue(value, chartContext.yLabel)}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLiquidityGapTenorChart(widget, chartContext) {
  return renderInlineControlledLineChart(widget, chartContext, "期限长度", ["1日", "7日", "90日"]);
}

function renderThirtyDayLiquidityGapChart(widget, chartContext) {
  return renderInlineControlledLineChart(widget, chartContext, "口径", ["时点", "月日均"]);
}

function renderInlineControlledLineChart(widget, chartContext, filterName, options) {
  const frame = applyFrameAxisLayout(createFrame(chartContext.xLabels.length), widget, chartContext.xLabels);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const seriesMarkup = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index);
      const points = buildSeries(widget.seq + index * 17, chartContext.xLabels.length, frame, chartContext.signature + index * 31);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${index === 0 ? 4 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${index === 0 ? 4.2 : 3.5}" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
      `;
    })
    .join("");

  return `
    <div class="chart-shell">
      <div class="chart-inline-controls">
        ${renderWidgetInlineControl(widget.seq, filterName, filterName, chartContext.filterState[filterName] || options.slice(0, 1), options)}
      </div>
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${seriesMarkup}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderDurationRepricingChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "久期");
  const allSeriesDefinitions = buildDurationSeriesDefinitions(widget, chartContext);
  const selectedLabels = getLegendSelection(widget.seq, "__legend_series__", allSeriesDefinitions.map((definition) => definition.label));
  const seriesDefinitions = allSeriesDefinitions.filter((definition) => selectedLabels.includes(definition.label));
  const seriesMarkup = seriesDefinitions
    .map((definition) => {
      const color = SERIES_PALETTE[definition.colorIndex % SERIES_PALETTE.length];
      const points = buildSeries(definition.seed, chartContext.xLabels.length, frame, chartContext.signature + definition.signatureOffset);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" ${definition.dashed ? 'stroke-dasharray="10 7"' : ""} points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("");

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${seriesMarkup}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: allSeriesDefinitions.map((definition) => definition.label),
        seriesList: selectedLabels,
        legendItems: allSeriesDefinitions.map((definition) => ({
          label: definition.label,
          color: SERIES_PALETTE[definition.colorIndex % SERIES_PALETTE.length],
          dashed: definition.dashed,
        })),
      })}
    </div>
  `;
}

function renderDurationRepricingDataTable(widget, chartContext) {
  const seriesDefinitions = buildDurationSeriesDefinitions(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesDefinitions.map((definition) => `<th>${definition.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels
              .map(
                (label, index) => `
                  <tr>
                    <td>${label}</td>
                    ${seriesDefinitions
                      .map((definition) => {
                        const values = buildMetricValues(definition.seed, chartContext.xLabels.length, chartContext.signature + definition.signatureOffset);
                        return `<td>${values[index].toFixed(1)}</td>`;
                      })
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildDurationSeriesDefinitions(widget, chartContext) {
  const orgOptions = uniqueList(chartContext.filterState["机构"] || FILTER_OPTIONS["机构"] || ["法人汇总"]);
  const currencyOptions = uniqueList(chartContext.filterState["币种"] || FILTER_OPTIONS["币种"] || ["全折人民币"]);
  const combinations = cartesianProduct([orgOptions, currencyOptions]);
  return combinations.flatMap(([org, currency], comboIndex) => {
    const baseSeed = widget.seq + 31 + comboIndex * 37;
    const baseOffset = comboIndex * 113;
    return [
      {
        label: `${org} / ${currency} / 资产端`,
        seed: baseSeed,
        signatureOffset: baseOffset,
        colorIndex: comboIndex,
        dashed: false,
      },
      {
        label: `${org} / ${currency} / 负债端`,
        seed: baseSeed + 13,
        signatureOffset: baseOffset + 41,
        colorIndex: comboIndex,
        dashed: true,
      },
    ];
  });
}

function renderDurationGapMatrixTable(widget) {
  const rowLabels = FILTER_OPTIONS["币种"] || ["全折人民币", "人民币", "外币折美元", "美元", "港元", "新加坡元", "欧元", "澳元", "英镑", "日元"];
  const columnLabels = FILTER_OPTIONS["机构"] || ["法人汇总", "境外分行汇总", "境内汇总", "纽约分行", "新加坡分行", "卢森堡分行", "伦敦分行", "悉尼分行", "香港分行"];
  const signature = createSignature(widget.seq, { scope: ["all-org-all-currency"] });
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>币种</th>
              ${columnLabels.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowLabels
              .map(
                (rowLabel, rowIndex) => `
                  <tr>
                    <td>${rowLabel}</td>
                    ${columnLabels
                      .map((columnLabel, colIndex) => {
                        const raw = ((signature + (rowIndex + 1) * 37 + (colIndex + 1) * 53) % 160) - 70;
                        const value = (raw / 10).toFixed(1);
                        return `<td>${value}</td>`;
                      })
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEveCurrencyTable(widget, chartContext) {
  const currencyLabels = FILTER_OPTIONS["币种"] || ["全折人民币", "人民币", "外币折美元", "美元", "港元", "新加坡元", "欧元", "澳元", "英镑", "日元"];
  const orgSignature = createSignature(widget.seq, { 机构: chartContext.filterState["机构"] || [] });
  const rows = currencyLabels.map((currency, index) => {
    const economyChange = -1 * (12 + ((orgSignature + index * 19) % 88));
    const capital = 180 + ((orgSignature + index * 23) % 360);
    const eveRatio = `${((Math.abs(economyChange) / capital) * 100).toFixed(1)}%`;
    return { currency, economyChange: economyChange.toFixed(1), capital: capital.toFixed(1), eveRatio };
  });
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>币种</th>
              <th>经济价值变动</th>
              <th>一级资本净额</th>
              <th>△EVE</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.currency}</td>
                    <td>${row.economyChange}</td>
                    <td>${row.capital}</td>
                    <td>${row.eveRatio}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEveScenarioTable(widget, chartContext) {
  const currencyLabels = FILTER_OPTIONS["币种"] || ["全折人民币", "人民币", "外币折美元", "美元", "港元", "新加坡元", "欧元", "澳元", "英镑", "日元"];
  const scenarioLabels = ["平行上移", "平行下移", "变陡峭", "变平缓", "短端上升", "短端下降"];
  const orgSignature = createSignature(widget.seq, { 机构: chartContext.filterState["机构"] || [] });
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th>币种</th>
              ${scenarioLabels.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${currencyLabels
              .map(
                (currency, rowIndex) => `
                  <tr>
                    <td>${currency}</td>
                    ${scenarioLabels
                      .map((scenario, colIndex) => {
                        const raw = ((orgSignature + (rowIndex + 1) * 29 + (colIndex + 1) * 37) % 180) - 90;
                        return `<td>${raw.toFixed(1)}</td>`;
                      })
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderComboDataTable(widget, chartContext) {
  const barValues = buildBarValues(widget.seq, chartContext.xLabels.length, chartContext.signature);
  const rows = chartContext.xLabels.map((label, rowIndex) => ({
    label,
    barValue: barValues[rowIndex],
    lineValues: chartContext.seriesList.map((seriesLabel, seriesIndex) =>
      buildMetricValues(widget.seq + 19 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 19)[rowIndex]
    ),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>柱状指标</th>
              ${chartContext.seriesList.map((seriesLabel) => `<th>${seriesLabel}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    <td>${formatMetricValue(row.barValue, chartContext.yLabel)}</td>
                    ${row.lineValues.map((value) => `<td>${formatMetricValue(value, chartContext.yLabel)}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderNiiVolatilityComboChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "波动/波动率");
  const seriesList = chartContext.seriesList.length ? chartContext.seriesList : ["当前口径"];
  const metricItems = ["柱：净利息收入波动", "线：净利息收入波动率"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const step = chartContext.xLabels.length <= 1 ? 0 : frame.width / (chartContext.xLabels.length - 1);
  const groupWidth = Math.max(18, step * 0.52);
  const barWidth = Math.max(12, Math.min(20, groupWidth / Math.max(seriesList.length, 1) - 4));

  const bars = selectedMetrics.includes("柱：净利息收入波动")
    ? seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, seriesIndex);
      const barValues = buildBarValues(widget.seq + seriesIndex * 11, chartContext.xLabels.length, chartContext.signature + seriesIndex * 23).map((value) => 16 + (value % 60));
      return barValues
        .map((value, index) => {
          const center = frame.left + step * index;
          const offset = (seriesIndex - (seriesList.length - 1) / 2) * (barWidth + 4);
          const x = center + offset - barWidth / 2;
          const height = (frame.height * value) / 100;
          const y = frame.bottom - height;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${hexToRgba(color, 0.34)}"></rect>`;
        })
        .join("");
    })
    .join("")
    : "";

  const lines = selectedMetrics.includes("线：净利息收入波动率")
    ? seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, seriesIndex);
      const points = buildSeries(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, frame, chartContext.signature + seriesIndex * 29);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${seriesIndex === 0 ? 3.8 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("")
    : "";

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${bars}
        ${lines}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "柱：净利息收入波动", color: hexToRgba(SERIES_PALETTE[0], 0.5) },
          { label: "线：净利息收入波动率", color: "#6F3929" },
        ],
      }, "__legend_metrics__")}
      ${renderSeriesLegend(widget, { ...chartContext, allSeriesList: chartContext.allSeriesList, seriesList })}
    </div>
  `;
}

function renderNiiVolatilityDataTable(widget, chartContext) {
  const seriesList = chartContext.seriesList.length ? chartContext.seriesList : ["当前口径"];
  const rows = chartContext.xLabels.map((label, index) => ({
    label,
    cells: seriesList.map((seriesLabel, seriesIndex) => ({
      bar: 16 + (buildBarValues(widget.seq + seriesIndex * 11, chartContext.xLabels.length, chartContext.signature + seriesIndex * 23)[index] % 60),
      line: buildMetricValues(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 29)[index],
    })),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesList
                .map((seriesLabel) => `<th>${seriesLabel}｜净利息收入波动</th><th>${seriesLabel}｜波动率</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.cells.map((cell) => `<td>${cell.bar.toFixed(1)}</td><td>${cell.line.toFixed(1)}%</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBarDataTable(widget, chartContext) {
  const labels = chartContext.seriesList.length > 1 ? chartContext.seriesList : chartContext.xLabels.slice(0, 6);
  const values = buildBarValues(widget.seq, labels.length, chartContext.signature);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>${chartContext.yLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${labels
              .map(
                (label, index) => `
                  <tr>
                    <td>${label}</td>
                    <td>${formatMetricValue(values[index], chartContext.yLabel)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDistributionDataTable(widget, chartContext) {
  const labels = chartContext.seriesList.length > 1 ? chartContext.seriesList : buildDefaultTableLabels(widget);
  const values = buildBarValues(widget.seq + 7, labels.length, chartContext.signature);
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>数值</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            ${labels
              .map(
                (label, index) => `
                  <tr>
                    <td>${label}</td>
                    <td>${values[index]}</td>
                    <td>${((values[index] / total) * 100).toFixed(1)}%</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function isMaturityDistributionWidget(widget) {
  return String(widget.componentType || "").includes("期限分布") || String(widget.title || "").includes("分业务重定价期限分布");
}

function getMaturityDistributionBuckets() {
  return ["2026-04-01", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"];
}

function getMaturityDistributionSeries() {
  return [
    { name: "自营贷款", direction: 1 },
    { name: "债券投资", direction: 1 },
    { name: "同业资产", direction: 1 },
    { name: "存放央行", direction: 1 },
    { name: "内部交易资产", direction: 1 },
    { name: "活期存款", direction: -1 },
    { name: "定期存款", direction: -1 },
    { name: "同业负债", direction: -1 },
    { name: "发行债券", direction: -1 },
    { name: "表外衍生品应付", direction: -1 },
  ];
}

function getMaturityDistributionSelection(chartContext) {
  const selected = (chartContext.filterState["业务类型"] || []).filter(Boolean);
  const all = getMaturityDistributionSeries().map((item) => item.name);
  return selected.length ? selected : all;
}

function buildMaturityDistributionMatrix(widget, signature, selectedNames = []) {
  const buckets = getMaturityDistributionBuckets();
  const series = getMaturityDistributionSeries().filter((item) => !selectedNames.length || selectedNames.includes(item.name));
  const profile = [92, 74, 56, 48, 36, 28, 24, 22, 20, 19, 18, 18, 20];

  return {
    buckets,
    series,
    rows: buckets.map((bucket, bucketIndex) => {
      const values = series.map((item, seriesIndex) => {
        const base = profile[bucketIndex] * (0.42 + ((widget.seq + seriesIndex * 7 + signature) % 11) / 16);
        const wave = (((bucketIndex + 1) * (seriesIndex + 3) + signature) % 9) - 4;
        return Number(((base + wave) * item.direction).toFixed(1));
      });
      return { bucket, values };
    }),
  };
}

function renderMaturityDistributionChart(widget, chartContext) {
  const selectedNames = getMaturityDistributionSelection(chartContext);
  const matrix = buildMaturityDistributionMatrix(widget, chartContext.signature, selectedNames);
  const allSeries = getMaturityDistributionSeries().map((item) => item.name);
  const frame = { left: 88, right: 660, top: 24, bottom: 236, width: 572, height: 212 };
  const maxAbs = Math.max(
    120,
    ...matrix.rows.map((row) => Math.max(
      Math.abs(row.values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0)),
      Math.abs(row.values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0))
    ))
  );
  const zeroY = frame.top + frame.height / 2;
  const scale = (frame.height / 2 - 8) / maxAbs;
  const step = frame.width / matrix.buckets.length;
  const barWidth = Math.max(18, step * 0.42);
  const ticks = [-100, -50, 0, 50, 100].map((tick) => ({ tick, y: zeroY - tick * scale }));

  const axisMarkup = `
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.2"></line>
    <line x1="${frame.left}" y1="${zeroY}" x2="${frame.right}" y2="${zeroY}" stroke="rgba(109,165,215,0.42)" stroke-width="1.2"></line>
    ${ticks
      .map(
        ({ tick, y }) => `
          <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.12)" stroke-width="1"></line>
          <text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${tick}</text>
        `
      )
      .join("")}
    <text x="${frame.left - 48}" y="${frame.top - 6}" class="axis-title">规模(亿元)</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 50}" text-anchor="middle" class="axis-title">重定价期限</text>
    ${matrix.buckets
      .map((bucket, index) => {
        const x = frame.left + step * index + step * 0.5;
        return `
          <line x1="${x}" y1="${zeroY}" x2="${x}" y2="${zeroY + 6}" stroke="rgba(109,165,215,0.28)" stroke-width="1"></line>
          <text x="${x}" y="${frame.bottom + 18}" text-anchor="end" transform="rotate(-38 ${x} ${frame.bottom + 18})" class="axis-label axis-label--x">${bucket}</text>
        `;
      })
      .join("")}
  `;

  const barsMarkup = matrix.rows
    .map((row, rowIndex) => {
      const x = frame.left + step * rowIndex + (step - barWidth) / 2;
      let positiveOffset = 0;
      let negativeOffset = 0;
      return row.values
        .map((value, valueIndex) => {
          const height = Math.abs(value) * scale;
          const color = getPaletteColor(matrix.series[valueIndex].name, allSeries, valueIndex);
          if (value >= 0) {
            const y = zeroY - positiveOffset - height;
            positiveOffset += height;
            return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="6" fill="${color}" opacity="0.92"></rect>`;
          }
          const y = zeroY + negativeOffset;
          negativeOffset += height;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="6" fill="${color}" opacity="0.72"></rect>`;
        })
        .join("");
    })
    .join("");

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axisMarkup}
        ${barsMarkup}
      </svg>
      ${renderMaturityDistributionLegend(widget, selectedNames)}
    </div>
  `;
}

function renderMaturityDistributionDataTable(widget, chartContext) {
  const selectedNames = getMaturityDistributionSelection(chartContext);
  const matrix = buildMaturityDistributionMatrix(widget, chartContext.signature, selectedNames);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>重定价期限</th>
              ${matrix.series.map((item) => `<th>${item.name}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${matrix.rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.bucket}</td>
                    ${row.values.map((value) => `<td>${value.toFixed(1)}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function isNiiCurrencyMatrixWidget(widget) {
  return Number(widget?.seq) === 8;
}

function renderNiiCurrencyScenarioTable(widget, chartContext) {
  const rowLabels = FILTER_OPTIONS["币种"] || ["全折人民币", "人民币", "外币折美元", "美元", "港元", "新加坡元", "欧元", "澳元", "英镑", "日元"];
  const columnLabels =
    (AREA_FILTER_OPTION_OVERRIDES["净利息收入波动率"] && AREA_FILTER_OPTION_OVERRIDES["净利息收入波动率"]["利率情景"]) ||
    ["所有利率平行上移200bp", "活期利率不变但其他利率平行上移200bp"];
  const orgOnlySignature = createSignature(widget.seq, { 机构: chartContext.filterState["机构"] || [] });
  const rows = rowLabels.map((label, rowIndex) => ({
    label,
    values: columnLabels.map((_, columnIndex) => {
      const amount = 8 + ((widget.seq * 17 + orgOnlySignature + rowIndex * 11 + columnIndex * 19) % 56);
      const ratio = (((widget.seq * 7 + orgOnlySignature + rowIndex * 13 + columnIndex * 17) % 48) / 10 + 0.8).toFixed(1);
      return `${amount.toFixed(1)} / ${ratio}%`;
    }),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>币种</th>
              ${columnLabels.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.values.map((value) => `<td>${value}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMaturityDistributionLegend(widget, selectedNames) {
  const allSeries = getMaturityDistributionSeries().map((item) => item.name);
  return `
    <div class="chart-legend chart-legend--filterable">
      ${allSeries
        .map((label, index) => {
          const isSelected = selectedNames.includes(label);
          return `
            <button
              class="chart-legend__item chart-legend__item--button ${isSelected ? "is-selected" : "is-muted"}"
              type="button"
              data-legend-toggle="true"
              data-widget-seq="${widget.seq}"
              data-filter-name="业务类型"
              data-filter-value="${label}"
            >
              <i class="chart-legend__swatch" style="background:${getPaletteColor(label, allSeries, index)}"></i>
              ${label}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDonut(widget, chartContext) {
  const allLabels = chartContext.allSeriesList.length > 1 ? chartContext.allSeriesList.slice(0, 4) : buildDefaultTableLabels(widget).slice(0, 4);
  const selectedLabels = getLegendSelection(widget.seq, "__legend_series__", allLabels);
  const labels = selectedLabels.length ? selectedLabels : allLabels.slice(0, 1);
  const weights = labels.map((_, index) => 18 + ((chartContext.signature + index * 13) % 22));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let current = 0;
  const stops = weights
    .map((value, index) => {
      const start = current;
      current += value;
      const startPct = ((start / total) * 100).toFixed(1);
      const endPct = ((current / total) * 100).toFixed(1);
      return `${getPaletteColor(labels[index], allLabels, index)} ${startPct}% ${endPct}%`;
    })
    .join(", ");

  return `
    <div class="donut-shell">
      <div class="donut" style="background: conic-gradient(${stops});"></div>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: allLabels,
        seriesList: labels,
        legendItems: allLabels.map((label, index) => {
          const selectedIndex = labels.indexOf(label);
          const pct = selectedIndex >= 0 ? Math.round((weights[selectedIndex] / total) * 100) : null;
          return {
            label: pct != null ? `${label} ${pct}%` : label,
            filterValue: label,
            color: getPaletteColor(label, allLabels, index),
          };
        }),
      })}
    </div>
  `;
}

function renderSeriesLegend(widget, chartContext, legendKey = "__legend_series__") {
  const legendItems =
    chartContext.legendItems ||
    (chartContext.allSeriesList || chartContext.seriesList || []).map((label, index) => ({
      label,
      filterValue: label,
      color: getPaletteColor(label, chartContext.allSeriesList || chartContext.seriesList || [], index),
      dashed: false,
    }));
  const selectedLabels = getLegendSelection(
    widget.seq,
    legendKey,
    legendItems.map((item) => item.filterValue || item.label)
  );
  return `
    <div class="chart-legend chart-legend--filterable">
      ${legendItems
        .map(
          (item, index) => `
            <button
              class="chart-legend__item chart-legend__item--button ${selectedLabels.includes(item.filterValue || item.label) ? "is-selected" : "is-muted"}"
              type="button"
              data-legend-toggle="true"
              data-widget-seq="${widget.seq}"
              data-legend-key="${legendKey}"
              data-filter-value="${item.filterValue || item.label}"
            >
              <i class="chart-legend__swatch" style="background:${item.color || SERIES_PALETTE[index % SERIES_PALETTE.length]}; opacity:${item.dashed ? "0.65" : "1"}"></i>
              ${item.label}
            </button>
          `
        )
        .join("")}
    </div>
  `;
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

function applyFrameAxisLayout(frame, widget, labels) {
  frame.axisLayout = buildAxisLayout(widget, labels, frame);
  return frame;
}

function buildAxisLayout(widget, labels, frame) {
  if (!usesHybridDailyTimeline(widget)) return null;
  const historyCount = labels.filter((label) => !String(label).includes("/")).length;
  const dailyCount = labels.length - historyCount;
  if (!historyCount || !dailyCount) return null;
  const gap = Math.min(28, Math.max(18, frame.width * 0.024));
  const segmentWidth = (frame.width - gap) / 2;
  const historyWidth = segmentWidth;
  const dailyWidth = segmentWidth;
  const historyStep = historyCount <= 1 ? 0 : historyWidth / (historyCount - 1);
  const dailyStep = dailyCount <= 1 ? 0 : dailyWidth / (dailyCount - 1);
  const positions = labels.map((_, index) => {
    if (index < historyCount) return Number((frame.left + historyStep * index).toFixed(1));
    const dailyIndex = index - historyCount;
    return Number((frame.left + historyWidth + gap + dailyStep * dailyIndex).toFixed(1));
  });
  return {
    historyCount,
    dailyCount,
    separatorX: Number((frame.left + historyWidth + gap / 2).toFixed(1)),
    dailyStartX: Number((frame.left + historyWidth + gap).toFixed(1)),
    positions,
  };
}

function getFrameXPosition(frame, index, count) {
  if (frame?.axisLayout?.positions?.[index] != null) return frame.axisLayout.positions[index];
  const step = count <= 1 ? 0 : frame.width / (count - 1);
  return Number((frame.left + step * index).toFixed(1));
}

function getFrameMinStep(frame, count) {
  if (!frame?.axisLayout?.positions?.length) return count <= 1 ? frame.width : frame.width / Math.max(1, count - 1);
  let minStep = Number.POSITIVE_INFINITY;
  for (let index = 1; index < frame.axisLayout.positions.length; index += 1) {
    const gap = frame.axisLayout.positions[index] - frame.axisLayout.positions[index - 1];
    if (gap > 0) minStep = Math.min(minStep, gap);
  }
  return Number.isFinite(minStep) ? minStep : frame.width;
}

function renderWidgetInlineControl(widgetSeq, filterName, filterLabel, selectedValues, options) {
  const openKey = buildFilterKey("widget", widgetSeq, filterName);
  const isOpen = appState.openFilterKey === openKey;
  return `
    <div class="chart-inline-control ${isOpen ? "is-open" : ""}">
      <span class="chart-inline-control__label">${filterLabel}</span>
      <button
        class="filter-select filter-select--compact"
        type="button"
        data-filter-toggle="true"
        data-filter-anchor="${openKey}"
        data-owner-type="widget"
        data-owner-id="${widgetSeq}"
        data-filter-name="${filterName}"
        data-filter-options="${options.join("||")}"
        aria-expanded="${isOpen}"
      >
        <span class="filter-select__value">${summarizeFilterSelection(filterName, selectedValues)}</span>
        <span class="filter-select__arrow" aria-hidden="true"></span>
      </button>
    </div>
  `;
}

function renderAxes(frame, xLabels, yLabel) {
  const yTicks = [0, 25, 50, 75, 100];
  const xTickMarkup = xLabels
    .map((label, index) => {
      const x = getFrameXPosition(frame, index, xLabels.length);
      const displayLabel = formatXAxisTickLabel(label, index, xLabels);
      return `
        <line x1="${x}" y1="${frame.bottom}" x2="${x}" y2="${frame.bottom + 6}" stroke="rgba(109,165,215,0.35)" stroke-width="1"></line>
        <text x="${x}" y="${frame.bottom + 22}" text-anchor="middle" class="axis-label axis-label--x">${displayLabel}</text>
      `;
    })
    .join("");

  const yTickMarkup = yTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * tick) / 100;
      return `
        <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.14)" stroke-width="1"></line>
        <text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${tick}</text>
      `;
    })
    .join("");

  const hybridDecorations = frame.axisLayout
    ? `
      <rect x="${frame.axisLayout.dailyStartX - 8}" y="${frame.top}" width="${frame.right - frame.axisLayout.dailyStartX + 8}" height="${frame.height}" fill="rgba(47,111,163,0.035)"></rect>
      <line x1="${frame.axisLayout.separatorX}" y1="${frame.top}" x2="${frame.axisLayout.separatorX}" y2="${frame.bottom}" stroke="rgba(170,136,108,0.24)" stroke-width="1.2" stroke-dasharray="5 5"></line>
      <text x="${(frame.left + frame.axisLayout.separatorX) / 2}" y="${frame.top - 6}" text-anchor="middle" class="axis-title axis-title--minor">历史月末</text>
      <text x="${(frame.axisLayout.dailyStartX + frame.right) / 2}" y="${frame.top - 6}" text-anchor="middle" class="axis-title axis-title--minor">本月逐日</text>
    `
    : "";

  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">${yLabel}</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${inferXAxisTitle(xLabels)}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    ${hybridDecorations}
    ${yTickMarkup}
    ${xTickMarkup}
  `;
}

function isHybridXAxisLabels(labels) {
  return labels.some((label) => /^\d{1,2}\/\d{2}$/.test(String(label))) &&
    labels.some((label) => /^\d{4}-\d{2}$/.test(String(label)) || /^\d{2}$/.test(String(label)));
}

function formatXAxisTickLabel(label, index, labels) {
  const text = String(label || "");
  if (isHybridXAxisLabels(labels)) return formatHybridTickLabel(text, index, labels);
  if (labels.length <= 12) return text;
  if (/^\d{4}-\d{2}$/.test(text) || /^\d{2}$/.test(text)) return text;
  const dailyMatch = text.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dailyMatch) {
    const day = Number(dailyMatch[2]);
    return day === 1 || day % 5 === 0 || index === labels.length - 1 ? text : "";
  }
  const step = labels.length > 24 ? 4 : 2;
  return index % step === 0 || index === labels.length - 1 ? text : "";
}

function formatHybridTickLabel(label, index, labels) {
  const historyCount = labels.filter((item) => !String(item).includes("/")).length;
  if (index < historyCount) {
    if (historyCount <= 6) return label;
    return index === 0 || index === historyCount - 1 || index % 2 === 0 ? label : "";
  }
  const match = label.match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) return "";
  const day = Number(match[2]);
  const currentDay = getHybridCurrentDay(labels);
  if (currentDay <= 1) return label;
  if (currentDay <= 7) return day === 1 || day === currentDay || day % 2 === 1 ? label : "";
  if (currentDay <= 12) return [1, 3, 5, 7, 10, currentDay].includes(day) ? label : "";
  return day === 1 || day % 5 === 0 || day === currentDay ? label : "";
}

function getHybridCurrentDay(labels) {
  return labels.reduce((maxDay, label) => {
    const match = String(label).match(/^\d{1,2}\/(\d{2})$/);
    return match ? Math.max(maxDay, Number(match[1])) : maxDay;
  }, 0);
}

function inferXAxisTitle(xLabels) {
  const joined = xLabels.join("");
  if (isHybridXAxisLabels(xLabels)) return "统计日期";
  if (joined.includes("月")) return "统计月份";
  if (joined.includes("日")) return "统计日期";
  if (joined.includes("/")) return "统计日期";
  if (joined.includes("Q")) return "统计季度";
  return "时间/维度";
}

function inferXAxisLabels(widget) {
  if (usesHybridDailyTimeline(widget)) return buildHybridXAxisLabels();
  const grain = widget.grain || "";
  if (grain.includes("日")) return ["4/01", "4/03", "4/05", "4/07", "4/09", "4/11", "4/13", "4/15"];
  if (grain.includes("月")) return ["2025-07", "08", "09", "10", "11", "12", "2026-01", "02", "03", "04"];
  return ["T1", "T2", "T3", "T4", "T5", "T6"];
}

function ensureGlobalDateRange() {
  const bounds = getGlobalTimeBounds();
  if (!appState.globalStartDate) appState.globalStartDate = bounds.min;
  if (!appState.globalEndDate) appState.globalEndDate = bounds.max;
  if (appState.globalStartDate < bounds.min) appState.globalStartDate = bounds.min;
  if (appState.globalEndDate > bounds.max) appState.globalEndDate = bounds.max;
  if (appState.globalStartDate > appState.globalEndDate) {
    appState.globalStartDate = bounds.min;
    appState.globalEndDate = bounds.max;
  }
}

function renderGlobalDateRangeControl() {
  if (!globalStartInputEl || !globalEndInputEl) return;
  const bounds = getGlobalTimeBounds();
  globalStartInputEl.min = bounds.min;
  globalStartInputEl.max = appState.globalEndDate || bounds.max;
  globalStartInputEl.value = appState.globalStartDate || bounds.min;
  globalEndInputEl.min = appState.globalStartDate || bounds.min;
  globalEndInputEl.max = bounds.max;
  globalEndInputEl.value = appState.globalEndDate || bounds.max;
}

function getGlobalTimeBounds() {
  const dates = [];
  data.pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.areas.forEach((area) => {
        area.widgets.forEach((widget) => {
          buildTimelineEntries(widget).forEach((entry) => {
            if (entry.date) dates.push(entry.date);
          });
        });
      });
    });
  });
  const sorted = uniqueList(dates).sort();
  const fallback = formatDateValue(new Date());
  return {
    min: sorted[0] || fallback,
    max: sorted[sorted.length - 1] || fallback,
  };
}

function applyGlobalDateRangeToLabels(widget, labels) {
  const rangeStart = appState.globalStartDate;
  const rangeEnd = appState.globalEndDate;
  if (!rangeStart && !rangeEnd) return labels;
  const datedEntries = buildTimelineEntries(widget, labels).filter((entry) => entry.date);
  if (!datedEntries.length) return labels;
  const visible = datedEntries
    .filter((entry) => (!rangeStart || entry.date >= rangeStart) && (!rangeEnd || entry.date <= rangeEnd))
    .map((entry) => entry.label);
  return visible.length ? visible : [datedEntries[0].label];
}

function buildTimelineEntries(widget, labels = inferXAxisLabels(widget)) {
  if (usesHybridDailyTimeline(widget)) return buildHybridTimelineEntries(labels);
  const grain = String(widget.grain || "");
  if (grain.includes("月")) return buildMonthlyTimelineEntries(labels);
  if (grain.includes("日")) return buildDailyTimelineEntries(labels);
  return labels.map((label) => ({ label, date: null }));
}

function buildMonthlyTimelineEntries(labels) {
  let currentYear = null;
  let previousMonth = null;
  return labels.map((label) => {
    const raw = String(label);
    const fullMatch = raw.match(/^(\d{4})-(\d{2})$/);
    const monthMatch = raw.match(/^(\d{2})$/);
    if (fullMatch) {
      currentYear = Number(fullMatch[1]);
      previousMonth = Number(fullMatch[2]);
      return { label, date: formatDateValue(new Date(currentYear, previousMonth, 0)) };
    }
    if (monthMatch) {
      const month = Number(monthMatch[1]);
      if (currentYear == null) currentYear = getReferenceYear();
      if (previousMonth != null && month < previousMonth && previousMonth !== 12) {
        currentYear += 1;
      }
      previousMonth = month;
      return { label, date: formatDateValue(new Date(currentYear, month, 0)) };
    }
    return { label, date: null };
  });
}

function buildDailyTimelineEntries(labels) {
  const pivot = getReferenceTimelinePivot();
  return labels.map((label) => {
    const raw = String(label);
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) return { label, date: null };
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = month > pivot.month ? pivot.year - 1 : pivot.year;
    return { label, date: formatDateValue(new Date(year, month - 1, day)) };
  });
}

function usesHybridDailyTimeline(widget) {
  const title = String(widget?.title || "");
  return [
    "重定价缺口率",
    "重定价规模与缺口",
    "流动性覆盖率LCR",
    "优质流动性资产HQLA",
    "生息资产规模",
  ].some((keyword) => title.includes(keyword));
}

function getReferenceTimelinePivot() {
  const candidates = [];
  data.pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.areas.forEach((area) => {
        area.widgets.forEach((widget) => {
          inferBaseXAxisLabels(widget).forEach((label) => {
            const raw = String(label);
            const fullMatch = raw.match(/^(\d{4})-(\d{2})$/);
            if (fullMatch) {
              candidates.push({ year: Number(fullMatch[1]), month: Number(fullMatch[2]) });
              return;
            }
            const monthMatch = raw.match(/^(\d{2})$/);
            if (monthMatch) {
              const year = candidates.length ? candidates[candidates.length - 1].year : new Date().getFullYear();
              candidates.push({ year, month: Number(monthMatch[1]) });
            }
          });
        });
      });
    });
  });
  const pivot = candidates.sort((left, right) => (left.year * 100 + left.month) - (right.year * 100 + right.month)).pop();
  return pivot || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

function inferBaseXAxisLabels(widget) {
  const grain = widget.grain || "";
  if (grain.includes("日")) return ["4/01", "4/03", "4/05", "4/07", "4/09", "4/11", "4/13", "4/15"];
  if (grain.includes("月")) return ["2025-07", "08", "09", "10", "11", "12", "2026-01", "02", "03", "04"];
  return ["T1", "T2", "T3", "T4", "T5", "T6"];
}

function buildHybridXAxisLabels() {
  const pivot = getReferenceTimelinePivot();
  const historyLabels = [];
  for (let offset = 9; offset >= 1; offset -= 1) {
    const date = new Date(pivot.year, pivot.month - 1 - offset, 1);
    if (historyLabels.length === 0 || date.getMonth() === 0) {
      historyLabels.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    } else {
      historyLabels.push(String(date.getMonth() + 1).padStart(2, "0"));
    }
  }
  const observationDate = getHybridObservationDate(pivot);
  const dayCount = observationDate.getDate();
  const currentMonthLabels = Array.from({ length: dayCount }, (_, index) => `${pivot.month}/${String(index + 1).padStart(2, "0")}`);
  return [...historyLabels, ...currentMonthLabels];
}

function getHybridObservationDate(pivot) {
  const monthEnd = new Date(pivot.year, pivot.month, 0);
  const today = new Date();
  const todayInPivotMonth = today.getFullYear() === pivot.year && today.getMonth() + 1 === pivot.month;
  const latestAllowedDate = todayInPivotMonth && today < monthEnd ? today : monthEnd;
  const selectedEndDate = parseDateValue(appState.globalEndDate);
  if (selectedEndDate && selectedEndDate.getFullYear() === pivot.year && selectedEndDate.getMonth() + 1 === pivot.month) {
    return selectedEndDate < latestAllowedDate ? selectedEndDate : latestAllowedDate;
  }
  return latestAllowedDate;
}

function buildHybridTimelineEntries(labels) {
  let currentYear = null;
  let previousMonth = null;
  const pivot = getReferenceTimelinePivot();
  return labels.map((label) => {
    const raw = String(label);
    const fullMatch = raw.match(/^(\d{4})-(\d{2})$/);
    const monthMatch = raw.match(/^(\d{2})$/);
    const dayMatch = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (fullMatch) {
      currentYear = Number(fullMatch[1]);
      previousMonth = Number(fullMatch[2]);
      return { label, date: formatDateValue(new Date(currentYear, previousMonth, 0)) };
    }
    if (monthMatch) {
      const month = Number(monthMatch[1]);
      if (currentYear == null) currentYear = pivot.year;
      if (previousMonth != null && month < previousMonth && previousMonth !== 12) currentYear += 1;
      previousMonth = month;
      return { label, date: formatDateValue(new Date(currentYear, month, 0)) };
    }
    if (dayMatch) {
      const month = Number(dayMatch[1]);
      const day = Number(dayMatch[2]);
      const year = month > pivot.month ? pivot.year - 1 : pivot.year;
      return { label, date: formatDateValue(new Date(year, month - 1, day)) };
    }
    return { label, date: null };
  });
}

function getReferenceYear() {
  const explicitYears = [];
  data.pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.areas.forEach((area) => {
        area.widgets.forEach((widget) => {
          inferXAxisLabels(widget).forEach((label) => {
            const match = String(label).match(/^(\d{4})-/);
            if (match) explicitYears.push(Number(match[1]));
          });
        });
      });
    });
  });
  return explicitYears.length ? Math.max(...explicitYears) : new Date().getFullYear();
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

function inferYAxisLabel(widget) {
  const metric = widget.metricDescription || "";
  if (widget.title.includes("久期")) return "久期";
  if (metric.includes("比率") || metric.includes("波动率") || widget.title.includes("比率")) return "比例 (%)";
  if (metric.includes("规模") || metric.includes("净额")) return "规模 (亿元)";
  if (metric.includes("变动")) return "变动值 (BP/亿元)";
  if (metric.includes("LCR")) return "指标值 (%)";
  return "指标值";
}

function ensureAreaFilterState(areaGroup) {
  if (!appState.areaFilters[areaGroup.id]) {
    const state = {};
    areaGroup.sharedFilters.forEach((filterLabel) => {
      const name = normalizeFilterName(filterLabel);
      const optionValues = getAreaFilterOptions(areaGroup, filterLabel);
      state[name] = getDefaultFilterValues(name, optionValues);
    });
    appState.areaFilters[areaGroup.id] = state;
  }
  return appState.areaFilters[areaGroup.id];
}

function ensureAreaSubpageState(areaGroup) {
  const tabs = getAreaSubpageTabs(areaGroup);
  if (!tabs.length) return { tabs: [], activeTab: null };
  if (!appState.areaSubpages[areaGroup.id] || !tabs.includes(appState.areaSubpages[areaGroup.id])) {
    appState.areaSubpages[areaGroup.id] = tabs[0];
  }
  return {
    tabs,
    activeTab: appState.areaSubpages[areaGroup.id],
  };
}

function getAreaSubpageConfig(areaGroup) {
  if (!areaGroup?.name) return null;
  return AREA_TAB_CONFIG[areaGroup.name] || null;
}

function getAreaSubpageTabs(areaGroup) {
  const areaTabs = getAreaSubpageConfig(areaGroup);
  if (!areaTabs) return [];
  return uniqueList(
    areaTabs
      .filter((tab) => areaGroup.viewGroups.some((viewGroup) => String(viewGroup.viewScope || "").includes(tab.matchViewScope || "")))
      .map((tab) => tab.label)
  );
}

function getAreaSubpageLabel(areaGroup, viewScope) {
  const areaTabs = getAreaSubpageConfig(areaGroup);
  if (!areaTabs) return null;
  const source = String(viewScope || "");
  const matchedTab = areaTabs.find((tab) => source.includes(tab.matchViewScope || ""));
  return matchedTab?.label || null;
}

function getVisibleAreaViewGroups(areaGroup, areaSubpage) {
  if (isBusinessChangePage()) {
    return [
      {
        id: `${areaGroup.id}-merged`,
        viewScope: "merged",
        widgets: areaGroup.viewGroups.flatMap((viewGroup) => viewGroup.widgets || []),
      },
    ];
  }

  if (["净利息收入波动率", "流动性覆盖率LCR", "超额备付金"].includes(areaGroup.name) && !areaSubpage.tabs.length) {
    return [
      {
        id: `${areaGroup.id}-merged`,
        viewScope: "merged",
        widgets: areaGroup.viewGroups.flatMap((viewGroup) => viewGroup.widgets || []),
      },
    ];
  }

  if (!areaSubpage.tabs.length) return areaGroup.viewGroups;

  if (areaGroup.name === "重定价缺口率") {
    const seriesGroups = areaGroup.viewGroups.filter(
      (viewGroup) =>
        !isGapPointViewGroup(viewGroup) &&
        getAreaSubpageLabel(areaGroup, viewGroup.viewScope) === areaSubpage.activeTab
    );
    const fixedPointGroup =
      areaGroup.viewGroups.find((viewGroup) => String(viewGroup.viewScope || "").includes("时点口径 / 时点")) ||
      areaGroup.viewGroups.find((viewGroup) => isGapPointViewGroup(viewGroup));
    return uniqueViewGroups([...seriesGroups, fixedPointGroup]);
  }

  return areaGroup.viewGroups.filter((viewGroup) => getAreaSubpageLabel(areaGroup, viewGroup.viewScope) === areaSubpage.activeTab);
}

function isGapPointViewGroup(viewGroup) {
  return String(viewGroup?.viewScope || "").includes("/ 时点");
}

function uniqueViewGroups(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function ensureWidgetFilterState(widget, widgetBehavior = getWidgetBehavior(widget)) {
  if (!widgetBehavior.localFilters.length) return {};
  if (!appState.widgetFilters[widget.seq]) {
    appState.widgetFilters[widget.seq] = {};
  }
  widgetBehavior.localFilters.forEach((filter) => {
    if (!filter?.name) return;
    const currentValues = appState.widgetFilters[widget.seq][filter.name];
    if (Array.isArray(currentValues) && currentValues.length) return;
    appState.widgetFilters[widget.seq][filter.name] = Array.isArray(filter.defaultValues) && filter.defaultValues.length
      ? [...filter.defaultValues]
      : getDefaultFilterValues(filter.name, filter.options);
  });
  return appState.widgetFilters[widget.seq];
}

function getFilterStateBucket(ownerType, ownerId) {
  if (ownerType === "widget") return appState.widgetFilters[ownerId] || {};
  return appState.areaFilters[ownerId] || {};
}

function getLegendSelection(widgetSeq, legendKey, allOptions) {
  const stateBucket = appState.widgetFilters[widgetSeq] || {};
  const current = (stateBucket[legendKey] || []).filter((value) => allOptions.includes(value));
  return current.length ? current : [...allOptions];
}

function toggleLegendSelection(widgetSeq, legendKey, filterValue, allOptions) {
  const stateBucket = appState.widgetFilters[widgetSeq] || {};
  const current = new Set(getLegendSelection(widgetSeq, legendKey, allOptions));
  if (current.has(filterValue)) {
    if (current.size > 1) current.delete(filterValue);
  } else {
    current.add(filterValue);
  }
  appState.widgetFilters[widgetSeq] = {
    ...stateBucket,
    [legendKey]: Array.from(current),
  };
}

function ensureWidgetDisplayMode(widget) {
  if (!supportsDisplayToggle(widget)) return "chart";
  if (!appState.widgetDisplayModes[widget.seq]) {
    appState.widgetDisplayModes[widget.seq] = "chart";
  }
  return appState.widgetDisplayModes[widget.seq];
}

function supportsDisplayToggle(widget) {
  return !String(widget.componentType || "").includes("表格");
}

function getDefaultFilterValues(filterName, optionValues = null) {
  const configuredDefaults = DEFAULT_FILTER_VALUES[filterName];
  if (Array.isArray(configuredDefaults) && configuredDefaults.length) {
    return [...configuredDefaults];
  }
  const options = optionValues || FILTER_OPTIONS[filterName] || ["默认口径"];
  return options.slice(0, 1);
}

function countUniqueAreas() {
  return data.pages.reduce(
    (pageSum, page) =>
      pageSum +
      page.blocks.reduce((blockSum, block) => blockSum + new Set(block.areas.map((area) => area.name)).size, 0),
    0
  );
}

function groupBlockAreas(block) {
  if (isBusinessChangePage()) {
    return [
      {
        id: `${block.id}-merged`,
        name: block.name,
        sharedFilters: uniqueList(block.areas.flatMap((area) => area.sharedFilters || [])),
        viewGroups: block.areas.map((area) => ({
          id: area.id,
          viewScope: area.viewScope,
          widgets: area.widgets,
        })),
      },
    ];
  }
  const grouped = new Map();
  block.areas.forEach((area, index) => {
    if (!grouped.has(area.name)) {
      grouped.set(area.name, {
        id: `${block.id}-group-${index + 1}`,
        name: area.name,
        sharedFilters: [],
        viewGroups: [],
      });
    }
    const target = grouped.get(area.name);
    target.sharedFilters = uniqueList([...target.sharedFilters, ...(area.sharedFilters || [])]);
    target.viewGroups.push({
      id: area.id,
      viewScope: area.viewScope,
      widgets: area.widgets,
    });
  });
  return Array.from(grouped.values());
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

function shouldRenderAreasInPairs(block, groupedAreas) {
  if (isBusinessChangePage()) return false;
  return String(block?.name || "").includes("期权性风险") && groupedAreas.length === 2;
}

function shouldSpanFullWidth(widget) {
  return widget?.layout === "full" || isRepricingScaleGapWidget(widget);
}

function isInlineWidgetFilter(widgetSeq, filterName) {
  return (
    (String(widgetSeq) === "49" && filterName === "期限长度") ||
    (String(widgetSeq) === "50" && filterName === "口径") ||
    ((String(widgetSeq) === "89" || String(widgetSeq) === "96") && filterName === "时间区间（起止）")
  );
}

function isRepricingScaleGapWidget(widget) {
  return String(widget?.title || "").includes("重定价规模与缺口");
}

function isFundingFlowScaleWidget(widget) {
  return String(widget?.title || "").includes("资金流入流出规模");
}

function isBusinessChangePage() {
  return String(appState.currentPageId || "") === "page-4";
}

function isDurationRepricingWidget(widget) {
  return String(widget?.title || "").includes("资产/负债重定价久期");
}

function isDurationGapMatrixWidget(widget) {
  return String(widget?.title || "").includes("分币种久期缺口一览表");
}

function isEveCurrencyTableWidget(widget) {
  return Number(widget?.seq) === 5 || String(widget?.title || "").includes("各币种最大经济价值变动");
}

function isEveScenarioTableWidget(widget) {
  return Number(widget?.seq) === 6 || String(widget?.title || "").includes("6种情景下经济价值变动表");
}

function isNiiVolatilityWidget(widget) {
  return String(widget?.title || "").includes("净利息收入波动及波动率");
}

function isLiquidityGapTenorWidget(widget) {
  return String(widget?.title || "").includes("流动性缺口规模（1/7/90日）");
}

function isThirtyDayLiquidityGapWidget(widget) {
  return String(widget?.title || "").includes("30日流动性缺口规模");
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return `rgba(74,143,216,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function summarizeFilterSelection(filterName, selectedValues) {
  const values = (selectedValues || []).filter(Boolean);
  if (!values.length) return `请选择${filterName}`;
  if (values.length <= 2) return values.join("、");
  return `${values.slice(0, 2).join("、")}等${values.length}项`;
}


function getCurrentPage() {
  return data.pages.find((page) => page.id === appState.currentPageId);
}

function refreshBlockPillState() {
  Array.from(blockPillsEl.querySelectorAll("[data-block-id]")).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.blockId === appState.activeBlockId);
  });
}

function queueActiveBlockSync() {
  if (activeBlockSyncQueued) return;
  activeBlockSyncQueued = true;
  window.requestAnimationFrame(() => {
    activeBlockSyncQueued = false;
    syncActiveBlockWithViewport();
  });
}

function syncActiveBlockWithViewport() {
  const page = getCurrentPage();
  if (!page?.blocks?.length) return;
  const toolbarRect = blockPillsEl.getBoundingClientRect();
  const threshold = Math.max(140, Math.round(toolbarRect.bottom + 24));
  const sections = page.blocks
    .map((block) => document.getElementById(block.id))
    .filter(Boolean);
  if (!sections.length) return;

  const coveringSections = sections
    .map((section) => ({ id: section.id, rect: section.getBoundingClientRect() }))
    .filter((item) => item.rect.top <= threshold && item.rect.bottom > threshold)
    .sort((a, b) => b.rect.top - a.rect.top);

  let bestId = sections[0].id;
  let bestDistance = Number.POSITIVE_INFINITY;

  if (coveringSections.length) {
    bestId = coveringSections[0].id;
    bestDistance = -1;
  }

  sections.forEach((section) => {
    if (bestDistance === -1) return;
    const rect = section.getBoundingClientRect();
    const distance = Math.abs(rect.top - threshold);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = section.id;
    }
  });

  if (bestId !== appState.activeBlockId) {
    appState.activeBlockId = bestId;
    refreshBlockPillState();
  }
}

function buildSeries(seed, count, frame, modifier) {
  const rawValues = mockAdapter.buildMetricValues ? mockAdapter.buildMetricValues(seed, count, modifier) : buildMetricValues(seed, count, modifier);
  return rawValues.map((raw, index) => {
    const x = getFrameXPosition(frame, index, count);
    const y = frame.bottom - (frame.height * raw) / 100;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
}

function buildMetricValues(seed, count, modifier) {
  if (mockAdapter.buildMetricValues) {
    return mockAdapter.buildMetricValues(seed, count, modifier);
  }
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin((index + seed + modifier / 11) / 1.7);
    const drift = (modifier + seed * 7 + index * 9) % 26;
    return Number((20 + (wave + 1) * 0.5 * 68 + drift).toFixed(1));
  });
}

function buildBarValues(seed, count, modifier) {
  if (mockAdapter.buildBarValues) {
    return mockAdapter.buildBarValues(seed, count, modifier);
  }
  return Array.from({ length: count }, (_, index) => 36 + ((seed * 11 + modifier + index * 17) % 120));
}

function formatMetricValue(value, yLabel) {
  if (yLabel.includes("%")) return `${Number(value).toFixed(1)}%`;
  if (yLabel.includes("亿元")) return Number(value).toFixed(1);
  return Number(value).toFixed(1);
}

function buildDefaultTableLabels(widget) {
  const title = widget.title || "";
  if (title.includes("币种")) return FILTER_OPTIONS.币种.slice(0, 4);
  if (title.includes("情景")) return FILTER_OPTIONS.情景.slice(0, 4);
  if (title.includes("机构")) return FILTER_OPTIONS.机构.slice(0, 4);
  return ["口径A", "口径B", "口径C", "口径D"];
}

function buildTableRow(label, seed, index, modifier) {
  if (mockAdapter.buildTableRow) {
    return mockAdapter.buildTableRow(label, seed, index, modifier);
  }
  return {
    name: label,
    value1: `${((seed * 13 + modifier + index * 7) % 320) + 60}`,
    value2: `${(((seed * 9 + modifier + index * 11) % 100) / 10).toFixed(1)}%`,
    flag: (index + modifier) % 2 === 0 ? "关注" : "稳定",
  };
}

function createSignature(seq, filterState) {
  const merged = Object.keys(filterState)
    .sort()
    .map((key) => `${key}:${(filterState[key] || []).join("|")}`)
    .join(";");
  return [...`${seq}-${merged}`].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function getPaletteColor(label, allLabels = [], fallbackIndex = 0) {
  const colorIndex = Array.isArray(allLabels) ? allLabels.indexOf(label) : -1;
  const paletteIndex = colorIndex >= 0 ? colorIndex : fallbackIndex;
  return SERIES_PALETTE[paletteIndex % SERIES_PALETTE.length];
}

function findWidgetBySeq(widgetSeq) {
  for (const page of data.pages || []) {
    for (const block of page.blocks || []) {
      for (const area of block.areas || []) {
        const matched = (area.widgets || []).find((widget) => Number(widget.seq) === Number(widgetSeq));
        if (matched) return { page, block, area, widget: matched };
      }
    }
  }
  return null;
}

function getPageSimulation(pageId = getCurrentPage()?.id) {
  if (!pageId) return null;
  return appState.pageSimulations[pageId] || null;
}

function getSimulationMode(page = getCurrentPage()) {
  const pageName = String(page?.name || "");
  if (pageName.includes("利率")) return "interest";
  if (pageName.includes("流动性")) return "liquidity";
  if (pageName.includes("汇率")) return "fx";
  return "generic";
}

function getDefaultSimulationDate() {
  return appState.globalEndDate || getGlobalTimeBounds().max || formatDateValue(new Date());
}

function getSimulationFieldDefs(page = getCurrentPage()) {
  const commonFields = [
    { name: "businessDate", label: "业务发生日期", type: "date" },
    { name: "org", label: "机构", type: "select", options: FILTER_OPTIONS["机构"] || ["法人汇总"] },
    { name: "currency", label: "币种", type: "select", options: FILTER_OPTIONS["币种"] || ["全折人民币"] },
    { name: "businessType", label: "业务类型", type: "select", options: BUSINESS_DURATION_OPTIONS },
    { name: "scale", label: "规模（亿元）", type: "number", min: "1", step: "1" },
    { name: "termMonths", label: "期限（月）", type: "number", min: "1", step: "1" },
  ];
  if (getSimulationMode(page) === "interest") {
    return [
      ...commonFields,
      { name: "repricingMonths", label: "重定价频率", type: "select", options: REPRICING_FREQUENCY_OPTIONS, valueKey: "value", labelKey: "label" },
      { name: "rateType", label: "定价方式", type: "select", options: RATE_TYPE_OPTIONS },
    ];
  }
  return commonFields;
}

function createDefaultSimulationDraft(page = getCurrentPage()) {
  const fieldDefs = getSimulationFieldDefs(page);
  const draft = {};
  fieldDefs.forEach((field) => {
    if (field.type === "date") draft[field.name] = getDefaultSimulationDate();
    else if (field.type === "number") draft[field.name] = field.name === "scale" ? "50" : "12";
    else if (field.options?.length) {
      const firstOption = field.options[0];
      draft[field.name] = typeof firstOption === "object" ? firstOption[field.valueKey || "value"] : firstOption;
    } else draft[field.name] = "";
  });
  return draft;
}

function renderSimulationField(field, draft) {
  const value = draft?.[field.name] ?? "";
  if (field.type === "select") {
    return `
      <label class="simulation-form__field">
        <span class="simulation-form__label">${field.label}</span>
        <select class="simulation-form__control" data-simulation-field="${field.name}">
          ${(field.options || []).map((option) => {
            const optionValue = typeof option === "object" ? option[field.valueKey || "value"] : option;
            const optionLabel = typeof option === "object" ? option[field.labelKey || "label"] : option;
            return `<option value="${optionValue}" ${String(optionValue) === String(value) ? "selected" : ""}>${optionLabel}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label class="simulation-form__field">
      <span class="simulation-form__label">${field.label}</span>
      <input class="simulation-form__control" data-simulation-field="${field.name}" type="${field.type}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.step ? `step="${field.step}"` : ""} />
    </label>
  `;
}

function normalizeSimulationRecord(page, draft) {
  const normalized = { ...draft };
  normalized.businessDate = String(normalized.businessDate || getDefaultSimulationDate());
  normalized.scale = Math.max(1, Number(normalized.scale || 0));
  normalized.termMonths = Math.max(1, Number(normalized.termMonths || 0));
  if (getSimulationMode(page) === "interest") normalized.repricingMonths = String(normalized.repricingMonths || "3");
  return normalized;
}

function renderSimulationSummary(pageId = getCurrentPage()?.id) {
  const simulation = getPageSimulation(pageId);
  if (!simulation) return "";
  return `
    <div class="simulation-summary">
      <span class="simulation-summary__item">业务发生日期：${simulation.businessDate}</span>
      <span class="simulation-summary__item">机构：${simulation.org}</span>
      <span class="simulation-summary__item">币种：${simulation.currency}</span>
      <span class="simulation-summary__item">业务类型：${simulation.businessType}</span>
      <span class="simulation-summary__item">规模：${simulation.scale}亿元</span>
      <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}">调整模拟测算</button>
      <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
    </div>
  `;
}

function renderSimulationModal() {
  const page = data.pages.find((item) => item.id === appState.simulationModalPageId);
  if (!page) {
    simulationModalEl.innerHTML = "";
    simulationModalEl.classList.remove("is-open");
    simulationModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const draft = appState.simulationDraft || createDefaultSimulationDraft(page);
  simulationModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--wide" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">模拟测算</div>
          <h3 id="simulationModalTitle">${page.name}模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      <div class="simulation-form">
        ${getSimulationFieldDefs(page).map((field) => renderSimulationField(field, draft)).join("")}
      </div>
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}">应用测算</button>
      </div>
    </section>
  `;
  simulationModalEl.classList.add("is-open");
  simulationModalEl.setAttribute("aria-hidden", "false");
}

function buildInsightTrendSeries(widget) {
  const labels = inferXAxisLabels(widget);
  const values = buildMetricValues(widget.seq, labels.length, widget.seq * 7);
  return labels.map((label, index) => ({ label, value: Number(values[index] || 0) }));
}

function formatInsightRateText(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function buildTrendInsightStats(series) {
  const values = series.map((item) => Number(item.value || 0));
  const current = values[values.length - 1] || 0;
  const prev = values[Math.max(0, values.length - 2)] || current;
  const yearStart = values[0] || current;
  const mom = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  const ytd = yearStart ? ((current - yearStart) / Math.abs(yearStart)) * 100 : 0;
  const cumulative = values.length > 1 ? ((current - values[0]) / Math.abs(values[0] || 1)) * 100 : 0;
  return {
    current,
    momText: formatInsightRateText(mom),
    yoyText: "同比可比样本暂不完整，建议后续接入真实历史同期数据后补充。",
    ytdText: formatInsightRateText(ytd),
    cumulativeText: formatInsightRateText(cumulative),
  };
}

function buildWidgetInsight(context) {
  const series = buildInsightTrendSeries(context.widget);
  const primaryStats = buildTrendInsightStats(series);
  return `${context.widget.title}当前取值约为 ${primaryStats.current.toFixed(1)}。环比变动 ${primaryStats.momText}，较年初变动 ${primaryStats.ytdText}，区间累计增速 ${primaryStats.cumulativeText}。${primaryStats.yoyText} 综合来看，当前指标位于近期波动区间内，建议结合机构、币种和业务结构进一步定位主要驱动项。`;
}

function renderInsightModal() {
  const target = findWidgetBySeq(appState.insightWidgetSeq);
  if (!target?.widget) {
    insightModalEl.innerHTML = "";
    insightModalEl.classList.remove("is-open");
    insightModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  insightModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="insightModal"></div>
    <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="insightModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">AI智能分析</div>
          <h3 id="insightModalTitle">${target.widget.title}</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="insightModal">关闭</button>
      </div>
      <div class="insight-panel insight-panel--single">
        <div class="insight-panel__section">
          <h4>智能结论</h4>
          <p>${buildWidgetInsight(target)}</p>
        </div>
      </div>
    </section>
  `;
  insightModalEl.classList.add("is-open");
  insightModalEl.setAttribute("aria-hidden", "false");
}

function getSimulationProfile(page, simulation) {
  const side = BUSINESS_SIDE_MAP[simulation.businessType] || "asset";
  const scaleWeight = Math.min(1.4, Number(simulation.scale || 0) / 120);
  const tenorWeight = Math.min(1.2, Number(simulation.termMonths || 0) / 24);
  const fxWeight = String(page?.name || "").includes("汇率") && !["人民币", "全折人民币"].includes(simulation.currency) ? 1.18 : 1;
  return {
    side,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07) * fxWeight).toFixed(3),
  };
}

function shouldRenderSimulationOverlay(widget, chartContext) {
  if (!chartContext?.pageId) return false;
  if (!getPageSimulation(chartContext.pageId)) return false;
  if (!isSimulationPage(data.pages.find((page) => page.id === chartContext.pageId))) return false;
  if (String(widget?.componentType || "").includes("表格")) return false;
  if (String(widget?.title || "").includes("分布") || String(widget?.title || "").includes("占比")) return false;
  return true;
}

function getSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const page = data.pages.find((item) => item.id === chartContext.pageId) || getCurrentPage();
  const profile = getSimulationProfile(page, simulation);
  const title = String(widget?.title || "");
  let sensitivity = title.includes("久期") ? 0.18 : title.includes("缺口") ? 0.16 : title.includes("波动") ? 0.15 : title.includes("变动") ? 0.14 : title.includes("规模及增速") ? 0.13 : 0.11;
  let direction = 1;
  const isLiabilitySeries = role.includes("liability") || role.includes("负债");
  const isGapSeries = role.includes("gap") || role.includes("差额");
  const isWholesaleLiability = ["同业负债", "发行债券", "表外衍生品应付"].includes(simulation.businessType);
  if (String(page?.name || "").includes("利率")) {
    direction = profile.side === "asset" ? 1 : -1;
    if (isLiabilitySeries) direction *= -1;
    if (isGapSeries) direction *= profile.side === "asset" ? 0.92 : -0.68;
    if (simulation.rateType === "浮动利率") sensitivity *= 0.74;
  } else if (String(page?.name || "").includes("流动性")) {
    if (title.includes("覆盖率") || title.includes("LCR")) direction = profile.side === "asset" ? -1 : (isWholesaleLiability ? -0.72 : 0.9);
    else if (title.includes("缺口") || title.includes("融资")) direction = profile.side === "asset" ? 0.88 : (isWholesaleLiability ? 1 : -0.56);
    else direction = profile.side === "asset" ? 0.74 : (isWholesaleLiability ? 0.82 : -0.42);
  } else {
    sensitivity *= ["人民币", "全折人民币"].includes(simulation.currency) ? 0.45 : 1.14;
    direction = ["人民币", "全折人民币"].includes(simulation.currency) ? 0.34 : 1;
    if (profile.side === "liability" && (seriesLabel || "").includes("负债")) direction *= 0.82;
  }
  const variation = 1 + (((widget.seq + seriesIndex * 17) % 9) - 4) * 0.035;
  return clampNumber(profile.impactScore * sensitivity * direction * variation, -0.22, 0.22);
}

function renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions) {
  if (!shouldRenderSimulationOverlay(widget, chartContext) || !seriesDefinitions?.length) return "";
  const simulation = getPageSimulation(chartContext.pageId);
  const overlays = seriesDefinitions.slice(0, 4).map((definition, index) => {
    const lastPoint = definition.points?.[definition.points.length - 1];
    if (!lastPoint) return "";
    const adjustmentRatio = getSimulationAdjustmentRatio(widget, chartContext, simulation, definition.label, index, definition.role || "line");
    const simulatedY = clampNumber(lastPoint.y - frame.height * adjustmentRatio, frame.top + 8, frame.bottom - 8);
    const labelX = clampNumber(lastPoint.x + 16, frame.left + 16, frame.right - 36);
    const labelY = clampNumber(simulatedY - 12 - index * 10, frame.top + 14, frame.bottom - 10);
    return `
      <line x1="${lastPoint.x}" y1="${lastPoint.y}" x2="${lastPoint.x}" y2="${simulatedY}" stroke="${SIMULATION_COLOR}" stroke-width="2.4" stroke-dasharray="5 4" opacity="0.86"></line>
      <circle cx="${lastPoint.x}" cy="${simulatedY}" r="9" fill="${SIMULATION_FILL}" opacity="0.95"></circle>
      <path d="${buildDiamondPath(lastPoint.x, simulatedY, 5.6)}" fill="${SIMULATION_COLOR}" stroke="#ffffff" stroke-width="1.8"></path>
      ${index < 2 ? `<text x="${labelX}" y="${labelY}" class="chart-simulation-label">模拟</text>` : ""}
    `;
  }).join("");
  return `
    <g class="chart-simulation-overlay">
      <g transform="translate(${frame.right - 108}, ${frame.top + 12})">
        <path d="${buildDiamondPath(0, 0, 5.2)}" fill="${SIMULATION_COLOR}" stroke="#ffffff" stroke-width="1.6"></path>
        <text x="11" y="4" class="chart-simulation-key">模拟后最新值</text>
      </g>
      ${overlays}
    </g>
  `;
}

function buildDiamondPath(cx, cy, size) {
  return `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
}

function buildFundingFlowCompositeState(widget, chartContext) {
  const historyLabels = inferBaseXAxisLabels(widget).slice(0, 6);
  const historyInflow = buildMetricValues(widget.seq + 5, historyLabels.length, chartContext.signature).map((value) => 38 + (value % 34));
  const historyOutflow = buildMetricValues(widget.seq + 11, historyLabels.length, chartContext.signature + 13).map((value) => 34 + (value % 38));
  const baseDate = parseDateValue(getGlobalTimeBounds().max) || new Date();
  const futureLabels = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + index + 1);
    return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`;
  });
  const dailyNet = futureLabels.map((_, index) => ((index % 3 === 0 ? 1 : -1) * (12 + (index * 7) % 24)));
  const cumulativeNet = dailyNet.reduce((acc, value) => {
    acc.push((acc[acc.length - 1] || 0) + value);
    return acc;
  }, []);
  return {
    history: { labels: historyLabels, inflow: historyInflow, outflow: historyOutflow },
    future: { labels: futureLabels, dailyNet, cumulativeNet },
  };
}

function renderFundingFlowCompositeChart(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  const leftContext = { ...chartContext, xLabels: flowState.history.labels, yLabel: "规模 (亿元)" };
  const rightContext = { ...chartContext, xLabels: flowState.future.labels, yLabel: "净额 / 累计净额" };
  const leftFrame = createFrame(flowState.history.labels.length);
  const rightFrame = createFrame(flowState.future.labels.length);
  const leftAxis = renderAxes(leftFrame, leftContext.xLabels, leftContext.yLabel);
  const rightAxis = renderAxes(rightFrame, rightContext.xLabels, rightContext.yLabel);
  const leftPointsIn = flowState.history.inflow.map((value, index) => ({ x: getFrameXPosition(leftFrame, index, flowState.history.labels.length), y: leftFrame.bottom - (leftFrame.height * value) / 100 }));
  const leftPointsOut = flowState.history.outflow.map((value, index) => ({ x: getFrameXPosition(leftFrame, index, flowState.history.labels.length), y: leftFrame.bottom - (leftFrame.height * value) / 100 }));
  const barWidth = Math.max(10, getFrameMinStep(rightFrame, flowState.future.labels.length) * 0.38);
  const bars = flowState.future.dailyNet.map((value, index) => {
    const baseY = rightFrame.bottom - (rightFrame.height * 20) / 100;
    const height = Math.abs(value) * 2.6;
    const x = getFrameXPosition(rightFrame, index, flowState.future.labels.length) - barWidth / 2;
    const y = value >= 0 ? baseY - height : baseY;
    const fill = value >= 0 ? "rgba(95, 143, 132, 0.72)" : "rgba(200, 132, 98, 0.82)";
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${fill}"></rect>`;
  }).join("");
  const cumulativePoints = flowState.future.cumulativeNet.map((value, index) => {
    const normalized = clampNumber(45 + value * 0.6, 2, 98);
    return { x: getFrameXPosition(rightFrame, index, flowState.future.labels.length), y: rightFrame.bottom - (rightFrame.height * normalized) / 100 };
  });
  return `
    <div class="chart-shell chart-shell--split">
      <section class="chart-panel">
        <h5 class="chart-panel__title">资金流入流出规模</h5>
        <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          ${leftAxis}
          <polyline fill="none" stroke="#BC6F51" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${leftPointsIn.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${leftPointsIn.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#BC6F51" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
          <polyline fill="none" stroke="#5F8F84" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${leftPointsOut.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${leftPointsOut.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#5F8F84" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
        </svg>
      </section>
      <section class="chart-panel">
        <h5 class="chart-panel__title">未来逐日资金流</h5>
        <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          ${rightAxis}
          ${bars}
          <polyline fill="none" stroke="#2F6FA3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${cumulativePoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${cumulativePoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#2F6FA3" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
        </svg>
      </section>
    </div>
  `;
}

function renderFundingFlowCompositeDataView(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--split">
      <section class="chart-panel">
        <h5 class="chart-panel__title">资金流入流出规模</h5>
        <div class="table-shell">
          <table class="chart-table">
            <thead>
              <tr>
                <th>${inferXAxisTitle(flowState.history.labels)}</th>
                <th>资金流入</th>
                <th>资金流出</th>
              </tr>
            </thead>
            <tbody>
              ${flowState.history.labels.map((label, index) => `
                <tr>
                  <td>${label}</td>
                  <td>${flowState.history.inflow[index].toFixed(1)}</td>
                  <td>${flowState.history.outflow[index].toFixed(1)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
      <section class="chart-panel">
        <h5 class="chart-panel__title">未来逐日资金流</h5>
        <div class="table-shell">
          <table class="chart-table">
            <thead>
              <tr>
                <th>统计日期</th>
                <th>当日净额</th>
                <th>累计净额</th>
              </tr>
            </thead>
            <tbody>
              ${flowState.future.labels.map((label, index) => `
                <tr>
                  <td>${label}</td>
                  <td>${flowState.future.dailyNet[index].toFixed(1)}</td>
                  <td>${flowState.future.cumulativeNet[index].toFixed(1)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}


pageTabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-id]");
  if (!button) return;
  appState.currentPageId = button.dataset.pageId;
  appState.activeBlockId = getCurrentPage()?.blocks[0]?.id || null;
  render();
});

blockPillsEl.addEventListener("click", (event) => {
  const openSimulationButton = event.target.closest("[data-open-simulation]");
  if (openSimulationButton) {
    const pageId = openSimulationButton.dataset.openSimulation || getCurrentPage()?.id;
    const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
    appState.simulationModalPageId = pageId;
    appState.simulationDraft = { ...(getPageSimulation(pageId) || createDefaultSimulationDraft(page)) };
    render();
    return;
  }
  const button = event.target.closest("[data-block-id]");
  if (!button) return;
  appState.activeBlockId = button.dataset.blockId;
  render();
  document.getElementById(appState.activeBlockId)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

if (globalStartInputEl) {
  globalStartInputEl.addEventListener("change", (event) => {
    const bounds = getGlobalTimeBounds();
    appState.globalStartDate = event.target.value || bounds.min;
    if (appState.globalStartDate > (appState.globalEndDate || bounds.max)) appState.globalEndDate = appState.globalStartDate;
    render();
  });
}

if (globalEndInputEl) {
  globalEndInputEl.addEventListener("change", (event) => {
    const bounds = getGlobalTimeBounds();
    appState.globalEndDate = event.target.value || bounds.max;
    if (appState.globalEndDate < (appState.globalStartDate || bounds.min)) appState.globalStartDate = appState.globalEndDate;
    render();
  });
}

dashboardViewEl.addEventListener("click", (event) => {
  const subtabButton = event.target.closest("[data-area-subtab]");
  if (subtabButton) {
    const { areaSubtab, tabName } = subtabButton.dataset;
    appState.areaSubpages[areaSubtab] = tabName;
    render();
    return;
  }

  const modeButton = event.target.closest("[data-widget-mode]");
  if (modeButton) {
    const { widgetMode, mode } = modeButton.dataset;
    appState.widgetDisplayModes[widgetMode] = mode;
    render();
    return;
  }

  const openSimulationButton = event.target.closest("[data-open-simulation]");
  if (openSimulationButton) {
    const pageId = openSimulationButton.dataset.openSimulation || getCurrentPage()?.id;
    const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
    appState.simulationModalPageId = pageId;
    appState.simulationDraft = { ...(getPageSimulation(pageId) || createDefaultSimulationDraft(page)) };
    render();
    return;
  }

  const clearSimulationButton = event.target.closest("[data-clear-simulation]");
  if (clearSimulationButton) {
    delete appState.pageSimulations[clearSimulationButton.dataset.clearSimulation];
    render();
    return;
  }

  const openInsightButton = event.target.closest("[data-open-insight]");
  if (openInsightButton) {
    appState.insightWidgetSeq = Number(openInsightButton.dataset.openInsight);
    render();
    return;
  }

  const filterToggle = event.target.closest("[data-filter-toggle]");
  if (filterToggle) {
    const { ownerType, ownerId, filterName } = filterToggle.dataset;
    const key = buildFilterKey(ownerType, ownerId, filterName);
    appState.openFilterKey = appState.openFilterKey === key ? null : key;
    render();
    return;
  }

  const filterOption = event.target.closest("[data-filter-option]");
  if (filterOption) {
    const { ownerType, ownerId, filterName, filterValue } = filterOption.dataset;
    const stateBucket = getFilterStateBucket(ownerType, ownerId);
    const current = new Set(stateBucket[filterName] || []);
    if (current.has(filterValue)) current.delete(filterValue);
    else current.add(filterValue);
    stateBucket[filterName] = current.size ? Array.from(current) : [filterValue];
    appState.openFilterKey = buildFilterKey(ownerType, ownerId, filterName);
    if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
    else appState.areaFilters[ownerId] = stateBucket;
    render();
    return;
  }

  const legendToggle = event.target.closest("[data-legend-toggle]");
  if (legendToggle) {
    const { widgetSeq, filterName, filterValue, legendKey } = legendToggle.dataset;
    if (legendKey) {
      const allOptions = Array.from(
        dashboardViewEl.querySelectorAll(`[data-widget-seq="${widgetSeq}"][data-legend-key="${legendKey}"]`)
      ).map((item) => item.dataset.filterValue).filter(Boolean);
      toggleLegendSelection(widgetSeq, legendKey, filterValue, allOptions);
      render();
      return;
    }
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    const widgetBehavior = getWidgetBehavior({ seq: Number(widgetSeq) });
    const filterConfig = widgetBehavior.localFilters.find((item) => item.name === filterName);
    const allOptions = (filterConfig?.options || []).filter(Boolean);
    const current = new Set((widgetState[filterName] || allOptions).filter(Boolean));
    if (current.has(filterValue)) {
      if (current.size > 1) current.delete(filterValue);
    } else {
      current.add(filterValue);
    }
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      [filterName]: Array.from(current),
    };
    render();
    return;
  }

});

simulationModalEl.addEventListener("input", (event) => {
  const field = event.target.closest("[data-simulation-field]");
  if (!field) return;
  appState.simulationDraft = {
    ...(appState.simulationDraft || {}),
    [field.dataset.simulationField]: field.value,
  };
});

simulationModalEl.addEventListener("change", (event) => {
  const field = event.target.closest("[data-simulation-field]");
  if (!field) return;
  appState.simulationDraft = {
    ...(appState.simulationDraft || {}),
    [field.dataset.simulationField]: field.value,
  };
});

simulationModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='simulationModal']");
  if (closeButton) {
    appState.simulationModalPageId = null;
    appState.simulationDraft = null;
    render();
    return;
  }
  const applyButton = event.target.closest("[data-apply-simulation]");
  if (applyButton) {
    const page = data.pages.find((item) => item.id === applyButton.dataset.applySimulation) || getCurrentPage();
    appState.pageSimulations[page.id] = normalizeSimulationRecord(page, appState.simulationDraft || createDefaultSimulationDraft(page));
    appState.simulationModalPageId = null;
    appState.simulationDraft = null;
    render();
  }
});

insightModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='insightModal']");
  if (!closeButton) return;
  appState.insightWidgetSeq = null;
  render();
});

filterPopoverEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-filter-modal-close]");
  if (closeButton) {
    appState.openFilterKey = null;
    render();
    return;
  }

  const filterOption = event.target.closest("[data-filter-option]");
  if (filterOption) {
    const { ownerType, ownerId, filterName, filterValue } = filterOption.dataset;
    const stateBucket = getFilterStateBucket(ownerType, ownerId);
    const current = new Set(stateBucket[filterName] || []);
    if (current.has(filterValue)) current.delete(filterValue);
    else current.add(filterValue);
    stateBucket[filterName] = current.size ? Array.from(current) : [filterValue];
    if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
    else appState.areaFilters[ownerId] = stateBucket;
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (appState.simulationModalPageId) {
      appState.simulationModalPageId = null;
      appState.simulationDraft = null;
      render();
      return;
    }
    if (appState.insightWidgetSeq != null) {
      appState.insightWidgetSeq = null;
      render();
      return;
    }
    if (appState.openFilterKey) {
      appState.openFilterKey = null;
      render();
    }
  }
});

window.addEventListener("scroll", queueActiveBlockSync, { passive: true });
window.addEventListener("resize", queueActiveBlockSync);

render();
