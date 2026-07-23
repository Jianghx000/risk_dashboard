/* Simulation modal, draft, and chart overlay behavior. */

const REPRICING_GAP_SIMULATION_WIDGET_SEQ = 9;
const LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ = 49;
const REPRICING_GAP_DEFAULT_DEMAND_DEPOSIT_SCOPE = "不含";
const REPRICING_GAP_DEFAULT_DERIVATIVE_SCOPE = "含银行账簿和交易账簿";
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

function createEmptyRepricingGapMatrix() {
  return Object.fromEntries(getRepricingGapSimulationBusinessTypes().map((businessType) => [
    businessType,
    REPRICING_GAP_BUCKETS.map(() => 0),
  ]));
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

function getRepricingGapBaseSourceLabel() {
  return "当前时点缺口表";
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
    baseSource: "current",
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
      rateType: "固定利率",
    };
  });
  const caliberOptions = getRepricingGapCaliberOptions(draft);
  const result = buildRepricingGapSimulationResult({
    baseDate: draft.baseDate,
    baseMatrix: draft.baseMatrix,
    entries,
  }, caliberOptions);
  return {
    simulationType: SIMULATION_MODE_NEW_BUSINESS,
    simulationKind: "repricingGap",
    sourceWidgetSeq: REPRICING_GAP_SIMULATION_WIDGET_SEQ,
    baseDate: draft.baseDate,
    baseSource: "current",
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

function getLiquidityGapBaseSourceLabel() {
  return "当前时点缺口表";
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
    baseSource: "current",
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
    simulationType: SIMULATION_MODE_NEW_BUSINESS,
    simulationKind: "liquidityGap",
    sourceWidgetSeq: LIQUIDITY_GAP_SIMULATION_WIDGET_SEQ,
    baseDate: draft.baseDate,
    baseSource: "current",
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
        <span class="simulation-summary__item">${getRepricingGapBaseSourceLabel()}</span>
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
        <span class="simulation-summary__item">${getLiquidityGapBaseSourceLabel()}</span>
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

function getSimulationMode(page = getCurrentPage()) {
  return getPageBehavior(page).simulationMode || "generic";
}

function canRenderHedgeSimulation(page = getCurrentPage()) {
  return getSimulationMode(page) === "interest";
}

function getSimulationModeTabs(page = getCurrentPage()) {
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { mode: SIMULATION_MODE_HEDGE, label: "套期交易模拟测算" },
      { module: SIMULATION_MODULE_NET_INTEREST_INCOME, label: "净利息收入" },
    ];
  }
  if (simulationMode === "liquidity") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { module: SIMULATION_MODULE_LIQUIDITY_STRESS, label: "流动性压力测试" },
    ];
  }
  return [
    { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
  ];
}

function getSimulationDraftMode(page = getCurrentPage()) {
  if (!canRenderHedgeSimulation(page)) return SIMULATION_MODE_NEW_BUSINESS;
  return appState.simulationDraftMode === SIMULATION_MODE_HEDGE ? SIMULATION_MODE_HEDGE : SIMULATION_MODE_NEW_BUSINESS;
}

function getSimulationModeLabel(mode = SIMULATION_MODE_NEW_BUSINESS) {
  return mode === SIMULATION_MODE_HEDGE ? "套期交易模拟测算" : "新业务模拟测算";
}

function getDefaultSimulationDraftMode(page, simulation) {
  if (canRenderHedgeSimulation(page) && simulation?.simulationType === SIMULATION_MODE_HEDGE) return SIMULATION_MODE_HEDGE;
  return SIMULATION_MODE_NEW_BUSINESS;
}

function closeSimulationModal() {
  appState.simulationModalPageId = null;
  appState.simulationModalWidgetSeq = null;
  appState.simulationDraftMode = SIMULATION_MODE_NEW_BUSINESS;
  appState.simulationDraft = null;
  appState.hedgeSimulationDraft = null;
}

