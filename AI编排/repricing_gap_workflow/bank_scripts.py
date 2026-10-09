"""Sources copied into the executable spec, not a second runtime implementation."""


def context_handler(params):
    import json
    import re
    from datetime import date as calendar_date

    inputs = params.get("input", params)
    if not isinstance(inputs, dict):
        raise ValueError("INVALID_INPUT")
    options = inputs.get("options") or {}
    memory = inputs.get("conversationState") or {}
    history_status = "empty"
    if "history" in params:
        memory = {}
        history = params["history"]
        if history != [] and history is not None:
            history_status = "invalid"
            try:
                if not isinstance(history, list) or not isinstance(history[-1], dict):
                    raise ValueError("INVALID_HISTORY")
                # Only the latest final output can restore state, never an older turn or prose.
                output = history[-1].get("outputMessage")
                if not isinstance(output, str) or len(output) > 64000:
                    raise ValueError("INVALID_HISTORY_OUTPUT")
                output = json.loads(output)
                if isinstance(output, dict) and "conversationState" not in output and "res" in output:
                    output = output["res"]
                candidate = output.get("conversationState") if isinstance(output, dict) else None
                if not isinstance(candidate, dict) or not isinstance(candidate.get("scopeKey"), str) or not candidate["scopeKey"]:
                    raise ValueError("MISSING_HISTORY_STATE")
                keys = ("scopeKey", "businessType", "focusCurrencyCode", "baseDate", "comparedCurrencies")
                candidate = {key: candidate[key] for key in keys if key in candidate}
                if any(not isinstance(candidate.get(key, ""), str) for key in keys[:-1]):
                    raise ValueError("INVALID_HISTORY_STATE")
                if candidate.get("focusCurrencyCode", "") not in ("", "CNY", "USD", "HKD"):
                    raise ValueError("INVALID_HISTORY_CURRENCY")
                if candidate.get("businessType", "") not in ("", "自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债"):
                    raise ValueError("INVALID_HISTORY_BUSINESS")
                compared_state = candidate.get("comparedCurrencies", [])
                if not isinstance(compared_state, list) or len(compared_state) not in (0, 2) or any(
                        c not in ("CNY", "USD", "HKD") for c in compared_state) or len(set(compared_state)) != len(compared_state):
                    raise ValueError("INVALID_HISTORY_COMPARISON")
                saved_base = candidate.get("baseDate", "")
                if saved_base and saved_base != "PREVIOUS" and calendar_date.fromisoformat(saved_base).isoformat() != saved_base:
                    raise ValueError("INVALID_HISTORY_BASE")
                memory = candidate
                history_status = "restored"
            except (ValueError, TypeError, KeyError, IndexError, RecursionError):
                memory = {}
    if not isinstance(options, dict) or not isinstance(memory, dict):
        raise ValueError("INVALID_CONTEXT_OBJECT")
    for key in ("orgCode", "currencyCode", "tenorCode", "asOfDate", "question", "frequency"):
        if inputs.get(key) is not None and not isinstance(inputs[key], str):
            raise ValueError("INVALID_INPUT_TYPE:" + key)
    for key in ("analysisMode", "baseDate", "businessType", "nodeCode", "focusCurrencyCode", "caliber", "metricCode"):
        if options.get(key) is not None and not isinstance(options[key], str):
            raise ValueError("INVALID_OPTION_TYPE:" + key)
    if memory.get("focusCurrencyCode") not in (None, "", "CNY", "USD", "HKD"):
        raise ValueError("INVALID_CONVERSATION_STATE")
    if memory.get("comparedCurrencies") is not None and not isinstance(memory["comparedCurrencies"], list):
        raise ValueError("INVALID_CONVERSATION_STATE")
    # Legacy flat arguments are accepted by the adapter, not required by the new start form.
    options = {**{k: inputs[k] for k in (
        "analysisMode", "baseDate", "businessType", "nodeCode", "focusCurrencyCode",
        "comparedCurrencies", "caliber", "metricCode", "dataNeeds",
    ) if inputs.get(k) is not None}, **options}
    metric = options.get("metricCode") or "REPRICING_GAP_RATIO"
    if metric != "REPRICING_GAP_RATIO":
        raise ValueError("UNSUPPORTED_METRIC")
    org = inputs.get("orgCode") or ""
    currency = inputs.get("currencyCode") or ""
    tenor = inputs.get("tenorCode") or ""
    date = inputs.get("asOfDate") or ""
    question = (inputs.get("question") or "").strip()
    frequency = inputs.get("frequency") or "MONTH"
    if not all((org, currency, tenor, date)):
        raise ValueError("MISSING_SCOPE")
    if org != "LEGAL" or tenor != "1Y":
        raise ValueError("UNSUPPORTED_SCOPE")
    if frequency not in ("MONTH", "DAY"):
        raise ValueError("UNSUPPORTED_FREQUENCY")
    try:
        if calendar_date.fromisoformat(date).isoformat() != date:
            raise ValueError("INVALID_DATE")
    except (TypeError, ValueError):
        raise ValueError("UNKNOWN_DATA_DATE")
    scope_key = "|".join((org, currency, tenor, date, frequency))
    if memory.get("scopeKey") and memory["scopeKey"] != scope_key:
        memory = {}
        history_status = "scope_changed"
    if history_status == "restored" and memory.get("baseDate", "") not in ("", "PREVIOUS") and memory["baseDate"] >= date:
        memory = {}
        history_status = "invalid"
    last_business = memory.get("businessType") or inputs.get("lastBusinessType") or ""
    last_focus = memory.get("focusCurrencyCode") or inputs.get("sessionFocusCurrencyCode")
    last_base = memory.get("baseDate") or inputs.get("lastBaseDate")
    last_compared = memory.get("comparedCurrencies") or inputs.get("lastComparedCurrencies") or []
    if isinstance(last_compared, dict):
        last_compared = last_compared.get("values") or []
    mentioned = []
    for token, code in (("人民币", "CNY"), ("美元", "USD"), ("港币", "HKD"),
                        ("港元", "HKD"), ("CNY", "CNY"), ("USD", "USD"), ("HKD", "HKD")):
        if token in question and code not in mentioned:
            mentioned.append(code)
    compared = options.get("comparedCurrencies")
    if isinstance(compared, dict):
        compared = compared.get("values")
    compared = compared or (mentioned if len(mentioned) == 2 else [])
    if compared and (not isinstance(compared, list) or len(compared) != 2 or
                     len(set(compared)) != 2 or any(c not in ("CNY", "USD", "HKD") for c in compared)):
        raise ValueError("TWO_CURRENCIES_REQUIRED")
    focus = currency if compared else (options.get("focusCurrencyCode") or
        (mentioned[0] if mentioned else None) or last_focus or currency)
    if currency not in ("CNY", "USD", "HKD") or focus not in ("CNY", "USD", "HKD"):
        raise ValueError("UNSUPPORTED_CURRENCY")
    ambiguous = bool(last_compared and not mentioned and not options.get("focusCurrencyCode")
        and not compared and any(w in question for w in ("它", "这个币种", "那个币种")))
    missing_reference = ("history" in params and not last_business and not last_focus and not mentioned and
        not options.get("businessType") and not options.get("focusCurrencyCode") and
        any(w in question for w in ("它", "这个币种", "那个币种", "这个业务", "这类业务", "刚才", "之前那个")))
    history_clarification = history_status == "invalid" or missing_reference
    parsed_base = ""
    if "去年末" in question:
        parsed_base = str(int(date[:4]) - 1) + "-12-31"
    elif "上一期" in question or "上期" in question:
        parsed_base = "PREVIOUS"
    else:
        match = re.search(r"(?:与|和|较|比)\s*(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", question)
        if match:
            parsed_base = "%04d-%02d-%02d" % tuple(int(p) for p in match.groups())
    base = options.get("baseDate") or parsed_base or last_base or ""
    if base and base != "PREVIOUS":
        try:
            if calendar_date.fromisoformat(base).isoformat() != base or base >= date:
                raise ValueError("INVALID_BASE_DATE")
        except (TypeError, ValueError):
            raise ValueError("INVALID_BASE_DATE")
    modes = ("overview", "limit", "trend", "calculation", "attribution", "business",
             "methodology", "clarification", "currencyCompare")
    mode = (options.get("analysisMode") or "").strip()
    if mode and mode not in modes:
        raise ValueError("UNSUPPORTED_ANALYSIS_MODE")
    business_names = ("自营贷款", "投资类资产", "同业资产", "定期存款", "同业负债")
    if not mode:
        if not question:
            mode = "overview"
        elif compared:
            mode = "currencyCompare"
        elif last_business and any(w in question for w in ("它", "这个业务", "这类业务")):
            mode = "business"
        elif any(n in question for n in business_names) and any(
            w in question for w in ("为什么", "原因", "新增", "退出", "大额", "业务")
        ):
            mode = "business"
        elif any(w in question for w in ("限额", "超限", "空间", "预警")):
            mode = "limit"
        elif any(w in question for w in ("口径", "剔除", "不含", "定义")):
            mode = "methodology"
        elif any(w in question for w in ("怎么算", "计算过程", "分子", "分母", "构成", "公式")):
            mode = "calculation"
        elif any(w in question for w in ("归因", "导致", "变动原因", "影响因素", "啥原因",
                                        "什么原因", "怎么变", "咋变", "咋回事")) or (
            any(w in question for w in ("为什么", "为何", "为啥")) and
            any(w in question for w in ("上升", "下降", "上涨", "下跌", "涨", "跌", "变化", "变动", "不一样"))
        ):
            mode = "attribution"
        elif any(w in question for w in ("走势", "趋势", "波动", "近几个月")):
            mode = "trend"
        elif any(w in question for w in ("是多少", "多高", "现在多少", "当前多少")):
            mode = "overview"
        else:
            leftover = question.replace("重定价缺口率", "")
            filler = set(" ，,。？?！!的了吧呢啊呀请帮我看看一下现在目前请问哈怎么样咋样什么情况啥情况最近怎么样呢")
            mode = "overview" if not "".join(c for c in leftover if not c.isspace() and c not in filler) else "clarification"
    if ambiguous or history_clarification:
        mode = "clarification"
    # Keep one primary mode, but collect independent, explicit subquestions.
    detected = []
    if any(w in question for w in ("限额", "超限", "空间", "预警")):
        detected.append("limit")
    if any(w in question for w in ("走势", "趋势", "波动", "近几个月")):
        detected.append("trend")
    if any(w in question for w in ("归因", "导致", "变动原因", "影响因素", "啥原因", "什么原因")) or (
        any(w in question for w in ("为什么", "为何", "为啥")) and
        any(w in question for w in ("上升", "下降", "上涨", "下跌", "涨", "跌", "变化", "变动", "不一样"))
    ):
        detected.append("attribution")
    # A business-specific 'why' alone asks for evidence, not invented formal attribution.
    if mode == "business" and not any(w in question for w in ("归因", "缺口率", "指标")):
        detected = [d for d in detected if d != "attribution"]
    if any(n in question for n in business_names) and any(
        w in question for w in ("原因", "为什么", "新增", "退出", "大额", "业务", "明细")
    ):
        detected.append("business")
    if any(w in question for w in ("口径", "剔除", "不含", "定义")):
        detected.append("methodology")
    if any(w in question for w in ("怎么算", "计算过程", "构成", "公式")) or (
        any(w in question for w in ("分子", "分母")) and "methodology" not in detected
    ):
        detected.append("calculation")
    requested = options.get("dataNeeds")
    if requested is not None and (not isinstance(requested, list) or not requested or
            any(not isinstance(d, str) or d not in modes or d == "clarification" for d in requested)):
        raise ValueError("INVALID_DATA_NEEDS")
    needs = list(dict.fromkeys([mode] + (requested if requested is not None else detected)))
    if mode == "clarification":
        needs = []
    elif len(needs) > 4 and not params.get("prepareOnly"):
        raise ValueError("TOO_MANY_DATA_NEEDS")
    if "currencyCompare" in needs and not compared:
        raise ValueError("TWO_CURRENCIES_REQUIRED")
    business = options.get("businessType") or next((n for n in business_names if n in question), "") or last_business
    calculation_parts = [part for part in re.split(r"[，,。；;？?]|再", question) if any(
        word in part for word in ("怎么算", "计算过程", "构成", "公式", "分项", "展示", "给出"))]
    node_question = " ".join(calculation_parts) or question
    node = options.get("nodeCode") or ("DENOMINATOR" if "分母" in node_question or "总生息资产" in node_question
        else "ASSETS" if "资产端" in node_question else "LIABILITIES" if "负债端" in node_question
        else "GAP" if "缺口" in node_question or "分子" in node_question else "ROOT")
    if mode == "currencyCompare" and not compared:
        raise ValueError("TWO_CURRENCIES_REQUIRED")
    state = {"scopeKey": scope_key, "businessType": business or "", "focusCurrencyCode": focus,
             "baseDate": last_base or "", "comparedCurrencies": compared or (last_compared if not mentioned else [])}
    if mode == "clarification":
        state = {**memory, "scopeKey": scope_key}
    query = {
        "orgCode": org, "currencies": compared or [focus], "tenorCode": tenor,
        "asOfDate": date, "frequency": frequency, "analysisMode": mode, "dataNeeds": needs,
        "baseDate": base if any(d in needs for d in ("overview", "attribution", "business")) else "",
        "businessType": (business or "自营贷款") if "business" in needs else "",
        "nodeCode": node if "calculation" in needs else "",
    }
    context = {
        "analysisMode": mode, "question": question, "query": query,
        "conversationState": state, "clarifyReason": "history" if history_clarification else "currency" if ambiguous else "intent",
        "historyStatus": history_status,
        "caliber": options.get("caliber") or "DEFAULT",
        "needsData": mode != "clarification" and (options.get("caliber") or "DEFAULT") == "DEFAULT",
    }
    if params.get("prepareOnly"):
        context["needsClassification"] = bool(question) and not (
            ambiguous or history_clarification or context["caliber"] != "DEFAULT" or options.get("analysisMode") or requested is not None)
        context["classificationContext"] = {"lastBusinessType": last_business,
            "businessType": business, "comparedCurrencies": compared,
            "focusCurrencyCode": focus, "metricCode": metric}
        context["resolvedOptions"] = {"baseDate": base, "businessType": business, "nodeCode": node}
        context["confirmedState"] = dict(memory)
    return context


