// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONEscrow
 * @notice High-throughput conditional payment escrow for autonomous agents on Monad.
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
    }

    mapping(bytes32 => EscrowRecord) public escrows;

    event EscrowLocked(bytes32 indexed id, address indexed buyer, address indexed seller, uint256 amount, uint256 deadline);
    event DeliverySubmitted(bytes32 indexed id, bytes32 deliveryProof);
    event EscrowReleased(bytes32 indexed id, address indexed seller, uint256 amount);
    event EscrowRefunded(bytes32 indexed id, address indexed buyer, uint256 amount);

    function lockEscrow(
        bytes32 id,
        address seller,
        bytes32 conditionHash,
        uint256 deadline
    ) external payable {
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
            status: EscrowStatus.LOCKED
        });

        emit EscrowLocked(id, msg.sender, seller, msg.value, deadline);
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
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "ECON: Unauthorized party"
        );
        require(
            escrow.status == EscrowStatus.DELIVERED || escrow.status == EscrowStatus.VERIFIED,
            "ECON: Delivery not submitted"
        );

        escrow.status = EscrowStatus.RELEASED;
        uint256 payout = escrow.amount;

        (bool sent, ) = payable(escrow.seller).call{value: payout}("");
        require(sent, "ECON: MON transfer to seller failed");

        emit EscrowReleased(id, escrow.seller, payout);
    }

    function refund(bytes32 id) external {
        EscrowRecord storage escrow = escrows[id];
        require(
            msg.sender == escrow.buyer || block.timestamp > escrow.deadline,
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
}
