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
        "1日",
        "7日",
        "30日",
        "90日"
      ],
      "业务类型": [
        "自营贷款",
        "债券投资",
        "同业资产",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "内部交易负债",
        "表外衍生品应收",
        "表外衍生品应付"
      ],
      "贷款类型": [
        "整体对公贷款",
        "个人住房贷款",
        "个人非住房贷款"
      ],
      "存款类型": [
        "对公定期存款",
        "储蓄定期存款"
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
      "分行个性化监管指标": {
        "机构": [
          "香港分行",
          "纽约分行",
          "新加坡分行",
          "卢森堡分行",
          "悉尼分行"
        ]
      },
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
      "贷款类型": [
        "整体对公贷款",
        "个人住房贷款",
        "个人非住房贷款"
      ],
      "存款类型": [
        "对公定期存款",
        "储蓄定期存款"
      ],
      "业务类型": [
        "自营贷款",
        "债券投资"
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
      ],
      "loanType": [
        "贷款类型"
      ],
      "depositType": [
        "存款类型"
      ],
      "none": []
    }
  },
  "tabs": {
    "重定价缺口率": [
      {
        "label": "月日均口径",
        "matchViewScope": "月日均口径",
        "matchScopeMeta": {
          "tabGroup": "repricingGapCaliber",
          "tabKey": "月日均口径"
        }
      },
      {
        "label": "时点口径",
        "matchViewScope": "时点口径",
        "matchScopeMeta": {
          "tabGroup": "repricingGapCaliber",
          "tabKey": "时点口径"
        }
      }
    ],
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
    ],
    "分行个性化监管指标": [
      {
        "label": "香港分行",
        "matchViewScope": "香港分行",
        "matchScopeMeta": {
          "tabGroup": "branchLocalRegulation",
          "tabKey": "香港分行"
        },
        "matchInstitutions": [
          "香港分行"
        ]
      },
      {
        "label": "纽约分行",
        "matchViewScope": "纽约分行",
        "matchScopeMeta": {
          "tabGroup": "branchLocalRegulation",
          "tabKey": "纽约分行"
        },
        "matchInstitutions": [
          "纽约分行"
        ]
      },
      {
        "label": "新加坡分行",
        "matchViewScope": "新加坡分行",
        "matchScopeMeta": {
          "tabGroup": "branchLocalRegulation",
          "tabKey": "新加坡分行"
        },
        "matchInstitutions": [
          "新加坡分行"
        ]
      },
      {
        "label": "卢森堡分行",
        "matchViewScope": "卢森堡分行",
        "matchScopeMeta": {
          "tabGroup": "branchLocalRegulation",
          "tabKey": "卢森堡分行"
        },
        "matchInstitutions": [
          "卢森堡分行"
        ]
      },
      {
        "label": "悉尼分行",
        "matchViewScope": "悉尼分行",
        "matchScopeMeta": {
          "tabGroup": "branchLocalRegulation",
          "tabKey": "悉尼分行"
        },
        "matchInstitutions": [
          "悉尼分行"
        ]
      }
    ]
  },
  "pageBehavior": {
    "利率风险": {
      "simulationMode": "interest"
    },
    "流动性风险": {
      "simulationMode": "liquidity"
    },
    "汇率风险": {
      "simulationMode": "fx"
    }
  },
  "blockDisplay": {
    "利率风险": {
      "期权性风险（境内分行）": {
        "pairAreas": true
      }
    }
  },
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
        "重定价缺口率": {
          "pinnedViewScopeIncludes": [
            "时点口径 / 时点",
            "/ 时点"
          ]
        }
      }
    },
    "流动性风险": {
      "核心风险指标": {
        "流动性覆盖率LCR": {
          "mergeViewGroups": true
        }
      },
      "资金备付": {
        "超额备付金": {
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
        "净利息收入波动及波动率"
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
      "indicator": "流动性维持比率（LMR）",
      "matchTitles": [
        "流动性维持比率（LMR）"
      ],
      "values": {
        "香港分行": 25
      },
      "widgetSeqs": [
        57
      ]
    },
    {
      "indicator": "核心资金比率（CFR）",
      "matchTitles": [
        "核心资金比率（CFR）"
      ],
      "values": {
        "香港分行": 100
      },
      "widgetSeqs": [
        58
      ]
    },
    {
      "indicator": "法定准备金",
      "matchTitles": [
        "法定准备金"
      ],
      "values": {
        "纽约分行": 0
      },
      "widgetSeqs": [
        59
      ]
    },
    {
      "indicator": "最低流动资产（MLA）",
      "matchTitles": [
        "最低流动资产（MLA）"
      ],
      "values": {
        "新加坡分行": 16
      },
      "widgetSeqs": [
        60
      ]
    },
    {
      "indicator": "本地口径流动性覆盖率（LCR）",
      "matchTitles": [
        "本地口径流动性覆盖率（LCR）"
      ],
      "values": {
        "卢森堡分行": 100,
        "悉尼分行": 100
      },
      "widgetSeqs": [
        61,
        62
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
      "indicator": "30日流动性缺口规模",
      "matchTitles": [
        "30日流动性缺口规模"
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
        50
      ]
    }
  ],
  "widgetBehavior": {
    "1": {
      "simulationBehavior": {
        "sensitivity": 0.14
      }
    },
    "3": {
      "simulationBehavior": {
        "sensitivity": 0.11
      },
      "seriesFilters": {
        "suppress": [
          "币种"
        ]
      }
    },
    "4": {
      "fullWidth": false,
      "simulationBehavior": {
        "sensitivity": 0.14
      },
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
      "simulationBehavior": {
        "sensitivity": 0.15
      },
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
      "fullWidth": true,
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "13": {
      "chartKind": "donut",
      "defaultTableDimension": "币种"
    },
    "14": {
      "chartKind": "maturityDistribution"
    },
    "15": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "16": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "17": {
      "chartKind": "repricingScaleGap",
      "fullWidth": true,
      "frequencyToggle": true,
      "simulationBehavior": {
        "sensitivity": 0.16
      }
    },
    "21": {
      "chartKind": "durationGapCombo",
      "yAxisLabel": "久期",
      "simulationBehavior": {
        "sensitivity": 0.18
      }
    },
    "24": {
      "chartKind": "businessDurationRepricing",
      "fullWidth": false,
      "maxSeries": 12,
      "yAxisLabel": "久期",
      "simulationBehavior": {
        "sensitivity": 0.18
      },
      "seriesFilters": {
        "suppress": [
          "机构",
          "币种"
        ]
      }
    },
    "25": {
      "chartKind": "bondModifiedDuration",
      "fullWidth": false,
      "yAxisLabel": "久期",
      "simulationBehavior": {
        "sensitivity": 0.18
      },
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
      "yAxisLabel": "久期",
      "simulationBehavior": {
        "sensitivity": 0.18
      }
    },
    "30": {
      "chartKind": "businessDurationRepricing",
      "fullWidth": false,
      "maxSeries": 12,
      "yAxisLabel": "久期",
      "simulationBehavior": {
        "sensitivity": 0.18
      },
      "seriesFilters": {
        "suppress": [
          "机构",
          "币种"
        ]
      }
    },
    "34": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "35": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "37": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "38": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "42": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "directionMode": "coverage",
        "sensitivity": 0.11
      }
    },
    "43": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "44": {
      "frequencyToggle": true,
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "45": {
      "chartKind": "donut",
      "defaultTableDimension": "一级资产",
      "distributionLabels": [
        "一级资产",
        "二级资产"
      ]
    },
    "46": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "47": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "48": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "49": {
      "chartKind": "liquidityGapTenor",
      "simulationBehavior": {
        "directionMode": "gap",
        "sensitivity": 0.16
      },
      "inlineFilters": [
        "期限长度"
      ]
    },
    "50": {
      "chartKind": "thirtyDayLiquidityGap",
      "simulationBehavior": {
        "directionMode": "gap",
        "sensitivity": 0.16
      },
      "inlineFilters": [
        "口径"
      ]
    },
    "52": {
      "chartKind": "reserveRatioScaleCombo",
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "53": {
      "chartKind": "donut",
      "defaultTableDimension": "备付金类别",
      "distributionLabels": [
        "超额存款准备金",
        "库存现金"
      ]
    },
    "54": {
      "chartKind": "futureFundingFlow",
      "fullWidth": true,
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "55": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "56": {
      "chartKind": "liquidityAssetLiabilityBars",
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "57": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "58": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "59": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "60": {
      "simulationBehavior": {
        "directionMode": "default",
        "sensitivity": 0.11
      }
    },
    "61": {
      "simulationBehavior": {
        "directionMode": "coverage",
        "sensitivity": 0.11
      }
    },
    "62": {
      "simulationBehavior": {
        "directionMode": "coverage",
        "sensitivity": 0.11
      }
    },
    "68": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "69": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "71": {
      "simulationBehavior": {
        "sensitivity": 0.11
      }
    },
    "72": {
      "chartKind": "balanceScaleGrowth"
    },
    "73": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12
    },
    "79": {
      "tableKind": "businessStructure"
    },
    "83": {
      "chartKind": "balanceScaleGrowth"
    },
    "84": {
      "chartKind": "businessScaleGrowth",
      "maxSeries": 12
    },
    "89": {
      "tableKind": "businessStructure",
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
      "inlineFilters": [
        "时间区间（起止）"
      ]
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
    "35": [
      {
        "presetRef": "benchmarkSelector"
      }
    ],
    "36": [
      {
        "presetRef": "durationDimensionSelector"
      }
    ],
    "49": [
      {
        "presetRef": "liquidityTenorLegend"
      }
    ],
    "50": [
      {
        "presetRef": "caliberSelector"
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
        "债券投资",
        "同业资产",
        "存放央行",
        "内部交易资产",
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "内部交易负债",
        "表外衍生品应收",
        "表外衍生品应付"
      ],
      "defaultValues": [
        "自营贷款",
        "债券投资"
      ]
    },
    "benchmarkSelector": {
      "name": "利率基准",
      "label": "利率基准",
      "options": [
        "DR007",
        "LPR 1Y",
        "LPR 5Y",
        "HIBOR",
        "备付金利率",
        "贷款基准利率",
        "活期存款利率",
        "其他资产利率",
        "通知存款利率",
        "准备金利率",
        "LIBOR",
        "PRIME RATE",
        "SOFR",
        "TERM SOFR",
        "ESTR",
        "EURIBOR"
      ],
      "defaultValues": [
        "DR007"
      ],
      "multi": false
    },
    "durationDimensionSelector": {
      "name": "维度",
      "label": "维度",
      "options": [
        "资产端",
        "负债端",
        "资产负债差值"
      ],
      "defaultValues": [
        "资产端"
      ],
      "multi": false
    },
    "liquidityTenorLegend": {
      "name": "期限长度",
      "label": "期限长度",
      "options": [
        "1日",
        "7日",
        "90日"
      ],
      "defaultValues": [
        "1日",
        "7日",
        "90日"
      ],
      "multi": true
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
    "blocks": {
      "利率风险/期权性风险（境内分行）": {
        "pairAreas": true
      }
    },
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
        "pinnedViewScopeIncludes": [
          "时点口径 / 时点",
          "/ 时点"
        ],
        "sharedFilterPreset": "orgCurrency"
      },
      "流动性风险/核心风险指标/流动性覆盖率LCR": {
        "mergeViewGroups": true,
        "sharedFilterPreset": "orgCurrency"
      },
      "流动性风险/资金备付/超额备付金": {
        "mergeViewGroups": true,
        "sharedFilterPreset": "orgOnly"
      },
      "流动性风险/分行个性化监管指标/分行个性化监管指标": {
        "sharedFilterPreset": "orgOnly"
      }
    },
    "widgets": {
      "4": {
        "fullWidth": false
      },
      "11": {
        "fullWidth": true
      },
      "17": {
        "fullWidth": true
      },
      "24": {
        "fullWidth": false
      },
      "25": {
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
      },
      "fx": {}
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
    }
  }
};
