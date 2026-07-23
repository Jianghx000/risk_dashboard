/* Simulation modal, draft, and chart overlay behavior. */

const REPRICING_GAP_SIMULATION_WIDGET_SEQ = 9;
const LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ = 49;
const REPRICING_GAP_DEFAULT_DEMAND_DEPOSIT_SCOPE = "不含";
const REPRICING_GAP_DEFAULT_DERIVATIVE_SCOPE = "含银行账簿和交易账簿";
const SIMULATION_BASELINE_LABEL = "当前时点缺口表";
const REPRICING_GAP_BUCKETS = [
  "隔夜", "隔夜~1个月", "1~2个月", "2~3个月", "3~4个月", "4~5个月", "5~6个月",
  "6~7个月", "7~8个月", "8~9个月", "9~10个月", "10~11个月", "11~12个月",
];
const LIQUIDITY_CASH_FLOW_BUCKETS = DOMAIN_CONFIG.liquidityCashFlowSimulationBuckets || [
  "次日", "2日至7日", "8日至30日", "31日至90日", "91日至1年",
];
const LIQUIDITY_CASH_FLOW_BUCKET_MAX_DAYS = [1, 7, 30, 90, 365];
const REPRICING_GAP_DERIVATIVE_TYPES = DOMAIN_CONFIG.repricingGapSimulationDerivativeTypes || [];
const REPRICING_GAP_DERIVATIVE_SIDE_MAP = DOMAIN_CONFIG.repricingGapSimulationDerivativeSideMap || {};
const REPRICING_FREQUENCY_OPTIONS = [
  { label: "按月重定价", value: "1" },
  { label: "按季重定价", value: "3" },
  { label: "按半年重定价", value: "6" },
  { label: "按年重定价", value: "12" },
  { label: "到期一次性重定价", value: "24" },
];

function isRepricingGapSimulationWidget(widgetOrSeq) {
  const seq = Number(typeof widgetOrSeq === "object" ? (widgetOrSeq?.sourceSeq || widgetOrSeq?.seq) : widgetOrSeq);
  return seq === REPRICING_GAP_SIMULATION_WIDGET_SEQ;
}

function isLiquidityGapSimulationWidget(widgetOrSeq) {
  const seq = Number(typeof widgetOrSeq === "object" ? (widgetOrSeq?.sourceSeq || widgetOrSeq?.seq) : widgetOrSeq);
  return seq === LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ;
}

function getRepricingGapSimulationGroups() {
  const onBalanceGroups = BUSINESS_STRUCTURE_GROUPS.filter((group) => ["生息资产", "付息负债"].includes(group.category));
  if (!REPRICING_GAP_DERIVATIVE_TYPES.length) return onBalanceGroups;
  return [
    ...onBalanceGroups,
    { category: "表外衍生品", items: REPRICING_GAP_DERIVATIVE_TYPES },
  ];
}

function getRepricingGapSimulationBusinessTypes() {
  return getRepricingGapSimulationGroups().flatMap((group) => group.items);
}

function getRepricingGapSimulationBusinessTypesByFundingRole(fundingRole) {
  return getRepricingGapSimulationBusinessTypes().filter((businessType) =>
    getSimulationFundingRoleByBusinessType(businessType) === fundingRole
  );
}

function getRepricingGapSimulationIncludesInternalTransactions(scenarioOrDraft = {}) {
  if (typeof scenarioOrDraft?.includesInternalTransactions === "boolean") {
    return scenarioOrDraft.includesInternalTransactions;
  }
  const page = getCurrentPage();
  const organizations = page ? (ensurePageFilterState(page).机构 || []) : [];
  return organizations.length === 1 && FOREIGN_BRANCH_ORGANIZATIONS.includes(organizations[0]);
}

function getRepricingGapCaliberOptions(source = {}, overrides = {}) {
  const widgetState = appState?.widgetFilters?.[REPRICING_GAP_SIMULATION_WIDGET_SEQ] || {};
  const selectedDemandDepositScope = (widgetState["活期存款"] || [])[0];
  const selectedDerivativeScope = (widgetState["表外衍生品"] || [])[0];
  const demandDepositScope = overrides.demandDepositScope
    || (typeof overrides.includeDemandDeposits === "boolean" ? (overrides.includeDemandDeposits ? "含" : "不含") : "")
    || selectedDemandDepositScope
    || source.demandDepositScope
    || (typeof source.includeDemandDeposits === "boolean" ? (source.includeDemandDeposits ? "含" : "不含") : "")
    || REPRICING_GAP_DEFAULT_DEMAND_DEPOSIT_SCOPE;
  const derivativeScope = overrides.derivativeScope
    || selectedDerivativeScope
    || source.derivativeScope
    || REPRICING_GAP_DEFAULT_DERIVATIVE_SCOPE;
  const includeDemandDeposits = demandDepositScope === "含";
  const includeBankBookDerivatives = derivativeScope !== "不含";
  const includeTradingBookDerivatives = derivativeScope === REPRICING_GAP_DEFAULT_DERIVATIVE_SCOPE;
  return {
    demandDepositScope,
    derivativeScope,
    includeDemandDeposits,
    includeBankBookDerivatives,
    includeTradingBookDerivatives,
    supportsAttribution: !includeDemandDeposits
      && includeBankBookDerivatives
      && includeTradingBookDerivatives,
  };
}

function isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions = false, caliberOptions = {}) {
  const options = getRepricingGapCaliberOptions({}, caliberOptions);
  if (businessType === "活期存款") return options.includeDemandDeposits;
  if (businessType.startsWith("银行账簿表外衍生品")) return options.includeBankBookDerivatives;
  if (businessType.startsWith("交易账簿表外衍生品")) return options.includeTradingBookDerivatives;
  return includesInternalTransactions || !String(businessType || "").includes("内部交易");
}

function getRepricingGapCurrentDate() {
  return appState.globalEndDate || getDefaultGlobalEndDate();
}

function getRepricingGapBucketIndex(targetDateValue, repricingDateValue) {
  const targetDate = parseDateValue(targetDateValue);
  const repricingDate = parseDateValue(repricingDateValue);
  if (!targetDate || !repricingDate) return REPRICING_GAP_BUCKETS.length - 1;
  const dayDifference = Math.max(0, Math.ceil((repricingDate - targetDate) / 86400000));
  if (dayDifference <= 1) return 0;
  return clampNumber(Math.ceil(dayDifference / 30), 1, REPRICING_GAP_BUCKETS.length - 1);
}

function rollRepricingDateBeyondTarget(repricingDateValue, targetDateValue, frequencyMonths = 1) {
  let repricingDate = parseDateValue(repricingDateValue);
  const targetDate = parseDateValue(targetDateValue);
  if (!repricingDate || !targetDate) return repricingDateValue || targetDateValue;
  const stepMonths = Math.max(1, Number(frequencyMonths || 1));
  let guard = 0;
  while (repricingDate <= targetDate && guard < 60) {
    repricingDate = parseDateValue(addMonthsDateValue(formatDateValue(repricingDate), stepMonths));
    guard += 1;
  }
  return formatDateValue(repricingDate);
}

function buildCurrentRepricingGapMatrix() {
  const matrix = {};
  getRepricingGapSimulationGroups().forEach((group, groupIndex) => {
    group.items.forEach((businessType, rowIndex) => {
      matrix[businessType] = REPRICING_GAP_BUCKETS.map((_, bucketIndex) => {
        const wave = ((rowIndex + 2) * (bucketIndex + 3) + groupIndex * 7) % 17;
        const base = groupIndex === 0 ? 30 + rowIndex * 7 : 16 + rowIndex * 4.5;
        return Number((base + wave * 1.7).toFixed(1));
      });
    });
  });
  return matrix;
}

function cloneRepricingGapMatrix(matrix = {}) {
  return Object.fromEntries(getRepricingGapSimulationBusinessTypes().map((businessType) => [
    businessType,
    Array.from({ length: REPRICING_GAP_BUCKETS.length }, (_, bucketIndex) =>
      Number(matrix[businessType]?.[bucketIndex] || 0)
    ),
  ]));
}

const REPRICING_GAP_BUCKET_MIDPOINT_MONTHS = [0, 0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5];
const REPRICING_GAP_BUCKET_WEIGHTS = REPRICING_GAP_BUCKET_MIDPOINT_MONTHS.map((month) =>
  Math.max(0, (12 - month) / 12)
);

