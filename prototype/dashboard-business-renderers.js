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

function renderWidgetDateRangeInlineControl(widgetSeq, filterName, filterLabel, selectedValues) {
  const rangeMode = isMaturityStructureWidgetSeq(widgetSeq)
    ? getMaturityStructureRangeMode(filterName, selectedValues)
    : "historical";
  const [startDate, endDate] = normalizeWidgetBusinessStructureDateRange(widgetSeq, selectedValues, null, filterName);
  const monthEndOptions = getBusinessMonthEndSelectionOptions(rangeMode);
  const renderOptions = (selectedDate) => monthEndOptions
    .map((dateValue) => `<option value="${dateValue}" ${dateValue === selectedDate ? "selected" : ""}>${dateValue}</option>`)
    .join("");
  return `
    <div class="chart-inline-control chart-inline-control--daterange">
      <span class="chart-inline-control__label">${filterLabel}</span>
      <div class="inline-date-range" data-month-end-range="true">
        <label class="inline-date-range__field">
          <span>开始月末</span>
          <select
            class="inline-date-range__input"
            data-inline-date-filter="true"
            data-month-end-only="true"
            data-widget-seq="${widgetSeq}"
            data-filter-name="${filterName}"
            data-range-index="0"
          >${renderOptions(startDate)}</select>
        </label>
        <label class="inline-date-range__field">
          <span>结束月末</span>
          <select
            class="inline-date-range__input"
            data-inline-date-filter="true"
            data-month-end-only="true"
            data-widget-seq="${widgetSeq}"
            data-filter-name="${filterName}"
            data-range-index="1"
          >${renderOptions(endDate)}</select>
        </label>
      </div>
    </div>
  `;
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

function getBusinessChangeFlowScope(widget) {
  const behavior = getConfiguredWidgetBehavior(widget);
  const methodologyKey = String(behavior.methodologyKey || "");
  if (methodologyKey.startsWith("new")) return "new";
  if (methodologyKey.startsWith("maturity")) return "maturity";
  if (["new", "maturity"].includes(behavior.structureScope)) return behavior.structureScope;
  if (["new", "maturity"].includes(behavior.detailScope)) return behavior.detailScope;
  return "";
}

function getBusinessMonthSerial(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function formatBusinessMonthKey(monthSerial) {
  if (!Number.isFinite(monthSerial)) return "";
  const year = Math.floor(monthSerial / 12);
  const month = (monthSerial % 12 + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getBusinessMonthKeyFromDateValue(dateValue) {
  const match = String(dateValue || "").match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const date = parseDateValue(dateValue);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";
}

function getBusinessMonthEndDate(monthKey) {
  const serial = getBusinessMonthSerial(monthKey);
  if (!Number.isFinite(serial)) return getDefaultGlobalEndDate();
  const year = Math.floor(serial / 12);
  const month = (serial % 12 + 12) % 12;
  return formatDateValue(new Date(year, month + 1, 0));
}

function getBusinessMonthStartDate(monthKey) {
  const serial = getBusinessMonthSerial(monthKey);
  if (!Number.isFinite(serial)) return getMonthStartDateValue(getDefaultGlobalEndDate());
  const year = Math.floor(serial / 12);
  const month = (serial % 12 + 12) % 12;
  return formatDateValue(new Date(year, month, 1));
}

function getBusinessMonthKeysForDateRange(dateRange = []) {
  const fallbackEnd = getLatestCompletedBusinessMonthEnd();
  const startMonth = getBusinessMonthKeyFromDateValue(dateRange?.[0] || fallbackEnd);
  const endMonth = getBusinessMonthKeyFromDateValue(dateRange?.[1] || fallbackEnd);
  const startSerial = getBusinessMonthSerial(startMonth);
  const endSerial = getBusinessMonthSerial(endMonth);
  if (!Number.isFinite(startSerial) || !Number.isFinite(endSerial)) return [];
  const lower = Math.min(startSerial, endSerial);
  const upper = Math.max(startSerial, endSerial);
  return Array.from({ length: upper - lower + 1 }, (_, index) => formatBusinessMonthKey(lower + index));
}

function getBusinessChangeTimelineMonthKeys(labels = []) {
  return buildMonthlyTimelineEntries(labels).map((entry) => getBusinessMonthKeyFromDateValue(entry.rangeEnd || entry.date));
}

function formatBusinessTerm(monthsValue) {
  const months = Math.max(0, Number(monthsValue || 0));
  if (months >= 12) return `${(months / 12).toFixed(months % 12 === 0 ? 0 : 1)}年`;
  return `${Math.max(1, Math.round(months))}个月`;
}

function getBusinessSnapshotCurrencyValues(chartContext) {
  const selected = getSelectedCurrencies(chartContext).filter(Boolean);
  return selected.length ? selected : ["全折人民币"];
}

function buildBusinessMonthEndSnapshotRows(monthKey, chartContext, options = {}) {
  const targetSerial = getBusinessMonthSerial(monthKey);
  if (!Number.isFinite(targetSerial)) return [];
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const allowedBusinessTypes = new Set(options.businessTypes || groups.flatMap((group) => group.items));
  const organizations = options.organizations || getSelectedOrganizations(chartContext);
  const currencies = options.currencies || getBusinessSnapshotCurrencyValues(chartContext);
  const customerPool = ["城投集团", "高端制造", "交通基础设施", "能源平台", "产业基金", "科技园区", "消费龙头", "医药集团"];
  const rateBenchmarkPool = ["LPR 1Y", "LPR 5Y", "DR007", "SHIBOR 3M", "中债国债收益率"];
  const rows = [];

  groups.forEach((group) => {
    group.items.filter((businessType) => allowedBusinessTypes.has(businessType)).forEach((businessType) => {
      organizations.forEach((org) => {
        currencies.forEach((currency) => {
          for (let cohortSerial = targetSerial - 8; cohortSerial <= targetSerial; cohortSerial += 1) {
            const cohortMonth = formatBusinessMonthKey(cohortSerial);
            const seed = createSignature(6400, {
              分析视角: [chartContext.analysisPerspective || "interestBalanceStructure"],
              机构: [org],
              币种: [currency],
              业务类型: [businessType],
              投放月份: [cohortMonth],
            });
            const lifetimeMonths = 3 + (seed % 5);
            const ageMonths = targetSerial - cohortSerial;
            if (ageMonths < 0 || ageMonths >= lifetimeMonths) continue;
            const initialBalance = 3.2 + (seed % 86) / 10;
            const balance = Number((initialBalance * (1 - (ageMonths / lifetimeMonths) * 0.68)).toFixed(1));
            if (balance <= 0) continue;
            const cohortYear = Math.floor(cohortSerial / 12);
            const cohortMonthIndex = (cohortSerial % 12 + 12) % 12;
            const startDate = formatDateValue(new Date(cohortYear, cohortMonthIndex, 2 + (seed % 24)));
            const contractMaturityDate = getBusinessMonthEndDate(formatBusinessMonthKey(cohortSerial + lifetimeMonths));
            const businessId = `MON-${cohortMonth.replace("-", "")}-${String((seed % 900000) + 100000).slice(-6)}`;
            const rateValue = Number((1.6 + (seed % 33) / 10).toFixed(2));
            const rateType = seed % 3 === 0 ? "浮动" : "固定";
            const remainingTermMonthsValue = Math.max(1, lifetimeMonths - ageMonths);
            const repricingTermMonths = rateType === "浮动" ? [1, 3, 6, 12][seed % 4] : remainingTermMonthsValue;
            const durationValue = Number((Math.min(remainingTermMonthsValue, repricingTermMonths) / 12).toFixed(2));
            const sideKey = perspective.sideMap?.[businessType] || BUSINESS_SIDE_MAP[businessType] || "asset";
            rows.push({
              businessKey: `${org}|${currency}|${businessType}|${businessId}`,
              businessId,
              org,
              currency,
              category: group.category,
              businessType,
              sideKey,
              sideLabel: perspective.sideLabels?.[sideKey] || (sideKey === "liability" ? "负债" : "资产"),
              counterparty: customerPool[seed % customerPool.length],
              startDate,
              contractMaturityDate,
              balance,
              rateValue,
              rate: `${rateValue.toFixed(2)}%`,
              priorRate: `${rateValue.toFixed(2)}%`,
              rateType,
              rateBenchmark: rateType === "浮动" ? rateBenchmarkPool[seed % rateBenchmarkPool.length] : "固定利率",
              spread: rateType === "浮动" ? `+${20 + (seed % 96)}bp` : "不适用",
              originalTermMonthsValue: lifetimeMonths,
              remainingTermMonthsValue,
              durationValue,
              originalTerm: formatBusinessTerm(lifetimeMonths),
              remainingTerm: formatBusinessTerm(remainingTermMonthsValue),
              repricingCycle: rateType === "浮动" ? `${repricingTermMonths}个月` : "到期重定价",
              repricingDate: rateType === "浮动" ? addMonthsDateValue(startDate, repricingTermMonths) : contractMaturityDate,
              repricingDuration: `${durationValue.toFixed(2)}年`,
              couponRate: `${rateValue.toFixed(2)}%`,
              ytm: `${(rateValue + 0.18).toFixed(2)}%`,
              modifiedDuration: durationValue.toFixed(1),
            });
          }
        });
      });
    });
  });
  return rows;
}

function buildMonthlyBusinessChangeFacts(scope, monthKey, chartContext, options = {}) {
  if (!["new", "maturity"].includes(scope)) return [];
  const monthSerial = getBusinessMonthSerial(monthKey);
  if (!Number.isFinite(monthSerial)) return [];
  const previousMonthKey = formatBusinessMonthKey(monthSerial - 1);
  const previousRows = buildBusinessMonthEndSnapshotRows(previousMonthKey, chartContext, options);
  const currentRows = buildBusinessMonthEndSnapshotRows(monthKey, chartContext, options);
  const previousMap = new Map(previousRows.map((row) => [row.businessKey, row]));
  const currentMap = new Map(currentRows.map((row) => [row.businessKey, row]));
  const businessKeys = new Set([...previousMap.keys(), ...currentMap.keys()]);
  const facts = [];

  businessKeys.forEach((businessKey) => {
    const previousRow = previousMap.get(businessKey);
    const currentRow = currentMap.get(businessKey);
    const openingBalance = Number(previousRow?.balance || 0);
    const closingBalance = Number(currentRow?.balance || 0);
    const delta = Number((closingBalance - openingBalance).toFixed(1));
    const amountValue = scope === "new" ? Math.max(delta, 0) : Math.max(-delta, 0);
    if (amountValue <= 0) return;
    const sourceRow = scope === "new" ? currentRow : previousRow;
    if (!sourceRow) return;
    const maturityDate = scope === "maturity"
      ? (currentRow ? getBusinessMonthEndDate(monthKey) : sourceRow.contractMaturityDate)
      : "";
    facts.push({
      ...sourceRow,
      statMonth: monthKey,
      comparisonStartDate: getBusinessMonthEndDate(previousMonthKey),
      comparisonEndDate: getBusinessMonthEndDate(monthKey),
      openingBalance,
      closingBalance,
      amountValue: Number(amountValue.toFixed(1)),
      amount: `${amountValue.toFixed(1)}亿元`,
      holdingScale: `${amountValue.toFixed(1)}亿元`,
      maturityDate,
    });
  });
  return facts.sort((left, right) => left.businessId.localeCompare(right.businessId));
}

function buildFutureContractMaturityFacts(monthKey, chartContext, options = {}) {
  const referenceMonthKey = getBusinessMonthKeyFromDateValue(getLatestCompletedBusinessMonthEnd());
  return buildBusinessMonthEndSnapshotRows(referenceMonthKey, chartContext, options)
    .filter((row) => getBusinessMonthKeyFromDateValue(row.contractMaturityDate) === monthKey)
    .map((row) => ({
      ...row,
      statMonth: monthKey,
      comparisonStartDate: getBusinessMonthEndDate(referenceMonthKey),
      comparisonEndDate: row.contractMaturityDate,
      openingBalance: row.balance,
      closingBalance: 0,
      amountValue: row.balance,
      amount: `${row.balance.toFixed(1)}亿元`,
      holdingScale: `${row.balance.toFixed(1)}亿元`,
      maturityDate: row.contractMaturityDate,
    }));
}

function buildBusinessChangeFactsForMonth(scope, monthKey, chartContext, options = {}) {
  const referenceMonthKey = getBusinessMonthKeyFromDateValue(getLatestCompletedBusinessMonthEnd());
  if (scope === "maturity" && getBusinessMonthSerial(monthKey) > getBusinessMonthSerial(referenceMonthKey)) {
    return buildFutureContractMaturityFacts(monthKey, chartContext, options);
  }
  return buildMonthlyBusinessChangeFacts(scope, monthKey, chartContext, options);
}

function buildBusinessChangeFactsForDateRange(scope, chartContext, dateRange = [], options = {}) {
  const monthKeys = getBusinessMonthKeysForDateRange(dateRange);
  return monthKeys.flatMap((monthKey) => options.future
    ? buildFutureContractMaturityFacts(monthKey, chartContext, options)
    : buildMonthlyBusinessChangeFacts(scope, monthKey, chartContext, options)
  );
}

function calculateBusinessChangeGrowthValues(scaleValues = [], previousValue = null) {
  return scaleValues.map((value, index) => {
    const previous = Number(index === 0 ? previousValue : scaleValues[index - 1]);
    if (!previous) return 0;
    return Number((((Number(value || 0) - previous) / previous) * 100).toFixed(1));
  });
}

function isBusinessChangeLiabilitySide(sideKey) {
  return ["liability", "offBalanceOutflow"].includes(sideKey);
}

function buildBusinessChangeTrendData(widget, chartContext, businessTypes = []) {
  const scope = getBusinessChangeFlowScope(widget);
  const monthKeys = getBusinessChangeTimelineMonthKeys(chartContext.xLabels);
  const options = businessTypes.length ? { businessTypes } : {};
  const factsByMonth = monthKeys.map((monthKey) => buildBusinessChangeFactsForMonth(scope, monthKey, chartContext, options));
  const previousMonthKey = monthKeys.length
    ? formatBusinessMonthKey(getBusinessMonthSerial(monthKeys[0]) - 1)
    : "";
  const previousFacts = previousMonthKey
    ? buildBusinessChangeFactsForMonth(scope, previousMonthKey, chartContext, options)
    : [];
  const firstScale = factsByMonth.map((facts) => Number(facts
    .filter((row) => !isBusinessChangeLiabilitySide(row.sideKey))
    .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1)));
  const secondScale = factsByMonth.map((facts) => Number(facts
    .filter((row) => isBusinessChangeLiabilitySide(row.sideKey))
    .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1)));
  const previousFirstScale = Number(previousFacts
    .filter((row) => !isBusinessChangeLiabilitySide(row.sideKey))
    .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1));
  const previousSecondScale = Number(previousFacts
    .filter((row) => isBusinessChangeLiabilitySide(row.sideKey))
    .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1));
  const scaleByBusinessType = Object.fromEntries(businessTypes.map((businessType) => [
    businessType,
    factsByMonth.map((facts) => Number(facts
      .filter((row) => row.businessType === businessType)
      .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1))),
  ]));
  return {
    scope,
    monthKeys,
    factsByMonth,
    firstScale,
    secondScale,
    firstGrowth: calculateBusinessChangeGrowthValues(firstScale, previousFirstScale),
    secondGrowth: calculateBusinessChangeGrowthValues(secondScale, previousSecondScale),
    scaleByBusinessType,
    growthByBusinessType: Object.fromEntries(Object.entries(scaleByBusinessType).map(([businessType, values]) => [
      businessType,
      calculateBusinessChangeGrowthValues(
        values,
        Number(previousFacts
          .filter((row) => row.businessType === businessType)
          .reduce((sum, row) => sum + row.amountValue, 0).toFixed(1))
      ),
    ])),
  };
}

