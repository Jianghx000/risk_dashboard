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
  const overseasAllocatedCapital = overseasRwa.map((value, index) => Number(((value / legalRwa[index]) * legalTierOne[index]).toFixed(1)));
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
    const scenario = scenarios.reduce((worst, current) =>
      Math.abs(current.values[index]) > Math.abs(worst.values[index]) ? current : worst
    , scenarios[0]);
    return { key: scenario.key, name: scenario.name, value: scenario.values[index] };
  });
  const numerator = worstScenarios.map((scenario) => Number(Math.abs(scenario.value).toFixed(1)));
  const ratios = numerator.map((value, index) => Number(((value / capital[index]) * 100).toFixed(1)));
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

function renderProcessComparisonControl(state, displayLabels, selectedIndex, dataAttribute) {
  const defaultIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
  const hasExplicitIndex = Number.isInteger(state.comparisonIndex)
    && state.comparisonIndex >= 0
    && state.comparisonIndex < selectedIndex;
  const defaultLabel = defaultIndex >= 0
    ? `上一期（默认：${displayLabels[defaultIndex]}）`
    : "无可用基期";
  return `
    <label class="eve-process-comparison">
      <span>比较基期</span>
      <select ${dataAttribute}="true" ${selectedIndex <= 0 ? "disabled" : ""}>
        <option value="" ${hasExplicitIndex ? "" : "selected"}>${defaultLabel}</option>
        ${displayLabels.slice(0, selectedIndex).map((label, index) => `
          <option value="${index}" ${hasExplicitIndex && state.comparisonIndex === index ? "selected" : ""}>${label}</option>
        `).join("")}
      </select>
    </label>
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
        <div class="eve-process-context">
          <div class="eve-process-date">
            <span>当前日期</span>
            <strong>${model.displayLabels[selectedIndex]}</strong>
          </div>
          ${renderProcessComparisonControl(state, model.displayLabels, selectedIndex, "data-eve-process-comparison")}
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
              comparisonIndex,
              activeNode,
              changeType: "delta",
              valueFormat: "percent",
              labels: model.displayLabels,
              impact: impactMap.eve,
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "numerator",
                title: "最大经济价值变动",
                value: formatEveAmount(model.numerator[selectedIndex]),
                series: model.numerator.map(Math.abs),
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
}) {
  const change = formatProcessNodeChange(series, selectedIndex, comparisonIndex, changeType);
  const impactDisplay = formatProcessNodeImpact(impact, impactType);
  const previewPayload = encodeProcessPreviewPayload({
    title,
    labels,
    values: series,
    selectedIndex,
    color: isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY,
    valueFormat,
  });
  return `
    <article class="eve-process-node ${activeNode === key ? "is-active" : ""} ${isWorst ? "is-worst" : ""}" ${dataAttribute}="${key}">
      <button class="eve-process-node__select" type="button" aria-label="选择${title}">
        <span class="eve-process-node__top">
          <span class="eve-process-node__title"><strong>${title}</strong></span>
          <span class="eve-process-node__metric">
            <span class="eve-process-node__value">${value}</span>
            <span class="eve-process-node__comparisons">
              <span class="eve-process-node__change ${change.className}">${change.text}</span>
              ${showImpact ? `<span class="eve-process-node__impact ${impactDisplay.className}">${impactDisplay.text}</span>` : ""}
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
      >${renderEveSparkline(series, selectedIndex, isWorst ? EVE_COLOR_WORST : EVE_COLOR_PRIMARY)}</button>
      ${actionText ? `<button class="eve-process-node__action" type="button">${actionText}</button>` : ""}
    </article>
  `;
}

function renderEveScenarioExpansion(model, selectedIndex, comparisonIndex, activeNode, worst, impactMap = {}) {
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
          comparisonIndex,
          activeNode,
          isWorst,
          valueFormat: "amount",
          labels: model.displayLabels,
          impact: impactMap[`scenario:${scenario.key}`],
        }).replace('<article class="eve-process-node', '<article class="eve-process-node eve-process-node--compact');
      }).join("")}
    </div>
  `;
}