def direct_handler(params):
    preparation = params["preparation"]
    return {key: value for key, value in preparation.items() if key not in (
        "needsClassification", "classificationContext", "resolvedOptions", "confirmedState")}


def intent_check_handler(params):
    import json

    preparation = params["preparation"]
    context = {key: value for key, value in preparation.items() if key not in (
        "needsClassification", "classificationContext", "resolvedOptions", "confirmedState")}
    context["query"] = dict(context["query"])
    modes = ("overview", "limit", "trend", "calculation", "attribution", "business", "methodology", "currencyCompare")
    reason = "intent"
    try:
        raw = params.get("candidateRaw")
        if not isinstance(raw, str) or len(raw) > 4000:
            raise ValueError("INVALID_INTENT_OUTPUT")
        candidate = json.loads(raw)
        if not isinstance(candidate, dict) or set(candidate) != {"labels", "primary", "needsClarification"}:
            raise ValueError("INVALID_INTENT_OUTPUT")
        labels = candidate["labels"]
        if not isinstance(labels, dict) or set(labels) != set(modes) or any(
                type(value) is not int or value not in (0, 1) for value in labels.values()):
            raise ValueError("INVALID_INTENT_LABELS")
        if type(candidate["needsClarification"]) is not bool:
            raise ValueError("INVALID_CLARIFICATION_FLAG")
        selected = [mode for mode in modes if labels[mode] == 1]
        if candidate["needsClarification"] or not selected:
            raise ValueError("UNCERTAIN_INTENT")
        primary = candidate["primary"]
        if primary not in selected:
            raise ValueError("INVALID_PRIMARY_INTENT")
        if len(selected) > 4:
            reason = "tooManyAnalyses"
            raise ValueError("TOO_MANY_DATA_NEEDS")
        query = context["query"]
        has_comparison = len(query["currencies"]) == 2
        if ("currencyCompare" in selected) != has_comparison:
            raise ValueError("INTENT_CURRENCY_MISMATCH")
        resolved = preparation["resolvedOptions"]
        if "business" in selected and not resolved["businessType"]:
            reason = "business"
            raise ValueError("BUSINESS_TYPE_REQUIRED")
        needs = [primary] + [mode for mode in selected if mode != primary]
        query.update(analysisMode=primary, dataNeeds=needs,
            baseDate=resolved["baseDate"] if any(mode in needs for mode in ("overview", "attribution", "business")) else "",
            businessType=resolved["businessType"] if "business" in needs else "",
            nodeCode=resolved["nodeCode"] if "calculation" in needs else "")
        context.update(analysisMode=primary, needsData=True, classificationStatus="validated")
        if "business" not in needs:
            context["conversationState"] = {**context["conversationState"],
                "businessType": preparation["confirmedState"].get("businessType") or ""}
        return context
    except (ValueError, TypeError, KeyError):
        context.update(analysisMode="clarification", needsData=False, clarifyReason=reason,
            classificationStatus="needs_input")
        context["query"].update(analysisMode="clarification", dataNeeds=[], baseDate="", businessType="", nodeCode="")
        # An unconfirmed question must not replace the last confirmed conversation state.
        context["conversationState"] = {"scopeKey": preparation["conversationState"]["scopeKey"],
                                        **preparation["confirmedState"]}
        return context


