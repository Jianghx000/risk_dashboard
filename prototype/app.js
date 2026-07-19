const data = window.dashboardData;
const config = window.dashboardConfig || {};
const mockAdapter = window.dashboardMockAdapter || {};
const FILTER_OPTIONS = config.filters?.options || config.filterOptions || {};
const FILTER_PRESET_CONFIG = config.filters?.presets || {};
const AREA_FILTER_OPTION_OVERRIDES = config.filters?.areaOverrides || {};
const DEFAULT_FILTER_VALUES = config.filters?.defaults || config.defaultFilters || {};
const PAGE_SHARED_FILTER_LABELS = ["机构", "币种"];
const PAGE_SHARED_FILTER_NAMES = new Set(["机构", "币种"]);
const SINGLE_SELECT_FILTER_NAMES = new Set(config.filters?.singleSelect || ["机构", "币种"]);
const PAGE_BEHAVIOR_CONFIG = config.pageBehavior || {};
const LAYOUT_RULE_CONFIG = config.layoutRules || {};
const WIDGET_BEHAVIOR_CONFIG = config.widgetBehavior || {};
const WIDGET_FILTER_CONFIG = config.widgetFilters || {};
const WIDGET_FILTER_PRESET_CONFIG = config.widgetFilterPresets || {};
const SERIES_RULE_CONFIG = config.seriesRules || {};
const VISUAL_RULE_CONFIG = config.visualRules || {};
const SIMULATION_RULE_CONFIG = config.simulationRules || {};
const TABLE_TEMPLATE_CONFIG = config.tableTemplates || {};
const MANAGEMENT_LIMIT_CONFIG = Array.isArray(config.managementLimits) ? config.managementLimits : [];
const DOMAIN_CONFIG = window.dashboardDomainConfig || {};
const BUSINESS_DURATION_OPTIONS = DOMAIN_CONFIG.businessDurationOptions || WIDGET_FILTER_PRESET_CONFIG.businessTypeLegend?.options || FILTER_OPTIONS["\u4e1a\u52a1\u7c7b\u578b"] || [];
const LIQUIDITY_GAP_TENOR_OPTIONS = DOMAIN_CONFIG.liquidityGapTenorOptions || ["1D", "7D", "30D", "3M", "1Y"];
const FOREIGN_BRANCH_ORGANIZATIONS = DOMAIN_CONFIG.foreignBranchOrganizations || [];
const DEFAULT_SERIES_DIMENSION_ORDER = Array.isArray(SERIES_RULE_CONFIG.dimensionOrder) ? SERIES_RULE_CONFIG.dimensionOrder : [];
const DEFAULT_SERIES_LABEL_MAP = SERIES_RULE_CONFIG.labelMap || {};
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
const RATE_TYPE_OPTIONS = DOMAIN_CONFIG.rateTypeOptions || [];
const FUTURE_MATURITY_MONTH_COUNT = Number(DOMAIN_CONFIG.futureMaturityMonthCount) || 6;
const SIMULATION_FUNDING_ROLE_OPTIONS = DOMAIN_CONFIG.simulationFundingRoleOptions || [];
const SIMULATION_MODE_NEW_BUSINESS = DOMAIN_CONFIG.simulationModes?.newBusiness || "newBusiness";
const SIMULATION_MODE_HEDGE = DOMAIN_CONFIG.simulationModes?.hedge || "hedge";
const SIMULATION_MODULE_NET_INTEREST_INCOME = DOMAIN_CONFIG.simulationModes?.netInterestIncome || "netInterestIncome";
const SIMULATION_MODULE_LIQUIDITY_STRESS = DOMAIN_CONFIG.simulationModes?.liquidityStress || "liquidityStress";
const EVE_RATIO_WIDGET_SEQ = Number(DOMAIN_CONFIG.eveRatioWidgetSeq) || 1;
const EVE_SCENARIO_DEFINITIONS = DOMAIN_CONFIG.eveScenarioDefinitions || [];
const EVE_COLOR_PRIMARY = DOMAIN_CONFIG.eveColors?.primary || "#4289EE";
const EVE_COLOR_WORST = DOMAIN_CONFIG.eveColors?.worst || "#C86F43";
const DOMAIN_OPTION_LISTS = {
  businessDurationOptions: DOMAIN_CONFIG.businessDurationOptions || [],
  businessTypeDefaultValues: DOMAIN_CONFIG.businessTypeDefaultValues || [],
  liquidityBusinessTypes: DOMAIN_CONFIG.liquidityBusinessTypes || [],
  liquidityBusinessTypeDefaultValues: DOMAIN_CONFIG.liquidityBusinessTypeDefaultValues || [],
  liquidityGapTenorOptions: DOMAIN_CONFIG.liquidityGapTenorOptions || [],
  rateTypeOptions: DOMAIN_CONFIG.rateTypeOptions || [],
  simulationFundingRoleOptions: DOMAIN_CONFIG.simulationFundingRoleOptions || [],
};
const BUSINESS_SIDE_MAP = DOMAIN_CONFIG.businessSideMap || {};
const REPRICING_GAP_BUSINESS_GROUPS = DOMAIN_CONFIG.repricingGapBusinessGroups || { assets: [], liabilities: [] };
const SIMULATION_DEFAULT_BUSINESS_TYPES = DOMAIN_CONFIG.simulationDefaultBusinessTypes || {};
const WHOLESALE_LIABILITY_TYPES = DOMAIN_CONFIG.wholesaleLiabilityTypes || [];
const HEDGEABLE_ITEM_OPTIONS = DOMAIN_CONFIG.hedgeableItemOptions || [];
const BUSINESS_STRUCTURE_GROUPS = DOMAIN_CONFIG.businessStructureGroups || [];
const BUSINESS_ANALYSIS_PERSPECTIVES = DOMAIN_CONFIG.businessAnalysisPerspectives || {};
const BUSINESS_DETAIL_SCOPE_META = DOMAIN_CONFIG.businessDetailScopeMeta || {};

