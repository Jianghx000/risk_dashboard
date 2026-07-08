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
    openSimulationModal(pageId);
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
      activeNode: "ratio",
      numeratorExpanded: false,
    };
    render();
    return;
  }

  const repricingGapPoint = event.target.closest("[data-repricing-gap-point]");
  if (repricingGapPoint) {
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

  const openRepricingGapProcessButton = event.target.closest("[data-open-repricing-gap-process]");
  if (openRepricingGapProcessButton) {
    const sourceState = appState.repricingGapPointPopover || {};
    appState.repricingGapProcessModal = {
      widgetSeq: Number(openRepricingGapProcessButton.dataset.widgetSeq || sourceState.widgetSeq || 0),
      sourceSeq: Number(openRepricingGapProcessButton.dataset.sourceWidgetSeq || sourceState.sourceSeq || 9),
      dateIndex: Number(openRepricingGapProcessButton.dataset.dateIndex || sourceState.dateIndex || 0),
      labels: String(openRepricingGapProcessButton.dataset.repricingGapLabels || sourceState.labels?.join("||") || "").split("||").filter(Boolean),
      signature: Number(openRepricingGapProcessButton.dataset.repricingGapSignature || sourceState.signature || 0),
      activeNode: "ratio",
      numeratorExpanded: false,
    };
    render();
    return;
  }

  const evePoint = event.target.closest("[data-eve-point]");
  if (evePoint) {
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
      activeNode: "eve",
      numeratorExpanded: false,
      denominatorExpanded: false,
    };
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
    openSimulationModal(pageId);
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
    appState.pageSimulations[page.id] = getSimulationDraftMode(page) === SIMULATION_MODE_HEDGE
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
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    dateIndex: Number(slider.value || 0),
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
  appState.eveProcessModal = {
    ...appState.eveProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.eveProcessModal.numeratorExpanded || nodeKey === "numerator",
    denominatorExpanded: appState.eveProcessModal.denominatorExpanded || nodeKey === "denominator",
  };
  renderEveProcessModal();
});

liquidityProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-liquidity-process-date-slider]");
  if (!slider || !appState.liquidityProcessModal) return;
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    dateIndex: Number(slider.value || 0),
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
  appState.liquidityProcessModal = {
    ...appState.liquidityProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.liquidityProcessModal.numeratorExpanded || nodeKey === "numerator",
  };
  renderLiquidityProcessModal();
});

repricingGapProcessModalEl.addEventListener("input", (event) => {
  const slider = event.target.closest("[data-repricing-gap-process-date-slider]");
  if (!slider || !appState.repricingGapProcessModal) return;
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    dateIndex: Number(slider.value || 0),
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
  appState.repricingGapProcessModal = {
    ...appState.repricingGapProcessModal,
    activeNode: nodeKey,
    numeratorExpanded: appState.repricingGapProcessModal.numeratorExpanded || nodeKey === "numerator",
  };
  renderRepricingGapProcessModal();
});

processSparklinePreviewEl.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-process-sparkline]");
  if (!closeButton) return;
  appState.processSparklinePreview = null;
  renderProcessSparklinePreview();
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
