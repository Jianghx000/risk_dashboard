// Business-change chart and table renderers. Loaded after app.js so it can reuse shared dashboard helpers.
function renderBusinessChangeMethodologyButton(widget) {
  const methodologyKey = getConfiguredWidgetBehavior(widget).methodologyKey;
  if (!methodologyKey || !DOMAIN_CONFIG.businessChangeMethodology?.[methodologyKey]) return "";
  return `
    <button
      class="business-methodology-trigger"
      type="button"
      data-open-business-methodology="true"
      data-methodology-key="${methodologyKey}"
      data-widget-seq="${widget.seq}"
    >口径说明</button>
  `;
}

function renderBusinessChangeMethodologyModal() {
  const state = appState.businessMethodologyModal;
  const methodology = DOMAIN_CONFIG.businessChangeMethodology || {};
  if (!state || !Object.keys(methodology).length) {
    businessMethodologyModalEl.innerHTML = "";
    businessMethodologyModalEl.classList.remove("is-open");
    businessMethodologyModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const methodologyItem = methodology[state.methodologyKey];
  if (!methodologyItem?.title || !methodologyItem?.logic) {
    businessMethodologyModalEl.innerHTML = "";
    businessMethodologyModalEl.classList.remove("is-open");
    businessMethodologyModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const perspective = getBusinessAnalysisPerspectiveDefinition(state.analysisPerspective);

  businessMethodologyModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="businessMethodologyModal"></div>
    <section class="overlay-panel overlay-panel--wide business-methodology-modal" role="dialog" aria-modal="true" aria-labelledby="businessMethodologyModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">业务变动分析 · ${perspective.label}视角</div>
          <h3 id="businessMethodologyModalTitle">${methodologyItem.title}</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="businessMethodologyModal">关闭</button>
      </div>
      <div class="business-methodology-modal__body">
        <p class="business-methodology-logic">${methodologyItem.logic}</p>
      </div>
    </section>
  `;
  businessMethodologyModalEl.classList.add("is-open");
  businessMethodologyModalEl.setAttribute("aria-hidden", "false");
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

function renderBalanceScaleGrowthChart(widget, chartContext) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const useWideFrame = isMaturityTrendWidget(widget);
  const frame = useWideFrame ? createWideFrame(chartContext.xLabels.length) : createFrame(chartContext.xLabels.length);
  const viewBoxWidth = useWideFrame ? 1100 : 700;
  const axis = renderAxes(frame, chartContext.xLabels, "规模/增速");
  const futureStartIndex = getMaturityFutureStartIndex(widget, chartContext.xLabels);
  const futureOverlay = renderMaturityFutureOverlay(widget, chartContext, frame);
  const metricItems = perspective.balanceMetricLabels || ["资产规模", "负债规模", "资产增速", "负债增速"];
  const [firstScaleLabel, secondScaleLabel, firstGrowthLabel, secondGrowthLabel] = metricItems;
  const selectedMetrics = getLegendSelection(widget.seq, "__legend_metrics__", metricItems);
  const assetScale = buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 24 + (value % 48));
  const liabilityScale = buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 29).map((value) => 20 + (value % 46));
  const assetGrowth = buildMetricValues(widget.seq + 31, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 18 + (value % 78));
  const liabilityGrowth = buildMetricValues(widget.seq + 43, chartContext.xLabels.length, chartContext.signature + 67).map((value) => 16 + (value % 76));
  const barWidth = Math.max(10, Math.min(20, getFrameMinStep(frame, chartContext.xLabels.length) * 0.24));
  const barGap = Math.max(2, Math.min(6, getFrameMinStep(frame, chartContext.xLabels.length) * 0.06));

  const assetBarColor = getBarFillColor(firstScaleLabel, metricItems, 0, 0.84);
  const liabilityBarColor = getBarFillColor(secondScaleLabel, metricItems, 1, 0.84);
  const assetLineColor = getPaletteColor(firstGrowthLabel, metricItems, 0, "line");
  const liabilityLineColor = getPaletteColor(secondGrowthLabel, metricItems, 1, "line");

  const assetBars = selectedMetrics.includes(firstScaleLabel)
    ? assetScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center - barWidth - barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${assetBarColor}" stroke="${getBarStrokeColor(firstScaleLabel, metricItems, 0, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes(secondScaleLabel)
    ? liabilityScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * value) / 100;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${liabilityBarColor}" stroke="${getBarStrokeColor(secondScaleLabel, metricItems, 1, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
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
        ${selectedMetrics.includes(firstGrowthLabel)
          ? renderFutureAwareLine(assetPoints, assetLineColor, 3.4, futureStartIndex)
          : ""}
        ${selectedMetrics.includes(secondGrowthLabel)
          ? renderFutureAwareLine(liabilityPoints, liabilityLineColor, 3.4, futureStartIndex)
          : ""}
      </svg>
      ${renderSeriesLegend(widget, {
        ...chartContext,
        allSeriesList: metricItems,
        seriesList: selectedMetrics,
        legendItems: [
          { label: firstScaleLabel, color: assetBarColor },
          { label: secondScaleLabel, color: liabilityBarColor },
          { label: firstGrowthLabel, color: assetLineColor },
          { label: secondGrowthLabel, color: liabilityLineColor },
        ],
      }, "__legend_metrics__")}
    </div>
  `;
}

function renderBalanceScaleGrowthDataTable(widget, chartContext) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const metricItems = perspective.balanceMetricLabels || ["资产规模", "负债规模", "资产增速", "负债增速"];
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
              ${metricItems.map((label) => `<th>${label}</th>`).join("")}
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
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const perspectiveBusinessTypes = perspective.businessTypes || BUSINESS_DURATION_OPTIONS;
  const defaultBusinessTypes = perspective.defaultBusinessTypes || perspectiveBusinessTypes.slice(0, 2);
  const selectedBusinesses = chartContext.seriesList.length
    ? chartContext.seriesList
    : ((chartContext.filterState["业务类型"] || []).filter(Boolean));
  const seriesList = selectedBusinesses.length
    ? selectedBusinesses
    : defaultBusinessTypes;
  const allSeries = chartContext.allSeriesList.length ? chartContext.allSeriesList : perspectiveBusinessTypes;
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
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const defaultBusinessTypes = perspective.defaultBusinessTypes || (perspective.businessTypes || BUSINESS_DURATION_OPTIONS).slice(0, 2);
  const seriesList = chartContext.seriesList.length
    ? chartContext.seriesList
    : ((chartContext.filterState["业务类型"] || []).filter(Boolean));
  const selectedBusinesses = seriesList.length
    ? seriesList
    : defaultBusinessTypes;

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

function renderBusinessStructureTable(widget, chartContext) {
  if (isMaturityStructureWidgetSeq(widget.seq)) {
    return renderMaturityBusinessStructureTables(widget, chartContext);
  }
  const widgetState = appState.widgetFilters[widget.seq] || {};
  const timeRangeValues = normalizeWidgetBusinessStructureDateRange(widget.seq, widgetState["时间区间（起止）"], null, "时间区间（起止）");
  return renderBusinessStructureTableSection(widget, chartContext, {
    timeRangeValues,
    filterName: "时间区间（起止）",
    showDateFilter: Boolean(getConfiguredWidgetBehavior(widget).showDateFilter),
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
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const timeRangeValues = options.timeRangeValues || normalizeWidgetBusinessStructureDateRange(widget.seq, [], null, options.filterName);
  const organizations = getSelectedOrganizations(chartContext);
  const rows = buildBusinessStructureRows(widget, chartContext, timeRangeValues);
  const behavior = getConfiguredWidgetBehavior(widget);
  const drilldownTargetSeq = Number(behavior.drilldownTargetSeq) || null;
  const activeDrilldown = drilldownTargetSeq ? getBusinessDrilldown(drilldownTargetSeq) : null;
  const metricColumns = getBusinessStructureMetricColumns(widget, chartContext);
  const categoryHeader = chartContext.analysisPerspective === "liquidityBalanceStructure" ? "方向" : "类别";
  const itemHeader = chartContext.analysisPerspective === "liquidityBalanceStructure" ? "业务类别" : "业务类型";
  const localFilter = options.showDateFilter
    ? `
      <div class="chart-inline-controls">
        ${renderWidgetDateRangeInlineControl(widget.seq, options.filterName || "时间区间（起止）", "时间区间（起止）", timeRangeValues)}
      </div>
    `
    : "";
  const groupedBody = groups.map((group) => {
    const groupRows = rows.filter((row) => row.category === group.category);
    const totalRow = buildBusinessStructureGroupTotalRow(group, groupRows, chartContext);
    const displayRows = totalRow
      ? chartContext.analysisPerspective === "liquidityBalanceStructure"
        ? [totalRow, ...groupRows]
        : [...groupRows, totalRow]
      : groupRows;
    return displayRows
      .map((row, index) => `
        <tr class="${[
          isBusinessStructureRowActive(activeDrilldown, row, options.scope) ? "chart-table__row--active" : "",
          row.isTotal ? "chart-table__row--total" : "",
        ].filter(Boolean).join(" ")}">
          ${index === 0 ? `<td rowspan="${displayRows.length}" class="chart-table__group-cell">${group.category}</td>` : ""}
          <td>${row.businessType}</td>
          ${row.orgValues.map((value) => metricColumns
            .map((column) => `<td>${formatBusinessStructureMetricValue(column.key, value[column.key])}</td>`)
            .join("")).join("")}
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
              <th rowspan="2">${categoryHeader}</th>
              <th rowspan="2">${itemHeader}</th>
              ${organizations.map((org) => `<th colspan="${metricColumns.length}">${org}</th>`).join("")}
              <th rowspan="2" class="chart-table__action-col">明细</th>
            </tr>
            <tr>
              ${organizations.map(() => metricColumns.map((column) => `<th>${column.label}</th>`).join("")).join("")}
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

function getBusinessStructureMetricColumns(widget, chartContext) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext?.analysisPerspective);
  const structureScope = behavior.structureScope || "stock";
  const scopedColumns = perspective.structureMetricColumnsByScope?.[structureScope];
  if (Array.isArray(scopedColumns) && scopedColumns.length) return scopedColumns;
  const columns = perspective.structureMetricColumns || [];
  if (columns.length) {
    return columns.map((column) => ({
      ...column,
      label: structureScope === "stock"
        ? (column.stockLabel || column.label)
        : (column.flowLabel || column.label),
    }));
  }
  return [
    { key: "scale", label: "规模" },
    { key: "fixedRate", label: "固息占比" },
    { key: "duration", label: "加权久期" },
    { key: structureScope === "new" ? "averageOriginalTerm" : "averageRemainingTerm", label: structureScope === "new" ? "平均原始期限" : "平均剩余期限" },
    { key: "averageRate", label: "平均利率" },
  ];
}

function formatBusinessStructureMetricValue(metricKey, value) {
  if (metricKey === "scale") {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue.toFixed(1) : "0.0";
  }
  return value ?? "";
}

function buildBusinessStructureGroupTotalRow(group, groupRows, chartContext) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext?.analysisPerspective);
  if (!(perspective.totalCategories || []).includes(group?.category) || !groupRows.length) return null;
  const orgCount = Math.max(...groupRows.map((row) => row.orgValues.length));
  return {
    category: group.category,
    businessType: perspective.totalRowLabels?.[group.category] || `${group.category}总计`,
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
        averageOriginalTerm: `${weighted((value) => parseYearText(value.averageOriginalTerm)).toFixed(1)}年`,
        averageRemainingTerm: `${weighted((value) => parseYearText(value.averageRemainingTerm)).toFixed(1)}年`,
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

function calculateApproximateMonthsBetween(startDateValue, endDateValue) {
  const startDate = parseDateValue(startDateValue);
  const endDate = parseDateValue(endDateValue);
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((endDate - startDate) / (30.4375 * 24 * 60 * 60 * 1000)));
}

function buildBusinessStructureRows(widget, chartContext, timeRangeValues = []) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const isLiquidityPerspective = chartContext.analysisPerspective === "liquidityBalanceStructure";
  const organizations = getSelectedOrganizations(chartContext);
  const groupScaleBase = {
    生息资产: 180,
    付息负债: 140,
    表外衍生品: 42,
    资金运用: 160,
    资金来源: 130,
    或有流动性项目: 36,
    资产: 160,
    负债: 130,
    表外收入: 48,
    表外支出: 42,
  };
  const groupRateBase = {
    生息资产: 2.1,
    付息负债: 1.6,
    表外衍生品: 1.2,
    资金运用: 2.0,
    资金来源: 1.5,
    或有流动性项目: 1.1,
    资产: 2.0,
    负债: 1.5,
    表外收入: 1.2,
    表外支出: 1.1,
  };

  return groups.flatMap((group, groupIndex) =>
    group.items.map((businessType, itemIndex) => {
      const orgValues = organizations.map((org) => {
        const signature = createSignature(widget.seq, {
          机构: [org],
          币种: chartContext.filterState["币种"] || [],
          时间区间: timeRangeValues,
          分析视角: [chartContext.analysisPerspective || "interestBalanceStructure"],
        });
        const seed = signature + groupIndex * 97 + itemIndex * 43;
        const scale = (groupScaleBase[group.category] || 80) + ((widget.seq * 17 + seed) % 210) / 1.15;
        const averageOriginalTermYears = 0.8 + ((widget.seq * 11 + seed) % 60) / 10;
        const remainingFactor = 0.25 + ((widget.seq * 13 + seed) % 61) / 100;
        const averageRemainingTermYears = Math.max(0.1, averageOriginalTermYears * remainingFactor);
        const averageRate = groupRateBase[group.category] + ((widget.seq * 7 + seed) % 24) / 10;
        if (isLiquidityPerspective) {
          return {
            scale: Number(scale.toFixed(1)),
            averageRate: `${averageRate.toFixed(2)}%`,
            averageOriginalTerm: `${averageOriginalTermYears.toFixed(1)}年`,
            averageRemainingTerm: `${averageRemainingTermYears.toFixed(1)}年`,
          };
        }
        const durationYears = Math.min(averageRemainingTermYears, 0.3 + ((widget.seq * 5 + seed) % 29) / 10);
        return {
          scale: Number(scale.toFixed(1)),
          fixedRate: `${(22 + ((widget.seq * 9 + seed) % 63)).toFixed(1)}%`,
          duration: `${durationYears.toFixed(1)}年`,
          averageOriginalTerm: `${averageOriginalTermYears.toFixed(1)}年`,
          averageRemainingTerm: `${averageRemainingTermYears.toFixed(1)}年`,
          averageRate: `${averageRate.toFixed(2)}%`,
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

function getBusinessDetailColumns(widget, drilldown = null, chartContext = null) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext?.analysisPerspective);
  const scopedColumns = perspective.detailColumnsByScope?.[detailScope];
  if (Array.isArray(scopedColumns) && scopedColumns.length) {
    return scopedColumns;
  }
  if (Array.isArray(perspective.detailColumns) && perspective.detailColumns.length) {
    return perspective.detailColumns;
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
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
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
  return `${perspective.label}口径 | ${scopeMeta.label}${maturityScopeLabel} > ${drilldown.businessType} | 机构：${institutions} | 币种：${currencies} | ${dateText}`;
}

function buildBusinessDetailRows(widget, chartContext, drilldown) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const scopeMeta = BUSINESS_DETAIL_SCOPE_META[detailScope] || BUSINESS_DETAIL_SCOPE_META.stock;
  const dateRange = getBusinessDrilldownDateRange(drilldown);
  const signature = createSignature(widget.seq, {
    机构: chartContext.filterState["机构"] || [],
    币种: chartContext.filterState["币种"] || [],
    业务类型: [drilldown.businessType],
    时间区间: dateRange || [],
    分析视角: [chartContext.analysisPerspective || "interestBalanceStructure"],
  });
  const sideKey = perspective.sideMap?.[drilldown.businessType] || BUSINESS_SIDE_MAP[drilldown.businessType] || "asset";
  const sideLabel = perspective.sideLabels?.[sideKey] || (sideKey === "liability" ? "负债" : "资产");
  const category = drilldown.category || groups.find((group) => group.items.includes(drilldown.businessType))?.category || "";
  const customerPool = ["或有流动性项目", "表外收入", "表外支出"].includes(category)
    ? ["企业授信组合", "贸易融资客户群", "信用证客户群", "保函客户群", "备用额度客户群"]
    : category === "表外衍生品"
    ? ["利率互换组合", "跨币种掉期组合", "久期对冲组合", "套保衍生品篮子", "交易对手净额包"]
    : ["资金运用", "资产"].includes(sideLabel)
      ? ["城投集团", "高端制造", "交通基础设施", "能源平台", "产业基金", "科技园区", "消费龙头", "医药集团"]
      : ["战略客户部", "机构资金部", "同业合作户", "债券承销计划", "集团内部账户", "境外分行资金池", "财政性存款", "大型企业结算户"];
  const bondIssuerPool = ["国开行", "农业发展银行", "进出口银行", "财政部", "广东省政府", "江苏省政府", "招商局集团", "华能集团"];
  const rateBenchmarkPool = ["LPR 1Y", "LPR 5Y", "DR007", "SHIBOR 3M", "中债国债收益率"];
  const rowCount = 8 + (signature % 4);
  const rangeStart = dateRange?.[0] || addDays(getDefaultGlobalEndDate(), -180);
  const rangeEnd = dateRange?.[1] || getDefaultGlobalEndDate();
  const selectedCurrencies = chartContext.filterState["币种"] || [];
  const explicitCurrencies = selectedCurrencies.filter((currency) => !["全折人民币", "外币折美元"].includes(currency));
  const currencyPool = explicitCurrencies.length
    ? explicitCurrencies
    : selectedCurrencies.includes("外币折美元")
      ? ["美元", "港币", "欧元", "英镑", "日元"]
      : ["人民币", "美元", "港币", "欧元", "日元"];

  return Array.from({ length: rowCount }, (_, index) => {
    const seed = signature + index * 37;
    const prefix = detailScope === "new" ? "NEW" : detailScope === "maturity" ? "MAT" : "STK";
    const bondCode = `${["2402", "2305", "2208", "2109"][seed % 4]}${String((seed % 9000) + 1000).slice(-4)}.IB`;
    const issuer = bondIssuerPool[index % bondIssuerPool.length];
    const isBondBusiness = chartContext.analysisPerspective !== "liquidityBalanceStructure" && drilldown.businessType === "投资类资产";
    const businessId = isBondBusiness ? bondCode : `${prefix}-${String((seed % 900000) + 100000).slice(-6)}`;
    const counterparty = isBondBusiness ? issuer : customerPool[index % customerPool.length];
    const baseStart = detailScope === "new" ? addDays(rangeStart, (seed % 18)) : addDays(rangeEnd, -((seed % 420) + 30));
    const maturityDate = detailScope === "maturity" ? addDays(rangeStart, (seed % 18)) : "";
    const contractMaturityDate = detailScope === "maturity"
      ? (seed % 4 === 0 ? addDays(maturityDate, 30 + (seed % 180)) : maturityDate)
      : detailScope === "stock"
        ? addDays(rangeEnd, 30 + (seed % 720))
        : addDays(baseStart, 90 + (seed % 720));
    const amountBase = detailScope === "stock" ? 18 : detailScope === "new" ? 6 : 5;
    const amount = `${(amountBase + (seed % 85) / 2.7).toFixed(1)}亿元`;
    const rate = `${(1.6 + (seed % 33) / 10).toFixed(2)}%`;
    const rateType = seed % 3 === 0 ? "浮动" : "固定";
    const originalTermMonths = Math.max(1, calculateApproximateMonthsBetween(baseStart, contractMaturityDate));
    const remainingTermBaseDate = detailScope === "maturity" ? maturityDate : detailScope === "new" ? baseStart : rangeEnd;
    const remainingTermMonths = calculateApproximateMonthsBetween(remainingTermBaseDate, contractMaturityDate);
    const repricingTermMonths = rateType === "浮动" ? [1, 3, 6, 12][seed % 4] : originalTermMonths;
    const repricingDate = rateType === "浮动" ? addDays(baseStart, 30 + (seed % 180)) : contractMaturityDate;
    const repricingDurationMonths = rateType === "浮动"
      ? Math.min(repricingTermMonths, remainingTermMonths)
      : remainingTermMonths;
    return {
      businessId,
      counterparty,
      businessType: drilldown.businessType,
      sideLabel,
      bondCode,
      issuer,
      startDate: baseStart,
      maturityDate,
      contractMaturityDate,
      currency: currencyPool[seed % currencyPool.length],
      repricingDate,
      amount,
      holdingScale: amount,
      rate,
      priorRate: rate,
      rateType,
      rateBenchmark: rateType === "浮动" ? rateBenchmarkPool[seed % rateBenchmarkPool.length] : "固定利率",
      spread: rateType === "浮动" ? `+${20 + (seed % 96)}bp` : "不适用",
      couponRate: rate,
      ytm: `${(1.8 + (seed % 42) / 10).toFixed(2)}%`,
      modifiedDuration: `${(0.6 + (seed % 58) / 10).toFixed(1)}`,
      originalTerm: originalTermMonths >= 12 ? `${(originalTermMonths / 12).toFixed(originalTermMonths % 12 === 0 ? 0 : 1)}年` : `${originalTermMonths}个月`,
      remainingTerm: remainingTermMonths >= 12 ? `${(remainingTermMonths / 12).toFixed(remainingTermMonths % 12 === 0 ? 0 : 1)}年` : `${remainingTermMonths}个月`,
      repricingCycle: rateType === "浮动" ? `${repricingTermMonths}个月` : "到期重定价",
      repricingTerm: rateType === "浮动" ? `${repricingTermMonths}个月` : "到期",
      repricingDuration: `${(repricingDurationMonths / 12).toFixed(2)}年`,
    };
  });
}

function renderBusinessDetailTable(widget, chartContext) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const scopeMeta = BUSINESS_DETAIL_SCOPE_META[detailScope] || BUSINESS_DETAIL_SCOPE_META.stock;
  const drilldown = getBusinessDrilldown(widget.seq);
  if (!drilldown) {
    const liquidityStructureTitles = {
      stock: "流动性项目结构一览表",
      new: "新发生流动性项目结构一览表",
      maturity: "到期流动性项目结构一览表",
    };
    const emptyTitle = chartContext.analysisPerspective === "liquidityBalanceStructure"
      ? `选择流动性项目查看${scopeMeta.label}穿透明细`
      : scopeMeta.emptyTitle;
    const emptyDescription = chartContext.analysisPerspective === "liquidityBalanceStructure"
      ? `请先在上方“${liquidityStructureTitles[detailScope]}”中点击某个流动性项目的“查看明细”，定位到具体业务。`
      : scopeMeta.emptyDescription;
    return `
      <div class="chart-shell chart-shell--data">
        <div class="business-detail-empty">
          <div class="business-detail-empty__title">${emptyTitle}</div>
          <div class="business-detail-empty__desc">${emptyDescription}</div>
        </div>
      </div>
    `;
  }

  const columns = getBusinessDetailColumns(widget, drilldown, chartContext);
  const rows = buildBusinessDetailRows(widget, chartContext, drilldown);
  const detailTitle = drilldown.businessType.endsWith("业务")
    ? `${drilldown.businessType}明细`
    : `${drilldown.businessType}业务明细`;
  return `
    <div class="chart-shell chart-shell--data">
      <div class="business-detail-panel">
        <div class="business-detail-context">
          <div>
            <div class="business-detail-context__eyebrow">${perspective.label}归因穿透</div>
            <div class="business-detail-context__title">${detailTitle}</div>
            <div class="business-detail-context__meta">${formatBusinessDetailContext(widget, chartContext, drilldown, scopeMeta)} | 共定位 ${rows.length} 笔业务</div>
          </div>
          <button class="business-detail-context__clear" type="button" data-clear-business-drilldown="${widget.seq}">清除选择</button>
        </div>
        <div class="table-shell">
          <table class="chart-table chart-table--wide chart-table--matrix" style="--business-detail-column-count: ${columns.length}">
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

function isMaturityTrendWidget(widget) {
  return getConfiguredWidgetBehavior(widget).maturityTrend === true;
}

function isMaturityStructureWidgetSeq(widgetSeq) {
  return getConfiguredWidgetBehaviorBySeq(widgetSeq).maturityStructure === true;
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

function getDefaultBusinessStructureDateRange() {
  const endDate = getDefaultGlobalEndDate();
  return [getMonthStartDateValue(endDate), endDate];
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