const appState = {
  currentPageId: data.pages[0]?.id || null,
  pageFilters: {},
  pageAnalysisPerspectives: {},
  areaFilters: {},
  widgetFilters: {},
  widgetDisplayModes: {},
  openFilterKey: null,
  globalStartDate: null,
  globalEndDate: null,
  businessStartDate: null,
  businessEndDate: null,
  pageSimulations: {},
  simulationModalPageId: null,
  simulationModalWidgetSeq: null,
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
  repricingDurationGapPointPopover: null,
  repricingDurationGapProcessModal: null,
  processSparklinePreview: null,
  repricingMaturityDrilldowns: {},
  futureFundingFlowDrilldowns: {},
  businessDrilldowns: {},
  businessMethodologyModal: null,
};

const pageTabsEl = document.getElementById("pageTabs");
const dashboardViewEl = document.getElementById("dashboardView");
const globalFilterBarEl = document.getElementById("globalFilterBar");
const filterPopoverEl = document.getElementById("filterModal");
const globalEndInputEl = document.getElementById("globalEndDate");
const riskDateControlsEl = document.getElementById("riskDateControls");
const businessDateControlsEl = document.getElementById("businessDateControls");
const businessEndInputEl = document.getElementById("businessEndDate");
const simulationModalEl = ensureOverlayRoot("simulationModal");
const insightModalEl = ensureOverlayRoot("insightModal");
const eveProcessModalEl = ensureOverlayRoot("eveProcessModal");
const liquidityProcessModalEl = ensureOverlayRoot("liquidityProcessModal");
const repricingGapProcessModalEl = ensureOverlayRoot("repricingGapProcessModal");
const repricingDurationGapProcessModalEl = ensureOverlayRoot("repricingDurationGapProcessModal");
const processSparklinePreviewEl = ensureOverlayRoot("processSparklinePreview");
const businessMethodologyModalEl = ensureOverlayRoot("businessMethodologyModal");

