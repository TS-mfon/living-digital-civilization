// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/CivilizationRegistry.sol";

interface Vm {
    function prank(address sender) external;
}

contract CivilizationRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    CivilizationRegistry private registry;

    function setUp() public {
        registry = new CivilizationRegistry("Living Civilization", "Create bounded institutions", 1_000_000);
    }

    function testCreateEvolveRetireAndReturnResources() public {
        bytes32 root = registry.genesisId();
        bytes32 proposal1 = keccak256("proposal-create");
        (bytes32 childId, address childAddress) = registry.createOrganization(
            proposal1, root, "Research", "research", "Open research coordination", keccak256("constitution-v1"), 20_000
        );
        CivilizationRegistry.OrganizationRecord memory child = registry.getOrganization(childId);
        _eq(childId, Organization(childAddress).id());
        _eq(child.parentId, root);
        _eq(child.familyId, keccak256(abi.encodePacked("FAMILY", childId)));
        _eq(child.generation, 1);
        _eq(child.version, 1);
        _eq(child.resourceUnits, 20_000);
        _eq(uint256(child.status), uint256(CivilizationRegistry.Status.Active));
        _eq(registry.getOrganization(root).resourceUnits, 980_000);
        _eq(registry.childrenOf(root).length, 1);

        bytes32 proposal2 = keccak256("proposal-evolve");
        (bytes32 nextId, address nextAddress) = registry.evolveOrganization(
            proposal2, childId, "Research v2", "research", "Open research and reproducibility", keccak256("constitution-v2"), 5_000
        );
        CivilizationRegistry.OrganizationRecord memory next = registry.getOrganization(nextId);
        _eq(next.familyId, child.familyId);
        _eq(next.previousVersionId, childId);
        _eq(next.version, 2);
        _eq(next.generation, 1);
        _eq(next.resourceUnits, 25_000);
        _eq(uint256(registry.getOrganization(childId).status), uint256(CivilizationRegistry.Status.Replaced));
        _eq(uint256(Organization(childAddress).status()), uint256(Organization.Status.Replaced));
        _eq(registry.getOrganization(root).resourceUnits, 975_000);

        registry.retireOrganization(keccak256("proposal-retire"), nextId);
        _eq(uint256(registry.getOrganization(nextId).status), uint256(CivilizationRegistry.Status.Retired));
        _eq(registry.getOrganization(nextId).resourceUnits, 0);
        _eq(registry.getOrganization(root).resourceUnits, 1_000_000);
        _eq(uint256(Organization(nextAddress).status()), uint256(Organization.Status.Retired));
        _eq(registry.organizationCount(), 3);
    }

    function testOnlyOwnerChangesRelayerAndOnlyRelayerMutatesRegistry() public {
        (bool ownerCall,) = address(registry).call(abi.encodeCall(registry.setRelayer, (address(0xBEEF))));
        _true(ownerCall);
        _eq(registry.relayer(), address(0xBEEF));

        vm.prank(address(0xCAFE));
        (bool unauthorized,) = address(registry).call(abi.encodeCall(
            registry.createOrganization,
            (keccak256("p"), registry.genesisId(), "X", "x", "Some purpose", keccak256("c"), 1)
        ));
        _false(unauthorized);

        vm.prank(address(0xCAFE));
        (bool ownerDenied,) = address(registry).call(abi.encodeCall(registry.setRelayer, (address(0xCAFE))));
        _false(ownerDenied);
    }

    function testGenesisCannotBeRetiredAndDuplicateProposalCannotBeReplayed() public {
        (bool genesisRetired,) = address(registry).call(abi.encodeCall(
            registry.retireOrganization, (keccak256("retire-genesis"), registry.genesisId())
        ));
        _false(genesisRetired);

        bytes32 proposal = keccak256("once");
        registry.createOrganization(proposal, registry.genesisId(), "Child", "research", "Purpose long enough", keccak256("c"), 1);
        (bool replayed,) = address(registry).call(abi.encodeCall(
            registry.createOrganization, (proposal, registry.genesisId(), "Child", "research", "Purpose long enough", keccak256("c"), 1)
        ));
        _false(replayed);
    }

    function testCannotRetireOrganizationWithActiveChildren() public {
        (bytes32 parent,) = registry.createOrganization(keccak256("parent"), registry.genesisId(), "Parent", "research", "Parent mission", keccak256("c"), 10);
        registry.createOrganization(keccak256("child"), parent, "Child", "lab", "Child mission", keccak256("c"), 5);
        (bool retired,) = address(registry).call(abi.encodeCall(registry.retireOrganization, (keccak256("retire-parent"), parent)));
        _false(retired);
    }

    function _eq(bytes32 a, bytes32 b) private pure { require(a == b, "bytes32 mismatch"); }
    function _eq(address a, address b) private pure { require(a == b, "address mismatch"); }
    function _eq(uint256 a, uint256 b) private pure { require(a == b, "uint mismatch"); }
    function _true(bool value) private pure { require(value, "expected true"); }
    function _false(bool value) private pure { require(!value, "expected false"); }
}
