window.dashboardDomainConfig = {
  "businessDurationOptions": [
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
  "businessTypeDefaultValues": [
    "自营贷款",
    "投资类业务"
  ],
  "liquidityGapTenorOptions": [
    "1D",
    "7D",
    "30D",
    "3M"
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
    "中央行借款",
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
    "投资类业务": "asset",
    "同业资产": "asset",
    "自营非标投资": "asset",
    "存放央行": "asset",
    "内部交易资产": "asset",
    "活期存款": "liability",
    "定期存款": "liability",
    "同业负债": "liability",
    "发行债券": "liability",
    "中央行借款": "liability",
    "租赁负债": "liability",
    "内部交易负债": "liability",
    "表外衍生品应付": "liability",
    "表外衍生品应收": "asset"
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
      "businessType": "投资类业务",
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
      "businessType": "投资类业务",
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
        "投资类业务",
        "同业资产",
        "自营非标投资",
        "存放央行",
        "内部交易资产"
      ]
    },
    {
      "category": "付息负债",
      "items": [
        "活期存款",
        "定期存款",
        "同业负债",
        "发行债券",
        "中央行借款",
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
      "emptyDescription": "请先在上方“新发生业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看该时间区间内的具体业务。",
      "amountLabel": "本期发生额",
      "dateMode": "range"
    },
    "maturity": {
      "label": "到期业务",
      "emptyTitle": "选择业务类型查看到期业务穿透明细",
      "emptyDescription": "请先在上方“到期业务资产负债结构一览表”中点击某个业务类型的“查看明细”，查看该时间区间内的具体业务。",
      "amountLabel": "到期金额",
      "dateMode": "range"
    }
  }
};
