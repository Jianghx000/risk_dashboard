"""测试默认走本地模板，避免误打真实模型。运行期默认仍是 live。"""

import pytest


@pytest.fixture(autouse=True)
def _offline_model(monkeypatch):
    monkeypatch.setenv("ALM_AI_MODE", "mock")