function openSimulationModal(pageId, widgetSeq = null) {
  const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
  const simulation = getPageSimulation(pageId);
  appState.simulationModalPageId = pageId;
  appState.simulationModalWidgetSeq = Number(widgetSeq || simulation?.sourceWidgetSeq || 0) || null;
  if (isRepricingGapSimulationWidget(appState.simulationModalWidgetSeq)) {
    appState.simulationDraftMode = SIMULATION_MODE_NEW_BUSINESS;
    appState.simulationDraft = createRepricingGapSimulationDraftFromScenario(simulation);
    appState.hedgeSimulationDraft = null;
    return;
  }
  if (isLiquidityGapSimulationWidget(appState.simulationModalWidgetSeq)) {
    appState.simulationDraftMode = SIMULATION_MODE_NEW_BUSINESS;
    appState.simulationDraft = createLiquidityGapSimulationDraftFromScenario(simulation);
    appState.hedgeSimulationDraft = null;
    return;
  }
  appState.simulationDraftMode = getDefaultSimulationDraftMode(page, simulation);
  appState.simulationDraft = createSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_NEW_BUSINESS ? simulation : null
  );
  appState.hedgeSimulationDraft = createHedgeSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_HEDGE ? simulation : null
  );
}

function getSimulationFieldDefs(page = getCurrentPage()) {
  const commonFields = [
    { name: "fundingRole", label: "资金方向", type: "select", options: SIMULATION_FUNDING_ROLE_OPTIONS },
    { name: "org", label: "机构", type: "select", options: FILTER_OPTIONS["机构"] || ["法人汇总"] },
    { name: "currency", label: "币种", type: "select", options: FILTER_OPTIONS["币种"] || ["全折人民币"] },
    { name: "businessType", label: "业务类型", type: "select", options: BUSINESS_DURATION_OPTIONS },
    { name: "scale", label: "规模（亿元）", type: "number", min: "1", step: "1" },
    { name: "termMonths", label: "期限（月）", type: "number", min: "1", step: "1" },
  ];
  if (getSimulationMode(page) === "interest") {
    return [
      ...commonFields,
      { name: "repricingMonths", label: "重定价频率", type: "select", options: REPRICING_FREQUENCY_OPTIONS, valueKey: "value", labelKey: "label" },
      { name: "rateType", label: "定价方式", type: "select", options: RATE_TYPE_OPTIONS },
    ];
  }
  return commonFields;
}

function getDefaultSimulationBusinessType(fundingRole) {
  if (SIMULATION_DEFAULT_BUSINESS_TYPES[fundingRole]) return SIMULATION_DEFAULT_BUSINESS_TYPES[fundingRole];
  return BUSINESS_DURATION_OPTIONS[0] || "";
}

function getDefaultSimulationFundingRole(entryIndex = 0) {
  return SIMULATION_FUNDING_ROLE_OPTIONS[entryIndex % SIMULATION_FUNDING_ROLE_OPTIONS.length] || SIMULATION_FUNDING_ROLE_OPTIONS[0];
}

function getSimulationFundingRoleByBusinessType(businessType) {
  const side = REPRICING_GAP_DERIVATIVE_SIDE_MAP[businessType] || BUSINESS_SIDE_MAP[businessType];
  return side === "liability" ? "资金来源" : "资金运用";
}

function normalizeSimulationEntryRole(entry, entryIndex = 0) {
  const fallbackRole = entry?.businessType
    ? getSimulationFundingRoleByBusinessType(entry.businessType)
    : getDefaultSimulationFundingRole(entryIndex);
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(entry?.fundingRole) ? entry.fundingRole : fallbackRole;
  return {
    ...entry,
    fundingRole,
  };
}

function createDefaultSimulationEntry(page = getCurrentPage(), entryIndex = 0, fundingRoleOverride = "") {
  const fieldDefs = getSimulationFieldDefs(page);
  const entry = {};
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(fundingRoleOverride)
    ? fundingRoleOverride
    : getDefaultSimulationFundingRole(entryIndex);
  fieldDefs.forEach((field) => {
    if (field.name === "fundingRole") entry[field.name] = fundingRole;
    else if (field.name === "businessType") entry[field.name] = getDefaultSimulationBusinessType(fundingRole);
    else if (field.type === "number") entry[field.name] = field.name === "scale" ? "50" : "12";
    else if (field.options?.length) {
      const firstOption = field.options[0];
      entry[field.name] = typeof firstOption === "object" ? firstOption[field.valueKey || "value"] : firstOption;
    } else entry[field.name] = "";
  });
  return entry;
}

function createDefaultSimulationDraft(page = getCurrentPage()) {
  return { entries: createMinimumSimulationEntries(page) };
}

