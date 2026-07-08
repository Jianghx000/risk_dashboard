const data = window.dashboardData;
const config = window.dashboardConfig || {};
const mockAdapter = window.dashboardMockAdapter || {};
const FILTER_OPTIONS = config.filters?.options || config.filterOptions || {};
const FILTER_PRESET_CONFIG = config.filters?.presets || {};
const AREA_FILTER_OPTION_OVERRIDES = config.filters?.areaOverrides || {};
const DEFAULT_FILTER_VALUES = config.filters?.defaults || config.defaultFilters || {};
const PAGE_SHARED_FILTER_LABELS = ["机构", "币种"];
const PAGE_SHARED_FILTER_NAMES = new Set(["机构", "币种"]);
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
const BUSINESS_DURATION_OPTIONS = ["自营贷款", "投资类业务", "同业资产", "自营非标投资", "存放央行", "内部交易资产", "活期存款", "定期存款", "同业负债", "发行债券", "中央行借款", "租赁负债", "内部交易负债", "表外衍生品应付", "表外衍生品应收"];
const LIQUIDITY_GAP_TENOR_OPTIONS = ["1D", "7D", "30D", "3M"];
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
const FUTURE_MATURITY_MONTH_COUNT = 6;
const SIMULATION_FUNDING_ROLE_OPTIONS = ["资金来源", "资金运用"];
const SIMULATION_MODE_NEW_BUSINESS = "newBusiness";
const SIMULATION_MODE_HEDGE = "hedge";
const SIMULATION_MODULE_NET_INTEREST_INCOME = "netInterestIncome";
const SIMULATION_MODULE_LIQUIDITY_STRESS = "liquidityStress";
const EVE_RATIO_WIDGET_SEQ = 1;
const EVE_SOURCE_TREND_WIDGET_SEQS = new Set([3, 4]);
const EVE_SCENARIO_DEFINITIONS = [
  { key: "parallel-up", name: "平行上移", base: 76, slope: 4.1, wave: 9 },
  { key: "parallel-down", name: "平行下移", base: 55, slope: 2.6, wave: 6 },
  { key: "steepener", name: "变陡峭", base: 39, slope: 2.3, wave: 5 },
  { key: "flattener", name: "变平缓", base: 30, slope: 1.5, wave: 4 },
  { key: "short-up", name: "短端上升", base: 61, slope: 2.7, wave: 7 },
  { key: "short-down", name: "短端下降", base: 36, slope: 1.9, wave: 4.5 },
];
const EVE_COLOR_PRIMARY = "#4289EE";
const EVE_COLOR_WORST = "#C86F43";
const FLATTENED_BLOCK_LAYER_NAMES = new Set(["核心风险指标", "缺口风险", "现金流错配"]);
const HIDDEN_WIDGET_SEQS = new Set([5, 8, 10, 11, 16, 17]);
const REPRICING_GAP_RATE_WIDGET_SEQS = new Set([9, 15]);
const REPRICING_GAP_COLOR = "#4289EE";
const REPRICING_FREQUENCY_OPTIONS = [
  { label: "按月重定价", value: "1" },
  { label: "按季重定价", value: "3" },
  { label: "按半年重定价", value: "6" },
  { label: "按年重定价", value: "12" },
  { label: "到期一次性重定价", value: "24" },
];
const BUSINESS_SIDE_MAP = {
  自营贷款: "asset",
  投资类业务: "asset",
  同业资产: "asset",
  自营非标投资: "asset",
  存放央行: "asset",
  内部交易资产: "asset",
  活期存款: "liability",
  定期存款: "liability",
  同业负债: "liability",
  发行债券: "liability",
  中央行借款: "liability",
  租赁负债: "liability",
  内部交易负债: "liability",
  表外衍生品应付: "liability",
  表外衍生品应收: "asset",
};
const HEDGEABLE_ITEM_OPTIONS = [
  {
    id: "HT-LOAN-2026-001",
    type: "贷款",
    businessType: "自营贷款",
    org: "香港分行",
    currency: "美元",
    balance: 168.5,
    rateType: "浮动利率",
    rateBenchmark: "SOFR 3M",
    couponRate: "4.38%",
    repricingCycle: "3M",
    repricingMonths: "3",
    originalTerm: "5年",
    remainingTerm: "3.2年",
    remainingTermMonths: 38,
    nextRepricingDate: "2026/08/01",
  },
  {
    id: "HT-BOND-2026-014",
    type: "债券",
    businessType: "投资类业务",
    org: "纽约分行",
    currency: "美元",
    balance: 92.8,
    rateType: "固定利率",
    rateBenchmark: "UST 5Y",
    couponRate: "3.75%",
    ytm: "3.92%",
    modifiedDuration: "4.6",
    repricingCycle: "到期一次",
    repricingMonths: "24",
    originalTerm: "7年",
    remainingTerm: "4.6年",
    remainingTermMonths: 55,
    nextRepricingDate: "2030/02/15",
  },
  {
    id: "HT-LOAN-2026-027",
    type: "贷款",
    businessType: "自营贷款",
    org: "新加坡分行",
    currency: "新加坡元",
    balance: 74.2,
    rateType: "浮动利率",
    rateBenchmark: "SORA 1M",
    couponRate: "3.18%",
    repricingCycle: "1M",
    repricingMonths: "1",
    originalTerm: "3年",
    remainingTerm: "1.7年",
    remainingTermMonths: 20,
    nextRepricingDate: "2026/07/28",
  },
  {
    id: "HT-BOND-2026-038",
    type: "债券",
    businessType: "投资类业务",
    org: "卢森堡分行",
    currency: "欧元",
    balance: 128.6,
    rateType: "固定利率",
    rateBenchmark: "EUR Swap 5Y",
    couponRate: "2.86%",
    ytm: "3.04%",
    modifiedDuration: "5.1",
    repricingCycle: "到期一次",
    repricingMonths: "24",
    originalTerm: "10年",
    remainingTerm: "5.4年",
    remainingTermMonths: 65,
    nextRepricingDate: "2031/01/20",
  },
];
const BUSINESS_STRUCTURE_GROUPS = [
  {
    category: "生息资产",
    items: ["自营贷款", "投资类业务", "同业资产", "自营非标投资", "存放央行", "内部交易资产"],
  },
  {
    category: "付息负债",
    items: ["活期存款", "定期存款", "同业负债", "发行债券", "中央行借款", "租赁负债", "内部交易负债"],
  },
  {
    category: "表外衍生品",
    items: ["表外衍生品应付", "表外衍生品应收"],
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
  pageFilters: {},
  areaFilters: {},
  areaSubpages: {},
  widgetFilters: {},
  widgetDisplayModes: {},
  openFilterKey: null,
  globalStartDate: null,
  globalEndDate: null,
  pageSimulations: {},
  simulationModalPageId: null,
  simulationDraftMode: SIMULATION_MODE_NEW_BUSINESS,
  simulationDraft: null,
  hedgeSimulationDraft: null,
  insightWidgetSeq: null,
  evePointPopover: null,
  eveProcessModal: null,
  liquidityMetricPointPopover: null,
  liquidityProcessModal: null,
  repricingGapPointPopover: null,
  repricingGapProcessModal: null,
  processSparklinePreview: null,
  repricingMaturityDrilldowns: {},
  futureFundingFlowDrilldowns: {},
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
const eveProcessModalEl = ensureOverlayRoot("eveProcessModal");
const liquidityProcessModalEl = ensureOverlayRoot("liquidityProcessModal");
const repricingGapProcessModalEl = ensureOverlayRoot("repricingGapProcessModal");
const processSparklinePreviewEl = ensureOverlayRoot("processSparklinePreview");
let activeBlockSyncQueued = false;

function render() {
  ensureGlobalDateRange();
  renderGlobalDateRangeControl();
  renderPageTabs();
  renderCurrentPage();
  renderFilterPopover();
  renderSimulationModal();
  renderInsightModal();
  renderEveProcessModal();
  renderLiquidityProcessModal();
  renderRepricingGapProcessModal();
  renderProcessSparklinePreview();
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
          <span class="page-tab__label">${page.name}</span>
        </button>
      `
    )
    .join("");
}

function renderCurrentPage() {
  const page = getCurrentPage();
  if (!page) return;
  ensurePageFilterState(page);
  appState.activeBlockId = null;

  const simulationButton = isSimulationPage(page)
    ? `<button class="toolbar-action toolbar-action--primary" type="button" data-open-simulation="${page.id}">模拟测算</button>`
    : "";
  blockPillsEl.innerHTML = `
    <div class="page-shared-filterbar">
      <div class="filter-panel filter-panel--inline page-shared-filterbar__filters">
        ${renderPageSharedFilters(page)}
      </div>
    </div>
    ${simulationButton}
  `;

  dashboardViewEl.innerHTML = renderFlatDashboardPage(page);
}

function ensurePageFilterState(page = getCurrentPage()) {
  if (!page?.id) return {};
  if (!appState.pageFilters[page.id]) appState.pageFilters[page.id] = {};
  PAGE_SHARED_FILTER_LABELS.forEach((filterLabel) => {
    const name = normalizeFilterName(filterLabel);
    if (Array.isArray(appState.pageFilters[page.id][name]) && appState.pageFilters[page.id][name].length) return;
    appState.pageFilters[page.id][name] = getDefaultFilterValues(name, FILTER_OPTIONS[name] || ["默认口径"]);
  });
  return appState.pageFilters[page.id];
}

function renderPageSharedFilters(page = getCurrentPage()) {
  const pageState = ensurePageFilterState(page);
  return PAGE_SHARED_FILTER_LABELS
    .map((filterLabel) => {
      const name = normalizeFilterName(filterLabel);
      return renderFilterGroup("page", page.id, filterLabel, pageState[name] || [], FILTER_OPTIONS[name] || ["默认口径"]);
    })
    .join("");
}

function applyPageSharedFiltersToState(state, page = getCurrentPage()) {
  const pageState = ensurePageFilterState(page);
  PAGE_SHARED_FILTER_NAMES.forEach((name) => {
    state[name] = [...(pageState[name] || [])];
  });
  return state;
}

function renderFlatDashboardPage(page = getCurrentPage()) {
  const cards = [];
  const simulationSummary = renderSimulationSummary();
  (page?.blocks || []).forEach((block) => {
    groupBlockAreas(block).forEach((areaGroup) => {
      const baseAreaState = ensureAreaFilterState(areaGroup);
      const areaState = applyPageSharedFiltersToState(cloneFilterState(baseAreaState), page);
      const areaSubpage = ensureAreaSubpageState(areaGroup, areaState);
      const visibleViewGroups = getVisibleAreaViewGroups(areaGroup, areaSubpage, block);
      visibleViewGroups.forEach((viewGroup) => {
        const viewScopedState = applyPageSharedFiltersToState(
          getViewGroupScopedAreaState(areaGroup, viewGroup, areaState),
          page
        );
        const sharedContextControls = renderFlatWidgetContextControls(areaGroup, areaState);
        (viewGroup.widgets || [])
          .flatMap((widget) => getFlatRenderableWidgets(widget))
          .forEach((widget) => {
            const contextControls = isRepricingMaturityDistributionWidget(widget)
              ? renderFlatWidgetContextControls(areaGroup, areaState, { hideSubtabs: true })
              : sharedContextControls;
            const cardOptions = {
              contextControls,
              flatMode: true,
              widgetStateOverride: widget.__forcedFrequency ? { 频率: [widget.__forcedFrequency] } : null,
              hiddenLocalFilterNames: widget.__forcedFrequency ? ["频率"] : [],
            };
            cards.push(renderWidgetCard(areaGroup, widget, viewScopedState, cardOptions));
          });
      });
    });
  });
  return `
    ${simulationSummary}
    <section class="flat-dashboard-grid">
      ${cards.join("")}
    </section>
  `;
}

function getFlatRenderableWidgets(widget) {
  if (shouldHideWidget(widget)) return [];
  if (isBaseRepricingGapRateWidget(widget)) return createRepricingGapFrequencyWidgets(widget);
  return [widget];
}

function shouldHideWidget(widget) {
  return isEveSourceTrendWidget(widget) || HIDDEN_WIDGET_SEQS.has(Number(widget?.seq));
}

function isBaseRepricingGapRateWidget(widget) {
  return REPRICING_GAP_RATE_WIDGET_SEQS.has(Number(widget?.seq));
}

function createRepricingGapFrequencyWidgets(widget) {
  return [
    createVirtualRepricingGapWidget(widget, "月频", 1),
    createVirtualRepricingGapWidget(widget, "日频", 2),
  ];
}

function createVirtualRepricingGapWidget(widget, frequency, index) {
  return {
    ...widget,
    seq: Number(widget.seq) * 100 + index,
    sourceSeq: Number(widget.seq),
    title: `重定价缺口率（${frequency}）`,
    __forcedFrequency: frequency,
  };
}

function cloneFilterState(source = {}) {
  return Object.keys(source || {}).reduce((next, key) => {
    next[key] = [...(source[key] || [])];
    return next;
  }, {});
}

function renderFlatWidgetContextControls(areaGroup, areaState, options = {}) {
  const areaSubpage = ensureAreaSubpageState(areaGroup, areaState);
  const tabMarkup = !options.hideSubtabs && areaSubpage.tabs.length
    ? `
      <div class="area-subtabs area-subtabs--inline flat-widget-controls__subtabs">
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
  const filterGroups = areaGroup.sharedFilters
    .filter((filterLabel) => !PAGE_SHARED_FILTER_NAMES.has(normalizeFilterName(filterLabel)))
    .map((filterLabel) => {
      const name = normalizeFilterName(filterLabel);
      return renderFilterGroup(
        "area",
        areaGroup.id,
        filterLabel,
        areaState[name] || [],
        getAreaFilterOptions(areaGroup, filterLabel)
      );
    })
    .join("");
  if (!tabMarkup && !filterGroups) return "";
  return `
    <div class="flat-widget-controls">
      ${tabMarkup}
      ${filterGroups ? `<div class="filter-panel filter-panel--inline flat-widget-controls__filters">${filterGroups}</div>` : ""}
    </div>
  `;
}

function shouldFlattenBlockLayer(block, page = getCurrentPage()) {
  if (!["利率风险", "流动性风险"].includes(page?.name)) return false;
  return FLATTENED_BLOCK_LAYER_NAMES.has(block?.name);
}

function splitBlockIntoAreaSections(block) {
  const grouped = new Map();
  block.areas.forEach((area, index) => {
    if (!grouped.has(area.name)) {
      grouped.set(area.name, {
        id: `${block.id}-flat-${index + 1}`,
        name: area.name,
        sourceBlockId: block.id,
        sourceBlockName: block.name,
        hideAreaTitleWhenSameAsBlock: true,
        moveAreaHeaderToSection: true,
        areas: [],
      });
    }
    grouped.get(area.name).areas.push(area);
  });
  return Array.from(grouped.values()).map((section) => ({
    ...section,
    areaCount: section.areas.length,
    widgetCount: section.areas.reduce((sum, area) => sum + (area.widgets?.length || 0), 0),
  }));
}

function getRenderablePageSections(page = getCurrentPage()) {
  if (!page?.blocks?.length) return [];
  return page.blocks.flatMap((block) => (
    shouldFlattenBlockLayer(block, page) ? splitBlockIntoAreaSections(block) : [block]
  ));
}

function renderBlockSection(block, sectionIndex = 0) {
  const groupedAreas = groupBlockAreas(block);
  const areaLayoutClass = shouldRenderAreasInPairs(block, groupedAreas) ? " block-section__areas--paired" : "";
  const simulationSummary = sectionIndex === 0 ? renderSimulationSummary() : "";
  const sectionHeaderControls = block.moveAreaHeaderToSection && groupedAreas.length === 1
    ? renderAreaHeaderChrome(groupedAreas[0], "block-section")
    : "";
  const renderedAreas = groupedAreas.map((areaGroup) => renderAreaCard(areaGroup, block)).filter(Boolean);
  if (!renderedAreas.length) return "";
  return `
    <section class="block-section" id="${block.id}">
      <div class="block-section__header${sectionHeaderControls ? " block-section__header--with-controls" : ""}">
        <div class="block-section__title-wrap">
          <h2 class="block-section__title">${formatDisplayTitle(block.name)}</h2>
        </div>
        ${sectionHeaderControls}
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

function renderAreaHeaderChrome(areaGroup, ownerClass = "area-card") {
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
      <div class="area-subtabs area-subtabs--inline ${ownerClass}__subtabs">
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
  const controlsMarkup = filterGroups
    ? `
      <div class="${ownerClass}__controls area-card__controls">
        <div class="filter-panel filter-panel--inline">${filterGroups}</div>
      </div>
    `
    : "";
  if (!tabMarkup && !controlsMarkup) return "";
  return `
    <div class="${ownerClass}__header-chrome">
      ${tabMarkup}
      ${controlsMarkup}
    </div>
  `;
}

function renderAreaCard(areaGroup, block) {
  const areaState = ensureAreaFilterState(areaGroup);
  const areaSubpage = ensureAreaSubpageState(areaGroup, areaState);
  const headerChrome = renderAreaHeaderChrome(areaGroup, "area-card");
  const shouldRenderHeader = !block?.moveAreaHeaderToSection || !block?.hideAreaTitleWhenSameAsBlock || block.name !== areaGroup.name;
  const visibleViewGroups = getVisibleAreaViewGroups(areaGroup, areaSubpage, block);
  if (!visibleViewGroups.length) return "";

  return `
    <article class="area-card">
      ${shouldRenderHeader ? `
        <div class="area-card__header area-card__header--topbar">
          <div class="area-card__lead">
            ${shouldHideAreaTitle(areaGroup, block) ? "" : `
              <div class="area-card__title-wrap">
                <h3 class="area-card__title">${formatDisplayTitle(areaGroup.name)}</h3>
              </div>
            `}
            ${headerChrome && shouldHideAreaTitle(areaGroup, block) ? headerChrome : ""}
          </div>
          ${headerChrome && !shouldHideAreaTitle(areaGroup, block) ? headerChrome : ""}
        </div>
      ` : ""}
      <div class="area-view-groups">
        ${visibleViewGroups.map((viewGroup) => renderAreaViewGroup(areaGroup, viewGroup, areaState)).join("")}
      </div>
    </article>
  `;
}

function renderAreaViewGroup(areaGroup, viewGroup, areaState) {
  const viewScopedState = getViewGroupScopedAreaState(areaGroup, viewGroup, areaState);
  const visibleWidgets = (viewGroup.widgets || []).filter((widget) => !isEveSourceTrendWidget(widget));
  if (!visibleWidgets.length) return "";
  return `
    <section class="area-view-group">
      <div class="widgets-grid">
        ${visibleWidgets.map((widget) => renderWidgetCard(areaGroup, widget, viewScopedState)).join("")}
      </div>
    </section>
  `;
}

function shouldHideAreaTitle(areaGroup, block) {
  return Boolean(block?.hideAreaTitleWhenSameAsBlock && block.name === areaGroup.name);
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
  const displayLabel = formatFilterDisplayLabel(filterLabel);
  const openKey = buildFilterKey(ownerType, ownerId, name);
  const isOpen = appState.openFilterKey === openKey;
  const serializedOptions = (optionValues || FILTER_OPTIONS[name] || ["默认口径"]).join("||");
  return `
    <div class="filter-group filter-group--dropdown ${isOpen ? "is-open" : ""}">
      <div class="filter-group__row">
        <div class="filter-group__label">${displayLabel}</div>
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

function renderWidgetCard(areaGroup, widget, areaState, options = {}) {
  const widgetBehavior = getWidgetBehavior(widget);
  const widgetState = {
    ...ensureWidgetFilterState(widget, widgetBehavior),
    ...(options.widgetStateOverride || {}),
  };
  const chartContext = buildChartContext(widget, areaState, widgetState);
  const displayMode = ensureWidgetDisplayMode(widget);
  const { headerMarkup: widgetHeaderTabs, bodyMarkup: widgetLocalFilters } = renderWidgetLocalFilters(
    widgetBehavior,
    widgetState,
    widget.seq,
    options.hiddenLocalFilterNames || []
  );
  const widgetCardClass = `${shouldSpanFullWidth(widget) ? " widget-card--full" : ""}${options.flatMode ? " widget-card--flat" : ""}${isRepricingMaturityDistributionWidget(widget) ? " widget-card--repricing-maturity" : ""}`;
  const insightButton = `<button class="widget-action widget-action--ai" type="button" data-open-insight="${widget.sourceSeq || widget.seq}">AI</button>`;
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
        <div class="widget-card__lead">
          <h4 class="widget-card__title">${getWidgetDisplayTitle(widget)}</h4>
          ${renderMaturityStructureHeaderTabs(widget)}
          ${options.contextControls || ""}
          ${widgetHeaderTabs}
        </div>
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

function getMaturityStructureActiveScope(widgetSeq = 96) {
  const selected = (appState.widgetFilters[widgetSeq] || {}).__maturity_structure_scope__;
  return Array.isArray(selected) && selected[0] === "future" ? "future" : "historical";
}

function renderMaturityStructureHeaderTabs(widget) {
  if (!isMaturityStructureWidgetSeq(widget?.seq)) return "";
  const activeScope = getMaturityStructureActiveScope(widget.seq);
  const tabs = [
    { value: "historical", label: "历史实际到期" },
    { value: "future", label: "未来合同到期" },
  ];
  return `
    <div class="maturity-structure-tabs" role="tablist" aria-label="到期结构页面">
      ${tabs.map((tab) => `
        <button
          class="maturity-structure-tabs__btn ${tab.value === activeScope ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.value === activeScope}"
          data-maturity-structure-tab="${widget.seq}"
          data-maturity-structure-scope="${tab.value}"
        >${tab.label}</button>
      `).join("")}
    </div>
  `;
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
    interbankFundingMaxTenor: renderInterbankFundingMaxTenorChart,
    interbankFundingTenorBucket: renderInterbankFundingTenorBucketChart,
    bondInvestmentScaleLimit: renderBondInvestmentScaleLimitChart,
    bondInvestmentDurationLimit: renderBondInvestmentDurationLimitChart,
  };
  if (isEveRatioTrendWidget(widget)) return renderEveRatioTrendChart(widget, chartContext);
  if (isLiquidityDiagnosticRatioWidget(widget)) return renderLiquidityDiagnosticRatioChart(widget, chartContext);
  if (isRepricingGapRateWidget(widget)) return renderRepricingGapRateChart(widget, chartContext);
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

function renderWidgetLocalFilters(widgetBehavior, widgetState, widgetSeq, hiddenFilterNames = []) {
  const hiddenSet = new Set(hiddenFilterNames);
  const visibleFilters = widgetBehavior.localFilters.filter((filter) => {
    if (hiddenSet.has(filter.name)) return false;
    if (Number(widgetSeq) === 49 && filter.name === "口径") {
      const selectedTenor = (widgetState["期限长度"] || filter.defaultValues || []).find((value) =>
        LIQUIDITY_GAP_TENOR_OPTIONS.includes(value)
      );
      return (selectedTenor || "30D") === "30D";
    }
    if (filter.renderMode === "legend") return false;
    if (filter.type === "dateRange" && (Number(widgetSeq) === 89 || Number(widgetSeq) === 96)) return false;
    return true;
  });
  if (!visibleFilters.length) return { headerMarkup: "", bodyMarkup: "" };
  const headerFilters = [];
  const bodyFilters = [];
  visibleFilters.forEach((filter) => {
    if (isInlineWidgetFilter(widgetSeq, filter.name)) {
      headerFilters.push(renderWidgetHeaderInlineFilter(widgetSeq, filter, widgetState));
      return;
    }
    if (filter.renderMode === "segmented") {
      headerFilters.push(
        renderWidgetSegmentedFilter(
          widgetSeq,
          filter.name,
          filter.label || filter.name,
          widgetState[filter.name] || filter.defaultValues || [],
          filter.options || [],
          "widget-segmented-filter--header"
        )
      );
      return;
    }
    bodyFilters.push(
      renderFilterGroup("widget", widgetSeq, filter.label || filter.name, widgetState[filter.name] || [], filter.options)
    );
  });
  return {
    headerMarkup: headerFilters.length ? `<div class="widget-card__header-tabs">${headerFilters.join("")}</div>` : "",
    bodyMarkup: bodyFilters.length ? `<div class="widget-card__filters">${bodyFilters.join("")}</div>` : "",
  };
}

function renderWidgetHeaderInlineFilter(widgetSeq, filter, widgetState) {
  const selectedValues = widgetState[filter.name] || filter.defaultValues || [];
  const options = filter.options || [];
  if (filter.name === "口径" || filter.renderMode === "segmented") {
    return renderWidgetSegmentedFilter(
      widgetSeq,
      filter.name,
      filter.label || filter.name,
      selectedValues,
      options,
      "widget-segmented-filter--header"
    );
  }
  return renderWidgetInlineControl(widgetSeq, filter.name, filter.label || filter.name, selectedValues, options, "chart-inline-control--header");
}

function renderWidgetSegmentedFilter(widgetSeq, filterName, filterLabel, selectedValues, options, extraClass = "") {
  const activeValue = (selectedValues || []).find((value) => options.includes(value)) || options[0] || "";
  return `
    <div class="widget-segmented-filter ${extraClass}">
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

function renderEveRatioTrendChart(widget, chartContext) {
  const model = buildEveDiagnosticModel(widget, chartContext);
  const frame = createFrame(model.labels.length);
  const axis = renderAxes(frame, model.labels, "比例 (%)");
  const ratioPoints = scaleValuesToFrame(model.ratios, frame, 0, 100);
  const ratioPath = ratioPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const selectedPopover = appState.evePointPopover;
  const selectedIndex = selectedPopover?.widgetSeq === widget.seq
    ? clampNumber(Number(selectedPopover.dateIndex), 0, model.labels.length - 1)
    : null;
  const pointMarkup = ratioPoints
    .map((point, index) => {
      const isSelected = index === selectedIndex;
      return `
        <circle
          class="eve-ratio-point ${isSelected ? "is-selected" : ""}"
          cx="${point.x}"
          cy="${point.y}"
          r="${isSelected ? 6 : 4.8}"
          fill="#ffffff"
          stroke="${isSelected ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY}"
          stroke-width="3"
          data-eve-point="true"
          data-widget-seq="${widget.seq}"
          data-date-index="${index}"
          data-eve-signature="${model.signature}"
          data-eve-labels="${model.labels.join("||")}"
          aria-label="${model.displayLabels[index]} 查看计算过程"
        ></circle>
      `;
    })
    .join("");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);
  const popoverMarkup = Number.isInteger(selectedIndex)
    ? renderEvePointPopover(widget, model, ratioPoints[selectedIndex], frame, selectedIndex)
    : "";

  return `
    <div class="chart-shell chart-shell--eve-ratio">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        <polyline fill="none" stroke="${EVE_COLOR_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${pointMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: ["△EVE"], allSeriesList: ["△EVE"] })}
    </div>
  `;
}

function renderEvePointPopover(widget, model, point, frame, index) {
  const ratio = model.ratios[index];
  const worst = model.worstScenarios[index];
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  const space = model.limit - ratio;
  return `
    <div class="eve-point-popover" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__title">${model.displayLabels[index]}</div>
      <div class="eve-point-popover__grid">
        <div><span>△EVE</span><strong>${formatEvePercent(ratio)}</strong></div>
        <div><span>距限额</span><strong>${space.toFixed(1)}pct</strong></div>
        <div><span>最不利情景</span><strong>${worst.name}</strong></div>
        <div><span>经济价值变动</span><strong>${formatEveAmount(worst.value)}</strong></div>
      </div>
      <button
        class="eve-point-popover__action"
        type="button"
        data-open-eve-process="true"
        data-widget-seq="${widget.seq}"
        data-date-index="${index}"
        data-eve-signature="${model.signature}"
        data-eve-labels="${model.labels.join("||")}"
      >查看计算过程</button>
    </div>
  `;
}

function buildEveDiagnosticModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || EVE_RATIO_WIDGET_SEQ, chartContextOrState.filterState || {}));
  const count = labels.length;
  const normalizedOffset = signature % 17;
  const legalRwa = Array.from({ length: count }, (_, index) => Number((8200 + normalizedOffset * 4 + index * 34).toFixed(1)));
  const overseasRwa = Array.from({ length: count }, (_, index) => Number((858 + normalizedOffset * 0.8 + index * 7.6).toFixed(1)));
  const legalTierOne = Array.from({ length: count }, (_, index) => Number((4860 + normalizedOffset * 5 + index * 26).toFixed(1)));
  const capital = overseasRwa.map((value, index) => Number(((value / legalRwa[index]) * legalTierOne[index]).toFixed(1)));
  const scenarios = EVE_SCENARIO_DEFINITIONS.map((scenario, scenarioIndex) => {
    const values = Array.from({ length: count }, (_, index) => {
      const wave = Math.sin((index + scenarioIndex + normalizedOffset / 5) / 1.8) * scenario.wave;
      const seasonal = ((index + scenarioIndex * 3 + normalizedOffset) % 5) * 1.4;
      return Number((-1 * (scenario.base + index * scenario.slope + wave + seasonal)).toFixed(1));
    });
    return { ...scenario, values };
  });
  const worstScenarios = labels.map((_, index) => {
    const scenario = scenarios.reduce((worst, current) =>
      Math.abs(current.values[index]) > Math.abs(worst.values[index]) ? current : worst
    , scenarios[0]);
    return { key: scenario.key, name: scenario.name, value: scenario.values[index] };
  });
  const numerator = worstScenarios.map((scenario) => scenario.value);
  const ratios = numerator.map((value, index) => Number(((Math.abs(value) / capital[index]) * 100).toFixed(1)));
  return {
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    limit: 28,
    legalRwa,
    overseasRwa,
    legalTierOne,
    capital,
    scenarios,
    worstScenarios,
    numerator,
    ratios,
  };
}

function buildEveDisplayLabels(labels) {
  let currentYear = null;
  let previousMonth = null;
  return labels.map((label) => {
    const value = String(label || "");
    const full = value.match(/^(\d{4})-(\d{2})$/);
    if (full) {
      currentYear = Number(full[1]);
      previousMonth = Number(full[2]);
      return `${full[1]}/${full[2]}`;
    }
    const month = value.match(/^(\d{1,2})$/);
    if (month) {
      const nextMonth = Number(month[1]);
      if (!currentYear) currentYear = new Date().getFullYear();
      if (previousMonth && nextMonth < previousMonth) currentYear += 1;
      previousMonth = nextMonth;
      return `${currentYear}/${String(nextMonth).padStart(2, "0")}`;
    }
    return value.replace(/-/g, "/");
  });
}

function scaleValuesToFrame(values, frame, minValue = 0, maxValue = 100) {
  const range = maxValue - minValue || 1;
  return values.map((value, index) => ({
    x: getFrameXPosition(frame, index, values.length),
    y: Number((frame.bottom - (frame.height * (value - minValue)) / range).toFixed(1)),
    value,
  }));
}

function renderEveProcessModal() {
  const state = appState.eveProcessModal;
  if (!state) {
    eveProcessModalEl.innerHTML = "";
    eveProcessModalEl.classList.remove("is-open");
    eveProcessModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const target = findWidgetBySeq(state.widgetSeq || EVE_RATIO_WIDGET_SEQ);
  const widget = target?.widget || { seq: EVE_RATIO_WIDGET_SEQ };
  const model = buildEveDiagnosticModel(widget, {
    labels: state.labels,
    signature: state.signature,
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const activeNode = state.activeNode || "eve";
  const worst = model.worstScenarios[selectedIndex];

  eveProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="eveProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="eveProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="eveProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="eveProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        <div class="eve-process-date">
          <span>当前日期</span>
          <strong>${model.displayLabels[selectedIndex]}</strong>
        </div>
        <div class="eve-process-slider">
          <input
            class="eve-process-slider__input"
            type="range"
            min="0"
            max="${model.labels.length - 1}"
            step="1"
            value="${selectedIndex}"
            data-eve-process-date-slider="true"
          >
          <div class="eve-process-slider__axis">
            ${model.displayLabels.map((label) => `<span>${label}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="eve-process-flow">
        <div class="eve-process-flow__canvas">
          <div class="eve-process-flow__lane">
            ${renderEveProcessNode({
              key: "eve",
              title: "△EVE",
              note: "最大经济价值变动比例",
              value: formatEvePercent(model.ratios[selectedIndex]),
              series: model.ratios,
              selectedIndex,
              activeNode,
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: "分子",
                note: "Max经济价值变动",
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator.map(Math.abs),
                selectedIndex,
                activeNode,
                isWorst: true,
                actionText: "点击展开六情景 →",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
              <div class="eve-process-division">÷</div>
              ${renderEveProcessNode({
                key: "denominator",
                title: "分母",
                note: "一级资本净额",
                value: formatEveAmount(model.capital[selectedIndex]),
                series: model.capital,
                selectedIndex,
                activeNode,
                actionText: "点击展开分母来源 →",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
            </div>
            <div class="eve-process-connector" aria-hidden="true"></div>
            <div class="eve-process-expansions">
              <div class="eve-process-expansion-slot">
                ${state.numeratorExpanded
                  ? renderEveScenarioExpansion(model, selectedIndex, activeNode, worst)
                  : `<div class="eve-process-placeholder">点击左侧“分子”节点后，在这里向右展开六种监管利率情景。</div>`}
              </div>
              <div class="eve-process-expansion-slot">
                ${state.denominatorExpanded
                  ? renderEveDenominatorExpansion(model, selectedIndex, activeNode)
                  : `<div class="eve-process-placeholder">点击左侧“分母”节点后，在这里向右展开一级资本净额的计算来源。</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  eveProcessModalEl.classList.add("is-open");
  eveProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderEveProcessNode({
  key,
  title,
  value,
  series,
  selectedIndex,
  activeNode,
  isWorst = false,
  actionText = "",
  dataAttribute = "data-eve-process-node",
  changeType = "rate",
  valueFormat = "amount",
  labels = [],
}) {
  const change = formatProcessNodeChange(series, selectedIndex, changeType);
  const previewPayload = encodeProcessPreviewPayload({
    title,
    labels,
    values: series,
    selectedIndex,
    color: isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY,
    valueFormat,
  });
  return `
    <button class="eve-process-node ${activeNode === key ? "is-active" : ""} ${isWorst ? "is-worst" : ""}" type="button" ${dataAttribute}="${key}">
      <span class="eve-process-node__top">
        <span class="eve-process-node__title"><strong>${title}</strong></span>
        <span class="eve-process-node__metric">
          <span class="eve-process-node__value">${value}</span>
          <span class="eve-process-node__change ${change.className}">${change.text}</span>
        </span>
      </span>
      <span
        class="eve-process-sparkline"
        role="button"
        tabindex="0"
        title="点击放大趋势"
        data-process-sparkline="true"
        data-process-preview="${previewPayload}"
      >${renderEveSparkline(series, selectedIndex, isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY)}</span>
      ${actionText ? `<span class="eve-process-node__action">${actionText}</span>` : ""}
    </button>
  `;
}

function renderEveScenarioExpansion(model, selectedIndex, activeNode, worst) {
  return `
    <div class="eve-process-scenario-strip">
      ${model.scenarios.map((scenario) => {
        const isWorst = scenario.key === worst.key;
        return renderEveProcessNode({
          key: `scenario:${scenario.key}`,
          title: scenario.name,
          note: "监管利率情景",
          value: formatEveAmount(scenario.values[selectedIndex]),
          series: scenario.values.map(Math.abs),
          selectedIndex,
          activeNode,
          isWorst,
          valueFormat: "amount",
          labels: model.displayLabels,
        }).replace(
          '<button class="eve-process-node',
          `<button class="eve-process-node eve-process-node--compact${isWorst ? ' is-worst' : ''}`
        );
      }).join("")}
    </div>
  `;
}

function renderEveDenominatorExpansion(model, selectedIndex, activeNode) {
  return `
    <div class="eve-process-capital-strip">
      ${renderEveProcessNode({
        key: "overseas-rwa",
        title: "境外分行RWA",
        note: "分摊权重分子",
        value: formatEveRwa(model.overseasRwa[selectedIndex]),
        series: model.overseasRwa,
        selectedIndex,
        activeNode,
        valueFormat: "amount0",
        labels: model.displayLabels,
      })}
      <span class="eve-process-mini-operator">÷</span>
      ${renderEveProcessNode({
        key: "legal-rwa",
        title: "法人RWA",
        note: "分摊权重分母",
        value: formatEveRwa(model.legalRwa[selectedIndex]),
        series: model.legalRwa,
        selectedIndex,
        activeNode,
        valueFormat: "amount0",
        labels: model.displayLabels,
      })}
      <span class="eve-process-mini-operator">×</span>
      ${renderEveProcessNode({
        key: "legal-tier-one",
        title: "法人一级资本净额",
        note: "资本分摊基数",
        value: formatEveAmount(model.legalTierOne[selectedIndex]),
        series: model.legalTierOne,
        selectedIndex,
        activeNode,
        valueFormat: "amount",
        labels: model.displayLabels,
      })}
    </div>
  `;
}

function formatProcessNodeChange(values = [], selectedIndex = 0, changeType = "rate") {
  const current = Number(values?.[selectedIndex]);
  const previous = Number(values?.[selectedIndex - 1]);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { text: "较上期 --", className: "is-flat" };
  }
  if (changeType === "delta") {
    const delta = Number((current - previous).toFixed(1));
    return {
      text: `较上期 ${formatSignedNumber(delta)}pct`,
      className: getChangeClass(delta),
    };
  }
  if (previous === 0) return { text: "较上期 --", className: "is-flat" };
  const rate = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  return {
    text: `较上期 ${formatSignedNumber(rate)}%`,
    className: getChangeClass(rate),
  };
}

function formatSignedNumber(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${numeric.toFixed(1)}`;
  if (numeric < 0) return numeric.toFixed(1);
  return "0.0";
}

function getChangeClass(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return "is-up";
  if (numeric < 0) return "is-down";
  return "is-flat";
}

function encodeProcessPreviewPayload(payload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeProcessPreviewPayload(encoded) {
  try {
    return JSON.parse(decodeURIComponent(String(encoded || "")));
  } catch (error) {
    return null;
  }
}

function renderEveSparkline(values, selectedIndex, color) {
  const width = 180;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: 10 + (index / Math.max(1, values.length - 1)) * (width - 20),
    y: 7 + (1 - (value - min) / range) * (height - 14),
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const selected = points[clampNumber(selectedIndex, 0, points.length - 1)] || points[0];
  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line x1="${selected.x}" y1="4" x2="${selected.x}" y2="${height - 4}" stroke="#D85F63" stroke-width="2" stroke-dasharray="4 3"></line>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      <circle cx="${selected.x}" cy="${selected.y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"></circle>
    </svg>
  `;
}

function renderProcessSparklinePreview() {
  const state = appState.processSparklinePreview;
  if (!state) {
    processSparklinePreviewEl.innerHTML = "";
    processSparklinePreviewEl.classList.remove("is-open");
    processSparklinePreviewEl.setAttribute("aria-hidden", "true");
    return;
  }
  const values = (state.values || []).map(Number).filter(Number.isFinite);
  const labels = Array.isArray(state.labels) && state.labels.length === values.length
    ? state.labels
    : values.map((_, index) => String(index + 1));
  const selectedIndex = clampNumber(Number(state.selectedIndex || 0), 0, Math.max(0, values.length - 1));
  processSparklinePreviewEl.innerHTML = `
    <div class="overlay-scrim" data-close-process-sparkline="true"></div>
    <section class="process-sparkline-preview" role="dialog" aria-modal="true" aria-labelledby="processSparklinePreviewTitle">
      <div class="process-sparkline-preview__header">
        <div>
          <h3 id="processSparklinePreviewTitle">${state.title || "趋势"}</h3>
          <p>${labels[selectedIndex] || ""}：${formatProcessPreviewValue(values[selectedIndex], state.valueFormat)}</p>
        </div>
        <button class="overlay-panel__close process-sparkline-preview__close" type="button" data-close-process-sparkline="true">关闭</button>
      </div>
      <div class="process-sparkline-preview__body">
        ${renderProcessPreviewChart(labels, values, selectedIndex, state.color || EVE_COLOR_PRIMARY, state.valueFormat)}
      </div>
    </section>
  `;
  processSparklinePreviewEl.classList.add("is-open");
  processSparklinePreviewEl.setAttribute("aria-hidden", "false");
}

function renderProcessPreviewChart(labels, values, selectedIndex, color, valueFormat = "amount") {
  const frame = { left: 78, right: 770, top: 34, bottom: 286, width: 692, height: 252, count: values.length };
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max(1, (maxValue - minValue) * 0.12);
  const scaledPoints = scaleValuesToFrame(values, frame, minValue - padding, maxValue + padding);
  const selected = scaledPoints[selectedIndex] || scaledPoints[0];
  const path = scaledPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = frame.top + frame.height * ratio;
    return `<line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="#DDEBFA" stroke-width="1"></line>`;
  }).join("");
  const sampledLabels = labels.map((label, index) => {
    const shouldShow = labels.length <= 14 || index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 8) === 0;
    if (!shouldShow) return "";
    const x = getFrameXPosition(frame, index, labels.length);
    return `<text x="${x}" y="${frame.bottom + 28}" text-anchor="middle" class="axis-label">${label}</text>`;
  }).join("");
  return `
    <svg viewBox="0 0 850 350" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${gridLines}
      <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="#B7D3F0" stroke-width="1.4"></line>
      <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="#B7D3F0" stroke-width="1.4"></line>
      <text x="${frame.left}" y="${frame.top - 10}" class="axis-title">${formatProcessPreviewValue(maxValue, valueFormat)}</text>
      <text x="${frame.left}" y="${frame.bottom + 18}" class="axis-title">${formatProcessPreviewValue(minValue, valueFormat)}</text>
      <polyline fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${path}"></polyline>
      <line x1="${selected.x}" y1="${frame.top}" x2="${selected.x}" y2="${frame.bottom}" stroke="#D85F63" stroke-width="2.2" stroke-dasharray="6 4"></line>
      ${scaledPoints.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="${index === selectedIndex ? 6 : 3.8}" fill="#fff" stroke="${index === selectedIndex ? "#D85F63" : color}" stroke-width="${index === selectedIndex ? 3 : 2}"></circle>`).join("")}
      ${sampledLabels}
      <text x="${selected.x + 10}" y="${Math.max(frame.top + 18, selected.y - 12)}" class="process-sparkline-preview__callout">${labels[selectedIndex]} ${formatProcessPreviewValue(values[selectedIndex], valueFormat)}</text>
    </svg>
  `;
}

function formatProcessPreviewValue(value, valueFormat = "amount") {
  if (valueFormat === "percent") return formatEvePercent(value);
  if (valueFormat === "amount0") return formatEveRwa(value);
  if (valueFormat === "number") return Number(value || 0).toFixed(1);
  return formatEveAmount(value);
}

function formatEvePercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatEveAmount(value) {
  return `${Number(value || 0).toFixed(1)}亿`;
}

function formatEveRwa(value) {
  return `${Number(value || 0).toFixed(0)}亿`;
}

function getLiquidityDiagnosticKind(widget) {
  const seq = Number(widget?.sourceSeq || widget?.seq);
  if (seq === 42) return "lcr";
  if (seq === 46) return "nsfr";
  return "";
}

function buildLiquidityDiagnosticModel(widget, chartContextOrState = {}) {
  const kind = chartContextOrState.kind || getLiquidityDiagnosticKind(widget);
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || 42, chartContextOrState.filterState || {}));
  const count = labels.length;
  const normalizedOffset = signature % 23;

  if (kind === "nsfr") {
    const availableStableFunding = Array.from({ length: count }, (_, index) =>
      Number((610 + normalizedOffset * 2.6 + index * 7.8 + Math.sin((index + normalizedOffset) / 2.4) * 24).toFixed(1))
    );
    const requiredStableFunding = Array.from({ length: count }, (_, index) =>
      Number((720 + normalizedOffset * 2.2 + index * 6.1 + Math.cos((index + normalizedOffset) / 2.8) * 18).toFixed(1))
    );
    const ratios = availableStableFunding.map((value, index) =>
      Number(((value / requiredStableFunding[index]) * 100).toFixed(1))
    );
    return {
      kind,
      labels,
      displayLabels: buildEveDisplayLabels(labels),
      signature,
      title: "净稳定资金比例NSFR",
      numeratorTitle: "可用稳定资金规模",
      denominatorTitle: "业务所需稳定资金",
      numerator: availableStableFunding,
      denominator: requiredStableFunding,
      ratios,
      components: {
        availableStableFunding,
        requiredStableFunding,
      },
    };
  }

  const cashOutflows = Array.from({ length: count }, (_, index) =>
    Number((330 + normalizedOffset * 2.8 + index * 5.8 + Math.sin((index + normalizedOffset) / 2.1) * 20).toFixed(1))
  );
  const cashInflows = Array.from({ length: count }, (_, index) =>
    Number((118 + normalizedOffset * 1.5 + index * 3.2 + Math.cos((index + normalizedOffset) / 2.7) * 13).toFixed(1))
  );
  const netOutflows = cashOutflows.map((value, index) => Number((value - cashInflows[index]).toFixed(1)));
  const hqla = Array.from({ length: count }, (_, index) =>
    Number((305 + normalizedOffset * 3.2 + index * 6.6 + Math.sin((index + normalizedOffset) / 3) * 16).toFixed(1))
  );
  const ratios = netOutflows.map((value, index) => Number(((value / hqla[index]) * 100).toFixed(1)));
  return {
    kind: "lcr",
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    title: "流动性覆盖率LCR",
    numeratorTitle: "未来30天现金净流出量",
    denominatorTitle: "优质流动性资产HQLA",
    numerator: netOutflows,
    denominator: hqla,
    ratios,
    components: {
      cashOutflows,
      cashInflows,
      netOutflows,
      hqla,
    },
  };
}

function renderLiquidityDiagnosticRatioChart(widget, chartContext) {
  const model = buildLiquidityDiagnosticModel(widget, chartContext);
  const frame = createFrame(model.labels.length);
  const maxValue = Math.max(100, Math.ceil(Math.max(...model.ratios, 0) / 20) * 20);
  const axis = renderScaledAxes(frame, model.labels, "比例 (%)", maxValue);
  const ratioPoints = scaleValuesToFrame(model.ratios, frame, 0, maxValue);
  const ratioPath = ratioPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const selectedPopover = appState.liquidityMetricPointPopover;
  const selectedIndex = selectedPopover?.widgetSeq === widget.seq
    ? clampNumber(Number(selectedPopover.dateIndex), 0, model.labels.length - 1)
    : null;
  const color = model.kind === "nsfr" ? LINE_SERIES_PALETTE[2] : EVE_COLOR_PRIMARY;
  const pointMarkup = ratioPoints.map((point, index) => {
    const isSelected = index === selectedIndex;
    return `
      <circle
        class="eve-ratio-point liquidity-ratio-point ${isSelected ? "is-selected" : ""}"
        cx="${point.x}"
        cy="${point.y}"
        r="${isSelected ? 6 : 4.8}"
        fill="#ffffff"
        stroke="${isSelected ? EVE_COLOR_WORST : color}"
        stroke-width="3"
        data-liquidity-point="true"
        data-widget-seq="${widget.seq}"
        data-liquidity-kind="${model.kind}"
        data-date-index="${index}"
        data-liquidity-signature="${model.signature}"
        data-liquidity-labels="${model.labels.join("||")}"
        aria-label="${model.displayLabels[index]} 查看计算过程"
      ></circle>
    `;
  }).join("");
  const popoverMarkup = Number.isInteger(selectedIndex)
    ? renderLiquidityPointPopover(widget, model, ratioPoints[selectedIndex], selectedIndex)
    : "";
  return `
    <div class="chart-shell chart-shell--eve-ratio chart-shell--liquidity-ratio">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        <polyline fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${pointMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: [model.title], allSeriesList: [model.title], legendItems: [{ label: model.title, color }] })}
    </div>
  `;
}

function renderLiquidityPointPopover(widget, model, point, index) {
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  return `
    <div class="eve-point-popover" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__title">${model.displayLabels[index]}</div>
      <div class="eve-point-popover__grid">
        <div><span>${model.kind === "nsfr" ? "NSFR" : "LCR"}</span><strong>${formatEvePercent(model.ratios[index])}</strong></div>
        <div><span>分子</span><strong>${formatEveAmount(model.numerator[index])}</strong></div>
        <div><span>分母</span><strong>${formatEveAmount(model.denominator[index])}</strong></div>
        <div><span>口径</span><strong>${model.kind === "lcr" ? "30天" : "稳定资金"}</strong></div>
      </div>
      <button
        class="eve-point-popover__action"
        type="button"
        data-open-liquidity-process="true"
        data-widget-seq="${widget.seq}"
        data-liquidity-kind="${model.kind}"
        data-date-index="${index}"
        data-liquidity-signature="${model.signature}"
        data-liquidity-labels="${model.labels.join("||")}"
      >查看计算过程</button>
    </div>
  `;
}

function renderLiquidityDiagnosticRatioDataTable(widget, chartContext) {
  const model = buildLiquidityDiagnosticModel(widget, chartContext);
  const componentHeaders = model.kind === "lcr"
    ? ["未来30天现金流出量", "未来30天现金流入量"]
    : [];
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(model.labels)}</th>
              <th>${model.title}</th>
              <th>${model.numeratorTitle}</th>
              <th>${model.denominatorTitle}</th>
              ${componentHeaders.map((label) => `<th>${label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${model.labels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${formatEvePercent(model.ratios[index])}</td>
                <td>${formatEveAmount(model.numerator[index])}</td>
                <td>${formatEveAmount(model.denominator[index])}</td>
                ${model.kind === "lcr" ? `<td>${formatEveAmount(model.components.cashOutflows[index])}</td><td>${formatEveAmount(model.components.cashInflows[index])}</td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLiquidityProcessModal() {
  const state = appState.liquidityProcessModal;
  if (!state) {
    liquidityProcessModalEl.innerHTML = "";
    liquidityProcessModalEl.classList.remove("is-open");
    liquidityProcessModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const target = findWidgetBySeq(state.widgetSeq || 42);
  const widget = target?.widget || { seq: state.widgetSeq || 42 };
  const model = buildLiquidityDiagnosticModel(widget, {
    labels: state.labels,
    signature: state.signature,
    kind: state.kind,
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const activeNode = state.activeNode || "ratio";
  const isLcr = model.kind === "lcr";

  liquidityProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="liquidityProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="liquidityProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="liquidityProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="liquidityProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        <div class="eve-process-date">
          <span>当前日期</span>
          <strong>${model.displayLabels[selectedIndex]}</strong>
        </div>
        <div class="eve-process-slider">
          <input
            class="eve-process-slider__input"
            type="range"
            min="0"
            max="${model.labels.length - 1}"
            step="1"
            value="${selectedIndex}"
            data-liquidity-process-date-slider="true"
          >
          <div class="eve-process-slider__axis">
            ${model.displayLabels.map((label, index) => `<span class="${shouldShowProcessAxisLabel(model.displayLabels, index) ? "" : "is-muted"}">${shouldShowProcessAxisLabel(model.displayLabels, index) ? label : ""}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="eve-process-flow">
        <div class="eve-process-flow__canvas">
          <div class="eve-process-flow__lane">
            ${renderEveProcessNode({
              key: "ratio",
              title: model.title,
              value: formatEvePercent(model.ratios[selectedIndex]),
              series: model.ratios,
              selectedIndex,
              activeNode,
              dataAttribute: "data-liquidity-process-node",
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: model.numeratorTitle,
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator,
                selectedIndex,
                activeNode,
                actionText: isLcr ? "点击展开现金流出/流入 →" : "",
                dataAttribute: "data-liquidity-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
              <div class="eve-process-division">÷</div>
              ${renderEveProcessNode({
                key: "denominator",
                title: model.denominatorTitle,
                value: formatEveAmount(model.denominator[selectedIndex]),
                series: model.denominator,
                selectedIndex,
                activeNode,
                dataAttribute: "data-liquidity-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
            </div>
            <div class="eve-process-connector" aria-hidden="true"></div>
            <div class="eve-process-expansions liquidity-process-expansions">
              <div class="eve-process-expansion-slot eve-process-expansion-slot--wide">
                ${isLcr && state.numeratorExpanded
                  ? renderLiquidityLcrNumeratorExpansion(model, selectedIndex, activeNode)
                  : `<div class="eve-process-placeholder">${isLcr ? "点击左侧“未来30天现金净流出量”节点后，在这里向右展开现金流出量和现金流入量。" : "当前版本先穿透到“可用稳定资金规模”和“业务所需稳定资金”这一层，后续再继续细化。 "}</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  liquidityProcessModalEl.classList.add("is-open");
  liquidityProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderLiquidityLcrNumeratorExpansion(model, selectedIndex, activeNode) {
  const nodeOptions = { selectedIndex, activeNode, dataAttribute: "data-liquidity-process-node", valueFormat: "amount", labels: model.displayLabels };
  return `
    <div class="eve-process-capital-strip liquidity-process-component-strip">
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "cash-outflow",
        title: "未来30天现金流出量",
        value: formatEveAmount(model.components.cashOutflows[selectedIndex]),
        series: model.components.cashOutflows,
      })}
      <span class="eve-process-mini-operator">-</span>
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "cash-inflow",
        title: "未来30天现金流入量",
        value: formatEveAmount(model.components.cashInflows[selectedIndex]),
        series: model.components.cashInflows,
      })}
    </div>
  `;
}

function renderRepricingGapRateChart(widget, chartContext) {
  const model = buildRepricingGapDiagnosticModel(widget, chartContext);
  const frame = createFrame(model.labels.length);
  const axis = renderAxes(frame, model.labels, "缺口率 (%)");
  const ratioPoints = scaleValuesToFrame(model.ratios, frame, 0, 100);
  const ratioPath = ratioPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const selectedPopover = appState.repricingGapPointPopover;
  const selectedIndex = selectedPopover?.widgetSeq === widget.seq
    ? clampNumber(Number(selectedPopover.dateIndex), 0, model.labels.length - 1)
    : null;
  const pointMarkup = ratioPoints
    .map((point, index) => {
      const isSelected = index === selectedIndex;
      return `
        <circle
          class="eve-ratio-point repricing-gap-point ${isSelected ? "is-selected" : ""}"
          cx="${point.x}"
          cy="${point.y}"
          r="${isSelected ? 6 : 4.8}"
          fill="#ffffff"
          stroke="${isSelected ? EVE_COLOR_WORST : REPRICING_GAP_COLOR}"
          stroke-width="3"
          data-repricing-gap-point="true"
          data-widget-seq="${widget.seq}"
          data-source-widget-seq="${widget.sourceSeq || widget.seq}"
          data-date-index="${index}"
          data-repricing-gap-signature="${model.signature}"
          data-repricing-gap-labels="${model.labels.join("||")}"
          aria-label="${model.displayLabels[index]} 查看计算过程"
        ></circle>
      `;
    })
    .join("");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame);
  const popoverMarkup = Number.isInteger(selectedIndex)
    ? renderRepricingGapPointPopover(widget, model, ratioPoints[selectedIndex], selectedIndex)
    : "";

  return `
    <div class="chart-shell chart-shell--eve-ratio chart-shell--repricing-gap">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        <polyline fill="none" stroke="${REPRICING_GAP_COLOR}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${pointMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: ["重定价缺口率"], allSeriesList: ["重定价缺口率"] })}
    </div>
  `;
}

function renderRepricingGapPointPopover(widget, model, point, index) {
  const ratio = model.ratios[index];
  const limitSpace = model.limit - ratio;
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  return `
    <div class="eve-point-popover" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__title">${model.displayLabels[index]}</div>
      <div class="eve-point-popover__grid">
        <div><span>缺口率</span><strong>${formatRepricingGapPercent(ratio)}</strong></div>
        <div><span>距限额</span><strong>${limitSpace.toFixed(1)}pct</strong></div>
        <div><span>分子</span><strong>${formatEveAmount(model.numerator[index])}</strong></div>
        <div><span>分母</span><strong>${formatEveAmount(model.totalInterestAssets[index])}</strong></div>
      </div>
      <button
        class="eve-point-popover__action"
        type="button"
        data-open-repricing-gap-process="true"
        data-widget-seq="${widget.seq}"
        data-source-widget-seq="${widget.sourceSeq || widget.seq}"
        data-date-index="${index}"
        data-repricing-gap-signature="${model.signature}"
        data-repricing-gap-labels="${model.labels.join("||")}"
      >查看计算过程</button>
    </div>
  `;
}

function buildRepricingGapDiagnosticModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || widget?.sourceSeq || 9, chartContextOrState.filterState || {}));
  const count = labels.length;
  const normalizedOffset = signature % 19;
  const totalInterestAssets = Array.from({ length: count }, (_, index) =>
    Number((820 + normalizedOffset * 3.2 + index * 5.4 + Math.sin(index / 2.1) * 18).toFixed(1))
  );
  const adjustedInterestAssets = totalInterestAssets.map((value, index) =>
    Number((value * (0.58 + ((index + normalizedOffset) % 5) * 0.012)).toFixed(1))
  );
  const adjustedInterestLiabilities = totalInterestAssets.map((value, index) =>
    Number((value * (0.43 + ((index + normalizedOffset) % 4) * 0.011)).toFixed(1))
  );
  const demandDeposits = totalInterestAssets.map((value, index) =>
    Number((value * (0.055 + ((index + normalizedOffset) % 3) * 0.007)).toFixed(1))
  );
  const derivativeReceivable = totalInterestAssets.map((value, index) =>
    Number((value * (0.035 + Math.abs(Math.sin((index + normalizedOffset) / 3)) * 0.014)).toFixed(1))
  );
  const derivativePayable = totalInterestAssets.map((value, index) =>
    Number((value * (0.024 + Math.abs(Math.cos((index + normalizedOffset) / 3.4)) * 0.012)).toFixed(1))
  );
  const numerator = adjustedInterestAssets.map((value, index) =>
    Number((value - adjustedInterestLiabilities[index] + demandDeposits[index] + derivativeReceivable[index] - derivativePayable[index]).toFixed(1))
  );
  const ratios = numerator.map((value, index) => Number(((value / totalInterestAssets[index]) * 100).toFixed(1)));
  return {
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    limit: 38,
    totalInterestAssets,
    adjustedInterestAssets,
    adjustedInterestLiabilities,
    demandDeposits,
    derivativeReceivable,
    derivativePayable,
    numerator,
    ratios,
  };
}

function renderRepricingGapProcessModal() {
  const state = appState.repricingGapProcessModal;
  if (!state) {
    repricingGapProcessModalEl.innerHTML = "";
    repricingGapProcessModalEl.classList.remove("is-open");
    repricingGapProcessModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const target = findWidgetBySeq(state.sourceSeq || state.widgetSeq || 9);
  const widget = target?.widget || { seq: state.sourceSeq || 9, title: "重定价缺口率" };
  const model = buildRepricingGapDiagnosticModel(widget, {
    labels: state.labels,
    signature: state.signature,
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const activeNode = state.activeNode || "ratio";

  repricingGapProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="repricingGapProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="repricingGapProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="repricingGapProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="repricingGapProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        <div class="eve-process-date">
          <span>当前日期</span>
          <strong>${model.displayLabels[selectedIndex]}</strong>
        </div>
        <div class="eve-process-slider">
          <input
            class="eve-process-slider__input"
            type="range"
            min="0"
            max="${model.labels.length - 1}"
            step="1"
            value="${selectedIndex}"
            data-repricing-gap-process-date-slider="true"
          >
          <div class="eve-process-slider__axis">
            ${model.displayLabels.map((label, index) => `<span class="${shouldShowProcessAxisLabel(model.displayLabels, index) ? "" : "is-muted"}">${shouldShowProcessAxisLabel(model.displayLabels, index) ? label : ""}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="eve-process-flow">
        <div class="eve-process-flow__canvas">
          <div class="eve-process-flow__lane">
            ${renderEveProcessNode({
              key: "ratio",
              title: "重定价缺口率",
              note: "期限调整后缺口占比",
              value: formatRepricingGapPercent(model.ratios[selectedIndex]),
              series: model.ratios,
              selectedIndex,
              activeNode,
              dataAttribute: "data-repricing-gap-process-node",
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: "分子",
                note: "经期限调整后的重定价缺口",
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator,
                selectedIndex,
                activeNode,
                actionText: "点击展开组成项 →",
                dataAttribute: "data-repricing-gap-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
              <div class="eve-process-division">÷</div>
              ${renderEveProcessNode({
                key: "denominator",
                title: "分母",
                note: "总生息资产规模",
                value: formatEveAmount(model.totalInterestAssets[selectedIndex]),
                series: model.totalInterestAssets,
                selectedIndex,
                activeNode,
                dataAttribute: "data-repricing-gap-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
              })}
            </div>
            <div class="eve-process-connector" aria-hidden="true"></div>
            <div class="eve-process-expansions">
              <div class="eve-process-expansion-slot eve-process-expansion-slot--wide">
                ${state.numeratorExpanded
                  ? renderRepricingGapNumeratorExpansion(model, selectedIndex, activeNode)
                  : `<div class="eve-process-placeholder">点击左侧“分子”节点后，在这里向右展开经期限调整后的重定价缺口组成项。</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  repricingGapProcessModalEl.classList.add("is-open");
  repricingGapProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderRepricingGapNumeratorExpansion(model, selectedIndex, activeNode) {
  const nodeOptions = { selectedIndex, activeNode, dataAttribute: "data-repricing-gap-process-node", valueFormat: "amount", labels: model.displayLabels };
  return `
    <div class="eve-process-capital-strip repricing-gap-component-strip">
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "adjusted-assets",
        title: "经期限调整后的生息资产",
        note: "资产端重定价现金流",
        value: formatEveAmount(model.adjustedInterestAssets[selectedIndex]),
        series: model.adjustedInterestAssets,
      })}
      <span class="eve-process-mini-operator">-</span>
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "adjusted-liabilities",
        title: "经期限调整后的付息负债",
        note: "负债端重定价现金流",
        value: formatEveAmount(model.adjustedInterestLiabilities[selectedIndex]),
        series: model.adjustedInterestLiabilities,
      })}
      <span class="eve-process-mini-operator">+</span>
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "demand-deposits",
        title: "活期存款",
        note: "稳定沉淀部分",
        value: formatEveAmount(model.demandDeposits[selectedIndex]),
        series: model.demandDeposits,
      })}
      <span class="eve-process-mini-operator">+</span>
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "derivative-receivable",
        title: "经期限调整后的表外衍生品应收",
        note: "表外应收重定价现金流",
        value: formatEveAmount(model.derivativeReceivable[selectedIndex]),
        series: model.derivativeReceivable,
      })}
      <span class="eve-process-mini-operator">-</span>
      ${renderEveProcessNode({
        ...nodeOptions,
        key: "derivative-payable",
        title: "经期限调整后的表外衍生品应付",
        note: "表外应付重定价现金流",
        value: formatEveAmount(model.derivativePayable[selectedIndex]),
        series: model.derivativePayable,
      })}
    </div>
  `;
}

function shouldShowProcessAxisLabel(labels, index) {
  if (labels.length <= 14) return true;
  const step = labels.length > 24 ? 5 : 3;
  return index === 0 || index === labels.length - 1 || index % step === 0;
}

function formatRepricingGapPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
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
  const useWideFrame = isMaturityTrendWidget(widget);
  const frame = useWideFrame ? createWideFrame(chartContext.xLabels.length) : createFrame(chartContext.xLabels.length);
  const viewBoxWidth = useWideFrame ? 1100 : 700;
  const axis = renderAxes(frame, chartContext.xLabels, "规模/增速");
  const futureStartIndex = getMaturityFutureStartIndex(widget, chartContext.xLabels);
  const futureOverlay = renderMaturityFutureOverlay(widget, chartContext, frame);
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
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${assetBarColor}" stroke="${getBarStrokeColor("资产规模", metricItems, 0, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes("负债规模")
    ? liabilityScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${liabilityBarColor}" stroke="${getBarStrokeColor("负债规模", metricItems, 1, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
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
    <div class="chart-shell ${useWideFrame ? "chart-shell--wide-time-series" : ""}">
      <svg viewBox="0 0 ${viewBoxWidth} 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${futureOverlay}
        ${assetBars}
        ${liabilityBars}
        ${selectedMetrics.includes("资产增速")
          ? renderFutureAwareLine(assetPoints, assetLineColor, 3.4, futureStartIndex)
          : ""}
        ${selectedMetrics.includes("负债增速")
          ? renderFutureAwareLine(liabilityPoints, liabilityLineColor, 3.4, futureStartIndex)
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
  const useWideFrame = isMaturityTrendWidget(widget);
  const frame = useWideFrame ? createWideFrame(chartContext.xLabels.length) : createFrame(chartContext.xLabels.length);
  const viewBoxWidth = useWideFrame ? 1100 : 700;
  const axis = renderAxes(frame, chartContext.xLabels, "规模/增速");
  const futureStartIndex = getMaturityFutureStartIndex(widget, chartContext.xLabels);
  const futureOverlay = renderMaturityFutureOverlay(widget, chartContext, frame);
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
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7" fill="${getBarFillColor(label, allSeries, seriesIndex, 0.82)}" stroke="${getBarStrokeColor(label, allSeries, seriesIndex, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
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
      return renderFutureAwareLine(points, color, seriesIndex === 0 ? 3.8 : 3.1, futureStartIndex);
    })
    .join("");

  return `
    <div class="chart-shell ${useWideFrame ? "chart-shell--wide-time-series" : ""}">
      <svg viewBox="0 0 ${viewBoxWidth} 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${futureOverlay}
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
  if (isMaturityStructureWidgetSeq(widget.seq)) {
    return renderMaturityBusinessStructureTables(widget, chartContext);
  }
  const widgetState = appState.widgetFilters[widget.seq] || {};
  const timeRangeValues = normalizeWidgetBusinessStructureDateRange(widget.seq, widgetState["时间区间（起止）"], null, "时间区间（起止）");
  return renderBusinessStructureTableSection(widget, chartContext, {
    timeRangeValues,
    filterName: "时间区间（起止）",
    showDateFilter: widget.seq === 89,
  });
}

function renderMaturityBusinessStructureTables(widget, chartContext) {
  const widgetState = appState.widgetFilters[widget.seq] || {};
  const activeScope = getMaturityStructureActiveScope(widget.seq);
  const section = activeScope === "future"
    ? { title: "未来合同到期", scope: "future", filterName: "未来时间区间（起止）" }
    : { title: "历史实际到期", scope: "historical", filterName: "历史时间区间（起止）" };
  const timeRangeValues = normalizeWidgetBusinessStructureDateRange(widget.seq, widgetState[section.filterName], null, section.filterName);
  return renderBusinessStructureTableSection(widget, chartContext, {
    ...section,
    title: "",
    timeRangeValues,
    showDateFilter: true,
  });
}

function renderBusinessStructureTableSection(widget, chartContext, options = {}) {
  const timeRangeValues = options.timeRangeValues || normalizeWidgetBusinessStructureDateRange(widget.seq, [], null, options.filterName);
  const organizations = getSelectedOrganizations(chartContext);
  const rows = buildBusinessStructureRows(widget, chartContext, timeRangeValues);
  const behavior = getConfiguredWidgetBehavior(widget);
  const drilldownTargetSeq = Number(behavior.drilldownTargetSeq) || null;
  const activeDrilldown = drilldownTargetSeq ? getBusinessDrilldown(drilldownTargetSeq) : null;
  const metricColumns = getBusinessStructureMetricColumns(widget);
  const localFilter = options.showDateFilter
    ? `
      <div class="chart-inline-controls">
        ${renderWidgetDateRangeInlineControl(widget.seq, options.filterName || "时间区间（起止）", "时间区间（起止）", timeRangeValues)}
      </div>
    `
    : "";
  const groupedBody = BUSINESS_STRUCTURE_GROUPS.map((group) => {
    const groupRows = rows.filter((row) => row.category === group.category);
    const totalRow = buildBusinessStructureGroupTotalRow(group, groupRows);
    const displayRows = totalRow ? [...groupRows, totalRow] : groupRows;
    return displayRows
      .map((row, index) => `
        <tr class="${[
          isBusinessStructureRowActive(activeDrilldown, row, options.scope) ? "chart-table__row--active" : "",
          row.isTotal ? "chart-table__row--total" : "",
        ].filter(Boolean).join(" ")}">
          ${index === 0 ? `<td rowspan="${displayRows.length}" class="chart-table__group-cell">${group.category}</td>` : ""}
          <td>${row.businessType}</td>
          ${row.orgValues.map((value) => `
            <td>${value.scale.toFixed(1)}</td>
            <td>${value.fixedRate}</td>
            <td>${value.duration}</td>
            <td>${value.averageTerm}</td>
            <td>${value.averageRate}</td>
          `).join("")}
          <td>
            ${row.isTotal
              ? `<span class="chart-table__muted-action">-</span>`
              : `<button
                  class="link-button chart-table__action-link ${isBusinessStructureRowActive(activeDrilldown, row, options.scope) ? "is-active" : ""}"
                  type="button"
                  data-open-business-detail="true"
                  data-target-widget-seq="${drilldownTargetSeq || ""}"
                  data-source-widget-seq="${widget.seq}"
                  data-business-type="${row.businessType}"
                  data-business-category="${row.category}"
                  data-maturity-table-scope="${options.scope || ""}"
                >${isBusinessStructureRowActive(activeDrilldown, row, options.scope) ? "已定位" : "查看明细"}</button>`}
          </td>
        </tr>
      `)
      .join("");
  }).join("");
  const tableMarkup = `
    <section class="business-structure-table-block ${options.scope ? `business-structure-table-block--${options.scope}` : ""}">
      ${options.title ? `<div class="business-structure-table-block__header"><h5>${options.title}</h5></div>` : ""}
      ${localFilter}
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th rowspan="2">类别</th>
              <th rowspan="2">业务类型</th>
              ${organizations.map((org) => `<th colspan="${metricColumns.length}">${org}</th>`).join("")}
              <th rowspan="2" class="chart-table__action-col">明细</th>
            </tr>
            <tr>
              ${organizations.map(() => metricColumns.map((label) => `<th>${label}</th>`).join("")).join("")}
            </tr>
          </thead>
          <tbody>
            ${groupedBody}
          </tbody>
        </table>
      </div>
    </section>
  `;
  if (options.wrapOnly) return tableMarkup;
  return `
    <div class="chart-shell chart-shell--data">
      ${tableMarkup}
    </div>
  `;
}

function isBusinessStructureRowActive(activeDrilldown, row, scope = "") {
  if (row?.isTotal) return false;
  if (activeDrilldown?.businessType !== row.businessType) return false;
  if (!scope) return !activeDrilldown?.maturityTableScope;
  return activeDrilldown?.maturityTableScope === scope;
}

function getBusinessStructureMetricColumns(widget) {
  return [
    "规模",
    "固息占比",
    "加权久期",
    Number(widget?.seq) === 79 ? "平均剩余期限" : "平均期限",
    "平均利率",
  ];
}

function buildBusinessStructureGroupTotalRow(group, groupRows) {
  if (!["生息资产", "付息负债"].includes(group?.category) || !groupRows.length) return null;
  const orgCount = Math.max(...groupRows.map((row) => row.orgValues.length));
  return {
    category: group.category,
    businessType: `${group.category}总计`,
    isTotal: true,
    orgValues: Array.from({ length: orgCount }, (_, orgIndex) => {
      const values = groupRows.map((row) => row.orgValues[orgIndex]).filter(Boolean);
      const scale = values.reduce((sum, value) => sum + Number(value.scale || 0), 0);
      const weighted = (picker) => {
        if (!scale) return 0;
        return values.reduce((sum, value) => sum + picker(value) * Number(value.scale || 0), 0) / scale;
      };
      return {
        scale: Number(scale.toFixed(1)),
        fixedRate: `${weighted((value) => parsePercentText(value.fixedRate)).toFixed(1)}%`,
        duration: `${weighted((value) => parseYearText(value.duration)).toFixed(1)}年`,
        averageTerm: `${weighted((value) => parseYearText(value.averageTerm)).toFixed(1)}年`,
        averageRate: `${weighted((value) => parsePercentText(value.averageRate)).toFixed(2)}%`,
      };
    }),
  };
}

function parsePercentText(value) {
  const parsed = Number(String(value || "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseYearText(value) {
  const parsed = Number(String(value || "").replace("年", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildBusinessStructureRows(widget, chartContext, timeRangeValues = []) {
  const organizations = getSelectedOrganizations(chartContext);
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
      const orgValues = organizations.map((org) => {
        const signature = createSignature(widget.seq, {
          机构: [org],
          币种: chartContext.filterState["币种"] || [],
          时间区间: timeRangeValues,
        });
        const seed = signature + groupIndex * 97 + itemIndex * 43;
        const scale = groupScaleBase[group.category] + ((widget.seq * 17 + seed) % 210) / 1.15;
        return {
          scale: Number(scale.toFixed(1)),
          fixedRate: `${(22 + ((widget.seq * 9 + seed) % 63)).toFixed(1)}%`,
          duration: `${(0.3 + ((widget.seq * 5 + seed) % 29) / 10).toFixed(1)}年`,
          averageTerm: `${(0.5 + ((widget.seq * 11 + seed) % 47) / 10).toFixed(1)}年`,
          averageRate: `${(groupRateBase[group.category] + ((widget.seq * 7 + seed) % 24) / 10).toFixed(2)}%`,
        };
      });
      return {
        category: group.category,
        businessType,
        orgValues,
      };
    })
  );
}

function getBusinessDrilldown(widgetSeq) {
  const drilldown = appState.businessDrilldowns?.[String(widgetSeq)] || appState.businessDrilldowns?.[widgetSeq] || null;
  return drilldown?.businessType ? drilldown : null;
}

function getBusinessDetailColumns(widget, drilldown = null) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  if (drilldown?.businessType === "投资类业务") {
    const bondColumns = [
      { key: "bondCode", label: "债券代码" },
      { key: "issuer", label: "发行人" },
      { key: "holdingScale", label: "持仓规模" },
      { key: "rateType", label: "利率类型" },
      { key: "rateBenchmark", label: "利率基准" },
      { key: "couponRate", label: "票面利率" },
      { key: "ytm", label: "YTM" },
      { key: "modifiedDuration", label: "修正久期" },
      { key: "originalTerm", label: "原始期限" },
      { key: "remainingTerm", label: "剩余期限" },
      { key: "repricingCycle", label: "重定价周期" },
      { key: "repricingDate", label: "下一重定价日" },
    ];
    return detailScope === "stock"
      ? bondColumns
      : [{ key: "tradeDate", label: "交易日期" }, ...bondColumns];
  }
  return [
    { key: "businessId", label: "业务编号" },
    { key: "counterparty", label: "客户" },
    { key: "startDate", label: "起始日" },
    { key: "amount", label: "金额" },
    { key: "rate", label: "利率" },
    { key: "rateType", label: "利率类型" },
    { key: "originalTerm", label: "原始期限" },
    { key: "remainingTerm", label: "剩余期限" },
    { key: "repricingTerm", label: "重定价期限" },
    { key: "repricingDate", label: "下一重定价日" },
  ];
}

function getBusinessDrilldownDateRange(drilldown) {
  const sourceWidgetState = appState.widgetFilters?.[drilldown?.sourceWidgetSeq] || {};
  const filterName = isMaturityStructureWidgetSeq(drilldown?.sourceWidgetSeq)
    ? getMaturityStructureRangeFilterName(drilldown?.maturityTableScope)
    : "时间区间（起止）";
  const rawDateRange = sourceWidgetState[filterName];
  if (!Array.isArray(rawDateRange) || !rawDateRange.some(Boolean)) return null;
  return normalizeWidgetBusinessStructureDateRange(drilldown?.sourceWidgetSeq, rawDateRange, null, filterName);
}

function getMaturityStructureRangeFilterName(scope) {
  return scope === "future" ? "未来时间区间（起止）" : "历史时间区间（起止）";
}

function formatBusinessDetailContext(widget, chartContext, drilldown, scopeMeta) {
  const institutions = summarizeFilterSelection("机构", chartContext.filterState["机构"] || []);
  const currencies = summarizeFilterSelection("币种", chartContext.filterState["币种"] || []);
  const dateRange = getBusinessDrilldownDateRange(drilldown);
  const maturityScopeLabel = drilldown?.maturityTableScope === "future"
    ? "（未来合同到期）"
    : drilldown?.maturityTableScope === "historical"
      ? "（历史实际到期）"
      : "";
  const dateText = scopeMeta.dateMode === "range" && Array.isArray(dateRange)
    ? `${dateRange[0]} 至 ${dateRange[1]}`
    : `截至 ${getDefaultGlobalEndDate()}`;
  return `${scopeMeta.label}${maturityScopeLabel} > ${drilldown.businessType} | 机构：${institutions} | 币种：${currencies} | ${dateText}`;
}

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
  const bondIssuerPool = ["国开行", "农业发展银行", "进出口银行", "财政部", "广东省政府", "江苏省政府", "招商局集团", "华能集团"];
  const rateBenchmarkPool = ["LPR 1Y", "LPR 5Y", "DR007", "SHIBOR 3M", "中债国债收益率", "固定票息"];
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
    const originalTermMonths = 12 + (seed % 84);
    const remainingTermMonths = Math.max(1, Math.round(originalTermMonths * (0.24 + (seed % 51) / 100)));
    const repricingTermMonths = rateType === "浮动" ? [1, 3, 6, 12][seed % 4] : originalTermMonths;
    const term = `${remainingTermMonths}个月`;
    const tradeDate = detailScope === "maturity" ? maturityDate : baseStart;
    return {
      businessId,
      counterparty,
      businessType: drilldown.businessType,
      sideLabel,
      bondCode: `${["2402", "2305", "2208", "2109"][seed % 4]}${String((seed % 9000) + 1000).slice(-4)}.IB`,
      issuer: bondIssuerPool[index % bondIssuerPool.length],
      tradeDate,
      startDate: baseStart,
      maturityDate,
      repricingDate,
      amount,
      holdingScale: amount,
      rate,
      rateType,
      rateBenchmark: rateType === "浮动" ? rateBenchmarkPool[seed % (rateBenchmarkPool.length - 1)] : "固定票息",
      couponRate: rate,
      ytm: `${(1.8 + (seed % 42) / 10).toFixed(2)}%`,
      modifiedDuration: `${(0.6 + (seed % 58) / 10).toFixed(1)}`,
      originalTerm: originalTermMonths >= 12 ? `${(originalTermMonths / 12).toFixed(originalTermMonths % 12 === 0 ? 0 : 1)}年` : `${originalTermMonths}个月`,
      remainingTerm: remainingTermMonths >= 12 ? `${(remainingTermMonths / 12).toFixed(remainingTermMonths % 12 === 0 ? 0 : 1)}年` : `${remainingTermMonths}个月`,
      repricingCycle: rateType === "浮动" ? `${repricingTermMonths}个月` : "到期",
      repricingTerm: rateType === "浮动" ? `${repricingTermMonths}个月` : "到期",
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

  const columns = getBusinessDetailColumns(widget, drilldown);
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
    interbankFundingMaxTenor: renderInterbankFundingMaxTenorDataTable,
    interbankFundingTenorBucket: renderInterbankFundingTenorBucketDataTable,
    bondInvestmentScaleLimit: renderBondInvestmentScaleLimitDataTable,
    bondInvestmentDurationLimit: renderBondInvestmentDurationLimitDataTable,
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
  if (isLiquidityDiagnosticRatioWidget(widget)) {
    return applyTableTemplateClasses(widget, renderLiquidityDiagnosticRatioDataTable(widget, chartContext), getWidgetTableTemplateKey(widget, "timeSeries"));
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

function renderScaledAxes(frame, xLabels, yLabel, maxValue, xTitle = inferXAxisTitle(xLabels), options = {}) {
  const ticks = buildAxisTicks(maxValue);
  const xTickMarkup = xLabels
    .map((label, index) => {
      const x = getFrameXPosition(frame, index, xLabels.length);
      const displayLabel = formatXAxisTickLabel(label, index, xLabels);
      if (options.rotateX) {
        return `
          <line x1="${x}" y1="${frame.bottom}" x2="${x}" y2="${frame.bottom + 6}" stroke="rgba(109,165,215,0.35)" stroke-width="1"></line>
          <text x="${x}" y="${frame.bottom + 20}" text-anchor="end" transform="rotate(-24 ${x} ${frame.bottom + 20})" class="axis-label axis-label--x">${displayLabel}</text>
        `;
      }
      return `
        <line x1="${x}" y1="${frame.bottom}" x2="${x}" y2="${frame.bottom + 6}" stroke="rgba(109,165,215,0.35)" stroke-width="1"></line>
        <text x="${x}" y="${frame.bottom + 22}" text-anchor="middle" class="axis-label axis-label--x">${displayLabel}</text>
      `;
    })
    .join("");
  const yTickMarkup = ticks
    .map((tick) => {
      const y = frame.bottom - (frame.height * tick) / maxValue;
      return `
        <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.14)" stroke-width="1"></line>
        <text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>
      `;
    })
    .join("");
  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">${yLabel}</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${xTitle}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    ${yTickMarkup}
    ${xTickMarkup}
  `;
}

function isMaturityTrendWidget(widget) {
  return [90, 91].includes(Number(widget?.seq));
}

function isMaturityStructureWidgetSeq(widgetSeq) {
  return Number(widgetSeq) === 96;
}

function buildFutureMaturityMonthlyLabels(monthCount = FUTURE_MATURITY_MONTH_COUNT) {
  const cutoff = parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const cursor = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 1);
  return Array.from({ length: monthCount }, (_, index) => {
    const current = new Date(cursor.getFullYear(), cursor.getMonth() + index, 1);
    const month = String(current.getMonth() + 1).padStart(2, "0");
    return `${current.getFullYear()}-${month}`;
  });
}

function applyMaturityTrendDateRangeToLabels(widget, labels, filterState = {}) {
  const rangeStart = appState.globalStartDate;
  const rangeEnd = appState.globalEndDate;
  const datedEntries = buildTimelineEntries(widget, labels, filterState).filter((entry) => entry.date);
  const historicalLabels = datedEntries
    .filter((entry) => isTimelineEntryWithinRange(entry, rangeStart, rangeEnd))
    .map((entry) => entry.label);
  return uniqueList([...(historicalLabels.length ? historicalLabels : [datedEntries[0]?.label].filter(Boolean)), ...buildFutureMaturityMonthlyLabels()]);
}

function getMaturityFutureStartIndex(widget, labels = []) {
  if (!isMaturityTrendWidget(widget)) return -1;
  const cutoff = getDefaultGlobalEndDate();
  const entries = buildMonthlyTimelineEntries(labels);
  return entries.findIndex((entry) => entry.rangeStart && entry.rangeStart > cutoff);
}

function isMaturityFutureIndex(futureStartIndex, index) {
  return futureStartIndex >= 0 && index >= futureStartIndex;
}

function renderMaturityFutureOverlay(widget, chartContext, frame) {
  const futureStartIndex = getMaturityFutureStartIndex(widget, chartContext.xLabels);
  if (futureStartIndex < 0) return "";
  const step = getFrameMinStep(frame, chartContext.xLabels.length);
  const boundaryX = Math.max(frame.left, getFrameXPosition(frame, futureStartIndex, chartContext.xLabels.length) - step / 2);
  const width = Math.max(0, frame.right - boundaryX);
  return `
    <rect class="maturity-future-band" x="${boundaryX}" y="${frame.top}" width="${width}" height="${frame.height}" rx="12"></rect>
    <line class="maturity-future-boundary" x1="${boundaryX}" y1="${frame.top}" x2="${boundaryX}" y2="${frame.bottom}" stroke-width="1.6" stroke-dasharray="6 5"></line>
    <text class="axis-title axis-title--minor maturity-future-label" x="${boundaryX + 10}" y="${frame.top + 16}">未来合同到期</text>
  `;
}

function renderFutureAwareLine(points, color, strokeWidth, futureStartIndex) {
  if (!points.length) return "";
  if (futureStartIndex <= 0 || futureStartIndex >= points.length) {
    return `
      <polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${color}" stroke="#ffffff" stroke-width="1.8"></circle>`).join("")}
    `;
  }
  const historicalPoints = points.slice(0, futureStartIndex);
  const futurePoints = points.slice(futureStartIndex - 1);
  return `
    <polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" points="${historicalPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
    <polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 6" opacity="0.72" points="${futurePoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
    ${points.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="3.8" fill="${color}" stroke="#ffffff" stroke-width="1.8" opacity="${isMaturityFutureIndex(futureStartIndex, index) ? "0.68" : "1"}"></circle>`).join("")}
  `;
}

function buildLimitedLineSeries(widget, chartContext, config) {
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : chartContext.seriesList;
  const selectedSeries = chartContext.seriesList.length ? chartContext.seriesList : allSeries.slice(0, 1);
  return selectedSeries.map((label, seriesIndex) => {
    const allIndex = Math.max(0, allSeries.indexOf(label));
    const values = buildMetricValues(widget.seq + allIndex * 19, chartContext.xLabels.length, chartContext.signature + allIndex * 37)
      .map((value, pointIndex) => {
        const wave = ((value + pointIndex * 7 + allIndex * 11) % 100) / 100;
        return Number((config.minValue + wave * (config.maxValue - config.minValue)).toFixed(config.decimals || 1));
      });
    const limit = Number((config.limitBase + (allIndex % 3) * config.limitStep).toFixed(config.decimals || 1));
    return {
      label,
      values,
      limit,
      color: getPaletteColor(label, allSeries, allIndex, "line"),
    };
  });
}

function renderLimitedLineMetricChart(widget, chartContext, config) {
  const seriesData = buildLimitedLineSeries(widget, chartContext, config);
  const frame = createFrame(chartContext.xLabels.length);
  const maxValue = Math.ceil(Math.max(config.axisMin || 0, ...seriesData.flatMap((series) => [...series.values, series.limit])) / config.roundTo) * config.roundTo;
  const axis = renderScaledAxes(frame, chartContext.xLabels, config.yLabel, maxValue);
  const limitLines = seriesData.slice(0, 4).map((series, index) => {
    const y = frame.bottom - (frame.height * series.limit) / maxValue;
    const label = `${series.label.split(" / ")[0]}限额 ${formatAxisTickValue(series.limit)}${config.unit || ""}`;
    return `
      <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="${hexToRgba(series.color, 0.62)}" stroke-width="2" stroke-dasharray="8 6"></line>
      <text x="${frame.left + 8}" y="${Math.max(frame.top + 14, y - 8 - index * 12)}" class="axis-title axis-title--minor" fill="${series.color}">${label}</text>
    `;
  }).join("");
  const lines = seriesData.map((series) => {
    const points = series.values.map((value, index) => ({
      x: getFrameXPosition(frame, index, chartContext.xLabels.length),
      y: frame.bottom - (frame.height * value) / maxValue,
    }));
    return `
      <polyline fill="none" stroke="${series.color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="${series.color}" stroke="#ffffff" stroke-width="1.7"></circle>`).join("")}
    `;
  }).join("");
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${limitLines}
        ${lines}
      </svg>
      ${renderSeriesLegend(widget, chartContext)}
    </div>
  `;
}

function renderLimitedLineMetricDataTable(widget, chartContext, config) {
  const seriesData = buildLimitedLineSeries(widget, chartContext, config);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesData.map((series) => `<th colspan="2">${series.label}</th>`).join("")}
            </tr>
            <tr>
              ${seriesData.map(() => `<th>${config.valueLabel}</th><th>限额</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                ${seriesData.map((series) => `<td>${series.values[index].toFixed(config.decimals || 1)}</td><td>${series.limit.toFixed(config.decimals || 1)}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInterbankFundingMaxTenorChart(widget, chartContext) {
  return renderLimitedLineMetricChart(widget, chartContext, {
    yLabel: "期限（天）",
    valueLabel: "最长期限",
    minValue: 120,
    maxValue: 330,
    limitBase: 360,
    limitStep: -30,
    roundTo: 60,
    axisMin: 420,
    unit: "天",
    decimals: 0,
  });
}

function renderInterbankFundingMaxTenorDataTable(widget, chartContext) {
  return renderLimitedLineMetricDataTable(widget, chartContext, {
    valueLabel: "最长期限",
    minValue: 120,
    maxValue: 330,
    limitBase: 360,
    limitStep: -30,
    roundTo: 60,
    decimals: 0,
  });
}

function buildInterbankFundingBucketRows(widget, chartContext) {
  const buckets = ["1M以内", "1-3M", "3-6M", "6-12M", "1年以上"];
  const rawValues = buildBarValues(widget.seq, buckets.length, chartContext.signature).map((value, index) => 12 + (value % (index === 0 ? 24 : 34)));
  const total = rawValues.reduce((sum, value) => sum + value, 0);
  return buckets.map((bucket, index) => ({
    bucket,
    value: Number(((rawValues[index] / total) * 100).toFixed(1)),
  }));
}

function renderInterbankFundingTenorBucketChart(widget, chartContext) {
  const rows = buildInterbankFundingBucketRows(widget, chartContext);
  const labels = rows.map((row) => row.bucket);
  const frame = createFrame(labels.length);
  const maxValue = Math.max(40, Math.ceil(Math.max(...rows.map((row) => row.value)) / 10) * 10);
  const axis = renderScaledAxes(frame, labels, "规模占比(%)", maxValue, "原始期限 bucket");
  const barWidth = Math.max(34, getFrameMinStep(frame, labels.length) * 0.34);
  const bars = rows.map((row, index) => {
    const x = getFrameXPosition(frame, index, labels.length) - barWidth / 2;
    const height = (frame.height * row.value) / maxValue;
    const y = frame.bottom - height;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="9" fill="${getBarFillColor(row.bucket, labels, index, 0.86)}" stroke="${getBarStrokeColor(row.bucket, labels, index, 0.28)}" stroke-width="1.2"></rect>
      <text x="${x + barWidth / 2}" y="${Math.max(frame.top + 14, y - 8)}" text-anchor="middle" class="axis-title axis-title--minor">${row.value.toFixed(1)}%</text>
    `;
  }).join("");
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${bars}
      </svg>
    </div>
  `;
}

function renderInterbankFundingTenorBucketDataTable(widget, chartContext) {
  const rows = buildInterbankFundingBucketRows(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table">
          <thead><tr><th>原始期限 bucket</th><th>同业融入规模占比</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${row.bucket}</td><td>${row.value.toFixed(1)}%</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildBondInvestmentScaleTimeline(widget, chartContext) {
  const orgs = getSelectedOrganizations(chartContext);
  const currencies = getSelectedCurrencies(chartContext);
  const signature = createSignature(widget.seq, {
    机构: orgs,
    币种: currencies,
  });
  const scopeWeight = Math.max(1, orgs.length * Math.max(1, currencies.length));
  const bondLimit = Number((320 + Math.min(scopeWeight, 12) * 18).toFixed(1));
  const corporateBondLimit = Number((120 + Math.min(scopeWeight, 12) * 8).toFixed(1));
  const rows = chartContext.xLabels.map((label, index) => {
    const trend = index * (2.6 + (signature % 5) * 0.15);
    const wave = ((signature + index * 37) % 52) - 20;
    const bondScale = Number((160 + scopeWeight * 6 + trend + wave).toFixed(1));
    const corporateWave = ((signature + index * 23 + 17) % 36) - 12;
    const corporateBondScale = Number((46 + scopeWeight * 2.8 + trend * 0.32 + corporateWave).toFixed(1));
    return {
      label,
      bondScale: Math.max(0, bondScale),
      corporateBondScale: Math.max(0, corporateBondScale),
      bondLimit,
      corporateBondLimit,
    };
  });
  return {
    scopeLabel: `${summarizeFilterSelection("机构", orgs)} / ${summarizeFilterSelection("币种", currencies)}`,
    rows,
  };
}

function renderBondInvestmentScaleLimitChart(widget, chartContext) {
  const { rows } = buildBondInvestmentScaleTimeline(widget, chartContext);
  const labels = chartContext.xLabels;
  const frame = createFrame(labels.length);
  const maxValue = Math.ceil(Math.max(...rows.flatMap((row) => [row.bondScale, row.corporateBondScale, row.bondLimit, row.corporateBondLimit]), 200) / 100) * 100;
  const axis = renderScaledAxes(frame, labels, "规模（亿元）", maxValue, inferXAxisTitle(labels));
  const step = getFrameMinStep(frame, labels.length);
  const barWidth = Math.max(10, Math.min(20, step * 0.22));
  const bondColor = getPaletteColor("债券投资规模", ["债券投资规模", "非金融企业债投资规模"], 0, "bar");
  const corpColor = getPaletteColor("非金融企业债投资规模", ["债券投资规模", "非金融企业债投资规模"], 1, "bar");
  const bars = rows.map((row, index) => {
    const center = getFrameXPosition(frame, index, labels.length);
    const renderBar = (value, offset, color) => {
      const height = (frame.height * value) / maxValue;
      const x = center + offset - barWidth / 2;
      const y = frame.bottom - height;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7" fill="${color}" opacity="0.86"></rect>`;
    };
    return `
      ${renderBar(row.bondScale, -barWidth * 0.65, bondColor)}
      ${renderBar(row.corporateBondScale, barWidth * 0.65, corpColor)}
    `;
  }).join("");
  const firstRow = rows[0] || { bondLimit: 0, corporateBondLimit: 0 };
  const bondLimitY = frame.bottom - (frame.height * firstRow.bondLimit) / maxValue;
  const corpLimitY = frame.bottom - (frame.height * firstRow.corporateBondLimit) / maxValue;
  const limitLines = `
    <line x1="${frame.left}" y1="${bondLimitY}" x2="${frame.right}" y2="${bondLimitY}" stroke="${hexToRgba(bondColor, 0.78)}" stroke-width="2" stroke-dasharray="8 6"></line>
    <text x="${frame.left + 8}" y="${Math.max(frame.top + 14, bondLimitY - 8)}" class="axis-title axis-title--minor" fill="${bondColor}">债券投资限额 ${firstRow.bondLimit.toFixed(1)}</text>
    <line x1="${frame.left}" y1="${corpLimitY}" x2="${frame.right}" y2="${corpLimitY}" stroke="${hexToRgba(corpColor, 0.78)}" stroke-width="2" stroke-dasharray="5 5"></line>
    <text x="${frame.left + 8}" y="${Math.max(frame.top + 28, corpLimitY - 8)}" class="axis-title axis-title--minor" fill="${corpColor}">非金融企业债限额 ${firstRow.corporateBondLimit.toFixed(1)}</text>
  `;
  const legendItems = [
    { label: "债券投资规模", color: bondColor },
    { label: "非金融企业债投资规模", color: corpColor },
    { label: "债券投资限额", color: hexToRgba(bondColor, 0.78) },
    { label: "非金融企业债限额", color: hexToRgba(corpColor, 0.78) },
  ];
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${limitLines}
        ${bars}
      </svg>
      ${renderSeriesLegend(widget, { ...chartContext, allSeriesList: legendItems.map((item) => item.label), seriesList: legendItems.map((item) => item.label), legendItems }, "__legend_bond_scale__")}
    </div>
  `;
}

function renderBondInvestmentScaleLimitDataTable(widget, chartContext) {
  const { rows, scopeLabel } = buildBondInvestmentScaleTimeline(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th><th>筛选口径</th><th>债券投资规模</th><th>债券投资限额</th><th>非金融企业债投资规模</th><th>非金融企业债限额</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${row.label}</td>
                <td>${scopeLabel}</td>
                <td>${row.bondScale.toFixed(1)}</td>
                <td>${row.bondLimit.toFixed(1)}</td>
                <td>${row.corporateBondScale.toFixed(1)}</td>
                <td>${row.corporateBondLimit.toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBondInvestmentDurationLimitChart(widget, chartContext) {
  return renderLimitedLineMetricChart(widget, chartContext, {
    yLabel: "久期",
    valueLabel: "债券修正久期",
    minValue: 2.4,
    maxValue: 5.6,
    limitBase: 5.8,
    limitStep: -0.25,
    roundTo: 1,
    axisMin: 7,
    decimals: 1,
  });
}

function renderBondInvestmentDurationLimitDataTable(widget, chartContext) {
  return renderLimitedLineMetricDataTable(widget, chartContext, {
    valueLabel: "债券修正久期",
    minValue: 2.4,
    maxValue: 5.6,
    limitBase: 5.8,
    limitStep: -0.25,
    roundTo: 1,
    decimals: 1,
  });
}

function buildLiquidityGapTenorSeries(widget, chartContext) {
  const selectedTenor = ((chartContext.filterState?.["期限长度"] || []).find((value) =>
    LIQUIDITY_GAP_TENOR_OPTIONS.includes(value)
  )) || "30D";
  const selectedCaliber = ((chartContext.filterState?.["口径"] || []).find((value) => ["时点", "月日均"].includes(value))) || "时点";
  const allSeriesIndex = Math.max(0, LIQUIDITY_GAP_TENOR_OPTIONS.indexOf(selectedTenor));
  const caliberOffset = selectedTenor === "30D" && selectedCaliber === "月日均" ? 11 : 0;
  const label = selectedTenor === "30D" ? `${selectedTenor}/${selectedCaliber}` : selectedTenor;
  return [
    {
      label,
      colorIndex: allSeriesIndex,
      tenor: selectedTenor,
      caliber: selectedTenor === "30D" ? selectedCaliber : "",
      scaleValues: buildBarValues(widget.seq + 7 + allSeriesIndex * 17, chartContext.xLabels.length, chartContext.signature + allSeriesIndex * 29 + caliberOffset)
        .map((value) => 28 + (value % 96)),
      ratioValues: buildMetricValues(widget.seq + 41 + allSeriesIndex * 13, chartContext.xLabels.length, chartContext.signature + allSeriesIndex * 37 + caliberOffset)
        .map((value) => Number((2 + (value % 72) / 6).toFixed(1))),
    },
  ];
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
  const activeSeries = seriesData[0] || { label: "30D", colorIndex: 2 };
  const scaleColor = getBarFillColor(activeSeries.label, LIQUIDITY_GAP_TENOR_OPTIONS, activeSeries.colorIndex, 0.78);
  const ratioColor = getPaletteColor(activeSeries.label, LIQUIDITY_GAP_TENOR_OPTIONS, activeSeries.colorIndex, "line");

  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${barMarkup}
        ${lineMarkup}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: [`${activeSeries.label}缺口规模`, `${activeSeries.label}缺口率`],
        seriesList: seriesData.map((series) => series.label),
        legendItems: [
          { label: `${activeSeries.label}缺口规模`, color: scaleColor },
          { label: `${activeSeries.label}缺口率`, color: ratioColor },
        ],
      }, "__legend_liquidity_gap_metrics__")}
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
  const organizations = getSelectedOrganizations(chartContext);
  const metricColumns = ["经济价值变动", "一级资本净额", "△EVE", ...scenarioLabels];
  const rows = currencyLabels.map((currency, index) => {
    return {
      currency,
      orgValues: organizations.map((org) => {
        const orgSignature = createSignature(widget.seq, { 机构: [org] });
        const economyChange = -1 * (12 + ((orgSignature + index * 19) % 88));
        const capital = 180 + ((orgSignature + index * 23) % 360);
        const eveRatio = `${((Math.abs(economyChange) / capital) * 100).toFixed(1)}%`;
        const scenarioValues = scenarioLabels.map((_, scenarioIndex) => {
          const raw = ((orgSignature + 41 + (index + 1) * 29 + (scenarioIndex + 1) * 37) % 180) - 90;
          return raw.toFixed(1);
        });
        return {
          economyChange: economyChange.toFixed(1),
          capital: capital.toFixed(1),
          eveRatio,
          scenarioValues,
        };
      }),
    };
  });
  return `
    <div class="chart-shell">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">币种</th>
              ${organizations.map((org) => `<th colspan="${metricColumns.length}">${org}</th>`).join("")}
            </tr>
            <tr>
              ${organizations.map(() => metricColumns.map((label) => `<th>${label}</th>`).join("")).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.currency}</td>
                    ${row.orgValues.map((values) => `
                      <td>${values.economyChange}</td>
                      <td>${values.capital}</td>
                      <td>${values.eveRatio}</td>
                      ${values.scenarioValues.map((value) => `<td>${value}</td>`).join("")}
                    `).join("")}
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

function isRepricingMaturityDistributionWidget(widget) {
  return Number(widget?.sourceSeq || widget?.seq) === 14;
}

function getMaturityDistributionBuckets() {
  return ["2026-04-01", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"];
}

function getMaturityDistributionSeries() {
  return [
    { name: "自营贷款", direction: 1 },
    { name: "投资类业务", direction: 1 },
    { name: "同业资产", direction: 1 },
    { name: "自营非标投资", direction: 1 },
    { name: "存放央行", direction: 1 },
    { name: "内部交易资产", direction: 1 },
    { name: "活期存款", direction: -1 },
    { name: "定期存款", direction: -1 },
    { name: "同业负债", direction: -1 },
    { name: "发行债券", direction: -1 },
    { name: "中央行借款", direction: -1 },
    { name: "租赁负债", direction: -1 },
    { name: "内部交易负债", direction: -1 },
    { name: "表外衍生品应付", direction: -1 },
    { name: "表外衍生品应收", direction: 1 },
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
  if (isRepricingMaturityDistributionWidget(widget)) {
    return renderRepricingMaturityDistributionChart(widget, chartContext);
  }

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
  const organizations = getSelectedOrganizations(chartContext);
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
  const rows = rowLabels.map((label, rowIndex) => {
    return {
      label,
      orgValues: organizations.map((org) => {
        const signature = createSignature(widget.seq, {
          机构: [org],
          币种: [label],
        });
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
        };
      }),
    };
  });

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">币种</th>
              ${organizations.map((org) => `<th colspan="${columns.length}">${org}</th>`).join("")}
            </tr>
            <tr>
              ${organizations.map(() => columns.map((column) => `<th>${column.label}</th>`).join("")).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.orgValues.map((values) => columns.map((column) => `<td>${Number(values[column.key]).toFixed(1)}</td>`).join("")).join("")}
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

function renderRepricingMaturityDistributionChart(widget, chartContext) {
  const selectedNames = getMaturityDistributionSelection(chartContext);
  const matrix = buildMaturityDistributionMatrix(widget, chartContext.signature, selectedNames);
  const allSeries = getMaturityDistributionSeries().map((item) => item.name);
  const drilldown = getRepricingMaturityDrilldown(widget, matrix);
  const frame = { left: 72, right: 560, top: 24, bottom: 224, width: 488, height: 200 };
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
  const barWidth = Math.max(14, step * 0.44);
  const ticks = [-100, -50, 0, 50, 100].map((tick) => ({ tick, y: zeroY - tick * scale }));
  const axisMarkup = `
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.2"></line>
    <line x1="${frame.left}" y1="${zeroY}" x2="${frame.right}" y2="${zeroY}" stroke="rgba(109,165,215,0.42)" stroke-width="1.2"></line>
    ${ticks.map(({ tick, y }) => `
      <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.12)" stroke-width="1"></line>
      <text x="${frame.left - 12}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${tick}</text>
    `).join("")}
    <text x="${frame.left - 46}" y="${frame.top - 6}" class="axis-title">规模(亿元)</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 48}" text-anchor="middle" class="axis-title">重定价期限</text>
    ${matrix.buckets.map((bucket, index) => {
      const x = frame.left + step * index + step * 0.5;
      return `
        <line x1="${x}" y1="${zeroY}" x2="${x}" y2="${zeroY + 6}" stroke="rgba(109,165,215,0.28)" stroke-width="1"></line>
        <text x="${x}" y="${frame.bottom + 18}" text-anchor="end" transform="rotate(-38 ${x} ${frame.bottom + 18})" class="axis-label axis-label--x">${bucket}</text>
      `;
    }).join("")}
  `;
  const barsMarkup = matrix.rows.map((row, rowIndex) => {
    const x = frame.left + step * rowIndex + (step - barWidth) / 2;
    let positiveOffset = 0;
    let negativeOffset = 0;
    return row.values.map((value, valueIndex) => {
      const seriesItem = matrix.series[valueIndex];
      const height = Math.abs(value) * scale;
      const color = getPaletteColor(seriesItem.name, allSeries, allSeries.indexOf(seriesItem.name), "bar");
      const isActive = drilldown.bucket === row.bucket && drilldown.businessType === seriesItem.name;
      const y = value >= 0 ? zeroY - positiveOffset - height : zeroY + negativeOffset;
      if (value >= 0) positiveOffset += height;
      else negativeOffset += height;
      return `
        <rect
          class="repricing-maturity-segment ${isActive ? "is-active" : ""}"
          x="${x}"
          y="${y}"
          width="${barWidth}"
          height="${Math.max(3, height)}"
          rx="6"
          fill="${color}"
          opacity="${isActive ? "1" : value >= 0 ? "0.9" : "0.7"}"
          role="button"
          tabindex="0"
          aria-label="${row.bucket} ${seriesItem.name} 查看重定价明细"
          data-repricing-maturity-cell="true"
          data-widget-seq="${widget.seq}"
          data-bucket="${row.bucket}"
          data-bucket-index="${rowIndex}"
          data-business-type="${seriesItem.name}"
        ></rect>
      `;
    }).join("");
  }).join("");

  return `
    <div class="chart-shell chart-shell--repricing-maturity">
      <div class="repricing-maturity-layout">
        <div class="repricing-maturity-chart">
          <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid meet" aria-label="分业务重定价期限分布">
            ${axisMarkup}
            ${barsMarkup}
          </svg>
          ${renderMaturityDistributionLegend(widget, selectedNames)}
        </div>
        ${renderRepricingMaturityDetailTable(widget, chartContext, drilldown)}
      </div>
    </div>
  `;
}

function getRepricingMaturityDrilldown(widget, matrix) {
  const widgetKey = String(widget?.seq || 14);
  const state = appState.repricingMaturityDrilldowns?.[widgetKey] || {};
  const visibleSeries = (matrix.series || []).map((item) => item.name);
  const firstBucket = matrix.buckets?.[0] || "";
  const firstBusinessType = visibleSeries[0] || "";
  const bucket = matrix.buckets?.includes(state.bucket) ? state.bucket : firstBucket;
  const businessType = visibleSeries.includes(state.businessType) ? state.businessType : firstBusinessType;
  const bucketIndex = Math.max(0, matrix.buckets?.indexOf(bucket) || 0);
  return {
    bucket,
    bucketIndex,
    businessType,
    category: getBusinessCategoryByType(businessType),
  };
}

function getBusinessCategoryByType(businessType) {
  return BUSINESS_STRUCTURE_GROUPS.find((group) => group.items.includes(businessType))?.category || "";
}

function getRepricingMaturityDetailColumns() {
  return [
    { key: "businessId", label: "业务编号" },
    { key: "repricingCounterparty", label: "客户/发行人" },
    { key: "repricingAmount", label: "重定价金额" },
    { key: "repricingDate", label: "下一重定价日" },
  ];
}

function renderRepricingMaturityDetailTable(widget, chartContext, drilldown) {
  if (!drilldown?.businessType) {
    return `
      <aside class="repricing-maturity-detail">
        <div class="business-detail-empty">
          <div class="business-detail-empty__title">选择期限和业务类型查看明细</div>
          <div class="business-detail-empty__desc">点击左侧堆叠柱中的任一柱段后，这里展示对应业务的逐笔重定价明细。</div>
        </div>
      </aside>
    `;
  }
  const columns = getRepricingMaturityDetailColumns();
  const rows = buildRepricingMaturityDetailRows(widget, chartContext, drilldown);
  const institutions = summarizeFilterSelection("机构", chartContext.filterState["机构"] || []);
  const currencies = summarizeFilterSelection("币种", chartContext.filterState["币种"] || []);
  return `
    <aside class="repricing-maturity-detail">
      <div class="business-detail-panel">
        <div class="business-detail-context">
          <div>
            <div class="business-detail-context__eyebrow">逐笔重定价明细</div>
            <div class="business-detail-context__title">${drilldown.businessType}｜${drilldown.bucket}</div>
            <div class="business-detail-context__meta">机构：${institutions} | 币种：${currencies} | 共 ${rows.length} 笔业务</div>
          </div>
        </div>
        <div class="table-shell">
          <table class="chart-table chart-table--repricing-detail">
            <thead>
              <tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
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
    </aside>
  `;
}

function buildRepricingMaturityDetailRows(widget, chartContext, drilldown) {
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: chartContext.filterState["币种"] || [],
    业务类型: [drilldown.businessType],
    重定价期限: [drilldown.bucket],
  });
  const seededRows = buildBusinessDetailRows(widget, chartContext, {
    businessType: drilldown.businessType,
    category: drilldown.category,
    sourceWidgetSeq: widget.seq,
  });
  const bucketDate = parseDateValue(drilldown.bucket) || parseDateValue(addMonthsDateValue(getDefaultGlobalEndDate(), drilldown.bucketIndex + 1));
  const bucketAnchor = formatDateValue(bucketDate);
  return seededRows.slice(0, 8 + (signature % 4)).map((row, index) => {
    const repricingDate = addDays(bucketAnchor, (index % 7) - 3);
    const repricingTermMonths = Math.max(1, Math.round(Math.abs((parseDateValue(repricingDate) - (parseDateValue(getDefaultGlobalEndDate()) || new Date())) / (1000 * 60 * 60 * 24 * 30))));
    return {
      ...row,
      repricingCounterparty: row.issuer || row.counterparty || "-",
      repricingAmount: row.holdingScale || row.amount,
      repricingDate,
      repricingTerm: repricingTermMonths <= 1 ? "1个月内" : `${repricingTermMonths}个月`,
      repricingCycle: row.rateType === "浮动" ? row.repricingCycle : "到期",
    };
  });
}

function renderBenchmarkCurrencyMatrixTable(widget, chartContext) {
  const rowLabels = WIDGET_FILTER_PRESET_CONFIG.benchmarkSelector?.options || FILTER_OPTIONS["利率基准"] || ["DR007"];
  const columnLabels = uniqueList(FILTER_OPTIONS["币种"] || ["全折人民币"]);
  const organizations = getSelectedOrganizations(chartContext);
  const dimension = (chartContext.filterState["维度"] || WIDGET_FILTER_PRESET_CONFIG.durationDimensionSelector?.defaultValues || ["资产端"])[0] || "资产端";
  const rows = rowLabels.map((label, rowIndex) => ({
    label,
    orgValues: organizations.map((org) => {
      const signature = createSignature(widget.seq, {
        机构: [org],
        币种: columnLabels,
        维度: [dimension],
      });
      return columnLabels.map((_, columnIndex) => {
        const base = 48 + ((widget.seq * 17 + signature + rowIndex * 19 + columnIndex * 23) % 260);
        if (dimension === "负债端") return Number((-base).toFixed(1));
        if (dimension === "资产负债差额") return Number((((base % 220) - 110) * 1.1).toFixed(1));
        return Number(base.toFixed(1));
      });
    }),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">利率基准</th>
              ${organizations.map((org) => `<th colspan="${columnLabels.length}">${org}</th>`).join("")}
            </tr>
            <tr>
              ${organizations.map(() => columnLabels.map((label) => `<th>${label}</th>`).join("")).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.orgValues.map((values) => values.map((value) => `<td>${value.toFixed(1)}</td>`).join("")).join("")}
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
  const organizations = getSelectedOrganizations(chartContext);
  const columnLabels =
    (AREA_FILTER_OPTION_OVERRIDES["净利息收入波动率"] && AREA_FILTER_OPTION_OVERRIDES["净利息收入波动率"]["利率情景"]) ||
    ["所有利率平行上移200bp", "活期利率不变但其他利率平行上移200bp"];
  const rows = rowLabels.map((label, rowIndex) => ({
    label,
    orgValues: organizations.map((org) => {
      const orgOnlySignature = createSignature(widget.seq, { 机构: [org] });
      return columnLabels.map((_, columnIndex) => {
        const amount = 8 + ((widget.seq * 17 + orgOnlySignature + rowIndex * 11 + columnIndex * 19) % 56);
        const ratio = (((widget.seq * 7 + orgOnlySignature + rowIndex * 13 + columnIndex * 17) % 48) / 10 + 0.8).toFixed(1);
        return {
          amount: amount.toFixed(1),
          ratio: `${ratio}%`,
        };
      });
    }),
  }));

  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="3">币种</th>
              ${organizations.map((org) => `<th colspan="${columnLabels.length * 2}">${org}</th>`).join("")}
            </tr>
            <tr>
              ${organizations.map(() => columnLabels.map((label) => `<th colspan="2">${label}</th>`).join("")).join("")}
            </tr>
            <tr>
              ${organizations.map(() => columnLabels.map(() => `<th>波动值</th><th>波动率</th>`).join("")).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    ${row.orgValues.map((values) => values.map((value) => `<td>${value.amount}</td><td>${value.ratio}</td>`).join("")).join("")}
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
  const simulationLegend = shouldRenderSimulationOverlay(widget, chartContext)
    ? `
      <span class="chart-legend__item chart-legend__item--simulation" aria-label="模拟后最新值">
        <i class="chart-legend__diamond" style="background:${SIMULATION_COLOR}"></i>
        模拟后最新值
      </span>
    `
    : "";
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
      ${simulationLegend}
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

function renderWidgetInlineControl(widgetSeq, filterName, filterLabel, selectedValues, options, extraClass = "") {
  const openKey = buildFilterKey("widget", widgetSeq, filterName);
  const isOpen = appState.openFilterKey === openKey;
  return `
    <div class="chart-inline-control ${extraClass} ${isOpen ? "is-open" : ""}">
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
  const [startDate, endDate] = normalizeWidgetBusinessStructureDateRange(widgetSeq, selectedValues, null, filterName);
  const rangeMode = isMaturityStructureWidgetSeq(widgetSeq) ? getMaturityStructureRangeMode(filterName, selectedValues) : "historical";
  const isFutureRange = rangeMode === "future";
  const allowsFuture = isMaturityStructureWidgetSeq(widgetSeq) && isFutureRange;
  const minDate = isFutureRange ? addDays(getDefaultGlobalEndDate(), 1) : "";
  const maxDate = allowsFuture ? addDays(getDefaultGlobalEndDate(), 366) : getDefaultGlobalEndDate();
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
            min="${minDate}"
            max="${allowsFuture ? maxDate : endDate}"
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
            max="${maxDate}"
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

function getDefaultFutureBusinessStructureDateRange(referenceDateValue = getDefaultGlobalEndDate()) {
  const startDate = addDays(referenceDateValue, 1);
  return [startDate, addMonthsDateValue(startDate, FUTURE_MATURITY_MONTH_COUNT)];
}

function isFutureBusinessDate(dateValue) {
  return isDateValue(dateValue) && dateValue > getDefaultGlobalEndDate();
}

function normalizeBusinessStructureDateRange(values = [], options = {}) {
  const allowFuture = Boolean(options.allowFuture);
  const preventCrossBoundary = Boolean(options.preventCrossBoundary);
  const changedIndex = options.changedIndex == null ? null : Number(options.changedIndex);
  const [defaultStart, defaultEnd] = getDefaultBusinessStructureDateRange();
  let startDate = Array.isArray(values) && isDateValue(values[0]) ? values[0] : defaultStart;
  let endDate = Array.isArray(values) && isDateValue(values[1]) ? values[1] : defaultEnd;
  if (!allowFuture && endDate > defaultEnd) endDate = defaultEnd;
  if (allowFuture && preventCrossBoundary && isDateValue(startDate) && isDateValue(endDate)) {
    const startIsFuture = isFutureBusinessDate(startDate);
    const endIsFuture = isFutureBusinessDate(endDate);
    if (startIsFuture !== endIsFuture) {
      if (changedIndex === 0) {
        endDate = startDate;
      } else if (changedIndex === 1) {
        if (endIsFuture) {
          startDate = getMonthStartDateValue(endDate);
          if (!isFutureBusinessDate(startDate)) startDate = addDays(defaultEnd, 1);
        } else {
          startDate = endDate;
        }
      } else if (endIsFuture) {
        startDate = getMonthStartDateValue(endDate);
        if (!isFutureBusinessDate(startDate)) startDate = addDays(defaultEnd, 1);
      } else {
        endDate = defaultEnd;
      }
    }
  }
  if (startDate > endDate) {
    if (allowFuture && preventCrossBoundary && changedIndex === 0) {
      endDate = startDate;
    } else {
      startDate = endDate;
    }
  }
  return [startDate, endDate];
}

function getMaturityStructureRangeMode(filterName, values = []) {
  if (String(filterName || "").includes("未来")) return "future";
  if (String(filterName || "").includes("历史")) return "historical";
  return Array.isArray(values) && values.some((value) => isFutureBusinessDate(value)) ? "future" : "historical";
}

function normalizeWidgetBusinessStructureDateRange(widgetSeq, values = [], changedIndex = null, filterName = "时间区间（起止）") {
  if (isMaturityStructureWidgetSeq(widgetSeq)) {
    const rangeMode = getMaturityStructureRangeMode(filterName, values);
    const defaultRange = rangeMode === "future" ? getDefaultFutureBusinessStructureDateRange() : getDefaultBusinessStructureDateRange();
    const normalizedValues = Array.isArray(values) && values.length ? values : defaultRange;
    const normalizedRange = normalizeBusinessStructureDateRange(normalizedValues, {
      allowFuture: true,
      preventCrossBoundary: true,
      changedIndex,
    });
    if (rangeMode === "future" && !normalizedRange.every(isFutureBusinessDate)) {
      return getDefaultFutureBusinessStructureDateRange();
    }
    if (rangeMode === "historical" && normalizedRange.some(isFutureBusinessDate)) {
      return getDefaultBusinessStructureDateRange();
    }
    return normalizedRange;
  }
  return normalizeBusinessStructureDateRange(values);
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
  if (isMaturityTrendWidget(widget)) {
    return applyMaturityTrendDateRangeToLabels(widget, labels, filterState);
  }
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
  const widgetSeq = Number(widget?.sourceSeq || widget?.seq);
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

function getSelectedCurrencies(chartContext) {
  const selected = (chartContext?.filterState?.币种 || DEFAULT_FILTER_VALUES.币种 || []).filter(Boolean);
  return selected.length ? selected : (FILTER_OPTIONS.币种 || []).slice(0, 1);
}

function getSelectedOrgCurrencyPairs(chartContext, maxPairs = 8) {
  const orgs = getSelectedOrganizations(chartContext);
  const currencies = getSelectedCurrencies(chartContext);
  return cartesianProduct([orgs, currencies]).slice(0, maxPairs).map((pair) => ({
    org: pair[0],
    currency: pair[1],
    label: `${shortenOrgLabel(pair[0])} / ${pair[1]}`,
  }));
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
  if (areaGroup?.name === "重定价缺口率") return [];
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
  if (areaGroup?.name === "重定价缺口率") {
    return areaGroup.viewGroups.filter((viewGroup) => {
      const tabKey = viewGroup?.scopeMeta?.tabKey || "";
      const viewScope = typeof viewGroup?.viewScope === "string" ? viewGroup.viewScope : "";
      return tabKey === "时点口径" || viewScope.includes("时点口径");
    });
  }

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
  const blockNames = uniqueList([block.sourceBlockName, block.name].filter(Boolean));
  return blockNames.reduce((config, blockName) => {
    const legacyConfig = AREA_DISPLAY_CONFIG[page.name]?.[blockName]?.[areaGroup.name] || {};
    const unifiedConfig = LAYOUT_RULE_CONFIG.areas?.[`${page.name}/${blockName}/${areaGroup.name}`] || {};
    return { ...config, ...legacyConfig, ...unifiedConfig };
  }, {});
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
      appState.widgetFilters[widget.seq][filter.name] = normalizeWidgetBusinessStructureDateRange(widget.seq, currentValues, null, filter.name);
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
  if (ownerType === "page") return appState.pageFilters[ownerId] || {};
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

function shouldRenderAreasInPairs(block, groupedAreas) {
  return Boolean(getBlockDisplayConfig(block).pairAreas) && groupedAreas.length === 2;
}

function shouldSpanFullWidth(widget) {
  if (isRepricingMaturityDistributionWidget(widget)) return true;
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

function isEveRatioTrendWidget(widget) {
  return Number(widget?.seq) === EVE_RATIO_WIDGET_SEQ;
}

function isEveSourceTrendWidget(widget) {
  return EVE_SOURCE_TREND_WIDGET_SEQS.has(Number(widget?.seq));
}

function isRepricingGapRateWidget(widget) {
  return REPRICING_GAP_RATE_WIDGET_SEQS.has(Number(widget?.sourceSeq || widget?.seq));
}

function isLiquidityDiagnosticRatioWidget(widget) {
  return Boolean(getLiquidityDiagnosticKind(widget));
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
  if (widget?.displayTitle) return widget.displayTitle;
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
  return getConfiguredWidgetBehaviorBySeq(widget?.sourceSeq || widget?.seq);
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
  const sections = getRenderablePageSections(page)
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

function canRenderHedgeSimulation(page = getCurrentPage()) {
  return getSimulationMode(page) === "interest";
}

function getSimulationModeTabs(page = getCurrentPage()) {
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { mode: SIMULATION_MODE_HEDGE, label: "套期交易模拟测算" },
      { module: SIMULATION_MODULE_NET_INTEREST_INCOME, label: "净利息收入" },
    ];
  }
  if (simulationMode === "liquidity") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { module: SIMULATION_MODULE_LIQUIDITY_STRESS, label: "流动性压力测试" },
    ];
  }
  return [
    { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
  ];
}

function getSimulationDraftMode(page = getCurrentPage()) {
  if (!canRenderHedgeSimulation(page)) return SIMULATION_MODE_NEW_BUSINESS;
  return appState.simulationDraftMode === SIMULATION_MODE_HEDGE ? SIMULATION_MODE_HEDGE : SIMULATION_MODE_NEW_BUSINESS;
}

function getSimulationModeLabel(mode = SIMULATION_MODE_NEW_BUSINESS) {
  return mode === SIMULATION_MODE_HEDGE ? "套期交易模拟测算" : "新业务模拟测算";
}

function getDefaultSimulationDraftMode(page, simulation) {
  if (canRenderHedgeSimulation(page) && simulation?.simulationType === SIMULATION_MODE_HEDGE) return SIMULATION_MODE_HEDGE;
  return SIMULATION_MODE_NEW_BUSINESS;
}

function closeSimulationModal() {
  appState.simulationModalPageId = null;
  appState.simulationDraftMode = SIMULATION_MODE_NEW_BUSINESS;
  appState.simulationDraft = null;
  appState.hedgeSimulationDraft = null;
}

function openSimulationModal(pageId) {
  const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
  const simulation = getPageSimulation(pageId);
  appState.simulationModalPageId = pageId;
  appState.simulationDraftMode = getDefaultSimulationDraftMode(page, simulation);
  appState.simulationDraft = createSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_NEW_BUSINESS ? simulation : null
  );
  appState.hedgeSimulationDraft = createHedgeSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_HEDGE ? simulation : null
  );
}

function getSimulationFieldDefs(page = getCurrentPage()) {
  const commonFields = [
    { name: "fundingRole", label: "资金方向", type: "select", options: SIMULATION_FUNDING_ROLE_OPTIONS },
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

function getDefaultSimulationBusinessType(fundingRole) {
  if (fundingRole === "资金来源") return "定期存款";
  if (fundingRole === "资金运用") return "自营贷款";
  return BUSINESS_DURATION_OPTIONS[0] || "";
}

function getDefaultSimulationFundingRole(entryIndex = 0) {
  return SIMULATION_FUNDING_ROLE_OPTIONS[entryIndex % SIMULATION_FUNDING_ROLE_OPTIONS.length] || SIMULATION_FUNDING_ROLE_OPTIONS[0];
}

function getSimulationFundingRoleByBusinessType(businessType) {
  return BUSINESS_SIDE_MAP[businessType] === "liability" ? "资金来源" : "资金运用";
}

function normalizeSimulationEntryRole(entry, entryIndex = 0) {
  const fallbackRole = entry?.businessType
    ? getSimulationFundingRoleByBusinessType(entry.businessType)
    : getDefaultSimulationFundingRole(entryIndex);
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(entry?.fundingRole) ? entry.fundingRole : fallbackRole;
  return {
    ...entry,
    fundingRole,
  };
}

function createDefaultSimulationEntry(page = getCurrentPage(), entryIndex = 0, fundingRoleOverride = "") {
  const fieldDefs = getSimulationFieldDefs(page);
  const entry = {};
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(fundingRoleOverride)
    ? fundingRoleOverride
    : getDefaultSimulationFundingRole(entryIndex);
  fieldDefs.forEach((field) => {
    if (field.name === "fundingRole") entry[field.name] = fundingRole;
    else if (field.name === "businessType") entry[field.name] = getDefaultSimulationBusinessType(fundingRole);
    else if (field.type === "number") entry[field.name] = field.name === "scale" ? "50" : "12";
    else if (field.options?.length) {
      const firstOption = field.options[0];
      entry[field.name] = typeof firstOption === "object" ? firstOption[field.valueKey || "value"] : firstOption;
    } else entry[field.name] = "";
  });
  return entry;
}

function createDefaultSimulationDraft(page = getCurrentPage()) {
  return { entries: createMinimumSimulationEntries(page) };
}

function getSimulationEntries(simulation) {
  if (!simulation) return [];
  if (Array.isArray(simulation.entries)) return simulation.entries.filter(Boolean);
  return [simulation];
}

function getSimulationDraftEntries(draft, page = getCurrentPage()) {
  const entries = getSimulationEntries(draft);
  return ensureMinimumSimulationEntries(page, entries.length ? entries : []);
}

function createSimulationDraftFromScenario(page, scenario) {
  const entries = ensureMinimumSimulationEntries(page, getSimulationEntries(scenario));
  return {
    entries: entries.map((entry, index) => {
      const fallbackEntry = createDefaultSimulationEntry(page, index, entry?.fundingRole);
      return {
        ...fallbackEntry,
        ...entry,
        fundingRole: entry?.fundingRole || fallbackEntry.fundingRole,
        businessType: entry?.businessType || fallbackEntry.businessType,
        scale: String(entry?.scale ?? fallbackEntry.scale),
        termMonths: String(entry?.termMonths ?? fallbackEntry.termMonths),
      };
    }),
  };
}

function createMinimumSimulationEntries(page = getCurrentPage()) {
  return SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole, index) => createDefaultSimulationEntry(page, index, fundingRole));
}

function ensureMinimumSimulationEntries(page = getCurrentPage(), entries = []) {
  const normalizedEntries = (Array.isArray(entries) ? entries.filter(Boolean) : [])
    .map((entry, index) => normalizeSimulationEntryRole(entry, index));
  const nextEntries = [...normalizedEntries];
  SIMULATION_FUNDING_ROLE_OPTIONS.forEach((fundingRole) => {
    if (!nextEntries.some((entry) => entry.fundingRole === fundingRole)) {
      nextEntries.push(createDefaultSimulationEntry(page, nextEntries.length, fundingRole));
    }
  });
  return nextEntries;
}

function getSimulationVisibleFieldDefs(page = getCurrentPage()) {
  return getSimulationFieldDefs(page).filter((field) => field.name !== "fundingRole");
}

function updateSimulationEntryField(page, entries, entryIndex, fieldName, fieldValue) {
  const nextEntries = ensureMinimumSimulationEntries(page, entries).map((entry) => ({ ...entry }));
  const previousEntry = nextEntries[entryIndex] || createDefaultSimulationEntry(page, entryIndex);
  const nextEntry = {
    ...previousEntry,
    [fieldName]: fieldValue,
  };
  if (fieldName === "fundingRole") {
    const previousDefaultBusinessType = getDefaultSimulationBusinessType(previousEntry.fundingRole);
    const nextDefaultBusinessType = getDefaultSimulationBusinessType(fieldValue);
    if (!nextEntry.businessType || nextEntry.businessType === previousDefaultBusinessType) {
      nextEntry.businessType = nextDefaultBusinessType;
    }
  }
  nextEntries[entryIndex] = nextEntry;
  return nextEntries;
}

function renderSimulationField(field, draft, entryIndex) {
  const value = draft?.[field.name] ?? "";
  if (field.type === "select") {
    return `
      <label class="simulation-form__field">
        <span class="simulation-form__label">${field.label}</span>
        <select class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}">
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
      <input class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}" type="${field.type}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.step ? `step="${field.step}"` : ""} />
    </label>
  `;
}

function normalizeSimulationRecord(page, draft) {
  const normalized = { ...createDefaultSimulationEntry(page), ...draft };
  normalized.fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(normalized.fundingRole) ? normalized.fundingRole : SIMULATION_FUNDING_ROLE_OPTIONS[0];
  normalized.scale = Math.max(1, Number(normalized.scale || 0));
  normalized.termMonths = Math.max(1, Number(normalized.termMonths || 0));
  if (getSimulationMode(page) === "interest") normalized.repricingMonths = String(normalized.repricingMonths || "3");
  return normalized;
}

function getSharedSimulationValue(entries, key, mixedLabel) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  return mixedLabel;
}

function summarizeSimulationValues(entries, key) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (values.length <= 2) return values.join("、");
  return `${values.slice(0, 2).join("、")}等${values.length}项`;
}

function normalizeSimulationScenario(page, draft) {
  const entries = getSimulationDraftEntries(draft, page).map((entry) => normalizeSimulationRecord(page, entry));
  const totalScale = entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
  const weightedTerm = entries.reduce((sum, entry) => sum + Number(entry.termMonths || 0) * Number(entry.scale || 0), 0);
  return {
    simulationType: SIMULATION_MODE_NEW_BUSINESS,
    entries,
    org: getSharedSimulationValue(entries, "org", "多机构"),
    currency: getSharedSimulationValue(entries, "currency", "多币种"),
    fundingRole: getSharedSimulationValue(entries, "fundingRole", "来源/运用组合"),
    businessType: getSharedSimulationValue(entries, "businessType", "组合业务"),
    scale: Number(totalScale.toFixed(1)),
    termMonths: totalScale ? Number((weightedTerm / totalScale).toFixed(1)) : 1,
  };
}

function createDefaultHedgeSimulationDraft() {
  return {
    query: "",
    selectedItemId: "",
    hedgeAmount: "50",
    hedgeTermMonths: "12",
  };
}

function createHedgeSimulationDraftFromScenario(page, scenario) {
  if (scenario?.simulationType !== SIMULATION_MODE_HEDGE) return createDefaultHedgeSimulationDraft(page);
  return {
    query: scenario.hedgeItemId || "",
    selectedItemId: scenario.hedgeItemId || "",
    hedgeAmount: String(scenario.hedgeAmount ?? scenario.scale ?? "50"),
    hedgeTermMonths: String(scenario.hedgeTermMonths ?? scenario.termMonths ?? "12"),
  };
}

function getHedgeSearchResults(draft = appState.hedgeSimulationDraft) {
  const query = String(draft?.query || "").trim().toLowerCase();
  if (!query) return HEDGEABLE_ITEM_OPTIONS.slice(0, 4);
  return HEDGEABLE_ITEM_OPTIONS.filter((item) =>
    [item.id, item.type, item.businessType, item.org, item.currency, item.rateBenchmark]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

function getSelectedHedgeItem(draft = appState.hedgeSimulationDraft) {
  return HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === draft?.selectedItemId) || null;
}

function getHedgeDraft(page = getCurrentPage()) {
  if (!appState.hedgeSimulationDraft) appState.hedgeSimulationDraft = createDefaultHedgeSimulationDraft(page);
  return appState.hedgeSimulationDraft;
}

function normalizeHedgeSimulationScenario(page, draft = createDefaultHedgeSimulationDraft(page)) {
  const selectedItem = getSelectedHedgeItem(draft) || getHedgeSearchResults(draft)[0] || HEDGEABLE_ITEM_OPTIONS[0];
  const hedgeAmount = clampNumber(Number(draft.hedgeAmount || 0), 1, selectedItem.balance);
  const hedgeTermMonths = clampNumber(Number(draft.hedgeTermMonths || selectedItem.remainingTermMonths || 12), 1, 360);
  const hedgeCoverageRatio = Number((hedgeAmount / Math.max(1, Number(selectedItem.balance || 1))).toFixed(4));
  const entry = {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeCoverageRatio,
    fundingRole: getSimulationFundingRoleByBusinessType(selectedItem.businessType),
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
    repricingMonths: selectedItem.repricingMonths || "3",
    rateType: selectedItem.rateType || "浮动利率",
  };
  return {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeAmount,
    hedgeTermMonths,
    hedgeCoverageRatio,
    hedgedItem: selectedItem,
    entries: [entry],
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
  };
}

function renderSimulationSummary(pageId = getCurrentPage()?.id) {
  const simulation = getPageSimulation(pageId);
  if (!simulation) return "";
  if (simulation.simulationType === SIMULATION_MODE_HEDGE) {
    const hedgedItem = simulation.hedgedItem || HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === simulation.hedgeItemId);
    return `
      <div class="simulation-summary">
        <span class="simulation-summary__item">套期交易模拟测算</span>
        <span class="simulation-summary__item">被套期项目：${simulation.hedgeItemId || "-"}</span>
        <span class="simulation-summary__item">类型：${hedgedItem?.type || "-"}</span>
        <span class="simulation-summary__item">币种：${simulation.currency || hedgedItem?.currency || "-"}</span>
        <span class="simulation-summary__item">套期金额：${Number(simulation.hedgeAmount || simulation.scale || 0).toFixed(1)}亿元</span>
        <span class="simulation-summary__item">套期期限：${Number(simulation.hedgeTermMonths || simulation.termMonths || 0).toFixed(0)}个月</span>
        <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}">调整模拟测算</button>
        <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
      </div>
    `;
  }
  const entries = getSimulationEntries(simulation);
  const totalScale = entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
  return `
    <div class="simulation-summary">
      <span class="simulation-summary__item">新业务模拟测算：${entries.length}笔</span>
      <span class="simulation-summary__item">机构：${summarizeSimulationValues(entries, "org")}</span>
      <span class="simulation-summary__item">币种：${summarizeSimulationValues(entries, "currency")}</span>
      <span class="simulation-summary__item">资金方向：${summarizeSimulationValues(entries, "fundingRole")}</span>
      <span class="simulation-summary__item">业务类型：${summarizeSimulationValues(entries, "businessType")}</span>
      <span class="simulation-summary__item">规模合计：${Number(totalScale.toFixed(1))}亿元</span>
      <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}">调整模拟测算</button>
      <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
    </div>
  `;
}

function renderSimulationEntryForm(page, entry, entryIndex, roleEntryIndex, roleEntryCount) {
  return `
    <section class="simulation-entry" data-simulation-entry="${entryIndex}">
      <div class="simulation-entry__header">
        <h4 class="simulation-entry__title">业务 ${roleEntryIndex + 1}</h4>
        ${roleEntryCount > 1 ? `<button class="simulation-entry__remove" type="button" data-remove-simulation-entry="${entryIndex}">删除</button>` : ""}
      </div>
      <div class="simulation-form simulation-form--entry">
        ${getSimulationVisibleFieldDefs(page).map((field) => renderSimulationField(field, entry, entryIndex)).join("")}
      </div>
    </section>
  `;
}

function renderSimulationRoleSection(page, entries, fundingRole) {
  const roleEntries = entries
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entry.fundingRole === fundingRole);
  const roleScale = roleEntries.reduce((sum, item) => sum + Number(item.entry.scale || 0), 0);
  const roleClass = fundingRole === "资金来源" ? "source" : "use";
  return `
    <section class="simulation-role-section simulation-role-section--${roleClass}">
      <div class="simulation-role-section__header">
        <div>
          <h4 class="simulation-role-section__title">${fundingRole}</h4>
          <div class="simulation-role-section__meta">共 ${roleEntries.length} 笔 / 合计 ${Number(roleScale.toFixed(1))} 亿元</div>
        </div>
      </div>
      <div class="simulation-role-section__body">
        ${roleEntries.map((item, roleEntryIndex) =>
          renderSimulationEntryForm(page, item.entry, item.entryIndex, roleEntryIndex, roleEntries.length)
        ).join("")}
      </div>
      <div class="simulation-role-section__actions">
        <button class="toolbar-action" type="button" data-add-simulation-entry="${page.id}" data-simulation-entry-role="${fundingRole}">新增${fundingRole}业务</button>
      </div>
    </section>
  `;
}

function renderSimulationModeTabs(page, activeMode) {
  const tabs = getSimulationModeTabs(page);
  if (tabs.length <= 1) return "";
  return `
    <div class="simulation-mode-tabs" role="tablist" aria-label="模拟测算类型">
      ${tabs.map((tab) => `
        <button
          class="simulation-mode-tab ${tab.mode === activeMode ? "is-active" : ""}${tab.module ? " simulation-mode-tab--module" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.mode === activeMode ? "true" : "false"}"
          ${tab.mode ? `data-simulation-mode-tab="${tab.mode}"` : ""}
          ${tab.module ? `data-simulation-module-link="${tab.module}"` : ""}
        >
          ${tab.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderNewBusinessSimulationPanel(page) {
  const draft = appState.simulationDraft || createDefaultSimulationDraft(page);
  const entries = getSimulationDraftEntries(draft, page);
  return `
    <div class="simulation-entry-list">
      ${SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole) => renderSimulationRoleSection(page, entries, fundingRole)).join("")}
    </div>
  `;
}

function renderHedgeItemInfo(item) {
  if (!item) {
    return `
      <div class="hedge-selected-card hedge-selected-card--empty">
        <div class="hedge-selected-card__title">请选择被套期项目</div>
        <p>输入项目编号、类型、机构、币种或利率基准后，在下方结果中点击编号即可带出基础信息。</p>
      </div>
    `;
  }
  const rows = [
    ["类型", item.type],
    ["业务类型", item.businessType],
    ["机构", item.org],
    ["币种", item.currency],
    ["余额", `${Number(item.balance).toFixed(1)}亿元`],
    ["利率类型", item.rateType],
    ["利率基准", item.rateBenchmark],
    ["票面/执行利率", item.couponRate],
    ["YTM", item.ytm],
    ["修正久期", item.modifiedDuration],
    ["重定价周期", item.repricingCycle],
    ["原始期限", item.originalTerm],
    ["剩余期限", item.remainingTerm],
    ["下一重定价日", item.nextRepricingDate],
  ].filter((row) => row[1]);
  return `
    <div class="hedge-selected-card">
      <div class="hedge-selected-card__title">${item.id}</div>
      <div class="hedge-info-grid">
        ${rows.map(([label, value]) => `
          <div class="hedge-info-grid__item">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHedgeSearchResults(draft, selectedItem) {
  const results = getHedgeSearchResults(draft);
  return `
    <div class="hedge-search-results">
      <div class="hedge-search-results__header">
        <span>可选被套期项目</span>
        <span>共 ${results.length} 条</span>
      </div>
      <div class="hedge-search-results__list">
        ${results.map((item) => `
          <button
            class="hedge-search-result ${selectedItem?.id === item.id ? "is-selected" : ""}"
            type="button"
            data-select-hedge-item="${item.id}"
          >
            <span class="hedge-search-result__id">${item.id}</span>
            <span>${item.type} / ${item.currency} / ${item.rateBenchmark}</span>
            <strong>${Number(item.balance).toFixed(1)}亿元</strong>
          </button>
        `).join("") || `<div class="hedge-search-results__empty">未匹配到项目，请调整编号或关键词。</div>`}
      </div>
    </div>
  `;
}

function renderHedgeSimulationPanel(page) {
  const draft = getHedgeDraft(page);
  const selectedItem = getSelectedHedgeItem(draft);
  const maxAmount = selectedItem?.balance || HEDGEABLE_ITEM_OPTIONS[0]?.balance || 1;
  return `
    <div class="hedge-simulation-panel">
      <div class="hedge-simulation-grid">
        <div class="hedge-input-card">
          <label class="simulation-form__field">
            <span class="simulation-form__label">被套期项目编号</span>
            <input class="simulation-form__control" data-hedge-simulation-field="query" type="search" value="${draft.query || ""}" placeholder="输入项目编号或关键词" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">本次套期金额（亿元）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeAmount" type="number" min="1" max="${maxAmount}" step="1" value="${draft.hedgeAmount || ""}" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">套期期限（月）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeTermMonths" type="number" min="1" max="360" step="1" value="${draft.hedgeTermMonths || selectedItem?.remainingTermMonths || 12}" />
          </label>
        </div>
        ${renderHedgeItemInfo(selectedItem)}
      </div>
      ${renderHedgeSearchResults(draft, selectedItem)}
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
  const activeMode = getSimulationDraftMode(page);
  const activeModeLabel = getSimulationModeLabel(activeMode);
  const applyDisabled = activeMode === SIMULATION_MODE_HEDGE && !getSelectedHedgeItem(getHedgeDraft(page)) ? " disabled" : "";
  simulationModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--wide" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">${activeModeLabel}</div>
          <h3 id="simulationModalTitle">${page.name}模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      ${renderSimulationModeTabs(page, activeMode)}
      ${activeMode === SIMULATION_MODE_HEDGE ? renderHedgeSimulationPanel(page) : renderNewBusinessSimulationPanel(page)}
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}"${applyDisabled}>应用测算</button>
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
  const side = simulation.fundingRole === "资金来源"
    ? "liability"
    : simulation.fundingRole === "资金运用"
      ? "asset"
      : BUSINESS_SIDE_MAP[simulation.businessType] || "asset";
  const scaleWeight = Math.min(1.4, Number(simulation.scale || 0) / 120);
  const tenorWeight = Math.min(1.2, Number(simulation.termMonths || 0) / 24);
  const fxWeight = getSimulationMode(page) === "fx" && !["人民币", "全折人民币"].includes(simulation.currency) ? 1.18 : 1;
  const hedgeWeight = simulation.simulationType === SIMULATION_MODE_HEDGE
    ? clampNumber(Number(simulation.hedgeCoverageRatio || 0.35), 0.08, 1)
    : 1;
  return {
    side,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07) * fxWeight * hedgeWeight).toFixed(3),
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

function getSingleSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const page = data.pages.find((item) => item.id === chartContext.pageId) || getCurrentPage();
  const profile = getSimulationProfile(page, simulation);
  const simulationBehavior = getWidgetSimulationBehavior(widget) || {};
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const simulationModes = SIMULATION_RULE_CONFIG.modes || {};
  const wholesaleLiabilityTypes = SIMULATION_RULE_CONFIG.wholesaleLiabilityTypes || ["同业负债", "发行债券", "中央行借款", "租赁负债", "表外衍生品应付"];
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
    if (simulation.simulationType === SIMULATION_MODE_HEDGE) {
      direction *= -1;
      sensitivity *= Number(simulationDefaults.hedgeSensitivityMultiplier) || 0.68;
    }
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

function getSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const entries = getSimulationEntries(simulation);
  if (!entries.length) return 0;
  const totalScale = entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.scale || 0)), 0);
  const weightedRatio = entries.reduce((sum, entry) => {
    const weight = Math.max(1, Number(entry.scale || 0)) / totalScale;
    return sum + getSingleSimulationAdjustmentRatio(widget, chartContext, entry, seriesLabel, seriesIndex, role) * weight;
  }, 0);
  return clampNumber(
    weightedRatio,
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
  const futureDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + index + 1);
    return {
      date,
      label: `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`,
      fullDate: formatDateValue(date),
    };
  });
  const futureLabels = futureDates.map((item) => item.label);
  const businessMatrix = buildFutureFundingFlowBusinessMatrix(widget, chartContext, futureDates);
  const dailyNet = businessMatrix.rows.map((row) => Number(row.values.reduce((sum, value) => sum + value, 0).toFixed(1)));
  const cumulativeNet = dailyNet.reduce((acc, value) => {
    acc.push(Number(((acc[acc.length - 1] || 0) + value).toFixed(1)));
    return acc;
  }, []);
  return {
    history: { labels: historyLabels, inflow: historyInflow, outflow: historyOutflow },
    future: {
      dates: futureDates,
      labels: futureLabels,
      businessMatrix,
      dailyNet,
      cumulativeNet,
      detailRows: buildFutureFundingFlowDetailRows(widget, chartContext, businessMatrix, dailyNet, cumulativeNet),
    },
  };
}

function getFutureFundingFlowBusinessSelection(chartContext) {
  const selected = (chartContext.filterState["业务类型"] || []).filter(Boolean);
  const all = getMaturityDistributionSeries().map((item) => item.name);
  return selected.length ? selected : all;
}

function buildFutureFundingFlowBusinessMatrix(widget, chartContext, futureDates) {
  const selectedNames = getFutureFundingFlowBusinessSelection(chartContext);
  const series = getMaturityDistributionSeries().filter((item) => selectedNames.includes(item.name));
  const profile = [58, 46, 34, 28, 24, 20, 18, 22, 30, 26, 19, 24, 28, 18, 22, 35, 42, 30, 26, 20, 18, 24, 31, 27, 21, 19, 25, 34, 29, 22];
  return {
    series,
    rows: futureDates.map((dateItem, dateIndex) => ({
      date: dateItem.fullDate,
      label: dateItem.label,
      values: series.map((item, seriesIndex) => {
        const base = profile[dateIndex % profile.length] * (0.34 + ((widget.seq + chartContext.signature + seriesIndex * 7) % 13) / 26);
        const wave = (((dateIndex + 2) * (seriesIndex + 5) + chartContext.signature) % 11) - 5;
        return Number(((base + wave) * item.direction).toFixed(1));
      }),
    })),
  };
}

function buildFutureFundingFlowDetailRows(widget, chartContext, matrix, dailyNet, cumulativeNet) {
  const counterparties = ["战略客户部", "机构资金部", "同业合作户", "集团内部账户", "境外分行资金池", "财政性存款", "大型企业结算户", "债券承销计划"];
  return matrix.rows.flatMap((row, dateIndex) =>
    matrix.series.flatMap((series, seriesIndex) => {
      const value = row.values[seriesIndex] || 0;
      const seed = chartContext.signature + widget.seq * 19 + dateIndex * 37 + seriesIndex * 53;
      const splitCount = 2 + (Math.abs(seed) % 2);
      const totalAmount = Math.abs(value);
      return Array.from({ length: splitCount }, (_, transactionIndex) => {
        const weight = transactionIndex === splitCount - 1 ? 1 : 0.36 + ((seed + transactionIndex * 17) % 18) / 100;
        const preliminaryAmount = transactionIndex === splitCount - 1
          ? totalAmount
          : totalAmount * weight / splitCount;
        const previousAmounts = Array.from({ length: transactionIndex }, (_, previousIndex) => {
          const previousWeight = 0.36 + ((seed + previousIndex * 17) % 18) / 100;
          return totalAmount * previousWeight / splitCount;
        }).reduce((sum, item) => sum + item, 0);
        const amount = transactionIndex === splitCount - 1
          ? Math.max(0.1, totalAmount - previousAmounts)
          : preliminaryAmount;
        return {
          date: row.date,
          businessId: `CF-${String((seed + transactionIndex * 7919) % 900000 + 100000).slice(-6)}`,
          businessType: series.name,
          counterparty: counterparties[(dateIndex + seriesIndex + transactionIndex) % counterparties.length],
          direction: value >= 0 ? "资金流入" : "资金流出",
          amount: Number(amount.toFixed(1)),
          dailyNet: Number(dailyNet[dateIndex].toFixed(1)),
          cumulativeNet: Number(cumulativeNet[dateIndex].toFixed(1)),
        };
      });
    })
  );
}

function renderFutureFundingFlowDetailTable(rows, compact = true, context = {}) {
  const visibleRows = compact ? rows.slice(0, 8) : rows;
  const title = context.title || "业务明细";
  const meta = context.meta || `共 ${rows.length} 笔`;
  return `
    <div class="funding-flow-detail">
      <div class="funding-flow-detail__header">
        <span>${title}</span>
        <span>${meta}</span>
      </div>
      <div class="table-shell funding-flow-detail__table">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>现金流日</th>
              <th>业务编号</th>
              <th>交易对手</th>
              <th>资金方向</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            ${visibleRows.map((row) => `
              <tr>
                <td>${row.date}</td>
                <td>${row.businessId}</td>
                <td>${row.counterparty}</td>
                <td>${row.direction}</td>
                <td>${row.amount.toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getFutureFundingFlowDrilldown(widget, flowState) {
  const widgetKey = String(widget.seq);
  const current = appState.futureFundingFlowDrilldowns?.[widgetKey] || {};
  const hasCurrentDate = flowState.future.businessMatrix.rows.some((row) => row.date === current.date);
  const hasCurrentType = flowState.future.businessMatrix.series.some((series) => series.name === current.businessType);
  if (hasCurrentDate && hasCurrentType) return current;
  const firstRow = flowState.future.businessMatrix.rows[0];
  const firstSeries = flowState.future.businessMatrix.series[0];
  return {
    date: firstRow?.date || "",
    label: firstRow?.label || "",
    businessType: firstSeries?.name || "",
  };
}

function getFutureFundingFlowRowsForDrilldown(flowState, drilldown) {
  if (!drilldown?.date || !drilldown?.businessType) return [];
  return flowState.future.detailRows.filter((row) =>
    row.date === drilldown.date && row.businessType === drilldown.businessType
  );
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
  const matrix = flowState.future.businessMatrix;
  const drilldown = getFutureFundingFlowDrilldown(widget, flowState);
  const drilldownRows = getFutureFundingFlowRowsForDrilldown(flowState, drilldown);
  const allBusinessTypes = getMaturityDistributionSeries().map((item) => item.name);
  const selectedNames = matrix.series.map((item) => item.name);
  const frame = { left: 88, right: 660, top: 24, bottom: 216, width: 572, height: 192 };
  const businessMaxAbs = Math.max(
    80,
    ...matrix.rows.map((row) => Math.max(
      Math.abs(row.values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0)),
      Math.abs(row.values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0))
    ))
  );
  const lineMaxAbs = Math.max(
    20,
    ...flowState.future.dailyNet.map((value) => Math.abs(value)),
    ...flowState.future.cumulativeNet.map((value) => Math.abs(value))
  );
  const roundedBusinessMax = Math.ceil(businessMaxAbs / 50) * 50;
  const roundedLineMax = Math.ceil(lineMaxAbs / 50) * 50;
  const businessScale = (frame.height / 2 - 10) / roundedBusinessMax;
  const lineScale = (frame.height / 2 - 10) / roundedLineMax;
  const zeroY = frame.top + frame.height / 2;
  const toBusinessY = (value) => zeroY - value * businessScale;
  const toLineY = (value) => zeroY - value * lineScale;
  const legendItems = [
    { label: "当日净额", color: SEMANTIC_COLORS.fundingInflow },
    { label: "累计净额", color: SEMANTIC_COLORS.fundingCumulative },
  ];
  const selectedItems = getLegendSelection(widget.seq, "__legend_funding_future__", legendItems.map((item) => item.label));
  const businessTicks = [-roundedBusinessMax, -roundedBusinessMax / 2, 0, roundedBusinessMax / 2, roundedBusinessMax];
  const lineTicks = [-roundedLineMax, -roundedLineMax / 2, 0, roundedLineMax / 2, roundedLineMax];
  const step = frame.width / matrix.rows.length;
  const barWidth = Math.max(7, Math.min(16, step * 0.44));
  const axis = `
    <text x="${frame.left - 60}" y="${frame.top - 6}" class="axis-title">分业务规模(亿元)</text>
    <text x="${frame.right + 2}" y="${frame.top - 6}" class="axis-title">净额(亿元)</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">未来30日</text>
    <line x1="${frame.left}" y1="${zeroY}" x2="${frame.right}" y2="${zeroY}" stroke="rgba(109,165,215,0.42)" stroke-width="1.3"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.2"></line>
    <line x1="${frame.right}" y1="${frame.top}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.26)" stroke-width="1.1"></line>
    ${businessTicks.map((tick) => {
      const y = toBusinessY(tick);
      return `
        <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.12)" stroke-width="1"></line>
        <text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>
      `;
    }).join("")}
    ${lineTicks.map((tick) => {
      const y = toLineY(tick);
      return `<text x="${frame.right + 14}" y="${y + 4}" text-anchor="start" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>`;
    }).join("")}
    ${flowState.future.labels.map((label, index) => {
      if (index % 5 !== 0 && index !== flowState.future.labels.length - 1) return "";
      const x = getFrameXPosition(frame, index, flowState.future.labels.length);
      return `
        <line x1="${x}" y1="${zeroY}" x2="${x}" y2="${zeroY + 5}" stroke="rgba(109,165,215,0.26)" stroke-width="1"></line>
        <text x="${x}" y="${frame.bottom + 18}" text-anchor="middle" class="axis-label axis-label--x">${label}</text>
      `;
    }).join("")}
  `;
  const barsMarkup = matrix.rows.map((row, rowIndex) => {
    const x = frame.left + step * rowIndex + (step - barWidth) / 2;
    let positiveOffset = 0;
    let negativeOffset = 0;
    return row.values.map((value, valueIndex) => {
      const businessType = matrix.series[valueIndex].name;
      const isActive = drilldown.date === row.date && drilldown.businessType === businessType;
      const height = Math.abs(value) * businessScale;
      const color = getPaletteColor(businessType, allBusinessTypes, allBusinessTypes.indexOf(businessType), "bar");
      const attrs = `
        class="future-funding-flow-segment ${isActive ? "is-active" : ""}"
        data-future-funding-flow-cell="true"
        data-widget-seq="${widget.seq}"
        data-date="${row.date}"
        data-label="${row.label}"
        data-business-type="${businessType}"
        tabindex="0"
      `;
      if (value >= 0) {
        const y = zeroY - positiveOffset - height;
        positiveOffset += height;
        return `<rect ${attrs} x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5" fill="${color}" opacity="0.84"></rect>`;
      }
      const y = zeroY + negativeOffset;
      negativeOffset += height;
      return `<rect ${attrs} x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5" fill="${color}" opacity="0.64"></rect>`;
    }).join("");
  }).join("");
  const renderLine = (label, values, color, strokeWidth = 3.2) => {
    if (!selectedItems.includes(label)) return "";
    const points = values.map((value, index) => ({
      x: getFrameXPosition(frame, index, flowState.future.labels.length),
      y: toLineY(value),
    }));
    return `
      <polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.4" fill="${color}" stroke="#ffffff" stroke-width="1.6"></circle>`).join("")}
    `;
  };
  return `
    <div class="chart-shell chart-shell--funding-flow chart-shell--future-funding-flow">
      <div class="future-funding-flow-layout">
        <div class="future-funding-flow-chart">
          <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            ${axis}
            ${barsMarkup}
            ${renderLine("当日净额", flowState.future.dailyNet, SEMANTIC_COLORS.fundingInflow, 3)}
            ${renderLine("累计净额", flowState.future.cumulativeNet, SEMANTIC_COLORS.fundingCumulative, 3.4)}
          </svg>
          ${renderFundingFlowLegend(widget.seq, "__legend_funding_future__", legendItems)}
          ${renderMaturityDistributionLegend(widget, selectedNames)}
        </div>
        <aside class="future-funding-flow-detail">
          ${renderFutureFundingFlowDetailTable(drilldownRows, true, {
            title: `${drilldown.businessType || "业务"}资金流明细`,
            meta: `${drilldown.date || "-"} | 共 ${drilldownRows.length} 笔`,
          })}
        </aside>
      </div>
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
      ${renderFutureFundingFlowDetailTable(flowState.future.detailRows, false)}
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
  appState.activeBlockId = null;
  render();
});

blockPillsEl.addEventListener("click", (event) => {
  const filterToggle = event.target.closest("[data-filter-toggle]");
  if (filterToggle) {
    const { ownerType, ownerId, filterName } = filterToggle.dataset;
    const key = buildFilterKey(ownerType, ownerId, filterName);
    appState.openFilterKey = appState.openFilterKey === key ? null : key;
    render();
    return;
  }

  const openSimulationButton = event.target.closest("[data-open-simulation]");
  if (openSimulationButton) {
    const pageId = openSimulationButton.dataset.openSimulation || getCurrentPage()?.id;
    openSimulationModal(pageId);
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
  const repricingMaturityCell = event.target.closest("[data-repricing-maturity-cell]");
  if (repricingMaturityCell) {
    const { widgetSeq, bucket, bucketIndex, businessType } = repricingMaturityCell.dataset;
    appState.repricingMaturityDrilldowns = {
      ...appState.repricingMaturityDrilldowns,
      [widgetSeq]: {
        bucket,
        bucketIndex: Number(bucketIndex || 0),
        businessType,
      },
    };
    render();
    return;
  }

  const futureFundingFlowCell = event.target.closest("[data-future-funding-flow-cell]");
  if (futureFundingFlowCell) {
    const { widgetSeq, date, label, businessType } = futureFundingFlowCell.dataset;
    appState.futureFundingFlowDrilldowns = {
      ...appState.futureFundingFlowDrilldowns,
      [widgetSeq]: {
        date,
        label,
        businessType,
      },
    };
    render();
    return;
  }

  const liquidityPoint = event.target.closest("[data-liquidity-point]");
  if (liquidityPoint) {
    appState.liquidityMetricPointPopover = {
      widgetSeq: Number(liquidityPoint.dataset.widgetSeq || 0),
      kind: liquidityPoint.dataset.liquidityKind || "",
      dateIndex: Number(liquidityPoint.dataset.dateIndex || 0),
      labels: String(liquidityPoint.dataset.liquidityLabels || "").split("||").filter(Boolean),
      signature: Number(liquidityPoint.dataset.liquiditySignature || 0),
    };
    render();
    return;
  }

  const openLiquidityProcessButton = event.target.closest("[data-open-liquidity-process]");
  if (openLiquidityProcessButton) {
    const sourceState = appState.liquidityMetricPointPopover || {};
    appState.liquidityProcessModal = {
      widgetSeq: Number(openLiquidityProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 42),
      kind: openLiquidityProcessButton.dataset.liquidityKind || sourceState.kind || "",
      dateIndex: Number(openLiquidityProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openLiquidityProcessButton.dataset.liquidityLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openLiquidityProcessButton.dataset.liquiditySignature || sourceState.signature || 0),
      activeNode: "ratio",
      numeratorExpanded: false,
    };
    render();
    return;
  }

  const repricingGapPoint = event.target.closest("[data-repricing-gap-point]");
  if (repricingGapPoint) {
    appState.repricingGapPointPopover = {
      widgetSeq: Number(repricingGapPoint.dataset.widgetSeq || 0),
      sourceSeq: Number(repricingGapPoint.dataset.sourceWidgetSeq || repricingGapPoint.dataset.widgetSeq || 9),
      dateIndex: Number(repricingGapPoint.dataset.dateIndex || 0),
      labels: String(repricingGapPoint.dataset.repricingGapLabels || "").split("||").filter(Boolean),
      signature: Number(repricingGapPoint.dataset.repricingGapSignature || 0),
    };
    render();
    return;
  }

  const openRepricingGapProcessButton = event.target.closest("[data-open-repricing-gap-process]");
  if (openRepricingGapProcessButton) {
    const sourceState = appState.repricingGapPointPopover || {};
    appState.repricingGapProcessModal = {
      widgetSeq: Number(openRepricingGapProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 0),
      sourceSeq: Number(openRepricingGapProcessButton.dataset.sourceWidgetSeq || sourceState.sourceSeq || 9),
      dateIndex: Number(openRepricingGapProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openRepricingGapProcessButton.dataset.repricingGapLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openRepricingGapProcessButton.dataset.repricingGapSignature || sourceState.signature || 0),
      activeNode: "ratio",
      numeratorExpanded: false,
    };
    render();
    return;
  }

  const evePoint = event.target.closest("[data-eve-point]");
  if (evePoint) {
    appState.evePointPopover = {
      widgetSeq: Number(evePoint.dataset.widgetSeq || EVE_RATIO_WIDGET_SEQ),
      dateIndex: Number(evePoint.dataset.dateIndex || 0),
      labels: String(evePoint.dataset.eveLabels || "").split("||").filter(Boolean),
      signature: Number(evePoint.dataset.eveSignature || 0),
    };
    render();
    return;
  }

  const openEveProcessButton = event.target.closest("[data-open-eve-process]");
  if (openEveProcessButton) {
    const sourceState = appState.evePointPopover || {};
    appState.eveProcessModal = {
      widgetSeq: Number(openEveProcessButton.dataset.widgetSeq || sourceState.widgetSeq || EVE_RATIO_WIDGET_SEQ),
      dateIndex: Number(openEveProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openEveProcessButton.dataset.eveLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openEveProcessButton.dataset.eveSignature || sourceState.signature || 0),
      activeNode: "eve",
      numeratorExpanded: false,
      denominatorExpanded: false,
    };
    render();
    return;
  }

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

  const maturityStructureTab = event.target.closest("[data-maturity-structure-tab]");
  if (maturityStructureTab) {
    const { maturityStructureTab: widgetSeq, maturityStructureScope } = maturityStructureTab.dataset;
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      __maturity_structure_scope__: [maturityStructureScope === "future" ? "future" : "historical"],
    };
    render();
    return;
  }

  const openBusinessDetailButton = event.target.closest("[data-open-business-detail]");
  if (openBusinessDetailButton) {
    const { targetWidgetSeq, sourceWidgetSeq, businessType, businessCategory, maturityTableScope } = openBusinessDetailButton.dataset;
    if (!targetWidgetSeq || !businessType) return;
    appState.businessDrilldowns = {
      ...appState.businessDrilldowns,
      [targetWidgetSeq]: {
        businessType,
        category: businessCategory,
        sourceWidgetSeq: Number(sourceWidgetSeq),
        maturityTableScope: maturityTableScope || "",
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
    openSimulationModal(pageId);
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
    if (ownerType === "page") appState.pageFilters[ownerId] = stateBucket;
    else if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
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
  const nextRange = normalizeWidgetBusinessStructureDateRange(widgetSeq, widgetState[filterName], null, filterName);
  nextRange[Number(rangeIndex)] = dateField.value || nextRange[Number(rangeIndex)];
  if (rangeIndex === "0" && nextRange[0] > nextRange[1]) nextRange[1] = nextRange[0];
  if (rangeIndex === "1" && nextRange[1] < nextRange[0]) nextRange[0] = nextRange[1];
  appState.widgetFilters[widgetSeq] = {
    ...widgetState,
    [filterName]: normalizeWidgetBusinessStructureDateRange(widgetSeq, nextRange, Number(rangeIndex), filterName),
  };
  render();
});

simulationModalEl.addEventListener("input", (event) => {
  const field = event.target.closest("[data-simulation-field]");
  if (field) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const entryIndex = Number(field.dataset.simulationEntryIndex || 0);
    appState.simulationDraft = {
      entries: updateSimulationEntryField(page, entries, entryIndex, field.dataset.simulationField, field.value),
    };
    return;
  }
  const hedgeField = event.target.closest("[data-hedge-simulation-field]");
  if (!hedgeField) return;
  appState.hedgeSimulationDraft = {
    ...getHedgeDraft(),
    [hedgeField.dataset.hedgeSimulationField]: hedgeField.value,
  };
  if (hedgeField.dataset.hedgeSimulationField === "query") {
    window.setTimeout(renderSimulationModal, 0);
  }
});

simulationModalEl.addEventListener("change", (event) => {
  const field = event.target.closest("[data-simulation-field]");
  if (field) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const entryIndex = Number(field.dataset.simulationEntryIndex || 0);
    appState.simulationDraft = {
      entries: updateSimulationEntryField(page, entries, entryIndex, field.dataset.simulationField, field.value),
    };
    if (["fundingRole", "scale"].includes(field.dataset.simulationField)) window.setTimeout(renderSimulationModal, 0);
    return;
  }
  const hedgeField = event.target.closest("[data-hedge-simulation-field]");
  if (!hedgeField) return;
  appState.hedgeSimulationDraft = {
    ...getHedgeDraft(),
    [hedgeField.dataset.hedgeSimulationField]: hedgeField.value,
  };
  if (hedgeField.dataset.hedgeSimulationField === "query") {
    window.setTimeout(renderSimulationModal, 0);
  }
});

simulationModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='simulationModal']");
  if (closeButton) {
    closeSimulationModal();
    render();
    return;
  }
  const moduleLink = event.target.closest("[data-simulation-module-link]");
  if (moduleLink) {
    window.dispatchEvent(new CustomEvent("risk-dashboard:simulation-module-request", {
      detail: {
        module: moduleLink.dataset.simulationModuleLink,
        pageId: appState.simulationModalPageId,
      },
    }));
    return;
  }
  const modeTab = event.target.closest("[data-simulation-mode-tab]");
  if (modeTab) {
    appState.simulationDraftMode = modeTab.dataset.simulationModeTab;
    renderSimulationModal();
    return;
  }
  const selectHedgeItemButton = event.target.closest("[data-select-hedge-item]");
  if (selectHedgeItemButton) {
    const selectedItem = HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === selectHedgeItemButton.dataset.selectHedgeItem);
    if (!selectedItem) return;
    const draft = getHedgeDraft();
    const hedgeAmount = clampNumber(Number(draft.hedgeAmount || Math.min(50, selectedItem.balance)), 1, selectedItem.balance);
    appState.hedgeSimulationDraft = {
      ...draft,
      query: selectedItem.id,
      selectedItemId: selectedItem.id,
      hedgeAmount: String(hedgeAmount),
      hedgeTermMonths: String(draft.hedgeTermMonths || selectedItem.remainingTermMonths || 12),
    };
    renderSimulationModal();
    return;
  }
  const addEntryButton = event.target.closest("[data-add-simulation-entry]");
  if (addEntryButton) {
    const page = data.pages.find((item) => item.id === addEntryButton.dataset.addSimulationEntry) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const fundingRole = addEntryButton.dataset.simulationEntryRole || getDefaultSimulationFundingRole(entries.length);
    appState.simulationDraft = { entries: [...entries, createDefaultSimulationEntry(page, entries.length, fundingRole)] };
    renderSimulationModal();
    return;
  }
  const removeEntryButton = event.target.closest("[data-remove-simulation-entry]");
  if (removeEntryButton) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const removeIndex = Number(removeEntryButton.dataset.removeSimulationEntry);
    const entries = getSimulationDraftEntries(appState.simulationDraft, page).filter((_, index) => index !== removeIndex);
    appState.simulationDraft = { entries: ensureMinimumSimulationEntries(page, entries) };
    renderSimulationModal();
    return;
  }
  const applyButton = event.target.closest("[data-apply-simulation]");
  if (applyButton) {
    const page = data.pages.find((item) => item.id === applyButton.dataset.applySimulation) || getCurrentPage();
    appState.pageSimulations[page.id] = getSimulationDraftMode(page) === SIMULATION_MODE_HEDGE
      ? normalizeHedgeSimulationScenario(page, getHedgeDraft(page))
      : normalizeSimulationScenario(page, appState.simulationDraft || createDefaultSimulationDraft(page));
    closeSimulationModal();
    render();
  }
});

insightModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='insightModal']");
  if (!closeButton) return;
  appState.insightWidgetSeq = null;
  render();
});

eveProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-eve-process-date-slider]");
  if (!slider || !appState.eveProcessModal) return;
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    dateIndex: Number(slider.value || 0),
  };
  renderEveProcessModal();
});

eveProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='eveProcessModal']");
  if (closeButton) {
    appState.eveProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-eve-process-node]");
  if (!nodeButton || !appState.eveProcessModal) return;
  const nodeKey = nodeButton.dataset.eveProcessNode;
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.eveProcessModal.numeratorExpanded || nodeKey === "numerator",
    denominatorExpanded: appState.eveProcessModal.denominatorExpanded || nodeKey === "denominator",
  };
  renderEveProcessModal();
});

liquidityProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-liquidity-process-date-slider]");
  if (!slider || !appState.liquidityProcessModal) return;
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    dateIndex: Number(slider.value || 0),
  };
  renderLiquidityProcessModal();
});

liquidityProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='liquidityProcessModal']");
  if (closeButton) {
    appState.liquidityProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-liquidity-process-node]");
  if (!nodeButton || !appState.liquidityProcessModal) return;
  const nodeKey = nodeButton.dataset.liquidityProcessNode;
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.liquidityProcessModal.numeratorExpanded || nodeKey === "numerator",
  };
  renderLiquidityProcessModal();
});

repricingGapProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-repricing-gap-process-date-slider]");
  if (!slider || !appState.repricingGapProcessModal) return;
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    dateIndex: Number(slider.value || 0),
  };
  renderRepricingGapProcessModal();
});

repricingGapProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='repricingGapProcessModal']");
  if (closeButton) {
    appState.repricingGapProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-repricing-gap-process-node]");
  if (!nodeButton || !appState.repricingGapProcessModal) return;
  const nodeKey = nodeButton.dataset.repricingGapProcessNode;
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.repricingGapProcessModal.numeratorExpanded || nodeKey === "numerator",
  };
  renderRepricingGapProcessModal();
});

processSparklinePreviewEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-process-sparkline]");
  if (!closeButton) return;
  appState.processSparklinePreview = null;
  renderProcessSparklinePreview();
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
    if (ownerType === "page") appState.pageFilters[ownerId] = stateBucket;
    else if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
    else appState.areaFilters[ownerId] = stateBucket;
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (appState.processSparklinePreview) {
      appState.processSparklinePreview = null;
      renderProcessSparklinePreview();
      return;
    }
    if (appState.repricingGapProcessModal) {
      appState.repricingGapProcessModal = null;
      render();
      return;
    }
    if (appState.liquidityProcessModal) {
      appState.liquidityProcessModal = null;
      render();
      return;
    }
    if (appState.eveProcessModal) {
      appState.eveProcessModal = null;
      render();
      return;
    }
    if (appState.simulationModalPageId) {
      closeSimulationModal();
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