function render() {
  ensureGlobalDateRange();
  renderPageDateRangeControl();
  renderPageTabs();
  renderCurrentPage();
  renderFilterPopover();
  renderSimulationModal();
  renderInsightModal();
  renderEveProcessModal();
  renderLiquidityProcessModal();
  renderRepricingGapProcessModal();
  renderRepricingDurationGapProcessModal();
  renderProcessSparklinePreview();
  renderBusinessChangeMethodologyModal();
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

function getActiveAnalysisPerspective(page = getCurrentPage()) {
  const behavior = getPageBehavior(page);
  const options = Array.isArray(behavior.analysisPerspectiveOptions) ? behavior.analysisPerspectiveOptions : [];
  if (!behavior.analysisPerspective || !options.length) return "";
  const selected = appState.pageAnalysisPerspectives[page.id];
  return options.includes(selected) ? selected : behavior.analysisPerspective;
}

function getBusinessAnalysisPerspectiveDefinition(perspective = getActiveAnalysisPerspective()) {
  const fallback = {
    label: "利率风险",
    businessTypes: BUSINESS_DURATION_OPTIONS,
    defaultBusinessTypes: DOMAIN_CONFIG.businessTypeDefaultValues || [],
    groups: BUSINESS_STRUCTURE_GROUPS,
    sideMap: BUSINESS_SIDE_MAP,
    sideLabels: { asset: "资产", liability: "负债" },
    totalCategories: ["生息资产", "付息负债"],
    totalRowLabels: {},
    balanceMetricLabels: ["资产规模", "负债规模", "资产增速", "负债增速"],
    cashFlowDirectionMap: {},
    structureMetricColumns: [],
    structureMetricColumnsByScope: {},
    widgetTitles: {},
  };
  const definition = BUSINESS_ANALYSIS_PERSPECTIVES[perspective] || BUSINESS_ANALYSIS_PERSPECTIVES.interestBalanceStructure;
  if (!definition) return fallback;
  const resolveDomainValue = (valueKey, refKey, defaultValue) => {
    if (definition[valueKey] != null) return definition[valueKey];
    const refName = definition[refKey];
    return refName && DOMAIN_CONFIG[refName] != null ? DOMAIN_CONFIG[refName] : defaultValue;
  };
  return {
    ...fallback,
    ...definition,
    businessTypes: resolveDomainValue("businessTypes", "businessTypesRef", fallback.businessTypes),
    defaultBusinessTypes: resolveDomainValue("defaultBusinessTypes", "defaultBusinessTypesRef", fallback.defaultBusinessTypes),
    groups: resolveDomainValue("groups", "groupsRef", fallback.groups),
    sideMap: resolveDomainValue("sideMap", "sideMapRef", fallback.sideMap),
  };
}

function renderPageAnalysisPerspectiveSwitch(page = getCurrentPage()) {
  const behavior = getPageBehavior(page);
  const options = Array.isArray(behavior.analysisPerspectiveOptions) ? behavior.analysisPerspectiveOptions : [];
  if (!behavior.analysisPerspective || options.length < 2) return "";
  const activePerspective = getActiveAnalysisPerspective(page);
  return `
    <div class="page-analysis-perspective" aria-label="业务变动分析视角">
      <span class="page-analysis-perspective__label">分析视角</span>
      <div class="page-analysis-perspective__group" role="tablist" aria-label="业务变动分析视角">
        ${options.map((perspective) => {
          const definition = getBusinessAnalysisPerspectiveDefinition(perspective);
          const isActive = perspective === activePerspective;
          return `
            <button
              class="page-analysis-perspective__btn ${isActive ? "is-active" : ""}"
              type="button"
              role="tab"
              aria-selected="${isActive}"
              data-analysis-perspective="${perspective}"
              data-page-id="${page.id}"
            >${definition.label}</button>
          `;
        }).join("")}
      </div>
    </div>
  `;
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

  globalFilterBarEl.innerHTML = `
    <div class="page-shared-filterbar">
      <div class="filter-panel filter-panel--inline page-shared-filterbar__filters">
        ${renderPageSharedFilters(page)}
      </div>
    </div>
  `;

  dashboardViewEl.innerHTML = renderFlatDashboardPage(page);
}

function ensurePageFilterState(page = getCurrentPage()) {
  if (!page?.id) return {};
  if (!appState.pageFilters[page.id]) appState.pageFilters[page.id] = {};
  PAGE_SHARED_FILTER_LABELS.forEach((filterLabel) => {
    const name = normalizeFilterName(filterLabel);
    const optionValues = FILTER_OPTIONS[name] || ["默认口径"];
    const currentValues = (appState.pageFilters[page.id][name] || []).filter((value) => optionValues.includes(value));
    if (currentValues.length) {
      appState.pageFilters[page.id][name] = isSingleSelectFilter(name) ? currentValues.slice(0, 1) : currentValues;
      return;
    }
    appState.pageFilters[page.id][name] = getDefaultFilterValues(name, optionValues);
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
  const businessSections = [];
  const isBusinessAnalysisPage = page?.id === "business-change";
  const analysisPerspectiveSwitch = renderPageAnalysisPerspectiveSwitch(page);
  (page?.blocks || []).forEach((block) => {
    groupBlockAreas(block).forEach((areaGroup) => {
      const areaCards = [];
      const baseAreaState = ensureAreaFilterState(areaGroup);
      const areaState = applyPageSharedFiltersToState(cloneFilterState(baseAreaState), page);
      areaGroup.viewGroups.forEach((viewGroup) => {
        const viewScopedState = applyPageSharedFiltersToState(
          cloneFilterState(areaState),
          page
        );
        const sharedContextControls = renderFlatWidgetContextControls(areaGroup, areaState);
        (viewGroup.widgets || [])
          .flatMap((widget) => getFlatRenderableWidgets(widget))
          .forEach((widget) => {
            const cardOptions = {
              contextControls: sharedContextControls,
              flatMode: true,
              widgetStateOverride: widget.__forcedFrequency ? { 频率: [widget.__forcedFrequency] } : null,
              hiddenLocalFilterNames: widget.__forcedFrequency ? ["频率"] : [],
            };
            areaCards.push(renderWidgetCard(areaGroup, widget, viewScopedState, cardOptions));
          });
      });
      if (isBusinessAnalysisPage && areaCards.length) {
        businessSections.push({
          id: areaGroup.viewGroups[0]?.id || areaGroup.id,
          name: areaGroup.name,
          cards: areaCards,
        });
      } else {
        cards.push(...areaCards);
      }
    });
  });
  const dashboardContent = isBusinessAnalysisPage
    ? `
      <div class="business-analysis-sections">
        ${businessSections.map((section) => `
          <section class="business-analysis-section" data-business-section="${section.id}" aria-labelledby="${section.id}-title">
            <header class="business-analysis-section__header">
              <h2 id="${section.id}-title">${section.name}</h2>
            </header>
            <div class="flat-dashboard-grid business-analysis-section__grid">
              ${section.cards.join("")}
            </div>
          </section>
        `).join("")}
      </div>
    `
    : `
      <section class="flat-dashboard-grid">
        ${cards.join("")}
      </section>
    `;
  return `
    ${analysisPerspectiveSwitch ? `<div class="business-analysis-viewbar">${analysisPerspectiveSwitch}</div>` : ""}
    ${dashboardContent}
  `;
}

function getFlatRenderableWidgets(widget) {
  if (shouldOmitStandaloneWidget(widget)) return [];
  return [widget];
}

function shouldOmitStandaloneWidget(widget) {
  return isSourceOnlyWidget(widget);
}

function cloneFilterState(source = {}) {
  return Object.keys(source || {}).reduce((next, key) => {
    next[key] = [...(source[key] || [])];
    return next;
  }, {});
}

function renderFlatWidgetContextControls(areaGroup, areaState) {
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
  if (!filterGroups) return "";
  return `
    <div class="flat-widget-controls">
      <div class="filter-panel filter-panel--inline flat-widget-controls__filters">${filterGroups}</div>
    </div>
  `;
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
    <div class="filter-group filter-group--dropdown ${isSingleSelectFilter(name) ? "filter-group--single" : ""} ${isOpen ? "is-open" : ""}">
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
  const isSingleSelect = isSingleSelectFilter(filterName);

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
      <div class="filter-popover__options" ${isSingleSelect ? 'role="radiogroup"' : ""}>
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
                ${isSingleSelect ? `role="radio" aria-checked="${selectedValues.includes(option)}"` : ""}
              >
                <span class="filter-option__check">${selectedValues.includes(option) ? (isSingleSelect ? "●" : "✓") : ""}</span>
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
  const methodologyButton = renderBusinessChangeMethodologyButton(widget);
  const simulationButton = renderWidgetSimulationButton(widget);
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
          ${methodologyButton}
          ${renderMaturityStructureHeaderTabs(widget)}
          ${options.contextControls || ""}
          ${widgetHeaderTabs}
        </div>
        <div class="widget-card__actions">
          ${simulationButton}
          ${insightButton}
          ${modeSwitch}
        </div>
      </div>
      ${widgetLocalFilters}
      ${renderWidgetSimulationSummary(widget)}
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
  const chartRenderer = getDashboardChartRenderer(chartKind);
  if (behavior.tableKind) return renderTable(widget, chartContext);
  if (chartRenderer) return chartRenderer(widget, chartContext);
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
  const analysisPerspective = getActiveAnalysisPerspective();
  if (analysisPerspective) normalizedState.__analysisPerspective = [analysisPerspective];

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
    analysisPerspective,
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

  if (configuredBehavior.chartKind === "businessScaleGrowth" && localFilterMap.has("业务类型")) {
    const perspective = getBusinessAnalysisPerspectiveDefinition();
    localFilterMap.set("业务类型", {
      ...localFilterMap.get("业务类型"),
      options: [...(perspective.businessTypes || [])],
      defaultValues: [...(perspective.defaultBusinessTypes || [])],
    });
  }

  return {
    ...configuredBehavior,
    localFilters: Array.from(localFilterMap.values()),
    suppressSeriesFilters: Array.from(suppressSeriesFilters),
    enableSeriesFilters: Array.from(enableSeriesFilters),
  };
}

function renderWidgetLocalFilters(widgetBehavior, widgetState, widgetSeq, hiddenFilterNames = []) {
  const hiddenSet = new Set(hiddenFilterNames);
  const visibleFilters = widgetBehavior.localFilters.filter((filter) => {
    if (hiddenSet.has(filter.name)) return false;
    if (widgetBehavior.caliberFilterTenor && filter.name === "口径") {
      const selectedTenor = (widgetState["期限长度"] || filter.defaultValues || []).find((value) =>
        LIQUIDITY_GAP_TENOR_OPTIONS.includes(value)
      );
      return (selectedTenor || widgetBehavior.caliberFilterTenor) === widgetBehavior.caliberFilterTenor;
    }
    if (filter.renderMode === "legend") return false;
    if (filter.type === "dateRange" && widgetBehavior.showDateFilter) return false;
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

function renderTable(widget, chartContext) {
  const tableKind = getConfiguredWidgetBehavior(widget).tableKind;
  const tableRenderer = getDashboardTableRenderer(tableKind);
  if (tableRenderer) {
    return applyTableTemplateClasses(widget, tableRenderer(widget, chartContext), getWidgetTableTemplateKey(widget, "compact"));
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

function renderDataView(widget, chartContext) {
  const type = widget.componentType || "";
  const behavior = getConfiguredWidgetBehavior(widget);
  const tableRenderer = getDashboardTableRenderer(behavior.tableKind);
  const dataRenderer = getDashboardDataRenderer(behavior.chartKind);
  if (tableRenderer) {
    return applyTableTemplateClasses(widget, tableRenderer(widget, chartContext), getWidgetTableTemplateKey(widget, "compact"));
  }
  if (isLiquidityDiagnosticRatioWidget(widget)) {
    return applyTableTemplateClasses(widget, renderLiquidityDiagnosticRatioDataTable(widget, chartContext), getWidgetTableTemplateKey(widget, "timeSeries"));
  }
  if (dataRenderer) {
    return applyTableTemplateClasses(widget, dataRenderer(widget, chartContext), getWidgetTableTemplateKey(widget, "timeSeries"));
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

function renderDualAxis(frame, xLabels, leftLabel, rightLabel, leftMax, rightMax, options = {}) {
  const leftMin = Number.isFinite(Number(options.leftMin)) ? Number(options.leftMin) : 0;
  const rightMin = Number.isFinite(Number(options.rightMin)) ? Number(options.rightMin) : 0;
  const buildRangeTicks = (minValue, maxValue) => Array.from({ length: 5 }, (_, index) =>
    Number((minValue + ((maxValue - minValue) * index) / 4).toFixed(2))
  );
  const leftTicks = leftMin === 0 ? buildAxisTicks(leftMax) : buildRangeTicks(leftMin, leftMax);
  const rightTicks = rightMin === 0 ? buildAxisTicks(rightMax) : buildRangeTicks(rightMin, rightMax);
  const leftRange = Math.max(0.0001, leftMax - leftMin);
  const rightRange = Math.max(0.0001, rightMax - rightMin);
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
      const y = frame.bottom - (frame.height * (tick - leftMin)) / leftRange;
      return `<line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.14)" stroke-width="1"></line>`;
    })
    .join("");
  const leftTickMarkup = leftTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * (tick - leftMin)) / leftRange;
      return `<text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>`;
    })
    .join("");
  const rightTickMarkup = rightTicks
    .map((tick) => {
      const y = frame.bottom - (frame.height * (tick - rightMin)) / rightRange;
      return `<text x="${frame.right + 14}" y="${y + 4}" text-anchor="start" class="axis-label axis-label--y">${formatAxisTickValue(tick)}</text>`;
    })
    .join("");
  const zeroY = leftMin < 0 && leftMax > 0
    ? frame.bottom - (frame.height * (0 - leftMin)) / leftRange
    : frame.bottom;
  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">${leftLabel}</text>
    <text x="${frame.right - 4}" y="${frame.top - 6}" text-anchor="end" class="axis-title">${rightLabel}</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${inferXAxisTitle(xLabels)}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    ${leftMin < 0 && leftMax > 0 ? `<line x1="${frame.left}" y1="${zeroY}" x2="${frame.right}" y2="${zeroY}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>` : ""}
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.right}" y1="${frame.top}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.32)" stroke-width="1.2"></line>
    ${gridMarkup}
    ${leftTickMarkup}
    ${rightTickMarkup}
    ${xTickMarkup}
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
  appState.globalStartDate = defaultStartDate;
  if (!appState.globalEndDate) appState.globalEndDate = defaultEndDate;
  if (appState.globalEndDate > defaultEndDate) appState.globalEndDate = defaultEndDate;
  if (appState.globalEndDate < defaultStartDate) appState.globalEndDate = defaultStartDate;
}

function renderGlobalDateRangeControl() {
  if (!globalEndInputEl) return;
  const defaultEndDate = getDefaultGlobalEndDate();
  globalEndInputEl.min = appState.globalStartDate || getDefaultGlobalStartDate();
  globalEndInputEl.max = defaultEndDate;
  globalEndInputEl.value = appState.globalEndDate || defaultEndDate;
}

function usesIndependentMonthEndDateRange(page = getCurrentPage()) {
  return getPageBehavior(page).dateRangeMode === "independentMonthEnd";
}

function renderPageDateRangeControl() {
  const usesBusinessRange = usesIndependentMonthEndDateRange();
  if (riskDateControlsEl) riskDateControlsEl.hidden = usesBusinessRange;
  if (businessDateControlsEl) businessDateControlsEl.hidden = !usesBusinessRange;
  if (usesBusinessRange && typeof renderBusinessAnalysisDateRangeControl === "function") {
    renderBusinessAnalysisDateRangeControl();
    return;
  }
  renderGlobalDateRangeControl();
}

function getCurrentPageDateRange() {
  if (usesIndependentMonthEndDateRange() && isDateValue(appState.businessStartDate) && isDateValue(appState.businessEndDate)) {
    return [appState.businessStartDate, appState.businessEndDate];
  }
  return [appState.globalStartDate, appState.globalEndDate];
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

function isDateValue(value) {
  return Boolean(parseDateValue(value));
}

function applyGlobalDateRangeToLabels(widget, labels, filterState = {}) {
  if (isMaturityTrendWidget(widget)) {
    return applyMaturityTrendDateRangeToLabels(widget, labels, filterState);
  }
  const [rangeStart, rangeEnd] = getCurrentPageDateRange();
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

function getManagementLimitConfigs(widget) {
  const widgetSeq = Number(widget?.sourceSeq || widget?.seq);
  return MANAGEMENT_LIMIT_CONFIG.filter((item) =>
    Array.isArray(item.widgetSeqs) && item.widgetSeqs.includes(widgetSeq)
  );
}

function getSelectedOrganizations(chartContext) {
  const selected = (chartContext?.filterState?.机构 || DEFAULT_FILTER_VALUES.机构 || []).filter(Boolean);
  return selected.length ? selected : (FILTER_OPTIONS.机构 || []).slice(0, 1);
}

function getSelectedCurrencies(chartContext) {
  const selected = (chartContext?.filterState?.币种 || DEFAULT_FILTER_VALUES.币种 || []).filter(Boolean);
  return selected.length ? selected : (FILTER_OPTIONS.币种 || []).slice(0, 1);
}

function shortenOrgLabel(name) {
  return String(name || "").replace("汇总", "").replace("分行", "");
}

function matchesManagementLimitFilters(entry, filterState = {}) {
  const filters = entry?.filters && typeof entry.filters === "object" ? entry.filters : {};
  return Object.entries(filters).every(([filterName, expectedValue]) => {
    const selectedValues = (filterState[filterName] || []).filter(Boolean);
    const expectedValues = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
    return selectedValues.length === 1 && expectedValues.includes(selectedValues[0]);
  });
}

function getMatchingManagementLimits(widget, chartContext, options = {}) {
  const orgs = getSelectedOrganizations(chartContext);
  const currencies = getSelectedCurrencies(chartContext);
  if (orgs.length !== 1 || !currencies.length) return [];
  const [organization] = orgs;
  return getManagementLimitConfigs(widget)
    .filter((item) => !options.metricKey || item.metricKey === options.metricKey)
    .flatMap((item) => (Array.isArray(item.entries) ? item.entries : []).map((entry) => ({
      ...entry,
      indicator: item.indicator,
      metricKey: item.metricKey || "",
    })))
    .filter((entry) =>
      entry.organization === organization
      && currencies.includes(entry.currency)
      && matchesManagementLimitFilters(entry, chartContext?.filterState || {})
    );
}

function formatManagementLimitNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return Number.isInteger(numericValue) ? numericValue.toFixed(0) : numericValue.toFixed(1).replace(/\.0$/, "");
}

function formatManagementLimitLabel(entry, options = {}) {
  const filterSuffix = entry?.filters?.口径 ? ` / ${entry.filters.口径}` : "";
  const scopeLabel = `${shortenOrgLabel(entry?.organization)} / ${entry?.currency}${filterSuffix}`;
  const indicatorLabel = options.includeIndicator ? `${entry?.indicator} ` : "";
  return `${scopeLabel} ${indicatorLabel}限额 ${entry?.operator || ""}${formatManagementLimitNumber(entry?.value)}${entry?.unit || ""}`;
}

function getCurrencyAmountUnit(chartContext) {
  const currencies = getSelectedCurrencies(chartContext);
  if (currencies.length !== 1) return "亿元";
  const currency = currencies[0];
  if (["全折美元", "外币折美元", "美元"].includes(currency)) return "亿美元";
  if (["全折欧元", "欧元"].includes(currency)) return "亿欧元";
  if (currency === "港币") return "亿港币";
  if (currency === "澳元") return "亿澳元";
  if (currency === "新加坡元") return "亿新加坡元";
  if (currency === "英镑") return "亿英镑";
  if (currency === "日元") return "亿日元";
  return "亿元";
}

function getManagementLimitColor(entry, chartContext, fallbackIndex = 0) {
  const currencies = getSelectedCurrencies(chartContext);
  const currencyIndex = currencies.indexOf(entry?.currency);
  const index = currencyIndex >= 0 ? currencyIndex : fallbackIndex;
  return getPaletteColor(entry?.currency || `limit-${index}`, currencies, index, "line");
}

function renderManagementLimitLegend(widget, chartContext, options = {}) {
  const matchedLimits = getMatchingManagementLimits(widget, chartContext, options);
  if (!matchedLimits.length) return "";
  return `
    <div class="chart-legend chart-legend--limits" aria-label="管理限额">
      ${matchedLimits.map((entry, index) => `
        <span class="chart-legend__item chart-legend__item--limit">
          <i class="chart-legend__limit-line" style="border-color:${getManagementLimitColor(entry, chartContext, index)}"></i>
          ${formatManagementLimitLabel(entry, options)}
        </span>
      `).join("")}
    </div>
  `;
}

function renderManagementLimitOverlay(widget, chartContext, frame, options = {}) {
  const matchedLimits = getMatchingManagementLimits(widget, chartContext, options);
  if (!matchedLimits.length) return "";
  const minValue = Number.isFinite(Number(options.minValue)) ? Number(options.minValue) : 0;
  const maxValue = Number.isFinite(Number(options.maxValue)) ? Number(options.maxValue) : 100;
  const valueRange = Math.max(0.0001, maxValue - minValue);
  const showInlineLabels = matchedLimits.length === 1 || options.showInlineLabelsForMultiple;
  const lines = matchedLimits
    .map((entry, index) => {
      const value = Number(entry.value);
      if (!Number.isFinite(value)) return null;
      const y = Number((frame.bottom - (frame.height * (value - minValue)) / valueRange).toFixed(1));
      const label = formatManagementLimitLabel(entry, options);
      const topRightLabel = options.labelPlacement === "topRight";
      const labelY = topRightLabel
        ? frame.top + 16 + index * 16
        : Math.max(frame.top + 14, Math.min(frame.bottom - 8, y - 8 - (index % 2) * 12));
      return {
        y,
        color: getManagementLimitColor(entry, chartContext, index),
        label,
        labelY,
        labelX: topRightLabel ? frame.right - 8 : frame.left + 8,
        textAnchor: topRightLabel ? "end" : "start",
      };
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return lines
    .map(
      (line) => `
        <line x1="${frame.left}" y1="${line.y}" x2="${frame.right}" y2="${line.y}" stroke="${hexToRgba(line.color, 0.8)}" stroke-width="2" stroke-dasharray="8 6"></line>
        ${showInlineLabels ? `<text x="${line.labelX}" y="${line.labelY}" text-anchor="${line.textAnchor}" class="axis-title axis-title--minor" fill="${line.color}" stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${line.label}</text>` : ""}
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
  const [selectedStartDate, selectedEndDate] = getCurrentPageDateRange();
  const rangeStart = parseDateValue(selectedStartDate || getDefaultGlobalStartDate());
  const rangeEnd = parseDateValue(selectedEndDate || getDefaultGlobalEndDate());
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
      state[name] = getDefaultFilterValues(name, optionValues);
    });
    appState.areaFilters[areaGroup.id] = state;
  }
  return appState.areaFilters[areaGroup.id];
}

function getPageBehavior(page = getCurrentPage()) {
  if (!page?.name) return {};
  return PAGE_BEHAVIOR_CONFIG[page.name] || {};
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
    return isSingleSelectFilter(filterName) ? configuredDefaults.slice(0, 1) : [...configuredDefaults];
  }
  return options.slice(0, 1);
}

function isSingleSelectFilter(filterName) {
  return SINGLE_SELECT_FILTER_NAMES.has(normalizeFilterName(filterName));
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

function getWidgetTableTemplateKey(widget, fallbackKey = "compact") {
  const behavior = getConfiguredWidgetBehavior(widget);
  if (behavior.tableTemplate) return behavior.tableTemplate;
  if (behavior.tableKind === "businessStructure") return "businessStructure";
  if (behavior.tableKind === "businessDetail") return "businessDetail";
  if (behavior.chartKind === "futureFundingFlow") return "compact";
  if (behavior.chartKind === "businessScaleGrowth" || behavior.chartKind === "balanceScaleGrowth") return "timeSeries";
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
    const groupKey = area.groupKey || area.name;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        id: `${block.id}-group-${index + 1}`,
        groupKey,
        name: area.name,
        sharedFilters: [],
        viewGroups: [],
      });
    }
    const target = grouped.get(groupKey);
    target.sharedFilters = uniqueList([...target.sharedFilters, ...resolveAreaSharedFilters(area)]);
    target.viewGroups.push({
      id: area.id,
      widgets: area.widgets,
    });
  });
  return Array.from(grouped.values());
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

function isSourceOnlyWidget(widget) {
  return widget?.renderRole === "sourceOnly";
}

function isLiquidityDiagnosticRatioWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "liquidityDiagnosticRatio";
}

function isNiiVolatilityWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "niiVolatility";
}

function isDonutWidget(widget) {
  return getConfiguredWidgetBehavior(widget).chartKind === "donut";
}

function getWidgetDisplayTitle(widget) {
  if (widget?.displayTitle) return widget.displayTitle;
  const behavior = getConfiguredWidgetBehavior(widget);
  const perspectiveTitle = getBusinessAnalysisPerspectiveDefinition().widgetTitles?.[String(widget?.sourceSeq || widget?.seq)];
  if (perspectiveTitle) return perspectiveTitle;
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

function resolveDomainOptionList(ref) {
  if (!ref) return [];
  const values = DOMAIN_OPTION_LISTS[ref] || DOMAIN_CONFIG[ref] || [];
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function resolveFilterEntryOptions(entry) {
  const next = { ...entry };
  if (!Array.isArray(next.options) && next.optionsRef) {
    next.options = resolveDomainOptionList(next.optionsRef);
  }
  if (!Array.isArray(next.defaultValues) && next.defaultValuesRef) {
    next.defaultValues = resolveDomainOptionList(next.defaultValuesRef);
  }
  delete next.optionsRef;
  delete next.defaultValuesRef;
  return next;
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
      .map((preset) => resolveFilterEntryOptions(preset));
    if (presetRefs.length && Object.keys(entry).every((key) => key === "presetRef" || key === "presetRefs")) {
      return expanded;
    }
    const mergedEntry = { ...entry };
    delete mergedEntry.presetRef;
    delete mergedEntry.presetRefs;
    return [...expanded, resolveFilterEntryOptions(mergedEntry)];
  });
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

function getCurrentPage() {
  return data.pages.find((page) => page.id === appState.currentPageId);
}

function buildSeries(seed, count, frame, modifier) {
  const rawValues = buildMetricValues(seed, count, modifier);
  return rawValues.map((raw, index) => {
    const x = getFrameXPosition(frame, index, count);
    const y = frame.bottom - (frame.height * raw) / 100;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
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

