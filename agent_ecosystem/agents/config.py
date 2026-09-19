import os
import json
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz")
CONTRACT_ADDRESS = os.getenv("CREDIT_VAULT_ADDRESS")

SCOUT_PRIVATE_KEY = os.getenv("SCOUT_PRIVATE_KEY")
ANALYST_PRIVATE_KEY = os.getenv("ANALYST_PRIVATE_KEY")
EXECUTOR_PRIVATE_KEY = os.getenv("EXECUTOR_PRIVATE_KEY")

# Optional — if unset, AnalystAgent falls back to rule-based logic instead
# of calling Gemini.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Below this balance, an agent's remaining credits are considered "dust"
# and are a candidate for the garbage collector to sweep.
LOW_BALANCE_THRESHOLD = int(os.getenv("LOW_BALANCE_THRESHOLD", "5"))

# Hand-written ABI covering only the functions/agents actually call.
# Matches contracts/CreditVault.sol — regenerate from build artifacts if
# you extend the contract.
CONTRACT_ABI = json.loads("""
[
  {"inputs":[{"internalType":"address","name":"agent","type":"address"},{"internalType":"uint256","name":"initialCredits","type":"uint256"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"action","type":"string"}],"name":"spend","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amountNeeded","type":"uint256"}],"name":"requestTopUp","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"agent","type":"address"},{"internalType":"uint256","name":"threshold","type":"uint256"}],"name":"sweepDust","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"agent","type":"address"}],"name":"creditsOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]
""")
