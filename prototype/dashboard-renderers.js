window.dashboardRendererRegistry = {
  chart: {
    eveRatioTrend: renderEveRatioTrendChart,
    repricingGapRate: renderRepricingGapRateChart,
    repricingDurationGap: renderRepricingDurationGapChart,
    liquidityDiagnosticRatio: renderLiquidityDiagnosticRatioChart,
    futureFundingFlow: renderFutureFundingFlowChart,
    liquidityGapTenor: renderLiquidityGapTenorChart,
    balanceScaleGrowth: renderBalanceScaleGrowthChart,
    businessScaleGrowth: renderBusinessScaleGrowthChart,
    niiVolatility: renderNiiVolatilityComboChart,
    maturityDistribution: renderMaturityDistributionChart,
    bondInvestmentScaleLimit: renderBondInvestmentScaleLimitChart,
    bondInvestmentDurationLimit: renderBondInvestmentDurationLimitChart,
  },
  data: {
    eveRatioTrend: renderLineDataTable,
    repricingGapRate: renderRepricingGapRateDataTable,
    repricingDurationGap: renderRepricingDurationGapDataTable,
    liquidityDiagnosticRatio: renderLiquidityDiagnosticRatioDataTable,
    futureFundingFlow: renderFutureFundingFlowDataView,
    liquidityGapTenor: renderLiquidityGapTenorDataTable,
    niiVolatility: renderNiiVolatilityDataTable,
    balanceScaleGrowth: renderBalanceScaleGrowthDataTable,
    businessScaleGrowth: renderBusinessScaleGrowthDataTable,
    maturityDistribution: renderMaturityDistributionDataTable,
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