function renderEveDenominatorExpansion(model, selectedIndex, comparisonIndex, activeNode, impactMap = {}) {
  return `
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
  if (changeType === "numberDelta") {
    const delta = Number((current - baseline).toFixed(2));
    return {
      text: `较基期 ${formatSignedNumber(delta, 2)}`,
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

function getProcessSeriesValue(values = [], index = -1) {
  const value = Number(values?.[index]);
  return Number.isFinite(value) ? value : 0;
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
      contribution += weight * (Number(evaluate(afterState)) - Number(evaluate(beforeState)));
    }
    result[factor.key] = contribution;
  });
  return result;
}

function scaleProcessImpactMap(impactMap = {}, targetTotal = 0) {
  const keys = Object.keys(impactMap);
  if (!keys.length || !Number.isFinite(Number(targetTotal))) return impactMap;
  const target = Number(targetTotal);
  const rawTotal = keys.reduce((sum, key) => sum + Number(impactMap[key] || 0), 0);
  const scaled = {};
  if (Math.abs(rawTotal) > 1e-10) {
    const scale = target / rawTotal;
    keys.forEach((key) => {
      scaled[key] = Number(impactMap[key] || 0) * scale;
    });
  } else {
    keys.forEach((key) => { scaled[key] = 0; });
    if (Math.abs(target) > 1e-10) scaled[keys[0]] = target;
  }
  const scaledTotal = keys.reduce((sum, key) => sum + Number(scaled[key] || 0), 0);
  scaled[keys[keys.length - 1]] += target - scaledTotal;
  return scaled;
}

function allocateProcessImpactByDeltas(targetImpact, entries = [], selectedIndex = 0, comparisonIndex = selectedIndex - 1) {
  const raw = Object.fromEntries(entries.map((entry) => [
    entry.key,
    getProcessSeriesDelta(entry.values, selectedIndex, comparisonIndex) * Number(entry.sign ?? 1),
  ]));
  return scaleProcessImpactMap(raw, targetImpact);
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
    if (!denominatorValue) return 0;
    return complement
      ? 100 * (1 - numeratorValue / denominatorValue)
      : 100 * numeratorValue / denominatorValue;
  });
  return scaleProcessImpactMap(raw, getProcessSeriesDelta(ratios, selectedIndex, comparisonIndex));
}

function buildEveProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  const top = buildTwoFactorRatioProcessImpacts({
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
  };
  const scenarioFactors = model.scenarios.map((scenario) => ({
    key: `scenario:${scenario.key}`,
    baseline: Math.abs(getProcessSeriesValue(scenario.values, comparisonIndex)),
    current: Math.abs(getProcessSeriesValue(scenario.values, selectedIndex)),
  }));
  Object.assign(impactMap, scaleProcessImpactMap(
    calculateProcessShapleyImpacts(scenarioFactors, (values) => Math.max(...Object.values(values).map(Number))),
    top.numerator,
  ));
  if (model.usesOverseasAllocatedCapital) {
    const capitalFactors = [
      { key: "overseas-rwa", baseline: getProcessSeriesValue(model.overseasRwa, comparisonIndex), current: getProcessSeriesValue(model.overseasRwa, selectedIndex) },
      { key: "legal-rwa", baseline: getProcessSeriesValue(model.legalRwa, comparisonIndex), current: getProcessSeriesValue(model.legalRwa, selectedIndex) },
      { key: "legal-tier-one", baseline: getProcessSeriesValue(model.legalTierOne, comparisonIndex), current: getProcessSeriesValue(model.legalTierOne, selectedIndex) },
    ];
    Object.assign(impactMap, scaleProcessImpactMap(
      calculateProcessShapleyImpacts(capitalFactors, (values) => values["legal-rwa"]
        ? (values["overseas-rwa"] / values["legal-rwa"]) * values["legal-tier-one"]
        : 0),
      top.denominator,
    ));
  }
  return impactMap;
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
  Object.assign(impactMap, allocateProcessImpactByDeltas(assetImpact, [
    { key: "asset-total", values: components.assetTotal },
    { key: "off-balance-income", values: components.offBalanceIncome },
    { key: "internal-transaction-assets", values: components.internalTransactionAssets },
  ], selectedIndex, comparisonIndex));
  Object.assign(impactMap, allocateProcessImpactByDeltas(liabilityImpact, [
    { key: "liability-total", values: components.liabilityTotal, sign: -1 },
    { key: "off-balance-expense", values: components.offBalanceExpense, sign: -1 },
    { key: "internal-transaction-liabilities", values: components.internalTransactionLiabilities, sign: -1 },
  ], selectedIndex, comparisonIndex));
  Object.assign(impactMap, allocateProcessImpactByDeltas(depositImpact, [
    { key: "demand-deposits", values: components.demandDeposits },
    { key: "note-demand-deposits", values: components.noteDemandDeposits, sign: -1 },
  ], selectedIndex, comparisonIndex));
  Object.assign(impactMap, allocateProcessImpactByDeltas(placementImpact, [
    { key: "demand-placements", values: components.demandPlacements },
    { key: "note-demand-placements", values: components.noteDemandPlacements, sign: -1 },
  ], selectedIndex, comparisonIndex));
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
  const adjustedFactors = [
    { key: "due-on-off-balance-liabilities", baseline: getProcessSeriesValue(components.dueOnOffBalanceLiabilities, comparisonIndex), current: getProcessSeriesValue(components.dueOnOffBalanceLiabilities, selectedIndex) },
    { key: "demand-deposit-adjustment", baseline: getProcessSeriesValue(components.demandDepositAdjustment, comparisonIndex), current: getProcessSeriesValue(components.demandDepositAdjustment, selectedIndex) },
    { key: "demand-placement-adjustment", baseline: getProcessSeriesValue(components.demandPlacementAdjustment, comparisonIndex), current: getProcessSeriesValue(components.demandPlacementAdjustment, selectedIndex) },
  ];
  const adjustedChildImpacts = scaleProcessImpactMap(calculateProcessShapleyImpacts(adjustedFactors, (values) => {
    const adjustedLiabilities = values["due-on-off-balance-liabilities"] - values["demand-deposit-adjustment"] - values["demand-placement-adjustment"];
    const baseResult = asset0 ? 100 * (1 - adjustedLiabilities / asset0) : 0;
    const currentResult = asset1 ? 100 * (1 - adjustedLiabilities / asset1) : 0;
    return 0.5 * (baseResult + currentResult);
  }), top.numerator);
  Object.assign(impactMap, adjustedChildImpacts);
  const adjusted0 = getProcessSeriesValue(components.adjustedDueOnOffBalanceLiabilities, comparisonIndex);
  const adjusted1 = getProcessSeriesValue(components.adjustedDueOnOffBalanceLiabilities, selectedIndex);
  const assetFactors = [
    { key: "asset-total", baseline: getProcessSeriesValue(components.assetTotal, comparisonIndex), current: getProcessSeriesValue(components.assetTotal, selectedIndex) },
    { key: "off-balance-income", baseline: getProcessSeriesValue(components.offBalanceIncome, comparisonIndex), current: getProcessSeriesValue(components.offBalanceIncome, selectedIndex) },
    { key: "internal-transaction-assets", baseline: getProcessSeriesValue(components.internalTransactionAssets, comparisonIndex), current: getProcessSeriesValue(components.internalTransactionAssets, selectedIndex) },
  ];
  Object.assign(impactMap, scaleProcessImpactMap(calculateProcessShapleyImpacts(assetFactors, (values) => {
    const assets = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
    if (!assets) return 0;
    return 0.5 * (100 * (1 - adjusted0 / assets) + 100 * (1 - adjusted1 / assets));
  }), top.denominator));
  Object.assign(impactMap, allocateProcessImpactByDeltas(adjustedChildImpacts["due-on-off-balance-liabilities"], [
    { key: "liability-total", values: components.liabilityTotal },
    { key: "off-balance-expense", values: components.offBalanceExpense },
    { key: "internal-transaction-liabilities", values: components.internalTransactionLiabilities },
  ], selectedIndex, comparisonIndex));
  Object.assign(impactMap, allocateProcessImpactByDeltas(adjustedChildImpacts["demand-deposit-adjustment"], [
    { key: "demand-deposits", values: components.demandDeposits },
    { key: "note-demand-deposits", values: components.noteDemandDeposits, sign: -1 },
  ], selectedIndex, comparisonIndex));
  Object.assign(impactMap, allocateProcessImpactByDeltas(adjustedChildImpacts["demand-placement-adjustment"], [
    { key: "demand-placements", values: components.demandPlacements },
    { key: "note-demand-placements", values: components.noteDemandPlacements, sign: -1 },
  ], selectedIndex, comparisonIndex));
  return impactMap;
}

function buildLiquidityRatioProcessImpactMap(model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
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
  if (model.kind === "lcr") {
    const hqlaFactors = [
      { key: "level-1-assets", values: model.components.level1Assets },
      { key: "level-2a-assets", values: model.components.level2AAssets },
      { key: "level-2b-assets", values: model.components.level2BAssets },
    ].map((item) => ({ key: item.key, baseline: getProcessSeriesValue(item.values, comparisonIndex), current: getProcessSeriesValue(item.values, selectedIndex) }));
    Object.assign(impactMap, scaleProcessImpactMap(calculateProcessShapleyImpacts(hqlaFactors, (values) => {
      const hqla = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
      return 0.5 * (100 * hqla / denominator0 + 100 * hqla / denominator1);
    }), top.numerator));
    const raw0 = getProcessSeriesValue(model.components.rawNetOutflows, comparisonIndex);
    const raw1 = getProcessSeriesValue(model.components.rawNetOutflows, selectedIndex);
    const minimum0 = getProcessSeriesValue(model.components.minimumNetOutflows, comparisonIndex);
    const minimum1 = getProcessSeriesValue(model.components.minimumNetOutflows, selectedIndex);
    const denominatorFactors = [
      { key: "cash-outflow", baseline: getProcessSeriesValue(model.components.cashOutflows, comparisonIndex), current: getProcessSeriesValue(model.components.cashOutflows, selectedIndex) },
      { key: "cash-inflow", baseline: getProcessSeriesValue(model.components.cashInflows, comparisonIndex), current: getProcessSeriesValue(model.components.cashInflows, selectedIndex) },
      { key: "constraint-branch-switch", baseline: raw0 >= minimum0 ? "raw" : "minimum", current: raw1 >= minimum1 ? "raw" : "minimum" },
    ];
    const denominatorDriverImpacts = scaleProcessImpactMap(calculateProcessShapleyImpacts(denominatorFactors, (values) =>
      values["constraint-branch-switch"] === "minimum"
        ? Number(values["cash-outflow"]) * 0.25
        : Number(values["cash-outflow"]) - Number(values["cash-inflow"])
    ), top.denominator);
    Object.assign(impactMap, denominatorDriverImpacts, {
      "raw-net-outflow": Number(denominatorDriverImpacts["cash-outflow"] || 0) + Number(denominatorDriverImpacts["cash-inflow"] || 0),
      "minimum-net-outflow": Number(denominatorDriverImpacts["constraint-branch-switch"] || 0),
    });
    return impactMap;
  }
  if (model.kind === "liquidityRatio") {
    const assetFactors = model.components.liquidityAssetItems.map((item) => ({
      key: item.key,
      baseline: getProcessSeriesValue(item.values, comparisonIndex),
      current: getProcessSeriesValue(item.values, selectedIndex),
    }));
    Object.assign(impactMap, scaleProcessImpactMap(calculateProcessShapleyImpacts(assetFactors, (values) => {
      const numeratorValue = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
      return 0.5 * (100 * numeratorValue / denominator0 + 100 * numeratorValue / denominator1);
    }), top.numerator));
    const liabilityFactors = model.components.liquidityLiabilityItems.map((item) => ({
      key: item.key,
      baseline: getProcessSeriesValue(item.values, comparisonIndex),
      current: getProcessSeriesValue(item.values, selectedIndex),
    }));
    Object.assign(impactMap, scaleProcessImpactMap(calculateProcessShapleyImpacts(liabilityFactors, (values) => {
      const denominatorValue = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
      return denominatorValue
        ? 0.5 * (100 * numerator0 / denominatorValue + 100 * numerator1 / denominatorValue)
        : 0;
    }), top.denominator));
  }
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
  if (comparisonIndex < 0) return {};
  const totalInterestAssetsByBusiness = Object.fromEntries(model.totalInterestAssetItems.map((item) => [
    item.key.replace(/^total-/, ""),
    item,
  ]));
  const assetFactors = model.assetItems.map((item) => {
    const totalInterestAssetItem = totalInterestAssetsByBusiness[item.key];
    return {
      key: item.key,
      baseline: {
        repricingScale: getProcessSeriesValue(item.values, comparisonIndex),
        totalInterestAssets: getProcessSeriesValue(totalInterestAssetItem?.values, comparisonIndex),
      },
      current: {
        repricingScale: getProcessSeriesValue(item.values, selectedIndex),
        totalInterestAssets: getProcessSeriesValue(totalInterestAssetItem?.values, selectedIndex),
      },
    };
  });
  const liabilityFactors = model.liabilityItems.map((item) => ({
    key: item.key,
    baseline: getProcessSeriesValue(item.values, comparisonIndex),
    current: getProcessSeriesValue(item.values, selectedIndex),
  }));
  const derivativeFactors = [
    { key: "bank-book-receivable", values: model.bankBookReceivable, sign: 1 },
    { key: "bank-book-payable", values: model.bankBookPayable, sign: -1 },
    { key: "trading-book-receivable", values: model.tradingBookReceivable, sign: 1 },
    { key: "trading-book-payable", values: model.tradingBookPayable, sign: -1 },
  ];
  const factors = [
    ...assetFactors,
    ...liabilityFactors,
    ...derivativeFactors.map((item) => ({
      key: item.key,
      baseline: getProcessSeriesValue(item.values, comparisonIndex),
      current: getProcessSeriesValue(item.values, selectedIndex),
    })),
  ];
  const rawLeafImpacts = calculateProcessShapleyImpacts(factors, (values) => {
    let numerator = 0;
    let denominator = 0;
    assetFactors.forEach((factor) => {
      const value = values[factor.key] || {};
      numerator += Number(value.repricingScale || 0);
      denominator += Number(value.totalInterestAssets || 0);
    });
    liabilityFactors.forEach((factor) => {
      numerator -= Number(values[factor.key] || 0);
    });
    derivativeFactors.forEach((factor) => {
      numerator += Number(values[factor.key] || 0) * factor.sign;
    });
    return denominator ? (100 * numerator) / denominator : 0;
  });
  const ratioImpact = getProcessSeriesDelta(model.ratios, selectedIndex, comparisonIndex);
  const leafImpacts = scaleProcessImpactMap(rawLeafImpacts, ratioImpact);
  const sumImpacts = (keys) => keys.reduce((sum, key) => sum + Number(leafImpacts[key] || 0), 0);
  const impactMap = {
    ratio: ratioImpact,
    ...leafImpacts,
    "adjusted-assets": sumImpacts(model.assetItems.map((item) => item.key)),
    "adjusted-liabilities": sumImpacts(model.liabilityItems.map((item) => item.key)),
    "bank-book-derivative-gap": sumImpacts(["bank-book-receivable", "bank-book-payable"]),
    "trading-book-derivative-gap": sumImpacts(["trading-book-receivable", "trading-book-payable"]),
  };
  return impactMap;
}

function buildRepricingDurationGapProcessImpactMap(widget, model, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return {};
  const assetImpact = getProcessSeriesDelta(model.assetDurations, selectedIndex, comparisonIndex);
  const liabilityImpact = -getProcessSeriesDelta(model.liabilityDurations, selectedIndex, comparisonIndex);
  const impactMap = {
    "duration-gap": getProcessSeriesDelta(model.gaps, selectedIndex, comparisonIndex),
    "asset-duration": assetImpact,
    "liability-duration": liabilityImpact,
  };
  ["asset", "liability"].forEach((side) => {
    const sideLabel = side === "asset" ? "资产端" : "负债端";
    const currentRows = buildRepricingDurationGapDetailRows(widget, { signature: model.signature }, model, selectedIndex)
      .filter((row) => row.side === sideLabel);
    const baselineRows = buildRepricingDurationGapDetailRows(widget, { signature: model.signature }, model, comparisonIndex)
      .filter((row) => row.side === sideLabel);
    const baselineByBusiness = Object.fromEntries(baselineRows.map((row) => [row.businessType, row]));
    const factors = currentRows.map((row) => ({
      key: `${side}:${row.businessType}`,
      baseline: {
        scale: Number(baselineByBusiness[row.businessType]?.scale || 0),
        duration: Number(baselineByBusiness[row.businessType]?.duration || 0),
      },
      current: {
        scale: Number(row.scale || 0),
        duration: Number(row.duration || 0),
      },
    }));
    const raw = calculateProcessShapleyImpacts(factors, (values) => {
      const businesses = Object.values(values);
      const totalScale = businesses.reduce((sum, business) => sum + Number(business?.scale || 0), 0);
      if (!totalScale) return 0;
      return businesses.reduce((sum, business) =>
        sum + Number(business?.scale || 0) * Number(business?.duration || 0)
      , 0) / totalScale;
    });
    Object.assign(impactMap, scaleProcessImpactMap(raw, side === "asset" ? assetImpact : liabilityImpact));
  });
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

function getPaddedProcessSeriesRange(values = [], minimumPadding = 0.1) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  const minValue = finiteValues.length ? Math.min(...finiteValues) : 0;
  const maxValue = finiteValues.length ? Math.max(...finiteValues) : 0;
  const padding = Math.max(minimumPadding, (maxValue - minValue) * 0.1);
  return { min: minValue - padding, max: maxValue + padding };
}

function renderRepricingDurationDualAxisSparkline(
  scaleSeries,
  durationSeries,
  selectedIndex,
  comparisonIndex
) {
  const width = 250;
  const height = 70;
  const frame = { left: 32, right: 218, top: 16, bottom: 58, width: 186, height: 42, count: scaleSeries.length };
  const scaleRange = getPaddedProcessSeriesRange(scaleSeries, 1);
  const durationRange = getPaddedProcessSeriesRange(durationSeries, 0.02);
  const scalePoints = scaleValuesToFrame(scaleSeries, frame, scaleRange.min, scaleRange.max);
  const durationPoints = scaleValuesToFrame(durationSeries, frame, durationRange.min, durationRange.max);
  const selected = clampNumber(selectedIndex, 0, Math.max(0, scalePoints.length - 1));
  const comparison = comparisonIndex >= 0 && comparisonIndex < scalePoints.length
    ? comparisonIndex
    : -1;
  const selectedScale = scalePoints[selected] || { x: frame.left, y: frame.bottom };
  const selectedDuration = durationPoints[selected] || { x: frame.left, y: frame.bottom };
  const scalePath = scalePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const durationPath = durationPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const comparisonMarkup = comparison >= 0 && comparison !== selected
    ? `
      <line x1="${scalePoints[comparison].x}" y1="${frame.top}" x2="${scalePoints[comparison].x}" y2="${frame.bottom}" stroke="#8FA7C0" stroke-width="1.2" stroke-dasharray="3 3"></line>
      <circle cx="${scalePoints[comparison].x}" cy="${scalePoints[comparison].y}" r="2.8" fill="#fff" stroke="#2878C7" stroke-width="1.5"></circle>
      <circle cx="${durationPoints[comparison].x}" cy="${durationPoints[comparison].y}" r="2.8" fill="#fff" stroke="#C06A3A" stroke-width="1.5"></circle>
    `
    : "";
  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <text x="2" y="10" fill="#2878C7" font-size="8.5" font-weight="900">规模(亿)</text>
      <text x="248" y="10" text-anchor="end" fill="#C06A3A" font-size="8.5" font-weight="900">久期(年)</text>
      <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="#9FC4E8" stroke-width="1"></line>
      <line x1="${frame.right}" y1="${frame.top}" x2="${frame.right}" y2="${frame.bottom}" stroke="#E1B18F" stroke-width="1"></line>
      <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="#D7E6F4" stroke-width="1"></line>
      <text x="28" y="${frame.top + 3}" text-anchor="end" fill="#2878C7" font-size="7.5">${Math.max(...scaleSeries.map(Number)).toFixed(1)}</text>
      <text x="28" y="${frame.bottom}" text-anchor="end" fill="#2878C7" font-size="7.5">${Math.min(...scaleSeries.map(Number)).toFixed(1)}</text>
      <text x="222" y="${frame.top + 3}" fill="#C06A3A" font-size="7.5">${Math.max(...durationSeries.map(Number)).toFixed(2)}</text>
      <text x="222" y="${frame.bottom}" fill="#C06A3A" font-size="7.5">${Math.min(...durationSeries.map(Number)).toFixed(2)}</text>
      ${comparisonMarkup}
      <line x1="${selectedScale.x}" y1="${frame.top}" x2="${selectedScale.x}" y2="${frame.bottom}" stroke="#D85F63" stroke-width="1.6" stroke-dasharray="4 3"></line>
      <polyline fill="none" stroke="#2878C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${scalePath}"></polyline>
      <polyline fill="none" stroke="#C06A3A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${durationPath}"></polyline>
      <circle cx="${selectedScale.x}" cy="${selectedScale.y}" r="3.5" fill="#fff" stroke="#2878C7" stroke-width="2"></circle>
      <circle cx="${selectedDuration.x}" cy="${selectedDuration.y}" r="3.5" fill="#fff" stroke="#C06A3A" stroke-width="2"></circle>
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
  const headerSummary = hasSecondarySeries
    ? `${labels[selectedIndex] || ""}：${state.primaryLabel || "主轴"} ${formatProcessPreviewValue(values[selectedIndex], state.primaryValueFormat || state.valueFormat)}；${state.secondaryLabel || "次轴"} ${formatProcessPreviewValue(secondaryValues[selectedIndex], state.secondaryValueFormat || "number")}`
    : `${labels[selectedIndex] || ""}：${formatProcessPreviewValue(values[selectedIndex], state.valueFormat)}`;
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
          : renderProcessPreviewChart(labels, values, selectedIndex, state.color || EVE_COLOR_PRIMARY, state.valueFormat)}
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
  const comparisonMarkup = comparisonIndex >= 0 && comparisonIndex !== selectedIndex
    ? `<line x1="${primaryPoints[comparisonIndex].x}" y1="${frame.top}" x2="${primaryPoints[comparisonIndex].x}" y2="${frame.bottom}" stroke="#8FA7C0" stroke-width="1.6" stroke-dasharray="5 4"></line>`
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
      <line x1="${selectedPrimary.x}" y1="${frame.top}" x2="${selectedPrimary.x}" y2="${frame.bottom}" stroke="#D85F63" stroke-width="2.2" stroke-dasharray="6 4"></line>
      <circle cx="${selectedPrimary.x}" cy="${selectedPrimary.y}" r="6" fill="#fff" stroke="${primaryColor}" stroke-width="3"></circle>
      <circle cx="${selectedSecondary.x}" cy="${selectedSecondary.y}" r="6" fill="#fff" stroke="${secondaryColor}" stroke-width="3"></circle>
      ${sampledLabels}
    </svg>
  `;
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
  const ratios = dueOnOffBalanceAssets.map((value, index) => Number((
    100 - (adjustedDueOnOffBalanceLiabilities[index] / value) * 100
  ).toFixed(1)));
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
    const liquidityAssetItems = [
      ["liquidity-cash", "1.1 现金", 55, 0.7, 4, 0],
      ["liquidity-gold", "1.2 黄金", 8, 0.08, 0.7, 1],
      ["liquidity-excess-reserves", "1.3 超额准备金存款", 75, 0.9, 5, 2],
      ["liquidity-interbank-net-assets", "1.4 一个月内到期的同业往来款项轧差后资产方净额", 42, 0.55, 3, 3],
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
    const liquidityLiabilityItems = [
      ["liquidity-demand-deposits", "2.1 活期存款（不含财政性存款）", 112, 1.4, 6, 1],
      ["liquidity-term-deposits", "2.2 一个月内到期的定期存款（不含财政性存款）", 96, 1.2, 5.5, 2],
      ["liquidity-interbank-net-liabilities", "2.3 一个月内到期的同业往来款项轧差后负债方净额", 58, 0.75, 4, 3],
      ["liquidity-issued-bonds", "2.4 一个月内到期的已发行债券", 44, 0.6, 3, 4],
      ["liquidity-payables", "2.5 一个月内到期的应付利息和各项应付款", 34, 0.45, 2.6, 5],
      ["liquidity-central-bank-borrowings", "2.6 一个月内到期的向中央银行借款", 30, 0.4, 2.3, 6],
      ["liquidity-other-liabilities", "2.7 其他一个月内到期的负债", 36, 0.5, 2.8, 7],
    ].map(([key, title, base, slope, wave, phase]) => ({
      key,
      title,
      values: buildDiagnosticAmountSeries(count, normalizedOffset, base, slope, wave, phase),
    }));
    const liquidityAssets = sumDiagnosticSeries(liquidityAssetItems, count);
    const liquidityLiabilities = sumDiagnosticSeries(liquidityLiabilityItems, count);
    const ratios = liquidityAssets.map((value, index) =>
      Number(((value / liquidityLiabilities[index]) * 100).toFixed(1))
    );
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
    const ratios = availableStableFunding.map((value, index) =>
      Number(((value / requiredStableFunding[index]) * 100).toFixed(1))
    );
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
    Number((value + level2AAssets[index] + level2BAssets[index]).toFixed(1))
  );
  const cashOutflows = Array.from({ length: count }, (_, index) =>
    Number((548 + normalizedOffset * 3.4 + index * 6.8 + Math.sin((index + normalizedOffset) / 2.1) * 22).toFixed(1))
  );
  const cashInflows = Array.from({ length: count }, (_, index) =>
    Number((258 + normalizedOffset * 1.7 + index * 3.5 + Math.cos((index + normalizedOffset) / 2.7) * 15).toFixed(1))
  );
  const rawNetOutflows = cashOutflows.map((value, index) => Number((value - cashInflows[index]).toFixed(1)));
  const minimumNetOutflows = cashOutflows.map((value) => Number((value * 0.25).toFixed(1)));
  const adjustedNetOutflows = rawNetOutflows.map((value, index) =>
    Number(Math.max(value, minimumNetOutflows[index]).toFixed(1))
  );
  const ratios = hqla.map((value, index) =>
    Number(((value / adjustedNetOutflows[index]) * 100).toFixed(1))
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
        <div class="eve-process-context">
          <div class="eve-process-date">
            <span>当前日期</span>
            <strong>${model.displayLabels[selectedIndex]}</strong>
          </div>
          ${renderProcessComparisonControl(state, model.displayLabels, selectedIndex, "data-liquidity-process-comparison")}
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
          ${isLcr
            ? `<div class="eve-process-formula">LCR = 合格优质流动性资产HQLA ÷ 经调整后净现金流出</div>`
            : isLiquidityRatio
              ? `<div class="eve-process-formula">流动性比例 = 流动性资产 ÷ 流动性负债</div>`
              : isLiquidityGap
                ? isLiquidityGapAmount
                  ? `<div class="eve-process-formula">${model.selectedTenor}流动性缺口 = ${model.selectedTenor}累计到期表内外资产（含内部交易）- ${model.selectedTenor}累计到期表内外负债（含内部交易）+ ${model.selectedTenor}活期存款调整 + ${model.selectedTenor}活期存放调整</div>`
                  : `<div class="eve-process-formula">${model.selectedTenor}流动性缺口率 = 100% - ${model.selectedTenor}累计到期表内外负债（含内部交易，调整活期）÷ ${model.selectedTenor}累计到期表内外资产（含内部交易；各组成项为同一期限范围）</div>`
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
              changeType: isLiquidityGapAmount ? "rate" : "delta",
              valueFormat: isLiquidityGapAmount ? "amount" : "percent",
              labels: model.displayLabels,
              impact: impactMap[isLiquidityGapAmount ? "gap" : "ratio"],
              impactType,
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
                        ? renderLiquidityRatioComponentExpansion(model.components.liquidityAssetItems, model.displayLabels, selectedIndex, comparisonIndex, activeNode, impactMap)
                        : ""}
                  </div>
                  ${hasExpandableFactors ? `
                    <div class="eve-process-expansion-slot eve-process-expansion-slot--wide">
                      ${isLcr && state.denominatorExpanded
                        ? renderLiquidityLcrNetOutflowExpansion(model, selectedIndex, comparisonIndex, activeNode, state.detailExpandedNode, impactMap)
                        : isLiquidityRatio && state.denominatorExpanded
                          ? renderLiquidityRatioComponentExpansion(model.components.liquidityLiabilityItems, model.displayLabels, selectedIndex, comparisonIndex, activeNode, impactMap)
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
    <div class="lcr-process-expansion">
      <div class="lcr-process-expansion__formula">合格优质流动性资产HQLA = 一级资产 + 2A资产 + 2B资产</div>
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
  return `
    <div class="lcr-process-expansion">
      <div class="lcr-process-expansion__formula">
        经调整后净现金流出 = max（原始净现金流出，0.25 × 现金流出）
      </div>
      <div class="eve-process-capital-strip liquidity-process-component-strip liquidity-process-component-strip--ratio liquidity-process-component-strip--branch">
        ${renderEveProcessNode({
          ...nodeOptions,
          key: "raw-net-outflow",
          title: "原始净现金流出",
          value: formatEveAmount(model.components.rawNetOutflows[selectedIndex]),
          series: model.components.rawNetOutflows,
          actionText: detailExpandedNode === "raw-net-outflow" ? "点击收回" : "点击展开",
          impact: impactMap["raw-net-outflow"],
        })}
        <span class="eve-process-mini-operator eve-process-mini-operator--text">max</span>
        ${renderEveProcessNode({
          ...nodeOptions,
          key: "minimum-net-outflow",
          title: "25%现金流出",
          value: formatEveAmount(model.components.minimumNetOutflows[selectedIndex]),
          series: model.components.minimumNetOutflows,
          impact: impactMap["minimum-net-outflow"],
        })}
      </div>
      ${detailExpandedNode === "raw-net-outflow" ? `
        <div class="lcr-process-expansion__formula">原始净现金流出 = 现金流出 - 现金流入</div>
        ${renderLiquidityGapFormulaStrip([
          { key: "cash-outflow", title: "未来30天现金流出量", values: model.components.cashOutflows },
          { key: "cash-inflow", title: "未来30天现金流入量", values: model.components.cashInflows, operator: "-" },
        ], model, selectedIndex, comparisonIndex, activeNode, "leaf", impactMap)}
      ` : ""}
    </div>
  `;
}

function renderLiquidityRatioComponentExpansion(items, labels, selectedIndex, comparisonIndex, activeNode, impactMap = {}) {
  const nodeOptions = { selectedIndex, comparisonIndex, activeNode, dataAttribute: "data-liquidity-process-node", valueFormat: "amount" };
  return `
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
    <div class="eve-process-capital-strip liquidity-process-component-strip liquidity-gap-process-strip${layout === "branch" ? " liquidity-gap-process-strip--branch" : ""}">
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
          <div class="lcr-process-expansion__formula">${branch.formula}</div>
          ${renderLiquidityGapFormulaStrip(branch.children, model, selectedIndex, comparisonIndex, activeNode, "leaf", impactMap, impactType)}
        </div>
      ` : ""}
    </div>
  `;
}

function renderLiquidityGapAdjustedLiabilityBranch(branch, componentBranches, model, selectedIndex, comparisonIndex, activeNode, expandedNodeKeys, impactMap = {}) {
  const isExpanded = expandedNodeKeys.includes(branch.key);
  const expandedComponentBranches = componentBranches.filter((componentBranch) => expandedNodeKeys.includes(componentBranch.key));
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
          <div class="lcr-process-expansion__formula">${branch.formula}</div>
          ${renderLiquidityGapFormulaStrip(
            componentBranches.map((componentBranch) => ({
              ...componentBranch,
              actionText: expandedNodeKeys.includes(componentBranch.key) ? "点击收回" : "点击展开",
            })),
            model,
            selectedIndex,
            comparisonIndex,
            activeNode,
            "leaf",
            impactMap,
          )}
          ${expandedComponentBranches.length ? `
            <div class="liquidity-gap-adjusted-liability__details">
              ${expandedComponentBranches.map((componentBranch) => `
                <div class="liquidity-gap-adjusted-liability__detail">
                  <div class="lcr-process-expansion__formula">${componentBranch.formula}</div>
                  ${renderLiquidityGapFormulaStrip(componentBranch.children, model, selectedIndex, comparisonIndex, activeNode, "leaf", impactMap)}
                </div>
              `).join("")}
            </div>
          ` : ""}
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
    formula: `${model.selectedTenor}累计到期表内外负债（含内部交易） = ${model.selectedTenor}累计到期表内外负债 + 表外支出 + 内部交易负债`,
    children: [
      { key: "liability-total", title: `${model.selectedTenor}累计到期表内外负债`, values: components.liabilityTotal },
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
    formula: `${model.selectedTenor}累计到期表内外资产（含内部交易） = ${model.selectedTenor}累计到期表内外资产 + 表外收入 + 内部交易资产`,
    children: [
      { key: "asset-total", title: `${model.selectedTenor}累计到期表内外资产`, values: components.assetTotal },
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
      <div class="lcr-process-expansion__formula">
        ${model.selectedTenor}流动性缺口 = ${model.selectedTenor}累计到期表内外资产（含内部交易）- ${model.selectedTenor}累计到期表内外负债（含内部交易）+ ${model.selectedTenor}活期存款调整 + ${model.selectedTenor}活期存放调整
      </div>
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

function buildRepricingGapDiagnosticModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? [...rawLabels] : buildMonthlyXAxisLabels();
  const pageId = chartContextOrState.pageId || getCurrentPage()?.id || "interest-risk";
  const filterState = getDiagnosticFilterState(pageId, chartContextOrState);
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
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || widget?.sourceSeq || 9, filterState));
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
  const liabilityItems = buildBusinessItems(REPRICING_GAP_BUSINESS_GROUPS.liabilities);
  const bankBookReceivable = buildDiagnosticAmountSeries(count, normalizedOffset, 31, 0.4, 2.8, 1);
  const bankBookPayable = buildDiagnosticAmountSeries(count, normalizedOffset, 26, 0.35, 2.4, 3);
  const tradingBookReceivable = buildDiagnosticAmountSeries(count, normalizedOffset, 19, 0.28, 2.1, 2);
  const tradingBookPayable = buildDiagnosticAmountSeries(count, normalizedOffset, 15, 0.24, 1.8, 5);
  const bankBookDerivativeGap = bankBookReceivable.map((value, index) => Number((value - bankBookPayable[index]).toFixed(1)));
  const tradingBookDerivativeGap = tradingBookReceivable.map((value, index) => Number((value - tradingBookPayable[index]).toFixed(1)));
  const adjustedInterestAssets = sumDiagnosticSeries(assetItems, count);
  const adjustedInterestLiabilities = sumDiagnosticSeries(liabilityItems, count);
  const totalInterestAssetItems = assetItems.map((item) => ({
    key: `total-${item.key}`,
    title: item.title,
    values: item.values.map((value, index) => Number((value * (1.48 + ((index + normalizedOffset) % 4) * 0.01)).toFixed(1))),
  }));
  const totalInterestAssets = sumDiagnosticSeries(totalInterestAssetItems, count);
  const numerator = adjustedInterestAssets.map((value, index) => Number((
    value
    - adjustedInterestLiabilities[index]
    + bankBookDerivativeGap[index]
    + tradingBookDerivativeGap[index]
  ).toFixed(1)));
  const ratios = numerator.map((value, index) => Number(((value / totalInterestAssets[index]) * 100).toFixed(1)));
  let simulationResult = null;
  let baselineRatios = null;
  let simulatedRatios = null;
  if (hasRepricingSimulation && simulationTargetIndex >= 0) {
    simulationResult = buildRepricingGapSimulationResult(simulation);
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
    organizations,
    includesInternalTransactions,
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
    filterState: getDiagnosticFilterState("interest-risk"),
  });
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
        <div class="eve-process-context">
          <div class="eve-process-date">
            <span>当前日期</span>
            <strong>${model.displayLabels[selectedIndex]}</strong>
          </div>
          ${renderProcessComparisonControl(state, model.displayLabels, selectedIndex, "data-repricing-gap-process-comparison")}
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
              })}
            </div>
            <div class="eve-process-connector repricing-gap-attribution-connector" aria-hidden="true">
              <span>影响归因</span>
            </div>
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

