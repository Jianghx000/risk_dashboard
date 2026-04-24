const data = window.dashboardData;
const config = window.dashboardConfig || {};
const mockAdapter = window.dashboardMockAdapter || {};
const FILTER_OPTIONS = config.filters?.options || config.filterOptions || {};
const FILTER_PRESET_CONFIG = config.filters?.presets || {};
const AREA_FILTER_OPTION_OVERRIDES = config.filters?.areaOverrides || {};
const DEFAULT_FILTER_VALUES = config.filters?.defaults || config.defaultFilters || {};
const AREA_TAB_CONFIG = config.tabs || config.areaSubpages || {};
const PAGE_BEHAVIOR_CONFIG = config.pageBehavior || {};
const BLOCK_DISPLAY_CONFIG = config.blockDisplay || {};
const AREA_DISPLAY_CONFIG = config.areaDisplay || {};
const LAYOUT_RULE_CONFIG = config.layoutRules || {};
const WIDGET_BEHAVIOR_CONFIG = config.widgetBehavior || {};
const WIDGET_FILTER_CONFIG = config.widgetFilters || {};
const WIDGET_FILTER_PRESET_CONFIG = config.widgetFilterPresets || {};
const SERIES_RULE_CONFIG = config.seriesRules || {};
const VISUAL_RULE_CONFIG = config.visualRules || {};
const SIMULATION_RULE_CONFIG = config.simulationRules || {};
const TABLE_TEMPLATE_CONFIG = config.tableTemplates || {};
const DETAIL_TABLE_CONFIG = config.detailTables || {};
const MANAGEMENT_LIMIT_CONFIG = Array.isArray(config.managementLimits) ? config.managementLimits : [];
const BUSINESS_DURATION_OPTIONS = ["自营贷款", "债券投资", "同业资产", "存放央行", "内部交易资产", "活期存款", "定期存款", "同业负债", "发行债券", "内部交易负债", "表外衍生品应收", "表外衍生品应付"];
const LIQUIDITY_GAP_TENOR_OPTIONS = ["1D", "7D", "3M"];
const DEFAULT_SERIES_DIMENSION_ORDER = ["利率情景", "情景", "机构", "币种", "贷款类型", "存款类型", "期限长度", "业务类型"];
const DEFAULT_SERIES_LABEL_MAP = {
  利率情景: "情景",
  情景: "情景",
  机构: "机构",
  币种: "币种",
  贷款类型: "贷款类型",
  存款类型: "存款类型",
  期限长度: "期限",
  业务类型: "业务类型",
};
const DEFAULT_LINE_SERIES_PALETTE = ["#C36E49", "#3F76B7", "#4F978B", "#C8943A", "#7D72AF", "#B86556", "#5E463A", "#6F9688"];
const DEFAULT_BAR_SERIES_PALETTE = ["#5E97D1", "#71B7A8", "#8C7FD0", "#D4A55D", "#7FAFDF", "#8FC6BB", "#B39CD9", "#E2BE85"];
const LINE_SERIES_PALETTE = Array.isArray(VISUAL_RULE_CONFIG.palette?.line) && VISUAL_RULE_CONFIG.palette.line.length
  ? VISUAL_RULE_CONFIG.palette.line
  : DEFAULT_LINE_SERIES_PALETTE;
const BAR_SERIES_PALETTE = Array.isArray(VISUAL_RULE_CONFIG.palette?.bar) && VISUAL_RULE_CONFIG.palette.bar.length
  ? VISUAL_RULE_CONFIG.palette.bar
  : DEFAULT_BAR_SERIES_PALETTE;
const SEMANTIC_COLORS = {
  gapLine: VISUAL_RULE_CONFIG.palette?.semantic?.gapLine || LINE_SERIES_PALETTE[0],
  fundingInflow: VISUAL_RULE_CONFIG.palette?.semantic?.fundingInflow || LINE_SERIES_PALETTE[0],
  fundingOutflow: VISUAL_RULE_CONFIG.palette?.semantic?.fundingOutflow || LINE_SERIES_PALETTE[2],
  fundingDailyNetPositive: VISUAL_RULE_CONFIG.palette?.semantic?.fundingDailyNetPositive || BAR_SERIES_PALETTE[0],
  fundingDailyNetNegative: VISUAL_RULE_CONFIG.palette?.semantic?.fundingDailyNetNegative || BAR_SERIES_PALETTE[3],
  fundingCumulative: VISUAL_RULE_CONFIG.palette?.semantic?.fundingCumulative || LINE_SERIES_PALETTE[1],
};
const SIMULATION_COLOR = VISUAL_RULE_CONFIG.palette?.semantic?.simulationLine || "#2F6FA3";
const SIMULATION_FILL = VISUAL_RULE_CONFIG.palette?.semantic?.simulationFill || "rgba(47, 111, 163, 0.16)";
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
  内部交易负债: "liability",
  表外衍生品应收: "asset",
  表外衍生品应付: "liability",
};
const BUSINESS_STRUCTURE_GROUPS = [
  {
    category: "生息资产",
    items: ["自营贷款", "债券投资", "同业资产", "存放央行", "内部交易资产"],
  },
  {
    category: "付息负债",
    items: ["活期存款", "定期存款", "同业负债", "发行债券", "内部交易负债"],
  },
  {
    category: "表外衍生品",
    items: ["表外衍生品应收", "表外衍生品应付"],
  },
];
const BUSINESS_DETAIL_SCOPE_META = {
  stock: {
    label: "存量业务",
    emptyTitle: "选择业务类型查看存量业务穿透明细",
    emptyDescription: "请先在上方“资产负债结构一览表”中点击某个业务类型的“查看明细”，定位到具体业务。",
    amountLabel: "余额",
    dateMode: "snapshot",
  },
  new: {
    label: "新发生业务",
    emptyTitle: "选择业务类型查看新发生业务穿透明细",
    emptyDescription: "请先在上方“新发生业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看该时间区间内的具体业务。",
    amountLabel: "本期发生额",
    dateMode: "range",
  },
  maturity: {
    label: "到期业务",
    emptyTitle: "选择业务类型查看到期业务穿透明细",
    emptyDescription: "请先在上方“到期业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看该时间区间内的具体业务。",
    amountLabel: "到期金额",
    dateMode: "range",
  },
};

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
  businessDrilldowns: {},
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
  return Boolean(getPageBehavior(page).simulationMode);
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
  const renderedAreas = groupedAreas.map((areaGroup) => renderAreaCard(areaGroup, block)).filter(Boolean);
  if (!renderedAreas.length) return "";
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
          ${renderedAreas.join("")}
        </div>
      </div>
    </section>
  `;
}

function renderAreaCard(areaGroup, block) {
  const areaState = ensureAreaFilterState(areaGroup);
  const areaSubpage = ensureAreaSubpageState(areaGroup, areaState);
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
  const visibleViewGroups = getVisibleAreaViewGroups(areaGroup, areaSubpage, block);
  if (!visibleViewGroups.length) return "";

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
  const viewScopedState = getViewGroupScopedAreaState(areaGroup, viewGroup, areaState);
  return `
    <section class="area-view-group">
      <div class="widgets-grid">
        ${viewGroup.widgets.map((widget) => renderWidgetCard(areaGroup, widget, viewScopedState)).join("")}
      </div>
    </section>
  `;
}

function getViewGroupScopedAreaState(areaGroup, viewGroup, areaState) {
  const scopedState = {};
  Object.keys(areaState || {}).forEach((key) => {
    scopedState[key] = [...(areaState[key] || [])];
  });
  const matchedTab = getAreaSubpageMatch(areaGroup, viewGroup);
  if (matchedTab && Array.isArray(matchedTab.matchInstitutions) && matchedTab.matchInstitutions.length) {
    scopedState["机构"] = matchedTab.matchInstitutions.filter(Boolean);
  }
  return scopedState;
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
      <div class="widget-card__header widget-card__header--clean">
        <h4 class="widget-card__title">${getWidgetDisplayTitle(widget)}</h4>
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
  const behavior = getConfiguredWidgetBehavior(widget);
  const chartKind = behavior.chartKind;
  const chartRendererRegistry = {
    fundingFlowScale: renderFundingFlowScaleChart,
    futureFundingFlow: renderFutureFundingFlowChart,
    liquidityGapTenor: renderLiquidityGapTenorChart,
    thirtyDayLiquidityGap: renderThirtyDayLiquidityGapChart,
    reserveRatioScaleCombo: renderReserveRatioScaleChart,
    liquidityAssetLiabilityBars: renderLiquidityAssetLiabilityBarsChart,
    durationGapCombo: renderDurationGapComboChart,
    repricingScaleGap: renderRepricingScaleGapChart,
    balanceScaleGrowth: renderBalanceScaleGrowthChart,
    businessScaleGrowth: renderBusinessScaleGrowthChart,
    businessDurationRepricing: renderBusinessDurationRepricingChart,
    durationRepricing: renderDurationRepricingChart,
    niiVolatility: renderNiiVolatilityComboChart,
    maturityDistribution: renderMaturityDistributionChart,
  };
  if (behavior.tableKind) return renderTable(widget, chartContext);
  if (chartKind && chartRendererRegistry[chartKind]) return chartRendererRegistry[chartKind](widget, chartContext);
  if (type.includes("表格")) return renderTable(widget, chartContext);
  if (type.includes("期限分布")) return renderMaturityDistributionChart(widget, chartContext);
  if (type.includes("双轴") || type.includes("组合")) return renderComboChart(widget, chartContext);
  if (isDonutWidget(widget) || type.includes("分布")) return renderDonut(widget, chartContext);
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

  const widgetBehavior = getWidgetBehavior(widget);
  const seriesSelection = chooseSeriesSelection(widget, normalizedState);
  const legendFilter = widgetBehavior.localFilters.find(
    (filter) => filter?.renderMode === "legend" && Array.isArray(filter.options) && filter.options.length
  );
  let allSeriesList = [...seriesSelection.values];
  let defaultLegendSelection = null;
  if (legendFilter && allSeriesList.every((value) => legendFilter.options.includes(value))) {
    allSeriesList = [...legendFilter.options];
    const configuredDefaults = (normalizedState[legendFilter.name] || []).filter((value) => allSeriesList.includes(value));
    defaultLegendSelection = configuredDefaults.length ? configuredDefaults : null;
  }
  const explicitLegendSelection = ((appState.widgetFilters[widget.seq] || {})["__legend_series__"] || []).filter((value) =>
    allSeriesList.includes(value)
  );
  const legendSeriesList = explicitLegendSelection.length
    ? explicitLegendSelection
    : defaultLegendSelection?.length
      ? [...defaultLegendSelection]
      : getLegendSelection(widget.seq, "__legend_series__", allSeriesList);
  const xLabels = applyGlobalDateRangeToLabels(widget, inferXAxisLabels(widget, normalizedState), normalizedState);
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
  const configuredBehavior = getConfiguredWidgetBehavior(widget);
  const localFilterMap = new Map();
  const suppressSeriesFilters = new Set();
  const enableSeriesFilters = new Set();

  const widgetFilters = resolveWidgetFilterEntries(WIDGET_FILTER_CONFIG[String(widget.seq)] || WIDGET_FILTER_CONFIG[widget.seq] || []);
  widgetFilters.forEach((filter) => {
    if (!filter?.name) return;
    localFilterMap.set(filter.name, { ...filter });
  });

  resolveWidgetFilterEntries(configuredBehavior.localFilters || []).forEach((filter) => {
    if (!filter?.name) return;
    localFilterMap.set(filter.name, { ...filter });
  });

  (configuredBehavior.seriesFilters?.suppress || []).forEach((filterName) => suppressSeriesFilters.add(filterName));
  (configuredBehavior.seriesFilters?.allow || []).forEach((filterName) => enableSeriesFilters.add(filterName));

  if (supportsFrequencyToggle(widget) && !localFilterMap.has("频率")) {
    localFilterMap.set("频率", {
      name: "频率",
      label: "频率",
      options: ["月频", "日频"],
      defaultValues: ["月频"],
      renderMode: "segmented",
    });
  }

  return {
    localFilters: Array.from(localFilterMap.values()),
    suppressSeriesFilters: Array.from(suppressSeriesFilters),
    enableSeriesFilters: Array.from(enableSeriesFilters),
  };
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
        .map((filter) =>
          filter.renderMode === "segmented"
            ? renderWidgetSegmentedFilter(widgetSeq, filter.name, filter.label || filter.name, widgetState[filter.name] || filter.defaultValues || [], filter.options || [])
            : renderFilterGroup("widget", widgetSeq, filter.label || filter.name, widgetState[filter.name] || [], filter.options)
        )
        .join("")}
    </div>
  `;
}

