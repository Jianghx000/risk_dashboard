/* Diagnostic process charts and drilldown modals. */

const REPRICING_GAP_COLOR = "#4289EE";

function getDiagnosticFilterState(pageId, chartContextOrState = {}) {
  if (chartContextOrState.filterState) return chartContextOrState.filterState;
  return appState?.pageFilters?.[pageId] || {};
}

function getDiagnosticOrganizations(pageId, chartContextOrState = {}) {
  const filterState = getDiagnosticFilterState(pageId, chartContextOrState);
  const organizations = (filterState.机构 || []).filter(Boolean);
  return organizations.length ? organizations : ["法人汇总"];
}

function isOverseasCapitalScope(organizations = []) {
  return organizations.length > 0 && organizations.every((organization) =>
    organization === "境外分行汇总" || FOREIGN_BRANCH_ORGANIZATIONS.includes(organization)
  );
}

function isSingleForeignBranchScope(organizations = []) {
  return organizations.length === 1 && FOREIGN_BRANCH_ORGANIZATIONS.includes(organizations[0]);
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
          role="button"
          tabindex="0"
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
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-label="最大经济价值变动比例走势，数据点可查看计算过程">
        ${axis}
        ${managementLimitOverlay}
        <polyline fill="none" stroke="${EVE_COLOR_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${pointMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: ["△EVE"], allSeriesList: ["△EVE"] })}
      ${renderManagementLimitLegend(widget, chartContext)}
    </div>
  `;
}

function renderEvePointPopover(widget, model, point, frame, index) {
  const ratio = model.ratios[index];
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  return `
    <div class="eve-point-popover eve-point-popover--compact" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__grid eve-point-popover__grid--compact">
        <div><span>日期</span><strong>${model.displayLabels[index]}</strong></div>
        <div><span>取值</span><strong>${formatEvePercent(ratio)}</strong></div>
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
  const filterState = getDiagnosticFilterState("interest-risk", chartContextOrState);
  const organizations = getDiagnosticOrganizations("interest-risk", chartContextOrState);
  const usesOverseasAllocatedCapital = isOverseasCapitalScope(organizations);
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || EVE_RATIO_WIDGET_SEQ, filterState));
  const count = labels.length;
  const normalizedOffset = signature % 17;
  const legalRwa = Array.from({ length: count }, (_, index) => Number((8200 + normalizedOffset * 4 + index * 34).toFixed(1)));
  const overseasRwa = Array.from({ length: count }, (_, index) => Number((858 + normalizedOffset * 0.8 + index * 7.6).toFixed(1)));
  const legalTierOne = Array.from({ length: count }, (_, index) => Number((4860 + normalizedOffset * 5 + index * 26).toFixed(1)));
  const overseasAllocatedCapital = overseasRwa.map((value, index) => (legalRwa[index]
    ? (value / legalRwa[index]) * legalTierOne[index]
    : 0));
  const capital = usesOverseasAllocatedCapital ? overseasAllocatedCapital : [...legalTierOne];
  const scenarios = EVE_SCENARIO_DEFINITIONS.map((scenario, scenarioIndex) => {
    const values = Array.from({ length: count }, (_, index) => {
      const wave = Math.sin((index + scenarioIndex + normalizedOffset / 5) / 1.8) * scenario.wave;
      const seasonal = ((index + scenarioIndex * 3 + normalizedOffset) % 5) * 1.4;
      return Number((-1 * (scenario.base + index * scenario.slope + wave + seasonal)).toFixed(1));
    });
    return { ...scenario, values };
  });
  const worstScenarios = labels.map((_, index) => {
    const scenario = scenarios.reduce((worst, current) => {
      const currentLoss = -current.values[index];
      const worstLoss = -worst.values[index];
      return currentLoss > worstLoss ? current : worst;
    }, scenarios[0]);
    return {
      key: scenario.key,
      name: scenario.name,
      value: scenario.values[index],
      loss: -scenario.values[index],
    };
  });
  const numerator = worstScenarios.map((scenario) => scenario.loss);
  // 归因始终使用数据层原始精度；页面展示时再由 formatEvePercent 统一四舍五入。
  const ratios = numerator.map((value, index) => (capital[index] ? (value / capital[index]) * 100 : 0));
  return {
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    limit: 28,
    legalRwa,
    overseasRwa,
    legalTierOne,
    overseasAllocatedCapital,
    capital,
    organizations,
    usesOverseasAllocatedCapital,
    denominatorTitle: "本外币合计一级资本净额",
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

function getProcessComparisonIndex(state = {}, selectedIndex = 0, labelCount = 0) {
  const explicitIndex = state.comparisonIndex;
  if (
    Number.isInteger(explicitIndex)
    && explicitIndex >= 0
    && explicitIndex < selectedIndex
    && explicitIndex < labelCount
  ) {
    return explicitIndex;
  }
  return selectedIndex > 0 ? selectedIndex - 1 : -1;
}

function renderProcessDateContext(displayLabels, comparisonIndex, selectedIndex) {
  const comparisonLabel = comparisonIndex >= 0 ? displayLabels[comparisonIndex] : "无可用基期";
  return `
    <div class="eve-process-context eve-process-context--date-range">
      <div class="eve-process-date eve-process-date--comparison">
        <span>比较基期</span>
        <strong>${comparisonLabel}</strong>
      </div>
      <div class="eve-process-date eve-process-date--current">
        <span>当前日期</span>
        <strong>${displayLabels[selectedIndex] || "--"}</strong>
      </div>
    </div>
  `;
}

function renderProcessDualDateSlider(displayLabels, comparisonIndex, selectedIndex) {
  const lastIndex = Math.max(0, displayLabels.length - 1);
  const hasComparison = comparisonIndex >= 0 && comparisonIndex < selectedIndex;
  const safeComparisonIndex = hasComparison ? comparisonIndex : 0;
  const denominator = Math.max(1, lastIndex);
  const comparisonPosition = Number(((safeComparisonIndex / denominator) * 100).toFixed(4));
  const currentPosition = Number(((selectedIndex / denominator) * 100).toFixed(4));
  return `
    <div
      class="eve-process-dual-slider"
      style="--comparison-position:${comparisonPosition}%;--current-position:${currentPosition}%;"
      data-process-date-range="true"
    >
      <div class="eve-process-dual-slider__rail" aria-hidden="true">
        <span class="eve-process-dual-slider__period"></span>
      </div>
      <input
        class="eve-process-dual-slider__input eve-process-dual-slider__input--comparison"
        type="range"
        min="0"
        max="${lastIndex}"
        step="1"
        value="${safeComparisonIndex}"
        aria-label="选择比较基期"
        aria-valuetext="${hasComparison ? displayLabels[safeComparisonIndex] : "无可用基期"}"
        data-process-date-slider="comparison"
        ${hasComparison ? "" : "disabled"}
      >
      <input
        class="eve-process-dual-slider__input eve-process-dual-slider__input--current"
        type="range"
        min="0"
        max="${lastIndex}"
        step="1"
        value="${selectedIndex}"
        aria-label="选择当前日期"
        aria-valuetext="${displayLabels[selectedIndex] || "--"}"
        data-process-date-slider="current"
        ${lastIndex > 0 ? "" : "disabled"}
      >
    </div>
    <div class="eve-process-slider__axis">
      ${displayLabels.map((label, index) => {
        const shouldShow = shouldShowProcessAxisLabel(displayLabels, index);
        const tickPosition = Number(((index / denominator) * 100).toFixed(4));
        const markerClass = index === safeComparisonIndex && hasComparison
          ? "is-comparison"
          : index === selectedIndex
            ? "is-current"
            : "";
        const edgeClass = index === 0 ? "is-first" : index === lastIndex ? "is-last" : "";
        return `<span class="${[shouldShow ? "" : "is-muted", markerClass, edgeClass].filter(Boolean).join(" ")}" style="left:${tickPosition}%">${shouldShow ? label : ""}</span>`;
      }).join("")}
    </div>
  `;
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
    filterState: getDiagnosticFilterState("interest-risk"),
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const comparisonIndex = getProcessComparisonIndex(state, selectedIndex, model.labels.length);
  const activeNode = state.activeNode || "eve";
  const worst = model.worstScenarios[selectedIndex];
  const impactMap = buildEveProcessImpactMap(model, selectedIndex, comparisonIndex);

  eveProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="eveProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="eveProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="eveProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="eveProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        ${renderProcessDateContext(model.displayLabels, comparisonIndex, selectedIndex)}
        <div class="eve-process-slider">
          ${renderProcessDualDateSlider(model.displayLabels, comparisonIndex, selectedIndex)}
          <div class="eve-process-formula">△EVE = 六情景最大经济价值损失 ÷ ${model.denominatorTitle}</div>
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
              comparisonIndex,
              activeNode,
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
              impact: impactMap.eve,
              nodeKind: "result",
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: "六情景最大经济价值损失",
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator,
                selectedIndex,
                comparisonIndex,
                activeNode,
                isWorst: true,
                actionText: state.numeratorExpanded ? "点击收回" : "点击展开",
                valueFormat: "amount",
                labels: model.displayLabels,
                impact: impactMap.numerator,
              })}
              <div class="eve-process-division eve-process-division--quotient">÷</div>
              ${renderEveProcessNode({
                key: "denominator",
                title: model.denominatorTitle,
                value: formatEveAmount(model.capital[selectedIndex]),
                series: model.capital,
                selectedIndex,
                comparisonIndex,
                activeNode,
                actionText: model.usesOverseasAllocatedCapital
                  ? (state.denominatorExpanded ? "点击收回" : "点击展开")
                  : "",
                valueFormat: "amount",
                labels: model.displayLabels,
                impact: impactMap.denominator,
              })}
            </div>
            <div class="eve-process-connector" aria-hidden="true"></div>
            <div class="eve-process-expansions">
              <div class="eve-process-expansion-slot">
                ${state.numeratorExpanded
                  ? renderEveScenarioExpansion(model, selectedIndex, comparisonIndex, activeNode, worst, impactMap)
                  : ""}
              </div>
              <div class="eve-process-expansion-slot">
                ${model.usesOverseasAllocatedCapital && state.denominatorExpanded
                  ? renderEveDenominatorExpansion(model, selectedIndex, comparisonIndex, activeNode, impactMap)
                  : ""}
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
  comparisonIndex = selectedIndex - 1,
  activeNode,
  isWorst = false,
  actionText = "",
  dataAttribute = "data-eve-process-node",
  changeType = "rate",
  valueFormat = "amount",
  labels = [],
  impact = null,
  impactType = "pct",
  showImpact = true,
  nodeKind = "factor",
  comparisonSeries = null,
}) {
  const changeValues = Array.isArray(comparisonSeries) ? comparisonSeries : series;
  const change = formatProcessNodeChange(changeValues, selectedIndex, comparisonIndex, changeType);
  const delta = formatProcessNodeDelta(changeValues, selectedIndex, comparisonIndex, valueFormat);
  const growth = formatProcessNodeGrowth(changeValues, selectedIndex, comparisonIndex);
  const impactDisplay = formatProcessNodeImpact(impact, impactType);
  const isResultNode = nodeKind === "result";
  const shouldShowImpact = !isResultNode && showImpact;
  const previewPayload = encodeProcessPreviewPayload({
    title,
    labels,
    values: series,
    selectedIndex,
    comparisonIndex,
    color: isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY,
    valueFormat,
  });
  return `
    <article class="eve-process-node eve-process-node--${nodeKind} ${activeNode === key ? "is-active" : ""} ${isWorst ? "is-worst" : ""}" ${dataAttribute}="${key}">
      <button class="eve-process-node__select" type="button" aria-label="选择${title}">
        <span class="eve-process-node__top">
          <span class="eve-process-node__title"><strong>${title}</strong></span>
          <span class="eve-process-node__metric">
            <span class="eve-process-node__value">${value}</span>
            <span class="eve-process-node__comparisons">
              ${isResultNode
                ? `<span class="eve-process-node__change ${change.className}">${change.text}</span>`
                : `
                  <span class="eve-process-node__change eve-process-node__delta ${delta.className}">${delta.text}</span>
                  <span class="eve-process-node__change eve-process-node__growth ${growth.className}">${growth.text}</span>
                  ${shouldShowImpact ? `<span class="eve-process-node__impact ${impactDisplay.className}">${impactDisplay.text}</span>` : ""}
                `}
            </span>
          </span>
        </span>
      </button>
      <button
        class="eve-process-sparkline"
        type="button"
        aria-label="放大${title}趋势"
        title="点击放大趋势"
        data-process-sparkline="true"
        data-process-preview="${previewPayload}"
      >${renderEveSparkline(series, selectedIndex, comparisonIndex, isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY)}</button>
      ${actionText ? `<button class="eve-process-node__action" type="button">${actionText}</button>` : ""}
    </article>
  `;
}

function renderEveScenarioExpansion(model, selectedIndex, comparisonIndex, activeNode, worst, impactMap = {}) {
  const attribution = impactMap.scenarioAttribution;
  return `
    <div class="eve-process-expansion">
      <div class="eve-process-expansion__formula">
        六情景最大经济价值损失 = MAX（${model.scenarios.map((scenario) => `-${scenario.name}`).join("，")}） = -MIN（六情景经济价值变动）
      </div>
      <div class="eve-process-scenario-strip eve-process-scenario-strip--horizontal">
        ${model.scenarios.map((scenario) => {
          const isWorst = scenario.key === (attribution?.currentWorstKey || worst.key);
          return renderEveProcessNode({
            key: `scenario:${scenario.key}`,
            title: scenario.name,
            note: "监管利率情景",
            value: formatEveAmount(scenario.values[selectedIndex]),
            series: scenario.values,
            selectedIndex,
            comparisonIndex,
            activeNode,
            isWorst,
            valueFormat: "amount",
            labels: model.displayLabels,
            impact: impactMap[`scenario:${scenario.key}`],
          }).replace('<article class="eve-process-node', '<article class="eve-process-node eve-process-node--compact');
        }).join("")}
      </div>
    </div>
  `;
}

function renderEveDenominatorExpansion(model, selectedIndex, comparisonIndex, activeNode, impactMap = {}) {
  return `
    <div class="eve-process-expansion">
      <div class="eve-process-expansion__formula">
        ${model.denominatorTitle} = 境外分行RWA ÷ 法人RWA × 法人本外币合计一级资本净额
      </div>
      <div class="eve-process-capital-strip">
        ${renderEveProcessNode({
          key: "overseas-rwa",
          title: "境外分行RWA",
          note: "分摊权重分子",
          value: formatEveRwa(model.overseasRwa[selectedIndex]),
          series: model.overseasRwa,
          selectedIndex,
          comparisonIndex,
          activeNode,
          valueFormat: "amount0",
          labels: model.displayLabels,
          impact: impactMap["overseas-rwa"],
        })}
        <span class="eve-process-mini-operator">÷</span>
        ${renderEveProcessNode({
          key: "legal-rwa",
          title: "法人RWA",
          note: "分摊权重分母",
          value: formatEveRwa(model.legalRwa[selectedIndex]),
          series: model.legalRwa,
          selectedIndex,
          comparisonIndex,
          activeNode,
          valueFormat: "amount0",
          labels: model.displayLabels,
          impact: impactMap["legal-rwa"],
        })}
        <span class="eve-process-mini-operator">×</span>
        ${renderEveProcessNode({
          key: "legal-tier-one",
          title: "法人本外币合计一级资本净额",
          note: "资本分摊基数",
          value: formatEveAmount(model.legalTierOne[selectedIndex]),
          series: model.legalTierOne,
          selectedIndex,
          comparisonIndex,
          activeNode,
          valueFormat: "amount",
          labels: model.displayLabels,
          impact: impactMap["legal-tier-one"],
        })}
      </div>
    </div>
  `;
}

function formatProcessNodeChange(values = [], selectedIndex = 0, comparisonIndex = selectedIndex - 1, changeType = "rate") {
  const current = Number(values?.[selectedIndex]);
  const baseline = Number(values?.[comparisonIndex]);
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || comparisonIndex < 0) {
    return { text: "较基期 --", className: "is-flat" };
  }
  if (changeType === "delta") {
    const delta = Number((current - baseline).toFixed(1));
    return {
      text: `较基期 ${formatSignedNumber(delta)}pct`,
      className: getChangeClass(delta),
    };
  }
  if (changeType === "delta2") {
    const delta = Number((current - baseline).toFixed(2));
    return {
      text: `较基期 ${formatSignedNumber(delta, 2)}pct`,
      className: getChangeClass(delta),
    };
  }
  if (changeType === "amountDelta") {
    const delta = Number((current - baseline).toFixed(1));
    return {
      text: `较基期 ${formatSignedNumber(delta)}亿`,
      className: getChangeClass(delta),
    };
  }
  if (changeType === "durationDelta") {
    const delta = Number((current - baseline).toFixed(2));
    return {
      text: `较基期 ${formatSignedNumber(delta, 2)}年`,
      className: getChangeClass(delta),
    };
  }
  if (baseline === 0) return { text: "较基期 --", className: "is-flat" };
  const rate = Number((((current - baseline) / Math.abs(baseline)) * 100).toFixed(1));
  return {
    text: `较基期 ${formatSignedNumber(rate)}%`,
    className: getChangeClass(rate),
  };
}

function formatProcessNodeDelta(values = [], selectedIndex = 0, comparisonIndex = selectedIndex - 1, valueFormat = "amount") {
  const current = Number(values?.[selectedIndex]);
  const baseline = Number(values?.[comparisonIndex]);
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || comparisonIndex < 0) {
    return { text: "增量 --", className: "is-flat" };
  }
  const delta = current - baseline;
  const formatConfig = {
    amount: { digits: 1, unit: "亿" },
    amount0: { digits: 0, unit: "亿" },
    percent: { digits: 1, unit: "pct" },
    duration: { digits: 2, unit: "年" },
    number: { digits: 2, unit: "" },
  }[valueFormat] || { digits: 1, unit: "" };
  const rounded = Number(delta.toFixed(formatConfig.digits));
  return {
    text: `增量 ${formatSignedNumber(rounded, formatConfig.digits)}${formatConfig.unit}`,
    className: getChangeClass(rounded),
  };
}

function formatProcessNodeGrowth(values = [], selectedIndex = 0, comparisonIndex = selectedIndex - 1) {
  const current = Number(values?.[selectedIndex]);
  const baseline = Number(values?.[comparisonIndex]);
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || comparisonIndex < 0 || baseline === 0) {
    return { text: "增速 --", className: "is-flat" };
  }
  const growth = Number((((current - baseline) / Math.abs(baseline)) * 100).toFixed(1));
  return {
    text: `增速 ${formatSignedNumber(growth)}%`,
    className: getChangeClass(growth),
  };
}