function calculateRepricingGapMatrixRowMetrics(matrix = {}, businessType = "") {
  const values = matrix[businessType] || [];
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  const adjusted = values.reduce((sum, value, bucketIndex) =>
    sum + Number(value || 0) * Number(REPRICING_GAP_BUCKET_WEIGHTS[bucketIndex] || 0)
  , 0);
  return {
    total: Number(total.toFixed(1)),
    adjusted: Number(adjusted.toFixed(1)),
  };
}

function calculateRepricingGapMatrixMetrics(matrix = {}, options = {}) {
  const groups = getRepricingGapSimulationGroups();
  const assetGroup = groups.find((group) => group.category === "生息资产");
  const liabilityGroup = groups.find((group) => group.category === "付息负债");
  const includesInternalTransactions = options.includesInternalTransactions !== false;
  const caliberOptions = getRepricingGapCaliberOptions({}, options);
  const inScopeItems = (items = []) => items.filter((businessType) =>
    isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions, caliberOptions)
  );
  const sumRows = (businessTypes, weighted = false) => businessTypes.reduce((total, businessType) =>
    total + calculateRepricingGapMatrixRowMetrics(matrix, businessType)[weighted ? "adjusted" : "total"]
  , 0);
  const totalInterestAssets = sumRows(inScopeItems(assetGroup?.items));
  const totalInterestLiabilities = sumRows(inScopeItems(liabilityGroup?.items));
  const adjustedInterestAssets = sumRows(inScopeItems(assetGroup?.items), true);
  const adjustedInterestLiabilities = sumRows(inScopeItems(liabilityGroup?.items), true);
  const rawBankBookDerivativeGap =
    calculateRepricingGapMatrixRowMetrics(matrix, "银行账簿表外衍生品应收").adjusted
    - calculateRepricingGapMatrixRowMetrics(matrix, "银行账簿表外衍生品应付").adjusted;
  const rawTradingBookDerivativeGap =
    calculateRepricingGapMatrixRowMetrics(matrix, "交易账簿表外衍生品应收").adjusted
    - calculateRepricingGapMatrixRowMetrics(matrix, "交易账簿表外衍生品应付").adjusted;
  const bankBookDerivativeGap = caliberOptions.includeBankBookDerivatives ? rawBankBookDerivativeGap : 0;
  const tradingBookDerivativeGap = caliberOptions.includeTradingBookDerivatives ? rawTradingBookDerivativeGap : 0;
  const repricingGap = adjustedInterestAssets - adjustedInterestLiabilities
    + bankBookDerivativeGap + tradingBookDerivativeGap;
  const ratio = totalInterestAssets
    ? (repricingGap / totalInterestAssets) * 100
    : 0;
  return {
    totalInterestAssets: Number(totalInterestAssets.toFixed(1)),
    totalInterestLiabilities: Number(totalInterestLiabilities.toFixed(1)),
    adjustedInterestAssets: Number(adjustedInterestAssets.toFixed(1)),
    adjustedInterestLiabilities: Number(adjustedInterestLiabilities.toFixed(1)),
    bankBookDerivativeGap: Number(bankBookDerivativeGap.toFixed(1)),
    tradingBookDerivativeGap: Number(tradingBookDerivativeGap.toFixed(1)),
    rawBankBookDerivativeGap: Number(rawBankBookDerivativeGap.toFixed(1)),
    rawTradingBookDerivativeGap: Number(rawTradingBookDerivativeGap.toFixed(1)),
    repricingGap: Number(repricingGap.toFixed(1)),
    ratio,
    ...caliberOptions,
  };
}

function applyNewBusinessToRepricingGapMatrix(baseMatrix, entries = [], targetDateValue) {
  const simulatedMatrix = cloneRepricingGapMatrix(baseMatrix);
  const supportedBusinessTypes = new Set(getRepricingGapSimulationBusinessTypes());
  const horizonEnd = addDays(targetDateValue, 365);
  const entryImpacts = entries.map((entry, entryIndex) => {
    const scale = Number(entry.scale || 0);
    if (!supportedBusinessTypes.has(entry.businessType)) {
      return { entryIndex, included: false, reason: "业务类型不属于重定价缺口表" };
    }
    if (!entry.occurrenceDate || entry.occurrenceDate <= targetDateValue || entry.occurrenceDate > horizonEnd) {
      return { entryIndex, included: false, reason: "发生时间不在当前时点后一年内" };
    }
    const initialRepricingDate = entry.nextRepricingDate
      || addMonthsDateValue(entry.occurrenceDate, Number(entry.repricingMonths || 1));
    const effectiveRepricingDate = rollRepricingDateBeyondTarget(
      initialRepricingDate,
      targetDateValue,
      entry.repricingMonths
    );
    const bucketIndex = getRepricingGapBucketIndex(targetDateValue, effectiveRepricingDate);
    const currentValue = Number(simulatedMatrix[entry.businessType]?.[bucketIndex] || 0);
    simulatedMatrix[entry.businessType][bucketIndex] = Number((currentValue + scale).toFixed(1));
    return {
      entryIndex,
      included: true,
      businessType: entry.businessType,
      scale,
      effectiveRepricingDate,
      bucketIndex,
      bucket: REPRICING_GAP_BUCKETS[bucketIndex],
    };
  });
  return { simulatedMatrix, entryImpacts };
}

function buildRepricingGapSimulationResult(scenarioOrDraft, metricOptions = {}) {
  const targetDate = scenarioOrDraft?.baseDate || getRepricingGapCurrentDate();
  const includesInternalTransactions = getRepricingGapSimulationIncludesInternalTransactions(scenarioOrDraft);
  const caliberOptions = getRepricingGapCaliberOptions(scenarioOrDraft, metricOptions);
  const baseMatrix = cloneRepricingGapMatrix(
    scenarioOrDraft?.baseMatrix || buildCurrentRepricingGapMatrix()
  );
  const { simulatedMatrix, entryImpacts } = applyNewBusinessToRepricingGapMatrix(
    baseMatrix,
    scenarioOrDraft?.entries || [],
    targetDate
  );
  return {
    targetDate,
    baseMatrix,
    simulatedMatrix,
    includesInternalTransactions,
    ...caliberOptions,
    baseMetrics: calculateRepricingGapMatrixMetrics(baseMatrix, { includesInternalTransactions, ...caliberOptions }),
    simulatedMetrics: calculateRepricingGapMatrixMetrics(simulatedMatrix, { includesInternalTransactions, ...caliberOptions }),
    entryImpacts,
  };
}

function createDefaultRepricingGapSimulationEntry(baseDate = getRepricingGapCurrentDate(), fundingRole = "资金运用") {
  const normalizedRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(fundingRole) ? fundingRole : "资金运用";
  const occurrenceDate = addDays(baseDate, 1);
  const businessTypes = getRepricingGapSimulationBusinessTypesByFundingRole(normalizedRole);
  const preferredBusinessType = normalizedRole === "资金来源" && businessTypes.includes("定期存款")
    ? "定期存款"
    : businessTypes[0] || "";
  return {
    fundingRole: normalizedRole,
    occurrenceDate,
    businessType: preferredBusinessType,
    scale: "50",
    repricingMonths: "3",
    nextRepricingDate: addMonthsDateValue(occurrenceDate, 3),
  };
}

function ensureMinimumRepricingGapSimulationEntries(baseDate, entries = []) {
  const normalizedEntries = (Array.isArray(entries) ? entries : []).map((entry, entryIndex) => {
    const derivedRole = entry?.businessType
      ? getSimulationFundingRoleByBusinessType(entry.businessType)
      : SIMULATION_FUNDING_ROLE_OPTIONS[entryIndex % SIMULATION_FUNDING_ROLE_OPTIONS.length];
    const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(derivedRole) ? derivedRole : "资金运用";
    const businessTypes = getRepricingGapSimulationBusinessTypesByFundingRole(fundingRole);
    const occurrenceDate = entry?.occurrenceDate || addDays(baseDate, 1);
    const repricingMonths = String(entry?.repricingMonths || "3");
    return {
      fundingRole,
      occurrenceDate,
      businessType: businessTypes.includes(entry?.businessType) ? entry.businessType : businessTypes[0] || "",
      scale: String(entry?.scale ?? 50),
      repricingMonths,
      nextRepricingDate: entry?.nextRepricingDate || addMonthsDateValue(occurrenceDate, Number(repricingMonths)),
    };
  });
  const nextEntries = [...normalizedEntries];
  SIMULATION_FUNDING_ROLE_OPTIONS.forEach((fundingRole) => {
    if (!nextEntries.some((entry) => entry.fundingRole === fundingRole)) {
      nextEntries.push(createDefaultRepricingGapSimulationEntry(baseDate, fundingRole));
    }
  });
  return nextEntries;
}

