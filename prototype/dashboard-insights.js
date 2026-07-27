// AI insight surfaces. Loaded after dashboard-processes.js so diagnostic models and attribution can be reused.
const REPRICING_GAP_AI_WIDGET_SEQ = 9;
const REPRICING_GAP_AI_SINGLE_CURRENCIES = [
  "人民币",
  "美元",
  "港币",
  "新加坡元",
  "欧元",
  "澳元",
  "英镑",
  "日元",
];

function escapeInsightHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInsightTrendSeries(widget) {
  const labels = inferXAxisLabels(widget);
  const values = buildMetricValues(widget.seq, labels.length, widget.seq * 7);
  return labels.map((label, index) => ({ label, value: Number(values[index] || 0) }));
}

function formatInsightRateText(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function buildTrendInsightStats(series) {
  const values = series.map((item) => Number(item.value || 0));
  const current = values[values.length - 1] || 0;
  const prev = values[Math.max(0, values.length - 2)] || current;
  const yearStart = values[0] || current;
  const mom = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  const ytd = yearStart ? ((current - yearStart) / Math.abs(yearStart)) * 100 : 0;
  const cumulative = values.length > 1 ? ((current - values[0]) / Math.abs(values[0] || 1)) * 100 : 0;
  return {
    current,
    momText: formatInsightRateText(mom),
    yoyText: "同比可比样本暂不完整，建议后续接入真实历史同期数据后补充。",
    ytdText: formatInsightRateText(ytd),
    cumulativeText: formatInsightRateText(cumulative),
  };
}

function buildWidgetInsight(context) {
  const series = buildInsightTrendSeries(context.widget);
  const primaryStats = buildTrendInsightStats(series);
  return `${context.widget.title}当前取值约为 ${primaryStats.current.toFixed(1)}。环比变动 ${primaryStats.momText}，较年初变动 ${primaryStats.ytdText}，区间累计增速 ${primaryStats.cumulativeText}。${primaryStats.yoyText} 综合来看，当前指标位于近期波动区间内，建议结合机构、币种和业务结构进一步定位主要驱动项。`;
}

function isRepricingGapAiWidget(widget) {
  return Number(widget?.sourceSeq || widget?.seq) === REPRICING_GAP_AI_WIDGET_SEQ;
}

function getRepricingGapAiBehavior(widget) {
  return getConfiguredWidgetBehavior(widget)?.aiInsight || {};
}

function getRepricingGapAiPrompts(analysis) {
  const conversation = Array.isArray(appState.insightConversation)
    ? appState.insightConversation
    : [];
  const userQuestions = conversation
    .filter((message) => message.role === "user")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);
  const lastQuestion = userQuestions[userQuestions.length - 1] || "";
  const specificBusiness = findRepricingGapAiQuestionBusiness(analysis, lastQuestion);

  if (specificBusiness) {
    return [
      `${specificBusiness.title}有哪些新增和退出业务？`,
      `${specificBusiness.title}有哪些大额业务需要关注？`,
      `${specificBusiness.title}的重定价期限为什么会缩短？`,
      "还有哪些业务因素值得关注？",
    ];
  }

  const hasAskedAttribution = userQuestions.some((question) =>
    /重定价缺口率.*变动|变动.*导致|归因|影响因素/.test(question)
  );
  if (hasAskedAttribution) {
    const leadingBusinesses = getRepricingGapAiLeadingBusinessFactors(analysis, 20);
    const selfOperatedLoans = leadingBusinesses.find((item) => item.title === "自营贷款");
    const guidedBusinesses = [
      ...(selfOperatedLoans ? [selfOperatedLoans] : []),
      ...leadingBusinesses.filter((item) => item !== selfOperatedLoans),
    ].slice(0, 3);
    return [
      ...guidedBusinesses.map((item) => `为什么${item.title}的影响这么大？`),
      "正向影响和抵消因素分别有哪些？",
    ];
  }

  const configured = getRepricingGapAiBehavior(analysis.target.widget).suggestions;
  if (Array.isArray(configured) && configured.length) return configured;
  return [
    "重定价缺口率的变动是由什么导致的？",
    "当前币种距离限额还有多大空间？",
    "哪些币种属于重要币种？",
    "当前重定价缺口率走势有什么特征？",
  ];
}

function buildRepricingGapAiChartContext(target, currency) {
  const areaState = applyPageSharedFiltersToState(
    cloneFilterState(ensureAreaFilterState(target.area)),
    target.page
  );
  const widgetState = {
    ...ensureWidgetFilterState(target.widget, getWidgetBehavior(target.widget)),
    币种: [currency],
  };
  return buildChartContext(target.widget, areaState, widgetState);
}

function buildRepricingGapAiModel(target, currency) {
  const chartContext = buildRepricingGapAiChartContext(target, currency);
  return {
    chartContext,
    model: buildRepricingGapDiagnosticModel(target.widget, chartContext),
  };
}

function getRepricingGapAiLimitEntries(widget, organization) {
  return getManagementLimitConfigs(widget)
    .flatMap((configItem) => (configItem.entries || []).map((entry) => ({
      ...entry,
      indicator: configItem.indicator,
    })))
    .filter((entry) => entry.organization === organization);
}

