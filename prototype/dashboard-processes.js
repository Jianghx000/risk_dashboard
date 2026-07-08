/* Diagnostic process charts and drilldown modals. */

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
  return getConfiguredWidgetBehavior(widget).liquidityDiagnosticKind || "";
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