function createRepricingGapSimulationDraftFromScenario(scenario) {
  const baseDate = getRepricingGapCurrentDate();
  const entries = ensureMinimumRepricingGapSimulationEntries(baseDate, scenario?.entries || []);
  return {
    simulationKind: "repricingGap",
    baseDate,
    includesInternalTransactions: getRepricingGapSimulationIncludesInternalTransactions(scenario),
    ...getRepricingGapCaliberOptions(scenario),
    baseMatrix: cloneRepricingGapMatrix(buildCurrentRepricingGapMatrix()),
    entries,
  };
}

function getRepricingGapSimulationDraft() {
  if (appState.simulationDraft?.simulationKind !== "repricingGap" || !appState.simulationDraft?.baseMatrix) {
    appState.simulationDraft = createRepricingGapSimulationDraftFromScenario();
  }
  return appState.simulationDraft;
}

function normalizeRepricingGapSimulationScenario(page, draft = getRepricingGapSimulationDraft()) {
  const pageFilters = ensurePageFilterState(page);
  const entries = ensureMinimumRepricingGapSimulationEntries(draft.baseDate, draft.entries || []).map((entry) => {
    const scale = Number(entry.scale || 0);
    return {
      occurrenceDate: entry.occurrenceDate || addDays(draft.baseDate, 1),
      businessType: entry.businessType,
      fundingRole: entry.fundingRole,
      org: pageFilters.机构?.[0] || "法人汇总",
      currency: pageFilters.币种?.[0] || "全折人民币",
      scale: Number.isFinite(scale) ? scale : 0,
      repricingMonths: String(entry.repricingMonths || "3"),
      nextRepricingDate: entry.nextRepricingDate || addMonthsDateValue(entry.occurrenceDate || addDays(draft.baseDate, 1), Number(entry.repricingMonths || 3)),
      termMonths: Math.max(1, Number(entry.repricingMonths || 3)),
    };
  });
  const caliberOptions = getRepricingGapCaliberOptions(draft);
  const result = buildRepricingGapSimulationResult({
    baseDate: draft.baseDate,
    baseMatrix: draft.baseMatrix,
    entries,
  }, caliberOptions);
  return {
    simulationKind: "repricingGap",
    sourceWidgetSeq: REPRICING_GAP_SIMULATION_WIDGET_SEQ,
    baseDate: draft.baseDate,
    includesInternalTransactions: getRepricingGapSimulationIncludesInternalTransactions(draft),
    ...caliberOptions,
    baseMatrix: cloneRepricingGapMatrix(draft.baseMatrix),
    simulatedMatrix: cloneRepricingGapMatrix(result.simulatedMatrix),
    baseMetrics: result.baseMetrics,
    simulatedMetrics: result.simulatedMetrics,
    entryImpacts: result.entryImpacts,
    entries,
    scale: entries.reduce((sum, entry) => sum + entry.scale, 0),
    businessType: getSharedSimulationValue(entries, "businessType", "组合业务"),
    fundingRole: getSharedSimulationValue(entries, "fundingRole", "来源/运用组合"),
  };
}

function getLiquidityGapSimulationPerspective() {
  return getBusinessAnalysisPerspectiveDefinition("liquidityBalanceStructure");
}

function getLiquidityGapSimulationGroups() {
  return getLiquidityGapSimulationPerspective().groups || [];
}

function getLiquidityGapSimulationBusinessTypes() {
  return getLiquidityGapSimulationGroups().flatMap((group) => group.items || []);
}

function getLiquidityGapSimulationBusinessTypesByFundingRole(fundingRole) {
  return getLiquidityGapSimulationBusinessTypes().filter((businessType) =>
    getLiquiditySimulationFundingRoleByBusinessType(businessType) === fundingRole
  );
}

function getLiquidityGapSimulationCurrentDate() {
  return appState.globalEndDate || getDefaultGlobalEndDate();
}

function getLiquidityCashFlowBucketIndex(baseDateValue, cashFlowDateValue) {
  const baseDate = parseDateValue(baseDateValue);
  const cashFlowDate = parseDateValue(cashFlowDateValue);
  if (!baseDate || !cashFlowDate) return -1;
  const dayDifference = Math.ceil((cashFlowDate - baseDate) / 86400000);
  if (dayDifference < 1 || dayDifference > LIQUIDITY_CASH_FLOW_BUCKET_MAX_DAYS.at(-1)) return -1;
  return LIQUIDITY_CASH_FLOW_BUCKET_MAX_DAYS.findIndex((maxDays) => dayDifference <= maxDays);
}

function buildCurrentLiquidityCashFlowGapMatrix() {
  const perspective = getLiquidityGapSimulationPerspective();
  const directionMap = perspective.cashFlowDirectionMap || {};
  const matrix = {};
  getLiquidityGapSimulationGroups().forEach((group, groupIndex) => {
    (group.items || []).forEach((businessType, rowIndex) => {
      const direction = directionMap[businessType] === "outflow" ? -1 : 1;
      matrix[businessType] = LIQUIDITY_CASH_FLOW_BUCKETS.map((_, bucketIndex) => {
        const base = 18 + ((groupIndex + 2) * 17 + (rowIndex + 3) * 11 + bucketIndex * 13) % 52;
        const tenorFactor = [1.08, 1, 0.88, 0.72, 0.56][bucketIndex];
        return Number((base * tenorFactor * direction).toFixed(1));
      });
    });
  });
  return matrix;
}

function cloneLiquidityCashFlowGapMatrix(matrix = {}) {
  return Object.fromEntries(getLiquidityGapSimulationBusinessTypes().map((businessType) => [
    businessType,
    Array.from({ length: LIQUIDITY_CASH_FLOW_BUCKETS.length }, (_, bucketIndex) =>
      Number(matrix[businessType]?.[bucketIndex] || 0)
    ),
  ]));
}

function calculateLiquidityCashFlowGapMetrics(matrix = {}) {
  const businessTypes = getLiquidityGapSimulationBusinessTypes();
  const bucketTotals = LIQUIDITY_CASH_FLOW_BUCKETS.map((_, bucketIndex) =>
    Number(businessTypes.reduce(
      (sum, businessType) => sum + Number(matrix[businessType]?.[bucketIndex] || 0),
      0
    ).toFixed(1))
  );
  const bucketInflows = LIQUIDITY_CASH_FLOW_BUCKETS.map((_, bucketIndex) =>
    Number(businessTypes.reduce((sum, businessType) => {
      const value = Number(matrix[businessType]?.[bucketIndex] || 0);
      return sum + Math.max(0, value);
    }, 0).toFixed(1))
  );
  const bucketOutflows = LIQUIDITY_CASH_FLOW_BUCKETS.map((_, bucketIndex) =>
    Number(businessTypes.reduce((sum, businessType) => {
      const value = Number(matrix[businessType]?.[bucketIndex] || 0);
      return sum + Math.abs(Math.min(0, value));
    }, 0).toFixed(1))
  );
  const cumulativeTotals = bucketTotals.map((_, bucketIndex) =>
    Number(bucketTotals.slice(0, bucketIndex + 1).reduce((sum, value) => sum + value, 0).toFixed(1))
  );
  const cumulativeInflows = bucketInflows.map((_, bucketIndex) =>
    Number(bucketInflows.slice(0, bucketIndex + 1).reduce((sum, value) => sum + value, 0).toFixed(1))
  );
  const cumulativeOutflows = bucketOutflows.map((_, bucketIndex) =>
    Number(bucketOutflows.slice(0, bucketIndex + 1).reduce((sum, value) => sum + value, 0).toFixed(1))
  );
  const gapRatios = cumulativeTotals.map((gap, bucketIndex) => cumulativeInflows[bucketIndex]
    ? Number(((gap / cumulativeInflows[bucketIndex]) * 100).toFixed(2))
    : 0
  );
  return {
    bucketTotals,
    bucketInflows,
    bucketOutflows,
    cumulativeTotals,
    cumulativeInflows,
    cumulativeOutflows,
    gapRatios,
    nextDayGap: cumulativeTotals[0] || 0,
    thirtyDayGap: cumulativeTotals[2] || 0,
    ninetyDayGap: cumulativeTotals[3] || 0,
    oneYearGap: cumulativeTotals[4] || 0,
  };
}