function renderWidgetSegmentedFilter(widgetSeq, filterName, filterLabel, selectedValues, options) {
  const activeValue = (selectedValues || []).find((value) => options.includes(value)) || options[0] || "";
  return `
    <div class="widget-segmented-filter">
      <span class="widget-segmented-filter__label">${filterLabel}</span>
      <div class="widget-segmented-filter__group" role="tablist" aria-label="${filterLabel}">
        ${options
          .map(
            (option) => `
              <button
                class="widget-segmented-filter__btn ${option === activeValue ? "is-active" : ""}"
                type="button"
                role="tab"
                aria-selected="${option === activeValue}"
                data-segmented-filter="true"
                data-widget-seq="${widgetSeq}"
                data-filter-name="${filterName}"
                data-filter-value="${option}"
              >${option}</button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function chooseSeriesSelection(widget, filterState) {
  const widgetBehavior = getWidgetBehavior(widget);
  const configuredBehavior = getConfiguredWidgetBehavior(widget);
  const suppressedFilters = new Set(widgetBehavior.suppressSeriesFilters || []);
  const enabledSeriesFilters = new Set(widgetBehavior.enableSeriesFilters || []);
  const maxSeries = Number.isFinite(Number(configuredBehavior.maxSeries))
    ? Number(configuredBehavior.maxSeries)
    : Number(SERIES_RULE_CONFIG.defaultMaxSeries) || 8;
  const dimensionOrder = Array.isArray(SERIES_RULE_CONFIG.dimensionOrder) && SERIES_RULE_CONFIG.dimensionOrder.length
    ? SERIES_RULE_CONFIG.dimensionOrder
    : DEFAULT_SERIES_DIMENSION_ORDER;
  const labelMap = { ...DEFAULT_SERIES_LABEL_MAP, ...(SERIES_RULE_CONFIG.labelMap || {}) };
  const dimConfigs = dimensionOrder.map((key) => ({ key, label: labelMap[key] || key }));

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
    const combinations = cartesianProduct(multiDims.map((item) => item.values)).slice(0, maxSeries);
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
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const seriesDefinitions = [];
  const seriesMarkup = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index, "line");
      const points = buildSeries(widget.seq + index * 17, chartContext.xLabels.length, frame, chartContext.signature + index * 31);
      seriesDefinitions.push({ label, points, role: label.includes("负债") ? "liability" : "line" });
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${index === 0 ? 4 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${index === 0 ? 4.2 : 3.5}" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
      `;
    })
    .join("");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);
  const simulationOverlay = renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        ${seriesMarkup}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderComboChart(widget, chartContext) {
  if (isNiiVolatilityWidget(widget)) return renderNiiVolatilityComboChart(widget, chartContext);
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const barValues = buildBarValues(widget.seq, chartContext.xLabels.length, chartContext.signature);
  const barWidth = Math.max(24, (getFrameMinStep(frame, chartContext.xLabels.length)) * 0.36);
  const barFill = getBarFillColor(widget.title || "combo-bar", [widget.title || "combo-bar"], 0, 0.84);
  const barStroke = getBarStrokeColor(widget.title || "combo-bar", [widget.title || "combo-bar"], 0, 0.28);
  const bars = barValues
    .map((value, index) => {
      const x = getFrameXPosition(frame, index, chartContext.xLabels.length) - barWidth / 2;
      const y = frame.bottom - value;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${value}" rx="10" fill="${barFill}" stroke="${barStroke}" stroke-width="1.2"></rect>`;
    })
    .join("");

  const seriesDefinitions = [];
  const lines = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index, "line");
      const points = buildSeries(widget.seq + 19 + index * 13, chartContext.xLabels.length, frame, chartContext.signature + index * 19);
      seriesDefinitions.push({ label, points, role: label.includes("负债") ? "liability" : "line" });
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);
  const simulationOverlay = renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        ${bars}
        ${lines}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderRepricingScaleGapChart(widget, chartContext) {
  const frame = createWideFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "规模/差额 (亿元)");
  const metricItems = ["资产端重定价规模", "负债端重定价规模", "资产负债差额"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetBarColor = getPaletteColor("资产端重定价规模", metricItems, 0, "bar");
  const liabilityBarColor = getPaletteColor("负债端重定价规模", metricItems, 1, "bar");
  const gapLineColor = SEMANTIC_COLORS.gapLine;
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
      return `<line x1="${x}" y1="${frame.top}" x2="${x}" y2="${frame.bottom}" stroke="${hexToRgba(assetBarColor, 0.14)}" stroke-width="1"></line>`;
    })
    .join("");

  const assetBars = selectedMetrics.includes("资产端重定价规模")
    ? assetValues
    .map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const x = center - columnWidth - barGap;
      const y = frame.bottom - (frame.height * value) / 100;
      return `<rect x="${x}" y="${y}" width="${columnWidth}" height="${frame.bottom - y}" rx="8" fill="${getBarFillColor("资产端重定价规模", metricItems, 0, 0.88)}" stroke="${getBarStrokeColor("资产端重定价规模", metricItems, 0, 0.3)}" stroke-width="1"></rect>`;
    })
    .join("")
    : "";

  const liabilityBars = selectedMetrics.includes("负债端重定价规模")
    ? liabilityValues
    .map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const x = center + barGap;
      const y = frame.bottom - (frame.height * value) / 100;
      return `<rect x="${x}" y="${y}" width="${columnWidth}" height="${frame.bottom - y}" rx="8" fill="${getBarFillColor("负债端重定价规模", metricItems, 1, 0.88)}" stroke="${getBarStrokeColor("负债端重定价规模", metricItems, 1, 0.3)}" stroke-width="1"></rect>`;
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
          <polyline fill="none" stroke="${gapLineColor}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" points="${gapPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${gapPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${gapLineColor}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
        ` : ""}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "资产端重定价规模", color: getBarFillColor("资产端重定价规模", metricItems, 0, 0.88) },
          { label: "负债端重定价规模", color: getBarFillColor("负债端重定价规模", metricItems, 1, 0.88) },
          { label: "资产负债差额", color: gapLineColor },
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
  const frame = createFrame(labels.length);
  const yLabel = chartContext.yLabel;
  const axis = renderAxes(frame, labels, yLabel);
  const values = buildBarValues(widget.seq, labels.length, chartContext.signature);
  const barWidth = Math.max(34, getFrameMinStep(frame, labels.length) * 0.48);
  const singleSeriesColor = usesTemporalAxis(labels);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${values
          .map((value, index) => {
            const x = getFrameXPosition(frame, index, labels.length) - barWidth / 2;
            const y = frame.bottom - value;
            const color = singleSeriesColor
              ? getBarFillColor(widget.title || "bar-series", [widget.title || "bar-series"], 0, 0.86)
              : getBarFillColor(labels[index], labels, index, 0.9);
            const stroke = singleSeriesColor
              ? getBarStrokeColor(widget.title || "bar-series", [widget.title || "bar-series"], 0, 0.26)
              : getBarStrokeColor(labels[index], labels, index, 0.28);
            return `<rect x="${x}" y="${y}" width="${barWidth}" height="${value}" rx="10" fill="${color}" stroke="${stroke}" stroke-width="1"></rect>`;
          })
          .join("")}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        seriesList: labels,
        allSeriesList: labels,
        legendItems: singleSeriesColor
          ? [{
              label: widget.title || "当前序列",
              filterValue: widget.title || "当前序列",
              color: getBarFillColor(widget.title || "bar-series", [widget.title || "bar-series"], 0, 0.86),
            }]
          : labels.map((label, index) => ({
              label,
              filterValue: label,
              color: getBarFillColor(label, labels, index, 0.9),
            })),
      })}
    </div>
  `;
}

function renderDurationGapComboChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "久期/差值");
  const metricItems = ["资产端重定价久期", "负债端重定价久期", "久期差值"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetValues = buildMetricValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 17).map((value) => 18 + (value % 78));
  const liabilityValues = buildMetricValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 31).map((value) => 16 + (value % 76));
  const gapValues = assetValues.map((value, index) => Math.abs(value - liabilityValues[index]).toFixed(1)).map(Number);
  const barWidth = Math.max(10, Math.min(18, getFrameMinStep(frame, chartContext.xLabels.length) * 0.22));
  const barGap = Math.max(2, Math.min(5, getFrameMinStep(frame, chartContext.xLabels.length) * 0.05));
  const assetBarColor = getBarFillColor("资产端重定价久期", metricItems, 0, 0.84);
  const liabilityBarColor = getBarFillColor("负债端重定价久期", metricItems, 1, 0.84);
  const gapLineColor = getPaletteColor("久期差值", metricItems, 0, "line");

  const assetBars = selectedMetrics.includes("资产端重定价久期")
    ? assetValues.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center - barWidth - barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${assetBarColor}" stroke="${getBarStrokeColor("资产端重定价久期", metricItems, 0, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes("负债端重定价久期")
    ? liabilityValues.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${liabilityBarColor}" stroke="${getBarStrokeColor("负债端重定价久期", metricItems, 1, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const gapPoints = gapValues.map((value, index) => ({
    x: getFrameXPosition(frame, index, chartContext.xLabels.length),
    y: frame.bottom - (frame.height * value) / 100,
  }));
  const simulationOverlay = selectedMetrics.includes("久期差值")
    ? renderSimulationOverlay(frame, widget, chartContext, [{ label: "久期差值", points: gapPoints, role: "gap" }])
    : "";

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${assetBars}
        ${liabilityBars}
        ${selectedMetrics.includes("久期差值")
          ? `
            <polyline fill="none" stroke="${gapLineColor}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" points="${gapPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${gapPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${gapLineColor}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
          `
          : ""}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "资产端重定价久期", color: assetBarColor },
          { label: "负债端重定价久期", color: liabilityBarColor },
          { label: "久期差值", color: gapLineColor },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderDurationGapComboDataTable(widget, chartContext) {
  const assetValues = buildMetricValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 17).map((value) => 18 + (value % 78));
  const liabilityValues = buildMetricValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 31).map((value) => 16 + (value % 76));
  const gapValues = assetValues.map((value, index) => Number(Math.abs(value - liabilityValues[index]).toFixed(1)));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>资产端重定价久期</th>
              <th>负债端重定价久期</th>
              <th>久期差值</th>
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${assetValues[index].toFixed(1)}</td>
                <td>${liabilityValues[index].toFixed(1)}</td>
                <td>${gapValues[index].toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBalanceScaleGrowthChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "规模/增速");
  const metricItems = ["资产规模", "负债规模", "资产增速", "负债增速"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetScale = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 24 + (value % 48));
  const liabilityScale = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 29).map((value) => 20 + (value % 46));
  const assetGrowth = buildMetricValues(widget.seq + 31, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 18 + (value % 78));
  const liabilityGrowth = buildMetricValues(widget.seq + 43, chartContext.xLabels.length, chartContext.signature + 67).map((value) => 16 + (value % 76));
  const barWidth = Math.max(10, Math.min(20, getFrameMinStep(frame, chartContext.xLabels.length) * 0.24));
  const barGap = Math.max(2, Math.min(6, getFrameMinStep(frame, chartContext.xLabels.length) * 0.06));

  const assetBarColor = getBarFillColor("资产规模", metricItems, 0, 0.84);
  const liabilityBarColor = getBarFillColor("负债规模", metricItems, 1, 0.84);
  const assetLineColor = getPaletteColor("资产增速", metricItems, 0, "line");
  const liabilityLineColor = getPaletteColor("负债增速", metricItems, 1, "line");

  const assetBars = selectedMetrics.includes("资产规模")
    ? assetScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center - barWidth - barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${assetBarColor}" stroke="${getBarStrokeColor("资产规模", metricItems, 0, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes("负债规模")
    ? liabilityScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${liabilityBarColor}" stroke="${getBarStrokeColor("负债规模", metricItems, 1, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const assetPoints = assetGrowth.map((value, index) => ({
    x: getFrameXPosition(frame, index, chartContext.xLabels.length),
    y: frame.bottom - (frame.height * value) / 100,
  }));
  const liabilityPoints = liabilityGrowth.map((value, index) => ({
    x: getFrameXPosition(frame, index, chartContext.xLabels.length),
    y: frame.bottom - (frame.height * value) / 100,
  }));

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${assetBars}
        ${liabilityBars}
        ${selectedMetrics.includes("资产增速")
          ? `
            <polyline fill="none" stroke="${assetLineColor}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${assetPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${assetPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${assetLineColor}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
          `
          : ""}
        ${selectedMetrics.includes("负债增速")
          ? `
            <polyline fill="none" stroke="${liabilityLineColor}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${liabilityPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${liabilityPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${liabilityLineColor}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
          `
          : ""}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "资产规模", color: assetBarColor },
          { label: "负债规模", color: liabilityBarColor },
          { label: "资产增速", color: assetLineColor },
          { label: "负债增速", color: liabilityLineColor },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderBalanceScaleGrowthDataTable(widget, chartContext) {
  const assetScale = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 24 + (value % 48));
  const liabilityScale = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 29).map((value) => 20 + (value % 46));
  const assetGrowth = buildMetricValues(widget.seq + 31, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 18 + (value % 78));
  const liabilityGrowth = buildMetricValues(widget.seq + 43, chartContext.xLabels.length, chartContext.signature + 67).map((value) => 16 + (value % 76));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>资产规模</th>
              <th>负债规模</th>
              <th>资产增速</th>
              <th>负债增速</th>
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${assetScale[index].toFixed(1)}</td>
                <td>${liabilityScale[index].toFixed(1)}</td>
                <td>${assetGrowth[index].toFixed(1)}</td>
                <td>${liabilityGrowth[index].toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBusinessScaleGrowthChart(widget, chartContext) {
  const selectedBusinesses = chartContext.seriesList.length
    ? chartContext.seriesList
    : ((chartContext.filterState["业务类型"] || []).filter(Boolean));
  const seriesList = selectedBusinesses.length
    ? selectedBusinesses
    : (FILTER_OPTIONS["业务类型"] || BUSINESS_DURATION_OPTIONS).slice(0, 2);
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : (FILTER_OPTIONS["业务类型"] || BUSINESS_DURATION_OPTIONS);
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "规模/增速");
  const step = chartContext.xLabels.length <= 1 ? 0 : frame.width / (chartContext.xLabels.length - 1);
  const groupWidth = Math.max(24, step * 0.72);
  const barWidth = Math.max(6, Math.min(18, groupWidth / Math.max(seriesList.length, 1) - 4));

  const barMarkup = seriesList
    .map((label, seriesIndex) => {
      const values = buildBarValues(widget.seq + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 31).map((value) => 18 + (value % 52));
      return values.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const offset = (seriesIndex - (seriesList.length - 1) / 2) * (barWidth + 4);
        const x = center + offset - barWidth / 2;
        const height = (frame.height * value) / 100;
        const y = frame.bottom - height;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7" fill="${getBarFillColor(label, allSeries, seriesIndex, 0.82)}" stroke="${getBarStrokeColor(label, allSeries, seriesIndex, 0.28)}" stroke-width="1"></rect>`;
      }).join("");
    })
    .join("");

  const lineMarkup = seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, allSeries, seriesIndex, "line");
      const points = buildMetricValues(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 29)
        .map((value, index) => ({
          x: getFrameXPosition(frame, index, chartContext.xLabels.length),
          y: frame.bottom - (frame.height * (18 + (value % 76))) / 100,
        }));
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${seriesIndex === 0 ? 3.8 : 3.1}" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("");

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${barMarkup}
        ${lineMarkup}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: allSeries,
        seriesList,
        legendItems: allSeries.map((label, index) => ({
          label,
          filterValue: label,
          color: getPaletteColor(label, allSeries, index, "line"),
        })),
      })}
    </div>
  `;
}

function renderBusinessScaleGrowthDataTable(widget, chartContext) {
  const seriesList = chartContext.seriesList.length
    ? chartContext.seriesList
    : ((chartContext.filterState["业务类型"] || []).filter(Boolean));
  const selectedBusinesses = seriesList.length
    ? seriesList
    : (FILTER_OPTIONS["业务类型"] || BUSINESS_DURATION_OPTIONS).slice(0, 2);

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">${inferXAxisTitle(chartContext.xLabels)}</th>
              ${selectedBusinesses.map((label) => `<th colspan="2">${label}</th>`).join("")}
            </tr>
            <tr>
              ${selectedBusinesses.map(() => `<th>规模</th><th>增速</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((axisLabel, index) => `
              <tr>
                <td>${axisLabel}</td>
                ${selectedBusinesses.map((label, seriesIndex) => {
                  const scaleValues = buildBarValues(widget.seq + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 31).map((value) => 18 + (value % 52));
                  const growthValues = buildMetricValues(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 29).map((value) => 18 + (value % 76));
                  return `<td>${scaleValues[index].toFixed(1)}</td><td>${growthValues[index].toFixed(1)}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTable(widget, chartContext) {
  const tableKind = getConfiguredWidgetBehavior(widget).tableKind;
  const tableRendererRegistry = {
    eveCombined: renderEveCombinedTable,
    niiCurrencyMatrix: renderNiiCurrencyScenarioTable,
    benchmarkCurrencyMatrix: renderBenchmarkCurrencyMatrixTable,
    fxExposureMatrix: renderFxExposureMatrixTable,
    durationGapMatrix: (currentWidget) => renderDurationGapMatrixTable(currentWidget),
    businessStructure: renderBusinessStructureTable,
    businessDetail: renderBusinessDetailTable,
  };
  if (tableKind && tableRendererRegistry[tableKind]) {
    return applyTableTemplateClasses(widget, tableRendererRegistry[tableKind](widget, chartContext), getWidgetTableTemplateKey(widget, "compact"));
  }
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
  const widgetState = appState.widgetFilters[widget.seq] || {};
  const timeRangeValues = normalizeBusinessStructureDateRange(widgetState["时间区间（起止）"]);
  const rows = buildBusinessStructureRows(widget, chartContext, timeRangeValues);
  const behavior = getConfiguredWidgetBehavior(widget);
  const drilldownTargetSeq = Number(behavior.drilldownTargetSeq) || null;
  const activeDrilldown = drilldownTargetSeq ? getBusinessDrilldown(drilldownTargetSeq) : null;
  const localFilter = (widget.seq === 89 || widget.seq === 96)
    ? `
      <div class="chart-inline-controls">
        ${renderWidgetDateRangeInlineControl(widget.seq, "时间区间（起止）", "时间区间（起止）", timeRangeValues)}
      </div>
    `
    : "";
  const groupedBody = BUSINESS_STRUCTURE_GROUPS.map((group) => {
    const groupRows = rows.filter((row) => row.category === group.category);
    return groupRows
      .map((row, index) => `
        <tr class="${activeDrilldown?.businessType === row.businessType ? "chart-table__row--active" : ""}">
          ${index === 0 ? `<td rowspan="${groupRows.length}" class="chart-table__group-cell">${group.category}</td>` : ""}
          <td>${row.businessType}</td>
          <td>${row.scale.toFixed(1)}</td>
          <td>${row.fixedRate}</td>
          <td>${row.duration}</td>
          <td>${row.averageTerm}</td>
          <td>${row.averageRate}</td>
          <td>
            <button
              class="link-button chart-table__action-link ${activeDrilldown?.businessType === row.businessType ? "is-active" : ""}"
              type="button"
              data-open-business-detail="true"
              data-target-widget-seq="${drilldownTargetSeq || ""}"
              data-source-widget-seq="${widget.seq}"
              data-business-type="${row.businessType}"
              data-business-category="${row.category}"
            >${activeDrilldown?.businessType === row.businessType ? "已定位" : "查看明细"}</button>
          </td>
        </tr>
      `)
      .join("");
  }).join("");
  return `
    <div class="chart-shell chart-shell--data">
      ${localFilter}
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>类别</th>
              <th>业务类型</th>
              <th>规模</th>
              <th>固息占比</th>
              <th>加权久期</th>
              <th>平均期限</th>
              <th>平均利率</th>
              <th class="chart-table__action-col">明细</th>
            </tr>
          </thead>
          <tbody>
            ${groupedBody}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildBusinessStructureRows(widget, chartContext, timeRangeValues = []) {
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: chartContext.filterState["币种"] || [],
    时间区间: timeRangeValues,
  });
  const groupScaleBase = {
    生息资产: 180,
    付息负债: 140,
    表外衍生品: 42,
  };
  const groupRateBase = {
    生息资产: 2.1,
    付息负债: 1.6,
    表外衍生品: 1.2,
  };

  return BUSINESS_STRUCTURE_GROUPS.flatMap((group, groupIndex) =>
    group.items.map((businessType, itemIndex) => {
      const seed = signature + groupIndex * 97 + itemIndex * 43;
      const scale = groupScaleBase[group.category] + ((widget.seq * 17 + seed) % 210) / 1.15;
      const fixedRate = `${(22 + ((widget.seq * 9 + seed) % 63)).toFixed(1)}%`;
      const duration = `${(0.3 + ((widget.seq * 5 + seed) % 29) / 10).toFixed(1)}年`;
      const averageTerm = `${(0.5 + ((widget.seq * 11 + seed) % 47) / 10).toFixed(1)}年`;
      const averageRate = `${(groupRateBase[group.category] + ((widget.seq * 7 + seed) % 24) / 10).toFixed(2)}%`;
      return {
        category: group.category,
        businessType,
        scale: Number(scale.toFixed(1)),
        fixedRate,
        duration,
        averageTerm,
        averageRate,
      };
    })
  );
}

function getBusinessDrilldown(widgetSeq) {
  const drilldown = appState.businessDrilldowns?.[String(widgetSeq)] || appState.businessDrilldowns?.[widgetSeq] || null;
  return drilldown?.businessType ? drilldown : null;
}

function getBusinessDetailColumns(widget) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const presetKey = behavior.detailTablePreset;
  const presetColumns = DETAIL_TABLE_CONFIG[presetKey]?.columns;
  if (Array.isArray(presetColumns) && presetColumns.length) return presetColumns;
  return [
    { key: "businessId", label: "业务编号" },
    { key: "counterparty", label: "客户" },
    { key: "businessType", label: "业务类型" },
    { key: "sideLabel", label: "资产/负债" },
    { key: "amount", label: "金额/余额" },
    { key: "rate", label: "利率" },
    { key: "term", label: "剩余期限" },
  ];
}

function getBusinessDrilldownDateRange(drilldown) {
  const sourceWidgetState = appState.widgetFilters?.[drilldown?.sourceWidgetSeq] || {};
  const rawDateRange = sourceWidgetState["时间区间（起止）"];
  if (!Array.isArray(rawDateRange) || !rawDateRange.some(Boolean)) return null;
  return normalizeBusinessStructureDateRange(rawDateRange);
}

function formatBusinessDetailContext(widget, chartContext, drilldown, scopeMeta) {
  const institutions = summarizeFilterSelection("机构", chartContext.filterState["机构"] || []);
  const currencies = summarizeFilterSelection("币种", chartContext.filterState["币种"] || []);
  const dateRange = getBusinessDrilldownDateRange(drilldown);
  const dateText = scopeMeta.dateMode === "range" && Array.isArray(dateRange)
    ? `${dateRange[0]} 至 ${dateRange[1]}`
    : `截至 ${getDefaultGlobalEndDate()}`;
  return `${scopeMeta.label} > ${drilldown.businessType} | 机构：${institutions} | 币种：${currencies} | ${dateText}`;
}

function addDays(dateValue, offsetDays) {
  const baseDate = parseDateValue(dateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
  return formatDateValue(nextDate);
}

function buildBusinessDetailRows(widget, chartContext, drilldown) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const scopeMeta = BUSINESS_DETAIL_SCOPE_META[detailScope] || BUSINESS_DETAIL_SCOPE_META.stock;
  const dateRange = getBusinessDrilldownDateRange(drilldown);
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: chartContext.filterState["币种"] || [],
    业务类型: [drilldown.businessType],
    时间区间: dateRange || [],
  });
  const sideLabel = BUSINESS_SIDE_MAP[drilldown.businessType] === "liability" ? "负债" : "资产";
  const category = drilldown.category || BUSINESS_STRUCTURE_GROUPS.find((group) => group.items.includes(drilldown.businessType))?.category || "";
  const customerPool = category === "表外衍生品"
    ? ["利率互换组合", "跨币种掉期组合", "久期对冲组合", "套保衍生品篮子", "交易对手净额包"]
    : sideLabel === "资产"
      ? ["城投集团", "高端制造", "交通基础设施", "能源平台", "产业基金", "科技园区", "消费龙头", "医药集团"]
      : ["战略客户部", "机构资金部", "同业合作户", "债券承销计划", "集团内部账户", "境外分行资金池", "财政性存款", "大型企业结算户"];
  const rowCount = 8 + (signature % 4);
  const rangeStart = dateRange?.[0] || addDays(getDefaultGlobalEndDate(), -180);
  const rangeEnd = dateRange?.[1] || getDefaultGlobalEndDate();

  return Array.from({ length: rowCount }, (_, index) => {
    const seed = signature + index * 37;
    const prefix = detailScope === "new" ? "NEW" : detailScope === "maturity" ? "MAT" : "STK";
    const businessId = `${prefix}-${String((seed % 900000) + 100000).slice(-6)}`;
    const counterparty = customerPool[index % customerPool.length];
    const baseStart = detailScope === "new" ? addDays(rangeStart, (seed % 18)) : addDays(rangeEnd, -((seed % 420) + 30));
    const maturityDate = detailScope === "maturity"
      ? addDays(rangeStart, (seed % 18))
      : addDays(baseStart, 90 + (seed % 720));
    const repricingDate = addDays(baseStart, 30 + (seed % 180));
    const amountBase = detailScope === "stock" ? 18 : detailScope === "new" ? 6 : 5;
    const amount = `${(amountBase + (seed % 85) / 2.7).toFixed(1)}亿元`;
    const rate = `${(1.6 + (seed % 33) / 10).toFixed(2)}%`;
    const rateType = seed % 3 === 0 ? "浮动" : "固定";
    const term = `${6 + (seed % 30)}个月`;
    return {
      businessId,
      counterparty,
      businessType: drilldown.businessType,
      sideLabel,
      startDate: baseStart,
      maturityDate,
      repricingDate,
      amount: amount.replace("金额/余额", scopeMeta.amountLabel),
      rate,
      rateType,
      term,
    };
  });
}

function renderBusinessDetailTable(widget, chartContext) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const scopeMeta = BUSINESS_DETAIL_SCOPE_META[detailScope] || BUSINESS_DETAIL_SCOPE_META.stock;
  const drilldown = getBusinessDrilldown(widget.seq);
  if (!drilldown) {
    return `
      <div class="chart-shell chart-shell--data">
        <div class="business-detail-empty">
          <div class="business-detail-empty__title">${scopeMeta.emptyTitle}</div>
          <div class="business-detail-empty__desc">${scopeMeta.emptyDescription}</div>
        </div>
      </div>
    `;
  }

  const columns = getBusinessDetailColumns(widget);
  const rows = buildBusinessDetailRows(widget, chartContext, drilldown);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="business-detail-panel">
        <div class="business-detail-context">
          <div>
            <div class="business-detail-context__eyebrow">归因穿透</div>
            <div class="business-detail-context__title">${drilldown.businessType}业务明细</div>
            <div class="business-detail-context__meta">${formatBusinessDetailContext(widget, chartContext, drilldown, scopeMeta)} | 共定位 ${rows.length} 笔业务</div>
          </div>
          <button class="business-detail-context__clear" type="button" data-clear-business-drilldown="${widget.seq}">清除选择</button>
        </div>
        <div class="table-shell">
          <table class="chart-table chart-table--wide chart-table--matrix">
            <thead>
              <tr>
                ${columns.map((column) => `<th>${column.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  ${columns.map((column) => `<td>${row[column.key] ?? ""}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderDataView(widget, chartContext) {
  const type = widget.componentType || "";
  const behavior = getConfiguredWidgetBehavior(widget);
  const dataRendererRegistry = {
    fundingFlowScale: renderFundingFlowScaleDataView,
    futureFundingFlow: renderFutureFundingFlowDataView,
    liquidityGapTenor: renderLiquidityGapTenorDataTable,
    reserveRatioScaleCombo: renderReserveRatioScaleDataTable,
    liquidityAssetLiabilityBars: renderLiquidityAssetLiabilityBarsDataTable,
    businessDurationRepricing: renderBusinessDurationRepricingDataTable,
    durationRepricing: renderDurationRepricingDataTable,
    niiVolatility: renderNiiVolatilityDataTable,
    durationGapCombo: renderDurationGapComboDataTable,
    repricingScaleGap: renderRepricingScaleGapDataTable,
    balanceScaleGrowth: renderBalanceScaleGrowthDataTable,
    businessScaleGrowth: renderBusinessScaleGrowthDataTable,
    maturityDistribution: renderMaturityDistributionDataTable,
  };
  const tableRendererRegistry = {
    eveCombined: renderEveCombinedTable,
    niiCurrencyMatrix: renderNiiCurrencyScenarioTable,
    benchmarkCurrencyMatrix: renderBenchmarkCurrencyMatrixTable,
    fxExposureMatrix: renderFxExposureMatrixTable,
    durationGapMatrix: (currentWidget) => renderDurationGapMatrixTable(currentWidget),
    businessStructure: renderBusinessStructureTable,
    businessDetail: renderBusinessDetailTable,
  };
  if (behavior.tableKind && tableRendererRegistry[behavior.tableKind]) {
    return applyTableTemplateClasses(widget, tableRendererRegistry[behavior.tableKind](widget, chartContext), getWidgetTableTemplateKey(widget, "compact"));
  }
  if (behavior.chartKind && dataRendererRegistry[behavior.chartKind]) {
    return applyTableTemplateClasses(widget, dataRendererRegistry[behavior.chartKind](widget, chartContext), getWidgetTableTemplateKey(widget, "timeSeries"));
  }
  if (type.includes("期限分布")) return applyTableTemplateClasses(widget, renderMaturityDistributionDataTable(widget, chartContext), "timeSeries");
  if (type.includes("双轴") || type.includes("组合")) return applyTableTemplateClasses(widget, renderComboDataTable(widget, chartContext), "timeSeries");
  if (type.includes("柱状")) return applyTableTemplateClasses(widget, renderBarDataTable(widget, chartContext), "timeSeries");
  if (isDonutWidget(widget) || type.includes("分布")) return applyTableTemplateClasses(widget, renderDistributionDataTable(widget, chartContext), "distribution");
  return applyTableTemplateClasses(widget, renderLineDataTable(widget, chartContext), "timeSeries");
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

function buildLiquidityGapTenorSeries(widget, chartContext) {
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : LIQUIDITY_GAP_TENOR_OPTIONS;
  const seriesList = chartContext.seriesList.length ? chartContext.seriesList : [LIQUIDITY_GAP_TENOR_OPTIONS[LIQUIDITY_GAP_TENOR_OPTIONS.length - 1]];
  return seriesList.map((label, seriesIndex) => {
    const allSeriesIndex = Math.max(0, allSeries.indexOf(label));
    return {
      label,
      colorIndex: allSeriesIndex,
      scaleValues: buildBarValues(widget.seq + 7 + allSeriesIndex * 17, chartContext.xLabels.length, chartContext.signature + allSeriesIndex * 29)
        .map((value) => 28 + (value % 96)),
      ratioValues: buildMetricValues(widget.seq + 41 + allSeriesIndex * 13, chartContext.xLabels.length, chartContext.signature + allSeriesIndex * 37)
        .map((value) => Number((2 + (value % 72) / 6).toFixed(1))),
    };
  });
}

function buildAxisTicks(maxValue, segmentCount = 4) {
  return Array.from({ length: segmentCount + 1 }, (_, index) => Number(((maxValue / segmentCount) * index).toFixed(1)));
}

function formatAxisTickValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderDualAxis(frame, xLabels, leftLabel, rightLabel, leftMax, rightMax) {
  const leftTicks = buildAxisTicks(leftMax);
  const rightTicks = buildAxisTicks(rightMax);
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
  const gridMarkup = leftTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * tick) / leftMax;
      return `<line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.14)" stroke-width="1"></line>`;
    })
    .join("");
  const leftTickMarkup = leftTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * tick) / leftMax;
      return `<text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>`;
    })
    .join("");
  const rightTickMarkup = rightTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * tick) / rightMax;
      return `<text x="${frame.right + 14}" y="${y + 4}" text-anchor="start" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>`;
    })
    .join("");
  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">${leftLabel}</text>
    <text x="${frame.right - 4}" y="${frame.top - 6}" text-anchor="end" class="axis-title">${rightLabel}</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${inferXAxisTitle(xLabels)}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.right}" y1="${frame.top}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.32)" stroke-width="1.2"></line>
    ${gridMarkup}
    ${leftTickMarkup}
    ${rightTickMarkup}
    ${xTickMarkup}
  `;
}

function renderLiquidityGapTenorChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const seriesData = buildLiquidityGapTenorSeries(widget, chartContext);
  const leftMax = Math.max(60, Math.ceil(Math.max(...seriesData.flatMap((series) => series.scaleValues), 0) / 20) * 20);
  const rightMax = Math.max(10, Math.ceil(Math.max(...seriesData.flatMap((series) => series.ratioValues), 0) / 2) * 2);
  const axis = renderDualAxis(frame, chartContext.xLabels, "缺口规模(亿元)", "缺口率(%)", leftMax, rightMax);
  const step = chartContext.xLabels.length <= 1 ? 0 : frame.width / (chartContext.xLabels.length - 1);
  const groupWidth = Math.max(24, step * 0.72);
  const barWidth = Math.max(8, Math.min(18, groupWidth / Math.max(seriesData.length, 1) - 4));

  const barMarkup = seriesData
    .map((series, seriesIndex) => series.scaleValues.map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const offset = (seriesIndex - (seriesData.length - 1) / 2) * (barWidth + 4);
      const x = center + offset - barWidth / 2;
      const height = (frame.height * value) / leftMax;
      const y = frame.bottom - height;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${getBarFillColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, 0.78)}" stroke="${getBarStrokeColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, 0.3)}" stroke-width="1"></rect>`;
    }).join(""))
    .join("");

  const lineMarkup = seriesData
    .map((series) => {
      const color = getPaletteColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, "line");
      const points = series.ratioValues.map((value, index) => ({
        x: getFrameXPosition(frame, index, chartContext.xLabels.length),
        y: frame.bottom - (frame.height * value) / rightMax,
      }));
      return `
        <polyline fill="none" stroke="${color}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("");

  return `
    <div class="chart-shell">
      <div class="chart-inline-controls">
        ${renderWidgetInlineControl(widget.seq, "期限长度", "期限长度", chartContext.filterState["期限长度"] || [LIQUIDITY_GAP_TENOR_OPTIONS[LIQUIDITY_GAP_TENOR_OPTIONS.length - 1]], LIQUIDITY_GAP_TENOR_OPTIONS)}
      </div>
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${barMarkup}
        ${lineMarkup}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: LIQUIDITY_GAP_TENOR_OPTIONS,
        seriesList: seriesData.map((series) => series.label),
        legendItems: LIQUIDITY_GAP_TENOR_OPTIONS.map((label, index) => ({
          label,
          filterValue: label,
          color: getPaletteColor(label, LIQUIDITY_GAP_TENOR_OPTIONS, index, "line"),
        })),
      })}
    </div>
  `;
}

function renderLiquidityGapTenorDataTable(widget, chartContext) {
  const seriesData = buildLiquidityGapTenorSeries(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesData.map((series) => `<th>${series.label}｜缺口规模</th><th>${series.label}｜缺口率</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                ${seriesData.map((series) => `<td>${series.scaleValues[index].toFixed(1)}</td><td>${series.ratioValues[index].toFixed(1)}%</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderThirtyDayLiquidityGapChart(widget, chartContext) {
  return renderInlineControlledLineChart(widget, chartContext, "口径", ["时点", "月日均"]);
}

function renderLiquidityAssetLiabilityBarsChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "规模 (亿元)");
  const metricItems = ["流动性资产", "流动性负债"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 19).map((value) => 36 + (value % 44));
  const liabilityValues = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 43).map((value) => 28 + (value % 40));
  const barWidth = Math.max(10, Math.min(18, getFrameMinStep(frame, chartContext.xLabels.length) * 0.22));
  const barGap = Math.max(2, Math.min(5, getFrameMinStep(frame, chartContext.xLabels.length) * 0.05));

  const assetBars = selectedMetrics.includes("流动性资产")
    ? assetValues.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center - barWidth - barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${getBarFillColor("流动性资产", metricItems, 0, 0.86)}" stroke="${getBarStrokeColor("流动性资产", metricItems, 0, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes("流动性负债")
    ? liabilityValues.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${getBarFillColor("流动性负债", metricItems, 1, 0.86)}" stroke="${getBarStrokeColor("流动性负债", metricItems, 1, 0.28)}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${assetBars}
        ${liabilityBars}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "流动性资产", color: getBarFillColor("流动性资产", metricItems, 0, 0.86) },
          { label: "流动性负债", color: getBarFillColor("流动性负债", metricItems, 1, 0.86) },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderLiquidityAssetLiabilityBarsDataTable(widget, chartContext) {
  const assetValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 19).map((value) => 36 + (value % 44));
  const liabilityValues = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 43).map((value) => 28 + (value % 40));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>流动性资产</th>
              <th>流动性负债</th>
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${assetValues[index].toFixed(1)}</td>
                <td>${liabilityValues[index].toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReserveRatioScaleChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "规模/比例");
  const metricItems = ["超额备付金规模", "超额备付金率"];
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const scaleValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 23).map((value) => 30 + (value % 48));
  const ratioValues = buildMetricValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 20 + (value % 72));
  const barWidth = Math.max(18, Math.min(28, getFrameMinStep(frame, chartContext.xLabels.length) * 0.36));
  const scaleColor = getBarFillColor("超额备付金规模", metricItems, 0, 0.86);
  const scaleStroke = getBarStrokeColor("超额备付金规模", metricItems, 0, 0.28);
  const ratioColor = getPaletteColor("超额备付金率", metricItems, 0, "line");

  const bars = selectedMetrics.includes("超额备付金规模")
    ? scaleValues.map((value, index) => {
        const x = getFrameXPosition(frame, index, chartContext.xLabels.length) - barWidth / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="10" fill="${scaleColor}" stroke="${scaleStroke}" stroke-width="1"></rect>`;
      }).join("")
    : "";

  const ratioPoints = ratioValues.map((value, index) => ({
    x: getFrameXPosition(frame, index, chartContext.xLabels.length),
    y: frame.bottom - (frame.height * value) / 100,
  }));

  const ratioLine = selectedMetrics.includes("超额备付金率")
    ? `
      <polyline fill="none" stroke="${ratioColor}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" points="${ratioPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      ${ratioPoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${ratioColor}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
    `
    : "";

  const simulationOverlay = selectedMetrics.includes("超额备付金率")
    ? renderSimulationOverlay(frame, widget, chartContext, [{ label: "超额备付金率", points: ratioPoints, role: "ratio" }])
    : "";

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${bars}
        ${ratioLine}
        ${simulationOverlay}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "超额备付金规模", color: scaleColor },
          { label: "超额备付金率", color: ratioColor },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderReserveRatioScaleDataTable(widget, chartContext) {
  const scaleValues = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature + 23).map((value) => 30 + (value % 48));
  const ratioValues = buildMetricValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 20 + (value % 72));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>超额备付金规模</th>
              <th>超额备付金率</th>
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${scaleValues[index].toFixed(1)}</td>
                <td>${ratioValues[index].toFixed(1)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInlineControlledLineChart(widget, chartContext, filterName, options) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, chartContext.yLabel);
  const seriesMarkup = chartContext.seriesList
    .map((label, index) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, index, "line");
      const points = buildSeries(widget.seq + index * 17, chartContext.xLabels.length, frame, chartContext.signature + index * 31);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${index === 0 ? 4 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${index === 0 ? 4.2 : 3.5}" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
      `;
    })
    .join("");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);

  return `
    <div class="chart-shell">
      <div class="chart-inline-controls">
        ${renderWidgetInlineControl(widget.seq, filterName, filterName, chartContext.filterState[filterName] || options.slice(0, 1), options)}
      </div>
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
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
      const color = getPaletteColor(definition.label, allSeriesDefinitions.map((item) => item.label), definition.colorIndex, "line");
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
          color: getPaletteColor(definition.label, allSeriesDefinitions.map((item) => item.label), definition.colorIndex, "line"),
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

function renderBusinessDurationRepricingChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const axis = renderAxes(frame, chartContext.xLabels, "久期");
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : (FILTER_OPTIONS["业务类型"] || BUSINESS_DURATION_OPTIONS);
  const seriesList = chartContext.seriesList.length ? chartContext.seriesList : allSeries.slice(0, 2);
  const seriesMarkup = seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, allSeries, seriesIndex, "line");
      const points = buildSeries(widget.seq + 31 + seriesIndex * 17, chartContext.xLabels.length, frame, chartContext.signature + seriesIndex * 37);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${seriesIndex === 0 ? 3.8 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
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
        allSeriesList: allSeries,
        seriesList,
        legendItems: allSeries.map((label, index) => ({
          label,
          filterValue: label,
          color: getPaletteColor(label, allSeries, index, "line"),
        })),
      })}
    </div>
  `;
}

function renderBusinessDurationRepricingDataTable(widget, chartContext) {
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : (FILTER_OPTIONS["业务类型"] || BUSINESS_DURATION_OPTIONS);
  const seriesList = chartContext.seriesList.length ? chartContext.seriesList : allSeries.slice(0, 2);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesList.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                ${seriesList.map((seriesLabel, seriesIndex) => {
                  const values = buildMetricValues(widget.seq + 31 + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 37);
                  return `<td>${values[index].toFixed(1)}</td>`;
                }).join("")}
              </tr>
            `).join("")}
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

