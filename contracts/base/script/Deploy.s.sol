// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/CivilizationRegistry.sol";

interface Vm {
    function envUint(string calldata name) external returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract Deploy {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (CivilizationRegistry registry) {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        registry = new CivilizationRegistry(
            "Living Civilization",
            "Create and evolve useful institutions within an immutable constitutional core.",
            1_000_000
        );
        vm.stopBroadcast();
    }
}
