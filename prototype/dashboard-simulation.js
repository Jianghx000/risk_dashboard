/* Simulation modal, draft, and chart overlay behavior. */

function getPageSimulation(pageId = getCurrentPage()?.id) {
  if (!pageId) return null;
  return appState.pageSimulations[pageId] || null;
}

function getSimulationMode(page = getCurrentPage()) {
  return getPageBehavior(page).simulationMode || "generic";
}

function canRenderHedgeSimulation(page = getCurrentPage()) {
  return getSimulationMode(page) === "interest";
}

function getSimulationModeTabs(page = getCurrentPage()) {
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { mode: SIMULATION_MODE_HEDGE, label: "套期交易模拟测算" },
      { module: SIMULATION_MODULE_NET_INTEREST_INCOME, label: "净利息收入" },
    ];
  }
  if (simulationMode === "liquidity") {
    return [
      { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
      { module: SIMULATION_MODULE_LIQUIDITY_STRESS, label: "流动性压力测试" },
    ];
  }
  return [
    { mode: SIMULATION_MODE_NEW_BUSINESS, label: "新业务模拟测算" },
  ];
}

function getSimulationDraftMode(page = getCurrentPage()) {
  if (!canRenderHedgeSimulation(page)) return SIMULATION_MODE_NEW_BUSINESS;
  return appState.simulationDraftMode === SIMULATION_MODE_HEDGE ? SIMULATION_MODE_HEDGE : SIMULATION_MODE_NEW_BUSINESS;
}

function getSimulationModeLabel(mode = SIMULATION_MODE_NEW_BUSINESS) {
  return mode === SIMULATION_MODE_HEDGE ? "套期交易模拟测算" : "新业务模拟测算";
}

function getDefaultSimulationDraftMode(page, simulation) {
  if (canRenderHedgeSimulation(page) && simulation?.simulationType === SIMULATION_MODE_HEDGE) return SIMULATION_MODE_HEDGE;
  return SIMULATION_MODE_NEW_BUSINESS;
}

function closeSimulationModal() {
  appState.simulationModalPageId = null;
  appState.simulationDraftMode = SIMULATION_MODE_NEW_BUSINESS;
  appState.simulationDraft = null;
  appState.hedgeSimulationDraft = null;
}

function openSimulationModal(pageId) {
  const page = data.pages.find((item) => item.id === pageId) || getCurrentPage();
  const simulation = getPageSimulation(pageId);
  appState.simulationModalPageId = pageId;
  appState.simulationDraftMode = getDefaultSimulationDraftMode(page, simulation);
  appState.simulationDraft = createSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_NEW_BUSINESS ? simulation : null
  );
  appState.hedgeSimulationDraft = createHedgeSimulationDraftFromScenario(
    page,
    simulation?.simulationType === SIMULATION_MODE_HEDGE ? simulation : null
  );
}

function getSimulationFieldDefs(page = getCurrentPage()) {
  const commonFields = [
    { name: "fundingRole", label: "资金方向", type: "select", options: SIMULATION_FUNDING_ROLE_OPTIONS },
    { name: "org", label: "机构", type: "select", options: FILTER_OPTIONS["机构"] || ["法人汇总"] },
    { name: "currency", label: "币种", type: "select", options: FILTER_OPTIONS["币种"] || ["全折人民币"] },
    { name: "businessType", label: "业务类型", type: "select", options: BUSINESS_DURATION_OPTIONS },
    { name: "scale", label: "规模（亿元）", type: "number", min: "1", step: "1" },
    { name: "termMonths", label: "期限（月）", type: "number", min: "1", step: "1" },
  ];
  if (getSimulationMode(page) === "interest") {
    return [
      ...commonFields,
      { name: "repricingMonths", label: "重定价频率", type: "select", options: REPRICING_FREQUENCY_OPTIONS, valueKey: "value", labelKey: "label" },
      { name: "rateType", label: "定价方式", type: "select", options: RATE_TYPE_OPTIONS },
    ];
  }
  return commonFields;
}

function getDefaultSimulationBusinessType(fundingRole) {
  if (SIMULATION_DEFAULT_BUSINESS_TYPES[fundingRole]) return SIMULATION_DEFAULT_BUSINESS_TYPES[fundingRole];
  return BUSINESS_DURATION_OPTIONS[0] || "";
}