function renderEveCombinedTable(widget, chartContext) {
  const currencyLabels = FILTER_OPTIONS["币种"] || ["全折人民币", "人民币", "外币折美元", "美元", "港元", "新加坡元", "欧元", "澳元", "英镑", "日元"];
  const scenarioLabels = ["平行上移", "平行下移", "变陡峭", "变平缓", "短端上升", "短端下降"];
  const orgSignature = createSignature(widget.seq, { 机构: chartContext.filterState["机构"] || [] });
  const rows = currencyLabels.map((currency, index) => {
    const economyChange = -1 * (12 + ((orgSignature + index * 19) % 88));
    const capital = 180 + ((orgSignature + index * 23) % 360);
    const eveRatio = `${((Math.abs(economyChange) / capital) * 100).toFixed(1)}%`;
    const scenarioValues = scenarioLabels.map((_, scenarioIndex) => {
      const raw = ((orgSignature + 41 + (index + 1) * 29 + (scenarioIndex + 1) * 37) % 180) - 90;
      return raw.toFixed(1);
    });
    return {
      currency,
      economyChange: economyChange.toFixed(1),
      capital: capital.toFixed(1),
      eveRatio,
      scenarioValues,
    };
  });
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th>币种</th>
              <th>经济价值变动</th>
              <th>一级资本净额</th>
              <th>△EVE</th>
              ${scenarioLabels.map((label) => `<th>${label}</th>`).join("")}
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
                    ${row.scenarioValues.map((value) => `<td>${value}</td>`).join("")}
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
      const barValues = buildBarValues(widget.seq + seriesIndex * 11, chartContext.xLabels.length, chartContext.signature + seriesIndex * 23).map((value) => 16 + (value % 60));
      return barValues
        .map((value, index) => {
          const center = frame.left + step * index;
          const offset = (seriesIndex - (seriesList.length - 1) / 2) * (barWidth + 4);
          const x = center + offset - barWidth / 2;
          const height = (frame.height * value) / 100;
          const y = frame.bottom - height;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${getBarFillColor(label, chartContext.allSeriesList, seriesIndex, 0.82)}" stroke="${getBarStrokeColor(label, chartContext.allSeriesList, seriesIndex, 0.34)}" stroke-width="1"></rect>`;
        })
        .join("");
    })
    .join("")
    : "";

  const lines = selectedMetrics.includes("线：净利息收入波动率")
    ? seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, chartContext.allSeriesList, seriesIndex, "line");
      const points = buildSeries(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, frame, chartContext.signature + seriesIndex * 29);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      return `
        <polyline fill="none" stroke="${color}" stroke-width="${seriesIndex === 0 ? 3.8 : 3.2}" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
      `;
    })
    .join("")
    : "";
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        ${bars}
        ${lines}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: "柱：净利息收入波动", color: getBarFillColor("柱：净利息收入波动", metricItems, 0, 0.82) },
          { label: "线：净利息收入波动率", color: getPaletteColor("线：净利息收入波动率", metricItems, 0, "line") },
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
  const labels = getDistributionLabels(widget, chartContext);
  const values = buildDistributionValues(widget, labels, chartContext.signature);
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
  return getConfiguredWidgetBehavior(widget).chartKind === "maturityDistribution" || String(widget.componentType || "").includes("期限分布");
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
          const color = getPaletteColor(matrix.series[valueIndex].name, allSeries, valueIndex, "bar");
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
  return getConfiguredWidgetBehavior(widget).tableKind === "niiCurrencyMatrix";
}

