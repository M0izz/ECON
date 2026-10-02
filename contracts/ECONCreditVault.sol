// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONCreditVault
 * @notice Recyclable credit reservations, allocations, and peer pools for autonomous agents on Monad.
 * Supports task prepayment, reservation lock, atomic consumption settlement, and full/partial refund recycling.
 */
contract ECONCreditVault {
    struct Reservation {
        bytes32 reservationId;
        string agentId;
        address requester;
        uint256 amount;
        bool consumed;
        bool released;
        uint256 expiresAt;
        uint256 consumedAmount;
    }

    address public owner;
    // Map of authorized agent operational controllers (e.g. AGENT_SIGNER_PRIVATE_KEY) allowed to settle/release reservations
    mapping(string => address) public agentControllers;
    // Map of user deposited credit balance (in wei or credit units)
    mapping(address => uint256) public userBalances;
    // Map of reservations by reservationId
    mapping(bytes32 => Reservation) public reservations;
    // Common recyclable credit pool (e.g. unused capacity)
    uint256 public recyclablePool;

    event CreditsDeposited(address indexed account, uint256 amount, uint256 newBalance);
    event CreditsWithdrawn(address indexed account, uint256 amount, uint256 newBalance);
    event CreditsReserved(
        bytes32 indexed reservationId,
        string indexed agentId,
        address indexed requester,
        uint256 amount,
        uint256 expiresAt
    );
    event ReservationSettled(
        bytes32 indexed reservationId,
        string indexed agentId,
        address indexed requester,
        uint256 consumedAmount,
        uint256 refundedAmount
    );
    event ReservationReleased(
        bytes32 indexed reservationId,
        string indexed agentId,
        address indexed requester,
        uint256 refundedAmount
    );
    event ReservationRecycled(
        bytes32 indexed reservationId,
        string indexed agentId,
        uint256 recycledAmount
    );
    event AgentControllerRegistered(string indexed agentId, address indexed controller);

    modifier onlyOwner() {
        require(msg.sender == owner, "ECON: Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAgentController(string calldata agentId, address controller) external {
        require(msg.sender == owner || agentControllers[agentId] == msg.sender, "ECON: Unauthorized");
        require(controller != address(0), "ECON: Invalid controller");
        agentControllers[agentId] = controller;
        emit AgentControllerRegistered(agentId, controller);
    }

    function deposit() external payable {
        require(msg.value > 0, "ECON: Deposit amount must be > 0");
        userBalances[msg.sender] += msg.value;
        emit CreditsDeposited(msg.sender, msg.value, userBalances[msg.sender]);
    }

    function depositFor(address account) external payable {
        require(msg.value > 0, "ECON: Deposit amount must be > 0");
        require(account != address(0), "ECON: Invalid recipient");
        userBalances[account] += msg.value;
        emit CreditsDeposited(account, msg.value, userBalances[account]);
    }

    function withdraw(uint256 amount) external {
        require(userBalances[msg.sender] >= amount, "ECON: Insufficient balance");
        userBalances[msg.sender] -= amount;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "ECON: Withdrawal transfer failed");
        emit CreditsWithdrawn(msg.sender, amount, userBalances[msg.sender]);
    }

    function reserveCredits(
        bytes32 reservationId,
        string calldata agentId,
        uint256 amount,
        uint256 expiresAt
    ) external {
        require(reservations[reservationId].amount == 0, "ECON: Reservation already exists");
        require(amount > 0, "ECON: Amount must be > 0");
        require(userBalances[msg.sender] >= amount, "ECON: Insufficient credit balance");
        require(expiresAt == 0 || expiresAt > block.timestamp, "ECON: Expiry must be in future");

        userBalances[msg.sender] -= amount;

        reservations[reservationId] = Reservation({
            reservationId: reservationId,
            agentId: agentId,
            requester: msg.sender,
            amount: amount,
            consumed: false,
            released: false,
            expiresAt: expiresAt,
            consumedAmount: 0
        });

        emit CreditsReserved(reservationId, agentId, msg.sender, amount, expiresAt);
    }

    function reserveCreditsWithDirectPayment(
        bytes32 reservationId,
        string calldata agentId,
        uint256 expiresAt
    ) external payable {
        require(reservations[reservationId].amount == 0, "ECON: Reservation already exists");
        require(msg.value > 0, "ECON: Amount must be > 0");
        require(expiresAt == 0 || expiresAt > block.timestamp, "ECON: Expiry must be in future");

        reservations[reservationId] = Reservation({
            reservationId: reservationId,
            agentId: agentId,
            requester: msg.sender,
            amount: msg.value,
            consumed: false,
            released: false,
            expiresAt: expiresAt,
            consumedAmount: 0
        });

        emit CreditsReserved(reservationId, agentId, msg.sender, msg.value, expiresAt);
    }

    function settleReservation(
        bytes32 reservationId,
        uint256 consumedAmount
    ) external returns (bool) {
        Reservation storage r = reservations[reservationId];
        require(r.amount > 0, "ECON: Reservation not found");
        require(!r.consumed, "ECON: Already consumed");
        require(!r.released, "ECON: Already released");
        require(consumedAmount <= r.amount, "ECON: Consumed exceeds reserved");

        address controller = agentControllers[r.agentId];
        require(
            msg.sender == controller || msg.sender == owner || controller == address(0),
            "ECON: Unauthorized agent controller"
        );

        r.consumed = true;
        r.consumedAmount = consumedAmount;

        uint256 unusedRefund = r.amount - consumedAmount;
        if (unusedRefund > 0) {
            userBalances[r.requester] += unusedRefund;
        }

        // Send consumed amount to controller wallet if configured, else retain in agent pool
        if (controller != address(0) && consumedAmount > 0) {
            (bool sent, ) = payable(controller).call{value: consumedAmount}("");
            require(sent, "ECON: Settlement transfer failed");
        }

        emit ReservationSettled(reservationId, r.agentId, r.requester, consumedAmount, unusedRefund);
        return true;
    }

    function releaseReservation(bytes32 reservationId) external returns (bool) {
        Reservation storage r = reservations[reservationId];
        require(r.amount > 0, "ECON: Reservation not found");
        require(!r.consumed, "ECON: Already consumed");
        require(!r.released, "ECON: Already released");

        address controller = agentControllers[r.agentId];
        bool isExpired = r.expiresAt > 0 && block.timestamp > r.expiresAt;
        require(
            msg.sender == controller || msg.sender == r.requester || msg.sender == owner || isExpired,
            "ECON: Unauthorized release"
        );

        r.released = true;
        userBalances[r.requester] += r.amount;

        emit ReservationReleased(reservationId, r.agentId, r.requester, r.amount);
        return true;
    }

    function recycleReservation(bytes32 reservationId) external returns (bool) {
        Reservation storage r = reservations[reservationId];
        require(r.amount > 0, "ECON: Reservation not found");
        require(!r.consumed, "ECON: Already consumed");
        require(!r.released, "ECON: Already released");

        address controller = agentControllers[r.agentId];
        require(
            msg.sender == controller || msg.sender == r.requester || msg.sender == owner,
            "ECON: Unauthorized recycle"
        );

        r.released = true;
        recyclablePool += r.amount;

        emit ReservationRecycled(reservationId, r.agentId, r.amount);
        return true;
    }

    function getReservation(
        bytes32 reservationId
    ) external view returns (
        string memory agentId,
        address requester,
        uint256 amount,
        bool consumed,
        bool released,
        uint256 expiresAt
    ) {
        Reservation memory r = reservations[reservationId];
        return (
            r.agentId,
            r.requester,
            r.amount,
            r.consumed,
            r.released,
            r.expiresAt
        );
    }
}