function getDefaultSimulationFundingRole(entryIndex = 0) {
  return SIMULATION_FUNDING_ROLE_OPTIONS[entryIndex % SIMULATION_FUNDING_ROLE_OPTIONS.length] || SIMULATION_FUNDING_ROLE_OPTIONS[0];
}

function getSimulationFundingRoleByBusinessType(businessType) {
  return BUSINESS_SIDE_MAP[businessType] === "liability" ? "资金来源" : "资金运用";
}

function normalizeSimulationEntryRole(entry, entryIndex = 0) {
  const fallbackRole = entry?.businessType
    ? getSimulationFundingRoleByBusinessType(entry.businessType)
    : getDefaultSimulationFundingRole(entryIndex);
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(entry?.fundingRole) ? entry.fundingRole : fallbackRole;
  return {
    ...entry,
    fundingRole,
  };
}

function createDefaultSimulationEntry(page = getCurrentPage(), entryIndex = 0, fundingRoleOverride = "") {
  const fieldDefs = getSimulationFieldDefs(page);
  const entry = {};
  const fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(fundingRoleOverride)
    ? fundingRoleOverride
    : getDefaultSimulationFundingRole(entryIndex);
  fieldDefs.forEach((field) => {
    if (field.name === "fundingRole") entry[field.name] = fundingRole;
    else if (field.name === "businessType") entry[field.name] = getDefaultSimulationBusinessType(fundingRole);
    else if (field.type === "number") entry[field.name] = field.name === "scale" ? "50" : "12";
    else if (field.options?.length) {
      const firstOption = field.options[0];
      entry[field.name] = typeof firstOption === "object" ? firstOption[field.valueKey || "value"] : firstOption;
    } else entry[field.name] = "";
  });
  return entry;
}

function createDefaultSimulationDraft(page = getCurrentPage()) {
  return { entries: createMinimumSimulationEntries(page) };
}

function getSimulationEntries(simulation) {
  if (!simulation) return [];
  if (Array.isArray(simulation.entries)) return simulation.entries.filter(Boolean);
  return [simulation];
}

function getSimulationDraftEntries(draft, page = getCurrentPage()) {
  const entries = getSimulationEntries(draft);
  return ensureMinimumSimulationEntries(page, entries.length ? entries : []);
}

function createSimulationDraftFromScenario(page, scenario) {
  const entries = ensureMinimumSimulationEntries(page, getSimulationEntries(scenario));
  return {
    entries: entries.map((entry, index) => {
      const fallbackEntry = createDefaultSimulationEntry(page, index, entry?.fundingRole);
      return {
        ...fallbackEntry,
        ...entry,
        fundingRole: entry?.fundingRole || fallbackEntry.fundingRole,
        businessType: entry?.businessType || fallbackEntry.businessType,
        scale: String(entry?.scale ?? fallbackEntry.scale),
        termMonths: String(entry?.termMonths ?? fallbackEntry.termMonths),
      };
    }),
  };
}

function createMinimumSimulationEntries(page = getCurrentPage()) {
  return SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole, index) => createDefaultSimulationEntry(page, index, fundingRole));
}

function ensureMinimumSimulationEntries(page = getCurrentPage(), entries = []) {
  const normalizedEntries = (Array.isArray(entries) ? entries.filter(Boolean) : [])
    .map((entry, index) => normalizeSimulationEntryRole(entry, index));
  const nextEntries = [...normalizedEntries];
  SIMULATION_FUNDING_ROLE_OPTIONS.forEach((fundingRole) => {
    if (!nextEntries.some((entry) => entry.fundingRole === fundingRole)) {
      nextEntries.push(createDefaultSimulationEntry(page, nextEntries.length, fundingRole));
    }
  });
  return nextEntries;
}

function getSimulationVisibleFieldDefs(page = getCurrentPage()) {
  return getSimulationFieldDefs(page).filter((field) => field.name !== "fundingRole");
}

function updateSimulationEntryField(page, entries, entryIndex, fieldName, fieldValue) {
  const nextEntries = ensureMinimumSimulationEntries(page, entries).map((entry) => ({ ...entry }));
  const previousEntry = nextEntries[entryIndex] || createDefaultSimulationEntry(page, entryIndex);
  const nextEntry = {
    ...previousEntry,
    [fieldName]: fieldValue,
  };
  if (fieldName === "fundingRole") {
    const previousDefaultBusinessType = getDefaultSimulationBusinessType(previousEntry.fundingRole);
    const nextDefaultBusinessType = getDefaultSimulationBusinessType(fieldValue);
    if (!nextEntry.businessType || nextEntry.businessType === previousDefaultBusinessType) {
      nextEntry.businessType = nextDefaultBusinessType;
    }
  }
  nextEntries[entryIndex] = nextEntry;
  return nextEntries;
}

