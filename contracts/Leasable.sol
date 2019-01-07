pragma solidity >=0.4.24 <0.6.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Leasable is Ownable {

    string public object_name = "default name";
    string public description;
    string public test_str = "TESTING";

    // constructor() public {
    // }

    function setName(string memory _name) public onlyOwner {
        object_name = _name;
    }

    function getName() public view returns (string memory) {
        return object_name;
    }

}