def local_handler(params):
    context = params["context"]
    query = context["query"]
    currency = query["currencies"][0]
    body = {"analysisMode": context["analysisMode"], "scope": {"metricCode": "REPRICING_GAP_RATIO", "orgCode": query["orgCode"],
        "currencyCode": currency, "tenorCode": query["tenorCode"], "asOfDate": query["asOfDate"],
        "frequency": query["frequency"], "caliber": context["caliber"]}, "dataVersion": "LOCAL-CONTEXT-v1"}
    if context["caliber"] != "DEFAULT":
        body.update(status="unsupported", reason="UNSUPPORTED_CALIBER", supportedCalibers=["DEFAULT"])
    else:
        body.update(status="needs_input", clarifyReason=context["clarifyReason"])
        messages = {"tooManyAnalyses": "本轮涉及的分析类型超过单次支持范围，请拆成多个问题。",
            "history": "无法从上一轮恢复明确的分析对象或比较条件，请重新说明币种、业务类别或比较日期。",
            "business": "请明确要查看哪类业务，再查询该业务的变化或明细。"}
        if context["clarifyReason"] in messages:
            body["message"] = messages[context["clarifyReason"]]
        if context["clarifyReason"] == "currency":
            body["currencyOptions"] = ["CNY", "USD", "HKD"]
        else:
            body["modeOptions"] = [{"code": c, "label": n} for c, n in (
                ("overview", "当前值与限额情况"), ("limit", "还剩多少限额空间"), ("trend", "近几个月的走势"),
                ("calculation", "这个比率怎么算出来的"), ("attribution", "为什么上升或下降"),
                ("business", "哪类业务带来的变化"), ("methodology", "口径与剔除项说明"))]
    return {"returnCode": "SUC0000", "body": body}