function findRepricingGapAiLimit(entries, currency) {
  return entries.find((entry) => entry.currency === currency) || null;
}

function normalizeRepricingGapAiSelectedScope(currency) {
  if (["全折人民币", "全折美元", "全折欧元"].includes(currency)) {
    return { key: "total", kind: "total", label: "本外币合计", limitCurrency: "全折人民币" };
  }
  if (currency === "外币折美元") {
    return { key: "foreign", kind: "foreign", label: "外币折美元", limitCurrency: currency };
  }
  return { key: currency, kind: "single", label: currency, limitCurrency: currency };
}

function buildRepricingGapAiCurrencyWeights(organization, limitEntries) {
  const baseWeights = {
    人民币: 0.42,
    美元: 0.24,
    港币: 0.1,
    新加坡元: 0.06,
    欧元: 0.07,
    澳元: 0.04,
    英镑: 0.04,
    日元: 0.03,
  };
  const configuredImportantCurrencies = new Set(
    limitEntries
      .map((entry) => entry.currency)
      .filter((currency) => REPRICING_GAP_AI_SINGLE_CURRENCIES.includes(currency))
  );
  const signature = Number(createSignature(REPRICING_GAP_AI_WIDGET_SEQ, { 机构: [organization] }));
  const rawWeights = REPRICING_GAP_AI_SINGLE_CURRENCIES.map((currency, index) => {
    const organizationAdjustment = 0.96 + ((signature + index * 7) % 9) / 100;
    const configuredAdjustment = configuredImportantCurrencies.size
      ? configuredImportantCurrencies.has(currency) ? 1.6 : 0.35
      : 1;
    return {
      currency,
      weight: baseWeights[currency] * organizationAdjustment * configuredAdjustment,
    };
  });
  const weightTotal = rawWeights.reduce((sum, item) => sum + item.weight, 0);
  return Object.fromEntries(rawWeights.map((item) => [
    item.currency,
    weightTotal ? item.weight / weightTotal : 0,
  ]));
}

function buildRepricingGapAiTrendStats(values = []) {
  const numericValues = values.map((value) => Number(value)).filter(Number.isFinite);
  const currentIndex = numericValues.length - 1;
  const current = numericValues[currentIndex] || 0;
  const previous = numericValues[Math.max(0, currentIndex - 1)] ?? current;
  const delta = current - previous;
  const minimum = numericValues.length ? Math.min(...numericValues) : current;
  const maximum = numericValues.length ? Math.max(...numericValues) : current;
  const range = Math.max(1e-9, maximum - minimum);
  const rangePosition = ((current - minimum) / range) * 100;
  const direction = delta > 1e-9 ? 1 : delta < -1e-9 ? -1 : 0;
  let consecutivePeriods = direction ? 1 : 0;
  if (direction) {
    for (let index = currentIndex - 1; index > 0; index -= 1) {
      const step = numericValues[index] - numericValues[index - 1];
      if ((direction > 0 && step > 0) || (direction < 0 && step < 0)) consecutivePeriods += 1;
      else break;
    }
  }
  return {
    current,
    previous,
    delta,
    minimum,
    maximum,
    rangePosition,
    direction,
    consecutivePeriods,
  };
}

function formatRepricingGapAiAmount(value) {
  return `${Number(value || 0).toFixed(1)}亿元`;
}

