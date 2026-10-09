"""Derive runtime descriptions from the same bank-node definition."""


def runtime_metadata(spec):
    names = {n["id"]: n["execution"]["runtimeId"] for n in spec["nodes"]}
    return {
        "entry": next(names[e["to"]] for e in spec["edges"] if e["from"] == "start"),
        "end": "__end__",
        "order": [names[n["id"]] for n in spec["nodes"]],
        "nodes": [{"id": names[n["id"]], "label": n["name"], "role": n["inlineType"],
                   "purpose": n["summary"]} for n in spec["nodes"]],
        "mapping": [{"platformId": "end" if n["id"] == "__end__" else n["id"],
                     "runtimeIds": [names[n["id"]]], "relation": "由同一节点定义生成；开始和结束对应 LangGraph 内置端点。"}
                    for n in spec["nodes"]],
        "differences": ["节点与连线直接由行内定义编译，无回边，没有另写业务拓扑。",
                        "本地 HTTP/模型适配器与会话保存属于外部边界；正式接口和行内异常行为仍需实测，不能宣称无缝导入。"],
        "exceptionExits": [{"node": names[n["id"]], "label": "异常中断", "reason": n["failureRouting"]}
                           for n in spec["nodes"] if n["config"].get("onError") == "abort"],
        "edgeLabels": [{"from": names[e["from"]], "to": names[e["to"]], "label": e["label"]}
                       for e in spec["edges"] if e.get("label")],
    }