function formatProcessNodeImpact(value, impactType = "pct") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return { text: "影响 --", className: "is-flat" };
  }
  const numeric = Number(value);
  if (impactType === "amount") {
    const rounded = Number(numeric.toFixed(1));
    return {
      text: `影响 ${formatSignedNumber(rounded)}亿`,
      className: getChangeClass(rounded),
    };
  }
  if (impactType === "number") {
    const rounded = Number(numeric.toFixed(2));
    return {
      text: `影响 ${formatSignedNumber(rounded, 2)}`,
      className: getChangeClass(rounded),
    };
  }
  const rounded = Number(numeric.toFixed(2));
  return {
    text: `影响 ${formatSignedNumber(rounded, 2)}pct`,
    className: getChangeClass(rounded),
  };
}

function assertProcessFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是number类型的有限数值`);
  }
  return value;
}

function assertProcessPositiveNumber(value, name) {
  const number = assertProcessFiniteNumber(value, name);
  if (number <= 0) throw new RangeError(`${name}必须大于0`);
  return number;
}

function getProcessSeriesValue(values = [], index = -1) {
  return assertProcessFiniteNumber(values?.[index], `序列第${index}项`);
}

function getProcessSeriesDelta(values = [], selectedIndex = 0, comparisonIndex = selectedIndex - 1) {
  return getProcessSeriesValue(values, selectedIndex) - getProcessSeriesValue(values, comparisonIndex);
}

function countProcessMaskBits(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

function getProcessFactorial(value) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
}

function calculateProcessShapleyImpacts(factors = [], evaluate = () => 0) {
  const count = factors.length;
  if (!count) return {};
  const factorial = [1];
  for (let index = 1; index <= count; index += 1) factorial[index] = factorial[index - 1] * index;
  const result = {};
  factors.forEach((factor, factorIndex) => {
    let contribution = 0;
    const factorBit = 1 << factorIndex;
    const subsetLimit = 1 << count;
    for (let mask = 0; mask < subsetLimit; mask += 1) {
      if (mask & factorBit) continue;
      const subsetSize = countProcessMaskBits(mask);
      const weight = (factorial[subsetSize] * factorial[count - subsetSize - 1]) / factorial[count];
      const beforeState = {};
      const afterState = {};
      factors.forEach((candidate, candidateIndex) => {
        const useCurrent = Boolean(mask & (1 << candidateIndex));
        beforeState[candidate.key] = useCurrent ? candidate.current : candidate.baseline;
        afterState[candidate.key] = candidateIndex === factorIndex
          ? candidate.current
          : beforeState[candidate.key];
      });
      const afterValue = assertProcessFiniteNumber(evaluate(afterState), "Shapley替换后结果");
      const beforeValue = assertProcessFiniteNumber(evaluate(beforeState), "Shapley替换前结果");
      contribution += weight * (afterValue - beforeValue);
    }
    result[factor.key] = contribution;
  });
  return result;
}

function buildTwoFactorRatioProcessImpacts({
  numerator,
  denominator,
  ratios,
  selectedIndex,
  comparisonIndex,
  complement = false,
}) {
  if (comparisonIndex < 0) return {};
  const factors = [
    {
      key: "numerator",
      baseline: getProcessSeriesValue(numerator, comparisonIndex),
      current: getProcessSeriesValue(numerator, selectedIndex),
    },
    {
      key: "denominator",
      baseline: getProcessSeriesValue(denominator, comparisonIndex),
      current: getProcessSeriesValue(denominator, selectedIndex),
    },
  ];
  const raw = calculateProcessShapleyImpacts(factors, ({ numerator: numeratorValue, denominator: denominatorValue }) => {
    assertProcessPositiveNumber(denominatorValue, "比例归因分母");
    return complement
      ? 100 * (1 - numeratorValue / denominatorValue)
      : 100 * numeratorValue / denominatorValue;
  });
  return raw;
}

function buildEveProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  const baseWorst = getEveWorstScenarioSnapshot(model, comparisonIndex);
  const currentWorst = getEveWorstScenarioSnapshot(model, selectedIndex, baseWorst.key);
  const baseCapital = getProcessSeriesValue(model.capital, comparisonIndex);
  const currentCapital = getProcessSeriesValue(model.capital, selectedIndex);
  const grouped = model.usesOverseasAllocatedCapital
    ? calculateEveGroupedOwenImpacts(model, selectedIndex, comparisonIndex, baseWorst, currentWorst)
    : null;
  const top = grouped
    ? {
        numerator: grouped.M,
        denominator: grouped.O + grouped.L + grouped.T,
      }
    : buildTwoFactorRatioProcessImpacts({
        numerator: model.numerator,
        denominator: model.capital,
        ratios: model.ratios,
        selectedIndex,
        comparisonIndex,
      });
  const impactMap = {
    eve: getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex),
    numerator: top.numerator,
    denominator: top.denominator,
    attributionMethod: "six-scenario-shapley-and-capital-grouped-owen",
  };
  const numeratorUnitImpact = baseCapital && currentCapital
    ? 0.5 * ((100 / baseCapital) + (100 / currentCapital))
    : 0;
  const scenarioAttribution = calculateEveScenarioShapleyImpacts(model, selectedIndex, comparisonIndex);
  model.scenarios.forEach((scenario) => {
    impactMap[`scenario:${scenario.key}`] = scenarioAttribution.amountImpacts[scenario.key] * numeratorUnitImpact;
  });
  const scenarioImpactTotal = model.scenarios.reduce(
    (sum, scenario) => sum + impactMap[`scenario:${scenario.key}`],
    0,
  );
  if (Math.abs(scenarioImpactTotal - top.numerator) > 1e-8) {
    throw new Error("△EVE六情景影响合计未与分子组影响勾稽");
  }
  impactMap.scenarioAttribution = {
    baseWorstKey: baseWorst.key,
    baseWorstName: baseWorst.name,
    currentWorstKey: currentWorst.key,
    currentWorstName: currentWorst.name,
    switched: baseWorst.key !== currentWorst.key,
    amountImpacts: scenarioAttribution.amountImpacts,
    amountImpactTotal: scenarioAttribution.amountImpactTotal,
    stateCount: scenarioAttribution.stateCount,
    numeratorUnitImpact,
    scenarioSelection: "maximumLoss",
    attributionDirection: "six-scenario-shapley",
  };
  if (model.usesOverseasAllocatedCapital) {
    impactMap["overseas-rwa"] = grouped.O;
    impactMap["legal-rwa"] = grouped.L;
    impactMap["legal-tier-one"] = grouped.T;
  }
  return impactMap;
}

function evaluateEveMaximumLossState(state, scenarioKeys) {
  const maximumLoss = Math.max(...scenarioKeys.map((key) => (
    -assertProcessFiniteNumber(state[key], `△EVE情景${key}`)
  )));
  if (maximumLoss < -1e-9) {
    throw new RangeError("△EVE归因混合状态的六情景最大损失不得小于0");
  }
  return maximumLoss;
}

function calculateEveScenarioShapleyImpacts(model, selectedIndex, comparisonIndex) {
  const factors = model.scenarios.map((scenario) => ({
    key: scenario.key,
    baseline: getProcessSeriesValue(scenario.values, comparisonIndex),
    current: getProcessSeriesValue(scenario.values, selectedIndex),
  }));
  const scenarioKeys = factors.map((factor) => factor.key);
  const amountImpacts = calculateProcessShapleyImpacts(
    factors,
    (state) => evaluateEveMaximumLossState(state, scenarioKeys),
  );
  const baseState = Object.fromEntries(factors.map((factor) => [factor.key, factor.baseline]));
  const currentState = Object.fromEntries(factors.map((factor) => [factor.key, factor.current]));
  const baseAmount = evaluateEveMaximumLossState(baseState, scenarioKeys);
  const currentAmount = evaluateEveMaximumLossState(currentState, scenarioKeys);
  const amountImpactTotal = Object.values(amountImpacts).reduce((sum, value) => sum + value, 0);
  if (Math.abs(amountImpactTotal - (currentAmount - baseAmount)) > 1e-8) {
    throw new Error("△EVE六情景Shapley金额影响未与最大损失额变化勾稽");
  }
  return {
    amountImpacts,
    amountImpactTotal,
    baseAmount,
    currentAmount,
    stateCount: 2 ** factors.length,
  };
}

function getEveWorstScenarioSnapshot(model, dateIndex, preferredKey = "") {
  const candidates = model.scenarios.map((scenario) => ({
    key: scenario.key,
    name: scenario.name,
    value: getProcessSeriesValue(scenario.values, dateIndex),
    amount: -getProcessSeriesValue(scenario.values, dateIndex),
  }));
  const maximumAmount = Math.max(...candidates.map((candidate) => candidate.amount));
  if (maximumAmount < -1e-9) {
    throw new RangeError("△EVE六情景最大损失不得小于0");
  }
  const tied = candidates.filter((candidate) => Math.abs(candidate.amount - maximumAmount) <= 1e-9);
  return tied.find((candidate) => candidate.key === preferredKey) || tied[0];
}

function calculateEveGroupedOwenImpacts(model, selectedIndex, comparisonIndex, baseWorst, currentWorst) {
  const baseState = {
    M: baseWorst.amount,
    O: getProcessSeriesValue(model.overseasRwa, comparisonIndex),
    L: getProcessSeriesValue(model.legalRwa, comparisonIndex),
    T: getProcessSeriesValue(model.legalTierOne, comparisonIndex),
  };
  const currentState = {
    M: currentWorst.amount,
    O: getProcessSeriesValue(model.overseasRwa, selectedIndex),
    L: getProcessSeriesValue(model.legalRwa, selectedIndex),
    T: getProcessSeriesValue(model.legalTierOne, selectedIndex),
  };
  const denominatorOrders = [
    ["O", "L", "T"], ["O", "T", "L"],
    ["L", "O", "T"], ["L", "T", "O"],
    ["T", "O", "L"], ["T", "L", "O"],
  ];
  const groupOrders = [["M", "D"], ["D", "M"]];
  const totals = { M: 0, O: 0, L: 0, T: 0 };
  const evaluate = (state) => {
    assertProcessPositiveNumber(state.O, "境外分行RWA");
    assertProcessPositiveNumber(state.L, "法人RWA");
    assertProcessPositiveNumber(state.T, "法人一级资本净额");
    return (state.M * state.L * 100) / (state.O * state.T);
  };
  let pathCount = 0;
  groupOrders.forEach((groupOrder) => {
    denominatorOrders.forEach((denominatorOrder) => {
      const factorOrder = groupOrder.flatMap((group) => group === "M" ? ["M"] : denominatorOrder);
      const state = { ...baseState };
      let before = evaluate(state);
      factorOrder.forEach((factor) => {
        state[factor] = currentState[factor];
        const after = evaluate(state);
        totals[factor] += after - before;
        before = after;
      });
      pathCount += 1;
    });
  });
  Object.keys(totals).forEach((factor) => {
    totals[factor] /= pathCount;
  });
  return { ...totals, pathCount };
}

function buildLiquidityGapAmountProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  const components = model.components;
  const assetImpact = getProcessSeriesDelta(components.dueOnOffBalanceAssets, selectedIndex, comparisonIndex);
  const liabilityImpact = -getProcessSeriesDelta(components.dueOnOffBalanceLiabilities, selectedIndex, comparisonIndex);
  const depositImpact = getProcessSeriesDelta(components.demandDepositAdjustment, selectedIndex, comparisonIndex);
  const placementImpact = getProcessSeriesDelta(components.demandPlacementAdjustment, selectedIndex, comparisonIndex);
  const impactMap = {
    gap: getProcessSeriesDelta(components.liquidityGap, selectedIndex, comparisonIndex),
    "due-on-off-balance-assets": assetImpact,
    "due-on-off-balance-liabilities": liabilityImpact,
    "demand-deposit-adjustment": depositImpact,
    "demand-placement-adjustment": placementImpact,
  };
  [
    ["asset-total", components.assetTotal, 1],
    ["off-balance-income", components.offBalanceIncome, 1],
    ["internal-transaction-assets", components.internalTransactionAssets, 1],
    ["liability-total", components.liabilityTotal, -1],
    ["off-balance-expense", components.offBalanceExpense, -1],
    ["internal-transaction-liabilities", components.internalTransactionLiabilities, -1],
    ["demand-deposits", components.demandDeposits, 1],
    ["note-demand-deposits", components.noteDemandDeposits, -1],
    ["demand-placements", components.demandPlacements, 1],
    ["note-demand-placements", components.noteDemandPlacements, -1],
  ].forEach(([key, values, sign]) => {
    impactMap[key] = sign * getProcessSeriesDelta(values, selectedIndex, comparisonIndex);
  });
  return impactMap;
}

function buildLiquidityGapRatioProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  const components = model.components;
  const top = buildTwoFactorRatioProcessImpacts({
    numerator: components.adjustedDueOnOffBalanceLiabilities,
    denominator: components.dueOnOffBalanceAssets,
    ratios: model.ratios,
    selectedIndex,
    comparisonIndex,
    complement: true,
  });
  const impactMap = {
    ratio: getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex),
    "adjusted-due-on-off-balance-liabilities": top.numerator,
    "due-on-off-balance-assets": top.denominator,
  };
  const asset0 = getProcessSeriesValue(components.dueOnOffBalanceAssets, comparisonIndex);
  const asset1 = getProcessSeriesValue(components.dueOnOffBalanceAssets, selectedIndex);
  assertProcessPositiveNumber(asset0, "基期到期表内外资产");
  assertProcessPositiveNumber(asset1, "本期到期表内外资产");
  const adjustedLiabilityUnitImpact = -0.5 * ((100 / asset0) + (100 / asset1));
  const adjustedLeafFactors = [
    ["liability-total", components.liabilityTotal, 1],
    ["off-balance-expense", components.offBalanceExpense, 1],
    ["internal-transaction-liabilities", components.internalTransactionLiabilities, 1],
    ["demand-deposits", components.demandDeposits, -1],
    ["note-demand-deposits", components.noteDemandDeposits, 1],
    ["demand-placements", components.demandPlacements, -1],
    ["note-demand-placements", components.noteDemandPlacements, 1],
  ];
  adjustedLeafFactors.forEach(([key, values, sign]) => {
    impactMap[key] = sign
      * getProcessSeriesDelta(values, selectedIndex, comparisonIndex)
      * adjustedLiabilityUnitImpact;
  });
  impactMap["due-on-off-balance-liabilities"] = [
    "liability-total", "off-balance-expense", "internal-transaction-liabilities",
  ].reduce((sum, key) => sum + impactMap[key], 0);
  impactMap["demand-deposit-adjustment"] = ["demand-deposits", "note-demand-deposits"]
    .reduce((sum, key) => sum + impactMap[key], 0);
  impactMap["demand-placement-adjustment"] = ["demand-placements", "note-demand-placements"]
    .reduce((sum, key) => sum + impactMap[key], 0);
  const adjusted0 = getProcessSeriesValue(components.adjustedDueOnOffBalanceLiabilities, comparisonIndex);
  const adjusted1 = getProcessSeriesValue(components.adjustedDueOnOffBalanceLiabilities, selectedIndex);
  const assetFactors = [
    { key: "asset-total", baseline: getProcessSeriesValue(components.assetTotal, comparisonIndex), current: getProcessSeriesValue(components.assetTotal, selectedIndex) },
    { key: "off-balance-income", baseline: getProcessSeriesValue(components.offBalanceIncome, comparisonIndex), current: getProcessSeriesValue(components.offBalanceIncome, selectedIndex) },
    { key: "internal-transaction-assets", baseline: getProcessSeriesValue(components.internalTransactionAssets, comparisonIndex), current: getProcessSeriesValue(components.internalTransactionAssets, selectedIndex) },
  ];
  Object.assign(impactMap, calculateProcessShapleyImpacts(assetFactors, (values) => {
    const assets = Object.values(values).reduce((sum, value) => sum + value, 0);
    assertProcessPositiveNumber(assets, "到期表内外资产混合状态合计");
    return 0.5 * (100 * (1 - adjusted0 / assets) + 100 * (1 - adjusted1 / assets));
  }));
  return impactMap;
}

const LIQUIDITY_RATIO_INTERBANK_ASSET_KEY = "liquidity-interbank-net-assets";
const LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY = "liquidity-interbank-net-liabilities";

function sumLiquidityRatioState(values = {}) {
  return Object.values(values).reduce((sum, value) => sum + assertProcessFiniteNumber(value, "流动性比例混合状态项目"), 0);
}

function evaluateLiquidityRatioGroupedState(assetValues, liabilityValues, interbankNetPosition) {
  const otherAssets = sumLiquidityRatioState(assetValues);
  const otherLiabilities = sumLiquidityRatioState(liabilityValues);
  const netPosition = assertProcessFiniteNumber(interbankNetPosition, "同业往来轧差净头寸");
  const numerator = otherAssets + Math.max(netPosition, 0);
  const denominator = otherLiabilities + Math.max(-netPosition, 0);
  assertProcessPositiveNumber(denominator, "流动性比例混合状态负债");
  return (100 * numerator) / denominator;
}

function splitLiquidityRatioInterbankBridgeImpact(otherAssets, otherLiabilities, baseNetPosition, currentNetPosition) {
  const evaluate = (netPosition) => evaluateLiquidityRatioGroupedState(
    { otherAssets },
    { otherLiabilities },
    netPosition
  );
  const baseValue = evaluate(baseNetPosition);
  const currentValue = evaluate(currentNetPosition);
  let assetSideImpact = 0;
  let liabilitySideImpact = 0;
  let zeroBridgeValue = null;

  if (baseNetPosition >= 0 && currentNetPosition >= 0) {
    assetSideImpact = currentValue - baseValue;
  } else if (baseNetPosition <= 0 && currentNetPosition <= 0) {
    liabilitySideImpact = currentValue - baseValue;
  } else {
    zeroBridgeValue = evaluate(0);
    if (baseNetPosition > 0) {
      assetSideImpact = zeroBridgeValue - baseValue;
      liabilitySideImpact = currentValue - zeroBridgeValue;
    } else {
      liabilitySideImpact = zeroBridgeValue - baseValue;
      assetSideImpact = currentValue - zeroBridgeValue;
    }
  }

  return {
    assetSideImpact,
    liabilitySideImpact,
    totalImpact: assetSideImpact + liabilitySideImpact,
    baseValue,
    currentValue,
    zeroBridgeValue,
  };
}

function calculateLiquidityRatioGroupedOwenImpacts(model, selectedIndex, comparisonIndex) {
  const components = model.components || {};
  const allAssetItems = components.liquidityAssetItems || [];
  const allLiabilityItems = components.liquidityLiabilityItems || [];
  const assetItems = components.liquidityOtherAssetItems
    || allAssetItems.filter((item) => item.key !== LIQUIDITY_RATIO_INTERBANK_ASSET_KEY);
  const liabilityItems = components.liquidityOtherLiabilityItems
    || allLiabilityItems.filter((item) => item.key !== LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY);
  const interbankNetPosition = components.interbankNetPosition
    || allAssetItems.find((item) => item.key === LIQUIDITY_RATIO_INTERBANK_ASSET_KEY)?.values.map((value, index) =>
      value - Number(allLiabilityItems.find((item) => item.key === LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY)?.values[index] || 0)
    );
  if (!interbankNetPosition) throw new TypeError("流动性比例缺少同业往来轧差净头寸");

  const assetFactors = assetItems.map((item) => ({
    key: item.key,
    baseline: getProcessSeriesValue(item.values, comparisonIndex),
    current: getProcessSeriesValue(item.values, selectedIndex),
  }));
  const liabilityFactors = liabilityItems.map((item) => ({
    key: item.key,
    baseline: getProcessSeriesValue(item.values, comparisonIndex),
    current: getProcessSeriesValue(item.values, selectedIndex),
  }));
  const baseNetPosition = getProcessSeriesValue(interbankNetPosition, comparisonIndex);
  const currentNetPosition = getProcessSeriesValue(interbankNetPosition, selectedIndex);
  const baseAssetState = Object.fromEntries(assetFactors.map((factor) => [factor.key, factor.baseline]));
  const currentAssetState = Object.fromEntries(assetFactors.map((factor) => [factor.key, factor.current]));
  const baseLiabilityState = Object.fromEntries(liabilityFactors.map((factor) => [factor.key, factor.baseline]));
  const currentLiabilityState = Object.fromEntries(liabilityFactors.map((factor) => [factor.key, factor.current]));
  const groupOrders = [
    ["assets", "liabilities", "interbank"],
    ["assets", "interbank", "liabilities"],
    ["liabilities", "assets", "interbank"],
    ["liabilities", "interbank", "assets"],
    ["interbank", "assets", "liabilities"],
    ["interbank", "liabilities", "assets"],
  ];
  const totals = Object.fromEntries([
    ...assetFactors.map((factor) => factor.key),
    ...liabilityFactors.map((factor) => factor.key),
    LIQUIDITY_RATIO_INTERBANK_ASSET_KEY,
    LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY,
  ].map((key) => [key, 0]));

  groupOrders.forEach((groupOrder) => {
    const state = {
      assets: { ...baseAssetState },
      liabilities: { ...baseLiabilityState },
      interbank: baseNetPosition,
    };
    groupOrder.forEach((group) => {
      if (group === "assets") {
        const denominator = sumLiquidityRatioState(state.liabilities) + Math.max(-state.interbank, 0);
        assertProcessPositiveNumber(denominator, "流动性比例资产组替换分母");
        const unitImpact = 100 / denominator;
        assetFactors.forEach((factor) => {
          totals[factor.key] += (factor.current - factor.baseline) * unitImpact;
        });
        state.assets = { ...currentAssetState };
        return;
      }
      if (group === "liabilities") {
        const liabilityImpacts = calculateProcessShapleyImpacts(liabilityFactors, (values) =>
          evaluateLiquidityRatioGroupedState(state.assets, values, state.interbank)
        );
        liabilityFactors.forEach((factor) => {
          totals[factor.key] += liabilityImpacts[factor.key];
        });
        state.liabilities = { ...currentLiabilityState };
        return;
      }
      const bridge = splitLiquidityRatioInterbankBridgeImpact(
        sumLiquidityRatioState(state.assets),
        sumLiquidityRatioState(state.liabilities),
        baseNetPosition,
        currentNetPosition
      );
      totals[LIQUIDITY_RATIO_INTERBANK_ASSET_KEY] += bridge.assetSideImpact;
      totals[LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY] += bridge.liabilitySideImpact;
      state.interbank = currentNetPosition;
    });
  });

  Object.keys(totals).forEach((key) => {
    totals[key] /= groupOrders.length;
  });
  return {
    impacts: totals,
    pathCount: groupOrders.length,
    baseNetPosition,
    currentNetPosition,
    baseDirection: baseNetPosition > 0 ? "asset" : (baseNetPosition < 0 ? "liability" : "zero"),
    currentDirection: currentNetPosition > 0 ? "asset" : (currentNetPosition < 0 ? "liability" : "zero"),
  };
}

function buildLiquidityRatioGroupedOwenProcessImpactMap(model, selectedIndex, comparisonIndex) {
  const grouped = calculateLiquidityRatioGroupedOwenImpacts(model, selectedIndex, comparisonIndex);
  const assetKeys = (model.components.liquidityOtherAssetItems || []).map((item) => item.key);
  const liabilityKeys = (model.components.liquidityOtherLiabilityItems || []).map((item) => item.key);
  const otherAssetImpact = assetKeys.reduce((sum, key) => sum + grouped.impacts[key], 0);
  const otherLiabilityImpact = liabilityKeys.reduce((sum, key) => sum + grouped.impacts[key], 0);
  const interbankAssetImpact = grouped.impacts[LIQUIDITY_RATIO_INTERBANK_ASSET_KEY];
  const interbankLiabilityImpact = grouped.impacts[LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY];
  return {
    ratio: getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex),
    numerator: otherAssetImpact + interbankAssetImpact,
    denominator: otherLiabilityImpact + interbankLiabilityImpact,
    ...grouped.impacts,
    "interbank-net-position": interbankAssetImpact + interbankLiabilityImpact,
    attributionMethod: "three-group-owen-with-interbank-zero-bridge-6-paths",
    liquidityRatioBridge: {
      baseNetPosition: grouped.baseNetPosition,
      currentNetPosition: grouped.currentNetPosition,
      baseDirection: grouped.baseDirection,
      currentDirection: grouped.currentDirection,
      switched: grouped.baseDirection !== grouped.currentDirection,
      pathCount: grouped.pathCount,
      assetSideImpact: interbankAssetImpact,
      liabilitySideImpact: interbankLiabilityImpact,
      totalImpact: interbankAssetImpact + interbankLiabilityImpact,
      jointFactor: true,
      splitAtZero: true,
    },
  };
}

function buildLiquidityRatioProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  if (model.kind === "lcr") {
    return buildLcrGroupedOwenProcessImpactMap(model, selectedIndex, comparisonIndex);
  }
  if (model.kind === "liquidityRatio") {
    return buildLiquidityRatioGroupedOwenProcessImpactMap(model, selectedIndex, comparisonIndex);
  }
  const top = buildTwoFactorRatioProcessImpacts({
    numerator: model.numerator,
    denominator: model.denominator,
    ratios: model.ratios,
    selectedIndex,
    comparisonIndex,
  });
  const impactMap = {
    ratio: getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex),
    numerator: top.numerator,
    denominator: top.denominator,
  };
  const numerator0 = getProcessSeriesValue(model.numerator, comparisonIndex);
  const numerator1 = getProcessSeriesValue(model.numerator, selectedIndex);
  const denominator0 = getProcessSeriesValue(model.denominator, comparisonIndex);
  const denominator1 = getProcessSeriesValue(model.denominator, selectedIndex);
  return impactMap;
}

function getLcrDenominatorSnapshot(model, dateIndex, preferredBranch = "") {
  const cashOutflow = assertProcessPositiveNumber(
    getProcessSeriesValue(model.components.cashOutflows, dateIndex),
    "LCR现金流出"
  );
  const cashInflow = getProcessSeriesValue(model.components.cashInflows, dateIndex);
  const rawNetOutflow = cashOutflow - cashInflow;
  const minimumNetOutflow = cashOutflow * 0.25;
  const tied = Math.abs(rawNetOutflow - minimumNetOutflow) <= 1e-9;
  const activeBranch = tied && preferredBranch
    ? preferredBranch
    : (rawNetOutflow >= minimumNetOutflow ? "raw" : "minimum");
  return {
    cashOutflow,
    cashInflow,
    rawNetOutflow,
    minimumNetOutflow,
    denominator: Math.max(rawNetOutflow, minimumNetOutflow),
    activeBranch,
    activeBranchName: activeBranch === "raw" ? "现金流出－现金流入" : "25%现金流出",
    tied,
  };
}

function calculateLcrGroupedOwenImpacts(baseHqla, currentHqla, base, current) {
  const denominatorOrders = [
    ["cash-outflow", "cash-inflow"],
    ["cash-inflow", "cash-outflow"],
  ];
  const totals = {
    hqla: 0,
    "cash-outflow": 0,
    "cash-inflow": 0,
  };
  let pathCount = 0;
  [["hqla", "denominator"], ["denominator", "hqla"]].forEach((groupOrder) => {
    denominatorOrders.forEach((denominatorOrder) => {
      const factorOrder = groupOrder.flatMap((group) => group === "hqla" ? ["hqla"] : denominatorOrder);
      const state = {
        hqla: baseHqla,
        "cash-outflow": base.cashOutflow,
        "cash-inflow": base.cashInflow,
      };
      const evaluate = () => {
        const outflow = assertProcessPositiveNumber(state["cash-outflow"], "LCR混合状态现金流出");
        const denominator = Math.max(outflow - state["cash-inflow"], 0.25 * outflow);
        assertProcessPositiveNumber(denominator, "LCR混合状态分母");
        return (state.hqla / denominator) * 100;
      };
      let before = evaluate();
      factorOrder.forEach((factor) => {
        if (factor === "hqla") state.hqla = currentHqla;
        if (factor === "cash-outflow") state["cash-outflow"] = current.cashOutflow;
        if (factor === "cash-inflow") state["cash-inflow"] = current.cashInflow;
        const after = evaluate();
        totals[factor] += after - before;
        before = after;
      });
      pathCount += 1;
    });
  });
  Object.keys(totals).forEach((factor) => {
    totals[factor] /= pathCount;
  });
  return { ...totals, pathCount };
}

function buildLcrGroupedOwenProcessImpactMap(model, selectedIndex, comparisonIndex) {
  const base = getLcrDenominatorSnapshot(model, comparisonIndex);
  const current = getLcrDenominatorSnapshot(model, selectedIndex, base.activeBranch);
  const baseHqla = getProcessSeriesValue(model.numerator, comparisonIndex);
  const currentHqla = getProcessSeriesValue(model.numerator, selectedIndex);
  const grouped = calculateLcrGroupedOwenImpacts(baseHqla, currentHqla, base, current);
  const numeratorUnitImpact = 0.5 * ((100 / base.denominator) + (100 / current.denominator));
  const impactMap = {
    ratio: getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex),
    numerator: grouped.hqla,
    denominator: grouped["cash-outflow"] + grouped["cash-inflow"],
    "cash-outflow": grouped["cash-outflow"],
    "cash-inflow": grouped["cash-inflow"],
    attributionMethod: "direct-max-grouped-owen-4-paths",
    lcrBridge: {
      baseBranch: base.activeBranch,
      baseBranchName: base.activeBranchName,
      currentBranch: current.activeBranch,
      currentBranchName: current.activeBranchName,
      switched: base.activeBranch !== current.activeBranch,
      pathCount: grouped.pathCount,
      effectivePathCount: grouped.pathCount,
      structuralPathCount: 24,
      numeratorUnitImpact,
      branchContributionIsIndependentFactor: false,
    },
  };
  [
    ["level-1-assets", model.components.level1Assets],
    ["level-2a-assets", model.components.level2AAssets],
    ["level-2b-assets", model.components.level2BAssets],
  ].forEach(([key, values]) => {
    impactMap[key] = getProcessSeriesDelta(values, selectedIndex, comparisonIndex) * numeratorUnitImpact;
  });
  return impactMap;
}

function buildLiquidityProcessImpactMap(model, selectedIndex, comparisonIndex, metric = "ratio") {
  if (model.kind === "liquidityGap") {
    return metric === "amount"
      ? buildLiquidityGapAmountProcessImpactMap(model, selectedIndex, comparisonIndex)
      : buildLiquidityGapRatioProcessImpactMap(model, selectedIndex, comparisonIndex);
  }
  return buildLiquidityRatioProcessImpactMap(model, selectedIndex, comparisonIndex);
}

function buildRepricingGapProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (model.supportsAttribution === false) {
    throw new RangeError("当前重定价缺口率口径不支持拆解归因");
  }
  if (comparisonIndex < 0) return {};
  const repricingWeights = (model.repricingWeights || []).map((value, index) => {
    const weight = assertProcessFiniteNumber(value, `重定价期限权重第${index + 1}项`);
    if (weight < 0 || weight > 1) throw new RangeError(`重定价期限权重第${index + 1}项必须位于0至1之间`);
    return weight;
  });
  if (!repricingWeights.length) throw new RangeError("重定价缺口率缺少一年内期限权重");
  const totalInterestAssetsByBusiness = Object.fromEntries(model.totalInterestAssetItems.map((item) => [
    item.key.replace(/^total-/, ""),
    item,
  ]));
  const buildState = (dateIndex) => ({
    assets: Object.fromEntries(model.assetItems.map((item) => {
      const totalItem = totalInterestAssetsByBusiness[item.key];
      if (!totalItem) throw new RangeError(`${item.title}缺少总规模序列`);
      if (!Array.isArray(item.withinOneYearBucketSeries)
        || item.withinOneYearBucketSeries.length !== repricingWeights.length) {
        throw new RangeError(`${item.title}的一年内期限桶必须与期限权重等长`);
      }
      const withinOneYearBuckets = item.withinOneYearBucketSeries.map((series, bucketIndex) => {
        const amount = getProcessSeriesValue(series, dateIndex);
        if (amount < 0) throw new RangeError(`${item.title}第${bucketIndex + 1}个一年内期限桶不得为负数`);
        return amount;
      });
      const totalInterestAssetScale = getProcessSeriesValue(totalItem.values, dateIndex);
      if (totalInterestAssetScale < 0) throw new RangeError(`${item.title}总生息资产规模不得为负数`);
      const withinOneYearScale = withinOneYearBuckets.reduce((sum, amount) => sum + amount, 0);
      const beyondOneYearScale = totalInterestAssetScale - withinOneYearScale;
      const tolerance = 1e-9 * Math.max(1, totalInterestAssetScale, withinOneYearScale);
      if (beyondOneYearScale < -tolerance) {
        throw new RangeError(`${item.title}的一年内期限桶合计不能大于总生息资产规模`);
      }
      return [item.key, {
        withinOneYearBuckets,
        beyondOneYearScale: Math.max(0, beyondOneYearScale),
      }];
    })),
    liabilities: Object.fromEntries(model.liabilityItems.map((item) => [
      item.key,
      getProcessSeriesValue(item.values, dateIndex),
    ])),
    bankBook: {
      receivable: getProcessSeriesValue(model.bankBookReceivable, dateIndex),
      payable: getProcessSeriesValue(model.bankBookPayable, dateIndex),
    },
    tradingBook: {
      receivable: getProcessSeriesValue(model.tradingBookReceivable, dateIndex),
      payable: getProcessSeriesValue(model.tradingBookPayable, dateIndex),
    },
  });
  const base = buildState(comparisonIndex);
  const current = buildState(selectedIndex);
  const inputAssetKeys = Object.keys(base.assets).sort();
  const getWithinOneYearScale = (item) => item.withinOneYearBuckets
    .reduce((sum, amount) => sum + amount, 0);
  const getAdjustedRepricingScale = (item) => item.withinOneYearBuckets
    .reduce((sum, amount, index) => sum + amount * repricingWeights[index], 0);
  const getTotalAssetScale = (item) => getWithinOneYearScale(item) + item.beyondOneYearScale;
  const assetKeys = inputAssetKeys.filter((key) => (
    getTotalAssetScale(base.assets[key]) > 1e-9 || getTotalAssetScale(current.assets[key]) > 1e-9
  ));
  const liabilityKeys = Object.keys(base.liabilities).sort();
  if (assetKeys.length > 15) throw new RangeError("资产业务类别过多，请先按正式业务分类归组");
  const evaluate = (state) => {
    const denominator = Object.values(state.assets)
      .reduce((sum, item) => sum + getTotalAssetScale(item), 0);
    assertProcessPositiveNumber(denominator, "重定价缺口率总规模");
    const assetRepricing = Object.values(state.assets)
      .reduce((sum, item) => sum + getAdjustedRepricingScale(item), 0);
    const liabilityRepricing = Object.values(state.liabilities)
      .reduce((sum, value) => sum + value, 0);
    const bankGap = state.bankBook.receivable - state.bankBook.payable;
    const tradingGap = state.tradingBook.receivable - state.tradingBook.payable;
    return 100 * (assetRepricing - liabilityRepricing + bankGap + tradingGap) / denominator;
  };
  const assetLeafImpacts = {};
  const businessCount = assetKeys.length;
  const topFactorial = getProcessFactorial(4);
  const businessFactorial = getProcessFactorial(businessCount);
  const otherTopKeys = ["liabilities", "bankBook", "tradingBook"];
  assetKeys.forEach((targetKey, targetIndex) => {
    ["withinOneYearBuckets", "beyondOneYearScale"].forEach((targetField) => {
      const leafSuffix = targetField === "withinOneYearBuckets" ? "withinOneYear" : "beyondOneYear";
      const leafKey = `${targetKey}:${leafSuffix}`;
      const otherField = targetField === "withinOneYearBuckets"
        ? "beyondOneYearScale"
        : "withinOneYearBuckets";
      let contribution = 0;
      for (let topMask = 0; topMask < 8; topMask += 1) {
        const topSize = countProcessMaskBits(topMask);
        const topWeight = getProcessFactorial(topSize) * getProcessFactorial(3 - topSize) / topFactorial;
        for (let businessMask = 0; businessMask < 2 ** businessCount; businessMask += 1) {
          if (businessMask & (2 ** targetIndex)) continue;
          const businessSize = countProcessMaskBits(businessMask);
          const businessWeight = getProcessFactorial(businessSize)
            * getProcessFactorial(businessCount - businessSize - 1) / businessFactorial;
          for (let otherFieldCurrent = 0; otherFieldCurrent <= 1; otherFieldCurrent += 1) {
            const buildHybrid = (targetCurrent) => {
              const state = { assets: {}, liabilities: null, bankBook: null, tradingBook: null };
              otherTopKeys.forEach((key, index) => {
                state[key] = topMask & (2 ** index) ? current[key] : base[key];
              });
              assetKeys.forEach((key, index) => {
                if (key !== targetKey) {
                  state.assets[key] = businessMask & (2 ** index) ? current.assets[key] : base.assets[key];
                  return;
                }
                state.assets[key] = { ...base.assets[key] };
                state.assets[key][otherField] = otherFieldCurrent
                  ? current.assets[key][otherField]
                  : base.assets[key][otherField];
                state.assets[key][targetField] = targetCurrent
                  ? current.assets[key][targetField]
                  : base.assets[key][targetField];
              });
              return state;
            };
            contribution += topWeight * businessWeight * 0.5
              * (evaluate(buildHybrid(true)) - evaluate(buildHybrid(false)));
          }
        }
      }
      assetLeafImpacts[leafKey] = contribution;
    });
  });
  const baseDenominator = Object.values(base.assets).reduce((sum, item) => sum + getTotalAssetScale(item), 0);
  const currentDenominator = Object.values(current.assets).reduce((sum, item) => sum + getTotalAssetScale(item), 0);
  assertProcessPositiveNumber(baseDenominator, "基期重定价缺口率总生息资产规模");
  assertProcessPositiveNumber(currentDenominator, "当期重定价缺口率总生息资产规模");
  const linearUnitImpact = 0.5 * ((100 / baseDenominator) + (100 / currentDenominator));
  const evaluatedRatioImpact = evaluate(current) - evaluate(base);
  const ratioImpact = getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex);
  if (Math.abs(evaluatedRatioImpact - ratioImpact) > 1e-7) {
    throw new Error("重定价缺口率归因输入未与页面指标值勾稽");
  }
  const impactMap = {
    ratio: ratioImpact,
    attributionMethod: "three-level-nested-owen-with-joint-within-year-factor",
    effectiveAssetBusinessCount: businessCount,
    inputAssetBusinessCount: inputAssetKeys.length,
    withinOneYearBucketCount: repricingWeights.length,
    attributionMarginalDifferenceCount: 16 * businessCount * (2 ** businessCount),
    controlMarginalDifferenceCount: 32,
    marginalDifferenceCount: 16 * businessCount * (2 ** businessCount) + 32,
    linkedWithinYearFactor: true,
  };
  inputAssetKeys.forEach((key) => {
    impactMap[`${key}:withinOneYear`] = assetLeafImpacts[`${key}:withinOneYear`] || 0;
    impactMap[`${key}:beyondOneYear`] = assetLeafImpacts[`${key}:beyondOneYear`] || 0;
    impactMap[key] = impactMap[`${key}:withinOneYear`] + impactMap[`${key}:beyondOneYear`];
  });
  liabilityKeys.forEach((key) => {
    impactMap[key] = -(current.liabilities[key] - base.liabilities[key]) * linearUnitImpact;
  });
  impactMap["bank-book-receivable"] = (current.bankBook.receivable - base.bankBook.receivable) * linearUnitImpact;
  impactMap["bank-book-payable"] = -(current.bankBook.payable - base.bankBook.payable) * linearUnitImpact;
  impactMap["trading-book-receivable"] = (current.tradingBook.receivable - base.tradingBook.receivable) * linearUnitImpact;
  impactMap["trading-book-payable"] = -(current.tradingBook.payable - base.tradingBook.payable) * linearUnitImpact;
  const sumKeys = (keys) => keys.reduce((sum, key) => sum + impactMap[key], 0);
  impactMap["adjusted-assets:withinOneYear"] = sumKeys(inputAssetKeys.map((key) => `${key}:withinOneYear`));
  impactMap["adjusted-assets:beyondOneYear"] = sumKeys(inputAssetKeys.map((key) => `${key}:beyondOneYear`));
  impactMap["adjusted-assets"] = impactMap["adjusted-assets:withinOneYear"]
    + impactMap["adjusted-assets:beyondOneYear"];
  impactMap["adjusted-liabilities"] = sumKeys(liabilityKeys);
  impactMap["bank-book-derivative-gap"] = sumKeys(["bank-book-receivable", "bank-book-payable"]);
  impactMap["trading-book-derivative-gap"] = sumKeys(["trading-book-receivable", "trading-book-payable"]);
  const topLevelControl = calculateProcessShapleyImpacts([
    { key: "assets", baseline: base.assets, current: current.assets },
    { key: "liabilities", baseline: base.liabilities, current: current.liabilities },
    { key: "bankBook", baseline: base.bankBook, current: current.bankBook },
    { key: "tradingBook", baseline: base.tradingBook, current: current.tradingBook },
  ], evaluate);
  [
    ["adjusted-assets", "assets"],
    ["adjusted-liabilities", "liabilities"],
    ["bank-book-derivative-gap", "bankBook"],
    ["trading-book-derivative-gap", "tradingBook"],
  ].forEach(([impactKey, controlKey]) => {
    if (Math.abs(impactMap[impactKey] - topLevelControl[controlKey]) > 1e-7) {
      throw new Error(`重定价缺口率${impactKey}归因未与一级组整体替换控制值勾稽`);
    }
  });
  impactMap.topLevelControl = topLevelControl;
  const attributedTotal = sumKeys([
    "adjusted-assets", "adjusted-liabilities", "bank-book-derivative-gap", "trading-book-derivative-gap",
  ]);
  if (Math.abs(attributedTotal - ratioImpact) > 1e-7) {
    throw new Error("重定价缺口率各归因因素影响合计未与指标变化勾稽");
  }
  return impactMap;
}

function formatSignedNumber(value, digits = 1) {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${numeric.toFixed(digits)}`;
  if (numeric < 0) return numeric.toFixed(digits);
  return Number(0).toFixed(digits);
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

