window.dashboardConfig = {
  "filters": {
    "singleSelect": [
      "机构",
      "币种"
    ],
    "options": {
      "机构": [
        "法人汇总",
        "境外分行汇总",
        "境内汇总",
        "纽约分行",
        "新加坡分行",
        "卢森堡分行",
        "伦敦分行",
        "悉尼分行",
        "香港分行"
      ],
      "币种": [
        "全折人民币",
        "全折美元",
        "全折欧元",
        "人民币",
        "外币折美元",
        "美元",
        "港币",
        "新加坡元",
        "欧元",
        "澳元",
        "英镑",
        "日元"
      ],
      "利率情景": [
        "平行上移",
        "下移",
        "变陡峭",
        "变平缓",
        "短端上升",
        "短端下降"
      ],
      "情景": [
        "平行上移",
        "下移",
        "变陡峭",
        "变平缓",
        "短端上升",
        "短端下降"
      ],
      "期限长度": [
        "1D",
        "7D",
        "30D",
        "3M",
        "1Y"
      ],
      "时间区间": [
        "近1月",
        "近3月",
        "近12月",
        "年初至今"
      ],
      "口径": [
        "本币",
        "外币",
        "本外币合计"
      ]
    },
    "areaOverrides": {
      "净利息收入波动率": {
        "利率情景": [
          "所有利率平行上移200bp",
          "活期利率不变但其他利率平行上移200bp"
        ]
      }
    },
    "defaults": {
      "机构": [
        "法人汇总"
      ],
      "币种": [
        "全折人民币"
      ]
    },
    "presets": {
      "orgCurrency": [
        "机构",
        "币种"
      ],
      "orgCurrencyRateScenario": [
        "机构",
        "币种",
        "利率情景"
      ],
      "orgOnly": [
        "机构"
      ]
    }
  },
  "pageBehavior": {
    "利率风险": {
      "simulationMode": "interest"
    },
    "流动性风险": {
      "simulationMode": "liquidity"
    },
    "业务变动分析": {
      "analysisPerspective": "interestBalanceStructure",
      "dateRangeMode": "independentMonthEnd",
      "analysisPerspectiveOptions": [
        "interestBalanceStructure",
        "liquidityBalanceStructure"
      ]
    }
  },
  "managementLimits": [
    {
      "indicator": "最大经济价值变动比例",
      "widgetSeqs": [
        1
      ],
      "entries": [
        {
          "organization": "法人汇总",
          "currency": "全折人民币",
          "operator": "<=",
          "value": 15,
          "unit": "%"
        }
      ]
    },
    {
      "indicator": "30天累计流动性缺口规模",
      "widgetSeqs": [
        49
      ],
      "entries": [
        { "organization": "香港分行", "currency": "全折美元", "operator": ">=", "value": -10, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "香港分行", "currency": "全折美元", "operator": ">=", "value": -10, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "月日均" } },
        { "organization": "纽约分行", "currency": "全折美元", "operator": ">=", "value": -4, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "纽约分行", "currency": "全折美元", "operator": ">=", "value": -4, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "月日均" } },
        { "organization": "新加坡分行", "currency": "全折美元", "operator": ">=", "value": -5.5, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "新加坡分行", "currency": "全折美元", "operator": ">=", "value": -5, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "月日均" } },
        { "organization": "卢森堡分行", "currency": "全折欧元", "operator": ">=", "value": -1, "unit": "亿欧元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "卢森堡分行", "currency": "全折欧元", "operator": ">=", "value": -1, "unit": "亿欧元", "filters": { "期限长度": "30D", "口径": "月日均" } },
        { "organization": "伦敦分行", "currency": "全折美元", "operator": ">=", "value": -3.5, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "伦敦分行", "currency": "全折美元", "operator": ">=", "value": -3.5, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "月日均" } },
        { "organization": "悉尼分行", "currency": "全折美元", "operator": ">=", "value": -2.5, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "时点" } },
        { "organization": "悉尼分行", "currency": "全折美元", "operator": ">=", "value": -3, "unit": "亿美元", "filters": { "期限长度": "30D", "口径": "月日均" } }
      ]
    },
    {
      "indicator": "流动性比例",
      "widgetSeqs": [
        53
      ],
      "entries": [
        { "organization": "纽约分行", "currency": "全折人民币", "operator": ">=", "value": 25, "unit": "%" },
        { "organization": "伦敦分行", "currency": "全折人民币", "operator": ">=", "value": 25, "unit": "%" }
      ]
    },
    {
      "indicator": "债券投资组合久期",
      "widgetSeqs": [
        60
      ],
      "entries": [
        { "organization": "香港分行", "currency": "外币折美元", "operator": "<=", "value": 4, "unit": "年" },
        { "organization": "香港分行", "currency": "人民币", "operator": "<=", "value": 4, "unit": "年" },
        { "organization": "纽约分行", "currency": "外币折美元", "operator": "<=", "value": 4.5, "unit": "年" },
        { "organization": "纽约分行", "currency": "人民币", "operator": "<=", "value": 2, "unit": "年" },
        { "organization": "新加坡分行", "currency": "外币折美元", "operator": "<=", "value": 3, "unit": "年" },
        { "organization": "新加坡分行", "currency": "人民币", "operator": "<=", "value": 3, "unit": "年" },
        { "organization": "卢森堡分行", "currency": "外币折美元", "operator": "<=", "value": 4, "unit": "年" },
        { "organization": "卢森堡分行", "currency": "人民币", "operator": "<=", "value": 2, "unit": "年" },
        { "organization": "伦敦分行", "currency": "外币折美元", "operator": "<=", "value": 4, "unit": "年" },
        { "organization": "伦敦分行", "currency": "人民币", "operator": "<=", "value": 3, "unit": "年" },
        { "organization": "悉尼分行", "currency": "外币折美元", "operator": "<=", "value": 4, "unit": "年" },
        { "organization": "悉尼分行", "currency": "人民币", "operator": "<=", "value": 2, "unit": "年" }
      ]
    },
    {
      "indicator": "经期限调整的重定价缺口率",
      "widgetSeqs": [
        9
      ],
      "entries": [
        { "organization": "香港分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "香港分行", "currency": "港币", "operator": "<=", "value": 50, "unit": "%" },
        { "organization": "香港分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "香港分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" },
        { "organization": "纽约分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "纽约分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "纽约分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" },
        { "organization": "新加坡分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "新加坡分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "新加坡分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" },
        { "organization": "卢森堡分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "卢森堡分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "卢森堡分行", "currency": "欧元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "卢森堡分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" },
        { "organization": "伦敦分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "伦敦分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "伦敦分行", "currency": "港币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "伦敦分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" },
        { "organization": "悉尼分行", "currency": "全折人民币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "悉尼分行", "currency": "美元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "悉尼分行", "currency": "港币", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "悉尼分行", "currency": "澳元", "operator": "<=", "value": 16, "unit": "%" },
        { "organization": "悉尼分行", "currency": "人民币", "operator": "<=", "value": 25, "unit": "%" }
      ]
    },
    {
      "indicator": "债券投资规模",
      "widgetSeqs": [
        59
      ],
      "metricKey": "bondInvestmentScale",
      "entries": [
        { "organization": "香港分行", "currency": "全折美元", "operator": "<=", "value": 142, "unit": "亿美元" },
        { "organization": "纽约分行", "currency": "全折美元", "operator": "<=", "value": 25, "unit": "亿美元" },
        { "organization": "新加坡分行", "currency": "全折美元", "operator": "<=", "value": 32, "unit": "亿美元" },
        { "organization": "卢森堡分行", "currency": "全折欧元", "operator": "<=", "value": 10, "unit": "亿欧元" },
        { "organization": "伦敦分行", "currency": "全折美元", "operator": "<=", "value": 9, "unit": "亿美元" },
        { "organization": "悉尼分行", "currency": "全折美元", "operator": "<=", "value": 16, "unit": "亿美元" }
      ]
    },
    {
      "indicator": "非金融企业债券投资规模",
      "widgetSeqs": [
        59
      ],
      "metricKey": "corporateBondScale",
      "entries": [
        { "organization": "香港分行", "currency": "全折美元", "operator": "<=", "value": 5, "unit": "亿美元" },
        { "organization": "纽约分行", "currency": "全折美元", "operator": "<=", "value": 2, "unit": "亿美元" },
        { "organization": "新加坡分行", "currency": "全折美元", "operator": "<=", "value": 2, "unit": "亿美元" },
        { "organization": "卢森堡分行", "currency": "全折欧元", "operator": "<=", "value": 1, "unit": "亿欧元" },
        { "organization": "伦敦分行", "currency": "全折美元", "operator": "<=", "value": 1, "unit": "亿美元" },
        { "organization": "悉尼分行", "currency": "全折美元", "operator": "<=", "value": 1, "unit": "亿美元" }
      ]
    }
  ],
  "widgetBehavior": {
    "1": {
      "chartKind": "eveRatioTrend"
    },
    "3": {
      "seriesFilters": {
        "suppress": [
          "币种"
        ]
      }
    },
    "4": {
      "fullWidth": false,
      "seriesFilters": {
        "allow": [
          "利率情景",
          "情景"
        ]
      }
    },
    "7": {
      "chartKind": "niiVolatility",
      "seriesFilters": {
        "allow": [
          "利率情景",
          "情景"
        ]
      }
    },
    "9": {
      "chartKind": "repricingGapRate",
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "14": {
      "chartKind": "maturityDistribution"
    },
    "15": {
      "chartKind": "repricingDurationGap",
      "yAxisLabel": "久期缺口"
    },
    "42": {
      "chartKind": "liquidityDiagnosticRatio",
      "liquidityDiagnosticKind": "lcr",
      "frequencyToggle": true
    },
    "46": {
      "chartKind": "liquidityDiagnosticRatio",
      "liquidityDiagnosticKind": "nsfr",
      "frequencyToggle": true
    },
    "49": {
      "chartKind": "liquidityGapTenor",
      "frequencyToggle": true,
      "caliberFilterTenor": "30D",
      "simulationBehavior": {
        "directionMode": "gap",
        "sensitivity": 0.16
      },
      "inlineFilters": [
        "期限长度",
        "口径"
      ]
    },
    "53": {
      "chartKind": "liquidityDiagnosticRatio",
      "liquidityDiagnosticKind": "liquidityRatio",
      "frequencyToggle": true
    },
    "54": {
      "chartKind": "futureFundingFlow",
      "fullWidth": true
    },
    "59": {
      "chartKind": "bondInvestmentScaleLimit",
      "yAxisLabel": "规模（亿元）"
    },
    "60": {
      "chartKind": "bondInvestmentDurationLimit",
      "yAxisLabel": "久期"
    },
    "72": {
      "chartKind": "balanceScaleGrowth"
    },
    "73": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12
    },
    "79": {
      "tableKind": "businessStructure",
      "structureScope": "stock",
      "drilldownTargetSeq": 80
    },
    "80": {
      "tableKind": "businessDetail",
      "detailScope": "stock"
    },
    "83": {
      "chartKind": "balanceScaleGrowth",
      "methodologyKey": "newMonthly"
    },
    "84": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12,
      "methodologyKey": "newMonthly"
    },
    "85": {
      "tableKind": "businessDetail",
      "detailScope": "new",
      "methodologyKey": "newMonthly"
    },
    "89": {
      "tableKind": "businessStructure",
      "structureScope": "new",
      "methodologyKey": "newMonthly",
      "showDateFilter": true,
      "drilldownTargetSeq": 85,
      "inlineFilters": [
        "时间区间（起止）"
      ]
    },
    "90": {
      "chartKind": "balanceScaleGrowth",
      "maturityTrend": true,
      "methodologyKey": "maturityMonthly"
    },
    "91": {
      "chartKind": "businessScaleGrowth",
      "maturityTrend": true,
      "maxSeries": 12,
      "methodologyKey": "maturityMonthly"
    },
    "96": {
      "tableKind": "businessStructure",
      "structureScope": "maturity",
      "methodologyKey": "maturityMonthly",
      "showDateFilter": true,
      "maturityStructure": true,
      "drilldownTargetSeq": 97,
      "inlineFilters": [
        "时间区间（起止）"
      ]
    },
    "97": {
      "tableKind": "businessDetail",
      "detailScope": "maturity",
      "methodologyKey": "maturityMonthly"
    }
  },
  "widgetFilters": {
    "4": [
      {
        "presetRef": "interestScenarioLegend"
      }
    ],
    "14": [
      {
        "presetRef": "businessTypeLegend"
      }
    ],
    "49": [
      {
        "presetRef": "liquidityTenorLegend"
      },
      {
        "presetRef": "caliberSelector"
      }
    ],
    "54": [
      {
        "presetRef": "futureFundingBusinessTypeLegend"
      }
    ],
    "73": [
      {
        "presetRef": "businessTypeLegend"
      }
    ],
    "84": [
      {
        "presetRef": "businessTypeLegend"
      }
    ],
    "89": [
      {
        "presetRef": "timeRangeSelector"
      }
    ],
    "91": [
      {
        "presetRef": "businessTypeLegend"
      }
    ],
    "96": [
      {
        "presetRef": "timeRangeSelector"
      }
    ]
  },
  "seriesRules": {
    "dimensionOrder": [
      "利率情景",
      "情景",
      "机构",
      "币种",
      "贷款类型",
      "存款类型",
      "期限长度",
      "业务类型"
    ],
    "labelMap": {
      "利率情景": "情景",
      "情景": "情景",
      "机构": "机构",
      "币种": "币种",
      "贷款类型": "贷款类型",
      "存款类型": "存款类型",
      "期限长度": "期限",
      "业务类型": "业务类型"
    },
    "defaultMaxSeries": 8
  },
  "widgetFilterPresets": {
    "interestScenarioLegend": {
      "name": "利率情景",
      "options": [
        "6种情景最大值",
        "平行上移",
        "下移",
        "变陡峭",
        "变平缓",
        "短端上升",
        "短端下降"
      ],
      "defaultValues": [
        "6种情景最大值"
      ],
      "multi": true
    },
    "businessTypeLegend": {
      "name": "业务类型",
      "renderMode": "legend",
      "multi": true,
      "optionsRef": "businessDurationOptions",
      "defaultValuesRef": "businessTypeDefaultValues"
    },
    "futureFundingBusinessTypeLegend": {
      "name": "业务类型",
      "renderMode": "legend",
      "multi": true,
      "optionsRef": "liquidityBusinessTypes",
      "defaultValuesRef": "liquidityBusinessTypes"
    },
    "liquidityTenorLegend": {
      "name": "期限长度",
      "label": "期限",
      "renderMode": "segmented",
      "options": [
        "1D",
        "7D",
        "30D",
        "3M",
        "1Y"
      ],
      "defaultValues": [
        "30D"
      ],
      "multi": false
    },
    "caliberSelector": {
      "name": "口径",
      "label": "口径",
      "options": [
        "时点",
        "月日均"
      ],
      "defaultValues": [
        "时点"
      ],
      "multi": false
    },
    "timeRangeSelector": {
      "name": "时间区间（起止）",
      "label": "统计月末区间",
      "type": "dateRange",
      "multi": false
    }
  },
  "visualRules": {
    "palette": {
      "line": [
        "#C36E49",
        "#3F76B7",
        "#4F978B",
        "#C8943A",
        "#7D72AF",
        "#B86556",
        "#5E463A",
        "#6F9688"
      ],
      "bar": [
        "#5E97D1",
        "#71B7A8",
        "#8C7FD0",
        "#D4A55D",
        "#7FAFDF",
        "#8FC6BB",
        "#B39CD9",
        "#E2BE85"
      ],
      "semantic": {
        "gapLine": "#C36E49",
        "fundingInflow": "#C36E49",
        "fundingOutflow": "#4F978B",
        "fundingDailyNetPositive": "#5E97D1",
        "fundingDailyNetNegative": "#D4A55D",
        "fundingCumulative": "#3F76B7",
        "simulationLine": "#2F6FA3",
        "simulationFill": "rgba(47, 111, 163, 0.16)"
      }
    }
  },
  "layoutRules": {
    "widgets": {
      "54": {
        "fullWidth": true
      }
    }
  },
  "simulationRules": {
    "defaults": {
      "baseSensitivity": 0.11,
      "minAdjustmentRatio": -0.22,
      "maxAdjustmentRatio": 0.22,
      "floatingRateMultiplier": 0.74,
      "domesticFxSensitivityMultiplier": 0.45,
      "foreignFxSensitivityMultiplier": 1.14,
      "domesticFxDirection": 0.34,
      "foreignFxDirection": 1,
      "liabilityFxSeriesMultiplier": 0.82,
      "variationStep": 0.035
    },
    "modes": {
      "interest": {
        "assetDirection": 1,
        "liabilityDirection": -1,
        "gapAssetDirection": 0.92,
        "gapLiabilityDirection": -0.68
      },
      "liquidity": {
        "default": {
          "assetDirection": 0.74,
          "wholesaleLiabilityDirection": 0.82,
          "liabilityDirection": -0.42
        },
        "coverage": {
          "assetDirection": -1,
          "wholesaleLiabilityDirection": -0.72,
          "liabilityDirection": 0.9
        },
        "gap": {
          "assetDirection": 0.88,
          "wholesaleLiabilityDirection": 1,
          "liabilityDirection": -0.56
        }
      }
    }
  },
  "tableTemplates": {
    "compact": {
      "classes": [
        "chart-table"
      ]
    },
    "timeSeries": {
      "classes": [
        "chart-table",
        "chart-table--wide"
      ]
    },
    "distribution": {
      "classes": [
        "chart-table",
        "chart-table--wide"
      ]
    },
    "matrix": {
      "classes": [
        "chart-table",
        "chart-table--wide",
        "chart-table--matrix"
      ]
    },
    "businessStructure": {
      "classes": [
        "chart-table",
        "chart-table--wide"
      ]
    },
    "businessDetail": {
      "classes": [
        "chart-table",
        "chart-table--wide",
        "chart-table--matrix"
      ]
    }
  }
};