function getSimulationEntries(simulation) {
  if (!simulation) return [];
  if (Array.isArray(simulation.entries)) return simulation.entries.filter(Boolean);
  return [simulation];
}

function getSimulationDraftEntries(draft, page = getCurrentPage()) {
  const entries = getSimulationEntries(draft);
  return ensureMinimumSimulationEntries(page, entries.length ? entries : []);
}

function createSimulationDraftFromScenario(page, scenario) {
  const entries = ensureMinimumSimulationEntries(page, getSimulationEntries(scenario));
  return {
    entries: entries.map((entry, index) => {
      const fallbackEntry = createDefaultSimulationEntry(page, index, entry?.fundingRole);
      return {
        ...fallbackEntry,
        ...entry,
        fundingRole: entry?.fundingRole || fallbackEntry.fundingRole,
        businessType: entry?.businessType || fallbackEntry.businessType,
        scale: String(entry?.scale ?? fallbackEntry.scale),
        termMonths: String(entry?.termMonths ?? fallbackEntry.termMonths),
      };
    }),
  };
}

function createMinimumSimulationEntries(page = getCurrentPage()) {
  return SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole, index) => createDefaultSimulationEntry(page, index, fundingRole));
}

function ensureMinimumSimulationEntries(page = getCurrentPage(), entries = []) {
  const normalizedEntries = (Array.isArray(entries) ? entries.filter(Boolean) : [])
    .map((entry, index) => normalizeSimulationEntryRole(entry, index));
  const nextEntries = [...normalizedEntries];
  SIMULATION_FUNDING_ROLE_OPTIONS.forEach((fundingRole) => {
    if (!nextEntries.some((entry) => entry.fundingRole === fundingRole)) {
      nextEntries.push(createDefaultSimulationEntry(page, nextEntries.length, fundingRole));
    }
  });
  return nextEntries;
}

function getSimulationVisibleFieldDefs(page = getCurrentPage()) {
  return getSimulationFieldDefs(page).filter((field) => field.name !== "fundingRole");
}

function updateSimulationEntryField(page, entries, entryIndex, fieldName, fieldValue) {
  const nextEntries = ensureMinimumSimulationEntries(page, entries).map((entry) => ({ ...entry }));
  const previousEntry = nextEntries[entryIndex] || createDefaultSimulationEntry(page, entryIndex);
  const nextEntry = {
    ...previousEntry,
    [fieldName]: fieldValue,
  };
  if (fieldName === "fundingRole") {
    const previousDefaultBusinessType = getDefaultSimulationBusinessType(previousEntry.fundingRole);
    const nextDefaultBusinessType = getDefaultSimulationBusinessType(fieldValue);
    if (!nextEntry.businessType || nextEntry.businessType === previousDefaultBusinessType) {
      nextEntry.businessType = nextDefaultBusinessType;
    }
  }
  nextEntries[entryIndex] = nextEntry;
  return nextEntries;
}

