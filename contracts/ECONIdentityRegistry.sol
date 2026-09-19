// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONIdentityRegistry
 * @notice On-chain identity registry for autonomous economic agents on Monad.
 */
contract ECONIdentityRegistry {
    struct Identity {
        address controller;
        bytes32 metadataHash;
        bool active;
        uint256 registeredAt;
    }

    mapping(bytes32 => Identity) public identities;
    mapping(address => bytes32) public walletToAgent;

    event AgentRegistered(bytes32 indexed agentId, address indexed controller, bytes32 metadataHash);
    event AgentStatusChanged(bytes32 indexed agentId, bool active);
    event MetadataUpdated(bytes32 indexed agentId, bytes32 newMetadataHash);

    modifier onlyController(bytes32 agentId) {
        require(identities[agentId].controller == msg.sender, "ECON: Not agent controller");
        _;
    }

    function registerAgent(bytes32 agentId, bytes32 metadataHash) external {
        require(identities[agentId].registeredAt == 0, "ECON: Agent already registered");
        require(walletToAgent[msg.sender] == bytes32(0), "ECON: Wallet already mapped");

        identities[agentId] = Identity({
            controller: msg.sender,
            metadataHash: metadataHash,
            active: true,
            registeredAt: block.timestamp
        });

        walletToAgent[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, metadataHash);
    }

    function setStatus(bytes32 agentId, bool active) external onlyController(agentId) {
        identities[agentId].active = active;
        emit AgentStatusChanged(agentId, active);
    }

    function updateMetadata(bytes32 agentId, bytes32 newHash) external onlyController(agentId) {
        identities[agentId].metadataHash = newHash;
        emit MetadataUpdated(agentId, newHash);
    }

    function isAgentActive(bytes32 agentId) external view returns (bool) {
        return identities[agentId].active;
    }
}
