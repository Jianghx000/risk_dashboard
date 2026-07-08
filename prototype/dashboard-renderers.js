window.dashboardRendererRegistry = {
  chart: {
    eveRatioTrend: renderEveRatioTrendChart,
    repricingGapRate: renderRepricingGapRateChart,
    liquidityDiagnosticRatio: renderLiquidityDiagnosticRatioChart,
    futureFundingFlow: renderFutureFundingFlowChart,
    liquidityGapTenor: renderLiquidityGapTenorChart,
    durationGapCombo: renderDurationGapComboChart,
    balanceScaleGrowth: renderBalanceScaleGrowthChart,
    businessScaleGrowth: renderBusinessScaleGrowthChart,
    businessDurationRepricing: renderBusinessDurationRepricingChart,
    niiVolatility: renderNiiVolatilityComboChart,
    maturityDistribution: renderMaturityDistributionChart,
    interbankFundingMaxTenor: renderInterbankFundingMaxTenorChart,
    interbankFundingTenorBucket: renderInterbankFundingTenorBucketChart,
    bondInvestmentScaleLimit: renderBondInvestmentScaleLimitChart,
    bondInvestmentDurationLimit: renderBondInvestmentDurationLimitChart,
  },
  data: {
    eveRatioTrend: renderLineDataTable,
    repricingGapRate: renderLineDataTable,
    liquidityDiagnosticRatio: renderLiquidityDiagnosticRatioDataTable,
    futureFundingFlow: renderFutureFundingFlowDataView,
    liquidityGapTenor: renderLiquidityGapTenorDataTable,
    businessDurationRepricing: renderBusinessDurationRepricingDataTable,
    niiVolatility: renderNiiVolatilityDataTable,
    durationGapCombo: renderDurationGapComboDataTable,
    balanceScaleGrowth: renderBalanceScaleGrowthDataTable,
    businessScaleGrowth: renderBusinessScaleGrowthDataTable,
    maturityDistribution: renderMaturityDistributionDataTable,
    interbankFundingMaxTenor: renderInterbankFundingMaxTenorDataTable,
    interbankFundingTenorBucket: renderInterbankFundingTenorBucketDataTable,
    bondInvestmentScaleLimit: renderBondInvestmentScaleLimitDataTable,
    bondInvestmentDurationLimit: renderBondInvestmentDurationLimitDataTable,
  },
  table: {
    businessStructure: renderBusinessStructureTable,
    businessDetail: renderBusinessDetailTable,
  },
};

function getDashboardChartRenderer(kind) {
  return window.dashboardRendererRegistry?.chart?.[kind] || null;
}

function getDashboardDataRenderer(kind) {
  return window.dashboardRendererRegistry?.data?.[kind] || null;
}

function getDashboardTableRenderer(kind) {
  return window.dashboardRendererRegistry?.table?.[kind] || null;
}
