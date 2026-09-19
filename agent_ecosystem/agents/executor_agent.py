"""
ExecutorAgent — takes the Analyst's decision and "executes" it, logged as
an on-chain spend. This agent pays the largest credit cost per action, so
it's the one most likely to run dry — a deliberate choice to demonstrate
the garbage-collector top-up path during a demo.
"""
from agents.base_agent import BaseAgent
from agents.config import EXECUTOR_PRIVATE_KEY

EXECUTION_COST = 5


class ExecutorAgent(BaseAgent):
    def __init__(self):
        super().__init__("Executor", EXECUTOR_PRIVATE_KEY)

    def execute(self, decision: dict) -> dict:
        action = decision["action"]
        print(f"[Executor] executing decision: {action}")

        # In a fuller build, this is where you'd call a DEX contract, place
        # a bet, or trigger a payment. For this MVP, the decision itself is
        # the on-chain artifact — recorded via the spend transaction's
        # action string, visible in CreditsSpent event logs.
        self.spend_credits(EXECUTION_COST, f"execute_{action.lower()}")
        remaining = self.check_and_alert_if_low()

        return {"executed": action, "remaining_credits": remaining}


if __name__ == "__main__":
    executor = ExecutorAgent()
    print(executor.execute({"action": "BUY"}))
