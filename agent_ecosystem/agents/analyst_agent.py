"""
AnalystAgent — reasons over Scout's data and produces a BUY/SELL/HOLD
decision. Uses Gemini if GEMINI_API_KEY is set, otherwise a rule-based
fallback so the pipeline runs with zero external API keys required.
"""
from agents.base_agent import BaseAgent
from agents.config import ANALYST_PRIVATE_KEY, GEMINI_API_KEY

ANALYSIS_COST = 3


class AnalystAgent(BaseAgent):
    def __init__(self):
        super().__init__("Analyst", ANALYST_PRIVATE_KEY)
        self.llm = None
        if GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY)
            except ImportError:
                print("[Analyst] langchain-google-genai not installed — using rule-based fallback")

    def analyze(self, market_data: dict) -> dict:
        change = market_data.get("usd_24h_change", 0.0)

        if self.llm:
            prompt = (
                f"Given a 24h price change of {change:.2f}% for {market_data.get('coin_id')}, "
                "reply with exactly one word: BUY, SELL, or HOLD."
            )
            response = self.llm.invoke(prompt)
            action = response.content.strip().upper()
        else:
            if change > 2:
                action = "BUY"
            elif change < -2:
                action = "SELL"
            else:
                action = "HOLD"

        self.spend_credits(ANALYSIS_COST, "analyze_market_data")
        self.check_and_alert_if_low()

        return {"action": action, "based_on": market_data}


if __name__ == "__main__":
    analyst = AnalystAgent()
    print(analyst.analyze({"coin_id": "bitcoin", "usd": 60000, "usd_24h_change": 3.5}))
