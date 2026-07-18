// Liquidity, funding and bond-investment chart renderers. Loaded after app.js so it can reuse shared dashboard helpers.
function buildLimitedLineSeries(widget, chartContext, config) {
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : chartContext.seriesList;
  const selectedSeries = chartContext.seriesList.length ? chartContext.seriesList : allSeries.slice(0, 1);
  const matchedLimits = getMatchingManagementLimits(widget, chartContext);
  return selectedSeries.map((label, seriesIndex) => {
    const allIndex = Math.max(0, allSeries.indexOf(label));
    const values = buildMetricValues(widget.seq + allIndex * 19, chartContext.xLabels.length, chartContext.signature + allIndex * 37)
      .map((value, pointIndex) => {
        const wave = ((value + pointIndex * 7 + allIndex * 11) % 100) / 100;
        return Number((config.minValue + wave * (config.maxValue - config.minValue)).toFixed(config.decimals || 1));
      });
    const limitEntry = matchedLimits.find((entry) => [
      `${entry.organization} / ${entry.currency}`,
      `${shortenOrgLabel(entry.organization)} / ${entry.currency}`,
      entry.currency,
    ].includes(label)) || null;
    return {
      label,
      values,
      limit: limitEntry ? Number(limitEntry.value) : null,
      limitEntry,
      color: getPaletteColor(label, allSeries, allIndex, "line"),
    };
  });
}

