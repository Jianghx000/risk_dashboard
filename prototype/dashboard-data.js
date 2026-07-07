window.dashboardData = {
  "generatedAt": "2026-04-08 16:19",
  "workbook": "风险管理驾驶舱（无图版）.xlsx",
  "pageCount": 4,
  "widgetCount": 45,
  "pages": [
    {
      "id": "page-1",
      "name": "利率风险",
      "blocks": [
        {
          "id": "block-1",
          "name": "核心风险指标",
          "areas": [
            {
              "id": "area-1",
              "name": "最大经济价值变动比例",
              "viewScope": "时间序列（月频）",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 1,
                  "title": "最大经济价值变动比例（△EVE ）走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：通过筛选机构和币种，展示所选择的机构和币种的最大经济价值变动比例的走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
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
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：与上述所选择的机构一致，展示所选择的机构的一级资本净额（最大经济价值变动比例△EVE 分母）的走势（不区分币种）。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。开发补充：本图标题已明确为本外币合计口径，若页面仍保留币种公共筛选器，则本图不按币种拆分取数。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：筛选器保留，默认全选，不影响本图取数",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：EVE变动额/EVE变动比例",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器；币种筛选器保留但不影响取数，只作为区域内统一交互",
                  "devNote": "组件：折线图；标题需显式体现“本外币合计”",
                  "originPosition": "原始行3"
                },
                {
                  "seq": 4,
                  "title": "利率变动情景下经济价值变动",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。原始要求：与上述所筛选的机构和币种一致，展示所选择的机构和币种在6种不同监管情景（平行上移、下移、变陡峭、变平缓、短端上升、短端下降）下的经济价值变动的走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
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
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            },
            {
              "id": "area-5",
              "name": "最大经济价值变动比例",
              "viewScope": "时点",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 5,
                  "title": "各币种最大经济价值变动",
                  "componentType": "表格",
                  "displayDescription": "????????????????????????????????????/??????????????????????????????????????????????????????????????EVE???6????????????????????????????????????????????????????EVE??????????????????????????????????????????????",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "行维度：币种",
                  "metricDescription": "???EVE???/EVE?????6??????????",
                  "legendDescription": "列维度：按表头定义",
                  "responseFields": "row_key, row_label, col_key, col_label, metric_value, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器；支持表头固定、滚动与导出",
                  "devNote": "?????????????????????",
                  "originPosition": "???5 / ???6"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            },
            {
              "id": "area-7",
              "name": "净利息收入波动率",
              "viewScope": "时间序列（月频）",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）",
                "利率情景（多选）"
              ],
              "widgets": [
                {
                  "seq": 7,
                  "title": "净利息收入波动走势",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；利率情景（多选）。联动规则：同一第三层区域下的所有图表/表格共用机构、币种、利率情景三个筛选器。展示口径：时间序列（月频）。原始要求：先筛选机构和币种，然后再选择不同的利率情景（所有利率平行上移200bp、活期利率不变但其他利率平行上移200bp），展示所选择的机构和币种在不同利率情景下的净利息收入波动及波动率走势。开发细化：采用趋势图实现，横轴为月份，切换筛选项后整图联动刷新。",
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
              "id": "area-8",
              "name": "净利息收入波动率",
              "viewScope": "时点",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）",
                "利率情景（多选）"
              ],
              "widgets": [
                {
                  "seq": 8,
                  "title": "各币种净利息收入波动",
                  "componentType": "表格",
                  "displayDescription": "筛选项：机构（多选）。联动规则：当前表格仅联动机构筛选器；页面保留的币种（多选）与利率情景（多选）筛选器不影响本表取数。展示口径：时点。原始要求：通过筛选机构，以表格的方式展示所选择的机构下，所有币种（行）在所有利率情景（列）下的净利息收入波动及波动率。开发细化：采用表格组件实现，固定展开全部币种与全部利率情景，支持排序、冻结表头和导出。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：筛选器保留但不影响本表取数；情景：筛选器保留但不影响本表取数",
                  "frontendParams": "dashboard_id, area_code, org_ids[]",
                  "axisDescription": "横轴：时间/维度项（按口径确定）",
                  "metricDescription": "指标：NII波动额/NII波动率",
                  "legendDescription": "列维度：利率情景",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "当前表格仅联动机构筛选器；币种与利率情景筛选器保留但不影响取数",
                  "devNote": "组件：表格",
                  "originPosition": "原始行8"
                }
              ],
              "filterPreset": "orgCurrencyRateScenario",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            }
          ],
          "widgetCount": 6
        },
        {
          "id": "block-2",
          "name": "缺口风险",
          "areas": [
            {
              "id": "area-9",
              "name": "重定价缺口率",
              "viewScope": "时点口径 / 月频 / 日频",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 9,
                  "title": "重定价缺口率",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 月频 / 日频。原始要求：通过筛选机构、币种（二者均支持多选），展示所选择的机构在所选币种口径下的时点重定价缺口率走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
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
                  "seq": 10,
                  "title": "生息资产规模",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 月频 / 日频。原始要求：与上述所选择的机构、币种保持一致，展示所选择机构所选择币种的时点生息资产规模走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：规模",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行10"
                },
                {
                  "seq": 11,
                  "title": "重定价规模与缺口走势",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 月频 / 日频。原始要求：与上述所选择的机构、币种一致，展示所选择机构所选择币种口径下的未来一年重定价资产/负债规模与缺口走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行11"
                },
                {
                  "seq": 14,
                  "title": "分业务重定价期限分布",
                  "componentType": "期限分布图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 时点。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选择的单个币种下，不同业务（贷款、债券、存款等）在未来不同时间窗口的到期规模。开发细化：按当前图表名称对应的可视化组件实现。",
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
              "id": "area-15",
              "name": "重定价缺口率",
              "viewScope": "月日均口径 / 月频 / 日频",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 15,
                  "title": "重定价缺口率",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月日均口径 / 月频 / 日频。原始要求：通过筛选机构、币种（二者均支持多选），展示所选择的机构在所选币种口径下的月日均重定价缺口率走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行15"
                },
                {
                  "seq": 16,
                  "title": "生息资产规模",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月日均口径 / 月频 / 日频。原始要求：与上述所选择的机构、币种一致，展示所选择的机构在所选币种口径下的月日均重定价缺口率走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行16"
                },
                {
                  "seq": 17,
                  "title": "重定价规模与缺口走势",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月日均口径 / 月频 / 日频。原始要求：与上述所选择的机构、币种一致，展示所选择的机构在所选币种口径下的月日均重定价缺口率走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行17"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle",
                "tabGroup": "repricingGapCaliber",
                "tabKey": "月日均口径"
              }
            },
            {
              "id": "area-20",
              "name": "重定价久期",
              "viewScope": "存量业务 / 时间序列（月频）",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 21,
                  "title": "资产/负债重定价久期与差值",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：当前子页面下图表/表格共用机构、币种筛选器。展示口径：存量业务。原始要求：在同一张图中展示所选机构与币种口径下资产和负债的重定价久期，并同步展示二者差值。开发细化：采用柱线组合图实现，柱状图展示资产端和负债端重定价久期，折线展示久期差值，切换筛选项后整图联动刷新。",
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
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；业务类型（多选）。联动规则：当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例多选控制。展示口径：存量业务。原始要求：展示不同业务分类的重定价久期走势图。开发细化：按业务类型拆线，切换机构、币种后整图联动刷新。",
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
              "viewScope": "新发生业务 / 时间序列（月频）",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 27,
                  "title": "资产/负债重定价久期与差值",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：当前子页面下图表/表格共用机构、币种筛选器。展示口径：新发生业务。原始要求：在同一张图中展示所选机构与币种口径下新发生业务的资产和负债重定价久期，并同步展示二者差值。开发细化：采用柱线组合图实现，柱状图展示资产端和负债端重定价久期，折线展示久期差值，切换筛选项后整图联动刷新。",
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
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；业务类型（多选）。联动规则：当前子页面下图表/表格共用机构、币种筛选器，业务类型通过图例多选控制。展示口径：新发生业务。原始要求：展示不同业务分类的新发生业务重定价久期走势图。开发细化：按业务类型拆线，切换机构、币种后整图联动刷新。",
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
              "name": "投资组合久期",
              "viewScope": "存量业务 / 限额监测",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 60,
                  "title": "投资组合久期",
                  "componentType": "限额折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。展示所选机构、币种口径下投资组合久期走势，指标为限额指标。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：投资组合久期、限额",
                  "legendDescription": "图例：机构/币种组合",
                  "responseFields": "date_or_dimension_label, metric_value, limit_value, series_name",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：限额折线图；折线表示投资组合久期，虚线表示限额"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            }
          ],
          "widgetCount": 12,
          "areaCount": 5
        }
      ],
      "blockCount": 2,
      "areaCount": 9,
      "widgetCount": 18
    },
    {
      "id": "page-2",
      "name": "流动性风险",
      "blocks": [
        {
          "id": "block-1",
          "name": "核心风险指标",
          "areas": [
            {
              "id": "area-42",
              "name": "流动性覆盖率LCR",
              "viewScope": "月频 / 日频 / 分币种",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 42,
                  "title": "流动性覆盖率LCR走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月频 / 日频 / 分币种。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选机构不同币种的LCR走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
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
                },
                {
                  "seq": 44,
                  "title": "未来30天现金净流出量走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月频 / 日频 / 分币种。原始要求：与上述筛选的机构和币种保持一致，展示所选机构和币种下的未来30天现金净流出量走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：按图表标题定义",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行44"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle",
                "breakdownMode": "currency"
              }
            },
            {
              "id": "area-45",
              "name": "流动性覆盖率LCR",
              "viewScope": "时点",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 43,
                  "title": "优质流动性资产HQLA走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月频 / 日频 / 分币种。原始要求：与上述筛选的机构保持一致，展示所选机构本外币合计口径的优质流动性资产HQLA走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：HQLA",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行43"
                },
                {
                  "seq": 45,
                  "title": "HQLA规模分布结构",
                  "componentType": "环形图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点。原始要求：通过筛选机构及币种，展示所选机构及币种的HQLA的分布结构，一级资产、二级资产等。开发细化：采用结构分布图实现，同步展示绝对规模和占比。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "维度：HQLA层级（一级资产、二级资产）",
                  "metricDescription": "指标：HQLA",
                  "legendDescription": "图例：一级资产、二级资产",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：环形图；建议支持tooltip同步查看",
                  "originPosition": "原始行45"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "snapshot"
              }
            },
            {
              "id": "area-46",
              "name": "净稳定资金比率NSFR",
              "viewScope": "月频 / 日频",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 46,
                  "title": "净稳定资金比例NSFR走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：月频 / 日频。原始要求：通过筛选机构（境内或法人）和币种，展示所选机构和币种下的净稳定资金比例NSFR走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
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
                },
                {
                  "seq": 47,
                  "title": "可用稳定资金规模走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：月频 / 日频。原始要求：与上述筛选的机构和币种保持一致，展示所选机构和币种下的可用稳定资金规模走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：规模",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行47"
                },
                {
                  "seq": 48,
                  "title": "业务所需稳定资金走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：月频 / 日频。原始要求：与上述筛选的机构和币种保持一致，展示所选机构和币种下的业务所需稳定资金走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：按图表标题定义",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行48"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "timeMode": "frequencyToggle"
              }
            }
          ],
          "widgetCount": 7
        },
        {
          "id": "block-2",
          "name": "现金流错配",
          "areas": [
            {
              "id": "area-55",
              "name": "流动性比例",
              "viewScope": "时间序列（月频）",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 55,
                  "title": "流动性比例",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：时间序列（月频）。原始要求：展示所选机构和币种口径下的流动性比例走势。开发细化：采用折线图实现，横轴为统计月，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：流动性比例",
                  "legendDescription": "图例：当前口径",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "新增"
                },
                {
                  "seq": 56,
                  "title": "流动性资产和流动性负债",
                  "componentType": "柱状图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：时间序列（月频）。原始要求：展示所选机构和币种口径下的流动性资产和流动性负债规模。开发细化：采用双柱图实现，每个统计月展示流动性资产和流动性负债两根柱，切换筛选项后整图联动刷新。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：流动性资产规模/流动性负债规模",
                  "legendDescription": "图例：流动性资产、流动性负债",
                  "responseFields": "date_or_dimension_label, metric_value, series_name",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：双柱图",
                  "originPosition": "新增"
                }
              ],
              "filterPreset": "orgCurrency",
              "scopeMeta": {
                "snapshotMode": "trend",
                "timeMode": "monthly"
              }
            },
            {
              "id": "area-49",
              "name": "流动性缺口",
              "viewScope": "月频 / 日频",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 49,
                  "title": "流动性缺口（1D/7D/3M）",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；期限长度（多选，仅1D/7D/3M图生效）；统计口径（多选，仅30日图和资金流入流出图生效）。联动规则：同一第三层区域下的图表共用机构、币种、期限长度、统计口径筛选器。展示口径：月频 / 日频。原始要求：筛选机构和币种，再选择期限长度（1D/7D/3M），展示所选机构和币种维度下，不同期限长度的流动性缺口规模与流动性缺口率走势。开发细化：采用柱状图+折线图实现，柱子表示流动性缺口规模，折线表示流动性缺口率，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。开发补充：期限长度默认选中3M，可按需追加对比1D、7D。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；口径：默认当前区域主口径；期限：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], caliber_code, stat_caliber_codes[], tenor_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行49"
                },
                {
                  "seq": 50,
                  "title": "30日流动性缺口规模",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；期限长度（多选，仅1D/7D/3M图生效）；统计口径（多选，仅30日图和资金流入流出图生效）。联动规则：同一第三层区域下的图表共用机构、币种、期限长度、统计口径筛选器。展示口径：月频 / 日频。原始要求：与上述筛选的机构和币种保持一致，进一步选择口径（时点或月日均），展示所选机构和币种维度下不同口径（时点或月日均）的30日流动性缺口规模走势。开发细化：采用趋势图实现，横轴为时间，支持在图卡内切换月频 / 日频展示，切换筛选项后整图联动刷新。开发补充：统计口径支持多选，可同图对比时点与月日均结果。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认全选；币种：默认全选；口径：默认当前区域主口径；期限：默认全选",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[], caliber_code, stat_caliber_codes[], tenor_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：缺口规模/缺口率",
                  "legendDescription": "图例：币种",
                  "responseFields": "date_or_dimension_label, metric_value, series_name, metric_code",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：折线图",
                  "originPosition": "原始行50"
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
              "viewScope": "时点",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 54,
                  "title": "未来逐日资金流",
                  "componentType": "堆叠柱线组合图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）；业务类型（多选）。联动规则：同一第三层区域下的图表共用机构、币种筛选器，业务类型通过图例筛选。展示口径：未来30天逐日。开发细化：参考分业务重定价期限分布图，以业务类型堆叠柱展示未来逐日资金流分布，并叠加当日净额、累计净额两条折线；数据页签展示对应业务明细。",
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
            }
          ],
          "widgetCount": 5
        }
      ],
      "blockCount": 2,
      "areaCount": 6,
      "widgetCount": 12
    },
    {
      "id": "page-3",
      "name": "投融资业务",
      "blocks": [
        {
          "id": "block-investment-financing-bond-investment",
          "name": "债券投资",
          "areas": [
            {
              "id": "area-investment-financing-bond-investment",
              "name": "债券投资",
              "viewScope": "限额监测",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 59,
                  "title": "债券投资规模",
                  "componentType": "限额双柱时序图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。按时间序列展示所选机构、币种口径下债券投资规模和非金融企业债投资规模，两个指标均为限额指标。",
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
          "widgetCount": 1,
          "areaCount": 1
        },
        {
          "id": "block-investment-financing-funding-inflow",
          "name": "资金融入",
          "areas": [
            {
              "id": "area-investment-financing-funding-inflow",
              "name": "资金融入",
              "viewScope": "限额监测",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
              ],
              "widgets": [
                {
                  "seq": 57,
                  "title": "同业融入最长期限",
                  "componentType": "限额折线图",
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。展示各机构、各币种的最长同业融入期限，指标为限额指标。",
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
                  "displayDescription": "筛选项：机构（多选）；币种（多选）。按原始期限 bucket 展示不同期限的同业融入规模占比。",
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
          "widgetCount": 2,
          "areaCount": 1
        }
      ],
      "blockCount": 2,
      "areaCount": 2,
      "widgetCount": 3
    },
    {
      "id": "page-4",
      "name": "业务变动分析",
      "blocks": [
        {
          "id": "block-1",
          "name": "存量业务",
          "areas": [
            {
              "id": "area-stock",
              "name": "存量业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
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
                  "title": "瀛橀噺涓氬姟鏄庣粏娓呭崟",
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
          "widgetCount": 4
        },
        {
          "id": "block-2",
          "name": "新发生业务",
          "areas": [
            {
              "id": "area-new",
              "name": "新发生业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
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
                  "title": "鏂板彂鐢熶笟鍔℃槑缁嗘竻鍗?",
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
          "widgetCount": 4
        },
        {
          "id": "block-3",
          "name": "到期业务",
          "areas": [
            {
              "id": "area-maturity",
              "name": "到期业务",
              "viewScope": "合并区域",
              "sharedFilters": [
                "机构（多选）",
                "币种（多选）"
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
                  "title": "鍒版湡涓氬姟鏄庣粏娓呭崟",
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
          "widgetCount": 4
        }
      ],
      "blockCount": 3,
      "areaCount": 3,
      "widgetCount": 12
    }
  ]
};