function renderFxExposureMatrixTable(widget, chartContext) {
  const rowLabels = uniqueList(FILTER_OPTIONS["币种"] || ["全折人民币"]);
  const columns = [
    { key: "spotAsset", label: "即期资产" },
    { key: "spotLiability", label: "即期负债" },
    { key: "forwardBuy", label: "远期买入" },
    { key: "forwardSell", label: "远期卖出" },
    { key: "adjustedOptionPosition", label: "调整后期权头寸" },
    { key: "netExposure", label: "敞口头寸" },
    { key: "structuralExposure", label: "结构性敞口" },
    { key: "totalExposure", label: "合计敞口" },
    { key: "structuralExposureTotal", label: "结构性敞口合计" },
    { key: "internalExposureLimit", label: "内部敞口额度" },
  ];
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: rowLabels,
  });
  const rows = rowLabels.map((label, rowIndex) => {
    const spotAsset = 120 + ((widget.seq * 19 + signature + rowIndex * 23) % 240);
    const spotLiability = 90 + ((widget.seq * 17 + signature + rowIndex * 29) % 210);
    const forwardBuy = 18 + ((widget.seq * 11 + signature + rowIndex * 13) % 110);
    const forwardSell = 15 + ((widget.seq * 7 + signature + rowIndex * 17) % 100);
    const adjustedOptionPosition = Number(((((widget.seq * 5 + signature + rowIndex * 31) % 180) - 90) / 2).toFixed(1));
    const netExposure = Number((spotAsset - spotLiability + forwardBuy - forwardSell + adjustedOptionPosition).toFixed(1));
    const structuralExposure = Number((20 + ((widget.seq * 13 + signature + rowIndex * 19) % 95)).toFixed(1));
    const totalExposure = Number((netExposure + structuralExposure).toFixed(1));
    const structuralExposureTotal = Number(Math.abs(structuralExposure).toFixed(1));
    const internalExposureLimit = Number((Math.max(Math.abs(totalExposure) * 1.2, structuralExposureTotal + 60) + 25).toFixed(1));
    return {
      label,
      values: {
        spotAsset: Number(spotAsset.toFixed(1)),
        spotLiability: Number(spotLiability.toFixed(1)),
        forwardBuy: Number(forwardBuy.toFixed(1)),
        forwardSell: Number(forwardSell.toFixed(1)),
        adjustedOptionPosition,
        netExposure,
        structuralExposure,
        totalExposure,
        structuralExposureTotal,
        internalExposureLimit,
      },
    };
  });

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th>币种</th>
              ${columns.map((column) => `<th>${column.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${columns.map((column) => `<td>${Number(row.values[column.key]).toFixed(1)}</td>`).join("")}
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

function renderBenchmarkCurrencyMatrixTable(widget, chartContext) {
  const rowLabels = WIDGET_FILTER_PRESET_CONFIG.benchmarkSelector?.options || FILTER_OPTIONS["利率基准"] || ["DR007"];
  const columnLabels = uniqueList(FILTER_OPTIONS["币种"] || ["全折人民币"]);
  const dimension = (chartContext.filterState["维度"] || WIDGET_FILTER_PRESET_CONFIG.durationDimensionSelector?.defaultValues || ["资产端"])[0] || "资产端";
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: columnLabels,
    维度: [dimension],
  });
  const rows = rowLabels.map((label, rowIndex) => ({
    label,
    values: columnLabels.map((_, columnIndex) => {
      const base = 48 + ((widget.seq * 17 + signature + rowIndex * 19 + columnIndex * 23) % 260);
      if (dimension === "负债端") return Number((-base).toFixed(1));
      if (dimension === "资产负债差额") return Number((((base % 220) - 110) * 1.1).toFixed(1));
      return Number(base.toFixed(1));
    }),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th>利率基准</th>
              ${columnLabels.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
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
      return {
        amount: amount.toFixed(1),
        ratio: `${ratio}%`,
      };
    }),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">币种</th>
              ${columnLabels.map((label) => `<th colspan="2">${label}</th>`).join("")}
            </tr>
            <tr>
              ${columnLabels.map(() => `<th>波动值</th><th>波动率</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.values.map((value) => `<td>${value.amount}</td><td>${value.ratio}</td>`).join("")}
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
              <i class="chart-legend__swatch" style="background:${getBarFillColor(label, allSeries, index, 0.9)}"></i>
              ${label}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDonut(widget, chartContext) {
  const allLabels = getDistributionLabels(widget, chartContext).slice(0, 4);
  const selectedLabels = getLegendSelection(widget.seq, "__legend_series__", allLabels);
  const labels = selectedLabels.length ? selectedLabels : allLabels.slice(0, 1);
  const distributionValues = buildDistributionValues(widget, allLabels, chartContext.signature);
  const weights = labels.map((label) => {
    const valueIndex = allLabels.indexOf(label);
    return distributionValues[valueIndex] || 1;
  });
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

function getDistributionLabels(widget, chartContext) {
  const configuredLabels = getConfiguredWidgetBehavior(widget).distributionLabels;
  if (Array.isArray(configuredLabels) && configuredLabels.length) {
    return configuredLabels.filter((label) => typeof label === "string" && label.trim()).slice(0, 6);
  }
  return chartContext.seriesList.length > 1 ? chartContext.seriesList : buildDefaultTableLabels(widget);
}

function buildDistributionValues(widget, labels, signature) {
  const values = buildBarValues(widget.seq + 7, labels.length, signature);
  if (labels.length === 2 && labels.includes("一级资产") && labels.includes("二级资产")) {
    return labels.map((label, index) => {
      const baseValue = values[index] || 0;
      if (label === "一级资产") return 58 + (baseValue % 24);
      return 18 + (baseValue % 18);
    });
  }
  if (labels.length === 2 && labels.includes("超额存款准备金") && labels.includes("库存现金")) {
    return labels.map((label, index) => {
      const baseValue = values[index] || 0;
      if (label === "超额存款准备金") return 56 + (baseValue % 22);
      return 18 + (baseValue % 16);
    });
  }
  return values;
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
  const allLegendValues = legendItems.map((item) => item.filterValue || item.label);
  const explicitSelectedLabels = ((appState.widgetFilters[widget.seq] || {})[legendKey] || []).filter((value) =>
    allLegendValues.includes(value)
  );
  const fallbackSelectedLabels = (chartContext.seriesList || []).filter((value) => allLegendValues.includes(value));
  const selectedLabels = explicitSelectedLabels.length
    ? explicitSelectedLabels
    : fallbackSelectedLabels.length
      ? fallbackSelectedLabels
      : allLegendValues;
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
              <i class="chart-legend__swatch" style="background:${item.color || getPaletteColor(item.label, allLegendValues, index, "line")}; opacity:${item.dashed ? "0.65" : "1"}"></i>
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

function getFrameXPosition(frame, index, count) {
  const step = count <= 1 ? 0 : frame.width / (count - 1);
  return Number((frame.left + step * index).toFixed(1));
}

function getFrameMinStep(frame, count) {
  return count <= 1 ? frame.width : frame.width / Math.max(1, count - 1);
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

function renderWidgetDateRangeInlineControl(widgetSeq, filterName, filterLabel, selectedValues) {
  const [startDate, endDate] = normalizeBusinessStructureDateRange(selectedValues);
  return `
    <div class="chart-inline-control chart-inline-control--daterange">
      <span class="chart-inline-control__label">${filterLabel}</span>
      <div class="inline-date-range">
        <label class="inline-date-range__field">
          <span>开始时间</span>
          <input
            class="inline-date-range__input"
            type="date"
            value="${startDate}"
            max="${endDate}"
            data-inline-date-filter="true"
            data-widget-seq="${widgetSeq}"
            data-filter-name="${filterName}"
            data-range-index="0"
          >
        </label>
        <label class="inline-date-range__field">
          <span>结束时间</span>
          <input
            class="inline-date-range__input"
            type="date"
            value="${endDate}"
            min="${startDate}"
            max="${getDefaultGlobalEndDate()}"
            data-inline-date-filter="true"
            data-widget-seq="${widgetSeq}"
            data-filter-name="${filterName}"
            data-range-index="1"
          >
        </label>
      </div>
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

  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">${yLabel}</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${inferXAxisTitle(xLabels)}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    ${yTickMarkup}
    ${xTickMarkup}
  `;
}

function formatXAxisTickLabel(label, index, labels) {
  const text = String(label || "");
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

function usesTemporalAxis(labels = []) {
  if (!Array.isArray(labels) || !labels.length) return false;
  return labels.every((label) => {
    const text = String(label || "");
    return /^\d{4}-\d{2}$/.test(text)
      || /^\d{2}$/.test(text)
      || /^\d{1,2}\/\d{1,2}$/.test(text);
  });
}

function inferXAxisTitle(xLabels) {
  const joined = xLabels.join("");
  if (joined.includes("月")) return "统计月份";
  if (joined.includes("日")) return "统计日期";
  if (joined.includes("/")) return "统计日期";
  if (joined.includes("Q")) return "统计季度";
  return "时间/维度";
}

function inferXAxisLabels(widget, filterState = {}) {
  if (supportsFrequencyToggle(widget)) {
    return getWidgetFrequency(widget, filterState) === "日频"
      ? buildRecentDailyXAxisLabels(widget)
      : inferBaseXAxisLabels(widget);
  }
  return inferBaseXAxisLabels(widget);
}

function ensureGlobalDateRange() {
  const defaultEndDate = getDefaultGlobalEndDate();
  const defaultStartDate = getDefaultGlobalStartDate();
  if (!appState.globalStartDate) appState.globalStartDate = defaultStartDate;
  if (!appState.globalEndDate) appState.globalEndDate = defaultEndDate;
  if (appState.globalEndDate > defaultEndDate) appState.globalEndDate = defaultEndDate;
  if (appState.globalStartDate > appState.globalEndDate) {
    appState.globalStartDate = defaultStartDate;
    appState.globalEndDate = defaultEndDate;
  }
}

function renderGlobalDateRangeControl() {
  if (!globalStartInputEl || !globalEndInputEl) return;
  const defaultEndDate = getDefaultGlobalEndDate();
  globalStartInputEl.removeAttribute("min");
  globalStartInputEl.max = appState.globalEndDate || defaultEndDate;
  globalStartInputEl.value = appState.globalStartDate || getDefaultGlobalStartDate();
  globalEndInputEl.min = appState.globalStartDate || "";
  globalEndInputEl.max = defaultEndDate;
  globalEndInputEl.value = appState.globalEndDate || defaultEndDate;
}

function getDefaultGlobalEndDate() {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateValue(yesterday);
}

function getDefaultGlobalStartDate() {
  const monthEnd13MonthsAgo = new Date();
  monthEnd13MonthsAgo.setHours(0, 0, 0, 0);
  monthEnd13MonthsAgo.setDate(1);
  monthEnd13MonthsAgo.setMonth(monthEnd13MonthsAgo.getMonth() - 12);
  monthEnd13MonthsAgo.setDate(0);
  return formatDateValue(monthEnd13MonthsAgo);
}

function getDefaultBusinessStructureDateRange() {
  const endDate = getDefaultGlobalEndDate();
  return [getMonthStartDateValue(endDate), endDate];
}

function getMonthStartDateValue(referenceDateValue) {
  const parsed = parseDateValue(referenceDateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  return formatDateValue(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
}

function isDateValue(value) {
  return Boolean(parseDateValue(value));
}

function normalizeBusinessStructureDateRange(values = []) {
  const [defaultStart, defaultEnd] = getDefaultBusinessStructureDateRange();
  let startDate = Array.isArray(values) && isDateValue(values[0]) ? values[0] : defaultStart;
  let endDate = Array.isArray(values) && isDateValue(values[1]) ? values[1] : defaultEnd;
  if (endDate > defaultEnd) endDate = defaultEnd;
  if (startDate > endDate) startDate = endDate;
  return [startDate, endDate];
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

function applyGlobalDateRangeToLabels(widget, labels, filterState = {}) {
  const rangeStart = appState.globalStartDate;
  const rangeEnd = appState.globalEndDate;
  if (!rangeStart && !rangeEnd) return labels;
  const datedEntries = buildTimelineEntries(widget, labels, filterState).filter((entry) => entry.date);
  if (!datedEntries.length) return labels;
  const visible = datedEntries
    .filter((entry) => isTimelineEntryWithinRange(entry, rangeStart, rangeEnd))
    .map((entry) => entry.label);
  return visible.length ? visible : [datedEntries[0].label];
}

function isTimelineEntryWithinRange(entry, rangeStart, rangeEnd) {
  if (entry.rangeStart || entry.rangeEnd) {
    const entryStart = entry.rangeStart || entry.date;
    const entryEnd = entry.rangeEnd || entry.date;
    return (!rangeStart || entryEnd >= rangeStart) && (!rangeEnd || entryStart <= rangeEnd);
  }
  return (!rangeStart || entry.date >= rangeStart) && (!rangeEnd || entry.date <= rangeEnd);
}

function buildTimelineEntries(widget, labels = inferXAxisLabels(widget), filterState = {}) {
  if (supportsFrequencyToggle(widget) && getWidgetFrequency(widget, filterState) === "日频") {
    return buildDailyTimelineEntries(labels);
  }
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
      return buildMonthlyTimelineEntry(label, currentYear, previousMonth);
    }
    if (monthMatch) {
      const month = Number(monthMatch[1]);
      if (currentYear == null) currentYear = getReferenceYear();
      if (previousMonth != null && month < previousMonth && previousMonth !== 12) {
        currentYear += 1;
      }
      previousMonth = month;
      return buildMonthlyTimelineEntry(label, currentYear, month);
    }
    return { label, date: null };
  });
}

function buildMonthlyTimelineEntry(label, year, month) {
  const rangeStart = formatDateValue(new Date(year, month - 1, 1));
  const rangeEnd = formatDateValue(new Date(year, month, 0));
  return { label, date: rangeEnd, rangeStart, rangeEnd };
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
    const date = formatDateValue(new Date(year, month - 1, day));
    return { label, date, rangeStart: date, rangeEnd: date };
  });
}

function supportsFrequencyToggle(widget) {
  return Boolean(getConfiguredWidgetBehavior(widget).frequencyToggle);
}

function getManagementLimitConfig(widget) {
  const widgetSeq = Number(widget?.seq);
  const directMatch = MANAGEMENT_LIMIT_CONFIG.find((item) =>
    Array.isArray(item.widgetSeqs) && item.widgetSeqs.includes(widgetSeq)
  );
  if (directMatch) return directMatch;
  const title = String(widget?.title || "");
  return MANAGEMENT_LIMIT_CONFIG.find((item) => Array.isArray(item.matchTitles) && item.matchTitles.some((keyword) => title.includes(keyword))) || null;
}

function getSelectedOrganizations(chartContext) {
  const selected = (chartContext?.filterState?.机构 || DEFAULT_FILTER_VALUES.机构 || []).filter(Boolean);
  return selected.length ? selected : (FILTER_OPTIONS.机构 || []).slice(0, 1);
}

function shortenOrgLabel(name) {
  return String(name || "").replace("汇总", "").replace("分行", "");
}

function renderManagementLimitOverlay(widget, chartContext, frame) {
  const limitConfig = getManagementLimitConfig(widget);
  if (!limitConfig?.values) return "";
  const orgs = getSelectedOrganizations(chartContext);
  const colors = ["#2F6FA3", "#8A5A44", "#5F8F84", "#8F6AC8", "#D09147"];
  const lines = orgs
    .map((org, index) => {
      const value = Number(limitConfig.values[org]);
      if (!Number.isFinite(value)) return null;
      const y = Number((frame.bottom - (frame.height * value) / 100).toFixed(1));
      const label = `${shortenOrgLabel(org)}限额 ${value.toFixed(0)}`;
      const labelY = Math.max(frame.top + 14, Math.min(frame.bottom - 8, y - 8 - (index % 2) * 12));
      return { y, color: colors[index % colors.length], label, labelY };
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return lines
    .map(
      (line) => `
        <line x1="${frame.left}" y1="${line.y}" x2="${frame.right}" y2="${line.y}" stroke="${hexToRgba(line.color, 0.8)}" stroke-width="2" stroke-dasharray="8 6"></line>
        <text x="${frame.left + 8}" y="${line.labelY}" class="axis-title axis-title--minor" fill="${line.color}">${line.label}</text>
      `
    )
    .join("");
}

function getWidgetFrequency(widget, filterState = {}) {
  if (!supportsFrequencyToggle(widget)) return null;
  const values = filterState["频率"] || [];
  return values.includes("日频") ? "日频" : "月频";
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
  if (grain.includes("月")) return buildMonthlyXAxisLabels();
  return ["T1", "T2", "T3", "T4", "T5", "T6"];
}

function buildMonthlyXAxisLabels() {
  const rangeStart = parseDateValue(appState.globalStartDate || getDefaultGlobalStartDate());
  const rangeEnd = parseDateValue(appState.globalEndDate || getDefaultGlobalEndDate());
  if (!rangeStart || !rangeEnd) return ["2025-07", "08", "09", "10", "11", "12", "2026-01", "02", "03", "04"];
  const startMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
  const labels = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    labels.push(labels.length === 0 || month === "01" ? `${cursor.getFullYear()}-${month}` : month);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels.length ? labels : [`${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}`];
}

function buildRecentDailyXAxisLabels(widget) {
  const endDate = getWidgetObservationDate(widget);
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 32);
  return Array.from({ length: 33 }, (_, index) => {
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
    return `${current.getMonth() + 1}/${String(current.getDate()).padStart(2, "0")}`;
  });
}

function getWidgetObservationDate(widget) {
  const pivot = getReferenceTimelinePivot();
  const monthEnd = new Date(pivot.year, pivot.month, 0);
  const today = new Date();
  const todayInPivotMonth = today.getFullYear() === pivot.year && today.getMonth() + 1 === pivot.month;
  const latestAllowedDate = todayInPivotMonth && today < monthEnd ? today : monthEnd;
  const selectedEndDate = parseDateValue(appState.globalEndDate);
  if (selectedEndDate) {
    return selectedEndDate < latestAllowedDate ? selectedEndDate : latestAllowedDate;
  }
  return latestAllowedDate;
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
  const configuredBehavior = getConfiguredWidgetBehavior(widget);
  if (configuredBehavior.yAxisLabel) return configuredBehavior.yAxisLabel;
  const metric = widget.metricDescription || "";
  if (metric.includes("久期")) return "久期";
  if (metric.includes("比率") || metric.includes("波动率")) return "比例 (%)";
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
      state[name] = getAreaDefaultFilterValues(areaGroup, name, optionValues);
    });
    appState.areaFilters[areaGroup.id] = state;
  }
  return appState.areaFilters[areaGroup.id];
}

function getAreaDefaultFilterValues(areaGroup, filterName, optionValues) {
  if (filterName === "机构") {
    const areaTabs = getAreaSubpageConfig(areaGroup);
    const tabInstitutions = uniqueList(
      (areaTabs || []).flatMap((tab) => Array.isArray(tab.matchInstitutions) ? tab.matchInstitutions : [])
    ).filter((value) => optionValues.includes(value));
    if (tabInstitutions.length) return tabInstitutions;
  }
  return getDefaultFilterValues(filterName, optionValues);
}

function ensureAreaSubpageState(areaGroup, areaState = ensureAreaFilterState(areaGroup)) {
  const tabs = getAreaSubpageTabs(areaGroup, areaState);
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

function getAreaSubpageTabs(areaGroup, areaState = ensureAreaFilterState(areaGroup)) {
  const areaTabs = getAreaSubpageConfig(areaGroup);
  if (!areaTabs) return [];
  const selectedInstitutions = (areaState["机构"] || []).filter(Boolean);
  return uniqueList(
    areaTabs
      .filter((tab) => {
        const matchesScope = areaGroup.viewGroups.some((viewGroup) => viewGroupMatchesTab(viewGroup, tab));
        if (!matchesScope) return false;
        if (!Array.isArray(tab.matchInstitutions) || !tab.matchInstitutions.length) return true;
        return selectedInstitutions.some((institution) => tab.matchInstitutions.includes(institution));
      })
      .map((tab) => tab.label)
  );
}

function getAreaSubpageLabel(areaGroup, viewScope) {
  const matchedTab = getAreaSubpageMatch(areaGroup, viewScope);
  return matchedTab?.label || null;
}

function getAreaSubpageMatch(areaGroup, viewScope) {
  const areaTabs = getAreaSubpageConfig(areaGroup);
  if (!areaTabs) return null;
  const candidate = typeof viewScope === "object" ? viewScope : { viewScope };
  return areaTabs.find((tab) => viewGroupMatchesTab(candidate, tab)) || null;
}

function getVisibleAreaViewGroups(areaGroup, areaSubpage, block) {
  const areaDisplay = getAreaDisplayConfig(areaGroup, block);
  if (areaDisplay.mergeViewGroups && !areaSubpage.tabs.length) {
    return [mergeAreaViewGroups(areaGroup)];
  }

  if (!areaSubpage.tabs.length) return areaGroup.viewGroups;

  const activeViewGroups = areaGroup.viewGroups.filter(
    (viewGroup) => getAreaSubpageLabel(areaGroup, viewGroup) === areaSubpage.activeTab
  );
  const pinnedViewGroup = findPinnedViewGroup(areaGroup.viewGroups, areaDisplay.pinnedViewScopeIncludes);
  return pinnedViewGroup ? uniqueViewGroups([...activeViewGroups, pinnedViewGroup]) : activeViewGroups;
}

function getPageBehavior(page = getCurrentPage()) {
  if (!page?.name) return {};
  return PAGE_BEHAVIOR_CONFIG[page.name] || {};
}

function getBlockDisplayConfig(block, page = getCurrentPage()) {
  if (!page?.name || !block?.name) return {};
  const legacyConfig = BLOCK_DISPLAY_CONFIG[page.name]?.[block.name] || {};
  const unifiedConfig = LAYOUT_RULE_CONFIG.blocks?.[`${page.name}/${block.name}`] || {};
  return { ...legacyConfig, ...unifiedConfig };
}

function getAreaDisplayConfig(areaGroup, block, page = getCurrentPage()) {
  if (!page?.name || !block?.name || !areaGroup?.name) return {};
  const legacyConfig = AREA_DISPLAY_CONFIG[page.name]?.[block.name]?.[areaGroup.name] || {};
  const unifiedConfig = LAYOUT_RULE_CONFIG.areas?.[`${page.name}/${block.name}/${areaGroup.name}`] || {};
  return { ...legacyConfig, ...unifiedConfig };
}

function mergeAreaViewGroups(areaGroup) {
  return {
    id: `${areaGroup.id}-merged`,
    viewScope: "merged",
    widgets: areaGroup.viewGroups.flatMap((viewGroup) => viewGroup.widgets || []),
  };
}

function findPinnedViewGroup(viewGroups, matchers = []) {
  if (!Array.isArray(matchers) || !matchers.length) return null;
  const exactMatch = viewGroups.find((viewGroup) =>
    matchers.some((matcher) => String(viewGroup?.viewScope || "") === String(matcher || ""))
  );
  if (exactMatch) return exactMatch;
  return viewGroups.find((viewGroup) =>
    matchers.some((matcher) => getViewGroupScopeLookup(viewGroup).includes(matcher))
  ) || null;
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
    if (filter.type === "dateRange") {
      if (!Array.isArray(currentValues) || currentValues.length !== 2 || !currentValues.every(isDateValue)) {
        appState.widgetFilters[widget.seq][filter.name] = normalizeBusinessStructureDateRange(currentValues);
      }
      return;
    }
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

function toggleLegendSelection(widgetSeq, legendKey, filterValue, allOptions, baselineSelection = null) {
  const stateBucket = appState.widgetFilters[widgetSeq] || {};
  const initialSelection = Array.isArray(baselineSelection) && baselineSelection.length
    ? baselineSelection.filter((value) => allOptions.includes(value))
    : getLegendSelection(widgetSeq, legendKey, allOptions);
  const current = new Set(initialSelection);
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
  const configuredBehavior = getConfiguredWidgetBehavior(widget);
  if (Object.prototype.hasOwnProperty.call(configuredBehavior, "supportsDisplayToggle")) {
    return Boolean(configuredBehavior.supportsDisplayToggle);
  }
  return !String(widget.componentType || "").includes("表格");
}

function getDefaultFilterValues(filterName, optionValues = null) {
  const options = optionValues || FILTER_OPTIONS[filterName] || ["默认口径"];
  const configuredDefaults = (DEFAULT_FILTER_VALUES[filterName] || []).filter((value) => options.includes(value));
  if (Array.isArray(configuredDefaults) && configuredDefaults.length) {
    return [...configuredDefaults];
  }
  return options.slice(0, 1);
}

function getAreaFilterPreset(area) {
  return FILTER_PRESET_CONFIG[String(area?.filterPreset || "")] || null;
}

function resolveAreaSharedFilters(area) {
  const orderedFilters = [...(getAreaFilterPreset(area) || []), ...((area?.sharedFilters || []))];
  const normalizedMap = new Map();
  orderedFilters.forEach((filterLabel) => {
    const normalized = normalizeFilterName(filterLabel);
    if (!normalized) return;
    normalizedMap.set(normalized, filterLabel);
  });
  return Array.from(normalizedMap.values());
}

function getViewGroupScopeLookup(viewGroup) {
  const scopeMeta = viewGroup?.scopeMeta || {};
  return [
    viewGroup?.viewScope,
    scopeMeta.tabKey,
    scopeMeta.institution,
    scopeMeta.snapshotMode === "snapshot" ? "时点" : "",
    scopeMeta.snapshotMode === "trend" ? "时间序列" : "",
    scopeMeta.timeMode === "monthly" ? "月频" : "",
    scopeMeta.timeMode === "frequencyToggle" ? "月频 / 日频" : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function viewGroupMatchesTab(viewGroup, tab) {
  if (!viewGroup || !tab) return false;
  const scopeMeta = viewGroup.scopeMeta || {};
  const metaMatcher = tab.matchScopeMeta || {};
  if (metaMatcher.tabGroup && scopeMeta.tabGroup !== metaMatcher.tabGroup) return false;
  if (metaMatcher.tabKey && scopeMeta.tabKey !== metaMatcher.tabKey) return false;
  if (metaMatcher.institution && scopeMeta.institution !== metaMatcher.institution) return false;
  if (Object.keys(metaMatcher).length) return true;
  return getViewGroupScopeLookup(viewGroup).includes(tab.matchViewScope || "");
}

function getWidgetTableTemplateKey(widget, fallbackKey = "compact") {
  const behavior = getConfiguredWidgetBehavior(widget);
  if (behavior.tableTemplate) return behavior.tableTemplate;
  if (
    behavior.tableKind === "eveCombined"
    || behavior.tableKind === "niiCurrencyMatrix"
    || behavior.tableKind === "durationGapMatrix"
    || behavior.tableKind === "benchmarkCurrencyMatrix"
    || behavior.tableKind === "fxExposureMatrix"
  ) {
    return "matrix";
  }
  if (behavior.tableKind === "businessStructure") return "businessStructure";
  if (behavior.tableKind === "businessDetail") return "businessDetail";
  if (behavior.chartKind === "futureFundingFlow" || behavior.chartKind === "fundingFlowScale") return "compact";
  if (behavior.chartKind === "businessScaleGrowth" || behavior.chartKind === "balanceScaleGrowth") return "timeSeries";
  if (behavior.chartKind === "businessDurationRepricing" || behavior.chartKind === "durationRepricing") return "timeSeries";
  if (behavior.chartKind === "reserveRatioScaleCombo" || behavior.chartKind === "liquidityAssetLiabilityBars") return "timeSeries";
  return fallbackKey;
}

function applyTableTemplateClasses(widget, markup, fallbackKey = "compact") {
  if (!markup || !markup.includes("<table")) return markup;
  const templateKey = getWidgetTableTemplateKey(widget, fallbackKey);
  const classNames = TABLE_TEMPLATE_CONFIG[templateKey]?.classes;
  if (!Array.isArray(classNames) || !classNames.length) return markup;
  return markup.replace(/<table class="[^"]*"/, `<table class="${classNames.join(" ")}"`);
}

function groupBlockAreas(block) {
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
    target.sharedFilters = uniqueList([...target.sharedFilters, ...resolveAreaSharedFilters(area)]);
    target.viewGroups.push({
      id: area.id,
      viewScope: area.viewScope,
      scopeMeta: area.scopeMeta || {},
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
  return Boolean(getBlockDisplayConfig(block).pairAreas) && groupedAreas.length === 2;
}

function shouldSpanFullWidth(widget) {
  const layoutConfig = LAYOUT_RULE_CONFIG.widgets?.[String(widget?.seq)] || {};
  if (Object.prototype.hasOwnProperty.call(layoutConfig, "fullWidth")) {
    return Boolean(layoutConfig.fullWidth);
  }
  const configuredBehavior = getConfiguredWidgetBehavior(widget);
  if (Object.prototype.hasOwnProperty.call(configuredBehavior, "fullWidth")) {
    return Boolean(configuredBehavior.fullWidth);
  }
  return widget?.layout === "full";
}

function isInlineWidgetFilter(widgetSeq, filterName) {
  return (getConfiguredWidgetBehaviorBySeq(widgetSeq).inlineFilters || []).includes(filterName);
}

function isRepricingScaleGapWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "repricingScaleGap";
}

function isDurationGapComboWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "durationGapCombo";
}

function isBalanceScaleGrowthWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "balanceScaleGrowth";
}

function isBusinessScaleGrowthWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "businessScaleGrowth";
}

function isFundingFlowScaleWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "fundingFlowScale";
}

function isFutureFundingFlowWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "futureFundingFlow";
}

function isDurationRepricingWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "durationRepricing";
}

function isBusinessDurationRepricingWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "businessDurationRepricing";
}

function isDurationGapMatrixWidget(widget) {
  return getConfiguredWidgetBehavior(widget).tableKind === "durationGapMatrix";
}

function isEveCombinedTableWidget(widget) {
  return getConfiguredWidgetBehavior(widget).tableKind === "eveCombined";
}

function isNiiVolatilityWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "niiVolatility";
}

function isLiquidityGapTenorWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "liquidityGapTenor";
}

function isThirtyDayLiquidityGapWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "thirtyDayLiquidityGap";
}

function isLiquidityAssetLiabilityBarsWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "liquidityAssetLiabilityBars";
}

function isReserveRatioScaleWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "reserveRatioScaleCombo";
}

function isBusinessStructureTableWidget(widget) {
  return getConfiguredWidgetBehavior(widget).tableKind === "businessStructure";
}

function isDonutWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "donut";
}

function getWidgetDisplayTitle(widget) {
  const behavior = getConfiguredWidgetBehavior(widget);
  if (behavior.tableKind === "businessDetail") {
    const scopeMeta = BUSINESS_DETAIL_SCOPE_META[behavior.detailScope || "stock"] || BUSINESS_DETAIL_SCOPE_META.stock;
    return `${scopeMeta.label}明细清单`;
  }
  return formatDisplayTitle(widget.title);
}

