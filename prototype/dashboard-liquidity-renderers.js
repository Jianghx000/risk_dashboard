// Liquidity, funding and bond-investment chart renderers. Loaded after app.js so it can reuse shared dashboard helpers.
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

function renderFutureFundingFlowDataView(widget, chartContext) {
  const flowState = buildFundingFlowCompositeState(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      ${renderFutureFundingFlowDetailTable(flowState.future.detailRows, false)}
    </div>
  `;
}
