// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Organization.sol";

contract CivilizationRegistry {
    enum Status { Active, Replaced, Retired }
    struct OrganizationRecord {
        bytes32 id;
        bytes32 familyId;
        bytes32 parentId;
        bytes32 previousVersionId;
        address instance;
        uint32 generation;
        uint32 version;
        uint256 resourceUnits;
        Status status;
    }

    address public owner;
    address public relayer;
    bytes32 public immutable genesisId;
    mapping(bytes32 => OrganizationRecord) private records;
    mapping(bytes32 => bytes32[]) private childIds;
    mapping(bytes32 => bool) public usedProposalIds;
    bytes32[] private organizationIds;

    event OrganizationCreated(bytes32 indexed proposalId, bytes32 indexed organizationId, bytes32 indexed parentId, address instance, bytes32 constitutionHash, uint256 resourceUnits);
    event OrganizationEvolved(bytes32 indexed proposalId, bytes32 indexed previousId, bytes32 indexed organizationId, address instance, bytes32 constitutionHash, uint32 version);
    event OrganizationRetired(bytes32 indexed proposalId, bytes32 indexed organizationId, uint256 returnedResourceUnits);
    event RelayerChanged(address indexed relayer);

    error Unauthorized();
    error InvalidProposal();
    error InvalidParent();
    error InvalidOrganization();
    error InsufficientResources();
    error ActiveChildren();

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier onlyRelayer() { if (msg.sender != relayer) revert Unauthorized(); _; }

    constructor(string memory genesisName, string memory genesisPurpose, uint256 genesisResources) {
        owner = msg.sender;
        relayer = msg.sender;
        genesisId = keccak256("LDC_GENESIS");
        bytes32 familyId = keccak256(abi.encodePacked("FAMILY", genesisId));
        bytes32 constitutionHash = keccak256(bytes("Immutable Genesis constitutional core"));
        Organization root = new Organization(address(this), genesisId, familyId, bytes32(0), bytes32(0), 0, 1, genesisName, "civilization", genesisPurpose, constitutionHash);
        records[genesisId] = OrganizationRecord(genesisId, familyId, bytes32(0), bytes32(0), address(root), 0, 1, genesisResources, Status.Active);
        organizationIds.push(genesisId);
        emit OrganizationCreated(bytes32(0), genesisId, bytes32(0), address(root), constitutionHash, genesisResources);
    }

    function setRelayer(address nextRelayer) external onlyOwner {
        if (nextRelayer == address(0)) revert Unauthorized();
        relayer = nextRelayer;
        emit RelayerChanged(nextRelayer);
    }

    function createOrganization(
        bytes32 proposalId, bytes32 parentId, string calldata name, string calldata organizationType,
        string calldata purpose, bytes32 constitutionHash, uint256 allocation
    ) external onlyRelayer returns (bytes32 id, address instance) {
        if (proposalId == bytes32(0) || usedProposalIds[proposalId]) revert InvalidProposal();
        OrganizationRecord storage parent = records[parentId];
        if (parent.instance == address(0) || parent.status != Status.Active) revert InvalidParent();
        if (allocation > parent.resourceUnits) revert InsufficientResources();
        usedProposalIds[proposalId] = true;
        parent.resourceUnits -= allocation;
        id = keccak256(abi.encode("CREATE", proposalId));
        if (records[id].instance != address(0)) revert InvalidProposal();
        uint32 generation = parent.generation + 1;
        bytes32 familyId = keccak256(abi.encodePacked("FAMILY", id));
        Organization child = new Organization(address(this), id, familyId, parentId, bytes32(0), generation, 1, name, organizationType, purpose, constitutionHash);
        instance = address(child);
        records[id] = OrganizationRecord(id, familyId, parentId, bytes32(0), instance, generation, 1, allocation, Status.Active);
        childIds[parentId].push(id);
        organizationIds.push(id);
        emit OrganizationCreated(proposalId, id, parentId, instance, constitutionHash, allocation);
    }

    function evolveOrganization(
        bytes32 proposalId, bytes32 previousId, string calldata name, string calldata organizationType,
        string calldata purpose, bytes32 constitutionHash, uint256 additionalAllocation
    ) external onlyRelayer returns (bytes32 id, address instance) {
        if (proposalId == bytes32(0) || usedProposalIds[proposalId]) revert InvalidProposal();
        OrganizationRecord storage previous = records[previousId];
        if (previous.instance == address(0) || previous.status != Status.Active || previousId == genesisId) revert InvalidOrganization();
        OrganizationRecord storage parent = records[previous.parentId];
        uint256 returnedUnits = previous.resourceUnits;
        if (additionalAllocation > parent.resourceUnits) revert InsufficientResources();
        if (previous.parentId != bytes32(0)) parent.resourceUnits -= additionalAllocation;
        usedProposalIds[proposalId] = true;
        id = keccak256(abi.encode("EVOLVE", proposalId));
        if (records[id].instance != address(0)) revert InvalidProposal();
        uint256 newUnits = returnedUnits + additionalAllocation;
        Organization next = new Organization(address(this), id, previous.familyId, previous.parentId, previousId, previous.generation, previous.version + 1, name, organizationType, purpose, constitutionHash);
        instance = address(next);
        Organization(previous.instance).setStatus(Organization.Status.Replaced);
        previous.status = Status.Replaced;
        records[id] = OrganizationRecord(id, previous.familyId, previous.parentId, previousId, instance, previous.generation, previous.version + 1, newUnits, Status.Active);
        if (previous.parentId != bytes32(0)) childIds[previous.parentId].push(id);
        organizationIds.push(id);
        emit OrganizationEvolved(proposalId, previousId, id, instance, constitutionHash, previous.version + 1);
    }

    function retireOrganization(bytes32 proposalId, bytes32 organizationId) external onlyRelayer {
        if (proposalId == bytes32(0) || usedProposalIds[proposalId]) revert InvalidProposal();
        OrganizationRecord storage record = records[organizationId];
        if (record.instance == address(0) || record.status != Status.Active || organizationId == genesisId) revert InvalidOrganization();
        bytes32[] storage children = childIds[organizationId];
        for (uint256 i; i < children.length; ++i) {
            if (records[children[i]].status == Status.Active) revert ActiveChildren();
        }
        usedProposalIds[proposalId] = true;
        uint256 returnedUnits = record.resourceUnits;
        if (record.parentId != bytes32(0)) records[record.parentId].resourceUnits += returnedUnits;
        record.resourceUnits = 0;
        record.status = Status.Retired;
        Organization(record.instance).setStatus(Organization.Status.Retired);
        emit OrganizationRetired(proposalId, organizationId, returnedUnits);
    }

    function getOrganization(bytes32 id) external view returns (OrganizationRecord memory) { return records[id]; }
    function organizationCount() external view returns (uint256) { return organizationIds.length; }
    function organizationAt(uint256 index) external view returns (OrganizationRecord memory) { return records[organizationIds[index]]; }
    function childrenOf(bytes32 id) external view returns (bytes32[] memory) { return childIds[id]; }
}
