// Interest-risk chart renderers. Loaded after app.js so it can reuse shared dashboard helpers.
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
