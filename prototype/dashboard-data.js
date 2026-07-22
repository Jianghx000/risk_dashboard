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
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 1,
                  "title": "最大经济价值变动比例（△EVE ）走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种，均为单选。联动规则：同一第三层区域下的所有图表/表格共用机构、币种两个筛选器。展示口径：时间序列（月频）。通过筛选机构和币种展示最大经济价值变动比例走势；为所选机构、币种命中的管理限额显示限额线，并通过图例注明适用范围。△EVE分子直接按六情景最大经济价值损失MAX(-ΔEVE)计算，不取绝对值。计算过程采用正式分组Owen归因：分子组六个监管情景执行Shapley，每替换一个情景均重新计算六情景MAX，情景切换仅作辅助状态；境外分行资本组按境外分行RWA、法人RWA和法人一级资本净额执行12条资本路径归因。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币，筛选器保留但不影响本图取数",
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
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-7",
              "name": "净利息收入波动率",
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
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币；利率情景：默认所有利率平行上移200bp",
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
              "filterPreset": "orgCurrencyRateScenario"
            },
            {
              "id": "area-9",
              "name": "重定价缺口率",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 9,
                  "title": "重定价缺口率",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构、币种、活期存款口径、表外衍生品口径，均为单选。活期存款可选择“含”或“不含”；表外衍生品可选择“不含”“仅含银行账簿”或“含银行账簿和交易账簿”。默认口径为不含活期存款、含银行账簿和交易账簿表外衍生品。展示所选口径的经期限调整重定价缺口率走势；只有默认口径支持查看计算过程和拆解归因。默认口径的计算过程采用正式三层嵌套Owen归因：先处理资产端、负债端、银行账簿表外衍生品和交易账簿表外衍生品四组，再在资产组内处理业务类别，最后把单项资产业务拆为“一年内期限桶联合因素”和“一年外及无明确重定价期限资产因素”。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
                  "componentType": "柱线组合图",
                  "displayDescription": "筛选项：机构；币种，均为单选。联动规则：同一第三层区域下的图表共用机构、币种筛选器。展示口径：时间序列（月频）。指标口径：资产负债重定价久期缺口 = 资产重定价久期 - 负债重定价久期。采用同一久期纵轴的柱线组合图：两根并列柱分别展示资产重定价久期、负债重定价久期，折线展示资产负债重定价久期缺口；点击折线点同时展示当期资产久期、负债久期和久期缺口，不提供计算过程或因素归因拆解。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：资产负债重定价久期缺口",
                  "legendDescription": "图例：资产重定价久期、负债重定价久期、资产负债重定价久期缺口",
                  "responseFields": "date_or_dimension_label, duration_gap, asset_duration, liability_duration, business_type",
                  "linkageRule": "同一第三层区域下所有四层图表/表格共用本区域筛选器",
                  "devNote": "组件：双柱加折线组合图；点击折线点展示三项当期取值"
                },
                {
                  "seq": 14,
                  "title": "分业务重定价期限分布",
                  "componentType": "期限分布图",
                  "displayDescription": "筛选项：机构；币种。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：时点口径 / 时点。原始要求：在上述选择机构的基础上，进一步选择币种，展示所选择的单个币种下，不同业务（贷款、债券、存款等）在未来不同时间窗口的到期规模。开发细化：按当前图表名称对应的可视化组件实现。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-interest-portfolio-duration",
              "name": "债券修正久期",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 60,
                  "title": "债券修正久期",
                  "componentType": "限额折线图",
                  "displayDescription": "筛选项：机构；币种，均为单选。展示所选机构、币种口径下债券修正久期走势；为所选机构、币种命中的债券投资组合久期限额显示限额线，并通过图例注明适用范围。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：债券修正久期、限额",
                  "legendDescription": "图例：机构/币种组合",
                  "responseFields": "date_or_dimension_label, metric_value, limit_value, series_name",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：限额折线图；折线表示债券修正久期，虚线表示限额"
                }
              ],
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-investment-financing-bond-investment",
              "name": "债券投资",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 59,
                  "title": "债券投资规模",
                  "componentType": "限额双柱时序图",
                  "displayDescription": "筛选项：机构；币种，均为单选。按时间序列展示所选机构、币种口径下债券投资规模和非金融企业债投资规模；为所选机构、币种命中的对应限额显示各自限额线，并通过图例注明适用范围。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "frontendParams": "dashboard_id, area_code, org_ids[], currency_codes[]",
                  "axisDescription": "横轴：统计月",
                  "metricDescription": "指标：债券投资规模、非金融企业债投资规模、限额",
                  "legendDescription": "图例：债券投资规模、非金融企业债投资规模、限额",
                  "responseFields": "org_id, currency_code, bond_investment_scale, non_financial_corporate_bond_scale, limit_value",
                  "linkageRule": "同一第三层区域下图表共用机构、币种筛选器",
                  "devNote": "组件：双柱限额时序图；两种颜色柱子分别表示债券投资规模和非金融企业债投资规模，叠加限额线"
                }
              ],
              "filterPreset": "orgCurrency"
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
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 42,
                  "title": "流动性覆盖率LCR走势",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种，均为单选。联动规则：同一第三层区域下的图表/表格共用机构、币种筛选器。展示口径：月频 / 日频 / 分币种。展示所选机构、币种的LCR走势，支持月频 / 日频切换。计算过程采用正式分组Owen口径：HQLA为分子组，现金流出和现金流入为分母组内两个因素；结构上覆盖24条正式排列路径，利用HQLA组三项直接线性可折叠的性质按4类等价路径环境计算。每次替换均直接重算max(现金流出-现金流入，25%现金流出)，约束分支切换只作为辅助状态，不作为独立贡献因素。一级资产、2A资产、2B资产是三个直接输入字段，并按共同单位影响系数线性分解。全部归因使用原始精度，页面展示时再四舍五入。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-46",
              "name": "净稳定资金比率NSFR",
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
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-49",
              "name": "流动性缺口",
              "groupKey": "liquidity-gap-and-funding-flow",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 49,
                  "title": "流动性缺口",
                  "componentType": "折线图",
                  "displayDescription": "筛选项：机构；币种，均为单选；期限长度（1D/7D/30D/3M/1Y）；统计口径（仅30D支持时点/月日均，其他期限仅时点）。采用柱状图+折线图展示缺口规模和缺口率，柱状图和折线趋势点均支持查看计算过程。计算口径：流动性缺口=到期表内外资产（含内部交易）-到期表内外负债（含内部交易）+活期存款调整+活期存放调整；到期表内外资产（含内部交易）=到期表内资产+表外收入+内部交易资产；到期表内外负债（含内部交易）=到期表内负债+表外支出+内部交易负债。监管原式：流动性缺口率=[到期表内外资产（含内部交易）-到期表内外负债（含内部交易，调整活期）]÷到期表内外资产（含内部交易）；为便于归因拆解，等价变形为100%-到期表内外负债（含内部交易，调整活期）÷到期表内外资产（含内部交易），各组成项使用同一期限。为所选机构、币种同时命中的30D时点或月日均限额显示限额线，并通过图例注明适用范围。支持基于五期限桶现金流缺口表录入新业务及多笔现金流进行模拟测算。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币；期限：默认30D；口径：默认时点",
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
                  "displayDescription": "筛选项：机构；币种，均为单选。展示口径：月频 / 日频。点击趋势点可查看流动性资产、流动性负债及其组成项的计算过程。计算公式：流动性比例=流动性资产/流动性负债×100%。正式归因采用三组Owen：其他流动性资产组、其他流动性负债组、一个月内到期同业往来轧差净头寸组，共6种组间路径；其他资产组按共同单位系数线性分解，其他负债组内部执行Shapley。同业资产方净额=max(净头寸,0)、同业负债方净额=max(-净头寸,0)，两项是同一联合因素的监管列示结果；发生方向切换时，在每条Owen路径中以净头寸0为桥接点，分别计量资产端退出/形成影响和负债端退出/形成影响。为所选机构、币种命中的管理限额显示限额线，并通过图例注明适用范围。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-51",
              "name": "流动性缺口",
              "groupKey": "liquidity-gap-and-funding-flow",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 54,
                  "title": "未来逐日资金流",
                  "componentType": "堆叠柱线组合图",
                  "displayDescription": "筛选项：机构；币种；流动性业务类别。联动规则：同一第三层区域下的图表共用机构、币种筛选器，业务类别通过图例筛选。展示口径：未来30天逐日。按统一的流动性风险业务分类堆叠展示未来逐日资金流，并叠加当日净额、累计净额两条折线；除现金、活期存款外，单击柱形分段可在右侧查看业务明细；数据页签展示对应业务明细。",
                  "grain": "日度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
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
              "filterPreset": "orgCurrency"
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
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 72,
                  "title": "资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间；支持月频、日频切换，月频展示已完成月末，日频展示截至所选日期的日度数据。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 73,
                  "title": "分业务规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间；支持月频、日频切换，月频展示已完成月末，日频展示截至所选日期的日度数据。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 79,
                  "title": "资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "展示页面顶部共享结束时间对应的存量业务时点结构。",
                  "grain": "时点快照",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                },
                {
                  "seq": 80,
                  "title": "存量业务明细清单",
                  "componentType": "表格",
                  "displayDescription": "由存量结构一览表下钻，展示页面顶部共享结束时间对应的存量业务明细。",
                  "grain": "明细",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-new",
              "name": "新发生业务",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 83,
                  "title": "新发生资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间，按月末轧差明细展示截至最近已完成月末的新发生业务。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 84,
                  "title": "分业务新发生规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间，按月末轧差明细分业务展示截至最近已完成月末的新发生业务。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 89,
                  "title": "新发生业务资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "使用表内独立的开始月末、结束月末筛选，汇总所选月末区间内逐月形成的新发生业务明细。",
                  "grain": "时间区间",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                },
                {
                  "seq": 85,
                  "title": "新发生业务明细清单",
                  "componentType": "表格",
                  "displayDescription": "由新发生业务结构一览表下钻，并沿用表内独立的月末区间。",
                  "grain": "明细",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency"
            },
            {
              "id": "area-maturity",
              "name": "到期业务",
              "sharedFilters": [
                "机构",
                "币种"
              ],
              "widgets": [
                {
                  "seq": 90,
                  "title": "到期资产负债规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间，展示截至最近已完成月末的历史实际到期，并从所选结束时间起按合同约定推演未来到期；历史区间展示规模柱和增速折线，未来合同到期区间只展示规模柱。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 91,
                  "title": "分业务到期规模及增速",
                  "componentType": "双轴柱线组合图",
                  "displayDescription": "跟随页面顶部共享结束时间，分业务展示截至最近已完成月末的历史实际到期，并从所选结束时间起按合同约定推演未来到期；历史区间展示规模柱和增速折线，未来合同到期区间只展示规模柱。",
                  "grain": "月度",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币"
                },
                {
                  "seq": 96,
                  "title": "到期业务资产负债结构一览表",
                  "componentType": "表格",
                  "displayDescription": "在标题旁提供历史实际到期、未来合同到期两个并列页签；历史页使用独立的月末区间，未来页使用可精确到日的合同到期日期区间。",
                  "grain": "时间区间",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                },
                {
                  "seq": 97,
                  "title": "到期业务明细清单",
                  "componentType": "表格",
                  "displayDescription": "由到期业务结构一览表下钻；历史实际到期沿用月末区间，未来合同到期沿用精确到日的合同到期日期区间。",
                  "grain": "明细",
                  "defaultFilters": "机构：默认法人汇总；币种：默认全折人民币",
                  "layout": "full"
                }
              ],
              "filterPreset": "orgCurrency"
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
  "sourceNote": "手工整理后的风险分析视图结构；旧分层已压平，废弃组件已从数据层移除。"
};