function applyNewBusinessToLiquidityCashFlowGapMatrix(baseMatrix, entries = [], baseDateValue) {
  const simulatedMatrix = cloneLiquidityCashFlowGapMatrix(baseMatrix);
  const supportedBusinessTypes = new Set(getLiquidityGapSimulationBusinessTypes());
  const horizonEnd = addDays(baseDateValue, LIQUIDITY_CASH_FLOW_BUCKET_MAX_DAYS.at(-1));
  const entryImpacts = entries.map((entry, entryIndex) => {
    if (!supportedBusinessTypes.has(entry.businessType)) {
      return { entryIndex, included: false, reason: "业务类型不属于流动性现金流缺口表", flowImpacts: [] };
    }
    if (!entry.occurrenceDate || entry.occurrenceDate > horizonEnd) {
      return { entryIndex, included: false, reason: "发生时间超出一年测算区间", flowImpacts: [] };
    }
    const flowImpacts = (entry.cashFlows || []).map((cashFlow, cashFlowIndex) => {
      const amount = Number(cashFlow.amount || 0);
      const bucketIndex = getLiquidityCashFlowBucketIndex(baseDateValue, cashFlow.date);
      if (!cashFlow.date || bucketIndex < 0) {
        return { cashFlowIndex, included: false, reason: "现金流日期不在基准日后一年内" };
      }
      if (entry.occurrenceDate && cashFlow.date < entry.occurrenceDate) {
        return { cashFlowIndex, included: false, reason: "现金流日期早于业务发生时间" };
      }
      const currentValue = Number(simulatedMatrix[entry.businessType]?.[bucketIndex] || 0);
      simulatedMatrix[entry.businessType][bucketIndex] = Number((currentValue + amount).toFixed(1));
      return {
        cashFlowIndex,
        included: true,
        date: cashFlow.date,
        amount,
        bucketIndex,
        bucket: LIQUIDITY_CASH_FLOW_BUCKETS[bucketIndex],
      };
    });
    return {
      entryIndex,
      included: flowImpacts.some((impact) => impact.included),
      businessType: entry.businessType,
      scale: Number(entry.scale || 0),
      flowImpacts,
    };
  });
  return { simulatedMatrix, entryImpacts };
}

function buildLiquidityGapSimulationResult(scenarioOrDraft) {
  const baseDate = scenarioOrDraft?.baseDate || getLiquidityGapSimulationCurrentDate();
  const baseMatrix = cloneLiquidityCashFlowGapMatrix(
    scenarioOrDraft?.baseMatrix || buildCurrentLiquidityCashFlowGapMatrix()
  );
  const { simulatedMatrix, entryImpacts } = applyNewBusinessToLiquidityCashFlowGapMatrix(
    baseMatrix,
    scenarioOrDraft?.entries || [],
    baseDate
  );
  return {
    baseDate,
    baseMatrix,
    simulatedMatrix,
    baseMetrics: calculateLiquidityCashFlowGapMetrics(baseMatrix),
    simulatedMetrics: calculateLiquidityCashFlowGapMetrics(simulatedMatrix),
    entryImpacts,
  };
}

function createDefaultLiquidityGapCashFlow(baseDateValue, occurrenceDateValue, amount = "-50") {
  const occurrenceDate = occurrenceDateValue || addDays(baseDateValue, 1);
  return { date: occurrenceDate, amount: String(amount) };
}

function createDefaultLiquidityGapSimulationEntry(baseDateValue = getLiquidityGapSimulationCurrentDate(), fundingRole = "资金运用") {
  const normalizedRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(fundingRole) ? fundingRole : "资金运用";
  const occurrenceDate = addDays(baseDateValue, 1);
  const businessTypes = getLiquidityGapSimulationBusinessTypesByFundingRole(normalizedRole);
  const preferredBusinessType = normalizedRole === "资金运用" && businessTypes.includes("各项贷款")
    ? "各项贷款"
    : businessTypes[0] || "";
  const defaultCashFlowAmount = normalizedRole === "资金来源" ? "-50" : "50";
  return {
    fundingRole: normalizedRole,
    occurrenceDate,
    businessType: preferredBusinessType,
    scale: "50",
    cashFlows: [createDefaultLiquidityGapCashFlow(baseDateValue, occurrenceDate, defaultCashFlowAmount)],
  };
}

function ensureMinimumLiquidityGapSimulationEntries(baseDate, entries = []) {
  const normalizedEntries = (Array.isArray(entries) ? entries : []).map((entry, entryIndex) => {
    const derivedRole = entry?.businessType
      ? getLiquiditySimulationFundingRoleByBusinessType(entry.businessType)
      : SIMULATION_FUNDING_ROLE_OPTIONS[entryIndex % SIMULATION_FUNDING_ROLE_OPTIONS.length];
    const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(derivedRole) ? derivedRole : "资金运用";
    const businessTypes = getLiquidityGapSimulationBusinessTypesByFundingRole(fundingRole);
    const occurrenceDate = entry?.occurrenceDate || addDays(baseDate, 1);
    const defaultAmount = fundingRole === "资金来源" ? -50 : 50;
    return {
      fundingRole,
      occurrenceDate,
      businessType: businessTypes.includes(entry?.businessType) ? entry.businessType : businessTypes[0] || "",
      scale: String(entry?.scale ?? 50),
      cashFlows: Array.isArray(entry?.cashFlows) && entry.cashFlows.length
        ? entry.cashFlows.map((cashFlow) => ({
          date: cashFlow.date || occurrenceDate,
          amount: String(cashFlow.amount ?? 0),
        }))
        : [createDefaultLiquidityGapCashFlow(baseDate, occurrenceDate, entry?.scale ?? defaultAmount)],
    };
  });
  const nextEntries = [...normalizedEntries];
  SIMULATION_FUNDING_ROLE_OPTIONS.forEach((fundingRole) => {
    if (!nextEntries.some((entry) => entry.fundingRole === fundingRole)) {
      nextEntries.push(createDefaultLiquidityGapSimulationEntry(baseDate, fundingRole));
    }
  });
  return nextEntries;
}

function createLiquidityGapSimulationDraftFromScenario(scenario) {
  const baseDate = getLiquidityGapSimulationCurrentDate();
  const entries = ensureMinimumLiquidityGapSimulationEntries(baseDate, scenario?.entries || []);
  return {
    simulationKind: "liquidityGap",
    baseDate,
    baseMatrix: cloneLiquidityCashFlowGapMatrix(buildCurrentLiquidityCashFlowGapMatrix()),
    entries,
  };
}

function getLiquidityGapSimulationDraft() {
  if (appState.simulationDraft?.simulationKind !== "liquidityGap" || !appState.simulationDraft?.baseMatrix) {
    appState.simulationDraft = createLiquidityGapSimulationDraftFromScenario();
  }
  return appState.simulationDraft;
}

function getLiquiditySimulationFundingRoleByBusinessType(businessType) {
  const side = getLiquidityGapSimulationPerspective().sideMap?.[businessType];
  return ["liability", "offBalanceOutflow"].includes(side) ? "资金来源" : "资金运用";
}

function normalizeLiquidityGapSimulationScenario(page, draft = getLiquidityGapSimulationDraft()) {
  const pageFilters = ensurePageFilterState(page);
  const entries = ensureMinimumLiquidityGapSimulationEntries(draft.baseDate, draft.entries || []).map((entry) => {
    const scale = Number(entry.scale || 0);
    const cashFlows = (entry.cashFlows || []).map((cashFlow) => {
      const amount = Number(cashFlow.amount || 0);
      return {
        date: cashFlow.date || entry.occurrenceDate || addDays(draft.baseDate, 1),
        amount: Number.isFinite(amount) ? amount : 0,
      };
    });
    const latestCashFlowDate = cashFlows.map((cashFlow) => cashFlow.date).sort().at(-1) || entry.occurrenceDate;
    const baseDate = parseDateValue(draft.baseDate);
    const latestDate = parseDateValue(latestCashFlowDate);
    const termMonths = baseDate && latestDate ? Math.max(1, Math.ceil((latestDate - baseDate) / 2592000000)) : 1;
    return {
      occurrenceDate: entry.occurrenceDate || addDays(draft.baseDate, 1),
      businessType: entry.businessType || getLiquidityGapSimulationBusinessTypes()[0] || "",
      fundingRole: entry.fundingRole,
      org: pageFilters.机构?.[0] || "法人汇总",
      currency: pageFilters.币种?.[0] || "全折人民币",
      scale: Number.isFinite(scale) ? scale : 0,
      termMonths,
      cashFlows,
    };
  });
  const result = buildLiquidityGapSimulationResult({
    baseDate: draft.baseDate,
    baseMatrix: draft.baseMatrix,
    entries,
  });
  const totalCashFlow = entries.reduce((sum, entry) =>
    sum + entry.cashFlows.reduce((flowSum, cashFlow) => flowSum + Number(cashFlow.amount || 0), 0), 0
  );
  return {
    simulationKind: "liquidityGap",
    sourceWidgetSeq: LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ,
    baseDate: draft.baseDate,
    baseMatrix: cloneLiquidityCashFlowGapMatrix(draft.baseMatrix),
    simulatedMatrix: cloneLiquidityCashFlowGapMatrix(result.simulatedMatrix),
    baseMetrics: result.baseMetrics,
    simulatedMetrics: result.simulatedMetrics,
    entryImpacts: result.entryImpacts,
    entries,
    scale: Number(entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0).toFixed(1)),
    totalCashFlow: Number(totalCashFlow.toFixed(1)),
    businessType: getSharedSimulationValue(entries, "businessType", "组合业务"),
    fundingRole: totalCashFlow < 0 ? "资金来源" : "资金运用",
    termMonths: Math.max(1, ...entries.map((entry) => Number(entry.termMonths || 1))),
  };
}