function formatRepricingGapAmountDelta(values, selectedIndex, comparisonIndex) {
  if (comparisonIndex < 0) return { text: "较基期 --", className: "is-flat" };
  const delta = Number((getProcessSeriesValue(values, selectedIndex) - getProcessSeriesValue(values, comparisonIndex)).toFixed(1));
  return {
    text: `较基期 ${formatSignedNumber(delta)}亿`,
    className: getChangeClass(delta),
  };
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
  const previewPayload = encodeProcessPreviewPayload({
    title: `${title}${metrics[0]?.label ? ` · ${metrics[0].label}` : ""}`,
    labels,
    values: primarySeries,
    selectedIndex,
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
        <span class="repricing-gap-attribution-card__metrics">
          ${metrics.map((metric) => {
            const delta = formatRepricingGapAmountDelta(metric.values, selectedIndex, comparisonIndex);
            return `
              <span class="repricing-gap-attribution-card__metric">
                <span>${metric.label}</span>
                <strong>${formatEveAmount(getProcessSeriesValue(metric.values, selectedIndex))}</strong>
                <em class="${delta.className}">${delta.text}</em>
              </span>
            `;
          }).join("")}
        </span>
        <span class="eve-process-node__impact repricing-gap-attribution-card__impact ${impactDisplay.className}">${impactDisplay.text}</span>
      </button>
      <button
        class="eve-process-sparkline"
        type="button"
        aria-label="放大${title}趋势"
        title="点击放大趋势"
        data-process-sparkline="true"
        data-process-preview="${previewPayload}"
      >${renderEveSparkline(primarySeries, selectedIndex, EVE_COLOR_PRIMARY)}</button>
      ${actionText ? `<button class="eve-process-node__action" type="button">${actionText}</button>` : ""}
    </article>
  `;
}

function renderRepricingGapBusinessStrip(title, cards = []) {
  return `
    <section class="repricing-gap-business-expansion" aria-label="${title}">
      <h4>${title}</h4>
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
        { label: "当前重定价规模", values: model.adjustedInterestAssets },
        { label: "当前总生息资产", values: model.totalInterestAssets },
      ],
      children: renderRepricingGapBusinessStrip("资产端业务类别", model.assetItems.map((item) => renderRepricingGapAttributionCard({
        ...cardOptions,
        key: item.key,
        title: item.title,
        metrics: [
          { label: "当前重定价规模", values: item.values },
          { label: "当前总生息资产", values: totalInterestAssetsByBusiness[item.key]?.values || [] },
        ],
        impact: impactMap[item.key],
      }))),
    },
    {
      key: "adjusted-liabilities",
      title: "负债端业务",
      note: `口径：${model.scopeLabel}、不含活期`,
      metrics: [{ label: "当前重定价规模", values: model.adjustedInterestLiabilities }],
      children: renderRepricingGapBusinessStrip("负债端业务类别", model.liabilityItems.map((item) => renderRepricingGapAttributionCard({
        ...cardOptions,
        key: item.key,
        title: item.title,
        metrics: [{ label: "当前重定价规模", values: item.values }],
        impact: impactMap[item.key],
      }))),
    },
    {
      key: "bank-book-derivative-gap",
      title: "银行账簿表外衍生品缺口",
      metrics: [{ label: "当前净缺口", values: model.bankBookDerivativeGap }],
      children: renderRepricingGapBusinessStrip("银行账簿表外衍生品类别", [
        { key: "bank-book-receivable", title: "银行账簿表外衍生品应收", values: model.bankBookReceivable },
        { key: "bank-book-payable", title: "银行账簿表外衍生品应付", values: model.bankBookPayable },
      ].map((item) => renderRepricingGapAttributionCard({
        ...cardOptions,
        key: item.key,
        title: item.title,
        metrics: [{ label: "当前规模", values: item.values }],
        impact: impactMap[item.key],
      }))),
    },
    {
      key: "trading-book-derivative-gap",
      title: "交易账簿表外衍生品缺口",
      metrics: [{ label: "当前净缺口", values: model.tradingBookDerivativeGap }],
      children: renderRepricingGapBusinessStrip("交易账簿表外衍生品类别", [
        { key: "trading-book-receivable", title: "交易账簿表外衍生品应收", values: model.tradingBookReceivable },
        { key: "trading-book-payable", title: "交易账簿表外衍生品应付", values: model.tradingBookPayable },
      ].map((item) => renderRepricingGapAttributionCard({
        ...cardOptions,
        key: item.key,
        title: item.title,
        metrics: [{ label: "当前规模", values: item.values }],
        impact: impactMap[item.key],
      }))),
    },
  ];
  return `
    <div class="repricing-gap-attribution">
      <div class="repricing-gap-attribution__formula">
        四类业务影响之和 = 重定价缺口率较基期变化；资产端影响已联合考虑重定价规模和总生息资产变化
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

function renderRepricingDurationGapProcessModal() {
  const state = appState.repricingDurationGapProcessModal;
  if (!state) {
    repricingDurationGapProcessModalEl.innerHTML = "";
    repricingDurationGapProcessModalEl.classList.remove("is-open");
    repricingDurationGapProcessModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const target = findWidgetBySeq(state.widgetSeq || 15);
  const widget = target?.widget || { seq: state.widgetSeq || 15, title: "资产负债重定价久期缺口" };
  const model = buildRepricingDurationGapModel(widget, {
    labels: state.labels,
    signature: state.signature,
  });
  const selectedIndex = clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
  const comparisonIndex = getProcessComparisonIndex(state, selectedIndex, model.labels.length);
  const activeNode = state.activeNode || "duration-gap";
  const impactMap = buildRepricingDurationGapProcessImpactMap(widget, model, selectedIndex, comparisonIndex);

  repricingDurationGapProcessModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="repricingDurationGapProcessModal"></div>
    <section class="eve-process-modal" role="dialog" aria-modal="true" aria-labelledby="repricingDurationGapProcessModalTitle">
      <div class="eve-process-modal__header">
        <h3 id="repricingDurationGapProcessModalTitle">计算过程</h3>
        <button class="overlay-panel__close eve-process-modal__close" type="button" data-close-overlay="repricingDurationGapProcessModal">关闭</button>
      </div>
      <div class="eve-process-modal__controls">
        <div class="eve-process-context">
          <div class="eve-process-date">
            <span>当前日期</span>
            <strong>${model.displayLabels[selectedIndex]}</strong>
          </div>
          ${renderProcessComparisonControl(state, model.displayLabels, selectedIndex, "data-repricing-duration-gap-process-comparison")}
        </div>
        <div class="eve-process-slider">
          <input
            class="eve-process-slider__input"
            type="range"
            min="0"
            max="${model.labels.length - 1}"
            step="1"
            value="${selectedIndex}"
            data-repricing-duration-gap-process-date-slider="true"
          >
          <div class="eve-process-slider__axis">
            ${model.displayLabels.map((label, index) => `<span class="${shouldShowProcessAxisLabel(model.displayLabels, index) ? "" : "is-muted"}">${shouldShowProcessAxisLabel(model.displayLabels, index) ? label : ""}</span>`).join("")}
          </div>
          <div class="eve-process-formula">资产负债重定价久期缺口 = 资产重定价久期 - 负债重定价久期</div>
        </div>
      </div>
      <div class="eve-process-flow">
        <div class="eve-process-flow__canvas">
          <div class="eve-process-flow__lane">
            ${renderEveProcessNode({
              key: "duration-gap",
              title: "资产负债重定价久期缺口",
              value: formatDurationProcessValue(model.gaps[selectedIndex]),
              series: model.gaps,
              selectedIndex,
              comparisonIndex,
              activeNode,
              dataAttribute: "data-repricing-duration-gap-process-node",
              changeType: "numberDelta",
              valueFormat: "number",
              labels: model.displayLabels,
              impact: impactMap["duration-gap"],
              impactType: "number",
            })}
            <div class="eve-process-operator">=</div>
            <div class="eve-process-factor-stack">
              ${renderEveProcessNode({
                key: "asset-duration",
                title: "资产重定价久期",
                value: formatDurationProcessValue(model.assetDurations[selectedIndex]),
                series: model.assetDurations,
                selectedIndex,
                comparisonIndex,
                activeNode,
                actionText: state.assetExpanded ? "点击收回" : "点击展开",
                dataAttribute: "data-repricing-duration-gap-process-node",
                changeType: "numberDelta",
                valueFormat: "number",
                labels: model.displayLabels,
                impact: impactMap["asset-duration"],
                impactType: "number",
              })}
              <div class="eve-process-division">-</div>
              ${renderEveProcessNode({
                key: "liability-duration",
                title: "负债重定价久期",
                value: formatDurationProcessValue(model.liabilityDurations[selectedIndex]),
                series: model.liabilityDurations,
                selectedIndex,
                comparisonIndex,
                activeNode,
                actionText: state.liabilityExpanded ? "点击收回" : "点击展开",
                dataAttribute: "data-repricing-duration-gap-process-node",
                changeType: "numberDelta",
                valueFormat: "number",
                labels: model.displayLabels,
                impact: impactMap["liability-duration"],
                impactType: "number",
              })}
            </div>
            <div class="eve-process-connector" aria-hidden="true"></div>
            <div class="eve-process-expansions">
              <div class="eve-process-expansion-slot">
                ${state.assetExpanded
                  ? renderRepricingDurationGapContributionExpansion(widget, model, selectedIndex, comparisonIndex, activeNode, "asset", impactMap)
                  : ""}
              </div>
              <div class="eve-process-expansion-slot">
                ${state.liabilityExpanded
                  ? renderRepricingDurationGapContributionExpansion(widget, model, selectedIndex, comparisonIndex, activeNode, "liability", impactMap)
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  repricingDurationGapProcessModalEl.classList.add("is-open");
  repricingDurationGapProcessModalEl.setAttribute("aria-hidden", "false");
}

function renderRepricingDurationGapContributionExpansion(widget, model, selectedIndex, comparisonIndex, activeNode, side, impactMap = {}) {
  const sideLabel = side === "asset" ? "资产端" : "负债端";
  const rowsByDate = model.labels.map((_, dateIndex) =>
    buildRepricingDurationGapDetailRows(widget, { signature: model.signature }, model, dateIndex)
      .filter((row) => row.side === sideLabel)
  );
  const rows = rowsByDate[selectedIndex] || [];
  const baselineRows = comparisonIndex >= 0 ? (rowsByDate[comparisonIndex] || []) : [];
  const baselineByBusiness = Object.fromEntries(baselineRows.map((row) => [row.businessType, row]));
  return `
    <div class="eve-process-scenario-strip repricing-duration-gap-component-strip">
      ${rows.map((row) => {
        const baselineRow = baselineByBusiness[row.businessType];
        const scaleDelta = comparisonIndex >= 0
          ? Number(row.scale || 0) - Number(baselineRow?.scale || 0)
          : null;
        const durationDelta = comparisonIndex >= 0
          ? Number(row.duration || 0) - Number(baselineRow?.duration || 0)
          : null;
        const scaleClass = scaleDelta === null ? "is-flat" : getChangeClass(scaleDelta);
        const durationClass = durationDelta === null ? "is-flat" : getChangeClass(durationDelta);
        const impactDisplay = formatProcessNodeImpact(impactMap[`${side}:${row.businessType}`], "number");
        const impactText = impactDisplay.text === "影响 --" ? impactDisplay.text : `${impactDisplay.text}年`;
        const scaleSeries = rowsByDate.map((dateRows) =>
          Number(dateRows.find((item) => item.businessType === row.businessType)?.scale || 0)
        );
        const durationSeries = rowsByDate.map((dateRows) =>
          Number(dateRows.find((item) => item.businessType === row.businessType)?.duration || 0)
        );
        const previewPayload = encodeProcessPreviewPayload({
          title: `${row.businessType}规模及久期趋势`,
          labels: model.displayLabels,
          values: scaleSeries,
          secondaryValues: durationSeries,
          selectedIndex,
          comparisonIndex,
          primaryLabel: "规模",
          secondaryLabel: "久期",
          primaryColor: "#2878C7",
          secondaryColor: "#C06A3A",
          primaryValueFormat: "amount",
          secondaryValueFormat: "duration",
        });
        return `
          <article
            class="eve-process-node eve-process-node--compact repricing-duration-business-card"
            data-repricing-duration-business-card="${side}:${row.businessType}"
            aria-label="${row.businessType}久期影响"
          >
            <span class="eve-process-node__title"><strong>${row.businessType}</strong></span>
            <span class="repricing-duration-business-card__values">
              <span class="repricing-duration-business-card__value ${scaleClass}">
                规模较基期 ${scaleDelta === null ? "--" : `${formatSignedNumber(scaleDelta, 1)}亿`}
              </span>
              <span class="repricing-duration-business-card__value ${durationClass}">
                久期较基期 ${durationDelta === null ? "--" : `${formatSignedNumber(durationDelta, 2)}年`}
              </span>
              <span class="eve-process-node__impact repricing-duration-business-card__value ${impactDisplay.className}">${impactText}</span>
            </span>
            <button
              class="eve-process-sparkline repricing-duration-dual-sparkline"
              type="button"
              aria-label="放大${row.businessType}规模及久期双轴趋势"
              title="点击放大规模及久期双轴趋势"
              data-process-sparkline="true"
              data-process-preview="${previewPayload}"
            >${renderRepricingDurationDualAxisSparkline(scaleSeries, durationSeries, selectedIndex, comparisonIndex)}</button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function formatDurationProcessValue(value) {
  return Number(value || 0).toFixed(2);
}

function shouldShowProcessAxisLabel(labels, index) {
  if (labels.length <= 14) return true;
  const step = labels.length > 24 ? 5 : 3;
  return index === 0 || index === labels.length - 1 || index % step === 0;
}

function formatRepricingGapPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}
