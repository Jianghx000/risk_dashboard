window.dashboardDomainConfig = {
  "businessDurationOptions": [
    "自营贷款",
    "投资类资产",
    "同业资产",
    "自营非标投资",
    "内部交易资产",
    "活期存款",
    "定期存款",
    "同业负债",
    "存放央行",
    "发行债券",
    "向央行借款",
    "租赁负债",
    "内部交易负债",
    "表外衍生品应付",
    "表外衍生品应收"
  ],
  "repricingDurationGapBusinessTypes": [
    "自营贷款",
    "投资类资产",
    "同业资产",
    "自营非标投资",
    "内部交易资产",
    "活期存款",
    "定期存款",
    "同业负债",
    "存放央行",
    "发行债券",
    "向央行借款",
    "租赁负债",
    "内部交易负债"
  ],
  "businessTypeDefaultValues": [
    "自营贷款",
    "投资类资产"
  ],
  "liquidityBusinessTypes": [
    "现金",
    "存放央行款项",
    "存放同业",
    "拆放同业",
    "买入返售",
    "各项贷款",
    "债券",
    "股票",
    "其他投资",
    "持有同业存单",
    "其他资产",
    "表外收入",
    "向央行借款",
    "定期存放",
    "活期存放",
    "同业拆入",
    "卖出回购",
    "定期存款",
    "活期存款",
    "发行债券",
    "发行同业存单",
    "其他负债",
    "表外支出"
  ],
  "liquidityBusinessTypeDefaultValues": [
    "现金",
    "定期存款"
  ],
  "liquidityGapTenorOptions": [
    "1D",
    "7D",
    "30D",
    "3M",
    "1Y"
  ],
  "foreignBranchOrganizations": [
    "香港分行",
    "纽约分行",
    "新加坡分行",
    "卢森堡分行",
    "伦敦分行",
    "悉尼分行"
  ],
  "liquidityCashFlowSimulationBuckets": [
    "次日",
    "2日至7日",
    "8日至30日",
    "31日至90日",
    "91日至1年"
  ],
  "rateTypeOptions": [
    "固定利率",
    "浮动利率"
  ],
  "futureMaturityMonthCount": 6,
  "simulationFundingRoleOptions": [
    "资金来源",
    "资金运用"
  ],
  "simulationDefaultBusinessTypes": {
    "资金来源": "定期存款",
    "资金运用": "自营贷款"
  },
  "wholesaleLiabilityTypes": [
    "同业负债",
    "发行债券",
    "向央行借款",
    "租赁负债",
    "表外衍生品应付"
  ],
  "simulationModes": {
    "newBusiness": "newBusiness",
    "hedge": "hedge",
    "netInterestIncome": "netInterestIncome",
    "liquidityStress": "liquidityStress"
  },
  "eveRatioWidgetSeq": 1,
  "eveColors": {
    "primary": "#4289EE",
    "worst": "#C86F43"
  },
  "eveScenarioDefinitions": [
    {
      "key": "parallel-up",
      "name": "平行上移",
      "base": 76,
      "slope": 4.1,
      "wave": 9
    },
    {
      "key": "parallel-down",
      "name": "平行下移",
      "base": 55,
      "slope": 2.6,
      "wave": 6
    },
    {
      "key": "steepener",
      "name": "变陡峭",
      "base": 39,
      "slope": 2.3,
      "wave": 5
    },
    {
      "key": "flattener",
      "name": "变平缓",
      "base": 30,
      "slope": 1.5,
      "wave": 4
    },
    {
      "key": "short-up",
      "name": "短端上升",
      "base": 61,
      "slope": 2.7,
      "wave": 7
    },
    {
      "key": "short-down",
      "name": "短端下降",
      "base": 36,
      "slope": 1.9,
      "wave": 4.5
    }
  ],
  "businessSideMap": {
    "自营贷款": "asset",
    "投资类资产": "asset",
    "同业资产": "asset",
    "自营非标投资": "asset",
    "存放央行": "asset",
    "内部交易资产": "asset",
    "活期存款": "liability",
    "定期存款": "liability",
    "同业负债": "liability",
    "发行债券": "liability",
    "向央行借款": "liability",
    "租赁负债": "liability",
    "内部交易负债": "liability",
    "表外衍生品应付": "liability",
    "表外衍生品应收": "asset"
  },
  "repricingGapBusinessGroups": {
    "assets": [
      { "key": "self-operated-loans", "label": "自营贷款" },
      { "key": "investment-assets", "label": "投资类资产" },
      { "key": "interbank-assets", "label": "同业资产" },
      { "key": "non-standard-investments", "label": "自营非标投资" },
      { "key": "central-bank-deposits", "label": "存放央行" },
      { "key": "internal-transaction-assets", "label": "内部交易资产", "internalTransaction": true }
    ],
    "liabilities": [
      { "key": "term-deposits", "label": "定期存款" },
      { "key": "interbank-liabilities", "label": "同业负债" },
      { "key": "issued-bonds", "label": "发行债券" },
      { "key": "central-bank-borrowings", "label": "向央行借款" },
      { "key": "lease-liabilities", "label": "租赁负债" },
      { "key": "internal-transaction-liabilities", "label": "内部交易负债", "internalTransaction": true }
    ]
  },
  "hedgeableItemOptions": [
    {
      "id": "HT-LOAN-2026-001",
      "type": "贷款",
      "businessType": "自营贷款",
      "org": "香港分行",
      "currency": "美元",
      "balance": 168.5,
      "rateType": "浮动利率",
      "rateBenchmark": "SOFR 3M",
      "couponRate": "4.38%",
      "repricingCycle": "3M",
      "repricingMonths": "3",
      "originalTerm": "5年",
      "remainingTerm": "3.2年",
      "remainingTermMonths": 38,
      "nextRepricingDate": "2026/08/01"
    },
    {
      "id": "HT-BOND-2026-014",
      "type": "债券",
      "businessType": "投资类资产",
      "org": "纽约分行",
      "currency": "美元",
      "balance": 92.8,
      "rateType": "固定利率",
      "rateBenchmark": "UST 5Y",
      "couponRate": "3.75%",
      "ytm": "3.92%",
      "modifiedDuration": "4.6",
      "repricingCycle": "到期一次",
      "repricingMonths": "24",
      "originalTerm": "7年",
      "remainingTerm": "4.6年",
      "remainingTermMonths": 55,
      "nextRepricingDate": "2030/02/15"
    },
    {
      "id": "HT-LOAN-2026-027",
      "type": "贷款",
      "businessType": "自营贷款",
      "org": "新加坡分行",
      "currency": "新加坡元",
      "balance": 74.2,
      "rateType": "浮动利率",
      "rateBenchmark": "SORA 1M",
      "couponRate": "3.18%",
      "repricingCycle": "1M",
      "repricingMonths": "1",
      "originalTerm": "3年",
      "remainingTerm": "1.7年",
      "remainingTermMonths": 20,
      "nextRepricingDate": "2026/07/28"
    },
    {
      "id": "HT-BOND-2026-038",
      "type": "债券",
      "businessType": "投资类资产",
      "org": "卢森堡分行",
      "currency": "欧元",
      "balance": 128.6,
      "rateType": "固定利率",
      "rateBenchmark": "EUR Swap 5Y",
      "couponRate": "2.86%",
      "ytm": "3.04%",
      "modifiedDuration": "5.1",
      "repricingCycle": "到期一次",
      "repricingMonths": "24",
      "originalTerm": "10年",
      "remainingTerm": "5.4年",
      "remainingTermMonths": 65,
      "nextRepricingDate": "2031/01/20"
    }
  ],
  "businessStructureGroups": [
    {
      "category": "生息资产",
      "items": [
        "自营贷款",
        "投资类资产",
        "同业资产",
        "自营非标投资",
        "内部交易资产",
        "存放央行"
      ]
    },
    {
      "category": "付息负债",
      "items": [
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "向央行借款",
        "租赁负债",
        "内部交易负债"
      ]
    },
    {
      "category": "表外衍生品",
      "items": [
        "表外衍生品应付",
        "表外衍生品应收"
      ]
    }
  ],
  "repricingGapSimulationDerivativeTypes": [
    "银行账簿表外衍生品应收",
    "银行账簿表外衍生品应付",
    "交易账簿表外衍生品应收",
    "交易账簿表外衍生品应付"
  ],
  "repricingGapSimulationDerivativeSideMap": {
    "银行账簿表外衍生品应收": "asset",
    "银行账簿表外衍生品应付": "liability",
    "交易账簿表外衍生品应收": "asset",
    "交易账簿表外衍生品应付": "liability"
  },
  "businessAnalysisPerspectives": {
    "interestBalanceStructure": {
      "label": "利率风险",
      "businessTypesRef": "businessDurationOptions",
      "defaultBusinessTypesRef": "businessTypeDefaultValues",
      "groupsRef": "businessStructureGroups",
      "sideMapRef": "businessSideMap",
      "totalCategories": [
        "生息资产",
        "付息负债"
      ],
      "balanceMetricLabels": [
        "资产规模",
        "负债规模",
        "资产增速",
        "负债增速"
      ],
      "structureMetricColumnsByScope": {
        "stock": [
          { "key": "scale", "label": "规模" },
          { "key": "fixedRate", "label": "固息占比" },
          { "key": "duration", "label": "加权久期" },
          { "key": "averageRemainingTerm", "label": "平均剩余期限" },
          { "key": "averageRate", "label": "平均利率" }
        ],
        "new": [
          { "key": "scale", "label": "规模" },
          { "key": "fixedRate", "label": "固息占比" },
          { "key": "duration", "label": "加权久期" },
          { "key": "averageOriginalTerm", "label": "平均原始期限" },
          { "key": "averageRate", "label": "平均利率" }
        ],
        "maturity": [
          { "key": "scale", "label": "规模" },
          { "key": "fixedRate", "label": "固息占比" },
          { "key": "duration", "label": "加权久期" },
          { "key": "averageRemainingTerm", "label": "平均剩余期限" },
          { "key": "averageRate", "label": "平均利率" }
        ]
      },
      "detailColumnsByScope": {
        "stock": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "startDate", "label": "起始日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "amount", "label": "余额" },
          { "key": "rate", "label": "利率" },
          { "key": "rateType", "label": "利率类型" },
          { "key": "rateBenchmark", "label": "利率基准" },
          { "key": "spread", "label": "利差" },
          { "key": "originalTerm", "label": "原始期限" },
          { "key": "remainingTerm", "label": "剩余期限" },
          { "key": "repricingCycle", "label": "重定价周期" },
          { "key": "repricingDate", "label": "下一重定价日" },
          { "key": "repricingDuration", "label": "重定价久期" }
        ],
        "new": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "statMonth", "label": "发生月份" },
          { "key": "startDate", "label": "起始日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "amount", "label": "新发生金额" },
          { "key": "rate", "label": "利率" },
          { "key": "rateType", "label": "利率类型" },
          { "key": "rateBenchmark", "label": "利率基准" },
          { "key": "spread", "label": "利差" },
          { "key": "originalTerm", "label": "原始期限" },
          { "key": "repricingCycle", "label": "重定价周期" },
          { "key": "repricingDate", "label": "下一重定价日" },
          { "key": "repricingDuration", "label": "重定价久期" }
        ],
        "maturity": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "statMonth", "label": "到期月份" },
          { "key": "maturityDate", "label": "到期日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "amount", "label": "到期金额" },
          { "key": "priorRate", "label": "到期前利率" },
          { "key": "rateType", "label": "利率类型" },
          { "key": "rateBenchmark", "label": "利率基准" },
          { "key": "spread", "label": "利差" },
          { "key": "remainingTerm", "label": "剩余期限" },
          { "key": "repricingCycle", "label": "重定价周期" },
          { "key": "repricingDuration", "label": "重定价久期" }
        ]
      }
    },
    "liquidityBalanceStructure": {
      "label": "流动性风险",
      "businessTypesRef": "liquidityBusinessTypes",
      "defaultBusinessTypesRef": "liquidityBusinessTypeDefaultValues",
      "groups": [
        {
          "category": "资产",
          "items": [
            "现金",
            "存放央行款项",
            "存放同业",
            "拆放同业",
            "买入返售",
            "各项贷款",
            "债券",
            "股票",
            "其他投资",
            "持有同业存单",
            "其他资产"
          ]
        },
        {
          "category": "表外收入",
          "items": [
            "表外收入"
          ]
        },
        {
          "category": "负债",
          "items": [
            "向央行借款",
            "定期存放",
            "活期存放",
            "同业拆入",
            "卖出回购",
            "定期存款",
            "活期存款",
            "发行债券",
            "发行同业存单",
            "其他负债"
          ]
        },
        {
          "category": "表外支出",
          "items": [
            "表外支出"
          ]
        }
      ],
      "sideMap": {
        "现金": "asset",
        "存放央行款项": "asset",
        "存放同业": "asset",
        "拆放同业": "asset",
        "买入返售": "asset",
        "各项贷款": "asset",
        "债券": "asset",
        "股票": "asset",
        "其他投资": "asset",
        "持有同业存单": "asset",
        "其他资产": "asset",
        "表外收入": "offBalanceInflow",
        "向央行借款": "liability",
        "定期存放": "liability",
        "活期存放": "liability",
        "同业拆入": "liability",
        "卖出回购": "liability",
        "定期存款": "liability",
        "活期存款": "liability",
        "发行债券": "liability",
        "发行同业存单": "liability",
        "其他负债": "liability",
        "表外支出": "offBalanceOutflow"
      },
      "sideLabels": {
        "asset": "资产",
        "liability": "负债",
        "offBalanceInflow": "表外收入",
        "offBalanceOutflow": "表外支出"
      },
      "totalCategories": [
        "资产",
        "负债"
      ],
      "totalRowLabels": {
        "资产": "资产合计",
        "负债": "负债合计"
      },
      "balanceMetricLabels": [
        "总资产规模",
        "总负债规模",
        "总资产增速",
        "总负债增速"
      ],
      "cashFlowDirectionMap": {
        "现金": "inflow",
        "存放央行款项": "inflow",
        "存放同业": "inflow",
        "拆放同业": "inflow",
        "买入返售": "inflow",
        "各项贷款": "inflow",
        "债券": "inflow",
        "股票": "inflow",
        "其他投资": "inflow",
        "持有同业存单": "inflow",
        "其他资产": "inflow",
        "表外收入": "inflow",
        "向央行借款": "outflow",
        "定期存放": "outflow",
        "活期存放": "outflow",
        "同业拆入": "outflow",
        "卖出回购": "outflow",
        "定期存款": "outflow",
        "活期存款": "outflow",
        "发行债券": "outflow",
        "发行同业存单": "outflow",
        "其他负债": "outflow",
        "表外支出": "outflow"
      },
      "structureMetricColumnsByScope": {
        "stock": [
          { "key": "scale", "label": "规模" },
          { "key": "averageRate", "label": "平均利率" },
          { "key": "averageOriginalTerm", "label": "平均原始期限" },
          { "key": "averageRemainingTerm", "label": "平均剩余期限" }
        ],
        "new": [
          { "key": "scale", "label": "规模" },
          { "key": "averageRate", "label": "平均利率" },
          { "key": "averageOriginalTerm", "label": "平均原始期限" }
        ],
        "maturity": [
          { "key": "scale", "label": "规模" },
          { "key": "averageRate", "label": "平均利率" },
          { "key": "averageRemainingTerm", "label": "平均剩余期限" }
        ]
      },
      "detailColumnsByScope": {
        "stock": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "startDate", "label": "起始日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "currency", "label": "币种" },
          { "key": "amount", "label": "余额" },
          { "key": "rate", "label": "利率" },
          { "key": "originalTerm", "label": "原始期限" },
          { "key": "remainingTerm", "label": "剩余期限" }
        ],
        "new": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "statMonth", "label": "发生月份" },
          { "key": "startDate", "label": "起始日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "currency", "label": "币种" },
          { "key": "amount", "label": "新发生金额" },
          { "key": "rate", "label": "利率" },
          { "key": "originalTerm", "label": "原始期限" }
        ],
        "maturity": [
          { "key": "businessId", "label": "业务编号" },
          { "key": "counterparty", "label": "客户" },
          { "key": "statMonth", "label": "到期月份" },
          { "key": "maturityDate", "label": "到期日" },
          { "key": "contractMaturityDate", "label": "合同到期日" },
          { "key": "currency", "label": "币种" },
          { "key": "amount", "label": "到期金额" },
          { "key": "rate", "label": "利率" },
          { "key": "remainingTerm", "label": "剩余期限" }
        ]
      },
      "widgetTitles": {
        "72": "总资产与总负债规模及增速",
        "73": "分业务类别规模及增速",
        "79": "流动性风险业务结构一览表",
        "83": "新发生总资产与总负债规模及增速",
        "84": "分业务类别新发生规模及增速",
        "89": "新发生流动性风险业务结构一览表",
        "90": "到期总资产与总负债规模及增速",
        "91": "分业务类别到期规模及增速",
        "96": "到期流动性风险业务结构一览表"
      }
    }
  },
  "businessChangeMethodology": {
    "newMonthly": {
      "title": "新发生业务月末轧差计算逻辑",
      "logic": "基于本月末与上月末两个时点的业务编号明细数据进行轧差，计算当月新发生业务。"
    },
    "maturityMonthly": {
      "title": "到期业务月末轧差计算逻辑",
      "logic": "基于本月末与上月末两个时点的业务编号明细数据进行轧差，计算当月到期业务。"
    }
  },
  "businessDetailScopeMeta": {
    "stock": {
      "label": "存量业务",
      "emptyTitle": "选择业务类型查看存量业务穿透明细",
      "emptyDescription": "请先在上方“资产负债结构一览表”中点击某个业务类型的“查看明细”，定位到具体业务。",
      "amountLabel": "余额",
      "dateMode": "snapshot"
    },
    "new": {
      "label": "新发生业务",
      "emptyTitle": "选择业务类型查看新发生业务穿透明细",
      "emptyDescription": "请先在上方“新发生业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看所选时间范围内各月月末轧差形成的具体业务。",
      "amountLabel": "本期发生额",
      "dateMode": "range"
    },
    "maturity": {
      "label": "到期业务",
      "emptyTitle": "选择业务类型查看到期业务穿透明细",
      "emptyDescription": "请先在上方“到期业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看所选时间范围内各月月末轧差形成的历史到期业务，或基于月末存量推演的未来合同到期业务。",
      "amountLabel": "到期金额",
      "dateMode": "range"
    }
  }
};
