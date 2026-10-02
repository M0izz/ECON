// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONEconomicObject
 * @notice Registry of stateful, programmable economic objects (compute credits, API licenses, escrow claims).
 * Features ERC-721-style operator authorization so marketplaces and escrow contracts can safely manage asset lifecycle.
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
    mapping(bytes32 => address) public objectApprovals;
    mapping(address => mapping(address => bool)) public operatorApprovals;

    event ObjectCreated(bytes32 indexed id, address indexed owner, uint8 objectType, uint256 value);
    event ObjectTransferred(bytes32 indexed id, address indexed previousOwner, address indexed newOwner);
    event ObjectStatusUpdated(bytes32 indexed id, ObjectStatus status);
    event ObjectApproved(bytes32 indexed id, address indexed owner, address indexed approved);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyOwner(bytes32 id) {
        require(objects[id].owner == msg.sender, "ECON: Not object owner");
        _;
    }

    modifier onlyApprovedOrOwner(bytes32 id) {
        require(isApprovedOrOwner(msg.sender, id), "ECON: Not approved or owner");
        _;
    }

    function isApprovedOrOwner(address spender, bytes32 id) public view returns (bool) {
        address objOwner = objects[id].owner;
        require(objOwner != address(0), "ECON: Object does not exist");
        return (spender == objOwner || objectApprovals[id] == spender || operatorApprovals[objOwner][spender]);
    }

    function approve(address to, bytes32 id) external onlyOwner(id) {
        objectApprovals[id] = to;
        emit ObjectApproved(id, msg.sender, to);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "ECON: Cannot approve self");
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
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

    function transferObject(bytes32 id, address newOwner) external onlyApprovedOrOwner(id) {
        _executeTransfer(id, objects[id].owner, newOwner);
    }

    function transferFrom(address from, address to, bytes32 id) external onlyApprovedOrOwner(id) {
        require(objects[id].owner == from, "ECON: From address is not owner");
        _executeTransfer(id, from, to);
    }

    function _executeTransfer(bytes32 id, address from, address to) internal {
        require(objects[id].transferable, "ECON: Object is not transferable");
        require(objects[id].status == ObjectStatus.ACTIVE, "ECON: Object not active");
        require(to != address(0), "ECON: Invalid recipient");

        delete objectApprovals[id];
        objects[id].owner = to;

        emit ObjectTransferred(id, from, to);
    }

    function setStatus(bytes32 id, ObjectStatus newStatus) external onlyApprovedOrOwner(id) {
        objects[id].status = newStatus;
        emit ObjectStatusUpdated(id, newStatus);
    }
}