function renderWidgetSimulationButton(widget) {
  const pageId = getCurrentPage()?.id;
  if (isRepricingGapSimulationWidget(widget) && pageId === "interest-risk") {
    return `<button class="widget-action widget-action--simulation" type="button" data-open-simulation="interest-risk" data-simulation-widget="${REPRICING_GAP_SIMULATION_WIDGET_SEQ}">模拟测算</button>`;
  }
  if (isLiquidityGapSimulationWidget(widget) && pageId === "liquidity-risk") {
    return `<button class="widget-action widget-action--simulation" type="button" data-open-simulation="liquidity-risk" data-simulation-widget="${LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ}">模拟测算</button>`;
  }
  return "";
}

function renderWidgetSimulationSummary(widget) {
  const pageId = getCurrentPage()?.id;
  const simulation = getPageSimulation(pageId);
  if (!simulation) return "";
  if (isRepricingGapSimulationWidget(widget) && Number(simulation.sourceWidgetSeq) === REPRICING_GAP_SIMULATION_WIDGET_SEQ) {
    const totalScale = getSimulationEntries(simulation).reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
    const result = buildRepricingGapSimulationResult(simulation);
    const ratioDelta = Number((result.simulatedMetrics.ratio - result.baseMetrics.ratio).toFixed(2));
    return `
      <div class="simulation-summary simulation-summary--widget">
        <span class="simulation-summary__item">测算基准：${simulation.baseDate}</span>
        <span class="simulation-summary__item">${SIMULATION_BASELINE_LABEL}</span>
        <span class="simulation-summary__item">新业务：${getSimulationEntries(simulation).length}笔</span>
        <span class="simulation-summary__item">新增规模合计：${Number(totalScale.toFixed(1))}亿元</span>
        <span class="simulation-summary__item">基准：${result.baseMetrics.ratio.toFixed(2)}%</span>
        <span class="simulation-summary__item">测算后：${result.simulatedMetrics.ratio.toFixed(2)}%</span>
        <span class="simulation-summary__item">变化：${ratioDelta >= 0 ? "+" : ""}${ratioDelta.toFixed(2)}pct</span>
        <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}" data-simulation-widget="${REPRICING_GAP_SIMULATION_WIDGET_SEQ}">调整测算</button>
        <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
      </div>
    `;
  }
  if (isLiquidityGapSimulationWidget(widget) && Number(simulation.sourceWidgetSeq) === LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ) {
    const result = buildLiquidityGapSimulationResult(simulation);
    const totalScale = getSimulationEntries(simulation).reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
    const cashFlowCount = getSimulationEntries(simulation).reduce((sum, entry) => sum + (entry.cashFlows || []).length, 0);
    const gapDelta = Number((result.simulatedMetrics.oneYearGap - result.baseMetrics.oneYearGap).toFixed(1));
    return `
      <div class="simulation-summary simulation-summary--widget">
        <span class="simulation-summary__item">测算基准：${simulation.baseDate}</span>
        <span class="simulation-summary__item">${SIMULATION_BASELINE_LABEL}</span>
        <span class="simulation-summary__item">新业务：${getSimulationEntries(simulation).length}笔</span>
        <span class="simulation-summary__item">现金流：${cashFlowCount}笔</span>
        <span class="simulation-summary__item">业务规模：${Number(totalScale.toFixed(1))}亿元</span>
        <span class="simulation-summary__item">基准1年累计缺口：${result.baseMetrics.oneYearGap.toFixed(1)}亿元</span>
        <span class="simulation-summary__item">测算后：${result.simulatedMetrics.oneYearGap.toFixed(1)}亿元</span>
        <span class="simulation-summary__item">变化：${gapDelta >= 0 ? "+" : ""}${gapDelta.toFixed(1)}亿元</span>
        <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}" data-simulation-widget="${LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ}">调整测算</button>
        <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
      </div>
    `;
  }
  return "";
}

function getPageSimulation(pageId = getCurrentPage()?.id) {
  if (!pageId) return null;
  return appState.pageSimulations[pageId] || null;
}

function getSimulationEntries(simulation) {
  if (!simulation) return [];
  if (Array.isArray(simulation.entries)) return simulation.entries.filter(Boolean);
  return [simulation];
}

function getSimulationFundingRoleByBusinessType(businessType) {
  const side = REPRICING_GAP_DERIVATIVE_SIDE_MAP[businessType] || BUSINESS_SIDE_MAP[businessType];
  return side === "liability" ? "资金来源" : "资金运用";
}

function getSharedSimulationValue(entries, key, mixedLabel) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (!values.length) return "";
  return values.length === 1 ? values[0] : mixedLabel;
}

function closeSimulationModal() {
  appState.simulationModalPageId = null;
  appState.simulationModalWidgetSeq = null;
  appState.simulationDraft = null;
}

function openSimulationModal(pageId, widgetSeq = null) {
  const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
  if (!page) return;
  const simulation = getPageSimulation(page.id);
  const selectedWidgetSeq = Number(widgetSeq || simulation?.sourceWidgetSeq || 0);
  if (!isRepricingGapSimulationWidget(selectedWidgetSeq) && !isLiquidityGapSimulationWidget(selectedWidgetSeq)) return;
  appState.simulationModalPageId = page.id;
  appState.simulationModalWidgetSeq = selectedWidgetSeq;
  appState.simulationDraft = isRepricingGapSimulationWidget(selectedWidgetSeq)
    ? createRepricingGapSimulationDraftFromScenario(simulation)
    : createLiquidityGapSimulationDraftFromScenario(simulation);
}

function sumRepricingGapValues(values = []) {
  return Number(values.reduce((sum, value) => sum + Number(value || 0), 0).toFixed(1));
}