function renderSimulationField(field, draft, entryIndex) {
  const value = draft?.[field.name] ?? "";
  if (field.type === "select") {
    return `
      <label class="simulation-form__field">
        <span class="simulation-form__label">${field.label}</span>
        <select class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}">
          ${(field.options || []).map((option) => {
            const optionValue = typeof option === "object" ? option[field.valueKey || "value"] : option;
            const optionLabel = typeof option === "object" ? option[field.labelKey || "label"] : option;
            return `<option value="${optionValue}" ${String(optionValue) === String(value) ? "selected" : ""}>${optionLabel}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label class="simulation-form__field">
      <span class="simulation-form__label">${field.label}</span>
      <input class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}" type="${field.type}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.step ? `step="${field.step}"` : ""} />
    </label>
  `;
}

function normalizeSimulationRecord(page, draft) {
  const normalized = { ...createDefaultSimulationEntry(page), ...draft };
  normalized.fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(normalized.fundingRole) ? normalized.fundingRole : SIMULATION_FUNDING_ROLE_OPTIONS[0];
  normalized.scale = Math.max(1, Number(normalized.scale || 0));
  normalized.termMonths = Math.max(1, Number(normalized.termMonths || 0));
  if (getSimulationMode(page) === "interest") normalized.repricingMonths = String(normalized.repricingMonths || "3");
  return normalized;
}

function getSharedSimulationValue(entries, key, mixedLabel) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  return mixedLabel;
}

function normalizeSimulationScenario(page, draft) {
  const entries = getSimulationDraftEntries(draft, page).map((entry) => normalizeSimulationRecord(page, entry));
  const totalScale = entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
  const weightedTerm = entries.reduce((sum, entry) => sum + Number(entry.termMonths || 0) * Number(entry.scale || 0), 0);
  return {
    simulationType: SIMULATION_MODE_NEW_BUSINESS,
    entries,
    org: getSharedSimulationValue(entries, "org", "多机构"),
    currency: getSharedSimulationValue(entries, "currency", "多币种"),
    fundingRole: getSharedSimulationValue(entries, "fundingRole", "来源/运用组合"),
    businessType: getSharedSimulationValue(entries, "businessType", "组合业务"),
    scale: Number(totalScale.toFixed(1)),
    termMonths: totalScale ? Number((weightedTerm / totalScale).toFixed(1)) : 1,
  };
}

function createDefaultHedgeSimulationDraft() {
  return {
    query: "",
    selectedItemId: "",
    hedgeAmount: "50",
    hedgeTermMonths: "12",
  };
}

function createHedgeSimulationDraftFromScenario(page, scenario) {
  if (scenario?.simulationType !== SIMULATION_MODE_HEDGE) return createDefaultHedgeSimulationDraft(page);
  return {
    query: scenario.hedgeItemId || "",
    selectedItemId: scenario.hedgeItemId || "",
    hedgeAmount: String(scenario.hedgeAmount ?? scenario.scale ?? "50"),
    hedgeTermMonths: String(scenario.hedgeTermMonths ?? scenario.termMonths ?? "12"),
  };
}

function getHedgeSearchResults(draft = appState.hedgeSimulationDraft) {
  const query = String(draft?.query || "").trim().toLowerCase();
  if (!query) return HEDGEABLE_ITEM_OPTIONS.slice(0, 4);
  return HEDGEABLE_ITEM_OPTIONS.filter((item) =>
    [item.id, item.type, item.businessType, item.org, item.currency, item.rateBenchmark]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

function getSelectedHedgeItem(draft = appState.hedgeSimulationDraft) {
  return HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === draft?.selectedItemId) || null;
}

function getHedgeDraft(page = getCurrentPage()) {
  if (!appState.hedgeSimulationDraft) appState.hedgeSimulationDraft = createDefaultHedgeSimulationDraft(page);
  return appState.hedgeSimulationDraft;
}

function normalizeHedgeSimulationScenario(page, draft = createDefaultHedgeSimulationDraft(page)) {
  const selectedItem = getSelectedHedgeItem(draft) || getHedgeSearchResults(draft)[0] || HEDGEABLE_ITEM_OPTIONS[0];
  const hedgeAmount = clampNumber(Number(draft.hedgeAmount || 0), 1, selectedItem.balance);
  const hedgeTermMonths = clampNumber(Number(draft.hedgeTermMonths || selectedItem.remainingTermMonths || 12), 1, 360);
  const hedgeCoverageRatio = Number((hedgeAmount / Math.max(1, Number(selectedItem.balance || 1))).toFixed(4));
  const entry = {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeCoverageRatio,
    fundingRole: getSimulationFundingRoleByBusinessType(selectedItem.businessType),
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
    repricingMonths: selectedItem.repricingMonths || "3",
    rateType: selectedItem.rateType || "浮动利率",
  };
  return {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeAmount,
    hedgeTermMonths,
    hedgeCoverageRatio,
    hedgedItem: selectedItem,
    entries: [entry],
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
  };
}

function renderSimulationEntryForm(page, entry, entryIndex, roleEntryIndex, roleEntryCount) {
  return `
    <section class="simulation-entry" data-simulation-entry="${entryIndex}">
      <div class="simulation-entry__header">
        <h4 class="simulation-entry__title">业务 ${roleEntryIndex + 1}</h4>
        ${roleEntryCount > 1 ? `<button class="simulation-entry__remove" type="button" data-remove-simulation-entry="${entryIndex}">删除</button>` : ""}
      </div>
      <div class="simulation-form simulation-form--entry">
        ${getSimulationVisibleFieldDefs(page).map((field) => renderSimulationField(field, entry, entryIndex)).join("")}
      </div>
    </section>
  `;
}

function renderSimulationRoleSection(page, entries, fundingRole) {
  const roleEntries = entries
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entry.fundingRole === fundingRole);
  const roleScale = roleEntries.reduce((sum, item) => sum + Number(item.entry.scale || 0), 0);
  const roleClass = fundingRole === "资金来源" ? "source" : "use";
  return `
    <section class="simulation-role-section simulation-role-section--${roleClass}">
      <div class="simulation-role-section__header">
        <div>
          <h4 class="simulation-role-section__title">${fundingRole}</h4>
          <div class="simulation-role-section__meta">共 ${roleEntries.length} 笔 / 合计 ${Number(roleScale.toFixed(1))} 亿元</div>
        </div>
      </div>
      <div class="simulation-role-section__body">
        ${roleEntries.map((item, roleEntryIndex) =>
          renderSimulationEntryForm(page, item.entry, item.entryIndex, roleEntryIndex, roleEntries.length)
        ).join("")}
      </div>
      <div class="simulation-role-section__actions">
        <button class="toolbar-action" type="button" data-add-simulation-entry="${page.id}" data-simulation-entry-role="${fundingRole}">新增${fundingRole}业务</button>
      </div>
    </section>
  `;
}

function renderSimulationModeTabs(page, activeMode) {
  const tabs = getSimulationModeTabs(page);
  if (tabs.length <= 1) return "";
  return `
    <div class="simulation-mode-tabs" role="tablist" aria-label="模拟测算类型">
      ${tabs.map((tab) => `
        <button
          class="simulation-mode-tab ${tab.mode === activeMode ? "is-active" : ""}${tab.module ? " simulation-mode-tab--module" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.mode === activeMode ? "true" : "false"}"
          ${tab.mode ? `data-simulation-mode-tab="${tab.mode}"` : ""}
          ${tab.module ? `data-simulation-module-link="${tab.module}"` : ""}
        >
          ${tab.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderNewBusinessSimulationPanel(page) {
  const draft = appState.simulationDraft || createDefaultSimulationDraft(page);
  const entries = getSimulationDraftEntries(draft, page);
  return `
    <div class="simulation-entry-list">
      ${SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole) => renderSimulationRoleSection(page, entries, fundingRole)).join("")}
    </div>
  `;
}

function renderHedgeItemInfo(item) {
  if (!item) {
    return `
      <div class="hedge-selected-card hedge-selected-card--empty">
        <div class="hedge-selected-card__title">请选择被套期项目</div>
        <p>输入项目编号、类型、机构、币种或利率基准后，在下方结果中点击编号即可带出基础信息。</p>
      </div>
    `;
  }
  const rows = [
    ["类型", item.type],
    ["业务类型", item.businessType],
    ["机构", item.org],
    ["币种", item.currency],
    ["余额", `${Number(item.balance).toFixed(1)}亿元`],
    ["利率类型", item.rateType],
    ["利率基准", item.rateBenchmark],
    ["票面/执行利率", item.couponRate],
    ["YTM", item.ytm],
    ["修正久期", item.modifiedDuration],
    ["重定价周期", item.repricingCycle],
    ["原始期限", item.originalTerm],
    ["剩余期限", item.remainingTerm],
    ["下一重定价日", item.nextRepricingDate],
  ].filter((row) => row[1]);
  return `
    <div class="hedge-selected-card">
      <div class="hedge-selected-card__title">${item.id}</div>
      <div class="hedge-info-grid">
        ${rows.map(([label, value]) => `
          <div class="hedge-info-grid__item">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHedgeSearchResults(draft, selectedItem) {
  const results = getHedgeSearchResults(draft);
  return `
    <div class="hedge-search-results">
      <div class="hedge-search-results__header">
        <span>可选被套期项目</span>
        <span>共 ${results.length} 条</span>
      </div>
      <div class="hedge-search-results__list">
        ${results.map((item) => `
          <button
            class="hedge-search-result ${selectedItem?.id === item.id ? "is-selected" : ""}"
            type="button"
            data-select-hedge-item="${item.id}"
          >
            <span class="hedge-search-result__id">${item.id}</span>
            <span>${item.type} / ${item.currency} / ${item.rateBenchmark}</span>
            <strong>${Number(item.balance).toFixed(1)}亿元</strong>
          </button>
        `).join("") || `<div class="hedge-search-results__empty">未匹配到项目，请调整编号或关键词。</div>`}
      </div>
    </div>
  `;
}

function renderHedgeSimulationPanel(page) {
  const draft = getHedgeDraft(page);
  const selectedItem = getSelectedHedgeItem(draft);
  const maxAmount = selectedItem?.balance || HEDGEABLE_ITEM_OPTIONS[0]?.balance || 1;
  return `
    <div class="hedge-simulation-panel">
      <div class="hedge-simulation-grid">
        <div class="hedge-input-card">
          <label class="simulation-form__field">
            <span class="simulation-form__label">被套期项目编号</span>
            <input class="simulation-form__control" data-hedge-simulation-field="query" type="search" value="${draft.query || ""}" placeholder="输入项目编号或关键词" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">本次套期金额（亿元）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeAmount" type="number" min="1" max="${maxAmount}" step="1" value="${draft.hedgeAmount || ""}" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">套期期限（月）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeTermMonths" type="number" min="1" max="360" step="1" value="${draft.hedgeTermMonths || selectedItem?.remainingTermMonths || 12}" />
          </label>
        </div>
        ${renderHedgeItemInfo(selectedItem)}
      </div>
      ${renderHedgeSearchResults(draft, selectedItem)}
    </div>
  `;
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
  const sourceLabel = getRepricingGapBaseSourceLabel();
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
            当前基准：${sourceLabel}；
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
  const sourceLabel = getLiquidityGapBaseSourceLabel();
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
          <span>当前基准：${sourceLabel}；金额正数为流入，负数为流出</span>
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
  if (!page) {
    simulationModalEl.innerHTML = "";
    simulationModalEl.classList.remove("is-open");
    simulationModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  if (isRepricingGapSimulationWidget(appState.simulationModalWidgetSeq)) {
    simulationModalEl.innerHTML = renderRepricingGapSimulationModal(page);
    simulationModalEl.classList.add("is-open");
    simulationModalEl.setAttribute("aria-hidden", "false");
    return;
  }
  if (isLiquidityGapSimulationWidget(appState.simulationModalWidgetSeq)) {
    simulationModalEl.innerHTML = renderLiquidityGapSimulationModal(page);
    simulationModalEl.classList.add("is-open");
    simulationModalEl.setAttribute("aria-hidden", "false");
    return;
  }
  const activeMode = getSimulationDraftMode(page);
  const activeModeLabel = getSimulationModeLabel(activeMode);
  const applyDisabled = activeMode === SIMULATION_MODE_HEDGE && !getSelectedHedgeItem(getHedgeDraft(page)) ? " disabled" : "";
  simulationModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--wide" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">${activeModeLabel}</div>
          <h3 id="simulationModalTitle">${page.name}模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      ${renderSimulationModeTabs(page, activeMode)}
      ${activeMode === SIMULATION_MODE_HEDGE ? renderHedgeSimulationPanel(page) : renderNewBusinessSimulationPanel(page)}
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}"${applyDisabled}>应用测算</button>
      </div>
    </section>
  `;
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

function getSimulationProfile(page, simulation) {
  const hasCashFlowPlan = Array.isArray(simulation.cashFlows) && simulation.cashFlows.length > 0;
  const netCashFlow = hasCashFlowPlan
    ? simulation.cashFlows.reduce((sum, cashFlow) => sum + Number(cashFlow.amount || 0), 0)
    : 0;
  const side = hasCashFlowPlan && netCashFlow !== 0
    ? netCashFlow < 0 ? "liability" : "asset"
    : simulation.fundingRole === "资金来源"
      ? "liability"
      : simulation.fundingRole === "资金运用"
        ? "asset"
        : BUSINESS_SIDE_MAP[simulation.businessType] || "asset";
  const scale = hasCashFlowPlan ? Math.abs(netCashFlow) : Number(simulation.scale || 0);
  const scaleWeight = Math.min(1.4, Math.abs(scale) / 120);
  const tenorWeight = Math.min(1.2, Number(simulation.termMonths || 0) / 24);
  const hedgeWeight = simulation.simulationType === SIMULATION_MODE_HEDGE
    ? clampNumber(Number(simulation.hedgeCoverageRatio || 0.35), 0.08, 1)
    : 1;
  return {
    side,
    scaleDirection: hasCashFlowPlan ? 1 : scale < 0 ? -1 : 1,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07) * hedgeWeight).toFixed(3),
  };
}