function buildBusinessChangeScalePlotValues(seriesCollection = []) {
  const maximum = Math.max(100, ...seriesCollection.flat().map((value) => Number(value || 0)));
  return seriesCollection.map((series) => series.map((value) => Number(((Number(value || 0) / maximum) * 92).toFixed(2))));
}

function buildBusinessChangeGrowthPlotValues(values = []) {
  return values.map((value) => clampNumber(50 + Number(value || 0), 6, 94));
}

function summarizeBusinessChangeFacts(facts = []) {
  const scale = Number(facts.reduce((sum, row) => sum + Number(row.amountValue || 0), 0).toFixed(1));
  const weighted = (picker) => {
    if (!scale) return 0;
    return facts.reduce((sum, row) => sum + Number(picker(row) || 0) * Number(row.amountValue || 0), 0) / scale;
  };
  return {
    scale,
    fixedRate: `${weighted((row) => row.rateType === "固定" ? 100 : 0).toFixed(1)}%`,
    duration: `${weighted((row) => row.durationValue).toFixed(1)}年`,
    averageOriginalTerm: `${(weighted((row) => row.originalTermMonthsValue) / 12).toFixed(1)}年`,
    averageRemainingTerm: `${(weighted((row) => row.remainingTermMonthsValue) / 12).toFixed(1)}年`,
    averageRate: `${weighted((row) => row.rateValue).toFixed(2)}%`,
  };
}