function renderSimulationField(field, draft, entryIndex) {
  const value = draft?.[field.name] ?? "";
  if (field.type === "select") {
    return `
      <label class="simulation-form__field">
        <span class="simulation-form__label">${field.label}</span>
        <select class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}">
          ${(field.options || []).map((option) => {
            const optionValue = typeof option === "object" ? option[field.valueKey || "value"] : option;
            const optionLabel = typeof option === "object" ? option[field.labelKey || "label"] : option;
            return `<option value="${optionValue}" ${String(optionValue) === String(value) ? "selected" : ""}>${optionLabel}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label class="simulation-form__field">
      <span class="simulation-form__label">${field.label}</span>
      <input class="simulation-form__control" data-simulation-entry-index="${entryIndex}" data-simulation-field="${field.name}" type="${field.type}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.step ? `step="${field.step}"` : ""} />
    </label>
  `;
}

function normalizeSimulationRecord(page, draft) {
  const normalized = { ...createDefaultSimulationEntry(page), ...draft };
  normalized.fundingRole = SIMULATION_FUNDING_ROLE_OPTIONS.includes(normalized.fundingRole) ? normalized.fundingRole : SIMULATION_FUNDING_ROLE_OPTIONS[0];
  normalized.scale = Math.max(1, Number(normalized.scale || 0));
  normalized.termMonths = Math.max(1, Number(normalized.termMonths || 0));
  if (getSimulationMode(page) === "interest") normalized.repricingMonths = String(normalized.repricingMonths || "3");
  return normalized;
}

function getSharedSimulationValue(entries, key, mixedLabel) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  return mixedLabel;
}

function summarizeSimulationValues(entries, key) {
  const values = Array.from(new Set(entries.map((entry) => entry[key]).filter(Boolean)));
  if (values.length <= 2) return values.join("、");
  return `${values.slice(0, 2).join("、")}等${values.length}项`;
}

function normalizeSimulationScenario(page, draft) {
  const entries = getSimulationDraftEntries(draft, page).map((entry) => normalizeSimulationRecord(page, entry));
  const totalScale = entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
  const weightedTerm = entries.reduce((sum, entry) => sum + Number(entry.termMonths || 0) * Number(entry.scale || 0), 0);
  return {
    simulationType: SIMULATION_MODE_NEW_BUSINESS,
    entries,
    org: getSharedSimulationValue(entries, "org", "多机构"),
    currency: getSharedSimulationValue(entries, "currency", "多币种"),
    fundingRole: getSharedSimulationValue(entries, "fundingRole", "来源/运用组合"),
    businessType: getSharedSimulationValue(entries, "businessType", "组合业务"),
    scale: Number(totalScale.toFixed(1)),
    termMonths: totalScale ? Number((weightedTerm / totalScale).toFixed(1)) : 1,
  };
}

function createDefaultHedgeSimulationDraft() {
  return {
    query: "",
    selectedItemId: "",
    hedgeAmount: "50",
    hedgeTermMonths: "12",
  };
}

function createHedgeSimulationDraftFromScenario(page, scenario) {
  if (scenario?.simulationType !== SIMULATION_MODE_HEDGE) return createDefaultHedgeSimulationDraft(page);
  return {
    query: scenario.hedgeItemId || "",
    selectedItemId: scenario.hedgeItemId || "",
    hedgeAmount: String(scenario.hedgeAmount ?? scenario.scale ?? "50"),
    hedgeTermMonths: String(scenario.hedgeTermMonths ?? scenario.termMonths ?? "12"),
  };
}

function getHedgeSearchResults(draft = appState.hedgeSimulationDraft) {
  const query = String(draft?.query || "").trim().toLowerCase();
  if (!query) return HEDGEABLE_ITEM_OPTIONS.slice(0, 4);
  return HEDGEABLE_ITEM_OPTIONS.filter((item) =>
    [item.id, item.type, item.businessType, item.org, item.currency, item.rateBenchmark]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

function getSelectedHedgeItem(draft = appState.hedgeSimulationDraft) {
  return HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === draft?.selectedItemId) || null;
}

function getHedgeDraft(page = getCurrentPage()) {
  if (!appState.hedgeSimulationDraft) appState.hedgeSimulationDraft = createDefaultHedgeSimulationDraft(page);
  return appState.hedgeSimulationDraft;
}

function normalizeHedgeSimulationScenario(page, draft = createDefaultHedgeSimulationDraft(page)) {
  const selectedItem = getSelectedHedgeItem(draft) || getHedgeSearchResults(draft)[0] || HEDGEABLE_ITEM_OPTIONS[0];
  const hedgeAmount = clampNumber(Number(draft.hedgeAmount || 0), 1, selectedItem.balance);
  const hedgeTermMonths = clampNumber(Number(draft.hedgeTermMonths || selectedItem.remainingTermMonths || 12), 1, 360);
  const hedgeCoverageRatio = Number((hedgeAmount / Math.max(1, Number(selectedItem.balance || 1))).toFixed(4));
  const entry = {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeCoverageRatio,
    fundingRole: getSimulationFundingRoleByBusinessType(selectedItem.businessType),
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
    repricingMonths: selectedItem.repricingMonths || "3",
    rateType: selectedItem.rateType || "浮动利率",
  };
  return {
    simulationType: SIMULATION_MODE_HEDGE,
    hedgeItemId: selectedItem.id,
    hedgeItemType: selectedItem.type,
    hedgeAmount,
    hedgeTermMonths,
    hedgeCoverageRatio,
    hedgedItem: selectedItem,
    entries: [entry],
    org: selectedItem.org,
    currency: selectedItem.currency,
    businessType: selectedItem.businessType,
    scale: hedgeAmount,
    termMonths: hedgeTermMonths,
  };
}

function renderSimulationSummary(pageId = getCurrentPage()?.id) {
  const simulation = getPageSimulation(pageId);
  if (!simulation) return "";
  if (simulation.simulationType === SIMULATION_MODE_HEDGE) {
    const hedgedItem = simulation.hedgedItem || HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === simulation.hedgeItemId);
    return `
      <div class="simulation-summary">
        <span class="simulation-summary__item">套期交易模拟测算</span>
        <span class="simulation-summary__item">被套期项目：${simulation.hedgeItemId || "-"}</span>
        <span class="simulation-summary__item">类型：${hedgedItem?.type || "-"}</span>
        <span class="simulation-summary__item">币种：${simulation.currency || hedgedItem?.currency || "-"}</span>
        <span class="simulation-summary__item">套期金额：${Number(simulation.hedgeAmount || simulation.scale || 0).toFixed(1)}亿元</span>
        <span class="simulation-summary__item">套期期限：${Number(simulation.hedgeTermMonths || simulation.termMonths || 0).toFixed(0)}个月</span>
        <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}">调整模拟测算</button>
        <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
      </div>
    `;
  }
  const entries = getSimulationEntries(simulation);
  const totalScale = entries.reduce((sum, entry) => sum + Number(entry.scale || 0), 0);
  return `
    <div class="simulation-summary">
      <span class="simulation-summary__item">新业务模拟测算：${entries.length}笔</span>
      <span class="simulation-summary__item">机构：${summarizeSimulationValues(entries, "org")}</span>
      <span class="simulation-summary__item">币种：${summarizeSimulationValues(entries, "currency")}</span>
      <span class="simulation-summary__item">资金方向：${summarizeSimulationValues(entries, "fundingRole")}</span>
      <span class="simulation-summary__item">业务类型：${summarizeSimulationValues(entries, "businessType")}</span>
      <span class="simulation-summary__item">规模合计：${Number(totalScale.toFixed(1))}亿元</span>
      <button class="simulation-summary__link" type="button" data-open-simulation="${pageId}">调整模拟测算</button>
      <button class="simulation-summary__link" type="button" data-clear-simulation="${pageId}">清空场景</button>
    </div>
  `;
}

function renderSimulationEntryForm(page, entry, entryIndex, roleEntryIndex, roleEntryCount) {
  return `
    <section class="simulation-entry" data-simulation-entry="${entryIndex}">
      <div class="simulation-entry__header">
        <h4 class="simulation-entry__title">业务 ${roleEntryIndex + 1}</h4>
        ${roleEntryCount > 1 ? `<button class="simulation-entry__remove" type="button" data-remove-simulation-entry="${entryIndex}">删除</button>` : ""}
      </div>
      <div class="simulation-form simulation-form--entry">
        ${getSimulationVisibleFieldDefs(page).map((field) => renderSimulationField(field, entry, entryIndex)).join("")}
      </div>
    </section>
  `;
}

function renderSimulationRoleSection(page, entries, fundingRole) {
  const roleEntries = entries
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter((item) => item.entry.fundingRole === fundingRole);
  const roleScale = roleEntries.reduce((sum, item) => sum + Number(item.entry.scale || 0), 0);
  const roleClass = fundingRole === "资金来源" ? "source" : "use";
  return `
    <section class="simulation-role-section simulation-role-section--${roleClass}">
      <div class="simulation-role-section__header">
        <div>
          <h4 class="simulation-role-section__title">${fundingRole}</h4>
          <div class="simulation-role-section__meta">共 ${roleEntries.length} 笔 / 合计 ${Number(roleScale.toFixed(1))} 亿元</div>
        </div>
      </div>
      <div class="simulation-role-section__body">
        ${roleEntries.map((item, roleEntryIndex) =>
          renderSimulationEntryForm(page, item.entry, item.entryIndex, roleEntryIndex, roleEntries.length)
        ).join("")}
      </div>
      <div class="simulation-role-section__actions">
        <button class="toolbar-action" type="button" data-add-simulation-entry="${page.id}" data-simulation-entry-role="${fundingRole}">新增${fundingRole}业务</button>
      </div>
    </section>
  `;
}

function renderSimulationModeTabs(page, activeMode) {
  const tabs = getSimulationModeTabs(page);
  if (tabs.length <= 1) return "";
  return `
    <div class="simulation-mode-tabs" role="tablist" aria-label="模拟测算类型">
      ${tabs.map((tab) => `
        <button
          class="simulation-mode-tab ${tab.mode === activeMode ? "is-active" : ""}${tab.module ? " simulation-mode-tab--module" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.mode === activeMode ? "true" : "false"}"
          ${tab.mode ? `data-simulation-mode-tab="${tab.mode}"` : ""}
          ${tab.module ? `data-simulation-module-link="${tab.module}"` : ""}
        >
          ${tab.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderNewBusinessSimulationPanel(page) {
  const draft = appState.simulationDraft || createDefaultSimulationDraft(page);
  const entries = getSimulationDraftEntries(draft, page);
  return `
    <div class="simulation-entry-list">
      ${SIMULATION_FUNDING_ROLE_OPTIONS.map((fundingRole) => renderSimulationRoleSection(page, entries, fundingRole)).join("")}
    </div>
  `;
}

function renderHedgeItemInfo(item) {
  if (!item) {
    return `
      <div class="hedge-selected-card hedge-selected-card--empty">
        <div class="hedge-selected-card__title">请选择被套期项目</div>
        <p>输入项目编号、类型、机构、币种或利率基准后，在下方结果中点击编号即可带出基础信息。</p>
      </div>
    `;
  }
  const rows = [
    ["类型", item.type],
    ["业务类型", item.businessType],
    ["机构", item.org],
    ["币种", item.currency],
    ["余额", `${Number(item.balance).toFixed(1)}亿元`],
    ["利率类型", item.rateType],
    ["利率基准", item.rateBenchmark],
    ["票面/执行利率", item.couponRate],
    ["YTM", item.ytm],
    ["修正久期", item.modifiedDuration],
    ["重定价周期", item.repricingCycle],
    ["原始期限", item.originalTerm],
    ["剩余期限", item.remainingTerm],
    ["下一重定价日", item.nextRepricingDate],
  ].filter((row) => row[1]);
  return `
    <div class="hedge-selected-card">
      <div class="hedge-selected-card__title">${item.id}</div>
      <div class="hedge-info-grid">
        ${rows.map(([label, value]) => `
          <div class="hedge-info-grid__item">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHedgeSearchResults(draft, selectedItem) {
  const results = getHedgeSearchResults(draft);
  return `
    <div class="hedge-search-results">
      <div class="hedge-search-results__header">
        <span>可选被套期项目</span>
        <span>共 ${results.length} 条</span>
      </div>
      <div class="hedge-search-results__list">
        ${results.map((item) => `
          <button
            class="hedge-search-result ${selectedItem?.id === item.id ? "is-selected" : ""}"
            type="button"
            data-select-hedge-item="${item.id}"
          >
            <span class="hedge-search-result__id">${item.id}</span>
            <span>${item.type} / ${item.currency} / ${item.rateBenchmark}</span>
            <strong>${Number(item.balance).toFixed(1)}亿元</strong>
          </button>
        `).join("") || `<div class="hedge-search-results__empty">未匹配到项目，请调整编号或关键词。</div>`}
      </div>
    </div>
  `;
}

function renderHedgeSimulationPanel(page) {
  const draft = getHedgeDraft(page);
  const selectedItem = getSelectedHedgeItem(draft);
  const maxAmount = selectedItem?.balance || HEDGEABLE_ITEM_OPTIONS[0]?.balance || 1;
  return `
    <div class="hedge-simulation-panel">
      <div class="hedge-simulation-grid">
        <div class="hedge-input-card">
          <label class="simulation-form__field">
            <span class="simulation-form__label">被套期项目编号</span>
            <input class="simulation-form__control" data-hedge-simulation-field="query" type="search" value="${draft.query || ""}" placeholder="输入项目编号或关键词" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">本次套期金额（亿元）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeAmount" type="number" min="1" max="${maxAmount}" step="1" value="${draft.hedgeAmount || ""}" />
          </label>
          <label class="simulation-form__field">
            <span class="simulation-form__label">套期期限（月）</span>
            <input class="simulation-form__control" data-hedge-simulation-field="hedgeTermMonths" type="number" min="1" max="360" step="1" value="${draft.hedgeTermMonths || selectedItem?.remainingTermMonths || 12}" />
          </label>
        </div>
        ${renderHedgeItemInfo(selectedItem)}
      </div>
      ${renderHedgeSearchResults(draft, selectedItem)}
    </div>
  `;
}

function renderSimulationModal() {
  const page = data.pages.find((item) => item.id === appState.simulationModalPageId);
  if (!page) {
    simulationModalEl.innerHTML = "";
    simulationModalEl.classList.remove("is-open");
    simulationModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  const activeMode = getSimulationDraftMode(page);
  const activeModeLabel = getSimulationModeLabel(activeMode);
  const applyDisabled = activeMode === SIMULATION_MODE_HEDGE && !getSelectedHedgeItem(getHedgeDraft(page)) ? " disabled" : "";
  simulationModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="simulationModal"></div>
    <section class="overlay-panel overlay-panel--wide" role="dialog" aria-modal="true" aria-labelledby="simulationModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">${activeModeLabel}</div>
          <h3 id="simulationModalTitle">${page.name}模拟测算</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="simulationModal">关闭</button>
      </div>
      ${renderSimulationModeTabs(page, activeMode)}
      ${activeMode === SIMULATION_MODE_HEDGE ? renderHedgeSimulationPanel(page) : renderNewBusinessSimulationPanel(page)}
      <div class="overlay-panel__footer">
        <button class="toolbar-action" type="button" data-close-overlay="simulationModal">取消</button>
        <button class="toolbar-action toolbar-action--primary" type="button" data-apply-simulation="${page.id}"${applyDisabled}>应用测算</button>
      </div>
    </section>
  `;
  simulationModalEl.classList.add("is-open");
  simulationModalEl.setAttribute("aria-hidden", "false");
}

function buildInsightTrendSeries(widget) {
  const labels = inferXAxisLabels(widget);
  const values = buildMetricValues(widget.seq, labels.length, widget.seq * 7);
  return labels.map((label, index) => ({ label, value: Number(values[index] || 0) }));
}

function formatInsightRateText(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function buildTrendInsightStats(series) {
  const values = series.map((item) => Number(item.value || 0));
  const current = values[values.length - 1] || 0;
  const prev = values[Math.max(0, values.length - 2)] || current;
  const yearStart = values[0] || current;
  const mom = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  const ytd = yearStart ? ((current - yearStart) / Math.abs(yearStart)) * 100 : 0;
  const cumulative = values.length > 1 ? ((current - values[0]) / Math.abs(values[0] || 1)) * 100 : 0;
  return {
    current,
    momText: formatInsightRateText(mom),
    yoyText: "同比可比样本暂不完整，建议后续接入真实历史同期数据后补充。",
    ytdText: formatInsightRateText(ytd),
    cumulativeText: formatInsightRateText(cumulative),
  };
}

function buildWidgetInsight(context) {
  const series = buildInsightTrendSeries(context.widget);
  const primaryStats = buildTrendInsightStats(series);
  return `${context.widget.title}当前取值约为 ${primaryStats.current.toFixed(1)}。环比变动 ${primaryStats.momText}，较年初变动 ${primaryStats.ytdText}，区间累计增速 ${primaryStats.cumulativeText}。${primaryStats.yoyText} 综合来看，当前指标位于近期波动区间内，建议结合机构、币种和业务结构进一步定位主要驱动项。`;
}

function renderInsightModal() {
  const target = findWidgetBySeq(appState.insightWidgetSeq);
  if (!target?.widget) {
    insightModalEl.innerHTML = "";
    insightModalEl.classList.remove("is-open");
    insightModalEl.setAttribute("aria-hidden", "true");
    return;
  }
  insightModalEl.innerHTML = `
    <div class="overlay-scrim" data-close-overlay="insightModal"></div>
    <section class="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="insightModalTitle">
      <div class="overlay-panel__header">
        <div>
          <div class="overlay-panel__eyebrow">AI智能分析</div>
          <h3 id="insightModalTitle">${target.widget.title}</h3>
        </div>
        <button class="overlay-panel__close" type="button" data-close-overlay="insightModal">关闭</button>
      </div>
      <div class="insight-panel insight-panel--single">
        <div class="insight-panel__section">
          <h4>智能结论</h4>
          <p>${buildWidgetInsight(target)}</p>
        </div>
      </div>
    </section>
  `;
  insightModalEl.classList.add("is-open");
  insightModalEl.setAttribute("aria-hidden", "false");
}

function getSimulationProfile(page, simulation) {
  const side = simulation.fundingRole === "资金来源"
    ? "liability"
    : simulation.fundingRole === "资金运用"
      ? "asset"
      : BUSINESS_SIDE_MAP[simulation.businessType] || "asset";
  const scaleWeight = Math.min(1.4, Number(simulation.scale || 0) / 120);
  const tenorWeight = Math.min(1.2, Number(simulation.termMonths || 0) / 24);
  const hedgeWeight = simulation.simulationType === SIMULATION_MODE_HEDGE
    ? clampNumber(Number(simulation.hedgeCoverageRatio || 0.35), 0.08, 1)
    : 1;
  return {
    side,
    impactScore: Number((0.08 + scaleWeight * 0.11 + tenorWeight * 0.07) * hedgeWeight).toFixed(3),
  };
}

function shouldRenderSimulationOverlay(widget, chartContext) {
  if (!chartContext?.pageId) return false;
  if (!getPageSimulation(chartContext.pageId)) return false;
  if (!isSimulationPage(data.pages.find((page) => page.id === chartContext.pageId))) return false;
  if (!getWidgetSimulationBehavior(widget)) return false;
  if (String(widget?.componentType || "").includes("表格")) return false;
  if (isDonutWidget(widget) || String(widget?.componentType || "").includes("分布")) return false;
  return true;
}

function getSingleSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const page = data.pages.find((item) => item.id === chartContext.pageId) || getCurrentPage();
  const profile = getSimulationProfile(page, simulation);
  const simulationBehavior = getWidgetSimulationBehavior(widget) || {};
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const simulationModes = SIMULATION_RULE_CONFIG.modes || {};
  const wholesaleLiabilityTypes = WHOLESALE_LIABILITY_TYPES;
  const configuredSensitivity = Number(simulationBehavior.sensitivity);
  let sensitivity = Number.isFinite(configuredSensitivity) ? configuredSensitivity : Number(simulationDefaults.baseSensitivity) || 0.11;
  let direction = 1;
  const isLiabilitySeries = role.includes("liability") || role.includes("负债");
  const isGapSeries = role.includes("gap") || role.includes("差额");
  const isWholesaleLiability = wholesaleLiabilityTypes.includes(simulation.businessType);
  const simulationMode = getSimulationMode(page);
  if (simulationMode === "interest") {
    const modeRule = simulationModes.interest || {};
    direction = profile.side === "asset" ? (modeRule.assetDirection ?? 1) : (modeRule.liabilityDirection ?? -1);
    if (isLiabilitySeries) direction *= -1;
    if (isGapSeries) direction *= profile.side === "asset" ? (modeRule.gapAssetDirection ?? 0.92) : (modeRule.gapLiabilityDirection ?? -0.68);
    if (simulation.rateType === "浮动利率") sensitivity *= Number(simulationDefaults.floatingRateMultiplier) || 0.74;
    if (simulation.simulationType === SIMULATION_MODE_HEDGE) {
      direction *= -1;
      sensitivity *= Number(simulationDefaults.hedgeSensitivityMultiplier) || 0.68;
    }
  } else if (simulationMode === "liquidity") {
    const directionMode = simulationBehavior.directionMode || "default";
    const modeRule = simulationModes.liquidity?.[directionMode] || simulationModes.liquidity?.default || {};
    direction = profile.side === "asset"
      ? (modeRule.assetDirection ?? 0.74)
      : (isWholesaleLiability ? (modeRule.wholesaleLiabilityDirection ?? 0.82) : (modeRule.liabilityDirection ?? -0.42));
  } else {
    const isDomesticCurrency = ["人民币", "全折人民币"].includes(simulation.currency);
    sensitivity *= isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxSensitivityMultiplier) || 0.45)
      : (Number(simulationDefaults.foreignFxSensitivityMultiplier) || 1.14);
    direction = isDomesticCurrency
      ? (Number(simulationDefaults.domesticFxDirection) || 0.34)
      : (Number(simulationDefaults.foreignFxDirection) || 1);
    if (profile.side === "liability" && (seriesLabel || "").includes("负债")) {
      direction *= Number(simulationDefaults.liabilityFxSeriesMultiplier) || 0.82;
    }
  }
  const variationStep = Number(simulationDefaults.variationStep) || 0.035;
  const variation = 1 + (((widget.seq + seriesIndex * 17) % 9) - 4) * variationStep;
  return clampNumber(
    profile.impactScore * sensitivity * direction * variation,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
}

function getSimulationAdjustmentRatio(widget, chartContext, simulation, seriesLabel, seriesIndex = 0, role = "line") {
  const simulationDefaults = SIMULATION_RULE_CONFIG.defaults || {};
  const entries = getSimulationEntries(simulation);
  if (!entries.length) return 0;
  const totalScale = entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.scale || 0)), 0);
  const weightedRatio = entries.reduce((sum, entry) => {
    const weight = Math.max(1, Number(entry.scale || 0)) / totalScale;
    return sum + getSingleSimulationAdjustmentRatio(widget, chartContext, entry, seriesLabel, seriesIndex, role) * weight;
  }, 0);
  return clampNumber(
    weightedRatio,
    Number(simulationDefaults.minAdjustmentRatio) || -0.22,
    Number(simulationDefaults.maxAdjustmentRatio) || 0.22
  );
}

