window.dashboardData = {
  "generatedAt": "2026-07-08 curated",
  "workbook": "风险管理驾驶舱（无图版）.xlsx",
  "pageCount": 3,
  "widgetCount": 30,
  "pages": [
    {
      "id": "interest-risk",
      "name": "利率风险",
      "blocks": [
        {
          "id": "interest-risk-main",
          "name": "利率风险",
          "areas": [
            {
              "id": "area-1",
              "name": "最大经济价值变动比例",
              "viewScope": "时间序列（月频）",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 1,
                  "title": "最大经济价值变动比例（△EVE ）走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：通过筛选机构和币种，展示所选择的机构和币种的最大经济价值变动比例的走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：EVE变动额/EVE变动比例",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行1"
                },
                {
                  "seq": 3,
                  "title": "本外币合计一级资本净额",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：与上述所选择的机构一致，展示所选择的机构的一级资本净额（最大经济价值变动比例△EVE 分母）的走势（不区分币种）。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。开发补充：本图标题已明确为本外币合计口径，若页面仍保留币种公共筛选器，则本图不按币种拆分取数。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：筛选器保留，默认全选，不影响本图取数",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：EVE变动额/EVE变动比例",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器；币种筛选器保留但不影响取数，只作为区域内统一交互",
                  "devNote": "组件：折线图；标题需显式体现“本外币合计”",
                  "originPosition": "原始行3",
                  "renderRole": "sourceOnly"
                },
                {
                  "seq": 4,
                  "title": "利率变动情景下经济价值变动",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：与上述所筛选的机构和币种一致，展示所选择的机构和币种在6种不同监管情景（平行上移、下移、变陡峭、变平缓、短端上升、短端下降）下的经济价值变动的走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：EVE变动额/EVE变动比例",
                  "legendDescription": "图例：利率情景",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行4",
                  "layout": "full",
                  "renderRole": "sourceOnly"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            },
            {
              "id": "area-7",
              "name": "净利息收入波动率",
              "viewScope": "时间序列（月频）",
              "sharedFilters": [
                "机构",
                "币种",
                "利率情景"
              ],
              "widgets": [
                {
                  "seq": 7,
                  "title": "净利息收入波动走势",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构；币种；利率情景。联动规则：同一第三层区域下的所有图表/表格共用机构、币种、利率情景三个筛选器。展示口径：时间序列（月频）。原始要求：先筛选机构和币种，然后再选择不同的利率情景（所有利率平行上移200bp、活期利率不变但其他利率平行上移200bp），展示所选择的机构和币种在不同利率情景下的净利息收入波动及波动率走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；情景：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], scenario_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：NII波动额/NII波动率",
                  "legendDescription": "图例：情景",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器；情景多选时按固定顺序展示",
                  "devNote": "组件：双轴柱线组合图",
                  "originPosition": "原始行7"
                }
              ],
              "filterPreset": "orgCurrencyRateScenario",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            },
            {
              "id": "area-9",
              "name": "重定价缺口率",
              "viewScope": "时点口径 / 月频 / 日频",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 9,
                  "title": "重定价缺口率",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 月频 / 日频。原始要求：通过筛选机构、币种（二者均支持多选），展示所选择的机构在所选币种口径下的时点重定价缺口率走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行9"
                },
                {
                  "seq": 14,
                  "title": "分业务重定价期限分布",
                  "componentType": "期限分布图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 时点。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选择的单个币种下，不同业务（贷款、债券、存款等）在未来不同时间窗口的到期规模。开发细化：按当前图表名称对应的可视化组件实现。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：时间/维度项（按口径确定）",
                  "metricDescription": "指标：规模",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图；建议支持tooltip同步查看",
                  "originPosition": "原始行14"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot",
                "timeMode": "frequencyToggle",
                "tabGroup": "repricingGapCaliber",
                "tabKey": "时点口径"
              }
            },
            {
              "id": "area-20",
              "name": "重定价久期",
              "groupKey": "repricing-duration",
              "viewScope": "存量业务 / 时间序列（月频）",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 21,
                  "title": "资产/负债重定价久期与差值",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构；币种。联动规则：当前子页面下图表/表格共用机构、币种筛选器。展示口径：存量业务。原始要求：在同一张图中展示所选机构与币种口径下资产和负债的重定价久期，并同步展示二者差值。开发细化：采用柱线组合图实现，柱状图展示资产端和负债端重定价久期，折线展示久期差值，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：资产端重定价久期/负债端重定价久期/久期差值",
                  "legendDescription": "图例：资产端重定价久期、负债端重定价久期、久期差值",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "当前子页面下图表/表格共用机构、币种筛选器",
                  "devNote": "组件：双轴柱线组合图",
                  "originPosition": "原始行21"
                },
                {
                  "seq": 24,
                  "title": "分业务重定价久期",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种；业务类型。联动规则：当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例多选控制。展示口径：存量业务。原始要求：展示不同业务分类的重定价久期走势图。开发细化：按业务类型拆线，切换机构、币种后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；业务类型：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], business_types[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：分业务重定价久期",
                  "legendDescription": "图例：业务类型",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例筛选",
                  "devNote": "组件：折线图；按业务类型拆线展示",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly",
                "tabGroup": "repricingDuration",
                "tabKey": "存量"
              }
            },
            {
              "id": "area-26",
              "name": "重定价久期",
              "groupKey": "repricing-duration",
              "viewScope": "新发生业务 / 时间序列（月频）",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 27,
                  "title": "资产/负债重定价久期与差值",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构；币种。联动规则：当前子页面下图表/表格共用机构、币种筛选器。展示口径：新发生业务。原始要求：在同一张图中展示所选机构与币种口径下新发生业务的资产和负债重定价久期，并同步展示二者差值。开发细化：采用柱线组合图实现，柱状图展示资产端和负债端重定价久期，折线展示久期差值，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：资产端重定价久期/负债端重定价久期/久期差值",
                  "legendDescription": "图例：资产端重定价久期、负债端重定价久期、久期差值",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "当前子页面下图表/表格共用机构、币种筛选器",
                  "devNote": "组件：双轴柱线组合图",
                  "originPosition": "原始行27"
                },
                {
                  "seq": 30,
                  "title": "分业务重定价久期",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种；业务类型。联动规则：当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例多选控制。展示口径：新发生业务。原始要求：展示不同业务分类的新发生业务重定价久期走势图。开发细化：按业务类型拆线，切换机构、币种后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；业务类型：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], business_types[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：分业务重定价久期",
                  "legendDescription": "图例：业务类型",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例筛选",
                  "devNote": "组件：折线图；按业务类型拆线展示"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly",
                "tabGroup": "repricingDuration",
                "tabKey": "新发生"
              }
            },
            {
              "id": "area-interest-portfolio-duration",
              "name": "债券修正久期",
              "viewScope": "存量业务 / 限额监测",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 60,
                  "title": "债券修正久期",
                  "componentType": "限额折线图",
                  "displayDescription": "筛选项：机构；币种。展示所选机构、币种口径下债券修正久期走势，指标为限额指标。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：债券修正久期、限额",
                  "legendDescription": "图例：机构/币种组合",
                  "responseFields": "date_or_dimension_label, metric_value, limit_value, series_name",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：限额折线图；折线表示债券修正久期，虚线表示限额"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            },
            {
              "id": "area-investment-financing-bond-investment",
              "name": "债券投资",
              "viewScope": "限额监测",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 59,
                  "title": "债券投资规模",
                  "componentType": "限额双柱时序图",
                  "displayDescription": "筛选项：机构；币种。按时间序列展示所选机构、币种口径下债券投资规模和非金融企业债投资规模，两个指标均为限额指标。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：债券投资规模、非金融企业债投资规模、限额",
                  "legendDescription": "图例：债券投资规模、非金融企业债投资规模、限额",
                  "responseFields": "org_id, currency_code, bond_investment_scale, non_financial_corporate_bond_scale, limit_value",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：双柱限额时序图；两种颜色柱子分别表示债券投资规模和非金融企业债投资规模，叠加限额线"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend"
              }
            }
          ],
          "areaCount": 7,
          "widgetCount": 12
        }
      ],
      "blockCount": 1,
      "areaCount": 7,
      "widgetCount": 12
    },
    {
      "id": "liquidity-risk",
      "name": "流动性风险",
      "blocks": [
        {
          "id": "liquidity-risk-main",
          "name": "流动性风险",
          "areas": [
            {
              "id": "area-42",
              "name": "流动性覆盖率LCR",
              "viewScope": "月频 / 日频 / 分币种",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 42,
                  "title": "流动性覆盖率LCR走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月频 / 日频 / 分币种。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选机构不同币种的LCR走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：LCR",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行42"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle",
                "breakdownMode": "currency"
              }
            },
            {
              "id": "area-46",
              "name": "净稳定资金比率NSFR",
              "viewScope": "月频 / 日频",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 46,
                  "title": "净稳定资金比例NSFR走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：月频 / 日频。原始要求：通过筛选机构（境内或法人）和币种，展示所选机构和币种下的净稳定资金比例NSFR走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：按图表标题定义",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行46"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle"
              }
            },
            {
              "id": "area-49",
              "name": "流动性缺口",
              "groupKey": "liquidity-gap-and-funding-flow",
              "viewScope": "月频 / 日频",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 49,
                  "title": "流动性缺口",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种；期限长度（1D/7D/30D/3M）；统计口径（仅30D生效，默认时点）。联动规则：同一第三层区域下的图表共用机构、币种、期限长度、统计口径筛选器。展示口径：月频 / 日频。开发细化：合并原流动性缺口（1D/7D/3M）和30日流动性缺口规模，采用柱状图+折线图实现，柱子表示流动性缺口规模，折线表示流动性缺口率，30D支持时点/月日均切换，1D/7D/3M不展示月日均口径。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；期限：默认30D；口径：默认时点",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], caliber_code, stat_caliber_codes[], tenor_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行49、50合并"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle"
              }
            },
            {
              "id": "area-51",
              "name": "流动性缺口",
              "groupKey": "liquidity-gap-and-funding-flow",
              "viewScope": "时点",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 54,
                  "title": "未来逐日资金流",
                  "componentType": "堆叠柱线组合图",
                  "displayDescription": "筛选项：机构；币种；业务类型。联动规则：同一第三层区域下的图表共用机构、币种筛选器，业务类型通过图例筛选。展示口径：未来30天逐日。开发细化：参考分业务重定价期限分布图，以业务类型堆叠柱展示未来逐日资金流分布，并叠加当日净额、累计净额两条折线；数据页签展示对应业务明细。",
                  "grain": "日度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计日期",
                  "metricDescription": "指标：分业务资金流规模、当日净额、累计净额",
                  "legendDescription": "图例：业务类型；折线：当日净额、累计净额",
                  "responseFields": "date, business_type, business_id, counterparty, direction, amount, daily_net, cumulative_net",
                  "linkageRule": "同一第三层区域下图表和明细数据共用本区域筛选器，业务类型图例控制堆叠柱展示范围",
                  "devNote": "组件：堆叠柱线组合图；柱表示分业务资金流规模，两条线表示当日净额和累计净额，数据页展示业务明细",
                  "originPosition": "新增"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            },
            {
              "id": "area-investment-financing-funding-inflow",
              "name": "资金融入",
              "viewScope": "限额监测",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 57,
                  "title": "同业融入最长期限",
                  "componentType": "限额折线图",
                  "displayDescription": "筛选项：机构；币种。展示各机构、各币种的最长同业融入期限，指标为限额指标。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：同业融入最长期限、限额",
                  "legendDescription": "图例：机构/币种组合",
                  "responseFields": "date_or_dimension_label, metric_value, limit_value, series_name",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：限额折线图；折线表示最长期限，虚线表示限额"
                },
                {
                  "seq": 58,
                  "title": "同业融入期限结构",
                  "componentType": "柱状图",
                  "displayDescription": "筛选项：机构；币种。按原始期限 bucket 展示不同期限的同业融入规模占比。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：原始期限 bucket",
                  "metricDescription": "指标：同业融入规模占比",
                  "legendDescription": "图例：期限 bucket",
                  "responseFields": "tenor_bucket, scale_ratio",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：柱状图；展示原始期限 bucket 的规模占比"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            }
          ],
          "areaCount": 5,
          "widgetCount": 6
        }
      ],
      "blockCount": 1,
      "areaCount": 5,
      "widgetCount": 6
    },
    {
      "id": "business-change",
      "name": "业务变动分析",
      "blocks": [
        {
          "id": "business-change-main",
          "name": "业务变动分析",
          "areas": [
            {
              "id": "area-stock",
              "name": "存量业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 72,
                  "title": "资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 73,
                  "title": "分业务规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 79,
                  "title": "资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "",
                  "grain": "时点快照",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 80,
                  "title": "存量业务明细清单",
                  "componentType": "琛ㄦ牸",
                  "displayDescription": "",
                  "grain": "鏄庣粏",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "mergeMode": "areaMerged"
              }
            },
            {
              "id": "area-new",
              "name": "新发生业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 83,
                  "title": "新发生资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 84,
                  "title": "分业务新发生规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 89,
                  "title": "新发生业务资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "",
                  "grain": "时间区间",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 85,
                  "title": "新发生业务明细清单",
                  "componentType": "琛ㄦ牸",
                  "displayDescription": "",
                  "grain": "鏄庣粏",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "mergeMode": "areaMerged"
              }
            },
            {
              "id": "area-maturity",
              "name": "到期业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 90,
                  "title": "到期资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "展示历史实际到期以及按合同约定推演的未来到期，未来日期段需与历史日期段有明显区分。",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 91,
                  "title": "分业务到期规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "按业务类型展示历史实际到期以及按合同约定推演的未来到期，未来日期段需与历史日期段有明显区分。",
                  "grain": "月度",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 96,
                  "title": "到期业务资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "在标题旁提供历史实际到期、未来合同到期两个并列页签；历史页仅选择历史日期，未来页仅选择未来日期，避免历史/未来区间混用。",
                  "grain": "时间区间",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                },
                {
                  "seq": 97,
                  "title": "到期业务明细清单",
                  "componentType": "琛ㄦ牸",
                  "displayDescription": "",
                  "grain": "鏄庣粏",
                  "defaultFilters": "",
                  "frontendParams": "",
                  "axisDescription": "",
                  "metricDescription": "",
                  "legendDescription": "",
                  "responseFields": "",
                  "linkageRule": "",
                  "devNote": "",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "mergeMode": "areaMerged"
              }
            }
          ],
          "areaCount": 3,
          "widgetCount": 12
        }
      ],
      "blockCount": 1,
      "areaCount": 3,
      "widgetCount": 12
    }
  ],
  "sourceMode": "curated-prototype",
  "sourceNote": "手工整理后的驾驶舱结构；旧分层已压平，废弃组件已从数据层移除。"
};
