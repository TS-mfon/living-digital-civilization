// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Organization {
    enum Status { Active, Replaced, Retired }

    address public immutable registry;
    bytes32 public immutable id;
    bytes32 public immutable familyId;
    bytes32 public immutable parentId;
    bytes32 public immutable previousVersionId;
    uint32 public immutable generation;
    uint32 public immutable version;
    string public name;
    string public organizationType;
    string public purpose;
    bytes32 public constitutionHash;
    Status public status;

    error OnlyRegistry();

    constructor(
        address registry_, bytes32 id_, bytes32 familyId_, bytes32 parentId_, bytes32 previousVersionId_,
        uint32 generation_, uint32 version_, string memory name_, string memory organizationType_,
        string memory purpose_, bytes32 constitutionHash_
    ) {
        registry = registry_;
        id = id_;
        familyId = familyId_;
        parentId = parentId_;
        previousVersionId = previousVersionId_;
        generation = generation_;
        version = version_;
        name = name_;
        organizationType = organizationType_;
        purpose = purpose_;
        constitutionHash = constitutionHash_;
        status = Status.Active;
    }

    function setStatus(Status next) external {
        if (msg.sender != registry) revert OnlyRegistry();
        status = next;
    }
}
