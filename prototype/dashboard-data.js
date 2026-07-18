window.dashboardData = {
  "generatedAt": "2026-07-08 curated",
  "workbook": "风险管理驾驶舱（无图版）.xlsx",
  "pageCount": 3,
  "widgetCount": 26,
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
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。通过筛选机构和币种展示最大经济价值变动比例走势；机构单选时，为所选币种中命中管理限额配置的币种显示限额线，并通过图例注明适用范围。",
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
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 月频 / 日频。展示所选机构、币种的经期限调整重定价缺口率走势；机构单选时，为所选币种中命中管理限额配置的币种显示限额线，并通过图例注明适用范围。",
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
                  "seq": 15,
                  "title": "资产负债重定价久期缺口",
                  "componentType": "穿透折线图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：时间序列（月频）。指标口径：资产负债重定价久期缺口 = 资产重定价久期 - 负债重定价久期。开发细化：采用折线图展示久期缺口走势，点击时间点后穿透展示当期资产端、负债端久期及分业务贡献。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：资产负债重定价久期缺口",
                  "legendDescription": "图例：资产负债重定价久期缺口",
                  "responseFields": "date_or_dimension_label, duration_gap, asset_duration, liability_duration, business_type",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图；点击时间点穿透展示久期缺口拆解"
                },
                {
                  "seq": 14,
                  "title": "分业务重定价期限分布",
                  "componentType": "期限分布图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 时点。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选择的单个币种下，不同业务（贷款、债券、存款等）在未来不同时间窗口的到期规模。开发细化：按当前图表名称对应的可视化组件实现。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：隔夜、1~2个月、2~3个月至11~12个月的重定价期限桶",
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
                  "displayDescription": "筛选项：机构；币种。展示所选机构、币种口径下债券修正久期走势；机构单选时，为所选币种中命中债券投资组合久期限额的币种显示限额线，并通过图例注明适用范围。",
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
                  "displayDescription": "筛选项：机构；币种。按时间序列展示所选机构、币种口径下债券投资规模和非金融企业债投资规模；机构单选时，为所选币种中命中对应限额的币种显示各自限额线，并通过图例注明适用范围。",
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
          "areaCount": 5,
          "widgetCount": 9
        }
      ],
      "blockCount": 1,
      "areaCount": 5,
      "widgetCount": 9
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
                  "displayDescription": "筛选项：机构；币种；期限长度（1D/7D/30D/3M/1Y）；统计口径（仅30D支持时点/月日均，其他期限仅时点）。采用柱状图+折线图展示缺口规模和缺口率，柱状图和折线趋势点均支持查看计算过程。计算口径：流动性缺口=到期表内外资产（含内部交易）-到期表内外负债（含内部交易）+活期存款调整+活期存放调整；到期表内外资产（含内部交易）=到期表内外资产+表外收入+内部交易资产；到期表内外负债（含内部交易）=到期表内外负债+表外支出+内部交易负债；流动性缺口率=100%-（到期表内外负债（含内部交易）-活期存款调整-活期存放调整）÷到期表内外资产（含内部交易），各组成项使用同一期限。机构单选时，为所选币种中同时命中30D时点或月日均限额口径的币种显示限额线，并通过图例注明适用范围。支持基于五期限桶现金流缺口表录入新业务及多笔现金流进行模拟测算。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；期限：默认30D；口径：默认时点",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], caliber_code, stat_caliber_codes[], tenor_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：柱线组合图；支持现金流缺口模拟测算",
                  "originPosition": "原始行49、50合并"
                },
                {
                  "seq": 53,
                  "title": "流动性比例",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种。展示口径：月频 / 日频。点击趋势点可查看流动性资产、流动性负债及其组成项的计算过程。计算公式：流动性比例=流动性资产/流动性负债；机构单选时，为所选币种中命中管理限额配置的币种显示限额线，并通过图例注明适用范围。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：流动性比例、流动性资产、流动性负债",
                  "legendDescription": "图例：流动性比例",
                  "responseFields": "date_or_dimension_label, liquidity_ratio, liquidity_assets, liquidity_liabilities",
                  "linkageRule": "与流动性缺口共用本区域机构、币种筛选器",
                  "devNote": "组件：折线图；支持点击趋势点查看计算过程",
                  "originPosition": "新增"
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
                  "displayDescription": "筛选项：机构；币种；流动性业务类别。联动规则：同一第三层区域下的图表共用机构、币种筛选器，业务类别通过图例筛选。展示口径：未来30天逐日。按统一的流动性风险业务分类堆叠展示未来逐日资金流，并叠加当日净额、累计净额两条折线；数据页签展示对应业务明细。",
                  "grain": "日度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计日期",
                  "metricDescription": "指标：分流动性业务类别资金流规模、当日净额、累计净额",
                  "legendDescription": "图例：流动性业务类别；折线：当日净额、累计净额",
                  "responseFields": "date, business_type, business_id, counterparty, direction, amount, daily_net, cumulative_net",
                  "linkageRule": "同一第三层区域下图表和明细数据共用本区域筛选器，流动性业务类别图例控制堆叠柱展示范围",
                  "devNote": "组件：堆叠柱线组合图；柱表示分业务资金流规模，两条线表示当日净额和累计净额，数据页展示业务明细",
                  "originPosition": "新增"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            }
          ],
          "areaCount": 4,
          "widgetCount": 5
        }
      ],
      "blockCount": 1,
      "areaCount": 4,
      "widgetCount": 5
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
                  "devNote": ""
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
                  "devNote": ""
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
                  "devNote": ""
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
                  "devNote": ""
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
                  "devNote": ""
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
                  "devNote": ""
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
