function clearDiagnosticPointPopovers() {
  const hasOpenPopover = Boolean(
    appState.evePointPopover
    || appState.liquidityMetricPointPopover
    || appState.repricingGapPointPopover
    || appState.repricingDurationGapPointPopover
  );
  if (!hasOpenPopover) return false;
  appState.evePointPopover = null;
  appState.liquidityMetricPointPopover = null;
  appState.repricingGapPointPopover = null;
  appState.repricingDurationGapPointPopover = null;
  return true;
}

pageTabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-id]");
  if (!button) return;
  appState.currentPageId = button.dataset.pageId;
  render();
});

globalFilterBarEl.addEventListener("click", (event) => {
  const filterToggle = event.target.closest("[data-filter-toggle]");
  if (filterToggle) {
    const { ownerType, ownerId, filterName } = filterToggle.dataset;
    const key = buildFilterKey(ownerType, ownerId, filterName);
    appState.openFilterKey = appState.openFilterKey === key ? null : key;
    render();
    return;
  }

  const openSimulationButton = event.target.closest("[data-open-simulation]");
  if (openSimulationButton) {
    const pageId = openSimulationButton.dataset.openSimulation || getCurrentPage()?.id;
    openSimulationModal(pageId, openSimulationButton.dataset.simulationWidget);
    render();
    return;
  }
});

if (globalStartInputEl) {
  globalStartInputEl.addEventListener("change", (event) => {
    const defaultEndDate = getDefaultGlobalEndDate();
    appState.globalStartDate = event.target.value || getDefaultGlobalStartDate();
    if (appState.globalStartDate > (appState.globalEndDate || defaultEndDate)) appState.globalEndDate = appState.globalStartDate;
    render();
  });
}

if (globalEndInputEl) {
  globalEndInputEl.addEventListener("change", (event) => {
    const defaultEndDate = getDefaultGlobalEndDate();
    appState.globalEndDate = event.target.value || defaultEndDate;
    if (appState.globalEndDate > defaultEndDate) appState.globalEndDate = defaultEndDate;
    if (appState.globalEndDate < (appState.globalStartDate || getDefaultGlobalStartDate())) appState.globalStartDate = appState.globalEndDate;
    render();
  });
}

