"""
BaseAgent — shared wallet + CreditVault interaction logic. Each agent that
subclasses this gets its own Monad wallet (from its private key) and can
spend credits, request top-ups, and check its own balance.
"""
from web3 import Web3
from agents.config import RPC_URL, CONTRACT_ADDRESS, CONTRACT_ABI, LOW_BALANCE_THRESHOLD


class BaseAgent:
    def __init__(self, name: str, private_key: str = None):
        self.name = name
        self.is_simulation = False

        if not private_key:
            print(f"[{name}] NOTICE: missing private key. Initializing in simulation fallback mode.")
            self.is_simulation = True
        
        target_contract = CONTRACT_ADDRESS or "0x0000000000000000000000000000000000000000"
        if not CONTRACT_ADDRESS or CONTRACT_ADDRESS == "0x0000000000000000000000000000000000000000":
            print(f"[{name}] NOTICE: CREDIT_VAULT_ADDRESS not set. Running in simulation fallback mode.")
            self.is_simulation = True

        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        try:
            if not self.w3.is_connected():
                print(f"[{name}] WARNING: could not connect to Monad RPC at {RPC_URL}. Degrading to simulation.")
                self.is_simulation = True
        except Exception:
            self.is_simulation = True

        if self.is_simulation or not private_key:
            self.account = self.w3.eth.account.create()
        else:
            self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address

        try:
            checksum_addr = Web3.to_checksum_address(target_contract)
            self.contract = self.w3.eth.contract(address=checksum_addr, abi=CONTRACT_ABI)
        except Exception:
            self.is_simulation = True
            self.contract = None

    def get_balance(self) -> int:
        if self.is_simulation or not self.contract:
            return 100
        try:
            return self.contract.functions.creditsOf(self.address).call()
        except Exception:
            return 100

    def _send_tx(self, fn):
        if self.is_simulation or not self.contract:
            class DummyReceipt:
                transactionHash = type("Hash", (), {"hex": lambda self: "0xsimulated_tx_receipt_00000000000000000000000000000000000000000000000000000000"})()
            return DummyReceipt()
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
