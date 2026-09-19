// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CreditVault
/// @notice On-chain recyclable credit ledger for a multi-agent ecosystem on Monad.
///         Credits are reserved for work, consumed as work completes, and
///         returned to a shared pool only when an owner or authorized keeper
///         explicitly recycles the unused remainder.
contract CreditVault {
    address public admin;

    mapping(address => uint256) public balances;
    mapping(address => bool) public registered;

    struct Reservation {
        address owner;
        uint256 amount;
        uint256 remaining;
        uint256 expiresAt;
        bool transferable;
        bool active;
    }

    struct CreditRequest {
        address requester;
        uint256 requested;
        uint256 fulfilled;
        bool open;
    }

    mapping(bytes32 => Reservation) public reservations;
    mapping(bytes32 => CreditRequest) public requests;
    uint256 public reservePool;

    event AgentRegistered(address indexed agent, uint256 initialCredits);
    event CreditsGranted(address indexed agent, uint256 amount);
    event CreditsReserved(bytes32 indexed reservationId, address indexed agent, uint256 amount);
    event CreditsSpent(address indexed agent, uint256 amount, string action);
    event CreditsConsumed(bytes32 indexed reservationId, uint256 amount);
    event CreditsReleased(bytes32 indexed reservationId, uint256 amount);
    event CreditsRecycled(bytes32 indexed reservationId, uint256 amount);
    event TopUpRequested(address indexed agent, uint256 amountNeeded);
    event TopUpFulfilled(address indexed agent, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Publish an agent into the ecosystem with an initial credit grant.
    function registerAgent(address agent, uint256 initialCredits) external onlyAdmin {
        require(!registered[agent], "already registered");
        registered[agent] = true;
        balances[agent] = initialCredits;
        emit AgentRegistered(agent, initialCredits);
    }

    function grant(address agent, uint256 amount) external onlyAdmin {
        require(registered[agent], "not registered");
        require(amount > 0, "amount is zero");
        balances[agent] += amount;
        emit CreditsGranted(agent, amount);
    }

    function reserve(
        bytes32 id,
        uint256 amount,
        uint256 expiresAt,
        bool transferable
    ) external {
        require(registered[msg.sender], "not registered");
        require(amount > 0, "amount is zero");
        require(balances[msg.sender] >= amount, "insufficient credits");
        require(expiresAt > block.timestamp, "expiry must be in future");
        require(!reservations[id].active, "reservation exists");

        balances[msg.sender] -= amount;
        reservations[id] = Reservation({
            owner: msg.sender,
            amount: amount,
            remaining: amount,
            expiresAt: expiresAt,
            transferable: transferable,
            active: true
        });
        emit CreditsReserved(id, msg.sender, amount);
    }

    function consume(bytes32 id, uint256 amount, string calldata action) external {
        Reservation storage reservation = reservations[id];
        require(reservation.active, "reservation inactive");
        require(msg.sender == reservation.owner, "not reservation owner");
        require(amount > 0 && amount <= reservation.remaining, "invalid amount");

        reservation.remaining -= amount;
        if (reservation.remaining == 0) reservation.active = false;
        emit CreditsConsumed(id, amount);
        emit CreditsSpent(msg.sender, amount, action);
    }

    function release(bytes32 id) external {
        Reservation storage reservation = reservations[id];
        require(reservation.active, "reservation inactive");
        require(msg.sender == reservation.owner, "not reservation owner");

        uint256 amount = reservation.remaining;
        reservation.remaining = 0;
        reservation.active = false;
        balances[msg.sender] += amount;
        emit CreditsReleased(id, amount);
    }

    function recycle(bytes32 id) external onlyAdmin {
        Reservation storage reservation = reservations[id];
        require(reservation.active, "reservation inactive");
        require(reservation.transferable, "reservation not transferable");
        uint256 amount = reservation.remaining;
        reservation.remaining = 0;
        reservation.active = false;
        reservePool += amount;
        emit CreditsRecycled(id, amount);
    }

    /// @notice Called by an agent to burn credits for an action it performed.
    function spend(uint256 amount, string calldata action) external {
        require(registered[msg.sender], "not registered");
        require(balances[msg.sender] >= amount, "insufficient credits");
        balances[msg.sender] -= amount;
        emit CreditsSpent(msg.sender, amount, action);
    }

    /// @notice Called by an agent that has run low. Pulls from the shared
    ///         reserve pool if enough dust has been swept into it.
    function requestTopUp(uint256 amountNeeded) external {
        require(registered[msg.sender], "not registered");
        require(amountNeeded > 0, "amount is zero");
        emit TopUpRequested(msg.sender, amountNeeded);

        if (reservePool >= amountNeeded) {
            reservePool -= amountNeeded;
            balances[msg.sender] += amountNeeded;
            emit TopUpFulfilled(msg.sender, amountNeeded);
        }
    }

    function creditsOf(address agent) external view returns (uint256) {
        return balances[agent];
    }
}
