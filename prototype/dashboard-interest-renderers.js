// Interest-risk chart renderers. Loaded after app.js so it can reuse shared dashboard helpers.
function buildRepricingDurationGapModel(widget, chartContextOrState = {}) {
  const rawLabels = (chartContextOrState.xLabels || chartContextOrState.labels || inferBaseXAxisLabels(widget)).filter(Boolean);
  const labels = rawLabels.length ? rawLabels : buildMonthlyXAxisLabels();
  const pageId = chartContextOrState.pageId || getCurrentPage()?.id || "interest-risk";
  const organizations = typeof getDiagnosticOrganizations === "function"
    ? getDiagnosticOrganizations(pageId, chartContextOrState)
    : ["法人汇总"];
  const includesInternalTransactions = typeof isSingleForeignBranchScope === "function"
    ? isSingleForeignBranchScope(organizations)
    : false;
  const signature = Number(chartContextOrState.signature || createSignature(widget?.seq || 15, chartContextOrState.filterState || {}));
  const assetDurations = labels.map((_, index) =>
    Number((2.35 + (signature % 11) * 0.015 + Math.sin((index + signature) / 3.4) * 0.24 + index * 0.018).toFixed(2))
  );
  const liabilityDurations = labels.map((_, index) =>
    Number((1.92 + (signature % 13) * 0.012 + Math.cos((index + signature) / 3.8) * 0.2 + index * 0.014).toFixed(2))
  );
  const gaps = assetDurations.map((value, index) => Number((value - liabilityDurations[index]).toFixed(2)));
  return {
    labels,
    displayLabels: typeof buildEveDisplayLabels === "function" ? buildEveDisplayLabels(labels) : labels,
    signature,
    organizations,
    includesInternalTransactions,
    assetDurations,
    liabilityDurations,
    gaps,
  };
}

function renderDurationGapAxis(frame, labels, minValue, maxValue) {
  const tickValues = [minValue, minValue + (maxValue - minValue) * 0.25, minValue + (maxValue - minValue) * 0.5, minValue + (maxValue - minValue) * 0.75, maxValue];
  const xTickMarkup = labels
    .map((label, index) => {
      const x = getFrameXPosition(frame, index, labels.length);
      const displayLabel = formatXAxisTickLabel(label, index, labels);
      return `
        <line x1="${x}" y1="${frame.bottom}" x2="${x}" y2="${frame.bottom + 6}" stroke="rgba(109,165,215,0.35)" stroke-width="1"></line>
        <text x="${x}" y="${frame.bottom + 22}" text-anchor="middle" class="axis-label axis-label--x">${displayLabel}</text>
      `;
    })
    .join("");
  const yTickMarkup = tickValues
    .map((tick) => {
      const y = frame.bottom - (frame.height * (tick - minValue)) / (maxValue - minValue || 1);
      return `
        <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.14)" stroke-width="1"></line>
        <text x="${frame.left - 14}" y="${y + 4}" text-anchor="end" class="axis-label axis-label--y">${Number(tick).toFixed(1)}</text>
      `;
    })
    .join("");
  const zeroMarkup = minValue < 0 && maxValue > 0
    ? (() => {
        const y = frame.bottom - (frame.height * (0 - minValue)) / (maxValue - minValue || 1);
        return `<line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(109,165,215,0.38)" stroke-width="1.2"></line>`;
      })()
    : "";
  return `
    <text x="${frame.left - 52}" y="${frame.top - 6}" class="axis-title">久期缺口</text>
    <text x="${(frame.left + frame.right) / 2}" y="${frame.bottom + 46}" text-anchor="middle" class="axis-title">${inferXAxisTitle(labels)}</text>
    <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    <line x1="${frame.left}" y1="${frame.top}" x2="${frame.left}" y2="${frame.bottom}" stroke="rgba(109,165,215,0.42)" stroke-width="1.4"></line>
    ${yTickMarkup}
    ${zeroMarkup}
    ${xTickMarkup}
  `;
}

function getRepricingDurationGapSelectedIndex(widget, model) {
  const state = appState.repricingDurationGapPointPopover;
  if (Number(state?.widgetSeq) !== Number(widget.seq)) return null;
  return clampNumber(Number(state.dateIndex || 0), 0, model.labels.length - 1);
}

