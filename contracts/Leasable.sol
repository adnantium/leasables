pragma solidity >=0.4.24 <0.6.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Leasable is Ownable {

    bool public is_active = true;

    modifier only_when_activated(string memory error_message) 
    { 
        require(is_active == true, error_message); 
        _; 
    }
        
    modifier only_when_deactivated(string memory error_message) 
    { 
        require(is_active == false, error_message); 
        _; 
    }

    function deactivate() 
        public
        onlyOwner
        only_when_activated("Contract is already deactivated!")
    {
        is_active = false;
    }
    

    function activate() 
        public
        onlyOwner
        only_when_deactivated("Contract is already activated!")
    {
        is_active = true;
    }

}