function shouldRenderSimulationOverlay(widget, chartContext) {
  if (!chartContext?.pageId) return false;
  const simulation = getPageSimulation(chartContext.pageId);
  if (!simulation) return false;
  if (isRepricingGapSimulationWidget(widget) && Number(simulation.sourceWidgetSeq) === REPRICING_GAP_SIMULATION_WIDGET_SEQ) return false;
  if (!isSimulationPage(data.pages.find((page) => page.id === chartContext.pageId))) return false;
  if (!getWidgetSimulationBehavior(widget)) return false;
  if (String(widget?.componentType || "").includes("表格")) return false;
  if (isDonutWidget(widget) || String(widget?.componentType || "").includes("分布")) return false;
  return true;
}

function getSingleSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const page = data.pages.find((item) => item.id === chartContext.pageId) || getCurrentPage();
  const profile = getSimulationProfile(page, simulation);
  const simulationBehavior = getWidgetSimulationBehavior(widget) || {};
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const simulationModes = SIMULATION_RULE_CONFIG.modes || {};
  const wholesaleLiabilityTypes = WHOLESALE_LIABILITY_TYPES;
  const configuredSensitivity = Number(simulationBehavior.sensitivity);
  let sensitivity = Number.isFinite(configuredSensitivity) ? configuredSensitivity : Number(simulationDefaults.baseSensitivity) || 0.11;
  let direction = 1;
  const isLiabilitySeries = role.includes("liability") || role.includes("负债");
  const isGapSeries = role.includes("gap") || role.includes("差额");
  const isWholesaleLiability = wholesaleLiabilityTypes.includes(simulation.businessType);
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    const modeRule = simulationModes.interest || {};
    direction = profile.side === "asset" ? (modeRule.assetDirection ?? 1) : (modeRule.liabilityDirection ?? -1);
    if (isLiabilitySeries) direction *= -1;
    if (isGapSeries) direction *= profile.side === "asset" ? (modeRule.gapAssetDirection ?? 0.92) : (modeRule.gapLiabilityDirection ?? -0.68);
    if (simulation.rateType === "浮动利率") sensitivity *= Number(simulationDefaults.floatingRateMultiplier) || 0.74;
    if (simulation.simulationType === SIMULATION_MODE_HEDGE) {
      direction *= -1;
      sensitivity *= Number(simulationDefaults.hedgeSensitivityMultiplier) || 0.68;
    }
  } else if (simulationMode === "liquidity") {
    const directionMode = simulationBehavior.directionMode || "default";
    const modeRule = simulationModes.liquidity?.[directionMode] || simulationModes.liquidity?.default || {};
    direction = profile.side === "asset"
      ? (modeRule.assetDirection ?? 0.74)
      : (isWholesaleLiability ? (modeRule.wholesaleLiabilityDirection ?? 0.82) : (modeRule.liabilityDirection ?? -0.42));
  } else {
    const isDomesticCurrency = ["人民币", "全折人民币"].includes(simulation.currency);
    sensitivity *= isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxSensitivityMultiplier) || 0.45)
      : (Number(simulationDefaults.foreignFxSensitivityMultiplier) || 1.14);
    direction = isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxDirection) || 0.34)
      : (Number(simulationDefaults.foreignFxDirection) || 1);
    if (profile.side === "liability" && (seriesLabel || "").includes("负债")) {
      direction *= Number(simulationDefaults.liabilityFxSeriesMultiplier) || 0.82;
    }
  }
  direction *= profile.scaleDirection;
  const variationStep = Number(simulationDefaults.variationStep) || 0.035;
  const variation = 1 + (((widget.seq + seriesIndex * 17) % 9) - 4) * variationStep;
  return clampNumber(
    profile.impactScore * sensitivity * direction * variation,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
}

function getSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const entries = getSimulationEntries(simulation);
  if (!entries.length) return 0;
  const totalScale = entries.reduce((sum, entry) => sum + Math.max(1, Math.abs(Number(entry.scale || 0))), 0);
  const weightedRatio = entries.reduce((sum, entry) => {
    const weight = Math.max(1, Math.abs(Number(entry.scale || 0))) / totalScale;
    return sum + getSingleSimulationAdjustmentRatio(widget, chartContext, entry, seriesLabel, seriesIndex, role) * weight;
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
    const adjustmentRatio = getSimulationAdjustmentRatio(widget, chartContext, simulation, definition.label, index, definition.role || "line");
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