function renderEveSparkline(values, selectedIndex, comparisonIndex, color) {
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
  const comparison = Number.isInteger(comparisonIndex)
    && comparisonIndex >= 0
    && comparisonIndex < selectedIndex
    && comparisonIndex < points.length
      ? points[comparisonIndex]
      : null;
  const periodPath = comparison
    ? points.slice(comparisonIndex, selectedIndex + 1)
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ")
    : "";
  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${comparison ? `<rect x="${comparison.x}" y="4" width="${Math.max(0, selected.x - comparison.x)}" height="${height - 8}" rx="4" fill="rgba(240, 154, 69, 0.10)"></rect>` : ""}
      ${comparison ? `<line data-process-marker="comparison" x1="${comparison.x}" y1="4" x2="${comparison.x}" y2="${height - 4}" stroke="#6F89AA" stroke-width="1.5" stroke-dasharray="3 3"></line>` : ""}
      <line data-process-marker="current" x1="${selected.x}" y1="4" x2="${selected.x}" y2="${height - 4}" stroke="#D85F63" stroke-width="2" stroke-dasharray="4 3"></line>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      ${periodPath ? `<path data-process-period-line="true" d="${periodPath}" fill="none" stroke="#F08A45" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path>` : ""}
      ${comparison ? `<circle cx="${comparison.x}" cy="${comparison.y}" r="3.6" fill="#fff" stroke="#6F89AA" stroke-width="2"></circle>` : ""}
      <circle cx="${selected.x}" cy="${selected.y}" r="4" fill="#fff" stroke="#D85F63" stroke-width="2.2"></circle>
    </svg>
  `;
}

function getPaddedProcessSeriesRange(values = [], minimumPadding = 0.1) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  const minValue = finiteValues.length ? Math.min(...finiteValues) : 0;
  const maxValue = finiteValues.length ? Math.max(...finiteValues) : 0;
  const padding = Math.max(minimumPadding, (maxValue - minValue) * 0.1);
  return { min: minValue - padding, max: maxValue + padding };
}

function renderProcessSparklinePreview() {
  const state = appState.processSparklinePreview;
  if (!state) {
    processSparklinePreviewEl.innerHTML = "";
    processSparklinePreviewEl.classList.remove("is-open");
    processSparklinePreviewEl.setAttribute("aria-hidden", "true");
    return;
  }
  const values = (state.values || []).map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
  const secondaryValues = Array.isArray(state.secondaryValues)
    ? state.secondaryValues.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0)
    : [];
  const hasSecondarySeries = secondaryValues.length === values.length && values.length > 0;
  const labels = Array.isArray(state.labels) && state.labels.length === values.length
    ? state.labels
    : values.map((_, index) => String(index + 1));
  const selectedIndex = clampNumber(Number(state.selectedIndex || 0), 0, Math.max(0, values.length - 1));
  const comparisonIndex = Number.isInteger(state.comparisonIndex)
    && state.comparisonIndex >= 0
    && state.comparisonIndex < values.length
      ? state.comparisonIndex
      : -1;
  const comparisonSummary = comparisonIndex >= 0
    ? `比较区间：${labels[comparisonIndex]} → ${labels[selectedIndex]}；`
    : "";
  const headerSummary = hasSecondarySeries
    ? `${comparisonSummary}本期${state.primaryLabel || "主轴"} ${formatProcessPreviewValue(values[selectedIndex], state.primaryValueFormat || state.valueFormat)}；${state.secondaryLabel || "次轴"} ${formatProcessPreviewValue(secondaryValues[selectedIndex], state.secondaryValueFormat || "number")}`
    : `${comparisonSummary}本期 ${formatProcessPreviewValue(values[selectedIndex], state.valueFormat)}`;
  processSparklinePreviewEl.innerHTML = `
    <div class="overlay-scrim" data-close-process-sparkline="true"></div>
    <section class="process-sparkline-preview" role="dialog" aria-modal="true" aria-labelledby="processSparklinePreviewTitle">
      <div class="process-sparkline-preview__header">
        <div>
          <h3 id="processSparklinePreviewTitle">${state.title || "趋势"}</h3>
          <p>${headerSummary}</p>
        </div>
        <button class="overlay-panel__close process-sparkline-preview__close" type="button" data-close-process-sparkline="true">关闭</button>
      </div>
      <div class="process-sparkline-preview__body">
        ${hasSecondarySeries
          ? renderDualAxisProcessPreviewChart({
              labels,
              primaryValues: values,
              secondaryValues,
              selectedIndex,
              comparisonIndex,
              primaryLabel: state.primaryLabel || "主轴",
              secondaryLabel: state.secondaryLabel || "次轴",
              primaryColor: state.primaryColor || "#2878C7",
              secondaryColor: state.secondaryColor || "#C06A3A",
              primaryValueFormat: state.primaryValueFormat || state.valueFormat || "amount",
              secondaryValueFormat: state.secondaryValueFormat || "number",
            })
          : renderProcessPreviewChart(labels, values, selectedIndex, comparisonIndex, state.color || EVE_COLOR_PRIMARY, state.valueFormat)}
      </div>
    </section>
  `;
  processSparklinePreviewEl.classList.add("is-open");
  processSparklinePreviewEl.setAttribute("aria-hidden", "false");
}

function renderDualAxisProcessPreviewChart({
  labels,
  primaryValues,
  secondaryValues,
  selectedIndex,
  comparisonIndex,
  primaryLabel,
  secondaryLabel,
  primaryColor,
  secondaryColor,
  primaryValueFormat,
  secondaryValueFormat,
}) {
  const frame = { left: 92, right: 758, top: 48, bottom: 286, width: 666, height: 238, count: labels.length };
  const primaryRange = getPaddedProcessSeriesRange(primaryValues, 1);
  const secondaryRange = getPaddedProcessSeriesRange(secondaryValues, 0.02);
  const primaryPoints = scaleValuesToFrame(primaryValues, frame, primaryRange.min, primaryRange.max);
  const secondaryPoints = scaleValuesToFrame(secondaryValues, frame, secondaryRange.min, secondaryRange.max);
  const selectedPrimary = primaryPoints[selectedIndex] || primaryPoints[0];
  const selectedSecondary = secondaryPoints[selectedIndex] || secondaryPoints[0];
  const comparison = Number.isInteger(comparisonIndex)
    && comparisonIndex >= 0
    && comparisonIndex < selectedIndex
    && comparisonIndex < primaryPoints.length
      ? comparisonIndex
      : -1;
  const periodPrimaryPath = comparison >= 0
    ? primaryPoints.slice(comparison, selectedIndex + 1).map((point) => `${point.x},${point.y}`).join(" ")
    : "";
  const periodSecondaryPath = comparison >= 0
    ? secondaryPoints.slice(comparison, selectedIndex + 1).map((point) => `${point.x},${point.y}`).join(" ")
    : "";
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = frame.top + frame.height * ratio;
    const primaryTick = primaryRange.max - (primaryRange.max - primaryRange.min) * ratio;
    const secondaryTick = secondaryRange.max - (secondaryRange.max - secondaryRange.min) * ratio;
    return `
      <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="#DDEBFA" stroke-width="1"></line>
      <text x="${frame.left - 12}" y="${y + 4}" text-anchor="end" fill="${primaryColor}" font-size="12" font-weight="800">${formatProcessPreviewValue(primaryTick, primaryValueFormat)}</text>
      <text x="${frame.right + 12}" y="${y + 4}" fill="${secondaryColor}" font-size="12" font-weight="800">${formatProcessPreviewValue(secondaryTick, secondaryValueFormat)}</text>
    `;
  }).join("");
  const sampledLabels = labels.map((label, index) => {
    const shouldShow = labels.length <= 14 || index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 8) === 0;
    if (!shouldShow) return "";
    const x = getFrameXPosition(frame, index, labels.length);
    return `<text x="${x}" y="${frame.bottom + 28}" text-anchor="middle" class="axis-label">${label}</text>`;
  }).join("");
  const comparisonMarkup = comparison >= 0
    ? `
      <rect x="${primaryPoints[comparison].x}" y="${frame.top}" width="${Math.max(0, selectedPrimary.x - primaryPoints[comparison].x)}" height="${frame.height}" fill="rgba(240, 154, 69, 0.08)"></rect>
      <line data-process-marker="comparison" x1="${primaryPoints[comparison].x}" y1="${frame.top}" x2="${primaryPoints[comparison].x}" y2="${frame.bottom}" stroke="#6F89AA" stroke-width="1.8" stroke-dasharray="5 4"></line>
      <circle cx="${primaryPoints[comparison].x}" cy="${primaryPoints[comparison].y}" r="5" fill="#fff" stroke="${primaryColor}" stroke-width="2.5"></circle>
      <circle cx="${secondaryPoints[comparison].x}" cy="${secondaryPoints[comparison].y}" r="5" fill="#fff" stroke="${secondaryColor}" stroke-width="2.5"></circle>
    `
    : "";
  return `
    <svg viewBox="0 0 850 350" preserveAspectRatio="xMidYMid meet" aria-label="${primaryLabel}和${secondaryLabel}双轴趋势图">
      ${gridLines}
      <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="${primaryColor}" stroke-width="1.5"></line>
      <line x1="${frame.right}" y1="${frame.top}" x2="${frame.right}" y2="${frame.bottom}" stroke="${secondaryColor}" stroke-width="1.5"></line>
      <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="#B7D3F0" stroke-width="1.4"></line>
      <text x="${frame.left}" y="24" fill="${primaryColor}" font-size="14" font-weight="900">主轴 · ${primaryLabel}</text>
      <text x="${frame.right}" y="24" text-anchor="end" fill="${secondaryColor}" font-size="14" font-weight="900">次轴 · ${secondaryLabel}</text>
      ${comparisonMarkup}
      <polyline fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${primaryPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      <polyline fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${secondaryPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      ${periodPrimaryPath ? `<polyline data-process-period-line="primary" fill="none" stroke="#0B5FB4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${periodPrimaryPath}"></polyline>` : ""}
      ${periodSecondaryPath ? `<polyline data-process-period-line="secondary" fill="none" stroke="#B84D1F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${periodSecondaryPath}"></polyline>` : ""}
      <line data-process-marker="current" x1="${selectedPrimary.x}" y1="${frame.top}" x2="${selectedPrimary.x}" y2="${frame.bottom}" stroke="#D85F63" stroke-width="2.2" stroke-dasharray="6 4"></line>
      <circle cx="${selectedPrimary.x}" cy="${selectedPrimary.y}" r="6" fill="#fff" stroke="${primaryColor}" stroke-width="3"></circle>
      <circle cx="${selectedSecondary.x}" cy="${selectedSecondary.y}" r="6" fill="#fff" stroke="${secondaryColor}" stroke-width="3"></circle>
      ${sampledLabels}
    </svg>
  `;
}

function renderProcessPreviewChart(labels, values, selectedIndex, comparisonIndex, color, valueFormat = "amount") {
  const frame = { left: 78, right: 770, top: 34, bottom: 286, width: 692, height: 252, count: values.length };
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max(1, (maxValue - minValue) * 0.12);
  const scaledPoints = scaleValuesToFrame(values, frame, minValue - padding, maxValue + padding);
  const selected = scaledPoints[selectedIndex] || scaledPoints[0];
  const path = scaledPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const comparison = Number.isInteger(comparisonIndex)
    && comparisonIndex >= 0
    && comparisonIndex < selectedIndex
    && comparisonIndex < scaledPoints.length
      ? scaledPoints[comparisonIndex]
      : null;
  const periodPath = comparison
    ? scaledPoints.slice(comparisonIndex, selectedIndex + 1).map((point) => `${point.x},${point.y}`).join(" ")
    : "";
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
      ${comparison ? `<rect x="${comparison.x}" y="${frame.top}" width="${Math.max(0, selected.x - comparison.x)}" height="${frame.height}" fill="rgba(240, 154, 69, 0.08)"></rect>` : ""}
      ${comparison ? `<line data-process-marker="comparison" x1="${comparison.x}" y1="${frame.top}" x2="${comparison.x}" y2="${frame.bottom}" stroke="#6F89AA" stroke-width="1.8" stroke-dasharray="5 4"></line>` : ""}
      <polyline fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${path}"></polyline>
      ${periodPath ? `<polyline data-process-period-line="true" fill="none" stroke="#F08A45" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${periodPath}"></polyline>` : ""}
      <line data-process-marker="current" x1="${selected.x}" y1="${frame.top}" x2="${selected.x}" y2="${frame.bottom}" stroke="#D85F63" stroke-width="2.2" stroke-dasharray="6 4"></line>
      ${scaledPoints.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="${index === selectedIndex ? 6 : index === comparisonIndex ? 5 : 3.8}" fill="#fff" stroke="${index === selectedIndex ? "#D85F63" : index === comparisonIndex ? "#6F89AA" : color}" stroke-width="${index === selectedIndex || index === comparisonIndex ? 3 : 2}"></circle>`).join("")}
      ${sampledLabels}
      ${comparison ? `<text x="${comparison.x + 10}" y="${Math.min(frame.bottom - 10, comparison.y + 22)}" fill="#5E7898" font-size="12" font-weight="900">基期 ${labels[comparisonIndex]} ${formatProcessPreviewValue(values[comparisonIndex], valueFormat)}</text>` : ""}
      <text x="${selected.x + 10}" y="${Math.max(frame.top + 18, selected.y - 12)}" class="process-sparkline-preview__callout">${labels[selectedIndex]} ${formatProcessPreviewValue(values[selectedIndex], valueFormat)}</text>
    </svg>
  `;
}

function formatProcessPreviewValue(value, valueFormat = "amount") {
  if (valueFormat === "percent") return formatEvePercent(value);
  if (valueFormat === "amount0") return formatEveRwa(value);
  if (valueFormat === "duration") return `${Number(value || 0).toFixed(2)}年`;
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
  return getConfiguredWidgetBehavior(widget).liquidityDiagnosticKind || "";
}

const LIQUIDITY_GAP_DIAGNOSTIC_TENOR_INDEX = { "1D": 0, "7D": 1, "30D": 2, "3M": 3, "1Y": 4 };
const LIQUIDITY_GAP_DIAGNOSTIC_TENOR_WEIGHTS = [0.08, 0.22, 0.48, 0.72, 1];

function getDiagnosticWidgetFilterState(pageId, widgetSeq, chartContextOrState = {}) {
  if (chartContextOrState.filterState) return chartContextOrState.filterState;
  return {
    ...(appState?.pageFilters?.[pageId] || {}),
    ...(appState?.widgetFilters?.[widgetSeq] || {}),
  };
}

function buildLiquidityGapCumulativeSeries(count, normalizedOffset, tenorIndex, base, slope, wave, phase = 0) {
  const horizonWeight = LIQUIDITY_GAP_DIAGNOSTIC_TENOR_WEIGHTS[tenorIndex] || LIQUIDITY_GAP_DIAGNOSTIC_TENOR_WEIGHTS[2];
  return Array.from({ length: count }, (_, index) => Number((
    (base + normalizedOffset * base * 0.0025 + index * slope) * horizonWeight
    + Math.sin((index + normalizedOffset + phase) / 2.8) * wave * Math.sqrt(horizonWeight)
  ).toFixed(1)));
}

function buildLiquidityGapDiagnosticModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const filterState = getDiagnosticWidgetFilterState("liquidity-risk", widget?.seq || 49, chartContextOrState);
  const selectedTenor = (filterState.期限长度 || []).find((value) => value in LIQUIDITY_GAP_DIAGNOSTIC_TENOR_INDEX) || "30D";
  const selectedCaliber = selectedTenor === "30D"
    ? ((filterState.口径 || []).find((value) => ["时点", "月日均"].includes(value)) || "时点")
    : "时点";
  const tenorIndex = LIQUIDITY_GAP_DIAGNOSTIC_TENOR_INDEX[selectedTenor] ?? 2;
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || 49, filterState));
  const normalizedOffset = (signature % 29) + (selectedCaliber === "月日均" ? 7 : 0);
  const count = labels.length;
  const buildSeries = (base, slope, wave, phase) =>
    buildLiquidityGapCumulativeSeries(count, normalizedOffset, tenorIndex, base, slope, wave, phase);

  const assetTotal = buildSeries(620, 5.8, 18, 0);
  const offBalanceIncome = buildSeries(48, 0.6, 3.4, 1);
  const liabilityTotal = buildSeries(590, 5.1, 17, 2);
  const offBalanceExpense = buildSeries(45, 0.55, 3.2, 3);
  const internalTransactionAssets = buildSeries(24, 0.32, 2.2, 4);
  const internalTransactionLiabilities = buildSeries(19, 0.28, 1.8, 5);
  const demandDeposits = buildSeries(36, 0.42, 2.8, 6);
  const noteDemandDeposits = buildSeries(8, 0.12, 0.9, 7);
  const demandPlacements = buildSeries(22, 0.3, 2, 8);
  const noteDemandPlacements = buildSeries(5, 0.08, 0.7, 9);
  const dueOnOffBalanceAssets = assetTotal.map((value, index) => Number((
    value + offBalanceIncome[index] + internalTransactionAssets[index]
  ).toFixed(1)));
  const dueOnOffBalanceLiabilities = liabilityTotal.map((value, index) => Number((
    value + offBalanceExpense[index] + internalTransactionLiabilities[index]
  ).toFixed(1)));
  const demandDepositAdjustment = demandDeposits.map((value, index) => Number((
    value - noteDemandDeposits[index]
  ).toFixed(1)));
  const demandPlacementAdjustment = demandPlacements.map((value, index) => Number((
    value - noteDemandPlacements[index]
  ).toFixed(1)));
  const adjustedDueOnOffBalanceLiabilities = dueOnOffBalanceLiabilities.map((value, index) => Number((
    value - demandDepositAdjustment[index] - demandPlacementAdjustment[index]
  ).toFixed(1)));
  const liquidityGap = dueOnOffBalanceAssets.map((value, index) => Number((
    value
    - adjustedDueOnOffBalanceLiabilities[index]
  ).toFixed(1)));
  const ratios = dueOnOffBalanceAssets.map((value, index) => (
    100 - (adjustedDueOnOffBalanceLiabilities[index] / value) * 100
  ));
  let simulationResult = null;
  let simulatedLiquidityGap = null;
  let simulatedRatios = null;
  let simulationTargetIndex = -1;
  const pageId = chartContextOrState.pageId || getCurrentPage()?.id || "liquidity-risk";
  const simulation = typeof getPageSimulation === "function" ? getPageSimulation(pageId) : null;
  const hasLiquidityGapSimulation = Number(simulation?.sourceWidgetSeq) === LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ
    && simulation?.simulationKind === "liquidityGap"
    && simulation?.baseMatrix;
  if (hasLiquidityGapSimulation && count) {
    simulationResult = buildLiquidityGapSimulationResult(simulation);
    const bucketIndex = LIQUIDITY_GAP_DIAGNOSTIC_TENOR_INDEX[selectedTenor] ?? 2;
    simulationTargetIndex = count - 1;
    simulatedLiquidityGap = [...liquidityGap];
    simulatedRatios = [...ratios];
    const baseAssets = Number(simulationResult.baseMetrics.cumulativeInflows[bucketIndex] || 0);
    const baseGap = Number(simulationResult.baseMetrics.cumulativeTotals[bucketIndex] || 0);
    const baseAdjustedLiabilities = Number((baseAssets - baseGap).toFixed(1));
    assetTotal[simulationTargetIndex] = baseAssets;
    offBalanceIncome[simulationTargetIndex] = 0;
    internalTransactionAssets[simulationTargetIndex] = 0;
    dueOnOffBalanceAssets[simulationTargetIndex] = baseAssets;
    liabilityTotal[simulationTargetIndex] = baseAdjustedLiabilities;
    offBalanceExpense[simulationTargetIndex] = 0;
    internalTransactionLiabilities[simulationTargetIndex] = 0;
    dueOnOffBalanceLiabilities[simulationTargetIndex] = baseAdjustedLiabilities;
    demandDeposits[simulationTargetIndex] = 0;
    noteDemandDeposits[simulationTargetIndex] = 0;
    demandPlacements[simulationTargetIndex] = 0;
    noteDemandPlacements[simulationTargetIndex] = 0;
    demandDepositAdjustment[simulationTargetIndex] = 0;
    demandPlacementAdjustment[simulationTargetIndex] = 0;
    adjustedDueOnOffBalanceLiabilities[simulationTargetIndex] = baseAdjustedLiabilities;
    liquidityGap[simulationTargetIndex] = baseGap;
    ratios[simulationTargetIndex] = Number(simulationResult.baseMetrics.gapRatios[bucketIndex] || 0);
    simulatedLiquidityGap[simulationTargetIndex] = Number(
      simulationResult.simulatedMetrics.cumulativeTotals[bucketIndex] || 0
    );
    simulatedRatios[simulationTargetIndex] = Number(
      simulationResult.simulatedMetrics.gapRatios[bucketIndex] || 0
    );
  }

  return {
    kind: "liquidityGap",
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    selectedTenor,
    selectedCaliber,
    title: `${selectedTenor}流动性缺口率`,
    numeratorTitle: `${selectedTenor}累计流动性缺口`,
    denominatorTitle: `${selectedTenor}累计到期表内外资产（含内部交易）`,
    numerator: liquidityGap,
    denominator: dueOnOffBalanceAssets,
    ratios,
    simulatedLiquidityGap,
    simulatedRatios,
    simulationTargetIndex,
    simulationResult,
    components: {
      assetTotal,
      offBalanceIncome,
      liabilityTotal,
      offBalanceExpense,
      internalTransactionAssets,
      internalTransactionLiabilities,
      demandDeposits,
      noteDemandDeposits,
      demandPlacements,
      noteDemandPlacements,
      demandDepositAdjustment,
      demandPlacementAdjustment,
      liquidityGap,
      dueOnOffBalanceAssets,
      dueOnOffBalanceLiabilities,
      adjustedDueOnOffBalanceLiabilities,
    },
  };
}

function buildLiquidityDiagnosticModel(widget, chartContextOrState = {}) {
  const kind = chartContextOrState.kind || getLiquidityDiagnosticKind(widget);
  if (kind === "liquidityGap") return buildLiquidityGapDiagnosticModel(widget, chartContextOrState);
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || 42, chartContextOrState.filterState || {}));
  const count = labels.length;
  const normalizedOffset = signature % 23;

  if (kind === "liquidityRatio") {
    const liquidityOtherAssetItems = [
      ["liquidity-cash", "1.1 现金", 55, 0.7, 4, 0],
      ["liquidity-gold", "1.2 黄金", 8, 0.08, 0.7, 1],
      ["liquidity-excess-reserves", "1.3 超额准备金存款", 75, 0.9, 5, 2],
      ["liquidity-receivables", "1.5 一个月内到期的应收利息及其他应收款", 31, 0.4, 2.4, 4],
      ["liquidity-qualified-loans", "1.6 一个月内到期的合格贷款", 86, 1.1, 5.5, 5],
      ["liquidity-bond-investments", "1.7 一个月内到期的债券投资", 64, 0.8, 4, 6],
      ["liquidity-marketable-securities", "1.8 可随时变现的证券投资（不含1.7）", 52, 0.65, 3.5, 7],
      ["liquidity-other-assets", "1.9 其他一个月内到期可变现的资产（剔除不良资产）", 28, 0.35, 2, 8],
    ].map(([key, title, base, slope, wave, phase]) => ({
      key,
      title,
      values: buildDiagnosticAmountSeries(count, normalizedOffset, base, slope, wave, phase),
    }));
    const liquidityOtherLiabilityItems = [
      ["liquidity-demand-deposits", "2.1 活期存款（不含财政性存款）", 112, 1.4, 6, 1],
      ["liquidity-term-deposits", "2.2 一个月内到期的定期存款（不含财政性存款）", 96, 1.2, 5.5, 2],
      ["liquidity-issued-bonds", "2.4 一个月内到期的已发行债券", 44, 0.6, 3, 4],
      ["liquidity-payables", "2.5 一个月内到期的应付利息和各项应付款", 34, 0.45, 2.6, 5],
      ["liquidity-central-bank-borrowings", "2.6 一个月内到期的向中央银行借款", 30, 0.4, 2.3, 6],
      ["liquidity-other-liabilities", "2.7 其他一个月内到期的负债", 36, 0.5, 2.8, 7],
    ].map(([key, title, base, slope, wave, phase]) => ({
      key,
      title,
      values: buildDiagnosticAmountSeries(count, normalizedOffset, base, slope, wave, phase),
    }));
    const interbankNetPosition = Array.from({ length: count }, (_, index) => Number((
      30 * Math.sin((index + normalizedOffset) / 1.7)
      + 9 * Math.cos((index + normalizedOffset) / 3.1)
      - 3
    ).toFixed(1)));
    const interbankAssetItem = {
      key: LIQUIDITY_RATIO_INTERBANK_ASSET_KEY,
      title: "1.4 一个月内到期的同业往来款项轧差后资产方净额",
      values: interbankNetPosition.map((value) => Math.max(value, 0)),
    };
    const interbankLiabilityItem = {
      key: LIQUIDITY_RATIO_INTERBANK_LIABILITY_KEY,
      title: "2.3 一个月内到期的同业往来款项轧差后负债方净额",
      values: interbankNetPosition.map((value) => Math.max(-value, 0)),
    };
    const liquidityAssetItems = [
      ...liquidityOtherAssetItems.slice(0, 3),
      interbankAssetItem,
      ...liquidityOtherAssetItems.slice(3),
    ];
    const liquidityLiabilityItems = [
      ...liquidityOtherLiabilityItems.slice(0, 2),
      interbankLiabilityItem,
      ...liquidityOtherLiabilityItems.slice(2),
    ];
    const liquidityAssets = sumDiagnosticSeries(liquidityAssetItems, count);
    const liquidityLiabilities = sumDiagnosticSeries(liquidityLiabilityItems, count);
    const ratios = liquidityAssets.map((value, index) => (value / liquidityLiabilities[index]) * 100);
    return {
      kind,
      labels,
      displayLabels: buildEveDisplayLabels(labels),
      signature,
      title: "流动性比例",
      numeratorTitle: "流动性资产",
      denominatorTitle: "流动性负债",
      numerator: liquidityAssets,
      denominator: liquidityLiabilities,
      ratios,
      components: {
        liquidityAssetItems,
        liquidityLiabilityItems,
        liquidityOtherAssetItems,
        liquidityOtherLiabilityItems,
        interbankNetPosition,
      },
    };
  }

  if (kind === "nsfr") {
    const availableStableFunding = Array.from({ length: count }, (_, index) =>
      Number((610 + normalizedOffset * 2.6 + index * 7.8 + Math.sin((index + normalizedOffset) / 2.4) * 24).toFixed(1))
    );
    const requiredStableFunding = Array.from({ length: count }, (_, index) =>
      Number((720 + normalizedOffset * 2.2 + index * 6.1 + Math.cos((index + normalizedOffset) / 2.8) * 18).toFixed(1))
    );
    const ratios = availableStableFunding.map((value, index) => (value / requiredStableFunding[index]) * 100);
    return {
      kind,
      labels,
      displayLabels: buildEveDisplayLabels(labels),
      signature,
      title: "净稳定资金比例NSFR",
      numeratorTitle: "可用的稳定资金",
      denominatorTitle: "所需的稳定资金",
      numerator: availableStableFunding,
      denominator: requiredStableFunding,
      ratios,
      components: {
        availableStableFunding,
        requiredStableFunding,
      },
    };
  }

  const level1Assets = Array.from({ length: count }, (_, index) =>
    Number((238 + normalizedOffset * 2.1 + index * 4.6 + Math.sin((index + normalizedOffset) / 2.8) * 14).toFixed(1))
  );
  const level2AAssets = Array.from({ length: count }, (_, index) =>
    Number((78 + normalizedOffset * 0.8 + index * 1.7 + Math.cos((index + normalizedOffset) / 2.5) * 7).toFixed(1))
  );
  const level2BAssets = Array.from({ length: count }, (_, index) =>
    Number((42 + normalizedOffset * 0.5 + index * 1.2 + Math.sin((index + normalizedOffset) / 3.2) * 5).toFixed(1))
  );
  const hqla = level1Assets.map((value, index) =>
    value + level2AAssets[index] + level2BAssets[index]
  );
  const cashOutflows = Array.from({ length: count }, (_, index) =>
    Number((548 + normalizedOffset * 3.4 + index * 6.8 + Math.sin((index + normalizedOffset) / 2.1) * 22).toFixed(1))
  );
  const cashInflows = Array.from({ length: count }, (_, index) =>
    Number((258 + normalizedOffset * 1.7 + index * 3.5 + Math.cos((index + normalizedOffset) / 2.7) * 15).toFixed(1))
  );
  const rawNetOutflows = cashOutflows.map((value, index) => value - cashInflows[index]);
  const minimumNetOutflows = cashOutflows.map((value) => value * 0.25);
  const adjustedNetOutflows = rawNetOutflows.map((value, index) =>
    Math.max(value, minimumNetOutflows[index])
  );
  // LCR正式归因使用原始精度，页面展示阶段再统一四舍五入。
  const ratios = hqla.map((value, index) =>
    adjustedNetOutflows[index] ? (value / adjustedNetOutflows[index]) * 100 : 0
  );
  return {
    kind: "lcr",
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    title: "流动性覆盖率LCR",
    numeratorTitle: "合格优质流动性资产HQLA",
    denominatorTitle: "经调整后净现金流出",
    numerator: hqla,
    denominator: adjustedNetOutflows,
    ratios,
    components: {
      cashOutflows,
      cashInflows,
      rawNetOutflows,
      minimumNetOutflows,
      adjustedNetOutflows,
      hqla,
      level1Assets,
      level2AAssets,
      level2BAssets,
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
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame, { maxValue });
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
        role="button"
        tabindex="0"
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
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-label="${model.title}走势，数据点可查看计算过程">
        ${axis}
        ${managementLimitOverlay}
        <polyline fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${pointMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, { ...chartContext, seriesList: [model.title], allSeriesList: [model.title], legendItems: [{ label: model.title, color }] })}
      ${renderManagementLimitLegend(widget, chartContext)}
    </div>
  `;
}

function renderLiquidityPointPopover(widget, model, point, index, metric = "ratio") {
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  const isGapAmount = model.kind === "liquidityGap" && metric === "amount";
  const displayedValue = isGapAmount
    ? formatEveAmount(model.components.liquidityGap[index])
    : formatEvePercent(model.ratios[index]);
  return `
    <div class="eve-point-popover eve-point-popover--compact" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__grid eve-point-popover__grid--compact">
        <div><span>日期</span><strong>${model.displayLabels[index]}</strong></div>
        <div><span>${isGapAmount ? "缺口规模" : "取值"}</span><strong>${displayedValue}</strong></div>
      </div>
      <button
        class="eve-point-popover__action"
        type="button"
        data-open-liquidity-process="true"
        data-widget-seq="${widget.seq}"
        data-liquidity-kind="${model.kind}"
        data-liquidity-metric="${metric}"
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
    ? ["一级资产", "2A资产", "2B资产", "现金流出", "现金流入", "原始净现金流出", "25%现金流出", "经调整后净现金流出"]
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
                ${model.kind === "lcr" ? `
                  <td>${formatEveAmount(model.components.level1Assets[index])}</td>
                  <td>${formatEveAmount(model.components.level2AAssets[index])}</td>
                  <td>${formatEveAmount(model.components.level2BAssets[index])}</td>
                  <td>${formatEveAmount(model.components.cashOutflows[index])}</td>
                  <td>${formatEveAmount(model.components.cashInflows[index])}</td>
                  <td>${formatEveAmount(model.components.rawNetOutflows[index])}</td>
                  <td>${formatEveAmount(model.components.minimumNetOutflows[index])}</td>
                  <td>${formatEveAmount(model.components.adjustedNetOutflows[index])}</td>
                ` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLiquidityRatioAttributionFormula() {
  return `
    <div class="eve-process-formula eve-process-formula--steps">
      <span class="eve-process-formula__step"><strong>监管公式：</strong>流动性比例 = 流动性资产 ÷ 流动性负债 × 100%</span>
      <span class="eve-process-formula__step"><strong>归因表达式：</strong>流动性比例 = [其他流动性资产A + max（同业轧差净头寸N，0）] ÷ [其他流动性负债L + max（-N，0）] × 100%</span>
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
    filterState: getDiagnosticWidgetFilterState("liquidity-risk", widget.seq || state.widgetSeq || 42),
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const comparisonIndex = getProcessComparisonIndex(state, selectedIndex, model.labels.length);
  const activeNode = state.activeNode || "ratio";
  const isLcr = model.kind === "lcr";
  const isLiquidityRatio = model.kind === "liquidityRatio";
  const isLiquidityGap = model.kind === "liquidityGap";
  const isLiquidityGapAmount = isLiquidityGap && state.metric === "amount";
  const hasExpandableFactors = isLcr || isLiquidityRatio || isLiquidityGap;
  const processResultTitle = isLiquidityGapAmount ? model.numeratorTitle : model.title;
  const processResultSeries = isLiquidityGapAmount ? model.components.liquidityGap : model.ratios;
  const processResultValue = isLiquidityGapAmount
    ? formatEveAmount(processResultSeries[selectedIndex])
    : formatEvePercent(processResultSeries[selectedIndex]);
  const impactMap = buildLiquidityProcessImpactMap(model, selectedIndex, comparisonIndex, state.metric || "ratio");
  const impactType = isLiquidityGapAmount ? "amount" : "pct";

  liquidityProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="liquidityProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="liquidityProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="liquidityProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="liquidityProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        ${renderProcessDateContext(model.displayLabels, comparisonIndex, selectedIndex)}
        <div class="eve-process-slider">
          ${renderProcessDualDateSlider(model.displayLabels, comparisonIndex, selectedIndex)}
          ${isLcr
            ? `<div class="eve-process-formula">LCR = 合格优质流动性资产HQLA ÷ 经调整后净现金流出</div>`
            : isLiquidityRatio
              ? renderLiquidityRatioAttributionFormula()
              : isLiquidityGap
                ? isLiquidityGapAmount
                  ? `<div class="eve-process-formula">${model.selectedTenor}流动性缺口 = ${model.selectedTenor}累计到期表内外资产（含内部交易）- ${model.selectedTenor}累计到期表内外负债（含内部交易）+ ${model.selectedTenor}活期存款调整 + ${model.selectedTenor}活期存放调整</div>`
                  : `
                    <div class="eve-process-formula eve-process-formula--steps">
                      <span class="eve-process-formula__step">
                        <strong>监管公式：</strong>${model.selectedTenor}流动性缺口率 = [${model.selectedTenor}累计到期表内外资产（含内部交易）- ${model.selectedTenor}累计到期表内外负债（含内部交易，调整活期）] ÷ ${model.selectedTenor}累计到期表内外资产（含内部交易）
                      </span>
                      <span class="eve-process-formula__step">
                        <strong>等价变形：</strong>${model.selectedTenor}流动性缺口率 = 100% - ${model.selectedTenor}累计到期表内外负债（含内部交易，调整活期）÷ ${model.selectedTenor}累计到期表内外资产（含内部交易；各组成项为同一期限范围）
                      </span>
                    </div>
                  `
                : `<div class="eve-process-formula">NSFR = 可用的稳定资金 ÷ 所需的稳定资金</div>`}
        </div>
      </div>
      <div class="eve-process-flow">
        <div class="eve-process-flow__canvas${isLiquidityRatio ? " liquidity-ratio-process-flow__canvas" : ""}${isLiquidityGap ? (isLiquidityGapAmount ? " liquidity-gap-amount-flow__canvas" : " liquidity-gap-complement-flow__canvas") : ""}">
          <div class="eve-process-flow__lane${isLiquidityRatio ? " liquidity-ratio-process-flow__lane" : ""}${isLiquidityGap ? (isLiquidityGapAmount ? " liquidity-gap-amount-flow__lane" : " liquidity-gap-complement-flow__lane") : ""}">
            ${renderEveProcessNode({
              key: isLiquidityGapAmount ? "gap" : "ratio",
              title: processResultTitle,
              value: processResultValue,
              series: processResultSeries,
              selectedIndex,
              comparisonIndex,
              activeNode,
              dataAttribute: "data-liquidity-process-node",
              changeType: isLiquidityGapAmount ? "amountDelta" : (isLcr ? "delta2" : "delta"),
              valueFormat: isLiquidityGapAmount ? "amount" : "percent",
              labels: model.displayLabels,
              impact: impactMap[isLiquidityGapAmount ? "gap" : "ratio"],
              impactType,
              nodeKind: "result",
            })}
            <div class="eve-process-operator">=</div>
            ${isLiquidityGap
              ? isLiquidityGapAmount
                ? renderLiquidityGapAmountExpression(model, selectedIndex, comparisonIndex, activeNode, state.detailExpandedNodes, impactMap)
                : renderLiquidityGapComplementExpression(model, selectedIndex, comparisonIndex, activeNode, state.detailExpandedNodes, impactMap)
              : `
                <div class="eve-process-factor-stack">
                  ${renderEveProcessNode({
                    key: "numerator",
                    title: model.numeratorTitle,
                    value: formatEveAmount(model.numerator[selectedIndex]),
                    series: model.numerator,
                    selectedIndex,
                    comparisonIndex,
                    activeNode,
                    actionText: hasExpandableFactors ? (state.numeratorExpanded ? "点击收回" : "点击展开") : "",
                    dataAttribute: "data-liquidity-process-node",
                    valueFormat: "amount",
                    labels: model.displayLabels,
                    impact: impactMap.numerator,
                  })}
                  <div class="eve-process-division eve-process-division--quotient">÷</div>
                  ${renderEveProcessNode({
                    key: "denominator",
                    title: model.denominatorTitle,
                    value: formatEveAmount(model.denominator[selectedIndex]),
                    series: model.denominator,
                    selectedIndex,
                    comparisonIndex,
                    activeNode,
                    actionText: hasExpandableFactors ? (state.denominatorExpanded ? "点击收回" : "点击展开") : "",
                    dataAttribute: "data-liquidity-process-node",
                    valueFormat: "amount",
                    labels: model.displayLabels,
                    impact: impactMap.denominator,
                  })}
                </div>
                <div class="eve-process-connector" aria-hidden="true"></div>
                <div class="eve-process-expansions liquidity-process-expansions${hasExpandableFactors ? " liquidity-process-expansions--ratio" : ""}">
                  <div class="eve-process-expansion-slot eve-process-expansion-slot--wide">
                    ${isLcr && state.numeratorExpanded
                      ? renderLiquidityLcrHqlaExpansion(model, selectedIndex, comparisonIndex, activeNode, impactMap)
                      : isLiquidityRatio && state.numeratorExpanded
                        ? renderLiquidityRatioComponentExpansion("流动性资产", model.components.liquidityAssetItems, model.displayLabels, selectedIndex, comparisonIndex, activeNode, impactMap)
                        : ""}
                  </div>
                  ${hasExpandableFactors ? `
                    <div class="eve-process-expansion-slot eve-process-expansion-slot--wide">
                      ${isLcr && state.denominatorExpanded
                        ? renderLiquidityLcrNetOutflowExpansion(model, selectedIndex, comparisonIndex, activeNode, state.detailExpandedNode, impactMap)
                        : isLiquidityRatio && state.denominatorExpanded
                          ? renderLiquidityRatioComponentExpansion("流动性负债", model.components.liquidityLiabilityItems, model.displayLabels, selectedIndex, comparisonIndex, activeNode, impactMap)
                          : ""}
                    </div>
                  ` : ""}
                </div>
              `}
          </div>
        </div>
      </div>
    </section>
  `;
  liquidityProcessModalEl.classList.add("is-open");
  liquidityProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderLiquidityLcrHqlaExpansion(model, selectedIndex, comparisonIndex, activeNode, impactMap = {}) {
  const nodeOptions = { selectedIndex, comparisonIndex, activeNode, dataAttribute: "data-liquidity-process-node", valueFormat: "amount", labels: model.displayLabels };
  return `
    <div class="eve-process-expansion">
      <div class="eve-process-expansion__formula">合格优质流动性资产HQLA = 一级资产 + 2A资产 + 2B资产</div>
      <div class="eve-process-capital-strip liquidity-process-component-strip liquidity-process-component-strip--ratio">
        ${renderEveProcessNode({
          ...nodeOptions,
          key: "level-1-assets",
          title: "一级资产",
          value: formatEveAmount(model.components.level1Assets[selectedIndex]),
          series: model.components.level1Assets,
          impact: impactMap["level-1-assets"],
        })}
        <span class="eve-process-mini-operator">+</span>
        ${renderEveProcessNode({
          ...nodeOptions,
          key: "level-2a-assets",
          title: "2A资产",
          value: formatEveAmount(model.components.level2AAssets[selectedIndex]),
          series: model.components.level2AAssets,
          impact: impactMap["level-2a-assets"],
        })}
        <span class="eve-process-mini-operator">+</span>
        ${renderEveProcessNode({
          ...nodeOptions,
          key: "level-2b-assets",
          title: "2B资产",
          value: formatEveAmount(model.components.level2BAssets[selectedIndex]),
          series: model.components.level2BAssets,
          impact: impactMap["level-2b-assets"],
        })}
      </div>
    </div>
  `;
}

function renderLiquidityLcrNetOutflowExpansion(model, selectedIndex, comparisonIndex, activeNode, detailExpandedNode = "", impactMap = {}) {
  const nodeOptions = { selectedIndex, comparisonIndex, activeNode, dataAttribute: "data-liquidity-process-node", valueFormat: "amount", labels: model.displayLabels };
  const rawNetOutflowExpanded = detailExpandedNode === "raw-net-outflow";
  return `
    <div class="eve-process-expansion">
      <div class="eve-process-expansion__formula">
        经调整后净现金流出 = max（原始净现金流出，0.25 × 现金流出）
      </div>
      <div class="lcr-net-outflow-tree">
        <div class="lcr-net-outflow-tree__row${rawNetOutflowExpanded ? " is-expanded" : ""}">
          ${renderEveProcessNode({
            ...nodeOptions,
            key: "raw-net-outflow",
            title: "原始净现金流出",
            value: formatEveAmount(model.components.rawNetOutflows[selectedIndex]),
            series: model.components.rawNetOutflows,
            actionText: rawNetOutflowExpanded ? "点击收回" : "点击展开",
            showImpact: false,
            nodeKind: "intermediate",
          })}
          ${rawNetOutflowExpanded ? `
            <div class="eve-process-connector lcr-net-outflow-tree__connector" aria-hidden="true"></div>
            <div class="lcr-net-outflow-tree__children">
              ${renderLiquidityGapFormulaStrip([
                { key: "cash-outflow", title: "未来30天现金流出量", values: model.components.cashOutflows },
                { key: "cash-inflow", title: "未来30天现金流入量（反向计入）", values: model.components.cashInflows },
              ], model, selectedIndex, comparisonIndex, activeNode, "lcr-direct-max", impactMap)}
            </div>
          ` : ""}
        </div>
        <div class="lcr-net-outflow-tree__operator">
          <span class="eve-process-mini-operator eve-process-mini-operator--text">max</span>
        </div>
        <div class="lcr-net-outflow-tree__row">
          ${renderEveProcessNode({
            ...nodeOptions,
            key: "minimum-net-outflow",
            title: "25%现金流出",
            value: formatEveAmount(model.components.minimumNetOutflows[selectedIndex]),
            series: model.components.minimumNetOutflows,
            showImpact: false,
            nodeKind: "intermediate",
          })}
        </div>
      </div>
    </div>
  `;
}

function renderLiquidityRatioComponentExpansion(title, items, labels, selectedIndex, comparisonIndex, activeNode, impactMap = {}) {
  const nodeOptions = { selectedIndex, comparisonIndex, activeNode, dataAttribute: "data-liquidity-process-node", valueFormat: "amount" };
  return `
    <div class="eve-process-expansion">
      <div class="eve-process-expansion__formula">${title} = ${items.map((item) => item.title).join(" + ")}</div>
      <div class="eve-process-capital-strip liquidity-process-component-strip liquidity-process-component-strip--ratio">
        ${items.map((item, index) => `
          ${index ? `<span class="eve-process-mini-operator">+</span>` : ""}
          ${renderEveProcessNode({
            ...nodeOptions,
            key: item.key,
            title: item.title,
            value: formatEveAmount(item.values[selectedIndex]),
            series: item.values,
            actionText: item.actionText || "",
            labels,
            impact: impactMap[item.key],
          })}
        `).join("")}
      </div>
    </div>
  `;
}

function renderLiquidityGapFormulaStrip(items, model, selectedIndex, comparisonIndex, activeNode, layout = "leaf", impactMap = {}, impactType = "pct") {
  const nodeOptions = {
    selectedIndex,
    comparisonIndex,
    activeNode,
    dataAttribute: "data-liquidity-process-node",
    valueFormat: "amount",
    labels: model.displayLabels,
  };
  return `
    <div class="eve-process-capital-strip liquidity-process-component-strip liquidity-gap-process-strip${layout === "branch" ? " liquidity-gap-process-strip--branch" : ""}${["lcr-bridge", "lcr-direct-max"].includes(layout) ? " lcr-denominator-bridge-strip" : ""}">
      ${items.map((item, index) => `
        ${index ? `<span class="eve-process-mini-operator">${item.operator || "+"}</span>` : ""}
        ${renderEveProcessNode({
          ...nodeOptions,
          key: item.key,
          title: item.title,
          value: formatEveAmount(item.values[selectedIndex]),
          series: item.values,
          actionText: item.actionText || "",
          impact: impactMap[item.key],
          impactType,
        })}
      `).join("")}
    </div>
  `;
}

function renderLiquidityGapComplementBranch(branch, model, selectedIndex, comparisonIndex, activeNode, expandedNodeKeys, impactMap = {}, impactType = "pct") {
  const isExpanded = expandedNodeKeys.includes(branch.key);
  return `
    <div class="liquidity-gap-branch-row${isExpanded ? " is-expanded" : ""}">
      ${renderEveProcessNode({
        key: branch.key,
        title: branch.title,
        value: formatEveAmount(branch.values[selectedIndex]),
        series: branch.values,
        selectedIndex,
        comparisonIndex,
        activeNode,
        actionText: isExpanded ? "点击收回" : "点击展开",
        dataAttribute: "data-liquidity-process-node",
        valueFormat: "amount",
        labels: model.displayLabels,
        impact: impactMap[branch.key],
        impactType,
      })}
      ${isExpanded ? `
        <div class="eve-process-connector liquidity-gap-branch-row__connector" aria-hidden="true"></div>
        <div class="liquidity-gap-branch-row__children">
          <div class="eve-process-expansion__formula">${branch.formula}</div>
          ${renderLiquidityGapFormulaStrip(branch.children, model, selectedIndex, comparisonIndex, activeNode, "leaf", impactMap, impactType)}
        </div>
      ` : ""}
    </div>
  `;
}

function renderLiquidityGapAdjustedLiabilityBranch(branch, componentBranches, model, selectedIndex, comparisonIndex, activeNode, expandedNodeKeys, impactMap = {}) {
  const isExpanded = expandedNodeKeys.includes(branch.key);
  return `
    <div class="liquidity-gap-branch-row liquidity-gap-adjusted-liability-row${isExpanded ? " is-expanded" : ""}">
      ${renderEveProcessNode({
        key: branch.key,
        title: branch.title,
        value: formatEveAmount(branch.values[selectedIndex]),
        series: branch.values,
        selectedIndex,
        comparisonIndex,
        activeNode,
        actionText: isExpanded ? "点击收回" : "点击展开",
        dataAttribute: "data-liquidity-process-node",
        valueFormat: "amount",
        labels: model.displayLabels,
        impact: impactMap[branch.key],
      })}
      ${isExpanded ? `
        <div class="eve-process-connector liquidity-gap-branch-row__connector" aria-hidden="true"></div>
        <div class="liquidity-gap-branch-row__children liquidity-gap-adjusted-liability__children">
          <div class="eve-process-expansion__formula">${branch.formula}</div>
          <div class="liquidity-gap-component-tree">
            ${componentBranches.map((componentBranch, index) => {
              const componentExpanded = expandedNodeKeys.includes(componentBranch.key);
              return `
                ${index ? `
                  <div class="liquidity-gap-component-tree__operator">
                    <span class="eve-process-mini-operator">${componentBranch.operator || "+"}</span>
                  </div>
                ` : ""}
                <div class="liquidity-gap-component-row${componentExpanded ? " is-expanded" : ""}">
                  ${renderEveProcessNode({
                    key: componentBranch.key,
                    title: componentBranch.title,
                    value: formatEveAmount(componentBranch.values[selectedIndex]),
                    series: componentBranch.values,
                    selectedIndex,
                    comparisonIndex,
                    activeNode,
                    actionText: componentExpanded ? "点击收回" : "点击展开",
                    dataAttribute: "data-liquidity-process-node",
                    valueFormat: "amount",
                    labels: model.displayLabels,
                    impact: impactMap[componentBranch.key],
                  })}
                  ${componentExpanded ? `
                    <div class="eve-process-connector liquidity-gap-component-row__connector" aria-hidden="true"></div>
                    <div class="liquidity-gap-component-row__children">
                      <div class="eve-process-expansion__formula">${componentBranch.formula}</div>
                      ${renderLiquidityGapFormulaStrip(componentBranch.children, model, selectedIndex, comparisonIndex, activeNode, "leaf", impactMap)}
                    </div>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function buildLiquidityGapProcessBranches(model) {
  const components = model.components;
  const liabilityBranch = {
    key: "due-on-off-balance-liabilities",
    title: `${model.selectedTenor}累计到期表内外负债（含内部交易）`,
    values: components.dueOnOffBalanceLiabilities,
    formula: `${model.selectedTenor}累计到期表内外负债（含内部交易） = ${model.selectedTenor}累计到期表内负债 + 表外支出 + 内部交易负债`,
    children: [
      { key: "liability-total", title: `${model.selectedTenor}累计到期表内负债`, values: components.liabilityTotal },
      { key: "off-balance-expense", title: "表外支出", values: components.offBalanceExpense, operator: "+" },
      { key: "internal-transaction-liabilities", title: "内部交易负债", values: components.internalTransactionLiabilities, operator: "+" },
    ],
  };
  const demandDepositBranch = {
    key: "demand-deposit-adjustment",
    title: `${model.selectedTenor}活期存款调整`,
    values: components.demandDepositAdjustment,
    operator: "-",
    formula: `${model.selectedTenor}活期存款调整 = 3.5.2活期存款 - 附注活期存款`,
    children: [
      { key: "demand-deposits", title: "3.5.2 活期存款", values: components.demandDeposits },
      { key: "note-demand-deposits", title: "附注：活期存款", values: components.noteDemandDeposits, operator: "-" },
    ],
  };
  const demandPlacementBranch = {
    key: "demand-placement-adjustment",
    title: `${model.selectedTenor}活期存放调整`,
    values: components.demandPlacementAdjustment,
    operator: "-",
    formula: `${model.selectedTenor}活期存放调整 = 3.2活期存放 - 附注活期存放`,
    children: [
      { key: "demand-placements", title: "3.2 活期存放", values: components.demandPlacements },
      { key: "note-demand-placements", title: "附注：活期存放", values: components.noteDemandPlacements, operator: "-" },
    ],
  };
  const assetBranch = {
    key: "due-on-off-balance-assets",
    title: `${model.selectedTenor}累计到期表内外资产（含内部交易）`,
    values: components.dueOnOffBalanceAssets,
    formula: `${model.selectedTenor}累计到期表内外资产（含内部交易） = ${model.selectedTenor}累计到期表内资产 + 表外收入 + 内部交易资产`,
    children: [
      { key: "asset-total", title: `${model.selectedTenor}累计到期表内资产`, values: components.assetTotal },
      { key: "off-balance-income", title: "表外收入", values: components.offBalanceIncome, operator: "+" },
      { key: "internal-transaction-assets", title: "内部交易资产", values: components.internalTransactionAssets, operator: "+" },
    ],
  };
  const adjustedLiabilityBranch = {
    key: "adjusted-due-on-off-balance-liabilities",
    title: `${model.selectedTenor}累计到期表内外负债（含内部交易，调整活期）`,
    values: components.adjustedDueOnOffBalanceLiabilities,
    formula: `${model.selectedTenor}累计到期表内外负债（含内部交易，调整活期） = ${model.selectedTenor}累计到期表内外负债（含内部交易）- ${model.selectedTenor}活期存款调整 - ${model.selectedTenor}活期存放调整`,
  };
  return {
    assetBranch,
    liabilityBranch,
    demandDepositBranch,
    demandPlacementBranch,
    adjustedLiabilityBranch,
  };
}

function normalizeLiquidityGapExpandedNodeKeys(detailExpandedNodes) {
  return Array.isArray(detailExpandedNodes)
    ? detailExpandedNodes
    : detailExpandedNodes
      ? [detailExpandedNodes]
      : [];
}

function renderLiquidityGapAmountExpression(model, selectedIndex, comparisonIndex, activeNode, detailExpandedNodes = [], impactMap = {}) {
  const expandedNodeKeys = normalizeLiquidityGapExpandedNodeKeys(detailExpandedNodes);
  const {
    assetBranch,
    liabilityBranch,
    demandDepositBranch,
    demandPlacementBranch,
  } = buildLiquidityGapProcessBranches(model);
  const branches = [
    { branch: assetBranch, operator: "" },
    { branch: liabilityBranch, operator: "−" },
    { branch: demandDepositBranch, operator: "+" },
    { branch: demandPlacementBranch, operator: "+" },
  ];
  return `
    <div class="liquidity-gap-process-detail liquidity-gap-amount-expression">
      <div class="liquidity-gap-branch-tree">
        ${branches.map(({ branch, operator }) => `
          ${operator ? `<div class="liquidity-gap-branch-tree__operator"><span class="eve-process-mini-operator">${operator}</span></div>` : ""}
          ${renderLiquidityGapComplementBranch(
            branch,
            model,
            selectedIndex,
            comparisonIndex,
            activeNode,
            expandedNodeKeys,
            impactMap,
            "amount",
          )}
        `).join("")}
      </div>
    </div>
  `;
}

function renderLiquidityGapComplementExpression(model, selectedIndex, comparisonIndex, activeNode, detailExpandedNodes = [], impactMap = {}) {
  const expandedNodeKeys = normalizeLiquidityGapExpandedNodeKeys(detailExpandedNodes);
  const {
    assetBranch: denominatorBranch,
    liabilityBranch,
    demandDepositBranch,
    demandPlacementBranch,
    adjustedLiabilityBranch,
  } = buildLiquidityGapProcessBranches(model);
  const numeratorBranches = [liabilityBranch, demandDepositBranch, demandPlacementBranch];
  return `
    <div class="liquidity-gap-complement-expression">
      <div class="liquidity-gap-complement-constant" data-liquidity-gap-constant="true">
        <span>固定值</span>
        <strong>100%</strong>
      </div>
      <div class="eve-process-operator liquidity-gap-complement-minus" aria-label="减">−</div>
      <div class="liquidity-gap-complement-fraction">
        <div class="liquidity-gap-complement-fraction__numerator" aria-label="分子">
          ${renderLiquidityGapAdjustedLiabilityBranch(
            adjustedLiabilityBranch,
            numeratorBranches,
            model,
            selectedIndex,
            comparisonIndex,
            activeNode,
            expandedNodeKeys,
            impactMap,
          )}
        </div>
        <div class="liquidity-gap-complement-fraction__divider" aria-label="除以">
          <span>÷</span>
        </div>
        <div class="liquidity-gap-complement-fraction__denominator" aria-label="分母">
          ${renderLiquidityGapComplementBranch(
            denominatorBranch,
            model,
            selectedIndex,
            comparisonIndex,
            activeNode,
            expandedNodeKeys,
            impactMap,
          )}
        </div>
      </div>
    </div>
  `;
}

function renderRepricingGapRateChart(widget, chartContext) {
  const model = buildRepricingGapDiagnosticModel(widget, chartContext);
  const frame = createFrame(model.labels.length);
  const axis = renderAxes(frame, model.labels, "缺口率 (%)");
  const baselineRatios = model.baselineRatios || model.ratios;
  const simulatedRatios = model.simulatedRatios || null;
  const ratioPoints = scaleValuesToFrame(baselineRatios, frame, 0, 100);
  const ratioPath = ratioPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const simulatedPoints = simulatedRatios ? scaleValuesToFrame(simulatedRatios, frame, 0, 100) : [];
  const simulatedPath = simulatedPoints.map((point) => `${point.x},${point.y}`).join(" ");
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
          role="button"
          tabindex="0"
          data-repricing-gap-point="true"
          data-widget-seq="${widget.seq}"
          data-source-widget-seq="${widget.sourceSeq || widget.seq}"
          data-date-index="${index}"
          data-repricing-gap-signature="${model.signature}"
          data-repricing-gap-labels="${model.labels.join("||")}"
          aria-label="${model.displayLabels[index]} ${model.supportsAttribution ? "查看计算过程" : "查看取值"}"
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
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-label="重定价缺口率走势，数据点可查看计算过程">
        ${axis}
        ${managementLimitOverlay}
        <polyline fill="none" stroke="${REPRICING_GAP_COLOR}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${ratioPath}"></polyline>
        ${simulatedRatios ? `<polyline fill="none" stroke="${EVE_COLOR_WORST}" stroke-width="3.6" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" points="${simulatedPath}"></polyline>` : ""}
        ${pointMarkup}
        ${simulatedRatios && Number.isInteger(model.simulationTargetIndex) ? `
          <circle
            cx="${simulatedPoints[model.simulationTargetIndex].x}"
            cy="${simulatedPoints[model.simulationTargetIndex].y}"
            r="6"
            fill="#ffffff"
            stroke="${EVE_COLOR_WORST}"
            stroke-width="3"
            data-repricing-simulation-point="true"
          >
            <title>${model.displayLabels[model.simulationTargetIndex]} 测算后 ${formatRepricingGapPercent(simulatedRatios[model.simulationTargetIndex])}</title>
          </circle>
        ` : ""}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, {
        ...chartContext,
        seriesList: simulatedRatios ? ["基准重定价缺口率", "测算后重定价缺口率"] : ["重定价缺口率"],
        allSeriesList: simulatedRatios ? ["基准重定价缺口率", "测算后重定价缺口率"] : ["重定价缺口率"],
        legendItems: simulatedRatios
          ? [
            { label: "基准重定价缺口率", color: REPRICING_GAP_COLOR },
            { label: "测算后重定价缺口率", color: EVE_COLOR_WORST },
          ]
          : [{ label: "重定价缺口率", color: REPRICING_GAP_COLOR }],
      })}
      ${renderManagementLimitLegend(widget, chartContext)}
    </div>
  `;
}

function renderRepricingGapPointPopover(widget, model, point, index) {
  const ratio = model.ratios[index];
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  return `
    <div class="eve-point-popover eve-point-popover--compact" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__grid eve-point-popover__grid--compact">
        <div><span>日期</span><strong>${model.displayLabels[index]}</strong></div>
        <div><span>取值</span><strong>${formatRepricingGapPercent(ratio)}</strong></div>
      </div>
      ${model.supportsAttribution ? `
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
      ` : `
        <div class="eve-point-popover__hint">仅“不含活期存款、含银行账簿和交易账簿表外衍生品”口径支持拆解归因</div>
      `}
    </div>
  `;
}

function sumDiagnosticSeries(items = [], count = 0) {
  return Array.from({ length: count }, (_, index) => Number(items.reduce((sum, item) =>
    sum + Number((item.values || item)[index] || 0)
  , 0).toFixed(1)));
}

function buildDiagnosticAmountSeries(count, normalizedOffset, base, slope, wave, phase = 0) {
  return Array.from({ length: count }, (_, index) => Number((
    base
    + normalizedOffset * base * 0.003
    + index * slope
    + Math.sin((index + normalizedOffset + phase) / 2.7) * wave
  ).toFixed(1)));
}

function allocateRepricingWithinOneYearBuckets(adjustedScale, totalScale, repricingWeights) {
  const adjusted = assertProcessFiniteNumber(adjustedScale, "期限调整后重定价规模");
  const total = assertProcessFiniteNumber(totalScale, "总生息资产规模");
  if (adjusted < 0 || total < 0 || adjusted > total + 1e-9) {
    throw new RangeError("重定价规模必须满足0≤重定价规模≤总生息资产规模");
  }
  if (!Array.isArray(repricingWeights) || !repricingWeights.length) {
    throw new RangeError("缺少一年内重定价期限权重");
  }
  const weights = repricingWeights.map((value, index) => {
    const weight = assertProcessFiniteNumber(value, `重定价期限权重第${index + 1}项`);
    if (weight < 0 || weight > 1) throw new RangeError(`重定价期限权重第${index + 1}项必须位于0至1之间`);
    return weight;
  });
  const buckets = weights.map(() => 0);
  if (adjusted <= 1e-12 || total <= 1e-12) return buckets;

  const maximumWeight = Math.max(...weights);
  const positiveWeights = weights.filter((weight) => weight > 0);
  const minimumPositiveWeight = Math.min(...positiveWeights);
  if (adjusted > total * maximumWeight + 1e-9) {
    throw new RangeError("重定价规模超过一年内期限桶可实现的最大加权规模");
  }
  let withinOneYearScale = Math.min(total, Math.max(adjusted / maximumWeight, total * 0.9));
  if (adjusted / withinOneYearScale < minimumPositiveWeight) {
    withinOneYearScale = Math.min(total, adjusted / minimumPositiveWeight);
  }
  const targetAverageWeight = adjusted / withinOneYearScale;
  const ordered = weights
    .map((weight, index) => ({ weight, index }))
    .sort((left, right) => right.weight - left.weight);
  const exact = ordered.find((item) => Math.abs(item.weight - targetAverageWeight) <= 1e-12);
  if (exact) {
    buckets[exact.index] = withinOneYearScale;
    return buckets;
  }
  const upperIndex = ordered.findIndex((item, index) => (
    index < ordered.length - 1
    && item.weight > targetAverageWeight
    && ordered[index + 1].weight < targetAverageWeight
  ));
  if (upperIndex < 0) throw new RangeError("无法用一年内期限权重还原重定价规模");
  const upper = ordered[upperIndex];
  const lower = ordered[upperIndex + 1];
  const upperShare = (targetAverageWeight - lower.weight) / (upper.weight - lower.weight);
  buckets[upper.index] = withinOneYearScale * upperShare;
  buckets[lower.index] = withinOneYearScale * (1 - upperShare);
  return buckets;
}

function buildRepricingGapDiagnosticModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? [...rawLabels] : buildMonthlyXAxisLabels();
  const pageId = chartContextOrState.pageId || getCurrentPage()?.id || "interest-risk";
  const filterState = getDiagnosticFilterState(pageId, chartContextOrState);
  const demandDepositScope = (filterState["活期存款"] || [])[0] || REPRICING_GAP_DEFAULT_DEMAND_DEPOSIT_SCOPE;
  const derivativeScope = (filterState["表外衍生品"] || [])[0] || REPRICING_GAP_DEFAULT_DERIVATIVE_SCOPE;
  const caliberOptions = getRepricingGapCaliberOptions({}, { demandDepositScope, derivativeScope });
  const organizations = getDiagnosticOrganizations(pageId, chartContextOrState);
  const includesInternalTransactions = isSingleForeignBranchScope(organizations);
  const simulation = typeof getPageSimulation === "function" ? getPageSimulation(pageId) : null;
  const hasRepricingSimulation = Number(simulation?.sourceWidgetSeq) === 9 && simulation?.baseMatrix;
  let simulationTargetIndex = -1;
  if (hasRepricingSimulation) {
    const targetDate = parseDateValue(simulation.baseDate);
    const rangeStart = parseDateValue(appState.globalStartDate || getDefaultGlobalStartDate());
    const rangeEnd = parseDateValue(appState.globalEndDate || getDefaultGlobalEndDate());
    if (targetDate && rangeStart && rangeEnd) {
      const monthOffset = (targetDate.getFullYear() - rangeStart.getFullYear()) * 12 + targetDate.getMonth() - rangeStart.getMonth();
      if (monthOffset >= 0 && monthOffset < labels.length) simulationTargetIndex = monthOffset;
      else if (targetDate > rangeEnd) {
        labels.push(`${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`);
        simulationTargetIndex = labels.length - 1;
      }
    }
  }
  const dataFilterState = { ...filterState };
  delete dataFilterState["活期存款"];
  delete dataFilterState["表外衍生品"];
  const signature = Number(createSignature(widget?.seq || widget?.sourceSeq || 9, dataFilterState));
  const count = labels.length;
  const normalizedOffset = signature % 19;
  const diagnosticProfiles = {
    "self-operated-loans": [205, 2.4, 8, 0],
    "investment-assets": [132, 1.8, 6, 1],
    "interbank-assets": [92, 1.3, 5, 2],
    "non-standard-investments": [64, 0.9, 4, 3],
    "central-bank-deposits": [38, 0.6, 3, 4],
    "internal-transaction-assets": [42, 0.7, 3, 2],
    "term-deposits": [188, 2.2, 8, 1],
    "interbank-liabilities": [105, 1.4, 6, 2],
    "issued-bonds": [72, 1.0, 5, 3],
    "central-bank-borrowings": [36, 0.5, 3, 4],
    "lease-liabilities": [18, 0.3, 2, 5],
    "internal-transaction-liabilities": [33, 0.6, 2.5, 4],
    "demand-deposits": [74, 1.1, 5, 2],
  };
  const buildBusinessItems = (definitions = []) => definitions
    .filter((definition) => includesInternalTransactions || !definition.internalTransaction)
    .map((definition) => {
      const [base = 0, slope = 0, wave = 0, phase = 0] = diagnosticProfiles[definition.key] || [];
      return {
        key: definition.key,
        title: definition.label,
        values: buildDiagnosticAmountSeries(count, normalizedOffset, base, slope, wave, phase),
      };
    });
  const assetItems = buildBusinessItems(REPRICING_GAP_BUSINESS_GROUPS.assets);
  const liabilityDefinitions = caliberOptions.includeDemandDeposits
    ? [{ key: "demand-deposits", label: "活期存款" }, ...REPRICING_GAP_BUSINESS_GROUPS.liabilities]
    : REPRICING_GAP_BUSINESS_GROUPS.liabilities;
  const liabilityItems = buildBusinessItems(liabilityDefinitions);
  const bankBookReceivable = buildDiagnosticAmountSeries(count, normalizedOffset, 31, 0.4, 2.8, 1);
  const bankBookPayable = buildDiagnosticAmountSeries(count, normalizedOffset, 26, 0.35, 2.4, 3);
  const tradingBookReceivable = buildDiagnosticAmountSeries(count, normalizedOffset, 19, 0.28, 2.1, 2);
  const tradingBookPayable = buildDiagnosticAmountSeries(count, normalizedOffset, 15, 0.24, 1.8, 5);
  const rawBankBookDerivativeGap = bankBookReceivable.map((value, index) => Number((value - bankBookPayable[index]).toFixed(1)));
  const rawTradingBookDerivativeGap = tradingBookReceivable.map((value, index) => Number((value - tradingBookPayable[index]).toFixed(1)));
  const bankBookDerivativeGap = rawBankBookDerivativeGap.map((value) => caliberOptions.includeBankBookDerivatives ? value : 0);
  const tradingBookDerivativeGap = rawTradingBookDerivativeGap.map((value) => caliberOptions.includeTradingBookDerivatives ? value : 0);
  const adjustedInterestAssets = sumDiagnosticSeries(assetItems, count);
  const adjustedInterestLiabilities = sumDiagnosticSeries(liabilityItems, count);
  const totalInterestAssetItems = assetItems.map((item) => ({
    key: `total-${item.key}`,
    title: item.title,
    values: item.values.map((value, index) => Number((value * (1.48 + ((index + normalizedOffset) % 4) * 0.01)).toFixed(1))),
  }));
  const repricingWeights = [...REPRICING_GAP_BUCKET_WEIGHTS];
  const totalInterestAssetsByBusiness = Object.fromEntries(totalInterestAssetItems.map((item) => [
    item.key.replace(/^total-/, ""),
    item,
  ]));
  assetItems.forEach((item) => {
    item.withinOneYearBucketSeries = repricingWeights.map(() => Array(count).fill(0));
    item.values.forEach((adjustedScale, dateIndex) => {
      const totalScale = totalInterestAssetsByBusiness[item.key]?.values[dateIndex];
      const buckets = allocateRepricingWithinOneYearBuckets(adjustedScale, totalScale, repricingWeights);
      buckets.forEach((amount, bucketIndex) => {
        item.withinOneYearBucketSeries[bucketIndex][dateIndex] = amount;
      });
    });
  });
  const totalInterestAssets = sumDiagnosticSeries(totalInterestAssetItems, count);
  const numerator = adjustedInterestAssets.map((value, index) => Number((
    value
    - adjustedInterestLiabilities[index]
    + bankBookDerivativeGap[index]
    + tradingBookDerivativeGap[index]
  ).toFixed(1)));
  const ratios = numerator.map((value, index) => (value / totalInterestAssets[index]) * 100);
  let simulationResult = null;
  let baselineRatios = null;
  let simulatedRatios = null;
  if (hasRepricingSimulation && simulationTargetIndex >= 0) {
    simulationResult = buildRepricingGapSimulationResult(simulation, caliberOptions);
    baselineRatios = [...ratios];
    simulatedRatios = [...ratios];
    baselineRatios[simulationTargetIndex] = simulationResult.baseMetrics.ratio;
    simulatedRatios[simulationTargetIndex] = simulationResult.simulatedMetrics.ratio;
    ratios[simulationTargetIndex] = simulationResult.baseMetrics.ratio;
    totalInterestAssets[simulationTargetIndex] = simulationResult.baseMetrics.totalInterestAssets;
    assetItems.forEach((item) => {
      item.values[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
        simulationResult.baseMatrix,
        item.title
      ).adjusted;
    });
    liabilityItems.forEach((item) => {
      item.values[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
        simulationResult.baseMatrix,
        item.title
      ).adjusted;
    });
    totalInterestAssetItems.forEach((item) => {
      item.values[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
        simulationResult.baseMatrix,
        item.title
      ).total;
    });
    assetItems.forEach((item) => {
      const row = simulationResult.baseMatrix[item.title] || [];
      item.withinOneYearBucketSeries.forEach((series, bucketIndex) => {
        series[simulationTargetIndex] = assertProcessFiniteNumber(
          Number(row[bucketIndex] || 0),
          `${item.title}${REPRICING_GAP_BUCKETS[bucketIndex] || bucketIndex}期限桶`
        );
      });
    });
    adjustedInterestAssets[simulationTargetIndex] = simulationResult.baseMetrics.adjustedInterestAssets;
    adjustedInterestLiabilities[simulationTargetIndex] = simulationResult.baseMetrics.adjustedInterestLiabilities;
    bankBookReceivable[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
      simulationResult.baseMatrix,
      "银行账簿表外衍生品应收"
    ).adjusted;
    bankBookPayable[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
      simulationResult.baseMatrix,
      "银行账簿表外衍生品应付"
    ).adjusted;
    bankBookDerivativeGap[simulationTargetIndex] = simulationResult.baseMetrics.bankBookDerivativeGap;
    tradingBookReceivable[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
      simulationResult.baseMatrix,
      "交易账簿表外衍生品应收"
    ).adjusted;
    tradingBookPayable[simulationTargetIndex] = calculateRepricingGapMatrixRowMetrics(
      simulationResult.baseMatrix,
      "交易账簿表外衍生品应付"
    ).adjusted;
    tradingBookDerivativeGap[simulationTargetIndex] = simulationResult.baseMetrics.tradingBookDerivativeGap;
    numerator[simulationTargetIndex] = simulationResult.baseMetrics.repricingGap;
  }
  return {
    labels,
    displayLabels: buildEveDisplayLabels(labels),
    signature,
    limit: 38,
    totalInterestAssets,
    adjustedInterestAssets,
    adjustedInterestLiabilities,
    bankBookReceivable,
    bankBookPayable,
    bankBookDerivativeGap,
    tradingBookReceivable,
    tradingBookPayable,
    tradingBookDerivativeGap,
    assetItems,
    liabilityItems,
    totalInterestAssetItems,
    repricingWeights,
    organizations,
    includesInternalTransactions,
    ...caliberOptions,
    caliberLabel: `${caliberOptions.includeDemandDeposits ? "含" : "不含"}活期存款；表外衍生品${caliberOptions.derivativeScope}`,
    scopeLabel: includesInternalTransactions ? "含内部交易" : "不含内部交易",
    denominatorTitle: `总生息资产规模（${includesInternalTransactions ? "含内部交易" : "剔除内部交易"}）`,
    numerator,
    ratios,
    baselineRatios,
    simulatedRatios,
    simulationTargetIndex,
    simulationResult,
  };
}

function renderRepricingGapRateDataTable(widget, chartContext) {
  const model = buildRepricingGapDiagnosticModel(widget, chartContext);
  const hasSimulation = Boolean(model.simulatedRatios);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(model.labels)}</th>
              <th>${hasSimulation ? "基准重定价缺口率" : "重定价缺口率"}</th>
              ${hasSimulation ? "<th>测算后重定价缺口率</th><th>变化</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${model.labels.map((label, index) => {
              const baseline = model.baselineRatios?.[index] ?? model.ratios[index];
              const simulated = model.simulatedRatios?.[index] ?? baseline;
              const delta = Number((simulated - baseline).toFixed(2));
              return `
                <tr>
                  <td>${label}</td>
                  <td>${formatRepricingGapPercent(baseline)}</td>
                  ${hasSimulation ? `<td>${formatRepricingGapPercent(simulated)}</td><td>${delta >= 0 ? "+" : ""}${delta.toFixed(2)}pct</td>` : ""}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
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
    filterState: {
      ...getDiagnosticFilterState("interest-risk"),
      ...(appState.widgetFilters?.[REPRICING_GAP_SIMULATION_WIDGET_SEQ] || {}),
    },
  });
  if (!model.supportsAttribution) {
    appState.repricingGapProcessModal = null;
    repricingGapProcessModalEl.innerHTML = "";
    repricingGapProcessModalEl.classList.remove("is-open");
    repricingGapProcessModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const comparisonIndex = getProcessComparisonIndex(state, selectedIndex, model.labels.length);
  const activeNode = state.activeNode || "ratio";
  const impactMap = buildRepricingGapProcessImpactMap(model, selectedIndex, comparisonIndex);

  repricingGapProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="repricingGapProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="repricingGapProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="repricingGapProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="repricingGapProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        ${renderProcessDateContext(model.displayLabels, comparisonIndex, selectedIndex)}
        <div class="eve-process-slider">
          ${renderProcessDualDateSlider(model.displayLabels, comparisonIndex, selectedIndex)}
          <div class="eve-process-formula">重定价缺口率 = 重定价缺口 ÷ ${model.denominatorTitle}</div>
        </div>
      </div>
      <div class="eve-process-flow repricing-gap-attribution-flow">
        <div class="eve-process-flow__canvas repricing-gap-attribution-flow__canvas">
          <div class="eve-process-flow__lane repricing-gap-attribution-flow__lane">
            ${renderEveProcessNode({
              key: "ratio",
              title: "重定价缺口率",
              note: "期限调整后缺口占比",
              value: formatRepricingGapPercent(model.ratios[selectedIndex]),
              series: model.ratios,
              selectedIndex,
              comparisonIndex,
              activeNode,
              dataAttribute: "data-repricing-gap-process-node",
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
              impact: impactMap.ratio,
              nodeKind: "result",
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: "重定价缺口",
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator,
                selectedIndex,
                comparisonIndex,
                activeNode,
                dataAttribute: "data-repricing-gap-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
                showImpact: false,
                nodeKind: "intermediate",
              })}
              <div class="eve-process-division eve-process-division--quotient">÷</div>
              ${renderEveProcessNode({
                key: "denominator",
                title: model.denominatorTitle,
                value: formatEveAmount(model.totalInterestAssets[selectedIndex]),
                series: model.totalInterestAssets,
                selectedIndex,
                comparisonIndex,
                activeNode,
                dataAttribute: "data-repricing-gap-process-node",
                valueFormat: "amount",
                labels: model.displayLabels,
                showImpact: false,
                nodeKind: "intermediate",
              })}
            </div>
            <div class="eve-process-connector repricing-gap-attribution-connector" aria-hidden="true"></div>
            ${renderRepricingGapAttribution(
              model,
              selectedIndex,
              comparisonIndex,
              activeNode,
              state.detailExpandedNodes,
              impactMap
            )}
          </div>
        </div>
      </div>
    </section>
  `;
  repricingGapProcessModalEl.classList.add("is-open");
  repricingGapProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderRepricingGapAttributionCard({
  key,
  title,
  note = "",
  metrics = [],
  impact,
  selectedIndex,
  comparisonIndex,
  activeNode,
  labels = [],
  actionText = "",
  cardKind = "leaf",
}) {
  const primarySeries = metrics[0]?.values || [];
  const impactDisplay = formatProcessNodeImpact(impact);
  const combinedImpactText = metrics.length > 1
    ? impactDisplay.text.replace(/^影响/, "合计影响")
    : impactDisplay.text;
  const previewPayload = encodeProcessPreviewPayload({
    title: `${title}${metrics[0]?.label ? ` · ${metrics[0].label}` : ""}`,
    labels,
    values: primarySeries,
    selectedIndex,
    comparisonIndex,
    color: EVE_COLOR_PRIMARY,
    valueFormat: "amount",
  });
  return `
    <article
      class="eve-process-node repricing-gap-attribution-card repricing-gap-attribution-card--${cardKind} ${activeNode === key ? "is-active" : ""}"
      data-repricing-gap-process-node="${key}"
      data-repricing-gap-business-card="${key}"
    >
      <button class="eve-process-node__select repricing-gap-attribution-card__select" type="button" aria-label="选择${title}">
        <span class="repricing-gap-attribution-card__header">
          <strong>${title}</strong>
          ${note ? `<small>${note}</small>` : ""}
        </span>
        <span class="repricing-gap-attribution-card__metrics${metrics.length > 1 ? " repricing-gap-attribution-card__metrics--dual" : ""}">
          ${metrics.map((metric) => {
            const delta = formatProcessNodeDelta(metric.values, selectedIndex, comparisonIndex, "amount");
            const growth = formatProcessNodeGrowth(metric.values, selectedIndex, comparisonIndex);
            const metricImpact = metric.impact === undefined
              ? null
              : formatProcessNodeImpact(metric.impact);
            const metricImpactText = metricImpact && metric.impactLabel
              ? metricImpact.text.replace(/^影响/, metric.impactLabel)
              : metricImpact?.text;
            return `
              <span class="repricing-gap-attribution-card__metric">
                <span class="repricing-gap-attribution-card__metric-current">
                  <span>${metric.label}</span>
                  <strong>${formatEveAmount(getProcessSeriesValue(metric.values, selectedIndex))}</strong>
                </span>
                <span class="repricing-gap-attribution-card__metric-comparisons">
                  <em class="${delta.className}">${delta.text}</em>
                  <em class="${growth.className}">${growth.text}</em>
                  ${metricImpact ? `<em class="repricing-gap-attribution-card__metric-impact ${metricImpact.className}" title="${metric.impactTitle || metricImpactText}">${metricImpactText}</em>` : ""}
                </span>
              </span>
            `;
          }).join("")}
        </span>
        <span class="eve-process-node__impact repricing-gap-attribution-card__impact ${impactDisplay.className}">${combinedImpactText}</span>
      </button>
      <button
        class="eve-process-sparkline"
        type="button"
        aria-label="放大${title}趋势"
        title="点击放大趋势"
        data-process-sparkline="true"
        data-process-preview="${previewPayload}"
      >${renderEveSparkline(primarySeries, selectedIndex, comparisonIndex, EVE_COLOR_PRIMARY)}</button>
      ${actionText ? `<button class="eve-process-node__action" type="button">${actionText}</button>` : ""}
    </article>
  `;
}

function renderRepricingGapBusinessStrip(title, formula, cards = []) {
  return `
    <section class="repricing-gap-business-expansion" aria-label="${title}">
      <h4>${title}</h4>
      <div class="eve-process-expansion__formula">${formula}</div>
      <div class="repricing-gap-business-strip">${cards.join("")}</div>
    </section>
  `;
}

function renderRepricingGapAttribution(model, selectedIndex, comparisonIndex, activeNode, detailExpandedNodes = [], impactMap = {}) {
  const expandedNodeKeys = Array.isArray(detailExpandedNodes) ? detailExpandedNodes : [];
  const isExpanded = (key) => expandedNodeKeys.includes(key);
  const totalInterestAssetsByBusiness = Object.fromEntries(model.totalInterestAssetItems.map((item) => [
    item.key.replace(/^total-/, ""),
    item,
  ]));
  const cardOptions = { selectedIndex, comparisonIndex, activeNode, labels: model.displayLabels };
  const branches = [
    {
      key: "adjusted-assets",
      title: "资产端业务",
      note: `口径：${model.scopeLabel}`,
      metrics: [
        {
          label: "重定价规模",
          values: model.adjustedInterestAssets,
          impact: impactMap["adjusted-assets:withinOneYear"],
          impactTitle: "一年内期限桶联合替换对分子重定价规模和分母一年内规模的共同影响",
        },
        {
          label: "总规模",
          values: model.totalInterestAssets,
          impact: impactMap["adjusted-assets:beyondOneYear"],
          impactTitle: "一年外及无明确重定价期限资产规模变化的影响",
        },
      ],
      children: renderRepricingGapBusinessStrip(
        "资产端业务类别",
        "重定价规模 = Σ（一年内各期限桶 × 期限权重）；总规模 = 一年内期限桶合计 + 一年外及无明确重定价期限资产",
        model.assetItems.map((item) => renderRepricingGapAttributionCard({
        ...cardOptions,
        key: item.key,
        title: item.title,
        metrics: [
          {
            label: "重定价规模",
            values: item.values,
            impact: impactMap[`${item.key}:withinOneYear`],
            impactTitle: "一年内期限桶联合替换对分子重定价规模和分母一年内规模的共同影响",
          },
          {
            label: "总规模",
            values: totalInterestAssetsByBusiness[item.key]?.values || [],
            impact: impactMap[`${item.key}:beyondOneYear`],
            impactTitle: "一年外及无明确重定价期限资产规模变化的影响",
          },
        ],
          impact: impactMap[item.key],
        }))
      ),
    },
    {
      key: "adjusted-liabilities",
      title: "负债端业务",
      note: `口径：${model.scopeLabel}、不含活期`,
      metrics: [{ label: "重定价规模", values: model.adjustedInterestLiabilities }],
      children: renderRepricingGapBusinessStrip(
        "负债端业务类别",
        "负债端业务重定价规模 = 各负债业务重定价规模合计（不含活期）",
        model.liabilityItems.map((item) => renderRepricingGapAttributionCard({
          ...cardOptions,
          key: item.key,
          title: item.title,
          metrics: [{ label: "重定价规模", values: item.values }],
          impact: impactMap[item.key],
        }))
      ),
    },
    {
      key: "bank-book-derivative-gap",
      title: "银行账簿表外衍生品缺口",
      metrics: [{ label: "重定价缺口", values: model.bankBookDerivativeGap }],
      children: renderRepricingGapBusinessStrip(
        "银行账簿表外衍生品类别",
        "银行账簿表外衍生品缺口 = 银行账簿表外衍生品应收 - 银行账簿表外衍生品应付",
        [
          { key: "bank-book-receivable", title: "银行账簿表外衍生品应收", values: model.bankBookReceivable },
          { key: "bank-book-payable", title: "银行账簿表外衍生品应付", values: model.bankBookPayable },
        ].map((item) => renderRepricingGapAttributionCard({
          ...cardOptions,
          key: item.key,
          title: item.title,
          metrics: [{ label: "重定价规模", values: item.values }],
          impact: impactMap[item.key],
        }))
      ),
    },
    {
      key: "trading-book-derivative-gap",
      title: "交易账簿表外衍生品缺口",
      metrics: [{ label: "重定价缺口", values: model.tradingBookDerivativeGap }],
      children: renderRepricingGapBusinessStrip(
        "交易账簿表外衍生品类别",
        "交易账簿表外衍生品缺口 = 交易账簿表外衍生品应收 - 交易账簿表外衍生品应付",
        [
          { key: "trading-book-receivable", title: "交易账簿表外衍生品应收", values: model.tradingBookReceivable },
          { key: "trading-book-payable", title: "交易账簿表外衍生品应付", values: model.tradingBookPayable },
        ].map((item) => renderRepricingGapAttributionCard({
          ...cardOptions,
          key: item.key,
          title: item.title,
          metrics: [{ label: "重定价规模", values: item.values }],
          impact: impactMap[item.key],
        }))
      ),
    },
  ];
  return `
    <div class="repricing-gap-attribution">
      <div class="eve-process-expansion__formula">
        重定价缺口 = 资产端业务重定价规模 - 负债端业务重定价规模 + 银行账簿表外衍生品缺口 + 交易账簿表外衍生品缺口
      </div>
      <div class="repricing-gap-branch-tree">
        ${branches.map((branch) => `
          <div class="repricing-gap-branch-row${isExpanded(branch.key) ? " is-expanded" : ""}">
            ${renderRepricingGapAttributionCard({
              ...cardOptions,
              key: branch.key,
              title: branch.title,
              note: branch.note,
              metrics: branch.metrics,
              actionText: isExpanded(branch.key) ? "点击收回" : "点击展开",
              impact: impactMap[branch.key],
              cardKind: "branch",
            })}
            ${isExpanded(branch.key) ? `
              <div class="eve-process-connector repricing-gap-branch-row__connector" aria-hidden="true"></div>
              <div class="repricing-gap-branch-row__children">${branch.children}</div>
            ` : ""}
          </div>
        `).join("")}
      </div>
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
