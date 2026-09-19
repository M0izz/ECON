"""
BaseAgent — shared wallet + CreditVault interaction logic. Each agent that
subclasses this gets its own Monad wallet (from its private key) and can
spend credits, request top-ups, and check its own balance.
"""
from web3 import Web3
from agents.config import RPC_URL, CONTRACT_ADDRESS, CONTRACT_ABI, LOW_BALANCE_THRESHOLD


class BaseAgent:
    def __init__(self, name: str, private_key: str):
        if not private_key:
            raise ValueError(f"[{name}] missing private key — check your .env")
        if not CONTRACT_ADDRESS:
            raise ValueError("CREDIT_VAULT_ADDRESS not set — deploy CreditVault.sol first")

        self.name = name
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError(f"[{name}] could not connect to Monad RPC at {RPC_URL}")

        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address
        self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)

    def get_balance(self) -> int:
        return self.contract.functions.creditsOf(self.address).call()

    def _send_tx(self, fn):
        tx = fn.build_transaction({
            "from": self.address,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "gas": 200_000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        return self.w3.eth.wait_for_transaction_receipt(tx_hash)

    def spend_credits(self, amount: int, action: str):
        balance = self.get_balance()
        print(f"[{self.name}] balance before spend: {balance}")

        if balance < amount:
            print(f"[{self.name}] insufficient credits ({balance} < {amount}) — requesting top-up")
            self.request_topup(amount - balance)
            balance = self.get_balance()
            if balance < amount:
                raise RuntimeError(
                    f"[{self.name}] still short on credits after top-up "
                    f"(reserve pool may be empty — run the GC sweep first)"
                )

        receipt = self._send_tx(self.contract.functions.spend(amount, action))
        print(f"[{self.name}] spent {amount} credits on '{action}' — tx {receipt.transactionHash.hex()}")
        return receipt

    def request_topup(self, amount_needed: int):
        receipt = self._send_tx(self.contract.functions.requestTopUp(amount_needed))
        print(f"[{self.name}] requested top-up of {amount_needed} credits — tx {receipt.transactionHash.hex()}")
        return receipt

    def check_and_alert_if_low(self) -> int:
        balance = self.get_balance()
        if balance < LOW_BALANCE_THRESHOLD:
            print(f"[{self.name}] running low on credits ({balance}) — GC sweep candidate")
        return balance
