// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONEconomicObject
 * @notice Registry of stateful, programmable economic objects (compute credits, API licenses, escrow claims).
 */
contract ECONEconomicObject {
    enum ObjectStatus { ACTIVE, IN_ESCROW, STRANDED, RECOVERED, EXPIRED, LIQUIDATED }

    struct EconomicObject {
        bytes32 id;
        address owner;
        uint8 objectType;
        uint256 value; // In MON wei
        uint256 expiry;
        bool transferable;
        ObjectStatus status;
        bytes32 metadataHash;
    }

    mapping(bytes32 => EconomicObject) public objects;

    event ObjectCreated(bytes32 indexed id, address indexed owner, uint8 objectType, uint256 value);
    event ObjectTransferred(bytes32 indexed id, address indexed previousOwner, address indexed newOwner);
    event ObjectStatusUpdated(bytes32 indexed id, ObjectStatus status);

    modifier onlyOwner(bytes32 id) {
        require(objects[id].owner == msg.sender, "ECON: Not object owner");
        _;
    }

    function createObject(
        bytes32 id,
        uint8 objectType,
        uint256 value,
        uint256 expiry,
        bool transferable,
        bytes32 metadataHash
    ) external {
        require(objects[id].owner == address(0), "ECON: Object already exists");

        objects[id] = EconomicObject({
            id: id,
            owner: msg.sender,
            objectType: objectType,
            value: value,
            expiry: expiry,
            transferable: transferable,
            status: ObjectStatus.ACTIVE,
            metadataHash: metadataHash
        });

        emit ObjectCreated(id, msg.sender, objectType, value);
    }

    function transferObject(bytes32 id, address newOwner) external onlyOwner(id) {
        require(objects[id].transferable, "ECON: Object is not transferable");
        require(objects[id].status == ObjectStatus.ACTIVE, "ECON: Object not active");
        require(newOwner != address(0), "ECON: Invalid recipient");

        address previousOwner = objects[id].owner;
        objects[id].owner = newOwner;

        emit ObjectTransferred(id, previousOwner, newOwner);
    }

    function setStatus(bytes32 id, ObjectStatus newStatus) external onlyOwner(id) {
        objects[id].status = newStatus;
        emit ObjectStatusUpdated(id, newStatus);
    }
}
