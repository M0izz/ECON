// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECONIdentityRegistry
 * @notice On-chain sovereign identity registry for autonomous economic agents on Monad.
 * Compatible with ERC-8004 agent passport discovery and verification standards.
 */
contract ECONIdentityRegistry {
    struct Identity {
        address controller;
        bytes32 metadataHash;
        string agentURI;
        bool active;
        uint256 registeredAt;
    }

    mapping(bytes32 => Identity) public identities;
    mapping(address => bytes32) public walletToAgent;
    bytes32[] public allAgentIds;

    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed controller,
        bytes32 metadataHash,
        string agentURI
    );
    event AgentStatusChanged(bytes32 indexed agentId, bool active);
    event MetadataUpdated(bytes32 indexed agentId, bytes32 newMetadataHash, string newURI);

    modifier onlyController(bytes32 agentId) {
        require(identities[agentId].controller == msg.sender, "ECON: Not agent controller");
        _;
    }

    function registerAgent(bytes32 agentId, bytes32 metadataHash) external {
        registerAgentWithURI(agentId, metadataHash, "");
    }

    function registerAgentWithURI(
        bytes32 agentId,
        bytes32 metadataHash,
        string memory agentURI
    ) public {
        require(identities[agentId].registeredAt == 0, "ECON: Agent already registered");
        require(walletToAgent[msg.sender] == bytes32(0), "ECON: Wallet already mapped");

        identities[agentId] = Identity({
            controller: msg.sender,
            metadataHash: metadataHash,
            agentURI: agentURI,
            active: true,
            registeredAt: block.timestamp
        });

        walletToAgent[msg.sender] = agentId;
        allAgentIds.push(agentId);

        emit AgentRegistered(agentId, msg.sender, metadataHash, agentURI);
    }

    function setStatus(bytes32 agentId, bool active) external onlyController(agentId) {
        identities[agentId].active = active;
        emit AgentStatusChanged(agentId, active);
    }

    function updateMetadata(bytes32 agentId, bytes32 newHash) external onlyController(agentId) {
        identities[agentId].metadataHash = newHash;
        emit MetadataUpdated(agentId, newHash, identities[agentId].agentURI);
    }

    function updateMetadataWithURI(
        bytes32 agentId,
        bytes32 newHash,
        string memory newURI
    ) external onlyController(agentId) {
        identities[agentId].metadataHash = newHash;
        identities[agentId].agentURI = newURI;
        emit MetadataUpdated(agentId, newHash, newURI);
    }

    function isAgentActive(bytes32 agentId) external view returns (bool) {
        return identities[agentId].active;
    }

    function getAgent(bytes32 agentId) external view returns (Identity memory) {
        return identities[agentId];
    }

    function getAgentByWallet(address wallet) external view returns (bytes32) {
        return walletToAgent[wallet];
    }

    function totalAgents() external view returns (uint256) {
        return allAgentIds.length;
    }
}
