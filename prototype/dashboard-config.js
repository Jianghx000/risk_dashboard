window.dashboardConfig = {
  "filters": {
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
        "人民币",
        "外币折美元",
        "美元",
        "港元",
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
        "3M"
      ],
      "业务类型": [
        "自营贷款",
        "投资类业务",
        "同业资产",
        "自营非标投资",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "中央行借款",
        "租赁负债",
        "内部交易负债",
        "表外衍生品应付",
        "表外衍生品应收"
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
      ],
      "业务类型": [
        "自营贷款",
        "投资类业务"
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
  "tabs": {
    "重定价久期": [
      {
        "label": "存量",
        "matchViewScope": "存量业务",
        "matchScopeMeta": {
          "tabGroup": "repricingDuration",
          "tabKey": "存量"
        }
      },
      {
        "label": "新发生",
        "matchViewScope": "新发生业务",
        "matchScopeMeta": {
          "tabGroup": "repricingDuration",
          "tabKey": "新发生"
        }
      }
    ]
  },
  "pageBehavior": {
    "利率风险": {
      "simulationMode": "interest"
    },
    "流动性风险": {
      "simulationMode": "liquidity"
    }
  },
  "blockDisplay": {},
  "areaDisplay": {
    "利率风险": {
      "核心风险指标": {
        "最大经济价值变动比例": {
          "mergeViewGroups": true
        },
        "净利息收入波动率": {
          "mergeViewGroups": true
        }
      },
      "缺口风险": {
        "重定价缺口率": {}
      }
    },
    "流动性风险": {
      "核心风险指标": {
        "流动性覆盖率LCR": {
          "mergeViewGroups": true
        }
      }
    }
  },
  "managementLimits": [
    {
      "indicator": "最大经济价值变动比例",
      "matchTitles": [
        "最大经济价值变动比例"
      ],
      "values": {
        "法人汇总": 28,
        "境外分行汇总": 25,
        "境内汇总": 30,
        "纽约分行": 32,
        "新加坡分行": 29,
        "卢森堡分行": 27,
        "伦敦分行": 31,
        "悉尼分行": 26,
        "香港分行": 30
      },
      "widgetSeqs": [
        1
      ]
    },
    {
      "indicator": "净利息收入波动率",
      "matchTitles": [
        "净利息收入波动"
      ],
      "values": {
        "法人汇总": 24,
        "境外分行汇总": 22,
        "境内汇总": 26,
        "纽约分行": 28,
        "新加坡分行": 25,
        "卢森堡分行": 23,
        "伦敦分行": 27,
        "悉尼分行": 24,
        "香港分行": 25
      },
      "widgetSeqs": [
        7
      ]
    },
    {
      "indicator": "重定价缺口率",
      "matchTitles": [
        "重定价缺口率"
      ],
      "values": {
        "法人汇总": 38,
        "境外分行汇总": 34,
        "境内汇总": 40,
        "纽约分行": 42,
        "新加坡分行": 37,
        "卢森堡分行": 35,
        "伦敦分行": 39,
        "悉尼分行": 36,
        "香港分行": 38
      },
      "widgetSeqs": [
        9
      ]
    },
    {
      "indicator": "流动性覆盖率LCR",
      "matchTitles": [
        "流动性覆盖率LCR"
      ],
      "values": {
        "法人汇总": 62,
        "境外分行汇总": 58,
        "境内汇总": 64,
        "纽约分行": 67,
        "新加坡分行": 61,
        "卢森堡分行": 59,
        "伦敦分行": 65,
        "悉尼分行": 60,
        "香港分行": 63
      },
      "widgetSeqs": [
        42
      ]
    },
    {
      "indicator": "净稳定资金比例NSFR",
      "matchTitles": [
        "净稳定资金比例NSFR"
      ],
      "values": {
        "法人汇总": 66,
        "境外分行汇总": 62,
        "境内汇总": 68,
        "纽约分行": 70,
        "新加坡分行": 65,
        "卢森堡分行": 63,
        "伦敦分行": 69,
        "悉尼分行": 64,
        "香港分行": 67
      },
      "widgetSeqs": [
        46
      ]
    },
    {
      "indicator": "流动性缺口",
      "matchTitles": [
        "流动性缺口"
      ],
      "values": {
        "法人汇总": 55,
        "境外分行汇总": 50,
        "境内汇总": 57,
        "纽约分行": 60,
        "新加坡分行": 54,
        "卢森堡分行": 52,
        "伦敦分行": 58,
        "悉尼分行": 53,
        "香港分行": 56
      },
      "widgetSeqs": [
        49
      ]
    }
  ],
  "widgetBehavior": {
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
    "5": {
      "tableKind": "eveCombined"
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
    "8": {
      "tableKind": "niiCurrencyMatrix"
    },
    "9": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "10": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "11": {
      "chartKind": "repricingScaleGap",
      "fullWidth": false,
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "14": {
      "chartKind": "maturityDistribution"
    },
    "21": {
      "chartKind": "durationGapCombo",
      "yAxisLabel": "久期"
    },
    "24": {
      "chartKind": "businessDurationRepricing",
      "fullWidth": false,
      "maxSeries": 12,
      "yAxisLabel": "久期",
      "seriesFilters": {
        "suppress": [
          "机构",
          "币种"
        ]
      }
    },
    "27": {
      "chartKind": "durationGapCombo",
      "fullWidth": false,
      "yAxisLabel": "久期"
    },
    "30": {
      "chartKind": "businessDurationRepricing",
      "fullWidth": false,
      "maxSeries": 12,
      "yAxisLabel": "久期",
      "seriesFilters": {
        "suppress": [
          "机构",
          "币种"
        ]
      }
    },
    "42": {
      "frequencyToggle": true
    },
    "46": {
      "frequencyToggle": true
    },
    "49": {
      "chartKind": "liquidityGapTenor",
      "frequencyToggle": true,
      "simulationBehavior": {
        "directionMode": "gap",
        "sensitivity": 0.16
      },
      "inlineFilters": [
        "期限长度",
        "口径"
      ]
    },
    "54": {
      "chartKind": "futureFundingFlow",
      "fullWidth": true
    },
    "57": {
      "chartKind": "interbankFundingMaxTenor",
      "yAxisLabel": "期限（天）"
    },
    "58": {
      "chartKind": "interbankFundingTenorBucket",
      "yAxisLabel": "规模占比"
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
      "drilldownTargetSeq": 80
    },
    "80": {
      "tableKind": "businessDetail",
      "detailScope": "stock",
      "detailTablePreset": "businessChangeDetail"
    },
    "83": {
      "chartKind": "balanceScaleGrowth"
    },
    "84": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12
    },
    "85": {
      "tableKind": "businessDetail",
      "detailScope": "new",
      "detailTablePreset": "businessChangeDetail"
    },
    "89": {
      "tableKind": "businessStructure",
      "drilldownTargetSeq": 85,
      "inlineFilters": [
        "时间区间（起止）"
      ]
    },
    "90": {
      "chartKind": "balanceScaleGrowth"
    },
    "91": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12
    },
    "96": {
      "tableKind": "businessStructure",
      "drilldownTargetSeq": 97,
      "inlineFilters": [
        "时间区间（起止）"
      ]
    },
    "97": {
      "tableKind": "businessDetail",
      "detailScope": "maturity",
      "detailTablePreset": "businessChangeDetail"
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
    "24": [
      {
        "presetRef": "businessTypeLegend"
      }
    ],
    "30": [
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
      "options": [
        "自营贷款",
        "投资类业务",
        "同业资产",
        "自营非标投资",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "中央行借款",
        "租赁负债",
        "内部交易负债",
        "表外衍生品应付",
        "表外衍生品应收"
      ],
      "defaultValues": [
        "自营贷款",
        "投资类业务"
      ]
    },
    "futureFundingBusinessTypeLegend": {
      "name": "业务类型",
      "renderMode": "legend",
      "multi": true,
      "options": [
        "自营贷款",
        "投资类业务",
        "同业资产",
        "自营非标投资",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "中央行借款",
        "租赁负债",
        "内部交易负债",
        "表外衍生品应付",
        "表外衍生品应收"
      ],
      "defaultValues": [
        "自营贷款",
        "投资类业务",
        "同业资产",
        "自营非标投资",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "中央行借款",
        "租赁负债",
        "内部交易负债",
        "表外衍生品应付",
        "表外衍生品应收"
      ]
    },
    "liquidityTenorLegend": {
      "name": "期限长度",
      "label": "期限",
      "renderMode": "segmented",
      "options": [
        "1D",
        "7D",
        "30D",
        "3M"
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
      "label": "时间区间（起止）",
      "type": "dateRange",
      "defaultValues": [],
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
    "blocks": {},
    "areas": {
      "利率风险/核心风险指标/最大经济价值变动比例": {
        "mergeViewGroups": true,
        "sharedFilterPreset": "orgCurrency"
      },
      "利率风险/核心风险指标/净利息收入波动率": {
        "mergeViewGroups": true,
        "sharedFilterPreset": "orgCurrencyRateScenario"
      },
      "利率风险/缺口风险/重定价缺口率": {
        "sharedFilterPreset": "orgCurrency"
      },
      "流动性风险/核心风险指标/流动性覆盖率LCR": {
        "mergeViewGroups": true,
        "sharedFilterPreset": "orgCurrency"
      }
    },
    "widgets": {
      "4": {
        "fullWidth": false
      },
      "11": {
        "fullWidth": false
      },
      "24": {
        "fullWidth": false
      },
      "27": {
        "fullWidth": false
      },
      "30": {
        "fullWidth": false
      },
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
    "wholesaleLiabilityTypes": [
      "同业负债",
      "发行债券",
      "中央行借款",
      "租赁负债",
      "表外衍生品应付"
    ],
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
  },
  "detailTables": {
    "businessChangeDetail": {
      "columns": [
        {
          "key": "businessId",
          "label": "业务编号"
        },
        {
          "key": "counterparty",
          "label": "客户"
        },
        {
          "key": "businessType",
          "label": "业务类型"
        },
        {
          "key": "sideLabel",
          "label": "资产/负债"
        },
        {
          "key": "startDate",
          "label": "起始日"
        },
        {
          "key": "maturityDate",
          "label": "到期日"
        },
        {
          "key": "repricingDate",
          "label": "下一重定价日"
        },
        {
          "key": "amount",
          "label": "金额/余额"
        },
        {
          "key": "rate",
          "label": "利率"
        },
        {
          "key": "rateType",
          "label": "固浮属性"
        },
        {
          "key": "term",
          "label": "剩余期限"
        }
      ]
    }
  }
};