function formatRepricingGapAiSignedPct(value) {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}pct`;
}

function formatRepricingGapAiLimit(entry) {
  if (!entry) return "未配置";
  return `${entry.operator || ""}${formatManagementLimitNumber(entry.value)}${entry.unit || ""}`;
}

function formatRepricingGapAiLimitDistance(entry, currentValue) {
  if (!entry) return "";
  const limitValue = Number(entry.value);
  const current = Number(currentValue);
  if (!Number.isFinite(limitValue) || !Number.isFinite(current)) return "";
  if (entry.operator === "<=") {
    const distance = limitValue - current;
    return distance >= 0
      ? `距离限额尚有 ${distance.toFixed(1)}pct 空间`
      : `已超出限额 ${Math.abs(distance).toFixed(1)}pct`;
  }
  if (entry.operator === ">=") {
    const distance = current - limitValue;
    return distance >= 0
      ? `高于限额底线 ${distance.toFixed(1)}pct`
      : `低于限额底线 ${Math.abs(distance).toFixed(1)}pct`;
  }
  return "";
}

function buildRepricingGapAiAnalysis(target) {
  const currentContext = buildRepricingGapAiChartContext(
    target,
    (ensurePageFilterState(target.page).币种 || ["全折人民币"])[0]
  );
  const organization = (currentContext.filterState.机构 || ["法人汇总"])[0];
  const selectedCurrency = (currentContext.filterState.币种 || ["全折人民币"])[0];
  const selectedScope = normalizeRepricingGapAiSelectedScope(selectedCurrency);
  const selectedModel = buildRepricingGapDiagnosticModel(target.widget, currentContext);
  const totalResult = buildRepricingGapAiModel(target, "全折人民币");
  const totalModel = totalResult.model;
  const currentIndex = Math.max(0, totalModel.labels.length - 1);
  const selectedIndex = Math.max(0, selectedModel.labels.length - 1);
  const totalScale = Number(totalModel.totalInterestAssets[currentIndex] || 0);
  const limitEntries = getRepricingGapAiLimitEntries(target.widget, organization);
  const currencyWeights = buildRepricingGapAiCurrencyWeights(organization, limitEntries);
  const singleCurrencyScales = Object.fromEntries(
    REPRICING_GAP_AI_SINGLE_CURRENCIES.map((currency) => [
      currency,
      totalScale * Number(currencyWeights[currency] || 0),
    ])
  );
  const foreignScale = REPRICING_GAP_AI_SINGLE_CURRENCIES
    .filter((currency) => currency !== "人民币")
    .reduce((sum, currency) => sum + singleCurrencyScales[currency], 0);
  const currencyScopes = [
    { key: "total", label: "本外币合计", filterCurrency: "全折人民币", scale: totalScale, kind: "total" },
    { key: "foreign", label: "外币折美元", filterCurrency: "外币折美元", scale: foreignScale, kind: "foreign" },
    ...REPRICING_GAP_AI_SINGLE_CURRENCIES.map((currency) => ({
      key: currency,
      label: currency,
      filterCurrency: currency,
      scale: singleCurrencyScales[currency],
      kind: "single",
    })),
  ].map((scope) => {
    const result = buildRepricingGapAiModel(target, scope.filterCurrency);
    const ratioIndex = Math.max(0, result.model.ratios.length - 1);
    return {
      ...scope,
      ratio: Number(result.model.ratios[ratioIndex] || 0),
    };
  });
  const selectedCategory = currencyScopes.find((item) => item.key === selectedScope.key) || currencyScopes[0];
  const selectedShare = totalScale ? (selectedCategory.scale / totalScale) * 100 : 0;
  const importantThreshold = Number(getRepricingGapAiBehavior(target.widget).importantCurrencyThreshold || 5);
  const isImportantCurrency = selectedScope.kind === "single" && selectedShare > importantThreshold;
  let totalLimit = findRepricingGapAiLimit(limitEntries, "全折人民币");
  if (!totalLimit && Number.isFinite(Number(totalModel.limit))) {
    totalLimit = {
      organization,
      currency: "全折人民币",
      operator: "<=",
      value: Number(totalModel.limit),
      unit: "%",
      indicator: "经期限调整的重定价缺口率",
      fallback: true,
    };
  }
  const selectedLimit = selectedScope.kind === "total"
    ? totalLimit
    : findRepricingGapAiLimit(limitEntries, selectedScope.limitCurrency);
  const trendStats = buildRepricingGapAiTrendStats(selectedModel.ratios);
  const currentDate = selectedModel.displayLabels[selectedIndex] || selectedModel.labels[selectedIndex] || "";
  const importanceNarrative = (() => {
    const scopeText = `${selectedCurrency}折人民币规模为${formatRepricingGapAiAmount(selectedCategory.scale)}，占${organization}本外币合计规模的${selectedShare.toFixed(1)}%`;
    const totalLimitText = totalLimit
      ? `本外币合计重定价缺口率限额为${formatRepricingGapAiLimit(totalLimit)}`
      : "本外币合计限额尚未在管理限额配置中维护";
    if (selectedScope.kind === "total") {
      return `${organization}当前本外币合计规模为${formatRepricingGapAiAmount(totalScale)}，当前选择的是本外币合计口径，占比为100%。${totalLimitText}。`;
    }
    if (selectedScope.kind === "foreign") {
      return `${scopeText}。该口径为外币汇总口径，不按单币种5%标准判定重要币种；${totalLimitText}。`;
    }
    if (isImportantCurrency) {
      const selectedLimitText = selectedLimit
        ? `该重要币种适用限额为${formatRepricingGapAiLimit(selectedLimit)}`
        : "该币种虽达到重要币种标准，但管理限额配置中尚未找到对应限额";
      return `${scopeText}，超过${importantThreshold}%标准，属于重要币种。${selectedLimitText}；${totalLimitText}。`;
    }
    return `${scopeText}，未超过${importantThreshold}%标准，不属于重要币种，因此不单独适用重要币种限额；${totalLimitText}。`;
  })();
  const trendNarrative = (() => {
    const directionText = trendStats.direction > 0
      ? `较上期上升${Math.abs(trendStats.delta).toFixed(2)}pct`
      : trendStats.direction < 0
        ? `较上期下降${Math.abs(trendStats.delta).toFixed(2)}pct`
        : "较上期基本持平";
    const sequenceText = trendStats.consecutivePeriods > 1
      ? `，已连续${trendStats.consecutivePeriods}期${trendStats.direction > 0 ? "上升" : "下降"}`
      : "";
    const locationText = trendStats.rangePosition >= 75
      ? "处于所选区间相对高位"
      : trendStats.rangePosition <= 25
        ? "处于所选区间相对低位"
        : "处于所选区间中部";
    const distanceText = formatRepricingGapAiLimitDistance(selectedLimit, trendStats.current);
    const limitText = distanceText
      ? `；${distanceText}`
      : selectedScope.kind === "single" && !isImportantCurrency
        ? "；该币种不属于重要币种，无单币种限额距离"
        : "；当前口径未配置可比较的独立限额";
    return `${currentDate}${selectedCurrency}重定价缺口率为${trendStats.current.toFixed(1)}%，${directionText}${sequenceText}。所选区间波动范围为${trendStats.minimum.toFixed(1)}%—${trendStats.maximum.toFixed(1)}%，当前值${locationText}${limitText}。`;
  })();
  return {
    target,
    chartContext: currentContext,
    organization,
    selectedCurrency,
    selectedScope,
    selectedCategory,
    selectedShare,
    importantThreshold,
    isImportantCurrency,
    totalScale,
    totalLimit,
    selectedLimit,
    selectedModel,
    selectedIndex,
    comparisonIndex: Math.max(0, selectedIndex - 1),
    currentDate,
    trendStats,
    currencyScopes,
    importanceNarrative,
    trendNarrative,
  };
}

function renderRepricingGapAiComboChart(analysis) {
  const scopes = analysis.currencyScopes;
  const frame = { left: 50, right: 530, top: 30, bottom: 220, width: 480, height: 190 };
  const maxScale = Math.max(1, ...scopes.map((item) => item.scale)) * 1.08;
  const limitValues = [analysis.totalLimit, analysis.selectedLimit]
    .filter(Boolean)
    .map((entry) => Number(entry.value))
    .filter(Number.isFinite);
  const rateMinimum = Math.min(0, ...scopes.map((item) => item.ratio));
  const rateMaximum = Math.max(1, ...scopes.map((item) => item.ratio), ...limitValues) * 1.12;
  const rateRange = Math.max(1e-9, rateMaximum - rateMinimum);
  const step = frame.width / scopes.length;
  const barWidth = Math.min(30, step * 0.58);
  const scaleTicks = [0, maxScale / 2, maxScale];
  const rateTicks = [rateMinimum, rateMinimum + rateRange / 2, rateMaximum];
  const grid = scaleTicks.map((tick) => {
    const y = frame.bottom - (frame.height * tick) / maxScale;
    return `
      <line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="rgba(80,125,180,0.14)" stroke-width="1"></line>
      <text x="${frame.left - 8}" y="${y + 4}" text-anchor="end" class="repricing-ai-chart__axis-label">${tick.toFixed(0)}</text>
    `;
  }).join("");
  const rateAxis = rateTicks.map((tick) => {
    const y = frame.bottom - (frame.height * (tick - rateMinimum)) / rateRange;
    return `<text x="${frame.right + 8}" y="${y + 4}" class="repricing-ai-chart__axis-label">${tick.toFixed(0)}%</text>`;
  }).join("");
  const marks = scopes.map((scope, index) => {
    const centerX = frame.left + step * index + step / 2;
    const barHeight = frame.height * (scope.scale / maxScale);
    const barY = frame.bottom - barHeight;
    const pointY = frame.bottom - frame.height * ((scope.ratio - rateMinimum) / rateRange);
    const isSelected = scope.key === analysis.selectedScope.key;
    const barFill = isSelected ? "#f0a25d" : "#78aee8";
    const pointFill = isSelected ? "#c9663e" : "#285f9e";
    return `
      <rect
        x="${centerX - barWidth / 2}"
        y="${barY}"
        width="${barWidth}"
        height="${barHeight}"
        rx="4"
        fill="${barFill}"
        opacity="${isSelected ? "0.94" : "0.72"}"
        data-repricing-ai-bar="${scope.key}"
      ><title>${scope.label}规模：${scope.scale.toFixed(1)}亿元（折人民币）</title></rect>
      <circle
        cx="${centerX}"
        cy="${pointY}"
        r="${isSelected ? 6 : 4.5}"
        fill="#ffffff"
        stroke="${pointFill}"
        stroke-width="${isSelected ? 3 : 2.4}"
        data-repricing-ai-point="${scope.key}"
      ><title>${scope.label}重定价缺口率：${scope.ratio.toFixed(1)}%</title></circle>
      <text
        x="${centerX + 2}"
        y="${frame.bottom + 17}"
        text-anchor="end"
        transform="rotate(-32 ${centerX + 2} ${frame.bottom + 17})"
        class="repricing-ai-chart__x-label ${isSelected ? "is-selected" : ""}"
      >${scope.label}</text>
    `;
  }).join("");
  return `
    <div class="repricing-ai-chart" data-repricing-ai-combo-chart="true">
      <div class="repricing-ai-chart__title-row">
        <div>
          <h4>机构内币种规模与重定价缺口率</h4>
          <p>规模统一折人民币；本外币合计、外币折美元为汇总口径，不与单币种柱直接加总。</p>
        </div>
        <div class="repricing-ai-chart__legend" aria-label="图例">
          <span><i class="is-bar"></i>规模</span>
          <span><i class="is-point"></i>缺口率</span>
        </div>
      </div>
      <svg viewBox="0 0 590 290" role="img" aria-label="${escapeInsightHtml(analysis.organization)}各币种规模柱状图和重定价缺口率散点图">
        <text x="${frame.left}" y="18" class="repricing-ai-chart__axis-title">规模（亿元人民币）</text>
        <text x="${frame.right}" y="18" text-anchor="end" class="repricing-ai-chart__axis-title">重定价缺口率</text>
        ${grid}
        ${rateAxis}
        <line x1="${frame.left}" y1="${frame.bottom}" x2="${frame.right}" y2="${frame.bottom}" stroke="rgba(80,125,180,0.36)" stroke-width="1.2"></line>
        ${marks}
      </svg>
    </div>
  `;
}

function buildRepricingGapAiAttributionFactors(analysis) {
  const impactMap = buildRepricingGapProcessImpactMap(
    analysis.selectedModel,
    analysis.selectedIndex,
    analysis.comparisonIndex
  );
  const factors = [
    ...analysis.selectedModel.assetItems.flatMap((item) => [
      {
        label: `${item.title}—一年内重定价`,
        businessKey: item.key,
        businessTitle: item.title,
        side: "asset",
        component: "withinOneYear",
        values: item.withinOneYearValues,
        impact: Number(impactMap[`${item.key}:withinOneYear`] || 0),
      },
      {
        label: `${item.title}—一年外重定价`,
        businessKey: item.key,
        businessTitle: item.title,
        side: "asset",
        component: "beyondOneYear",
        values: item.beyondOneYearValues,
        impact: Number(impactMap[`${item.key}:beyondOneYear`] || 0),
      },
    ]),
    ...analysis.selectedModel.liabilityItems.map((item) => ({
      label: item.title,
      businessKey: item.key,
      businessTitle: item.title,
      side: "liability",
      component: "repricingScale",
      values: item.values,
      impact: Number(impactMap[item.key] || 0),
    })),
    {
      label: "银行账簿表外衍生品缺口",
      businessKey: "bank-book-derivative-gap",
      businessTitle: "银行账簿表外衍生品缺口",
      side: "derivative",
      component: "gap",
      values: analysis.selectedModel.bankBookDerivativeGap,
      impact: Number(impactMap["bank-book-derivative-gap"] || 0),
    },
    {
      label: "交易账簿表外衍生品缺口",
      businessKey: "trading-book-derivative-gap",
      businessTitle: "交易账簿表外衍生品缺口",
      side: "derivative",
      component: "gap",
      values: analysis.selectedModel.tradingBookDerivativeGap,
      impact: Number(impactMap["trading-book-derivative-gap"] || 0),
    },
  ].sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact));
  return { impactMap, factors };
}

function getRepricingGapAiLeadingBusinessFactors(analysis, limit = 5) {
  if (analysis.selectedModel.supportsAttribution === false) return [];
  const { factors } = buildRepricingGapAiAttributionFactors(analysis);
  const grouped = new Map();
  factors.forEach((factor) => {
    if (factor.side === "derivative") return;
    const current = grouped.get(factor.businessKey) || {
      key: factor.businessKey,
      title: factor.businessTitle,
      side: factor.side,
      impact: 0,
      factors: [],
    };
    current.impact += Number(factor.impact || 0);
    current.factors.push(factor);
    grouped.set(factor.businessKey, current);
  });
  return Array.from(grouped.values())
    .filter((item) => Math.abs(item.impact) > 1e-9)
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .slice(0, limit);
}

function getRepricingGapAiBusinessDefinitions(analysis) {
  return [
    ...analysis.selectedModel.assetItems.map((item) => ({
      key: item.key,
      title: item.title,
      side: "asset",
      item,
    })),
    ...analysis.selectedModel.liabilityItems.map((item) => ({
      key: item.key,
      title: item.title,
      side: "liability",
      item,
    })),
  ];
}

function findRepricingGapAiQuestionBusiness(analysis, question) {
  const normalized = String(question || "");
  return getRepricingGapAiBusinessDefinitions(analysis)
    .sort((left, right) => right.title.length - left.title.length)
    .find((item) => normalized.includes(item.title)) || null;
}

function buildRepricingGapAiAttributionReply(analysis) {
  if (analysis.selectedModel.supportsAttribution === false) {
    return "当前选择的活期存款或表外衍生品口径不支持正式归因。请切换到默认口径后再分析变动原因。";
  }
  const { impactMap, factors } = buildRepricingGapAiAttributionFactors(analysis);
  const leading = factors.filter((item) => Math.abs(item.impact) > 1e-9).slice(0, 5);
  const leadingText = leading.length
    ? leading.map((item, index) => {
      const currentValue = Number(item.values?.[analysis.selectedIndex] || 0);
      const delta = formatProcessNodeDelta(
        item.values,
        analysis.selectedIndex,
        analysis.comparisonIndex,
        "amount"
      );
      const growth = formatProcessNodeGrowth(
        item.values,
        analysis.selectedIndex,
        analysis.comparisonIndex
      );
      const impact = formatProcessNodeImpact(item.impact);
      return `${index + 1}. ${item.label}：当前取值 ${formatEveAmount(currentValue)}，较基期${delta.text}、${growth.text}，${impact.text}`;
    }).join("；\n")
    : "各末级因素影响接近0";
  const ratioChange = Number(impactMap.ratio || 0);
  return `已读取当前币种的正式Owen归因结果：${analysis.selectedModel.displayLabels[analysis.comparisonIndex]}至${analysis.currentDate}，重定价缺口率变动${formatRepricingGapAiSignedPct(ratioChange)}。按影响绝对值排序，主要因素如下：\n${leadingText}。\n上述因素影响合计与指标变动保持勾稽，可继续进入“计算过程”查看完整层级。`;
}

function parseRepricingGapAiDisplayDate(value, useMonthEnd = true) {
  const normalized = String(value || "").trim().replace(/\//g, "-");
  const exactDate = parseDateValue(normalized);
  if (exactDate) return exactDate;
  const monthMatch = normalized.match(/^(\d{4})-(\d{1,2})$/);
  if (!monthMatch) return null;
  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]) - 1;
  return useMonthEnd
    ? new Date(year, month + 1, 0)
    : new Date(year, month, 1);
}

function getRepricingGapAiDaysBetween(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

function parseRepricingGapAiAmount(value) {
  const numeric = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatRepricingGapAiRecord(record, amountField = "currentAmount") {
  const amount = Number(record?.[amountField] || record?.amount || 0);
  const counterparty = record?.counterparty ? `（${record.counterparty}）` : "";
  return `${record.businessId}${counterparty}，${amount.toFixed(1)}亿元`;
}

function buildRepricingGapAiDetailComparison(analysis, business) {
  const maturityTarget = findWidgetBySeq(14);
  if (!maturityTarget?.widget || typeof buildBusinessDetailRows !== "function") {
    return {
      comparisonDate: analysis.selectedModel.displayLabels[analysis.comparisonIndex],
      currentDate: analysis.currentDate,
      events: [],
      largeRecords: [],
    };
  }
  const detailContext = buildRepricingGapAiChartContext(
    maturityTarget,
    analysis.selectedCurrency
  );
  const baseRows = buildBusinessDetailRows(maturityTarget.widget, detailContext, {
    businessType: business.title,
    sourceWidgetSeq: maturityTarget.widget.seq,
  }).slice(0, 10);
  const comparisonLabel = analysis.selectedModel.displayLabels[analysis.comparisonIndex]
    || analysis.selectedModel.labels[analysis.comparisonIndex]
    || "";
  const currentLabel = analysis.selectedModel.displayLabels[analysis.selectedIndex]
    || analysis.selectedModel.labels[analysis.selectedIndex]
    || "";
  const comparisonDate = parseRepricingGapAiDisplayDate(comparisonLabel);
  const currentDate = parseRepricingGapAiDisplayDate(currentLabel);
  const safeCurrentDate = currentDate || new Date();
  const elapsedDays = Math.max(1, getRepricingGapAiDaysBetween(
    comparisonDate || safeCurrentDate,
    safeCurrentDate
  ));

  const normalizedRows = baseRows.map((row, index) => {
    const amount = parseRepricingGapAiAmount(row.holdingScale || row.amount);
    const fixedRepricingDate = index === 2
      ? new Date(
        safeCurrentDate.getFullYear(),
        safeCurrentDate.getMonth(),
        safeCurrentDate.getDate() + Math.max(330, 365 - elapsedDays + 8)
      )
      : index === 3
        ? new Date(
          safeCurrentDate.getFullYear(),
          safeCurrentDate.getMonth(),
          safeCurrentDate.getDate() + 150
        )
        : parseDateValue(row.repricingDate)
          || parseDateValue(row.contractMaturityDate)
          || new Date(
            safeCurrentDate.getFullYear(),
            safeCurrentDate.getMonth(),
            safeCurrentDate.getDate() + 60 + index * 45
          );
    return {
      businessId: row.businessId || `STK-${String(index + 1).padStart(6, "0")}`,
      counterparty: row.counterparty || row.issuer || "",
      currency: row.currency || analysis.selectedCurrency,
      rateType: row.rateType || "",
      repricingDate: fixedRepricingDate,
      amount,
      comparisonAmount: Number((amount * (0.96 + (index % 4) * 0.015)).toFixed(1)),
      currentAmount: Number((amount * (0.98 + ((index + 1) % 3) * 0.02)).toFixed(1)),
      index,
    };
  });

  const events = [];
  normalizedRows.forEach((row) => {
    if (row.index === 0) {
      events.push({ ...row, cause: "new", causeLabel: "当期新增", comparisonAmount: 0 });
      return;
    }
    if (row.index === 1) {
      events.push({ ...row, cause: "exit", causeLabel: "到期或退出", currentAmount: 0 });
      return;
    }
    const comparisonRemainingDays = getRepricingGapAiDaysBetween(
      comparisonDate || safeCurrentDate,
      row.repricingDate
    );
    const currentRemainingDays = getRepricingGapAiDaysBetween(
      safeCurrentDate,
      row.repricingDate
    );
    if (comparisonRemainingDays > 365 && currentRemainingDays <= 365) {
      events.push({
        ...row,
        cause: "enterWithinOneYear",
        causeLabel: "由一年外进入一年内",
        comparisonRemainingDays,
        currentRemainingDays,
      });
      return;
    }
    if (currentRemainingDays >= 0 && currentRemainingDays < comparisonRemainingDays) {
      events.push({
        ...row,
        cause: "naturalShortening",
        causeLabel: "期限自然缩短",
        comparisonRemainingDays,
        currentRemainingDays,
      });
    }
  });
  const largeRecords = events
    .slice()
    .sort((left, right) =>
      Math.max(right.currentAmount, right.comparisonAmount)
      - Math.max(left.currentAmount, left.comparisonAmount)
    )
    .slice(0, 4);
  return {
    comparisonDate: comparisonLabel,
    currentDate: currentLabel,
    elapsedDays,
    events,
    largeRecords,
  };
}

function buildRepricingGapAiBusinessReasonReply(analysis, business) {
  if (analysis.selectedModel.supportsAttribution === false) {
    return "当前选择的口径不支持正式归因，因此暂不能把明细变化与正式影响结果关联。请切换到默认口径后再分析。";
  }
  const { factors } = buildRepricingGapAiAttributionFactors(analysis);
  const businessFactors = factors.filter((factor) => factor.businessKey === business.key);
  const totalImpact = businessFactors.reduce((sum, factor) => sum + Number(factor.impact || 0), 0);
  const factorText = businessFactors.map((factor) => {
    const currentValue = Number(factor.values?.[analysis.selectedIndex] || 0);
    const delta = formatProcessNodeDelta(
      factor.values,
      analysis.selectedIndex,
      analysis.comparisonIndex,
      "amount"
    );
    const growth = formatProcessNodeGrowth(
      factor.values,
      analysis.selectedIndex,
      analysis.comparisonIndex
    );
    return `${factor.label}当前${formatEveAmount(currentValue)}，较基期${delta.text}、${growth.text}，${formatProcessNodeImpact(factor.impact).text}`;
  }).join("；");
  const comparison = buildRepricingGapAiDetailComparison(analysis, business);
  const eventsByCause = Object.groupBy
    ? Object.groupBy(comparison.events, (event) => event.cause)
    : comparison.events.reduce((groups, event) => {
      groups[event.cause] = [...(groups[event.cause] || []), event];
      return groups;
    }, {});
  const causeNarratives = [
    ["new", "新增业务"],
    ["exit", "到期或退出业务"],
    ["enterWithinOneYear", "由一年外进入一年内的业务"],
    ["naturalShortening", "因时间经过而自然缩短剩余重定价期限的存续业务"],
  ].map(([cause, label]) => {
    const rows = eventsByCause[cause] || [];
    if (!rows.length) return "";
    const examples = rows
      .slice()
      .sort((left, right) =>
        Math.max(right.currentAmount, right.comparisonAmount)
        - Math.max(left.currentAmount, left.comparisonAmount)
      )
      .slice(0, 2)
      .map((row) => formatRepricingGapAiRecord(
        row,
        cause === "exit" ? "comparisonAmount" : "currentAmount"
      ))
      .join("、");
    return `${label}较为明显，例如${examples}`;
  }).filter(Boolean);
  const largeRecords = comparison.largeRecords.length
    ? comparison.largeRecords.map((record) =>
      `${formatRepricingGapAiRecord(
        record,
        record.cause === "exit" ? "comparisonAmount" : "currentAmount"
      )}，表现为${record.causeLabel}`
    ).join("；")
    : "当前样本中未识别出需要单独提示的大额业务";
  const detailText = causeNarratives.length
    ? causeNarratives.join("；")
    : "当前两个时点的样本明细总体稳定，未识别出明显的新增、退出或期限跨档";
  return `${business.title}的正式Owen归因合计为${formatRepricingGapAiSignedPct(totalImpact)}。${factorText}。\n从${comparison.comparisonDate}与${comparison.currentDate}的业务明细定性对比看，${detailText}。\n大额业务中，${largeRecords}。\n这些明细用于解释“为什么会出现这一影响”的业务线索，不逐笔分摊贡献；最终影响仍以汇总口径的Owen归因结果为准。`;
}

function buildRepricingGapAiReply(question, target) {
  const analysis = buildRepricingGapAiAnalysis(target);
  const normalized = String(question || "").trim();
  const specificBusiness = findRepricingGapAiQuestionBusiness(analysis, normalized);
  if (specificBusiness && /为什么|原因|新增|退出|到期|大额|期限|影响/.test(normalized)) {
    return buildRepricingGapAiBusinessReasonReply(analysis, specificBusiness);
  }
  if (/变动|导致|原因|归因|影响因素/.test(normalized)) {
    return buildRepricingGapAiAttributionReply(analysis);
  }
  if (/重要币种|占比|规模/.test(normalized)) return analysis.importanceNarrative;
  if (/限额|空间|距离/.test(normalized)) {
    const selectedDistance = formatRepricingGapAiLimitDistance(
      analysis.selectedLimit,
      analysis.trendStats.current
    );
    const totalLimitText = analysis.totalLimit
      ? `本外币合计限额为${formatRepricingGapAiLimit(analysis.totalLimit)}`
      : "本外币合计限额尚未配置";
    return selectedDistance
      ? `${analysis.selectedCurrency}${selectedDistance}；${totalLimitText}。`
      : `${analysis.selectedCurrency}当前没有可比较的独立限额；${totalLimitText}。`;
  }
  if (/走势|趋势|异常|波动/.test(normalized)) return analysis.trendNarrative;
  return "当前可以结合机构内币种规模、重要币种及管理限额、重定价缺口率走势和正式归因结果进行分析。你可以继续询问变动原因、限额空间、重要币种或趋势特征。";
}

function renderRepricingGapAiMessages() {
  const messages = Array.isArray(appState.insightConversation) ? appState.insightConversation : [];
  if (!messages.length) {
    return `<div class="repricing-ai-chat__empty">点击下方建议问题，或直接输入你希望继续分析的内容。</div>`;
  }
  return messages.map((message) => `
    <div class="repricing-ai-message repricing-ai-message--${message.role === "user" ? "user" : "assistant"}">
      <span>${message.role === "user" ? "你" : "AI"}</span>
      <p>${escapeInsightHtml(message.content)}</p>
    </div>
  `).join("");
}

function renderRepricingGapAiDrawer(target) {
  const analysis = buildRepricingGapAiAnalysis(target);
  const prompts = getRepricingGapAiPrompts(analysis);
  return `
    <div class="overlay-scrim overlay-scrim--ai-drawer" data-close-overlay="insightModal"></div>
    <section
      class="overlay-panel overlay-panel--ai-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insightModalTitle"
      data-insight-kind="repricing-gap"
    >
      <div class="repricing-ai-drawer__header">
        <div>
          <div class="overlay-panel__eyebrow">AI风险分析</div>
          <h3 id="insightModalTitle">重定价缺口率</h3>
          <p>${escapeInsightHtml(analysis.organization)}｜${escapeInsightHtml(analysis.selectedCurrency)}｜${escapeInsightHtml(analysis.currentDate)}</p>
        </div>
        <button class="overlay-panel__close repricing-ai-drawer__close" type="button" data-close-overlay="insightModal" aria-label="关闭AI分析">×</button>
      </div>
      <div class="repricing-ai-drawer__body">
        ${renderRepricingGapAiComboChart(analysis)}
        <section class="repricing-ai-analysis">
          <h4>币种重要性与限额</h4>
          <p>${escapeInsightHtml(analysis.importanceNarrative)}</p>
        </section>
        <section class="repricing-ai-analysis">
          <h4>走势与限额距离</h4>
          <p>${escapeInsightHtml(analysis.trendNarrative)}</p>
        </section>
        <div class="repricing-ai-chat__messages" aria-live="polite">
          ${renderRepricingGapAiMessages()}
        </div>
      </div>
      <div class="repricing-ai-chat__composer">
        <div class="repricing-ai-chat__prompts" aria-label="建议问题">
          ${prompts.map((prompt) => `
            <button type="button" data-insight-prompt="${encodeURIComponent(prompt)}">${escapeInsightHtml(prompt)}</button>
          `).join("")}
        </div>
        <form class="repricing-ai-chat__form" data-insight-form="true">
          <input
            type="text"
            data-insight-input="true"
            autocomplete="off"
            placeholder="继续追问重定价缺口率……"
            aria-label="向AI追问"
          />
          <button type="submit">发送</button>
        </form>
      </div>
    </section>
  `;
}

function renderInsightModal() {
  const target = findWidgetBySeq(appState.insightWidgetSeq);
  if (!target?.widget) {
    insightModalEl.innerHTML = "";
    insightModalEl.classList.remove("is-open");
    insightModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  if (isRepricingGapAiWidget(target.widget)) {
    insightModalEl.innerHTML = renderRepricingGapAiDrawer(target);
  } else {
    insightModalEl.innerHTML = `
      <div class="overlay-scrim" data-close-overlay="insightModal"></div>
      <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="insightModalTitle">
        <div class="overlay-panel__header">
          <div>
            <div class="overlay-panel__eyebrow">AI智能分析</div>
            <h3 id="insightModalTitle">${target.widget.title}</h3>
          </div>
          <button class="overlay-panel__close" type="button" data-close-overlay="insightModal">关闭</button>
        </div>
        <div class="insight-panel insight-panel--single">
          <div class="insight-panel__section">
            <h4>智能结论</h4>
            <p>${buildWidgetInsight(target)}</p>
          </div>
        </div>
      </section>
    `;
  }
  insightModalEl.classList.add("is-open");
  insightModalEl.setAttribute("aria-hidden", "false");
}