function renderRepricingDurationGapChart(widget, chartContext) {
  const model = buildRepricingDurationGapModel(widget, chartContext);
  const frame = createFrame(model.labels.length);
  const minValue = Math.min(-0.2, ...model.gaps) - 0.12;
  const maxValue = Math.max(0.2, ...model.gaps) + 0.12;
  const points = scaleValuesToFrame(model.gaps, frame, minValue, maxValue);
  const selectedIndex = getRepricingDurationGapSelectedIndex(widget, model);
  const lineColor = getPaletteColor("资产负债重定价久期缺口", ["资产负债重定价久期缺口"], 0, "line");
  const popoverMarkup = Number.isInteger(selectedIndex)
    ? renderRepricingDurationGapPointPopover(widget, model, points[selectedIndex], selectedIndex)
    : "";
  return `
    <div class="chart-shell chart-shell--repricing-duration-gap">
      <svg viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet" aria-label="资产负债重定价久期缺口走势">
        ${renderDurationGapAxis(frame, model.labels, minValue, maxValue)}
        <polyline fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
        ${points.map((point, index) => `
          <circle
            class="repricing-duration-gap-point ${index === selectedIndex ? "is-selected" : ""}"
            cx="${point.x}"
            cy="${point.y}"
            r="${index === selectedIndex ? 6 : 4.7}"
            fill="#ffffff"
            stroke="${index === selectedIndex ? "#C36E49" : lineColor}"
            stroke-width="3"
            role="button"
            tabindex="0"
            data-repricing-duration-gap-point="true"
            data-widget-seq="${widget.seq}"
            data-date-index="${index}"
            data-repricing-duration-gap-signature="${model.signature}"
            data-repricing-duration-gap-labels="${model.labels.join("||")}"
            aria-label="${model.displayLabels[index]} 查看资产负债重定价久期缺口拆解"
          ></circle>
        `).join("")}
      </svg>
      ${popoverMarkup}
      ${renderSeriesLegend(widget, {
        ...chartContext,
        seriesList: ["资产负债重定价久期缺口"],
        allSeriesList: ["资产负债重定价久期缺口"],
        legendItems: [{ label: "资产负债重定价久期缺口", color: lineColor }],
      })}
    </div>
  `;
}

function renderRepricingDurationGapPointPopover(widget, model, point, index) {
  const left = Number(((point.x / 700) * 100).toFixed(2));
  const top = Number(((point.y / 300) * 100).toFixed(2));
  return `
    <div class="eve-point-popover eve-point-popover--compact" style="left:${left}%; top:${top}%;">
      <div class="eve-point-popover__grid eve-point-popover__grid--compact">
        <div><span>日期</span><strong>${model.displayLabels[index]}</strong></div>
        <div><span>取值</span><strong>${model.gaps[index].toFixed(2)}</strong></div>
      </div>
      <button
        class="eve-point-popover__action"
        type="button"
        data-open-repricing-duration-gap-process="true"
        data-widget-seq="${widget.seq}"
        data-date-index="${index}"
        data-repricing-duration-gap-signature="${model.signature}"
        data-repricing-duration-gap-labels="${model.labels.join("||")}"
      >查看计算过程</button>
    </div>
  `;
}

function buildRepricingDurationGapDetailRows(widget, chartContext, model, selectedIndex) {
  const durationGapBusinessTypes = Array.isArray(DOMAIN_CONFIG.repricingDurationGapBusinessTypes)
    ? DOMAIN_CONFIG.repricingDurationGapBusinessTypes
    : [];
  const options = durationGapBusinessTypes.length
    ? durationGapBusinessTypes
    : (BUSINESS_DURATION_OPTIONS.length ? BUSINESS_DURATION_OPTIONS : Object.keys(BUSINESS_SIDE_MAP));
  const selectedBusinessTypes = [
    ...options.filter((item) => BUSINESS_SIDE_MAP[item] === "asset"),
    ...options.filter((item) => BUSINESS_SIDE_MAP[item] === "liability"),
  ];
  const seed = Number(chartContext.signature || model.signature || createSignature(widget.seq + selectedIndex, {
    ...(chartContext.filterState || {}),
    日期: [model.labels[selectedIndex]],
  }));
  const rows = selectedBusinessTypes.map((businessType, index) => {
    const isAsset = BUSINESS_SIDE_MAP[businessType] === "asset";
    const side = isAsset ? "资产端" : "负债端";
    const excludesInternalTransaction = businessType.includes("内部交易") && !model.includesInternalTransactions;
    const scale = excludesInternalTransaction
      ? 0
      : 42 + (buildMetricValues(widget.seq + index * 9, 1, seed + selectedIndex * 13)[0] % 86);
    const baseDuration = isAsset ? model.assetDurations[selectedIndex] : model.liabilityDurations[selectedIndex];
    const duration = excludesInternalTransaction
      ? 0
      : Number(Math.max(0.12, baseDuration * (0.72 + ((seed + index * 5) % 18) / 100)).toFixed(2));
    return { side, businessType, scale, duration };
  });
  [
    ["资产端", model.assetDurations[selectedIndex]],
    ["负债端", model.liabilityDurations[selectedIndex]],
  ].forEach(([side, targetDuration]) => {
    const sideRows = rows.filter((row) => row.side === side);
    const totalScale = sideRows.reduce((sum, row) => sum + Number(row.scale || 0), 0);
    const rawWeightedDuration = totalScale
      ? sideRows.reduce((sum, row) => sum + Number(row.scale || 0) * Number(row.duration || 0), 0) / totalScale
      : 0;
    const normalization = rawWeightedDuration ? Number(targetDuration || 0) / rawWeightedDuration : 1;
    sideRows.forEach((row) => {
      row.duration = Number(row.duration || 0) * normalization;
    });
  });
  return rows;
}