function renderSimulationOverlay(frame, widget, chartContext, seriesDefinitions) {
  if (!shouldRenderSimulationOverlay(widget, chartContext) || !seriesDefinitions?.length) return "";
  const simulation = getPageSimulation(chartContext.pageId);
  const overlays = seriesDefinitions.slice(0, 4).map((definition, index) => {
    const lastPoint = definition.points?.[definition.points.length - 1];
    if (!lastPoint) return "";
    const adjustmentRatio = getSimulationAdjustmentRatio(widget, chartContext, simulation, definition.label, index, definition.role || "line");
    const simulatedY = clampNumber(lastPoint.y - frame.height * adjustmentRatio, frame.top + 8, frame.bottom - 8);
    const labelX = clampNumber(lastPoint.x + 16, frame.left + 16, frame.right - 36);
    const labelY = clampNumber(simulatedY - 12 - index * 10, frame.top + 14, frame.bottom - 10);
    return `
      <line x1="${lastPoint.x}" y1="${lastPoint.y}" x2="${lastPoint.x}" y2="${simulatedY}" stroke="${SIMULATION_COLOR}" stroke-width="2.4" stroke-dasharray="5 4" opacity="0.86"></line>
      <circle cx="${lastPoint.x}" cy="${simulatedY}" r="9" fill="${SIMULATION_FILL}" opacity="0.95"></circle>
      <path d="${buildDiamondPath(lastPoint.x, simulatedY, 5.6)}" fill="${SIMULATION_COLOR}" stroke="#ffffff" stroke-width="1.8"></path>
      ${index < 2 ? `<text x="${labelX}" y="${labelY}" class="chart-simulation-label">模拟</text>` : ""}
    `;
  }).join("");
  return `
    <g class="chart-simulation-overlay">
      ${overlays}
    </g>
  `;
}

function buildDiamondPath(cx, cy, size) {
  return `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
}