def package_handler(params):
    import json
    result = params.get("apiResponse") or {}
    if result.get("returnCode") != "SUC0000":
        raise ValueError(result.get("errorCode") or "ALM_API_FAILED")
    context = params.get("context")
    body = result.get("body") or {}
    actual = body.get("scope") or {}
    if context:
        query = context["query"]
        expected = {"metricCode": "REPRICING_GAP_RATIO", "orgCode": query["orgCode"],
            "currencyCode": query["currencies"][0],
            "tenorCode": query["tenorCode"], "asOfDate": query["asOfDate"],
            "frequency": query["frequency"], "caliber": context["caliber"]}
    else:
        expected = {k: params.get(k) for k in ("metricCode", "orgCode", "currencyCode", "tenorCode", "asOfDate")}
        expected["currencyCode"] = params.get("focusCurrencyCode") or expected["currencyCode"]
    for key, value in expected.items():
        if actual.get(key) != value:
            raise ValueError("SCOPE_MISMATCH_" + key)
    if context and body.get("analysisMode") != context["analysisMode"]:
        raise ValueError("SCOPE_MISMATCH_analysisMode")
    if context and body.get("status") == "available":
        needs = query.get("dataNeeds") or [context["analysisMode"]]
        if body.get("dataNeeds", [context["analysisMode"]]) != needs:
            raise ValueError("SCOPE_MISMATCH_dataNeeds")
        if len(needs) > 1:
            modules = body.get("analyses") or {}
            if not isinstance(modules, dict) or set(modules) != set(needs):
                raise ValueError("MISSING_REQUESTED_ANALYSIS")
            for need, module in modules.items():
                if not isinstance(module, dict):
                    raise ValueError("INVALID_ANALYSIS_MODULE")
                parts = module.get("byCurrency", [module])
                currencies = query["currencies"] if need != "currencyCompare" else [query["currencies"][0]]
                if not isinstance(parts, list) or len(parts) != len(currencies):
                    raise ValueError("SCOPE_MISMATCH_moduleCurrencies")
                for part, currency in zip(parts, currencies):
                    if not isinstance(part, dict) or part.get("status") not in ("available", "unavailable"):
                        raise ValueError("INVALID_ANALYSIS_MODULE")
                    part_scope = part.get("scope") or {}
                    for key, value in {**expected, "currencyCode": currency}.items():
                        if part_scope.get(key) != value:
                            raise ValueError("SCOPE_MISMATCH_module_" + key)
                    if part.get("actualDataDate") != query["asOfDate"]:
                        raise ValueError("SCOPE_MISMATCH_module_actualDataDate")
                    if (part.get("analysisMode") != need or not part.get("dataVersion") or not part.get("caliberVersion") or
                            part["dataVersion"] != body.get("dataVersion") or part["caliberVersion"] != body.get("caliberVersion")):
                        raise ValueError("INVALID_ANALYSIS_MODULE")
                    if need in ("overview", "attribution", "business") and part.get("status") == "available":
                        if part_scope.get("baseDate") != actual.get("baseDate"):
                            raise ValueError("SCOPE_MISMATCH_module_baseDate")
                    if need == "business" and part.get("status") == "available" and part.get("businessType") != query["businessType"]:
                        raise ValueError("SCOPE_MISMATCH_businessType")
                    if need == "calculation" and part.get("nodeCode") != query["nodeCode"]:
                        raise ValueError("SCOPE_MISMATCH_nodeCode")
                    if need == "currencyCompare" and part.get("comparedCurrencies") != query["currencies"]:
                        raise ValueError("SCOPE_MISMATCH_comparedCurrencies")
    if context and body.get("actualDataDate", actual.get("asOfDate")) != actual.get("asOfDate"):
        raise ValueError("SCOPE_MISMATCH_actualDataDate")
    if body.get("status") not in ("available", "needs_input", "unsupported", "unavailable"):
        raise ValueError("DATA_NOT_AVAILABLE")
    if len(json.dumps(body, ensure_ascii=False)) > 16000:
        raise ValueError("PACKAGE_TOO_LARGE")
    if body["status"] == "available" and (not body.get("dataVersion") or not body.get("caliberVersion")):
        raise ValueError("VERSION_MISSING")
    state = dict(context["conversationState"]) if context else {}
    if context and body["status"] == "available":
        query = context["query"]
        if query["baseDate"] and query["baseDate"] != "PREVIOUS" and actual.get("baseDate") != query["baseDate"]:
            raise ValueError("SCOPE_MISMATCH_baseDate")
        if any(d in query.get("dataNeeds", [context["analysisMode"]]) for d in ("overview", "attribution", "business")):
            state["baseDate"] = actual.get("baseDate") or ""
        if context["analysisMode"] == "currencyCompare" and "analyses" not in body:
            if body.get("comparedCurrencies") != query["currencies"]:
                raise ValueError("SCOPE_MISMATCH_comparedCurrencies")
        if context["analysisMode"] == "business" and "analyses" not in body and body.get("businessType") != query["businessType"]:
            raise ValueError("SCOPE_MISMATCH_businessType")
        if context["analysisMode"] == "calculation" and "analyses" not in body and body.get("nodeCode") != query["nodeCode"]:
            raise ValueError("SCOPE_MISMATCH_nodeCode")
    return {"resultPackage": body, "conversationState": state}