function getWidgetSimulationBehavior(widget) {
  return getConfiguredWidgetBehavior(widget).simulationBehavior || null;
}

function getConfiguredWidgetBehavior(widget) {
  return getConfiguredWidgetBehaviorBySeq(widget?.seq);
}

function getConfiguredWidgetBehaviorBySeq(widgetSeq) {
  return WIDGET_BEHAVIOR_CONFIG[String(widgetSeq)] || WIDGET_BEHAVIOR_CONFIG[widgetSeq] || {};
}

function resolveWidgetFilterEntries(entries = []) {
  return (entries || []).flatMap((entry) => {
    if (!entry) return [];
    const presetRefs = [
      entry.presetRef,
      ...(Array.isArray(entry.presetRefs) ? entry.presetRefs : []),
    ].filter(Boolean);
    const expanded = presetRefs
      .map((presetRef) => WIDGET_FILTER_PRESET_CONFIG[presetRef])
      .filter(Boolean)
      .map((preset) => ({ ...preset }));
    if (presetRefs.length && Object.keys(entry).every((key) => key === "presetRef" || key === "presetRefs")) {
      return expanded;
    }
    const mergedEntry = { ...entry };
    delete mergedEntry.presetRef;
    delete mergedEntry.presetRefs;
    return [...expanded, mergedEntry];
  });
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return `rgba(74,143,216,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getPaletteSeries(paletteType = "line") {
  return paletteType === "bar" ? BAR_SERIES_PALETTE : LINE_SERIES_PALETTE;
}

function getBarFillColor(label, allLabels = [], fallbackIndex = 0, alpha = 0.9) {
  return hexToRgba(getPaletteColor(label, allLabels, fallbackIndex, "bar"), alpha);
}

function getBarStrokeColor(label, allLabels = [], fallbackIndex = 0, alpha = 0.32) {
  return hexToRgba(getPaletteColor(label, allLabels, fallbackIndex, "bar"), alpha);
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
  const behavior = getConfiguredWidgetBehavior(widget);
  const dimension = behavior.defaultTableDimension
    || (String(widget.legendDescription || "").includes("币种") ? "币种" : "")
    || (String(widget.legendDescription || "").includes("情景") ? "情景" : "")
    || (String(widget.axisDescription || "").includes("机构") ? "机构" : "");
  if (dimension === "币种") return FILTER_OPTIONS.币种.slice(0, 4);
  if (dimension === "情景") return FILTER_OPTIONS.情景.slice(0, 4);
  if (dimension === "机构") return FILTER_OPTIONS.机构.slice(0, 4);
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

function getPaletteColor(label, allLabels = [], fallbackIndex = 0, paletteType = "line") {
  const palette = getPaletteSeries(paletteType);
  const colorIndex = Array.isArray(allLabels) ? allLabels.indexOf(label) : -1;
  const paletteIndex = colorIndex >= 0 ? colorIndex : fallbackIndex;
  return palette[paletteIndex % palette.length];
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
  return getPageBehavior(page).simulationMode || "generic";
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
  const fxWeight = getSimulationMode(page) === "fx" && !["人民币", "全折人民币"].includes(simulation.currency) ? 1.18 : 1;
  return {
    side,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07) * fxWeight).toFixed(3),
  };
}

function shouldRenderSimulationOverlay(widget, chartContext) {
  if (!chartContext?.pageId) return false;
  if (!getPageSimulation(chartContext.pageId)) return false;
  if (!isSimulationPage(data.pages.find((page) => page.id === chartContext.pageId))) return false;
  if (!getWidgetSimulationBehavior(widget)) return false;
  if (String(widget?.componentType || "").includes("表格")) return false;
  if (isDonutWidget(widget) || String(widget?.componentType || "").includes("分布")) return false;
  return true;
}

function getSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const page = data.pages.find((item) => item.id === chartContext.pageId) || getCurrentPage();
  const profile = getSimulationProfile(page, simulation);
  const simulationBehavior = getWidgetSimulationBehavior(widget) || {};
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const simulationModes = SIMULATION_RULE_CONFIG.modes || {};
  const wholesaleLiabilityTypes = SIMULATION_RULE_CONFIG.wholesaleLiabilityTypes || ["同业负债", "发行债券", "表外衍生品应付"];
  const configuredSensitivity = Number(simulationBehavior.sensitivity);
  let sensitivity = Number.isFinite(configuredSensitivity) ? configuredSensitivity : Number(simulationDefaults.baseSensitivity) || 0.11;
  let direction = 1;
  const isLiabilitySeries = role.includes("liability") || role.includes("负债");
  const isGapSeries = role.includes("gap") || role.includes("差额");
  const isWholesaleLiability = wholesaleLiabilityTypes.includes(simulation.businessType);
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    const modeRule = simulationModes.interest || {};
    direction = profile.side === "asset" ? (modeRule.assetDirection ?? 1) : (modeRule.liabilityDirection ?? -1);
    if (isLiabilitySeries) direction *= -1;
    if (isGapSeries) direction *= profile.side === "asset" ? (modeRule.gapAssetDirection ?? 0.92) : (modeRule.gapLiabilityDirection ?? -0.68);
    if (simulation.rateType === "浮动利率") sensitivity *= Number(simulationDefaults.floatingRateMultiplier) || 0.74;
  } else if (simulationMode === "liquidity") {
    const directionMode = simulationBehavior.directionMode || "default";
    const modeRule = simulationModes.liquidity?.[directionMode] || simulationModes.liquidity?.default || {};
    direction = profile.side === "asset"
      ? (modeRule.assetDirection ?? 0.74)
      : (isWholesaleLiability ? (modeRule.wholesaleLiabilityDirection ?? 0.82) : (modeRule.liabilityDirection ?? -0.42));
  } else {
    const isDomesticCurrency = ["人民币", "全折人民币"].includes(simulation.currency);
    sensitivity *= isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxSensitivityMultiplier) || 0.45)
      : (Number(simulationDefaults.foreignFxSensitivityMultiplier) || 1.14);
    direction = isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxDirection) || 0.34)
      : (Number(simulationDefaults.foreignFxDirection) || 1);
    if (profile.side === "liability" && (seriesLabel || "").includes("负债")) {
      direction *= Number(simulationDefaults.liabilityFxSeriesMultiplier) || 0.82;
    }
  }
  const variationStep = Number(simulationDefaults.variationStep) || 0.035;
  const variation = 1 + (((widget.seq + seriesIndex * 17) % 9) - 4) * variationStep;
  return clampNumber(
    profile.impactScore * sensitivity * direction * variation,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
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
  const baseDate = getWidgetObservationDate(widget);
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

function renderFundingFlowLegend(widgetSeq, legendKey, items) {
  const selectedItems = getLegendSelection(widgetSeq, legendKey, items.map((item) => item.label));
  return `
    <div class="chart-legend">
      ${items
        .map((item) => {
          const isSelected = selectedItems.includes(item.label);
          return `
            <button
              class="chart-legend__item chart-legend__item--button ${isSelected ? "is-selected" : "is-muted"}"
              type="button"
              data-legend-toggle="true"
              data-widget-seq="${widgetSeq}"
              data-legend-key="${legendKey}"
              data-filter-value="${item.label}"
            >
              <i class="chart-legend__swatch" style="background:${item.color}"></i>
              ${item.label}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFundingFlowScaleChart(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  const context = { ...chartContext, xLabels: flowState.history.labels, yLabel: "规模 (亿元)" };
  const frame = createFrame(flowState.history.labels.length);
  const axis = renderAxes(frame, context.xLabels, context.yLabel);
  const leftPointsIn = flowState.history.inflow.map((value, index) => ({ x: getFrameXPosition(frame, index, flowState.history.labels.length), y: frame.bottom - (frame.height * value) / 100 }));
  const leftPointsOut = flowState.history.outflow.map((value, index) => ({ x: getFrameXPosition(frame, index, flowState.history.labels.length), y: frame.bottom - (frame.height * value) / 100 }));
  const legendItems = [
    { label: "资金流入", color: SEMANTIC_COLORS.fundingInflow },
    { label: "资金流出", color: SEMANTIC_COLORS.fundingOutflow },
  ];
  const selectedItems = getLegendSelection(widget.seq, "__legend_funding_history__", legendItems.map((item) => item.label));
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${selectedItems.includes("资金流入")
          ? `
            <polyline fill="none" stroke="${SEMANTIC_COLORS.fundingInflow}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${leftPointsIn.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${leftPointsIn.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${SEMANTIC_COLORS.fundingInflow}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
          `
          : ""}
        ${selectedItems.includes("资金流出")
          ? `
            <polyline fill="none" stroke="${SEMANTIC_COLORS.fundingOutflow}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${leftPointsOut.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${leftPointsOut.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${SEMANTIC_COLORS.fundingOutflow}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
          `
          : ""}
      </svg>
      ${renderFundingFlowLegend(widget.seq, "__legend_funding_history__", legendItems)}
    </div>
  `;
}

function renderFutureFundingFlowChart(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  const context = { ...chartContext, xLabels: flowState.future.labels, yLabel: "净额 / 累计净额" };
  const frame = createFrame(flowState.future.labels.length);
  const axis = renderAxes(frame, context.xLabels, context.yLabel);
  const barWidth = Math.max(10, getFrameMinStep(frame, flowState.future.labels.length) * 0.38);
  const legendItems = [
    { label: "当日净额", color: getBarFillColor("当日净额", ["当日净额"], 0, 0.84) },
    { label: "累计净额", color: SEMANTIC_COLORS.fundingCumulative },
  ];
  const selectedItems = getLegendSelection(widget.seq, "__legend_funding_future__", legendItems.map((item) => item.label));
  const bars = flowState.future.dailyNet.map((value, index) => {
    const baseY = frame.bottom - (frame.height * 20) / 100;
    const height = Math.abs(value) * 2.6;
    const x = getFrameXPosition(frame, index, flowState.future.labels.length) - barWidth / 2;
    const y = value >= 0 ? baseY - height : baseY;
    const fill = value >= 0
      ? hexToRgba(SEMANTIC_COLORS.fundingDailyNetPositive, 0.82)
      : hexToRgba(SEMANTIC_COLORS.fundingDailyNetNegative, 0.82);
    const stroke = value >= 0
      ? hexToRgba(SEMANTIC_COLORS.fundingDailyNetPositive, 0.32)
      : hexToRgba(SEMANTIC_COLORS.fundingDailyNetNegative, 0.32);
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1"></rect>`;
  }).join("");
  const cumulativePoints = flowState.future.cumulativeNet.map((value, index) => {
    const normalized = clampNumber(45 + value * 0.6, 2, 98);
    return { x: getFrameXPosition(frame, index, flowState.future.labels.length), y: frame.bottom - (frame.height * normalized) / 100 };
  });
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${selectedItems.includes("当日净额") ? bars : ""}
        ${selectedItems.includes("累计净额")
          ? `
            <polyline fill="none" stroke="${SEMANTIC_COLORS.fundingCumulative}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${cumulativePoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            ${cumulativePoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${SEMANTIC_COLORS.fundingCumulative}" stroke="#ffffff" stroke-width="2"></circle>`).join("")}
          `
          : ""}
      </svg>
      ${renderFundingFlowLegend(widget.seq, "__legend_funding_future__", legendItems)}
    </div>
  `;
}

function renderFundingFlowScaleDataView(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
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
    </div>
  `;
}

function renderFutureFundingFlowDataView(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
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
    const defaultEndDate = getDefaultGlobalEndDate();
    appState.globalStartDate = event.target.value || getDefaultGlobalStartDate();
    if (appState.globalStartDate > (appState.globalEndDate || defaultEndDate)) appState.globalEndDate = appState.globalStartDate;
    render();
  });
}

if (globalEndInputEl) {
  globalEndInputEl.addEventListener("change", (event) => {
    const defaultEndDate = getDefaultGlobalEndDate();
    appState.globalEndDate = event.target.value || defaultEndDate;
    if (appState.globalEndDate > defaultEndDate) appState.globalEndDate = defaultEndDate;
    if (appState.globalEndDate < (appState.globalStartDate || getDefaultGlobalStartDate())) appState.globalStartDate = appState.globalEndDate;
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

  const openBusinessDetailButton = event.target.closest("[data-open-business-detail]");
  if (openBusinessDetailButton) {
    const { targetWidgetSeq, sourceWidgetSeq, businessType, businessCategory } = openBusinessDetailButton.dataset;
    if (!targetWidgetSeq || !businessType) return;
    appState.businessDrilldowns = {
      ...appState.businessDrilldowns,
      [targetWidgetSeq]: {
        businessType,
        category: businessCategory,
        sourceWidgetSeq: Number(sourceWidgetSeq),
      },
    };
    render();
    window.requestAnimationFrame(() => {
      dashboardViewEl.querySelector(`[data-widget-seq="${targetWidgetSeq}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  const clearBusinessDetailButton = event.target.closest("[data-clear-business-drilldown]");
  if (clearBusinessDetailButton) {
    const nextDrilldowns = { ...(appState.businessDrilldowns || {}) };
    delete nextDrilldowns[clearBusinessDetailButton.dataset.clearBusinessDrilldown];
    appState.businessDrilldowns = nextDrilldowns;
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

  const segmentedFilter = event.target.closest("[data-segmented-filter]");
  if (segmentedFilter) {
    const { widgetSeq, filterName, filterValue } = segmentedFilter.dataset;
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      [filterName]: [filterValue],
    };
    render();
    return;
  }

  const legendToggle = event.target.closest("[data-legend-toggle]");
  if (legendToggle) {
    const { widgetSeq, filterName, filterValue, legendKey } = legendToggle.dataset;
    if (legendKey) {
      const legendItems = Array.from(
        dashboardViewEl.querySelectorAll(`[data-widget-seq="${widgetSeq}"][data-legend-key="${legendKey}"]`)
      );
      const allOptions = legendItems.map((item) => item.dataset.filterValue).filter(Boolean);
      const visibleSelection = legendItems
        .filter((item) => item.classList.contains("is-selected"))
        .map((item) => item.dataset.filterValue)
        .filter(Boolean);
      toggleLegendSelection(widgetSeq, legendKey, filterValue, allOptions, visibleSelection);
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

dashboardViewEl.addEventListener("change", (event) => {
  const dateField = event.target.closest("[data-inline-date-filter]");
  if (!dateField) return;
  const { widgetSeq, filterName, rangeIndex } = dateField.dataset;
  const widgetState = appState.widgetFilters[widgetSeq] || {};
  const nextRange = normalizeBusinessStructureDateRange(widgetState[filterName]);
  nextRange[Number(rangeIndex)] = dateField.value || nextRange[Number(rangeIndex)];
  if (rangeIndex === "0" && nextRange[0] > nextRange[1]) nextRange[1] = nextRange[0];
  if (rangeIndex === "1" && nextRange[1] < nextRange[0]) nextRange[0] = nextRange[1];
  appState.widgetFilters[widgetSeq] = {
    ...widgetState,
    [filterName]: normalizeBusinessStructureDateRange(nextRange),
  };
  render();
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
