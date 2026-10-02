// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IECONEconomicObjectEscrow {
    function transferFrom(address from, address to, bytes32 id) external;
}

/**
 * @title ECONEscrow
 * @notice High-throughput conditional payment escrow for autonomous agents on Monad.
 * Supports native MON conditional settlement and atomic economic object delivery verification.
 */
contract ECONEscrow {
    enum EscrowStatus { LOCKED, DELIVERED, VERIFIED, RELEASED, EXPIRED, REFUNDED }

    struct EscrowRecord {
        bytes32 id;
        address buyer;
        address seller;
        uint256 amount;
        bytes32 conditionHash;
        uint256 deadline;
        EscrowStatus status;
        bytes32 linkedObjectId;
    }

    IECONEconomicObjectEscrow public economicObjectContract;
    address public owner;

    mapping(bytes32 => EscrowRecord) public escrows;

    event EscrowLocked(
        bytes32 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 conditionHash,
        uint256 deadline,
        bytes32 linkedObjectId
    );
    event DeliverySubmitted(bytes32 indexed id, bytes32 deliveryProof);
    event EscrowReleased(bytes32 indexed id, address indexed seller, uint256 amount, bytes32 linkedObjectId);
    event EscrowRefunded(bytes32 indexed id, address indexed buyer, uint256 amount);
    event EconomicObjectContractUpdated(address indexed oldContract, address indexed newContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "ECON: Only owner");
        _;
    }

    constructor(address _economicObjectContract) {
        owner = msg.sender;
        if (_economicObjectContract != address(0)) {
            economicObjectContract = IECONEconomicObjectEscrow(_economicObjectContract);
        }
    }

    function setEconomicObjectContract(address _newContract) external onlyOwner {
        require(_newContract != address(0), "ECON: Invalid address");
        address oldContract = address(economicObjectContract);
        economicObjectContract = IECONEconomicObjectEscrow(_newContract);
        emit EconomicObjectContractUpdated(oldContract, _newContract);
    }

    function lockEscrow(
        bytes32 id,
        address seller,
        bytes32 conditionHash,
        uint256 deadline
    ) external payable {
        _lockInternal(id, seller, conditionHash, deadline, bytes32(0));
    }

    function lockObjectEscrow(
        bytes32 id,
        address seller,
        bytes32 conditionHash,
        uint256 deadline,
        bytes32 linkedObjectId
    ) external payable {
        require(linkedObjectId != bytes32(0), "ECON: Invalid objectId");
        _lockInternal(id, seller, conditionHash, deadline, linkedObjectId);
    }

    function _lockInternal(
        bytes32 id,
        address seller,
        bytes32 conditionHash,
        uint256 deadline,
        bytes32 linkedObjectId
    ) internal {
        require(msg.value > 0, "ECON: Escrow amount must be > 0");
        require(seller != address(0), "ECON: Invalid seller");
        require(escrows[id].amount == 0, "ECON: Escrow ID exists");
        require(deadline > block.timestamp, "ECON: Deadline must be in future");

        escrows[id] = EscrowRecord({
            id: id,
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            conditionHash: conditionHash,
            deadline: deadline,
            status: EscrowStatus.LOCKED,
            linkedObjectId: linkedObjectId
        });

        emit EscrowLocked(id, msg.sender, seller, msg.value, conditionHash, deadline, linkedObjectId);
    }

    function submitDelivery(bytes32 id, bytes32 deliveryProof) external {
        EscrowRecord storage escrow = escrows[id];
        require(msg.sender == escrow.seller, "ECON: Only seller can submit delivery");
        require(escrow.status == EscrowStatus.LOCKED, "ECON: Escrow not in LOCKED state");

        escrow.status = EscrowStatus.DELIVERED;
        emit DeliverySubmitted(id, deliveryProof);
    }

    function verifyAndRelease(bytes32 id) external {
        EscrowRecord storage escrow = escrows[id];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller || msg.sender == owner,
            "ECON: Unauthorized party"
        );
        require(
            escrow.status == EscrowStatus.DELIVERED || escrow.status == EscrowStatus.VERIFIED,
            "ECON: Delivery not submitted"
        );

        escrow.status = EscrowStatus.RELEASED;
        uint256 payout = escrow.amount;
        bytes32 linkedObj = escrow.linkedObjectId;

        // If an economic object was linked, atomically transfer it to the buyer upon release
        if (linkedObj != bytes32(0) && address(economicObjectContract) != address(0)) {
            economicObjectContract.transferFrom(escrow.seller, escrow.buyer, linkedObj);
        }

        (bool sent, ) = payable(escrow.seller).call{value: payout}("");
        require(sent, "ECON: MON transfer to seller failed");

        emit EscrowReleased(id, escrow.seller, payout, linkedObj);
    }

    function refund(bytes32 id) external {
        EscrowRecord storage escrow = escrows[id];
        require(
            msg.sender == escrow.buyer || block.timestamp > escrow.deadline || msg.sender == owner,
            "ECON: Refund conditions not met"
        );
        require(
            escrow.status == EscrowStatus.LOCKED,
            "ECON: Escrow cannot be refunded"
        );

        escrow.status = EscrowStatus.REFUNDED;
        uint256 refundAmount = escrow.amount;

        (bool sent, ) = payable(escrow.buyer).call{value: refundAmount}("");
        require(sent, "ECON: MON refund to buyer failed");

        emit EscrowRefunded(id, escrow.buyer, refundAmount);
    }

    function getEscrow(bytes32 id) external view returns (EscrowRecord memory) {
        return escrows[id];
    }
}