dashboardViewEl.addEventListener("click", (event) => {
  const methodologyButton = event.target.closest("[data-open-business-methodology]");
  if (methodologyButton) {
    appState.businessMethodologyModal = {
      widgetSeq: Number(methodologyButton.dataset.widgetSeq || 0),
      methodologyKey: methodologyButton.dataset.methodologyKey || "",
      analysisPerspective: getActiveAnalysisPerspective(),
    };
    renderBusinessChangeMethodologyModal();
    return;
  }

  const perspectiveButton = event.target.closest("[data-analysis-perspective]");
  if (perspectiveButton) {
    const { analysisPerspective, pageId } = perspectiveButton.dataset;
    appState.pageAnalysisPerspectives[pageId] = analysisPerspective;
    appState.businessDrilldowns = {};
    Object.keys(WIDGET_BEHAVIOR_CONFIG)
      .filter((widgetSeq) => WIDGET_BEHAVIOR_CONFIG[widgetSeq]?.chartKind === "businessScaleGrowth")
      .forEach((widgetSeq) => {
        const widgetState = { ...(appState.widgetFilters[widgetSeq] || {}) };
        delete widgetState["业务类型"];
        delete widgetState.__legend_series__;
        appState.widgetFilters[widgetSeq] = widgetState;
      });
    render();
    return;
  }

  const repricingMaturityCell = event.target.closest("[data-repricing-maturity-cell]");
  if (repricingMaturityCell) {
    const { widgetSeq, bucket, bucketIndex, businessType } = repricingMaturityCell.dataset;
    appState.repricingMaturityDrilldowns = {
      ...appState.repricingMaturityDrilldowns,
      [widgetSeq]: {
        bucket,
        bucketIndex: Number(bucketIndex || 0),
        businessType,
      },
    };
    render();
    return;
  }

  const futureFundingFlowCell = event.target.closest("[data-future-funding-flow-cell]");
  if (futureFundingFlowCell) {
    const { widgetSeq, date, label, businessType } = futureFundingFlowCell.dataset;
    appState.futureFundingFlowDrilldowns = {
      ...appState.futureFundingFlowDrilldowns,
      [widgetSeq]: {
        date,
        label,
        businessType,
      },
    };
    render();
    return;
  }

  const liquidityPoint = event.target.closest("[data-liquidity-point]");
  if (liquidityPoint) {
    appState.evePointPopover = null;
    appState.repricingGapPointPopover = null;
    appState.repricingDurationGapPointPopover = null;
    appState.liquidityMetricPointPopover = {
      widgetSeq: Number(liquidityPoint.dataset.widgetSeq || 0),
      kind: liquidityPoint.dataset.liquidityKind || "",
      dateIndex: Number(liquidityPoint.dataset.dateIndex || 0),
      labels: String(liquidityPoint.dataset.liquidityLabels || "").split("||").filter(Boolean),
      signature: Number(liquidityPoint.dataset.liquiditySignature || 0),
    };
    render();
    return;
  }

  const openLiquidityProcessButton = event.target.closest("[data-open-liquidity-process]");
  if (openLiquidityProcessButton) {
    const sourceState = appState.liquidityMetricPointPopover || {};
    appState.liquidityProcessModal = {
      widgetSeq: Number(openLiquidityProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 42),
      kind: openLiquidityProcessButton.dataset.liquidityKind || sourceState.kind || "",
      dateIndex: Number(openLiquidityProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openLiquidityProcessButton.dataset.liquidityLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openLiquidityProcessButton.dataset.liquiditySignature || sourceState.signature || 0),
      comparisonIndex: null,
      activeNode: "ratio",
      numeratorExpanded: false,
      denominatorExpanded: false,
      detailExpandedNode: "",
    };
    appState.liquidityMetricPointPopover = null;
    render();
    return;
  }

  const repricingGapPoint = event.target.closest("[data-repricing-gap-point]");
  if (repricingGapPoint) {
    appState.evePointPopover = null;
    appState.liquidityMetricPointPopover = null;
    appState.repricingDurationGapPointPopover = null;
    appState.repricingGapPointPopover = {
      widgetSeq: Number(repricingGapPoint.dataset.widgetSeq || 0),
      sourceSeq: Number(repricingGapPoint.dataset.sourceWidgetSeq || repricingGapPoint.dataset.widgetSeq || 9),
      dateIndex: Number(repricingGapPoint.dataset.dateIndex || 0),
      labels: String(repricingGapPoint.dataset.repricingGapLabels || "").split("||").filter(Boolean),
      signature: Number(repricingGapPoint.dataset.repricingGapSignature || 0),
    };
    render();
    return;
  }

  const repricingDurationGapPoint = event.target.closest("[data-repricing-duration-gap-point]");
  if (repricingDurationGapPoint) {
    appState.evePointPopover = null;
    appState.liquidityMetricPointPopover = null;
    appState.repricingGapPointPopover = null;
    appState.repricingDurationGapPointPopover = {
      widgetSeq: Number(repricingDurationGapPoint.dataset.widgetSeq || 15),
      dateIndex: Number(repricingDurationGapPoint.dataset.dateIndex || 0),
      labels: String(repricingDurationGapPoint.dataset.repricingDurationGapLabels || "").split("||").filter(Boolean),
      signature: Number(repricingDurationGapPoint.dataset.repricingDurationGapSignature || 0),
    };
    render();
    return;
  }

  const openRepricingDurationGapProcessButton = event.target.closest("[data-open-repricing-duration-gap-process]");
  if (openRepricingDurationGapProcessButton) {
    const sourceState = appState.repricingDurationGapPointPopover || {};
    appState.repricingDurationGapProcessModal = {
      widgetSeq: Number(openRepricingDurationGapProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 15),
      dateIndex: Number(openRepricingDurationGapProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openRepricingDurationGapProcessButton.dataset.repricingDurationGapLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openRepricingDurationGapProcessButton.dataset.repricingDurationGapSignature || sourceState.signature || 0),
      comparisonIndex: null,
      activeNode: "duration-gap",
      assetExpanded: false,
      liabilityExpanded: false,
    };
    appState.repricingDurationGapPointPopover = null;
    render();
    return;
  }

  const openRepricingGapProcessButton = event.target.closest("[data-open-repricing-gap-process]");
  if (openRepricingGapProcessButton) {
    const sourceState = appState.repricingGapPointPopover || {};
    appState.repricingGapProcessModal = {
      widgetSeq: Number(openRepricingGapProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 0),
      sourceSeq: Number(openRepricingGapProcessButton.dataset.sourceWidgetSeq || sourceState.sourceSeq || 9),
      dateIndex: Number(openRepricingGapProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openRepricingGapProcessButton.dataset.repricingGapLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openRepricingGapProcessButton.dataset.repricingGapSignature || sourceState.signature || 0),
      comparisonIndex: null,
      activeNode: "ratio",
      numeratorExpanded: false,
      denominatorExpanded: false,
      detailExpandedNodes: [],
    };
    appState.repricingGapPointPopover = null;
    render();
    return;
  }

  const evePoint = event.target.closest("[data-eve-point]");
  if (evePoint) {
    appState.liquidityMetricPointPopover = null;
    appState.repricingGapPointPopover = null;
    appState.repricingDurationGapPointPopover = null;
    appState.evePointPopover = {
      widgetSeq: Number(evePoint.dataset.widgetSeq || EVE_RATIO_WIDGET_SEQ),
      dateIndex: Number(evePoint.dataset.dateIndex || 0),
      labels: String(evePoint.dataset.eveLabels || "").split("||").filter(Boolean),
      signature: Number(evePoint.dataset.eveSignature || 0),
    };
    render();
    return;
  }

  const openEveProcessButton = event.target.closest("[data-open-eve-process]");
  if (openEveProcessButton) {
    const sourceState = appState.evePointPopover || {};
    appState.eveProcessModal = {
      widgetSeq: Number(openEveProcessButton.dataset.widgetSeq || sourceState.widgetSeq || EVE_RATIO_WIDGET_SEQ),
      dateIndex: Number(openEveProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openEveProcessButton.dataset.eveLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openEveProcessButton.dataset.eveSignature || sourceState.signature || 0),
      comparisonIndex: null,
      activeNode: "eve",
      numeratorExpanded: false,
      denominatorExpanded: false,
    };
    appState.evePointPopover = null;
    render();
    return;
  }

  const subtabButton = event.target.closest("[data-area-subtab]");
  if (subtabButton) {
    const { areaSubtab, tabName } = subtabButton.dataset;
    appState.areaSubpages[areaSubtab] = tabName;
    render();
    return;
  }

  const modeButton = event.target.closest("[data-widget-mode]");
  if (modeButton) {
    const { widgetMode, mode } = modeButton.dataset;
    appState.widgetDisplayModes[widgetMode] = mode;
    render();
    return;
  }

  const maturityStructureTab = event.target.closest("[data-maturity-structure-tab]");
  if (maturityStructureTab) {
    const { maturityStructureTab: widgetSeq, maturityStructureScope } = maturityStructureTab.dataset;
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      __maturity_structure_scope__: [maturityStructureScope === "future" ? "future" : "historical"],
    };
    render();
    return;
  }

  const openBusinessDetailButton = event.target.closest("[data-open-business-detail]");
  if (openBusinessDetailButton) {
    const { targetWidgetSeq, sourceWidgetSeq, businessType, businessCategory, maturityTableScope } = openBusinessDetailButton.dataset;
    if (!targetWidgetSeq || !businessType) return;
    appState.businessDrilldowns = {
      ...appState.businessDrilldowns,
      [targetWidgetSeq]: {
        businessType,
        category: businessCategory,
        sourceWidgetSeq: Number(sourceWidgetSeq),
        maturityTableScope: maturityTableScope || "",
      },
    };
    render();
    window.requestAnimationFrame(() => {
      dashboardViewEl.querySelector(`[data-widget-seq="${targetWidgetSeq}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  const clearBusinessDetailButton = event.target.closest("[data-clear-business-drilldown]");
  if (clearBusinessDetailButton) {
    const nextDrilldowns = { ...(appState.businessDrilldowns || {}) };
    delete nextDrilldowns[clearBusinessDetailButton.dataset.clearBusinessDrilldown];
    appState.businessDrilldowns = nextDrilldowns;
    render();
    return;
  }

  const openSimulationButton = event.target.closest("[data-open-simulation]");
  if (openSimulationButton) {
    const pageId = openSimulationButton.dataset.openSimulation || getCurrentPage()?.id;
    openSimulationModal(pageId, openSimulationButton.dataset.simulationWidget);
    render();
    return;
  }

  const clearSimulationButton = event.target.closest("[data-clear-simulation]");
  if (clearSimulationButton) {
    delete appState.pageSimulations[clearSimulationButton.dataset.clearSimulation];
    render();
    return;
  }

  const openInsightButton = event.target.closest("[data-open-insight]");
  if (openInsightButton) {
    appState.insightWidgetSeq = Number(openInsightButton.dataset.openInsight);
    render();
    return;
  }

  const filterToggle = event.target.closest("[data-filter-toggle]");
  if (filterToggle) {
    const { ownerType, ownerId, filterName } = filterToggle.dataset;
    const key = buildFilterKey(ownerType, ownerId, filterName);
    appState.openFilterKey = appState.openFilterKey === key ? null : key;
    render();
    return;
  }

  const filterOption = event.target.closest("[data-filter-option]");
  if (filterOption) {
    const { ownerType, ownerId, filterName, filterValue } = filterOption.dataset;
    const stateBucket = getFilterStateBucket(ownerType, ownerId);
    const current = new Set(stateBucket[filterName] || []);
    if (current.has(filterValue)) current.delete(filterValue);
    else current.add(filterValue);
    stateBucket[filterName] = current.size ? Array.from(current) : [filterValue];
    appState.openFilterKey = buildFilterKey(ownerType, ownerId, filterName);
    if (ownerType === "page") appState.pageFilters[ownerId] = stateBucket;
    else if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
    else appState.areaFilters[ownerId] = stateBucket;
    render();
    return;
  }

  const segmentedFilter = event.target.closest("[data-segmented-filter]");
  if (segmentedFilter) {
    const { widgetSeq, filterName, filterValue } = segmentedFilter.dataset;
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      [filterName]: [filterValue],
    };
    render();
    return;
  }

  const legendToggle = event.target.closest("[data-legend-toggle]");
  if (legendToggle) {
    const { widgetSeq, filterName, filterValue, legendKey } = legendToggle.dataset;
    if (legendKey) {
      const legendItems = Array.from(
        dashboardViewEl.querySelectorAll(`[data-widget-seq="${widgetSeq}"][data-legend-key="${legendKey}"]`)
      );
      const allOptions = legendItems.map((item) => item.dataset.filterValue).filter(Boolean);
      const visibleSelection = legendItems
        .filter((item) => item.classList.contains("is-selected"))
        .map((item) => item.dataset.filterValue)
        .filter(Boolean);
      toggleLegendSelection(widgetSeq, legendKey, filterValue, allOptions, visibleSelection);
      render();
      return;
    }
    const widgetState = appState.widgetFilters[widgetSeq] || {};
    const widgetBehavior = getWidgetBehavior({ seq: Number(widgetSeq) });
    const filterConfig = widgetBehavior.localFilters.find((item) => item.name === filterName);
    const allOptions = (filterConfig?.options || []).filter(Boolean);
    const current = new Set((widgetState[filterName] || allOptions).filter(Boolean));
    if (current.has(filterValue)) {
      if (current.size > 1) current.delete(filterValue);
    } else {
      current.add(filterValue);
    }
    appState.widgetFilters[widgetSeq] = {
      ...widgetState,
      [filterName]: Array.from(current),
    };
    render();
    return;
  }

});

document.addEventListener("click", (event) => {
  if (event.target.closest([
    "[data-eve-point]",
    "[data-liquidity-point]",
    "[data-repricing-gap-point]",
    "[data-repricing-duration-gap-point]",
    ".eve-point-popover",
  ].join(","))) return;
  if (clearDiagnosticPointPopovers()) render();
});

dashboardViewEl.addEventListener("change", (event) => {
  const dateField = event.target.closest("[data-inline-date-filter]");
  if (!dateField) return;
  const { widgetSeq, filterName, rangeIndex } = dateField.dataset;
  const widgetState = appState.widgetFilters[widgetSeq] || {};
  const nextRange = normalizeWidgetBusinessStructureDateRange(widgetSeq, widgetState[filterName], null, filterName);
  nextRange[Number(rangeIndex)] = dateField.value || nextRange[Number(rangeIndex)];
  if (rangeIndex === "0" && nextRange[0] > nextRange[1]) nextRange[1] = nextRange[0];
  if (rangeIndex === "1" && nextRange[1] < nextRange[0]) nextRange[0] = nextRange[1];
  appState.widgetFilters[widgetSeq] = {
    ...widgetState,
    [filterName]: normalizeWidgetBusinessStructureDateRange(widgetSeq, nextRange, Number(rangeIndex), filterName),
  };
  render();
});

simulationModalEl.addEventListener("input", (event) => {
  const liquidityBaseCell = event.target.closest("[data-liquidity-gap-base-cell]");
  if (liquidityBaseCell) {
    const draft = getLiquidityGapSimulationDraft();
    const businessType = liquidityBaseCell.dataset.businessType;
    const bucketIndex = Number(liquidityBaseCell.dataset.bucketIndex || 0);
    const nextMatrix = cloneLiquidityCashFlowGapMatrix(draft.baseMatrix);
    nextMatrix[businessType][bucketIndex] = Number(liquidityBaseCell.value || 0);
    appState.simulationDraft = { ...draft, baseEdited: true, baseMatrix: nextMatrix };
    return;
  }
  const liquidityField = event.target.closest("[data-liquidity-gap-simulation-field]");
  if (liquidityField) {
    const draft = getLiquidityGapSimulationDraft();
    const entryIndex = Number(liquidityField.dataset.liquidityGapEntryIndex || 0);
    const fieldName = liquidityField.dataset.liquidityGapSimulationField;
    const entries = draft.entries.map((entry, index) => {
      if (index !== entryIndex) return entry;
      const nextEntry = { ...entry, [fieldName]: liquidityField.value };
      if (fieldName === "occurrenceDate") {
        const minimumCashFlowDate = [addDays(draft.baseDate, 1), liquidityField.value].filter(Boolean).sort().at(-1);
        nextEntry.cashFlows = (entry.cashFlows || []).map((cashFlow) => ({
          ...cashFlow,
          date: cashFlow.date && cashFlow.date >= minimumCashFlowDate ? cashFlow.date : minimumCashFlowDate,
        }));
      }
      return nextEntry;
    });
    appState.simulationDraft = { ...draft, entries };
    return;
  }
  const liquidityCashFlowField = event.target.closest("[data-liquidity-cash-flow-field]");
  if (liquidityCashFlowField) {
    const draft = getLiquidityGapSimulationDraft();
    const entryIndex = Number(liquidityCashFlowField.dataset.liquidityGapEntryIndex || 0);
    const cashFlowIndex = Number(liquidityCashFlowField.dataset.liquidityCashFlowIndex || 0);
    const fieldName = liquidityCashFlowField.dataset.liquidityCashFlowField;
    const entries = draft.entries.map((entry, index) => index === entryIndex
      ? {
        ...entry,
        cashFlows: (entry.cashFlows || []).map((cashFlow, index) => index === cashFlowIndex
          ? { ...cashFlow, [fieldName]: liquidityCashFlowField.value }
          : cashFlow),
      }
      : entry
    );
    appState.simulationDraft = { ...draft, entries };
    return;
  }
  const baseCell = event.target.closest("[data-repricing-base-cell]");
  if (baseCell) {
    const draft = getRepricingGapSimulationDraft();
    const businessType = baseCell.dataset.businessType;
    const bucketIndex = Number(baseCell.dataset.bucketIndex || 0);
    const nextMatrix = cloneRepricingGapMatrix(draft.baseMatrix);
    nextMatrix[businessType][bucketIndex] = Number(baseCell.value || 0);
    appState.simulationDraft = { ...draft, baseEdited: true, baseMatrix: nextMatrix };
    return;
  }
  const repricingField = event.target.closest("[data-repricing-simulation-field]");
  if (repricingField) {
    const draft = getRepricingGapSimulationDraft();
    const entryIndex = Number(repricingField.dataset.repricingSimulationEntryIndex || 0);
    const fieldName = repricingField.dataset.repricingSimulationField;
    const entries = draft.entries.map((entry, index) => {
      if (index !== entryIndex) return entry;
      const nextEntry = { ...entry, [fieldName]: repricingField.value };
      if (["occurrenceDate", "repricingMonths"].includes(fieldName) && nextEntry.occurrenceDate) {
        nextEntry.nextRepricingDate = addMonthsDateValue(
          nextEntry.occurrenceDate,
          Number(nextEntry.repricingMonths || 1)
        );
      }
      return nextEntry;
    });
    appState.simulationDraft = { ...draft, entries };
    return;
  }
  const field = event.target.closest("[data-simulation-field]");
  if (field) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const entryIndex = Number(field.dataset.simulationEntryIndex || 0);
    appState.simulationDraft = {
      entries: updateSimulationEntryField(page, entries, entryIndex, field.dataset.simulationField, field.value),
    };
    return;
  }
  const hedgeField = event.target.closest("[data-hedge-simulation-field]");
  if (!hedgeField) return;
  appState.hedgeSimulationDraft = {
    ...getHedgeDraft(),
    [hedgeField.dataset.hedgeSimulationField]: hedgeField.value,
  };
  if (hedgeField.dataset.hedgeSimulationField === "query") {
    window.setTimeout(renderSimulationModal, 0);
  }
});

simulationModalEl.addEventListener("change", (event) => {
  const liquidityBaseDate = event.target.closest("[data-liquidity-gap-base-date]");
  if (liquidityBaseDate) {
    const draft = getLiquidityGapSimulationDraft();
    const nextBaseDate = liquidityBaseDate.value || getLiquidityGapSimulationCurrentDate();
    const shouldRegenerateBase = ["current", "runoff"].includes(draft.baseSource) && !draft.baseEdited;
    appState.simulationDraft = {
      ...draft,
      baseDate: nextBaseDate,
      baseMatrix: shouldRegenerateBase
        ? buildLiquidityCashFlowGapBaseMatrix(draft.baseSource, nextBaseDate)
        : draft.baseMatrix,
    };
    renderSimulationModal();
    return;
  }
  const liquidityBaseUpload = event.target.closest("[data-liquidity-gap-base-upload]");
  if (liquidityBaseUpload) {
    const file = liquidityBaseUpload.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      applyLiquidityGapUploadedCsv(text, file.name);
      renderSimulationModal();
    });
    return;
  }
  const liquidityBaseCell = event.target.closest("[data-liquidity-gap-base-cell]");
  if (liquidityBaseCell) {
    renderSimulationModal();
    return;
  }
  const liquidityField = event.target.closest("[data-liquidity-gap-simulation-field], [data-liquidity-cash-flow-field]");
  if (liquidityField) {
    renderSimulationModal();
    return;
  }
  const baseDate = event.target.closest("[data-repricing-base-date]");
  if (baseDate) {
    const draft = getRepricingGapSimulationDraft();
    const nextBaseDate = getMonthEndDateValue(baseDate.value || getDefaultRepricingGapTargetDate());
    const shouldRegenerateBase = ["current", "runoff"].includes(draft.baseSource) && !draft.baseEdited;
    appState.simulationDraft = {
      ...draft,
      baseDate: nextBaseDate,
      baseMatrix: shouldRegenerateBase
        ? buildRepricingGapBaseMatrix(draft.baseSource, nextBaseDate)
        : draft.baseMatrix,
    };
    renderSimulationModal();
    return;
  }
  const baseUpload = event.target.closest("[data-repricing-base-upload]");
  if (baseUpload) {
    const file = baseUpload.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      applyRepricingGapUploadedCsv(text, file.name);
      renderSimulationModal();
    });
    return;
  }
  const baseCell = event.target.closest("[data-repricing-base-cell]");
  if (baseCell) {
    renderSimulationModal();
    return;
  }
  const repricingField = event.target.closest("[data-repricing-simulation-field]");
  if (repricingField) {
    renderSimulationModal();
    return;
  }
  const field = event.target.closest("[data-simulation-field]");
  if (field) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const entryIndex = Number(field.dataset.simulationEntryIndex || 0);
    appState.simulationDraft = {
      entries: updateSimulationEntryField(page, entries, entryIndex, field.dataset.simulationField, field.value),
    };
    if (["fundingRole", "scale"].includes(field.dataset.simulationField)) window.setTimeout(renderSimulationModal, 0);
    return;
  }
  const hedgeField = event.target.closest("[data-hedge-simulation-field]");
  if (!hedgeField) return;
  appState.hedgeSimulationDraft = {
    ...getHedgeDraft(),
    [hedgeField.dataset.hedgeSimulationField]: hedgeField.value,
  };
  if (hedgeField.dataset.hedgeSimulationField === "query") {
    window.setTimeout(renderSimulationModal, 0);
  }
});

simulationModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='simulationModal']");
  if (closeButton) {
    closeSimulationModal();
    render();
    return;
  }
  const liquidityQuickConfigButton = event.target.closest("[data-liquidity-gap-quick-config]");
  if (liquidityQuickConfigButton) {
    const source = normalizeLiquidityGapBaseSource(liquidityQuickConfigButton.dataset.liquidityGapQuickConfig);
    const draft = getLiquidityGapSimulationDraft();
    appState.simulationDraft = {
      ...draft,
      baseSource: source,
      baseMatrix: buildLiquidityCashFlowGapBaseMatrix(source, draft.baseDate),
      uploadFileName: "",
      baseEdited: false,
    };
    renderSimulationModal();
    return;
  }
  const addLiquidityEntryButton = event.target.closest("[data-add-liquidity-gap-entry]");
  if (addLiquidityEntryButton) {
    const draft = getLiquidityGapSimulationDraft();
    appState.simulationDraft = {
      ...draft,
      entries: [...draft.entries, createDefaultLiquidityGapSimulationEntry(draft.baseDate)],
    };
    renderSimulationModal();
    return;
  }
  const removeLiquidityEntryButton = event.target.closest("[data-remove-liquidity-gap-entry]");
  if (removeLiquidityEntryButton) {
    const draft = getLiquidityGapSimulationDraft();
    const removeIndex = Number(removeLiquidityEntryButton.dataset.removeLiquidityGapEntry);
    appState.simulationDraft = { ...draft, entries: draft.entries.filter((_, index) => index !== removeIndex) };
    renderSimulationModal();
    return;
  }
  const addLiquidityCashFlowButton = event.target.closest("[data-add-liquidity-cash-flow]");
  if (addLiquidityCashFlowButton) {
    const draft = getLiquidityGapSimulationDraft();
    const entryIndex = Number(addLiquidityCashFlowButton.dataset.addLiquidityCashFlow || 0);
    const entries = draft.entries.map((entry, index) => {
      if (index !== entryIndex) return entry;
      const cashFlows = entry.cashFlows || [];
      const latestDate = cashFlows.map((cashFlow) => cashFlow.date).filter(Boolean).sort().at(-1)
        || entry.occurrenceDate
        || addDays(draft.baseDate, 1);
      const nextDate = addDays(latestDate, 30) > addDays(draft.baseDate, 365)
        ? addDays(draft.baseDate, 365)
        : addDays(latestDate, 30);
      return { ...entry, cashFlows: [...cashFlows, { date: nextDate, amount: "0" }] };
    });
    appState.simulationDraft = { ...draft, entries };
    renderSimulationModal();
    return;
  }
  const removeLiquidityCashFlowButton = event.target.closest("[data-remove-liquidity-cash-flow]");
  if (removeLiquidityCashFlowButton) {
    const draft = getLiquidityGapSimulationDraft();
    const entryIndex = Number(removeLiquidityCashFlowButton.dataset.liquidityGapEntryIndex || 0);
    const cashFlowIndex = Number(removeLiquidityCashFlowButton.dataset.removeLiquidityCashFlow || 0);
    const entries = draft.entries.map((entry, index) => index === entryIndex
      ? { ...entry, cashFlows: (entry.cashFlows || []).filter((_, index) => index !== cashFlowIndex) }
      : entry
    );
    appState.simulationDraft = { ...draft, entries };
    renderSimulationModal();
    return;
  }
  const quickConfigButton = event.target.closest("[data-repricing-quick-config]");
  if (quickConfigButton) {
    const source = normalizeRepricingGapBaseSource(quickConfigButton.dataset.repricingQuickConfig);
    const draft = getRepricingGapSimulationDraft();
    appState.simulationDraft = {
      ...draft,
      baseSource: source,
      baseMatrix: buildRepricingGapBaseMatrix(source, draft.baseDate),
      uploadFileName: "",
      baseEdited: false,
    };
    renderSimulationModal();
    return;
  }
  const addRepricingEntryButton = event.target.closest("[data-add-repricing-simulation-entry]");
  if (addRepricingEntryButton) {
    const draft = getRepricingGapSimulationDraft();
    appState.simulationDraft = {
      ...draft,
      entries: [...draft.entries, createDefaultRepricingGapSimulationEntry(draft.baseDate)],
    };
    renderSimulationModal();
    return;
  }
  const removeRepricingEntryButton = event.target.closest("[data-remove-repricing-simulation-entry]");
  if (removeRepricingEntryButton) {
    const draft = getRepricingGapSimulationDraft();
    const removeIndex = Number(removeRepricingEntryButton.dataset.removeRepricingSimulationEntry);
    appState.simulationDraft = { ...draft, entries: draft.entries.filter((_, index) => index !== removeIndex) };
    renderSimulationModal();
    return;
  }
  const moduleLink = event.target.closest("[data-simulation-module-link]");
  if (moduleLink) {
    window.dispatchEvent(new CustomEvent("risk-dashboard:simulation-module-request", {
      detail: {
        module: moduleLink.dataset.simulationModuleLink,
        pageId: appState.simulationModalPageId,
      },
    }));
    return;
  }
  const modeTab = event.target.closest("[data-simulation-mode-tab]");
  if (modeTab) {
    appState.simulationDraftMode = modeTab.dataset.simulationModeTab;
    renderSimulationModal();
    return;
  }
  const selectHedgeItemButton = event.target.closest("[data-select-hedge-item]");
  if (selectHedgeItemButton) {
    const selectedItem = HEDGEABLE_ITEM_OPTIONS.find((item) => item.id === selectHedgeItemButton.dataset.selectHedgeItem);
    if (!selectedItem) return;
    const draft = getHedgeDraft();
    const hedgeAmount = clampNumber(Number(draft.hedgeAmount || Math.min(50, selectedItem.balance)), 1, selectedItem.balance);
    appState.hedgeSimulationDraft = {
      ...draft,
      query: selectedItem.id,
      selectedItemId: selectedItem.id,
      hedgeAmount: String(hedgeAmount),
      hedgeTermMonths: String(draft.hedgeTermMonths || selectedItem.remainingTermMonths || 12),
    };
    renderSimulationModal();
    return;
  }
  const addEntryButton = event.target.closest("[data-add-simulation-entry]");
  if (addEntryButton) {
    const page = data.pages.find((item) => item.id === addEntryButton.dataset.addSimulationEntry) || getCurrentPage();
    const entries = getSimulationDraftEntries(appState.simulationDraft, page);
    const fundingRole = addEntryButton.dataset.simulationEntryRole || getDefaultSimulationFundingRole(entries.length);
    appState.simulationDraft = { entries: [...entries, createDefaultSimulationEntry(page, entries.length, fundingRole)] };
    renderSimulationModal();
    return;
  }
  const removeEntryButton = event.target.closest("[data-remove-simulation-entry]");
  if (removeEntryButton) {
    const page = data.pages.find((item) => item.id === appState.simulationModalPageId) || getCurrentPage();
    const removeIndex = Number(removeEntryButton.dataset.removeSimulationEntry);
    const entries = getSimulationDraftEntries(appState.simulationDraft, page).filter((_, index) => index !== removeIndex);
    appState.simulationDraft = { entries: ensureMinimumSimulationEntries(page, entries) };
    renderSimulationModal();
    return;
  }
  const applyButton = event.target.closest("[data-apply-simulation]");
  if (applyButton) {
    const page = data.pages.find((item) => item.id === applyButton.dataset.applySimulation) || getCurrentPage();
    appState.pageSimulations[page.id] = isRepricingGapSimulationWidget(appState.simulationModalWidgetSeq)
      ? normalizeRepricingGapSimulationScenario(page)
      : isLiquidityGapSimulationWidget(appState.simulationModalWidgetSeq)
        ? normalizeLiquidityGapSimulationScenario(page)
        : getSimulationDraftMode(page) === SIMULATION_MODE_HEDGE
          ? normalizeHedgeSimulationScenario(page, getHedgeDraft(page))
          : normalizeSimulationScenario(page, appState.simulationDraft || createDefaultSimulationDraft(page));
    closeSimulationModal();
    render();
  }
});

insightModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='insightModal']");
  if (!closeButton) return;
  appState.insightWidgetSeq = null;
  render();
});

eveProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-eve-process-date-slider]");
  if (!slider || !appState.eveProcessModal) return;
  const dateIndex = Number(slider.value || 0);
  const comparisonIndex = appState.eveProcessModal.comparisonIndex;
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    dateIndex,
    comparisonIndex: Number.isInteger(comparisonIndex) && comparisonIndex < dateIndex
      ? comparisonIndex
      : null,
  };
  renderEveProcessModal();
});

eveProcessModalEl.addEventListener("change", (event) => {
  const select = event.target.closest("[data-eve-process-comparison]");
  if (!select || !appState.eveProcessModal) return;
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    comparisonIndex: select.value === "" ? null : Number(select.value),
  };
  renderEveProcessModal();
});

eveProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='eveProcessModal']");
  if (closeButton) {
    appState.eveProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-eve-process-node]");
  if (!nodeButton || !appState.eveProcessModal) return;
  const nodeKey = nodeButton.dataset.eveProcessNode;
  const collapseNumerator = nodeKey === "numerator" && appState.eveProcessModal.numeratorExpanded;
  const collapseDenominator = nodeKey === "denominator" && appState.eveProcessModal.denominatorExpanded;
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    activeNode: collapseNumerator || collapseDenominator ? "eve" : nodeKey,
    numeratorExpanded: nodeKey === "numerator"
      ? !appState.eveProcessModal.numeratorExpanded
      : appState.eveProcessModal.numeratorExpanded,
    denominatorExpanded: nodeKey === "denominator"
      ? !appState.eveProcessModal.denominatorExpanded
      : appState.eveProcessModal.denominatorExpanded,
  };
  renderEveProcessModal();
});

liquidityProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-liquidity-process-date-slider]");
  if (!slider || !appState.liquidityProcessModal) return;
  const dateIndex = Number(slider.value || 0);
  const comparisonIndex = appState.liquidityProcessModal.comparisonIndex;
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    dateIndex,
    comparisonIndex: Number.isInteger(comparisonIndex) && comparisonIndex < dateIndex
      ? comparisonIndex
      : null,
  };
  renderLiquidityProcessModal();
});

liquidityProcessModalEl.addEventListener("change", (event) => {
  const select = event.target.closest("[data-liquidity-process-comparison]");
  if (!select || !appState.liquidityProcessModal) return;
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    comparisonIndex: select.value === "" ? null : Number(select.value),
  };
  renderLiquidityProcessModal();
});

liquidityProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='liquidityProcessModal']");
  if (closeButton) {
    appState.liquidityProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-liquidity-process-node]");
  if (!nodeButton || !appState.liquidityProcessModal) return;
  const nodeKey = nodeButton.dataset.liquidityProcessNode;
  const collapseNumerator = nodeKey === "numerator" && appState.liquidityProcessModal.numeratorExpanded;
  const collapseDenominator = nodeKey === "denominator" && appState.liquidityProcessModal.denominatorExpanded;
  const detailExpandedNode = appState.liquidityProcessModal.detailExpandedNode || "";
  let nextDetailExpandedNode = detailExpandedNode;
  if (nodeKey === "raw-net-outflow") {
    nextDetailExpandedNode = detailExpandedNode === nodeKey ? "" : nodeKey;
  } else if (nodeKey === "cumulative-maturity-gap") {
    nextDetailExpandedNode = ["cumulative-maturity-gap", "maturity-gap"].includes(detailExpandedNode) ? "" : nodeKey;
  } else if (nodeKey === "maturity-gap") {
    nextDetailExpandedNode = detailExpandedNode === nodeKey ? "cumulative-maturity-gap" : nodeKey;
  } else if (collapseNumerator || collapseDenominator) {
    nextDetailExpandedNode = "";
  }
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    activeNode: collapseNumerator || collapseDenominator ? "ratio" : nodeKey,
    numeratorExpanded: nodeKey === "numerator"
      ? !appState.liquidityProcessModal.numeratorExpanded
      : appState.liquidityProcessModal.numeratorExpanded,
    denominatorExpanded: nodeKey === "denominator"
      ? !appState.liquidityProcessModal.denominatorExpanded
      : appState.liquidityProcessModal.denominatorExpanded,
    detailExpandedNode: nextDetailExpandedNode,
  };
  renderLiquidityProcessModal();
});

repricingGapProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-repricing-gap-process-date-slider]");
  if (!slider || !appState.repricingGapProcessModal) return;
  const dateIndex = Number(slider.value || 0);
  const comparisonIndex = appState.repricingGapProcessModal.comparisonIndex;
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    dateIndex,
    comparisonIndex: Number.isInteger(comparisonIndex) && comparisonIndex < dateIndex
      ? comparisonIndex
      : null,
  };
  renderRepricingGapProcessModal();
});

repricingGapProcessModalEl.addEventListener("change", (event) => {
  const select = event.target.closest("[data-repricing-gap-process-comparison]");
  if (!select || !appState.repricingGapProcessModal) return;
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    comparisonIndex: select.value === "" ? null : Number(select.value),
  };
  renderRepricingGapProcessModal();
});

repricingGapProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='repricingGapProcessModal']");
  if (closeButton) {
    appState.repricingGapProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-repricing-gap-process-node]");
  if (!nodeButton || !appState.repricingGapProcessModal) return;
  const nodeKey = nodeButton.dataset.repricingGapProcessNode;
  const collapseNumerator = nodeKey === "numerator" && appState.repricingGapProcessModal.numeratorExpanded;
  const collapseDenominator = nodeKey === "denominator" && appState.repricingGapProcessModal.denominatorExpanded;
  const detailNodeKeys = ["adjusted-assets", "adjusted-liabilities", "bank-book-derivative-gap", "trading-book-derivative-gap"];
  const legacyDetailNode = appState.repricingGapProcessModal.detailExpandedNode || "";
  const currentDetailNodes = Array.isArray(appState.repricingGapProcessModal.detailExpandedNodes)
    ? appState.repricingGapProcessModal.detailExpandedNodes
    : legacyDetailNode
      ? [legacyDetailNode]
      : [];
  let nextDetailNodes = [...currentDetailNodes];
  if (detailNodeKeys.includes(nodeKey)) {
    nextDetailNodes = currentDetailNodes.includes(nodeKey)
      ? currentDetailNodes.filter((key) => key !== nodeKey)
      : [...currentDetailNodes, nodeKey];
  } else if (collapseNumerator) {
    nextDetailNodes = [];
  }
  const nextModalState = { ...appState.repricingGapProcessModal };
  delete nextModalState.detailExpandedNode;
  appState.repricingGapProcessModal = {
    ...nextModalState,
    activeNode: collapseNumerator || collapseDenominator ? "ratio" : nodeKey,
    numeratorExpanded: nodeKey === "numerator"
      ? !appState.repricingGapProcessModal.numeratorExpanded
      : appState.repricingGapProcessModal.numeratorExpanded,
    denominatorExpanded: nodeKey === "denominator"
      ? !appState.repricingGapProcessModal.denominatorExpanded
      : appState.repricingGapProcessModal.denominatorExpanded,
    detailExpandedNodes: nextDetailNodes,
  };
  renderRepricingGapProcessModal();
});

repricingDurationGapProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-repricing-duration-gap-process-date-slider]");
  if (!slider || !appState.repricingDurationGapProcessModal) return;
  const dateIndex = Number(slider.value || 0);
  const comparisonIndex = appState.repricingDurationGapProcessModal.comparisonIndex;
  appState.repricingDurationGapProcessModal = {
    ...appState.repricingDurationGapProcessModal,
    dateIndex,
    comparisonIndex: Number.isInteger(comparisonIndex) && comparisonIndex < dateIndex
      ? comparisonIndex
      : null,
  };
  renderRepricingDurationGapProcessModal();
});

repricingDurationGapProcessModalEl.addEventListener("change", (event) => {
  const select = event.target.closest("[data-repricing-duration-gap-process-comparison]");
  if (!select || !appState.repricingDurationGapProcessModal) return;
  appState.repricingDurationGapProcessModal = {
    ...appState.repricingDurationGapProcessModal,
    comparisonIndex: select.value === "" ? null : Number(select.value),
  };
  renderRepricingDurationGapProcessModal();
});

repricingDurationGapProcessModalEl.addEventListener("click", (event) => {
  const sparkline = event.target.closest("[data-process-sparkline]");
  if (sparkline) {
    const payload = decodeProcessPreviewPayload(sparkline.dataset.processPreview);
    if (payload) {
      appState.processSparklinePreview = payload;
      renderProcessSparklinePreview();
    }
    return;
  }

  const closeButton = event.target.closest("[data-close-overlay='repricingDurationGapProcessModal']");
  if (closeButton) {
    appState.repricingDurationGapProcessModal = null;
    render();
    return;
  }
  const nodeButton = event.target.closest("[data-repricing-duration-gap-process-node]");
  if (!nodeButton || !appState.repricingDurationGapProcessModal) return;
  const nodeKey = nodeButton.dataset.repricingDurationGapProcessNode;
  const collapseAsset = nodeKey === "asset-duration" && appState.repricingDurationGapProcessModal.assetExpanded;
  const collapseLiability = nodeKey === "liability-duration" && appState.repricingDurationGapProcessModal.liabilityExpanded;
  appState.repricingDurationGapProcessModal = {
    ...appState.repricingDurationGapProcessModal,
    activeNode: collapseAsset || collapseLiability ? "duration-gap" : nodeKey,
    assetExpanded: nodeKey === "asset-duration"
      ? !appState.repricingDurationGapProcessModal.assetExpanded
      : appState.repricingDurationGapProcessModal.assetExpanded,
    liabilityExpanded: nodeKey === "liability-duration"
      ? !appState.repricingDurationGapProcessModal.liabilityExpanded
      : appState.repricingDurationGapProcessModal.liabilityExpanded,
  };
  renderRepricingDurationGapProcessModal();
});

processSparklinePreviewEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-process-sparkline]");
  if (!closeButton) return;
  appState.processSparklinePreview = null;
  renderProcessSparklinePreview();
});

businessMethodologyModalEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-overlay='businessMethodologyModal']");
  if (!closeButton) return;
  appState.businessMethodologyModal = null;
  renderBusinessChangeMethodologyModal();
});

filterPopoverEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-filter-modal-close]");
  if (closeButton) {
    appState.openFilterKey = null;
    render();
    return;
  }

  const filterOption = event.target.closest("[data-filter-option]");
  if (filterOption) {
    const { ownerType, ownerId, filterName, filterValue } = filterOption.dataset;
    const stateBucket = getFilterStateBucket(ownerType, ownerId);
    const current = new Set(stateBucket[filterName] || []);
    if (current.has(filterValue)) current.delete(filterValue);
    else current.add(filterValue);
    stateBucket[filterName] = current.size ? Array.from(current) : [filterValue];
    if (ownerType === "page") appState.pageFilters[ownerId] = stateBucket;
    else if (ownerType === "widget") appState.widgetFilters[ownerId] = stateBucket;
    else appState.areaFilters[ownerId] = stateBucket;
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (appState.businessMethodologyModal) {
      appState.businessMethodologyModal = null;
      renderBusinessChangeMethodologyModal();
      return;
    }
    if (appState.processSparklinePreview) {
      appState.processSparklinePreview = null;
      renderProcessSparklinePreview();
      return;
    }
    if (appState.repricingGapProcessModal) {
      appState.repricingGapProcessModal = null;
      render();
      return;
    }
    if (appState.repricingDurationGapProcessModal) {
      appState.repricingDurationGapProcessModal = null;
      render();
      return;
    }
    if (appState.liquidityProcessModal) {
      appState.liquidityProcessModal = null;
      render();
      return;
    }
    if (appState.eveProcessModal) {
      appState.eveProcessModal = null;
      render();
      return;
    }
    if (appState.simulationModalPageId) {
      closeSimulationModal();
      render();
      return;
    }
    if (appState.insightWidgetSeq != null) {
      appState.insightWidgetSeq = null;
      render();
      return;
    }
    if (appState.openFilterKey) {
      appState.openFilterKey = null;
      render();
    }
  }
});

render();