function buildMonthlyBusinessChangeStructureRows(widget, chartContext, timeRangeValues = []) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const organizations = getSelectedOrganizations(chartContext);
  const scope = getBusinessChangeFlowScope(widget);
  const future = scope === "maturity" && getMaturityStructureActiveScope(widget.seq) === "future";
  const facts = buildBusinessChangeFactsForDateRange(scope, chartContext, timeRangeValues, { future });
  return groups.flatMap((group) => group.items.map((businessType) => ({
    category: group.category,
    businessType,
    orgValues: organizations.map((org) => summarizeBusinessChangeFacts(
      facts.filter((row) => row.org === org && row.businessType === businessType)
    )),
  })));
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
  const flowScope = getBusinessChangeFlowScope(widget);
  const trendData = flowScope ? buildBusinessChangeTrendData(widget, chartContext) : null;
  const assetScale = trendData?.firstScale || buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 24 + (value % 48));
  const liabilityScale = trendData?.secondScale || buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 29).map((value) => 20 + (value % 46));
  const assetGrowth = trendData?.firstGrowth || buildMetricValues(widget.seq + 31, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 18 + (value % 78));
  const liabilityGrowth = trendData?.secondGrowth || buildMetricValues(widget.seq + 43, chartContext.xLabels.length, chartContext.signature + 67).map((value) => 16 + (value % 76));
  const [assetScalePlot, liabilityScalePlot] = flowScope
    ? buildBusinessChangeScalePlotValues([assetScale, liabilityScale])
    : [assetScale, liabilityScale];
  const assetGrowthPlot = flowScope ? buildBusinessChangeGrowthPlotValues(assetGrowth) : assetGrowth;
  const liabilityGrowthPlot = flowScope ? buildBusinessChangeGrowthPlotValues(liabilityGrowth) : liabilityGrowth;
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
        const y = frame.bottom - (frame.height * assetScalePlot[index]) / 100;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${assetBarColor}" stroke="${getBarStrokeColor(firstScaleLabel, metricItems, 0, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" data-business-change-month="${trendData?.monthKeys?.[index] || ""}" data-business-change-value="${Number(value).toFixed(1)}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
      }).join("")
    : "";

  const liabilityBars = selectedMetrics.includes(secondScaleLabel)
    ? liabilityScale.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const x = center + barGap / 2;
        const y = frame.bottom - (frame.height * liabilityScalePlot[index]) / 100;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${frame.bottom - y}" rx="8" fill="${liabilityBarColor}" stroke="${getBarStrokeColor(secondScaleLabel, metricItems, 1, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" data-business-change-month="${trendData?.monthKeys?.[index] || ""}" data-business-change-value="${Number(value).toFixed(1)}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
      }).join("")
    : "";

  const assetPoints = assetGrowthPlot.map((value, index) => ({
    x: getFrameXPosition(frame, index, chartContext.xLabels.length),
    y: frame.bottom - (frame.height * value) / 100,
  }));
  const liabilityPoints = liabilityGrowthPlot.map((value, index) => ({
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
  const flowScope = getBusinessChangeFlowScope(widget);
  const trendData = flowScope ? buildBusinessChangeTrendData(widget, chartContext) : null;
  const assetScale = trendData?.firstScale || buildBarValues(widget.seq + 7, chartContext.xLabels.length, chartContext.signature).map((value) => 24 + (value % 48));
  const liabilityScale = trendData?.secondScale || buildBarValues(widget.seq + 19, chartContext.xLabels.length, chartContext.signature + 29).map((value) => 20 + (value % 46));
  const assetGrowth = trendData?.firstGrowth || buildMetricValues(widget.seq + 31, chartContext.xLabels.length, chartContext.signature + 41).map((value) => 18 + (value % 78));
  const liabilityGrowth = trendData?.secondGrowth || buildMetricValues(widget.seq + 43, chartContext.xLabels.length, chartContext.signature + 67).map((value) => 16 + (value % 76));
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
                <td>${assetGrowth[index].toFixed(1)}${flowScope ? "%" : ""}</td>
                <td>${liabilityGrowth[index].toFixed(1)}${flowScope ? "%" : ""}</td>
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
  const flowScope = getBusinessChangeFlowScope(widget);
  const trendData = flowScope ? buildBusinessChangeTrendData(widget, chartContext, seriesList) : null;
  const scaleSeries = seriesList.map((label, seriesIndex) => trendData?.scaleByBusinessType?.[label]
    || buildBarValues(widget.seq + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 31).map((value) => 18 + (value % 52))
  );
  const scalePlotSeries = flowScope ? buildBusinessChangeScalePlotValues(scaleSeries) : scaleSeries;
  const growthSeries = seriesList.map((label, seriesIndex) => trendData?.growthByBusinessType?.[label]
    || buildMetricValues(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 29).map((value) => 18 + (value % 76))
  );
  const growthPlotSeries = flowScope ? growthSeries.map(buildBusinessChangeGrowthPlotValues) : growthSeries;

  const barMarkup = seriesList
    .map((label, seriesIndex) => {
      const values = scaleSeries[seriesIndex];
      return values.map((value, index) => {
        const center = getFrameXPosition(frame, index, chartContext.xLabels.length);
        const offset = (seriesIndex - (seriesList.length - 1) / 2) * (barWidth + 4);
        const x = center + offset - barWidth / 2;
        const height = (frame.height * scalePlotSeries[seriesIndex][index]) / 100;
        const y = frame.bottom - height;
        const isFuture = isMaturityFutureIndex(futureStartIndex, index);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7" fill="${getBarFillColor(label, allSeries, seriesIndex, 0.82)}" stroke="${getBarStrokeColor(label, allSeries, seriesIndex, isFuture ? 0.5 : 0.28)}" stroke-width="1" opacity="${isFuture ? "0.52" : "1"}" data-business-change-month="${trendData?.monthKeys?.[index] || ""}" data-business-change-type="${label}" data-business-change-value="${Number(value).toFixed(1)}" ${isFuture ? 'stroke-dasharray="4 3"' : ""}></rect>`;
      }).join("");
    })
    .join("");

  const lineMarkup = seriesList
    .map((label, seriesIndex) => {
      const color = getPaletteColor(label, allSeries, seriesIndex, "line");
      const points = growthPlotSeries[seriesIndex]
        .map((value, index) => ({
          x: getFrameXPosition(frame, index, chartContext.xLabels.length),
          y: frame.bottom - (frame.height * (flowScope ? value : 18 + (value % 76))) / 100,
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
  const flowScope = getBusinessChangeFlowScope(widget);
  const trendData = flowScope ? buildBusinessChangeTrendData(widget, chartContext, selectedBusinesses) : null;

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
                  const scaleValues = trendData?.scaleByBusinessType?.[label]
                    || buildBarValues(widget.seq + seriesIndex * 17, chartContext.xLabels.length, chartContext.signature + seriesIndex * 31).map((value) => 18 + (value % 52));
                  const growthValues = trendData?.growthByBusinessType?.[label]
                    || buildMetricValues(widget.seq + 41 + seriesIndex * 13, chartContext.xLabels.length, chartContext.signature + seriesIndex * 29).map((value) => 18 + (value % 76));
                  return `<td>${scaleValues[index].toFixed(1)}</td><td>${growthValues[index].toFixed(1)}${flowScope ? "%" : ""}</td>`;
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
        ${renderWidgetDateRangeInlineControl(widget.seq, options.filterName || "时间区间（起止）", "统计月末区间", timeRangeValues)}
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
  if (getBusinessChangeFlowScope(widget)) {
    return buildMonthlyBusinessChangeStructureRows(widget, chartContext, timeRangeValues);
  }
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
    : `截至 ${getBusinessStructureReferenceEndDate()}`;
  return `${perspective.label}口径 | ${scopeMeta.label}${maturityScopeLabel} > ${drilldown.businessType} | 机构：${institutions} | 币种：${currencies} | ${dateText}`;
}

function buildBusinessDetailRows(widget, chartContext, drilldown) {
  const perspective = getBusinessAnalysisPerspectiveDefinition(chartContext.analysisPerspective);
  const groups = perspective.groups || BUSINESS_STRUCTURE_GROUPS;
  const behavior = getConfiguredWidgetBehavior(widget);
  const detailScope = behavior.detailScope || "stock";
  const scopeMeta = BUSINESS_DETAIL_SCOPE_META[detailScope] || BUSINESS_DETAIL_SCOPE_META.stock;
  const dateRange = getBusinessDrilldownDateRange(drilldown);
  if (["new", "maturity"].includes(detailScope)) {
    const future = detailScope === "maturity" && drilldown?.maturityTableScope === "future";
    return buildBusinessChangeFactsForDateRange(detailScope, chartContext, dateRange || [], {
      future,
      businessTypes: [drilldown.businessType],
    })
      .filter((row) => row.businessType === drilldown.businessType)
      .sort((left, right) => right.statMonth.localeCompare(left.statMonth) || left.businessId.localeCompare(right.businessId));
  }
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
  const rangeStart = dateRange?.[0] || getBusinessStructureReferenceStartDate();
  const rangeEnd = dateRange?.[1] || getBusinessStructureReferenceEndDate();
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
                <tr data-business-change-month="${row.statMonth || ""}">
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
  const cutoff = parseDateValue(getBusinessStructureReferenceEndDate()) || new Date();
  const cursor = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 1);
  return Array.from({ length: monthCount }, (_, index) => {
    const current = new Date(cursor.getFullYear(), cursor.getMonth() + index, 1);
    const month = String(current.getMonth() + 1).padStart(2, "0");
    return `${current.getFullYear()}-${month}`;
  });
}

function applyMaturityTrendDateRangeToLabels(widget, labels, filterState = {}) {
  const [rangeStart, rangeEnd] = getBusinessAnalysisDateRange();
  const datedEntries = buildTimelineEntries(widget, labels, filterState).filter((entry) => entry.date);
  const historicalLabels = datedEntries
    .filter((entry) => isTimelineEntryWithinRange(entry, rangeStart, rangeEnd))
    .map((entry) => entry.label);
  return uniqueList([...(historicalLabels.length ? historicalLabels : [datedEntries[0]?.label].filter(Boolean)), ...buildFutureMaturityMonthlyLabels()]);
}

function getMaturityFutureStartIndex(widget, labels = []) {
  if (!isMaturityTrendWidget(widget)) return -1;
  const cutoff = getBusinessStructureReferenceEndDate();
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

function getBusinessAnalysisMonthEndOptions() {
  const firstMonthKey = getBusinessMonthKeyFromDateValue(getDefaultGlobalStartDate());
  const lastMonthKey = getBusinessMonthKeyFromDateValue(getLatestCompletedBusinessMonthEnd(getDefaultGlobalEndDate()));
  const firstSerial = getBusinessMonthSerial(firstMonthKey);
  const lastSerial = getBusinessMonthSerial(lastMonthKey);
  if (!Number.isFinite(firstSerial) || !Number.isFinite(lastSerial)) return [];
  const lower = Math.min(firstSerial, lastSerial);
  const upper = Math.max(firstSerial, lastSerial);
  return Array.from({ length: upper - lower + 1 }, (_, index) =>
    getBusinessMonthEndDate(formatBusinessMonthKey(lower + index))
  );
}

function getDefaultBusinessAnalysisDateRange() {
  const options = getBusinessAnalysisMonthEndOptions();
  const fallbackEnd = getLatestCompletedBusinessMonthEnd(getDefaultGlobalEndDate());
  return [options[0] || fallbackEnd, options[options.length - 1] || fallbackEnd];
}

function normalizeBusinessAnalysisDateRange(values = [], changedIndex = null) {
  const options = getBusinessAnalysisMonthEndOptions();
  const [defaultStart, defaultEnd] = getDefaultBusinessAnalysisDateRange();
  const minimum = options[0] || defaultStart;
  const maximum = options[options.length - 1] || defaultEnd;
  let startDate = normalizeBusinessMonthEndDate(Array.isArray(values) ? values[0] : "", defaultStart);
  let endDate = normalizeBusinessMonthEndDate(Array.isArray(values) ? values[1] : "", defaultEnd);
  startDate = startDate < minimum ? minimum : startDate > maximum ? maximum : startDate;
  endDate = endDate < minimum ? minimum : endDate > maximum ? maximum : endDate;
  if (startDate > endDate) {
    if (Number(changedIndex) === 0) endDate = startDate;
    else startDate = endDate;
  }
  return [startDate, endDate];
}

function ensureBusinessAnalysisDateRange() {
  const [defaultStart] = getDefaultBusinessAnalysisDateRange();
  const normalized = normalizeBusinessAnalysisDateRange([defaultStart, appState.businessEndDate], 1);
  [appState.businessStartDate, appState.businessEndDate] = normalized;
  return normalized;
}

function getBusinessAnalysisDateRange() {
  return ensureBusinessAnalysisDateRange();
}

function renderBusinessAnalysisDateRangeControl() {
  if (!businessEndInputEl) return;
  const [, endDate] = ensureBusinessAnalysisDateRange();
  const options = getBusinessAnalysisMonthEndOptions();
  const renderOptions = (selectedDate) => options
    .map((dateValue) => `<option value="${dateValue}" ${dateValue === selectedDate ? "selected" : ""}>${dateValue}</option>`)
    .join("");
  businessEndInputEl.innerHTML = renderOptions(endDate);
  businessEndInputEl.value = endDate;
}

function resetBusinessStructureDateRanges() {
  const newBusinessState = appState.widgetFilters[89];
  if (newBusinessState) delete newBusinessState["时间区间（起止）"];
  const maturityState = appState.widgetFilters[96];
  if (maturityState) {
    delete maturityState["历史时间区间（起止）"];
    delete maturityState["未来时间区间（起止）"];
  }
}

function updateBusinessAnalysisDateRange(changedIndex, dateValue) {
  const currentRange = ensureBusinessAnalysisDateRange();
  currentRange[Number(changedIndex)] = dateValue || currentRange[Number(changedIndex)];
  const normalized = normalizeBusinessAnalysisDateRange(currentRange, changedIndex);
  [appState.businessStartDate, appState.businessEndDate] = normalized;
  resetBusinessStructureDateRanges();
  return normalized;
}

function getBusinessStructureReferenceEndDate() {
  return typeof appState !== "undefined" && isDateValue(appState.businessEndDate)
    ? appState.businessEndDate
    : getDefaultBusinessAnalysisDateRange()[1];
}

function getBusinessStructureReferenceStartDate() {
  return typeof appState !== "undefined" && isDateValue(appState.businessStartDate)
    ? appState.businessStartDate
    : getDefaultBusinessAnalysisDateRange()[0];
}

function getLatestCompletedBusinessMonthEnd(referenceDateValue = null) {
  const resolvedReferenceDateValue = referenceDateValue
    || (typeof appState !== "undefined" && isDateValue(appState.businessEndDate) ? appState.businessEndDate : getDefaultGlobalEndDate());
  const referenceDate = parseDateValue(resolvedReferenceDateValue) || parseDateValue(getDefaultGlobalEndDate()) || new Date();
  const currentMonthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  if (formatDateValue(currentMonthEnd) <= formatDateValue(referenceDate)) return formatDateValue(currentMonthEnd);
  return formatDateValue(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0));
}

function normalizeBusinessMonthEndDate(dateValue, fallbackDateValue) {
  if (!isDateValue(dateValue)) return fallbackDateValue;
  return getBusinessMonthEndDate(getBusinessMonthKeyFromDateValue(dateValue));
}

function getBusinessMonthEndSelectionOptions(rangeMode = "historical") {
  const cutoffMonthKey = getBusinessMonthKeyFromDateValue(getLatestCompletedBusinessMonthEnd());
  const cutoffSerial = getBusinessMonthSerial(cutoffMonthKey);
  if (!Number.isFinite(cutoffSerial)) return [];
  if (rangeMode === "future") {
    return Array.from({ length: FUTURE_MATURITY_MONTH_COUNT }, (_, index) =>
      getBusinessMonthEndDate(formatBusinessMonthKey(cutoffSerial + index + 1))
    );
  }
  const referenceStartMonthKey = getBusinessMonthKeyFromDateValue(getBusinessStructureReferenceStartDate());
  const referenceStartSerial = getBusinessMonthSerial(referenceStartMonthKey);
  const firstSerial = Number.isFinite(referenceStartSerial)
    ? Math.min(referenceStartSerial, cutoffSerial)
    : cutoffSerial;
  return Array.from({ length: cutoffSerial - firstSerial + 1 }, (_, index) =>
    getBusinessMonthEndDate(formatBusinessMonthKey(firstSerial + index))
  );
}

function getDefaultBusinessStructureDateRange() {
  return [getBusinessStructureReferenceStartDate(), getBusinessStructureReferenceEndDate()];
}

function getDefaultFutureBusinessStructureDateRange(referenceDateValue = getBusinessStructureReferenceEndDate()) {
  const cutoffMonthKey = getBusinessMonthKeyFromDateValue(getLatestCompletedBusinessMonthEnd(referenceDateValue));
  const cutoffSerial = getBusinessMonthSerial(cutoffMonthKey);
  if (!Number.isFinite(cutoffSerial)) return getDefaultBusinessStructureDateRange();
  const startDate = getBusinessMonthEndDate(formatBusinessMonthKey(cutoffSerial + 1));
  const endDate = getBusinessMonthEndDate(formatBusinessMonthKey(cutoffSerial + FUTURE_MATURITY_MONTH_COUNT));
  return [startDate, endDate];
}

function isFutureBusinessDate(dateValue) {
  return isDateValue(dateValue) && dateValue > getLatestCompletedBusinessMonthEnd();
}

function normalizeBusinessStructureDateRange(values = [], options = {}) {
  const rangeMode = options.rangeMode === "future" ? "future" : "historical";
  const changedIndex = options.changedIndex == null ? null : Number(options.changedIndex);
  const selectionOptions = getBusinessMonthEndSelectionOptions(rangeMode);
  const fallbackRange = rangeMode === "future"
    ? getDefaultFutureBusinessStructureDateRange()
    : getDefaultBusinessStructureDateRange();
  const minimum = selectionOptions[0] || fallbackRange[0];
  const maximum = selectionOptions[selectionOptions.length - 1] || fallbackRange[1];
  let startDate = normalizeBusinessMonthEndDate(Array.isArray(values) ? values[0] : "", fallbackRange[0]);
  let endDate = normalizeBusinessMonthEndDate(Array.isArray(values) ? values[1] : "", fallbackRange[1]);
  startDate = startDate < minimum ? minimum : startDate > maximum ? maximum : startDate;
  endDate = endDate < minimum ? minimum : endDate > maximum ? maximum : endDate;
  if (startDate > endDate) {
    if (changedIndex === 0) {
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
    return normalizeBusinessStructureDateRange(normalizedValues, { rangeMode, changedIndex });
  }
  return normalizeBusinessStructureDateRange(values, { rangeMode: "historical", changedIndex });
}
