"""
ScoutAgent — pulls external market data and reports it into the pipeline.
Spends a small, fixed credit amount per fetch (cheapest role in the chain,
so it's a good baseline for what "normal" spend looks like versus the
Executor, which is designed to run dry first).
"""
import requests
from agents.base_agent import BaseAgent
from agents.config import SCOUT_PRIVATE_KEY

FETCH_COST = 2  # credits per data pull


class ScoutAgent(BaseAgent):
    def __init__(self):
        super().__init__("Scout", SCOUT_PRIVATE_KEY)

    def fetch_market_data(self, coin_id: str = "bitcoin") -> dict:
        """
        Pulls a live price signal from a public API. Falls back to a static
        sample on any failure so the demo pipeline never stalls on a flaky
        external call.
        """
        try:
            resp = requests.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": coin_id, "vs_currencies": "usd", "include_24hr_change": "true"},
                timeout=5,
            )
            data = resp.json()
            if coin_id not in data:
                raise ValueError("asset not listed")
            price_info = data[coin_id]
        except Exception:
            price_info = {"usd": 0.0, "usd_24h_change": 0.0}

        self.spend_credits(FETCH_COST, "fetch_market_data")
        self.check_and_alert_if_low()

        return {"coin_id": coin_id, **price_info}


if __name__ == "__main__":
    scout = ScoutAgent()
    print(scout.fetch_market_data())