function renderRepricingGapBaseTable(draft) {
  const includesInternalTransactions = getRepricingGapSimulationIncludesInternalTransactions(draft);
  const caliberOptions = getRepricingGapCaliberOptions(draft);
  const renderBusinessRow = (businessType) => {
    const values = draft.baseMatrix[businessType] || REPRICING_GAP_BUCKETS.map(() => 0);
    const isInScope = isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions, caliberOptions);
    return `
      <tr class="${isInScope ? "" : "is-excluded-from-metric"}" data-repricing-base-row="${businessType}">
        <th scope="row">${businessType}${isInScope ? "" : "（不计入指标）"}</th>
        <td class="repricing-base-table__total">${sumRepricingGapValues(values)}</td>
        ${values.map((value, bucketIndex) => `
          <td data-repricing-base-value="true" data-bucket-index="${bucketIndex}">${Number(value || 0).toFixed(1)}</td>
        `).join("")}
      </tr>
    `;
  };
  const renderTotalRow = (group) => {
    const inScopeItems = group.items.filter((businessType) =>
      isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions, caliberOptions)
    );
    const bucketTotals = REPRICING_GAP_BUCKETS.map((_, bucketIndex) =>
      sumRepricingGapValues(inScopeItems.map((businessType) => draft.baseMatrix[businessType]?.[bucketIndex] || 0))
    );
    return `
      <tr class="repricing-base-table__group-total" data-repricing-base-total="${group.category}">
        <th scope="row">${group.category}总计</th>
        <td>${sumRepricingGapValues(bucketTotals)}</td>
        ${bucketTotals.map((value) => `<td>${value}</td>`).join("")}
      </tr>
    `;
  };
  return `
    <div class="repricing-base-table-wrap">
      <table class="repricing-base-table">
        <thead>
          <tr>
            <th scope="col">业务类别</th>
            <th scope="col">汇总</th>
            ${REPRICING_GAP_BUCKETS.map((bucket) => `<th scope="col">${bucket}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${getRepricingGapSimulationGroups().map((group) => `${group.items.map(renderBusinessRow).join("")}${renderTotalRow(group)}`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRepricingGapResultTable(matrix, includesInternalTransactions = false, caliberOptions = {}) {
  const renderBusinessRow = (businessType) => {
    const values = matrix[businessType] || REPRICING_GAP_BUCKETS.map(() => 0);
    const isInScope = isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions, caliberOptions);
    return `
      <tr class="${isInScope ? "" : "is-excluded-from-metric"}" data-repricing-result-row="${businessType}">
        <th scope="row">${businessType}${isInScope ? "" : "（不计入指标）"}</th>
        <td class="repricing-base-table__total">${sumRepricingGapValues(values)}</td>
        ${values.map((value) => `<td>${Number(value || 0).toFixed(1)}</td>`).join("")}
      </tr>
    `;
  };
  const renderTotalRow = (group) => {
    const inScopeItems = group.items.filter((businessType) =>
      isRepricingGapBusinessInMetricScope(businessType, includesInternalTransactions, caliberOptions)
    );
    const bucketTotals = REPRICING_GAP_BUCKETS.map((_, bucketIndex) =>
      sumRepricingGapValues(inScopeItems.map((businessType) => matrix[businessType]?.[bucketIndex] || 0))
    );
    return `
      <tr class="repricing-base-table__group-total" data-repricing-result-total="${group.category}">
        <th scope="row">${group.category}总计</th>
        <td>${sumRepricingGapValues(bucketTotals)}</td>
        ${bucketTotals.map((value) => `<td>${value.toFixed(1)}</td>`).join("")}
      </tr>
    `;
  };
  return `
    <div class="repricing-base-table-wrap">
      <table class="repricing-base-table repricing-result-table">
        <thead>
          <tr>
            <th scope="col">业务类别</th>
            <th scope="col">汇总</th>
            ${REPRICING_GAP_BUCKETS.map((bucket) => `<th scope="col">${bucket}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${getRepricingGapSimulationGroups().map((group) => `${group.items.map(renderBusinessRow).join("")}${renderTotalRow(group)}`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRepricingGapSimulationEntry(entry, entryIndex, roleEntryIndex, roleEntryCount) {
  const businessTypes = getRepricingGapSimulationBusinessTypesByFundingRole(entry.fundingRole);
  const draft = getRepricingGapSimulationDraft();
  return `
    <section class="repricing-simulation-entry" data-repricing-simulation-entry="${entryIndex}">
      <div class="repricing-simulation-entry__header">
        <h5>业务 ${roleEntryIndex + 1}</h5>
        ${roleEntryCount > 1 ? `<button class="simulation-entry__remove" type="button" data-remove-repricing-simulation-entry="${entryIndex}">删除业务</button>` : ""}
      </div>
      <div class="repricing-simulation-entry__fields">
        <label class="simulation-form__field">
          <span class="simulation-form__label">发生时间</span>
          <input class="simulation-form__control" type="date" min="${addDays(draft.baseDate, 1)}" max="${addDays(draft.baseDate, 365)}" value="${entry.occurrenceDate || ""}" data-repricing-simulation-entry-index="${entryIndex}" data-repricing-simulation-field="occurrenceDate">
        </label>
        <label class="simulation-form__field">
          <span class="simulation-form__label">业务类型</span>
          <select class="simulation-form__control" data-repricing-simulation-entry-index="${entryIndex}" data-repricing-simulation-field="businessType">
            ${businessTypes.map((option) => `<option value="${option}" ${option === entry.businessType ? "selected" : ""}>${option}</option>`).join("")}
          </select>
        </label>
        <label class="simulation-form__field">
          <span class="simulation-form__label">规模（亿元）</span>
          <input class="simulation-form__control" type="number" step="0.1" value="${entry.scale ?? ""}" data-repricing-simulation-entry-index="${entryIndex}" data-repricing-simulation-field="scale">
        </label>
        <label class="simulation-form__field">
          <span class="simulation-form__label">重定价频率</span>
          <select class="simulation-form__control" data-repricing-simulation-entry-index="${entryIndex}" data-repricing-simulation-field="repricingMonths">
            ${REPRICING_FREQUENCY_OPTIONS.map((option) => `<option value="${option.value}" ${String(option.value) === String(entry.repricingMonths) ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <label class="simulation-form__field">
          <span class="simulation-form__label">下次重定价时间</span>
          <input class="simulation-form__control" type="date" min="${entry.occurrenceDate || addDays(draft.baseDate, 1)}" max="${addDays(draft.baseDate, 730)}" value="${entry.nextRepricingDate || ""}" data-repricing-simulation-entry-index="${entryIndex}" data-repricing-simulation-field="nextRepricingDate">
        </label>
      </div>
    </section>
  `;
}

function renderRepricingGapSimulationRoleSection(entries, fundingRole) {
  const roleEntries = entries
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entry.fundingRole === fundingRole);
  const roleScale = roleEntries.reduce((sum, item) => sum + Number(item.entry.scale || 0), 0);
  const roleClass = fundingRole === "资金来源" ? "source" : "use";
  return `
    <section class="simulation-role-section simulation-role-section--${roleClass}" data-simulation-funding-role="${fundingRole}">
      <div class="simulation-role-section__header">
        <div>
          <h4 class="simulation-role-section__title">${fundingRole}</h4>
          <div class="simulation-role-section__meta">共 ${roleEntries.length} 笔 / 合计 ${Number(roleScale.toFixed(1))} 亿元</div>
        </div>
      </div>
      <div class="simulation-role-section__body">
        ${roleEntries.map((item, roleEntryIndex) =>
          renderRepricingGapSimulationEntry(item.entry, item.entryIndex, roleEntryIndex, roleEntries.length)
        ).join("")}
      </div>
      <div class="simulation-role-section__actions">
        <button class="toolbar-action" type="button" data-add-repricing-simulation-entry="${fundingRole}">新增${fundingRole}业务</button>
      </div>
    </section>
  `;
}

function renderRepricingGapSimulationModal(page) {
  const draft = getRepricingGapSimulationDraft();
  const result = buildRepricingGapSimulationResult(draft);
  const ratioDelta = Number((result.simulatedMetrics.ratio - result.baseMetrics.ratio).toFixed(2));
  return `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--matrix" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">重定价缺口率</div>
          <h3 id="simulationModalTitle">模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      <section class="repricing-simulation-section">
        <div class="repricing-simulation-section__header">
          <h4>基准重定价缺口表</h4>
          <div class="simulation-baseline-date" data-simulation-base-date="repricing">
            <span>当前时点</span>
            <strong>${draft.baseDate}</strong>
          </div>
        </div>
        <div class="repricing-simulation-source">
          <span>
            当前基准：${SIMULATION_BASELINE_LABEL}；
            ${result.includesInternalTransactions ? "单个境外分行含内部交易" : "当前机构口径剔除内部交易"}；负债端${result.includeDemandDeposits ? "含" : "不含"}活期存款；表外衍生品${result.derivativeScope}
          </span>
          <strong>基准缺口率 ${result.baseMetrics.ratio.toFixed(2)}%</strong>
        </div>
        ${renderRepricingGapBaseTable(draft)}
      </section>
      <section class="repricing-simulation-section repricing-simulation-section--business">
        <div class="repricing-simulation-section__header">
          <h4>新业务录入</h4>
        </div>
        <div class="simulation-entry-list repricing-simulation-entry-list repricing-simulation-role-list">
          ${SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole) =>
            renderRepricingGapSimulationRoleSection(draft.entries || [], fundingRole)
          ).join("")}
        </div>
      </section>
      <section class="repricing-simulation-section repricing-simulation-section--result">
        <div class="repricing-simulation-section__header">
          <h4>测算后重定价缺口表</h4>
        </div>
        <div class="repricing-simulation-result-metrics">
          <div><span>基准缺口率</span><strong>${result.baseMetrics.ratio.toFixed(2)}%</strong></div>
          <div><span>测算后缺口率</span><strong>${result.simulatedMetrics.ratio.toFixed(2)}%</strong></div>
          <div><span>缺口率变化</span><strong class="${ratioDelta >= 0 ? "is-up" : "is-down"}">${ratioDelta >= 0 ? "+" : ""}${ratioDelta.toFixed(2)}pct</strong></div>
        </div>
        ${renderRepricingGapResultTable(result.simulatedMatrix, result.includesInternalTransactions, result)}
      </section>
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}" data-simulation-widget="${REPRICING_GAP_SIMULATION_WIDGET_SEQ}">应用测算</button>
      </div>
    </section>
  `;
}

function getLiquidityGapGroupTotalLabel(group) {
  const perspective = getLiquidityGapSimulationPerspective();
  return perspective.totalRowLabels?.[group.category] || `${group.category}合计`;
}

function renderLiquidityCashFlowGapTable(matrix, tableKind = "result") {
  const isBaseTable = tableKind === "base";
  const renderBusinessRow = (businessType) => {
    const values = matrix[businessType] || LIQUIDITY_CASH_FLOW_BUCKETS.map(() => 0);
    const cells = values.map((value, bucketIndex) => `
      <td ${isBaseTable ? `data-liquidity-gap-base-value="true" data-bucket-index="${bucketIndex}"` : ""}>${Number(value || 0).toFixed(1)}</td>
    `).join("");
    return `
      <tr data-liquidity-gap-${isBaseTable ? "base" : "result"}-row="${businessType}">
        <th scope="row">${businessType}</th>
        ${cells}
      </tr>
    `;
  };
  const renderGroup = (group) => {
    const groupRows = (group.items || []).map(renderBusinessRow).join("");
    if (!(getLiquidityGapSimulationPerspective().totalCategories || []).includes(group.category)) return groupRows;
    const bucketTotals = LIQUIDITY_CASH_FLOW_BUCKETS.map((_, bucketIndex) =>
      sumRepricingGapValues((group.items || []).map((businessType) => matrix[businessType]?.[bucketIndex] || 0))
    );
    const totalRow = `
      <tr class="repricing-base-table__group-total" data-liquidity-gap-${isBaseTable ? "base" : "result"}-total="${group.category}">
        <th scope="row">${getLiquidityGapGroupTotalLabel(group)}</th>
        ${bucketTotals.map((value) => `<td>${Number(value).toFixed(1)}</td>`).join("")}
      </tr>
    `;
    return `${totalRow}${groupRows}`;
  };
  return `
    <div class="repricing-base-table-wrap liquidity-gap-base-table-wrap">
      <table class="repricing-base-table liquidity-gap-base-table ${isBaseTable ? "" : "repricing-result-table"}">
        <thead>
          <tr>
            <th scope="col">业务类别</th>
            ${LIQUIDITY_CASH_FLOW_BUCKETS.map((bucket) => `<th scope="col">${bucket}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${getLiquidityGapSimulationGroups().map(renderGroup).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLiquidityGapCashFlow(cashFlow, entryIndex, cashFlowIndex, cashFlowCount, entry) {
  const draft = getLiquidityGapSimulationDraft();
  const minimumDate = [addDays(draft.baseDate, 1), entry.occurrenceDate || ""].filter(Boolean).sort().at(-1);
  const ordinal = cashFlowIndex === 0 ? "第一笔" : `第${cashFlowIndex + 1}笔`;
  return `
    <div class="liquidity-cash-flow-row" data-liquidity-cash-flow-row="${cashFlowIndex}">
      <label class="simulation-form__field">
        <span class="simulation-form__label">${ordinal}现金流日期</span>
        <input
          class="simulation-form__control"
          type="date"
          min="${minimumDate}"
          max="${addDays(draft.baseDate, 365)}"
          value="${cashFlow.date || ""}"
          data-liquidity-gap-entry-index="${entryIndex}"
          data-liquidity-cash-flow-index="${cashFlowIndex}"
          data-liquidity-cash-flow-field="date"
        >
      </label>
      <label class="simulation-form__field">
        <span class="simulation-form__label">${ordinal}现金流金额（亿元）</span>
        <input
          class="simulation-form__control"
          type="number"
          step="0.1"
          value="${cashFlow.amount ?? ""}"
          data-liquidity-gap-entry-index="${entryIndex}"
          data-liquidity-cash-flow-index="${cashFlowIndex}"
          data-liquidity-cash-flow-field="amount"
        >
      </label>
      ${cashFlowCount > 1 ? `<button class="simulation-entry__remove liquidity-cash-flow-row__remove" type="button" data-remove-liquidity-cash-flow="${cashFlowIndex}" data-liquidity-gap-entry-index="${entryIndex}">删除</button>` : ""}
    </div>
  `;
}

function renderLiquidityGapSimulationEntry(entry, entryIndex, roleEntryIndex, roleEntryCount) {
  const draft = getLiquidityGapSimulationDraft();
  const businessTypes = getLiquidityGapSimulationBusinessTypesByFundingRole(entry.fundingRole);
  const cashFlows = Array.isArray(entry.cashFlows) && entry.cashFlows.length
    ? entry.cashFlows
    : [createDefaultLiquidityGapCashFlow(draft.baseDate, entry.occurrenceDate, entry.fundingRole === "资金来源" ? "-50" : "50")];
  return `
    <section class="repricing-simulation-entry liquidity-gap-simulation-entry" data-liquidity-gap-simulation-entry="${entryIndex}">
      <div class="repricing-simulation-entry__header">
        <h5>业务 ${roleEntryIndex + 1}</h5>
        ${roleEntryCount > 1 ? `<button class="simulation-entry__remove" type="button" data-remove-liquidity-gap-entry="${entryIndex}">删除业务</button>` : ""}
      </div>
      <div class="liquidity-gap-simulation-entry__body">
        <div class="liquidity-gap-simulation-entry__fields">
          <label class="simulation-form__field">
            <span class="simulation-form__label">发生时间</span>
            <input class="simulation-form__control" type="date" min="${draft.baseDate}" max="${addDays(draft.baseDate, 365)}" value="${entry.occurrenceDate || ""}" data-liquidity-gap-entry-index="${entryIndex}" data-liquidity-gap-simulation-field="occurrenceDate">
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">业务类型</span>
            <select class="simulation-form__control" data-liquidity-gap-entry-index="${entryIndex}" data-liquidity-gap-simulation-field="businessType">
              ${businessTypes.map((option) => `<option value="${option}" ${option === entry.businessType ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">规模（亿元）</span>
            <input class="simulation-form__control" type="number" step="0.1" value="${entry.scale ?? ""}" data-liquidity-gap-entry-index="${entryIndex}" data-liquidity-gap-simulation-field="scale">
          </label>
        </div>
        <div class="liquidity-cash-flow-list">
          <div class="liquidity-cash-flow-list__header">
            <span>现金流计划</span>
            <span>正数为流入，负数为流出</span>
          </div>
          ${cashFlows.map((cashFlow, cashFlowIndex) =>
            renderLiquidityGapCashFlow(cashFlow, entryIndex, cashFlowIndex, cashFlows.length, entry)
          ).join("")}
          <button class="toolbar-action liquidity-cash-flow-list__add" type="button" data-add-liquidity-cash-flow="${entryIndex}">增加现金流</button>
        </div>
      </div>
    </section>
  `;
}

function renderLiquidityGapSimulationRoleSection(entries, fundingRole) {
  const roleEntries = entries
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entry.fundingRole === fundingRole);
  const roleScale = roleEntries.reduce((sum, item) => sum + Number(item.entry.scale || 0), 0);
  const roleClass = fundingRole === "资金来源" ? "source" : "use";
  return `
    <section class="simulation-role-section simulation-role-section--${roleClass}" data-simulation-funding-role="${fundingRole}">
      <div class="simulation-role-section__header">
        <div>
          <h4 class="simulation-role-section__title">${fundingRole}</h4>
          <div class="simulation-role-section__meta">共 ${roleEntries.length} 笔 / 合计 ${Number(roleScale.toFixed(1))} 亿元</div>
        </div>
      </div>
      <div class="simulation-role-section__body">
        ${roleEntries.map((item, roleEntryIndex) =>
          renderLiquidityGapSimulationEntry(item.entry, item.entryIndex, roleEntryIndex, roleEntries.length)
        ).join("")}
      </div>
      <div class="simulation-role-section__actions">
        <button class="toolbar-action" type="button" data-add-liquidity-gap-entry="${fundingRole}">新增${fundingRole}业务</button>
      </div>
    </section>
  `;
}

function renderLiquidityGapSimulationModal(page) {
  const draft = getLiquidityGapSimulationDraft();
  const result = buildLiquidityGapSimulationResult(draft);
  const oneYearGapDelta = Number((result.simulatedMetrics.oneYearGap - result.baseMetrics.oneYearGap).toFixed(1));
  return `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--matrix" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">流动性缺口</div>
          <h3 id="simulationModalTitle">模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      <section class="repricing-simulation-section">
        <div class="repricing-simulation-section__header">
          <h4>基准现金流缺口表</h4>
          <div class="simulation-baseline-date" data-simulation-base-date="liquidity">
            <span>当前时点</span>
            <strong>${draft.baseDate}</strong>
          </div>
        </div>
        <div class="repricing-simulation-source">
          <span>当前基准：${SIMULATION_BASELINE_LABEL}；金额正数为流入，负数为流出</span>
          <strong>基准1年累计缺口 ${result.baseMetrics.oneYearGap.toFixed(1)}亿元</strong>
        </div>
        ${renderLiquidityCashFlowGapTable(draft.baseMatrix, "base")}
      </section>
      <section class="repricing-simulation-section repricing-simulation-section--business">
        <div class="repricing-simulation-section__header">
          <h4>新业务录入</h4>
        </div>
        <div class="simulation-entry-list repricing-simulation-entry-list repricing-simulation-role-list liquidity-gap-simulation-entry-list">
          ${SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole) =>
            renderLiquidityGapSimulationRoleSection(draft.entries || [], fundingRole)
          ).join("")}
        </div>
      </section>
      <section class="repricing-simulation-section repricing-simulation-section--result">
        <div class="repricing-simulation-section__header">
          <h4>测算后现金流缺口表</h4>
        </div>
        <div class="repricing-simulation-result-metrics">
          <div><span>基准1年累计缺口</span><strong>${result.baseMetrics.oneYearGap.toFixed(1)}亿元</strong></div>
          <div><span>测算后1年累计缺口</span><strong>${result.simulatedMetrics.oneYearGap.toFixed(1)}亿元</strong></div>
          <div><span>累计缺口变化</span><strong class="${oneYearGapDelta >= 0 ? "is-down" : "is-up"}">${oneYearGapDelta >= 0 ? "+" : ""}${oneYearGapDelta.toFixed(1)}亿元</strong></div>
        </div>
        ${renderLiquidityCashFlowGapTable(result.simulatedMatrix)}
      </section>
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}" data-simulation-widget="${LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ}">应用测算</button>
      </div>
    </section>
  `;
}

function renderSimulationModal() {
  const page = data.pages.find((item) => item.id === appState.simulationModalPageId);
  const isRepricingSimulation = isRepricingGapSimulationWidget(appState.simulationModalWidgetSeq);
  const isLiquiditySimulation = isLiquidityGapSimulationWidget(appState.simulationModalWidgetSeq);
  if (!page || (!isRepricingSimulation && !isLiquiditySimulation)) {
    simulationModalEl.innerHTML = "";
    simulationModalEl.classList.remove("is-open");
    simulationModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  simulationModalEl.innerHTML = isRepricingSimulation
    ? renderRepricingGapSimulationModal(page)
    : renderLiquidityGapSimulationModal(page);
  simulationModalEl.classList.add("is-open");
  simulationModalEl.setAttribute("aria-hidden", "false");
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

function renderInsightModal() {
  const target = findWidgetBySeq(appState.insightWidgetSeq);
  if (!target?.widget) {
    insightModalEl.innerHTML = "";
    insightModalEl.classList.remove("is-open");
    insightModalEl.setAttribute("aria-hidden", "true");
    return;
  }
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
  insightModalEl.classList.add("is-open");
  insightModalEl.setAttribute("aria-hidden", "false");
}

function getLiquidityGapSimulationProfile(simulation) {
  const hasCashFlowPlan = Array.isArray(simulation.cashFlows) && simulation.cashFlows.length > 0;
  const netCashFlow = hasCashFlowPlan
    ? simulation.cashFlows.reduce((sum, cashFlow) => sum + Number(cashFlow.amount || 0), 0)
    : 0;
  const side = hasCashFlowPlan && netCashFlow !== 0
    ? netCashFlow < 0 ? "liability" : "asset"
    : simulation.fundingRole === "资金来源"
      ? "liability"
      : "asset";
  const scale = hasCashFlowPlan ? Math.abs(netCashFlow) : Number(simulation.scale || 0);
  const scaleWeight = Math.min(1.4, Math.abs(scale) / 120);
  const tenorWeight = Math.min(1.2, Number(simulation.termMonths || 0) / 24);
  return {
    side,
    scaleDirection: hasCashFlowPlan ? 1 : scale < 0 ? -1 : 1,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07).toFixed(3)),
  };
}

function shouldRenderSimulationOverlay(widget, chartContext) {
  if (!chartContext?.pageId) return false;
  const simulation = getPageSimulation(chartContext.pageId);
  if (!simulation || !isLiquidityGapSimulationWidget(widget)) return false;
  if (Number(simulation.sourceWidgetSeq) !== LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ) return false;
  if (!getWidgetSimulationBehavior(widget)) return false;
  if (String(widget?.componentType || "").includes("表格")) return false;
  if (isDonutWidget(widget) || String(widget?.componentType || "").includes("分布")) return false;
  return true;
}

function getSingleSimulationAdjustmentRatio(widget, simulation, seriesIndex = 0) {
  const profile = getLiquidityGapSimulationProfile(simulation);
  const simulationBehavior = getWidgetSimulationBehavior(widget) || {};
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const liquidityGapRule = SIMULATION_RULE_CONFIG.liquidityGap || {};
  const configuredSensitivity = Number(simulationBehavior.sensitivity);
  const sensitivity = Number.isFinite(configuredSensitivity)
    ? configuredSensitivity
    : Number(simulationDefaults.baseSensitivity) || 0.11;
  const isWholesaleLiability = WHOLESALE_LIABILITY_TYPES.includes(simulation.businessType);
  let direction = profile.side === "asset"
    ? (liquidityGapRule.assetDirection ?? 0.88)
    : (isWholesaleLiability
      ? (liquidityGapRule.wholesaleLiabilityDirection ?? 1)
      : (liquidityGapRule.liabilityDirection ?? -0.56));
  direction *= profile.scaleDirection;
  const variationStep = Number(simulationDefaults.variationStep) || 0.035;
  const variation = 1 + (((widget.seq + seriesIndex * 17) % 9) - 4) * variationStep;
  return clampNumber(
    profile.impactScore * sensitivity * direction * variation,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
}

function getSimulationAdjustmentRatio(widget, simulation, seriesIndex = 0) {
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const entries = getSimulationEntries(simulation);
  if (!entries.length) return 0;
  const totalScale = entries.reduce((sum, entry) => sum + Math.max(1, Math.abs(Number(entry.scale || 0))), 0);
  const weightedRatio = entries.reduce((sum, entry) => {
    const weight = Math.max(1, Math.abs(Number(entry.scale || 0))) / totalScale;
    return sum + getSingleSimulationAdjustmentRatio(widget, entry, seriesIndex) * weight;
  }, 0);
  return clampNumber(
    weightedRatio,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
}

function renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions) {
  if (!shouldRenderSimulationOverlay(widget, chartContext) || !seriesDefinitions?.length) return "";
  const simulation = getPageSimulation(chartContext.pageId);
  const overlays = seriesDefinitions.slice(0, 4).map((definition, index) => {
    const lastPoint = definition.points?.[definition.points.length - 1];
    if (!lastPoint) return "";
    const adjustmentRatio = getSimulationAdjustmentRatio(widget, simulation, index);
    const simulatedY = clampNumber(lastPoint.y - frame.height * adjustmentRatio, frame.top + 8, frame.bottom - 8);
    const labelX = clampNumber(lastPoint.x + 16, frame.left + 16, frame.right - 36);
    const labelY = clampNumber(simulatedY - 12 - index * 10, frame.top + 14, frame.bottom - 10);
    return `
      <line x1="${lastPoint.x}" y1="${lastPoint.y}" x2="${lastPoint.x}" y2="${simulatedY}" stroke="${SIMULATION_COLOR}" stroke-width="2.4" stroke-dasharray="5 4" opacity="0.86"></line>
      <circle cx="${lastPoint.x}" cy="${simulatedY}" r="9" fill="${SIMULATION_FILL}" opacity="0.95"></circle>
      <path d="${buildDiamondPath(lastPoint.x, simulatedY, 5.6)}" fill="${SIMULATION_COLOR}" stroke="#ffffff" stroke-width="1.8"></path>
      ${index < 2 ? `<text x="${labelX}" y="${labelY}" class="chart-simulation-label">模拟</text>` : ""}
    `;
  }).join("");
  return `
    <g class="chart-simulation-overlay">
      ${overlays}
    </g>
  `;
}

function buildDiamondPath(cx, cy, size) {
  return `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
}
