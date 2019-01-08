pragma solidity ^0.5.0;

contract SimpleStorage {
    uint storedData;

    function setInt(uint x) public {
        storedData = x;
    }

    function getInt() public view returns (uint) {
        return storedData;
    }
}