function renderLimitedLineMetricChart(widget, chartContext, config) {
  const seriesData = buildLimitedLineSeries(widget, chartContext, config);
  const frame = createFrame(chartContext.xLabels.length);
  const limitValues = seriesData.map((series) => series.limit).filter(Number.isFinite);
  const maxValue = Math.ceil(Math.max(config.axisMin || 0, ...seriesData.flatMap((series) => series.values), ...limitValues) / config.roundTo) * config.roundTo;
  const axis = renderScaledAxes(frame, chartContext.xLabels, config.yLabel, maxValue);
  const limitedSeries = seriesData.filter((series) => Number.isFinite(series.limit)).slice(0, 4);
  const limitLines = limitedSeries.map((series, index) => {
    const y = frame.bottom - (frame.height * series.limit) / maxValue;
    const label = formatManagementLimitLabel(series.limitEntry);
    return `
      <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="${hexToRgba(series.color, 0.62)}" stroke-width="2" stroke-dasharray="8 6"></line>
      ${limitedSeries.length === 1 ? `<text x="${frame.left + 8}" y="${Math.max(frame.top + 14, y - 8 - index * 12)}" class="axis-title axis-title--minor" fill="${series.color}" stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${label}</text>` : ""}
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
      ${renderManagementLimitLegend(widget, chartContext)}
    </div>
  `;
}

function renderLimitedLineMetricDataTable(widget, chartContext, config) {
  const seriesData = buildLimitedLineSeries(widget, chartContext, config);
  const hasLimits = seriesData.some((series) => Number.isFinite(series.limit));
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide chart-table--matrix">
          <thead>
            <tr>
              <th rowspan="2">${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesData.map((series) => `<th colspan="${hasLimits ? 2 : 1}">${series.label}</th>`).join("")}
            </tr>
            <tr>
              ${seriesData.map(() => `<th>${config.valueLabel}</th>${hasLimits ? "<th>限额</th>" : ""}`).join("")}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                ${seriesData.map((series) => `<td>${series.values[index].toFixed(config.decimals || 1)}</td>${hasLimits ? `<td>${Number.isFinite(series.limit) ? `${series.limitEntry.operator}${formatManagementLimitNumber(series.limit)}${series.limitEntry.unit || ""}` : "-"}</td>` : ""}`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildBondInvestmentScaleTimeline(widget, chartContext) {
  const orgs = getSelectedOrganizations(chartContext);
  const currencies = getSelectedCurrencies(chartContext);
  const bondLimitEntries = getMatchingManagementLimits(widget, chartContext, { metricKey: "bondInvestmentScale" });
  const corporateBondLimitEntries = getMatchingManagementLimits(widget, chartContext, { metricKey: "corporateBondScale" });
  const bondLimitEntry = bondLimitEntries.length === 1 ? bondLimitEntries[0] : null;
  const corporateBondLimitEntry = corporateBondLimitEntries.length === 1 ? corporateBondLimitEntries[0] : null;
  const signature = createSignature(widget.seq, {
    机构: orgs,
    币种: currencies,
  });
  const scopeWeight = Math.max(1, orgs.length * Math.max(1, currencies.length));
  const rows = chartContext.xLabels.map((label, index) => {
    const trend = index * (2.6 + (signature % 5) * 0.15);
    const wave = ((signature + index * 37) % 52) - 20;
    const progress = chartContext.xLabels.length > 1 ? index / (chartContext.xLabels.length - 1) : 0;
    const bondScale = bondLimitEntry
      ? Number((Number(bondLimitEntry.value) * (0.72 + progress * 0.14 + (((signature + index * 7) % 9) - 4) / 100)).toFixed(1))
      : Number((160 + scopeWeight * 6 + trend + wave).toFixed(1));
    const corporateWave = ((signature + index * 23 + 17) % 36) - 12;
    const corporateBondScale = corporateBondLimitEntry
      ? Number((Number(corporateBondLimitEntry.value) * (0.64 + progress * 0.18 + (((signature + index * 5) % 7) - 3) / 100)).toFixed(1))
      : Number((46 + scopeWeight * 2.8 + trend * 0.32 + corporateWave).toFixed(1));
    return {
      label,
      bondScale: Math.max(0, bondScale),
      corporateBondScale: Math.max(0, corporateBondScale),
    };
  });
  return {
    scopeLabel: `${summarizeFilterSelection("机构", orgs)} / ${summarizeFilterSelection("币种", currencies)}`,
    unit: currencies.length === 1
      ? bondLimitEntries[0]?.unit || corporateBondLimitEntries[0]?.unit || getCurrencyAmountUnit(chartContext)
      : getCurrencyAmountUnit(chartContext),
    bondLimitEntries,
    corporateBondLimitEntries,
    rows,
  };
}

function renderBondInvestmentScaleLimitChart(widget, chartContext) {
  const { rows, unit, bondLimitEntries, corporateBondLimitEntries } = buildBondInvestmentScaleTimeline(widget, chartContext);
  const labels = chartContext.xLabels;
  const frame = createFrame(labels.length);
  const limitValues = [...bondLimitEntries, ...corporateBondLimitEntries].map((entry) => Number(entry.value)).filter(Number.isFinite);
  const rawMax = Math.max(...rows.flatMap((row) => [row.bondScale, row.corporateBondScale]), ...limitValues, 1);
  const roundTo = rawMax <= 20 ? 5 : rawMax <= 60 ? 10 : rawMax <= 200 ? 20 : 100;
  const maxValue = Math.max(roundTo, Math.ceil(rawMax / roundTo) * roundTo);
  const axis = renderScaledAxes(frame, labels, `规模（${unit}）`, maxValue, inferXAxisTitle(labels));
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
  const selectedCurrencies = getSelectedCurrencies(chartContext);
  const limitSpecifications = [
    ...bondLimitEntries.map((entry, index) => ({
      entry,
      color: getPaletteColor(`bond-limit-${entry.currency}`, selectedCurrencies, index, "line"),
      dash: "8 6",
    })),
    ...corporateBondLimitEntries.map((entry, index) => ({
      entry,
      color: getPaletteColor(`corporate-bond-limit-${entry.currency}`, selectedCurrencies, index + 3, "line"),
      dash: "3 5",
    })),
  ].filter((item) => Number.isFinite(Number(item.entry.value)));
  const limitLines = limitSpecifications.map((item) => {
    const limitY = frame.bottom - (frame.height * Number(item.entry.value)) / maxValue;
    return `
      <line x1="${frame.left}" y1="${limitY}" x2="${frame.right}" y2="${limitY}" stroke="${hexToRgba(item.color, 0.78)}" stroke-width="2" stroke-dasharray="${item.dash}"></line>
    `;
  }).join("");
  const legendItems = [
    { label: "债券投资规模", color: bondColor },
    { label: "非金融企业债投资规模", color: corpColor },
  ];
  const limitLegend = limitSpecifications.length ? `
    <div class="chart-legend chart-legend--limits" aria-label="管理限额">
      ${limitSpecifications.map((item) => `
        <span class="chart-legend__item chart-legend__item--limit">
          <i class="chart-legend__limit-line" style="border-color:${item.color}"></i>
          ${formatManagementLimitLabel(item.entry, { includeIndicator: true })}
        </span>
      `).join("")}
    </div>
  ` : "";
  return `
    <div class="chart-shell">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${limitLines}
        ${bars}
      </svg>
      ${renderSeriesLegend(widget, { ...chartContext, allSeriesList: legendItems.map((item) => item.label), seriesList: legendItems.map((item) => item.label), legendItems }, "__legend_bond_scale__")}
      ${limitLegend}
    </div>
  `;
}

function renderBondInvestmentScaleLimitDataTable(widget, chartContext) {
  const { rows, scopeLabel, unit, bondLimitEntries, corporateBondLimitEntries } = buildBondInvestmentScaleTimeline(widget, chartContext);
  const formatLimitEntries = (entries) => entries
    .map((entry) => `${entry.currency} ${entry.operator}${formatManagementLimitNumber(entry.value)}${entry.unit || ""}`)
    .join("<br>");
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              <th>筛选口径</th>
              <th>债券投资规模（${unit}）</th>
              ${bondLimitEntries.length ? "<th>债券投资限额</th>" : ""}
              <th>非金融企业债投资规模（${unit}）</th>
              ${corporateBondLimitEntries.length ? "<th>非金融企业债券投资限额</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${row.label}</td>
                <td>${scopeLabel}</td>
                <td>${row.bondScale.toFixed(1)}</td>
                ${bondLimitEntries.length ? `<td>${formatLimitEntries(bondLimitEntries)}</td>` : ""}
                <td>${row.corporateBondScale.toFixed(1)}</td>
                ${corporateBondLimitEntries.length ? `<td>${formatLimitEntries(corporateBondLimitEntries)}</td>` : ""}
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
    roundTo: 1,
    decimals: 1,
  });
}

function buildLiquidityGapTenorSeries(widget, chartContext) {
  const diagnosticModel = buildLiquidityGapDiagnosticModel(widget, chartContext);
  const selectedTenor = diagnosticModel.selectedTenor;
  const selectedCaliber = diagnosticModel.selectedCaliber;
  const allSeriesIndex = Math.max(0, LIQUIDITY_GAP_TENOR_OPTIONS.indexOf(selectedTenor));
  const label = selectedTenor === "30D" ? `${selectedTenor}/${selectedCaliber}` : selectedTenor;
  const series = {
    label,
    colorIndex: allSeriesIndex,
    tenor: selectedTenor,
    caliber: selectedTenor === "30D" ? selectedCaliber : "",
    scaleValues: [...diagnosticModel.numerator],
    ratioValues: [...diagnosticModel.ratios],
    diagnosticModel,
  };
  const simulation = typeof getPageSimulation === "function" ? getPageSimulation(chartContext.pageId) : null;
  const hasLiquidityGapSimulation = Number(simulation?.sourceWidgetSeq) === LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ
    && simulation?.simulationKind === "liquidityGap"
    && simulation?.baseMatrix;
  if (hasLiquidityGapSimulation && series.scaleValues.length) {
    const result = buildLiquidityGapSimulationResult(simulation);
    const bucketIndex = { "1D": 0, "7D": 1, "30D": 2, "3M": 3, "1Y": 4 }[selectedTenor] ?? 2;
    const targetIndex = series.scaleValues.length - 1;
    series.simulatedScaleValues = [...series.scaleValues];
    series.simulatedRatioValues = [...series.ratioValues];
    series.scaleValues[targetIndex] = result.baseMetrics.cumulativeTotals[bucketIndex] || 0;
    series.ratioValues[targetIndex] = result.baseMetrics.gapRatios[bucketIndex] || 0;
    series.simulatedScaleValues[targetIndex] = result.simulatedMetrics.cumulativeTotals[bucketIndex] || 0;
    series.simulatedRatioValues[targetIndex] = result.simulatedMetrics.gapRatios[bucketIndex] || 0;
    series.simulationTargetIndex = targetIndex;
  }
  return [series];
}

function renderLiquidityGapTenorChart(widget, chartContext) {
  const frame = createFrame(chartContext.xLabels.length);
  const seriesData = buildLiquidityGapTenorSeries(widget, chartContext);
  const selectedPopover = appState.liquidityMetricPointPopover;
  const selectedIndex = selectedPopover?.widgetSeq === widget.seq && selectedPopover.kind === "liquidityGap"
    ? clampNumber(Number(selectedPopover.dateIndex), 0, chartContext.xLabels.length - 1)
    : null;
  const selectedMetric = selectedPopover?.widgetSeq === widget.seq && selectedPopover.kind === "liquidityGap"
    ? selectedPopover.metric || "ratio"
    : "";
  const matchedLimits = getMatchingManagementLimits(widget, chartContext);
  const limitValues = matchedLimits.map((entry) => Number(entry.value)).filter(Number.isFinite);
  const leftMinRaw = Math.min(
    0,
    ...seriesData.flatMap((series) => [...series.scaleValues, ...(series.simulatedScaleValues || [])]),
    ...limitValues
  );
  const leftMin = leftMinRaw < 0 ? Math.floor(leftMinRaw / 5) * 5 : 0;
  const leftMax = Math.max(60, Math.ceil(Math.max(
    ...seriesData.flatMap((series) => [...series.scaleValues, ...(series.simulatedScaleValues || [])]),
    0
  ) / 20) * 20);
  const rightMinRaw = Math.min(0, ...seriesData.flatMap((series) => [...series.ratioValues, ...(series.simulatedRatioValues || [])]));
  const rightMin = rightMinRaw < 0 ? Math.floor(rightMinRaw / 2) * 2 : 0;
  const rightMax = Math.max(10, Math.ceil(Math.max(
    ...seriesData.flatMap((series) => [...series.ratioValues, ...(series.simulatedRatioValues || [])]),
    0
  ) / 2) * 2);
  const leftRange = Math.max(0.0001, leftMax - leftMin);
  const rightRange = Math.max(0.0001, rightMax - rightMin);
  const amountUnit = getSelectedCurrencies(chartContext).length === 1
    ? matchedLimits[0]?.unit || getCurrencyAmountUnit(chartContext)
    : getCurrencyAmountUnit(chartContext);
  const axis = renderDualAxis(frame, chartContext.xLabels, `缺口规模(${amountUnit})`, "缺口率(%)", leftMax, rightMax, { leftMin, rightMin });
  const step = chartContext.xLabels.length <= 1 ? 0 : frame.width / (chartContext.xLabels.length - 1);
  const groupWidth = Math.max(24, step * 0.72);
  const barWidth = Math.max(8, Math.min(18, groupWidth / Math.max(seriesData.length, 1) - 4));
  const scaleValueToY = (value) => frame.bottom - (frame.height * (value - leftMin)) / leftRange;
  const ratioValueToY = (value) => frame.bottom - (frame.height * (value - rightMin)) / rightRange;
  const zeroY = scaleValueToY(0);

  const barMarkup = seriesData
    .map((series, seriesIndex) => series.scaleValues.map((value, index) => {
      const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
      const offset = (seriesIndex - (seriesData.length - 1) / 2) * (barWidth + 4);
      const x = center + offset - barWidth / 2;
      const valueY = scaleValueToY(value);
      const height = Math.abs(zeroY - valueY);
      const y = Math.min(zeroY, valueY);
      const isSelected = index === selectedIndex && selectedMetric === "amount";
      return `<rect
        class="liquidity-gap-bar ${isSelected ? "is-selected" : ""}"
        x="${x}"
        y="${y}"
        width="${barWidth}"
        height="${height}"
        rx="8"
        fill="${getBarFillColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, 0.78)}"
        stroke="${isSelected ? EVE_COLOR_WORST : getBarStrokeColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, 0.3)}"
        stroke-width="${isSelected ? 2.8 : 1}"
        data-liquidity-point="true"
        data-widget-seq="${widget.seq}"
        data-liquidity-kind="liquidityGap"
        data-liquidity-metric="amount"
        data-date-index="${index}"
        data-liquidity-signature="${series.diagnosticModel.signature}"
        data-liquidity-labels="${series.diagnosticModel.labels.join("||")}"
        aria-label="${series.diagnosticModel.displayLabels[index]} 查看流动性缺口计算过程"
      ></rect>`;
    }).join(""))
    .join("");

  const lineMarkup = seriesData
    .map((series) => {
      const color = getPaletteColor(series.label, LIQUIDITY_GAP_TENOR_OPTIONS, series.colorIndex, "line");
      const points = series.ratioValues.map((value, index) => ({
        x: getFrameXPosition(frame, index, chartContext.xLabels.length),
        y: ratioValueToY(value),
        value,
      }));
      return `
        <polyline fill="none" stroke="${color}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
        ${points.map((point, index) => {
          const isSelected = index === selectedIndex && selectedMetric !== "amount";
          return `<circle
            class="eve-ratio-point liquidity-ratio-point ${isSelected ? "is-selected" : ""}"
            cx="${point.x}"
            cy="${point.y}"
            r="${isSelected ? 6 : 4.2}"
            fill="#ffffff"
            stroke="${isSelected ? EVE_COLOR_WORST : color}"
            stroke-width="2.8"
            data-liquidity-point="true"
            data-widget-seq="${widget.seq}"
            data-liquidity-kind="liquidityGap"
            data-liquidity-metric="ratio"
            data-date-index="${index}"
            data-liquidity-signature="${series.diagnosticModel.signature}"
            data-liquidity-labels="${series.diagnosticModel.labels.join("||")}"
            aria-label="${series.diagnosticModel.displayLabels[index]} 查看计算过程"
          ></circle>`;
        }).join("")}
      `;
    })
    .join("");
  const simulationBarMarkup = seriesData.map((series) => {
    if (!series.simulatedScaleValues || !Number.isInteger(series.simulationTargetIndex)) return "";
    const index = series.simulationTargetIndex;
    const value = Number(series.simulatedScaleValues[index] || 0);
    const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
    const valueY = scaleValueToY(value);
    const height = Math.abs(zeroY - valueY);
    const y = Math.min(zeroY, valueY);
    return `
      <rect
        x="${center - barWidth / 2 - 3}"
        y="${y}"
        width="${barWidth + 6}"
        height="${height}"
        rx="8"
        fill="${SIMULATION_FILL}"
        stroke="${SIMULATION_COLOR}"
        stroke-width="2.4"
        stroke-dasharray="5 3"
        pointer-events="none"
        data-liquidity-gap-simulation-bar="true"
      ><title>${series.label}测算后缺口规模 ${value.toFixed(1)}</title></rect>
    `;
  }).join("");
  const simulationLineMarkup = seriesData.map((series) => {
    if (!series.simulatedRatioValues || !Number.isInteger(series.simulationTargetIndex)) return "";
    const points = series.simulatedRatioValues.map((value, index) => ({
      x: getFrameXPosition(frame, index, chartContext.xLabels.length),
      y: ratioValueToY(value),
    }));
    const targetPoint = points[series.simulationTargetIndex];
    const targetValue = Number(series.simulatedRatioValues[series.simulationTargetIndex] || 0);
    return `
      <polyline fill="none" stroke="${SIMULATION_COLOR}" stroke-width="3.2" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
      <circle cx="${targetPoint.x}" cy="${targetPoint.y}" r="6" fill="#ffffff" stroke="${SIMULATION_COLOR}" stroke-width="3" data-liquidity-gap-simulation-point="true">
        <title>${series.label}测算后缺口率 ${targetValue.toFixed(2)}%</title>
      </circle>
    `;
  }).join("");
  const activeSeries = seriesData[0] || { label: "30D", colorIndex: 2 };
  const hasSimulation = Boolean(activeSeries.simulatedScaleValues && activeSeries.simulatedRatioValues);
  const scaleColor = getBarFillColor(activeSeries.label, LIQUIDITY_GAP_TENOR_OPTIONS, activeSeries.colorIndex, 0.78);
  const ratioColor = getPaletteColor(activeSeries.label, LIQUIDITY_GAP_TENOR_OPTIONS, activeSeries.colorIndex, "line");
  const managementLimitOverlay = renderManagementLimitOverlay(widget, chartContext, frame, {
    minValue: leftMin,
    maxValue: leftMax,
    labelPlacement: "topRight",
  });
  const selectedSeries = seriesData[0];
  const selectedPoint = Number.isInteger(selectedIndex) && selectedSeries
    ? {
      x: getFrameXPosition(frame, selectedIndex, chartContext.xLabels.length),
      y: selectedMetric === "amount"
        ? Math.min(zeroY, scaleValueToY(selectedSeries.scaleValues[selectedIndex]))
        : ratioValueToY(selectedSeries.ratioValues[selectedIndex]),
    }
    : null;
  const popoverMarkup = selectedPoint
    ? renderLiquidityPointPopover(widget, selectedSeries.diagnosticModel, selectedPoint, selectedIndex, selectedMetric || "ratio")
    : "";

  return `
    <div class="chart-shell chart-shell--eve-ratio chart-shell--liquidity-gap-process">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${axis}
        ${managementLimitOverlay}
        ${barMarkup}
        ${simulationBarMarkup}
        ${lineMarkup}
        ${simulationLineMarkup}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: hasSimulation
          ? [`${activeSeries.label}基准缺口规模`, `${activeSeries.label}测算后缺口规模`, `${activeSeries.label}基准缺口率`, `${activeSeries.label}测算后缺口率`]
          : [`${activeSeries.label}缺口规模`, `${activeSeries.label}缺口率`],
        seriesList: seriesData.map((series) => series.label),
        legendItems: hasSimulation
          ? [
            { label: `${activeSeries.label}基准缺口规模`, color: scaleColor },
            { label: `${activeSeries.label}测算后缺口规模`, color: SIMULATION_COLOR },
            { label: `${activeSeries.label}基准缺口率`, color: ratioColor },
            { label: `${activeSeries.label}测算后缺口率`, color: SIMULATION_COLOR },
          ]
          : [
            { label: `${activeSeries.label}缺口规模`, color: scaleColor },
            { label: `${activeSeries.label}缺口率`, color: ratioColor },
          ],
      }, "__legend_liquidity_gap_metrics__")}
      ${renderManagementLimitLegend(widget, chartContext)}
    </div>
  `;
}

function renderLiquidityGapTenorDataTable(widget, chartContext) {
  const seriesData = buildLiquidityGapTenorSeries(widget, chartContext);
  const matchedLimits = getMatchingManagementLimits(widget, chartContext);
  const amountUnit = getSelectedCurrencies(chartContext).length === 1
    ? matchedLimits[0]?.unit || getCurrencyAmountUnit(chartContext)
    : getCurrencyAmountUnit(chartContext);
  const limitCell = matchedLimits
    .map((entry) => `${entry.currency} ${entry.operator}${formatManagementLimitNumber(entry.value)}${entry.unit || ""}`)
    .join("<br>");
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(chartContext.xLabels)}</th>
              ${seriesData.map((series) => series.simulatedScaleValues
                ? `<th>${series.label}｜基准缺口规模（${amountUnit}）</th><th>${series.label}｜测算后缺口规模（${amountUnit}）</th><th>${series.label}｜基准缺口率</th><th>${series.label}｜测算后缺口率</th>`
                : `<th>${series.label}｜缺口规模（${amountUnit}）</th><th>${series.label}｜缺口率</th>`
              ).join("")}
              ${matchedLimits.length ? "<th>管理限额</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${chartContext.xLabels.map((label, index) => `
              <tr>
                <td>${label}</td>
                ${seriesData.map((series) => series.simulatedScaleValues
                  ? `<td>${series.scaleValues[index].toFixed(1)}</td><td>${series.simulatedScaleValues[index].toFixed(1)}</td><td>${series.ratioValues[index].toFixed(1)}%</td><td>${series.simulatedRatioValues[index].toFixed(1)}%</td>`
                  : `<td>${series.scaleValues[index].toFixed(1)}</td><td>${series.ratioValues[index].toFixed(1)}%</td>`
                ).join("")}
                ${matchedLimits.length ? `<td>${limitCell}</td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
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

function buildFutureFundingFlowBusinessMatrix(widget, chartContext, futureDates) {
  const selectedNames = getFutureFundingFlowBusinessSelection(chartContext);
  const series = getFutureFundingFlowBusinessSeries().filter((item) => selectedNames.includes(item.name));
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

function getFutureFundingFlowBusinessSeries() {
  const perspective = getBusinessAnalysisPerspectiveDefinition("liquidityBalanceStructure");
  const directionMap = perspective.cashFlowDirectionMap || {};
  const sideMap = perspective.sideMap || {};
  return (perspective.businessTypes || []).map((name) => ({
    name,
    direction: directionMap[name] === "outflow" ? -1 : 1,
    side: sideMap[name] || (directionMap[name] === "outflow" ? "liability" : "asset"),
  }));
}

function renderFutureFundingFlowBusinessLegend(widget, selectedNames) {
  const businessSeries = getFutureFundingFlowBusinessSeries();
  const allSeries = businessSeries.map((item) => item.name);
  const groups = [
    {
      key: "asset",
      label: "资产及表外收入",
      items: businessSeries.filter((item) => ["asset", "offBalanceInflow"].includes(item.side)),
    },
    {
      key: "liability",
      label: "负债及表外支出",
      items: businessSeries.filter((item) => ["liability", "offBalanceOutflow"].includes(item.side)),
    },
  ];
  return `
    <div class="future-funding-flow-business-legend" aria-label="流动性业务类别">
      ${groups.map((group) => `
        <section class="future-funding-flow-business-legend__group" data-liquidity-legend-group="${group.key}">
          <div class="future-funding-flow-business-legend__title">${group.label}</div>
          <div class="chart-legend chart-legend--filterable future-funding-flow-business-legend__items">
            ${group.items.map((item) => {
              const label = item.name;
              const index = allSeries.indexOf(label);
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
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
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
              <th>业务类别</th>
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
                <td>${row.businessType}</td>
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

function renderFutureFundingFlowChart(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  const matrix = flowState.future.businessMatrix;
  const drilldown = getFutureFundingFlowDrilldown(widget, flowState);
  const drilldownRows = getFutureFundingFlowRowsForDrilldown(flowState, drilldown);
  const allBusinessTypes = getFutureFundingFlowBusinessSeries().map((item) => item.name);
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
          ${renderFutureFundingFlowBusinessLegend(widget, selectedNames)}
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

function renderFutureFundingFlowDataView(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      ${renderFutureFundingFlowDetailTable(flowState.future.detailRows, false)}
    </div>
  `;
}
