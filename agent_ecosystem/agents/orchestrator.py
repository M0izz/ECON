"""
Wires Scout -> Analyst -> Executor into a LangGraph pipeline.

Run this after:
  1. CreditVault.sol is deployed on Monad testnet
  2. All three agent addresses are registered via registerAgent()
  3. Each agent's wallet has a little MON for gas (faucet)
  4. .env is filled in (see .env.example)
"""
from typing import TypedDict
from langgraph.graph import StateGraph, END

from agents.scout_agent import ScoutAgent
from agents.analyst_agent import AnalystAgent
from agents.executor_agent import ExecutorAgent


class PipelineState(TypedDict, total=False):
    market_data: dict
    decision: dict
    result: dict


scout = ScoutAgent()
analyst = AnalystAgent()
executor = ExecutorAgent()


def scout_node(state: PipelineState) -> PipelineState:
    return {"market_data": scout.fetch_market_data()}


def analyst_node(state: PipelineState) -> PipelineState:
    return {"decision": analyst.analyze(state["market_data"])}


def executor_node(state: PipelineState) -> PipelineState:
    return {"result": executor.execute(state["decision"])}


def build_graph():
    graph = StateGraph(PipelineState)
    graph.add_node("scout", scout_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("executor", executor_node)

    graph.set_entry_point("scout")
    graph.add_edge("scout", "analyst")
    graph.add_edge("analyst", "executor")
    graph.add_edge("executor", END)

    return graph.compile()


if __name__ == "__main__":
    pipeline = build_graph()
    final_state = pipeline.invoke({})
    print("\n=== PIPELINE COMPLETE ===")
    print(final_state["result"])