function renderRepricingDurationGapDataTable(widget, chartContext) {
  const model = buildRepricingDurationGapModel(widget, chartContext);
  return `
    <div class="chart-shell chart-shell--data">
      <div class="table-shell">
        <table class="chart-table chart-table--wide">
          <thead>
            <tr>
              <th>${inferXAxisTitle(model.labels)}</th>
              <th>资产重定价久期</th>
              <th>负债重定价久期</th>
              <th>资产负债重定价久期缺口</th>
            </tr>
          </thead>
          <tbody>
            ${model.labels.map((label, index) => `
              <tr>
                <td>${label}</td>
                <td>${model.assetDurations[index].toFixed(2)}</td>
                <td>${model.liabilityDurations[index].toFixed(2)}</td>
                <td>${model.gaps[index].toFixed(2)}</td>
              </tr>
            `).join("")}
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

function isRepricingMaturityDistributionWidget(widget) {
  return Number(widget?.sourceSeq || widget?.seq) === 14;
}

function getRepricingMaturityTenorBuckets() {
  return [
    "隔夜", "1~2个月", "2~3个月", "3~4个月", "4~5个月", "5~6个月",
    "6~7个月", "7~8个月", "8~9个月", "9~10个月", "10~11个月", "11~12个月",
  ];
}

function formatRepricingMaturityRangeDate(dateValue) {
  const date = parseDateValue(dateValue);
  if (!date) return String(dateValue || "");
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function getRepricingMaturityDateRanges() {
  const baseDate = appState.globalEndDate || getDefaultGlobalEndDate();
  return getRepricingMaturityTenorBuckets().map((tenorBucket, index) => {
    const startDate = index === 0
      ? baseDate
      : addClampedMonthsDateValue(baseDate, index);
    const endDate = index === 0
      ? addDays(baseDate, 1)
      : addClampedMonthsDateValue(baseDate, index + 1);
    return {
      tenorBucket,
      startDate,
      endDate,
      label: `${formatRepricingMaturityRangeDate(startDate)}-${formatRepricingMaturityRangeDate(endDate)}`,
    };
  });
}

function getMaturityDistributionBuckets(widget) {
  if (isRepricingMaturityDistributionWidget(widget)) {
    return getRepricingMaturityDateRanges().map((range) => range.tenorBucket);
  }
  return ["2026-04-01", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"];
}

function getMaturityDistributionSeries() {
  return BUSINESS_DURATION_OPTIONS.map((name) => ({
    name,
    direction: BUSINESS_SIDE_MAP[name] === "liability" ? -1 : 1,
  }));
}

function getMaturityDistributionSelection(chartContext) {
  const selected = (chartContext.filterState["业务类型"] || []).filter(Boolean);
  const all = getMaturityDistributionSeries().map((item) => item.name);
  return selected.length ? selected : all;
}

function buildMaturityDistributionMatrix(widget, signature, selectedNames = []) {
  const buckets = getMaturityDistributionBuckets(widget);
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

function renderRepricingMaturityDistributionChart(widget, chartContext) {
  const selectedNames = getMaturityDistributionSelection(chartContext);
  const matrix = buildMaturityDistributionMatrix(widget, chartContext.signature, selectedNames);
  const allSeries = getMaturityDistributionSeries().map((item) => item.name);
  const drilldown = getRepricingMaturityDrilldown(widget, matrix);
  const frame = { left: 50, right: 1058, top: 24, bottom: 150, width: 1008, height: 126 };
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
    ${matrix.buckets.map((bucket, index) => {
      const x = frame.left + step * index + step * 0.5;
      return `
        <line x1="${x}" y1="${zeroY}" x2="${x}" y2="${zeroY + 6}" stroke="rgba(109,165,215,0.28)" stroke-width="1"></line>
        <g transform="translate(${x} ${frame.bottom + 18})">
          <text x="0" y="0" text-anchor="start" transform="rotate(55)" class="axis-label axis-label--x repricing-maturity-axis-label">${bucket}</text>
        </g>
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
          <div class="repricing-maturity-chart__viewport">
            <svg viewBox="0 0 1300 320" preserveAspectRatio="xMidYMid meet" aria-label="分业务重定价期限分布">
              ${axisMarkup}
              ${barsMarkup}
            </svg>
          </div>
          <div class="repricing-maturity-chart__axis-title">重定价期限</div>
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
  const dateRange = getRepricingMaturityDateRanges()[bucketIndex];
  return {
    bucket,
    bucketIndex,
    tenorBucket: dateRange?.tenorBucket || "",
    rangeStartDate: dateRange?.startDate || "",
    rangeEndDate: dateRange?.endDate || "",
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
  const rangeStart = parseDateValue(drilldown.rangeStartDate) || parseDateValue(appState.globalEndDate || getDefaultGlobalEndDate()) || new Date();
  const rangeEnd = parseDateValue(drilldown.rangeEndDate) || rangeStart;
  const rangeDays = Math.max(0, Math.round((rangeEnd - rangeStart) / 86400000));
  return seededRows.slice(0, 8 + (signature % 4)).map((row, index) => {
    const repricingDate = addDays(formatDateValue(rangeStart), rangeDays ? index % (rangeDays + 1) : 0);
    const repricingTermMonths = Math.max(1, drilldown.bucketIndex);
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
