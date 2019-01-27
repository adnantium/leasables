pragma solidity >=0.4.24 <0.6.0;

import {Ownable} from "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/** @title Leasable */
contract Leasable is Ownable {

    bool public is_active = true;

    /** @dev Ensures a function can only be called when the contract is active.
      * @param error_message text passed to require()
      */            
    modifier only_when_activated(string memory error_message) 
    { 
        require(is_active == true, error_message); 
        _; 
    }

    /** @dev Ensures a function can only be called when the contract is inactive.
      * @param error_message text passed to require()
      */        
    modifier only_when_deactivated(string memory error_message) 
    { 
        require(is_active == false, error_message); 
        _; 
    }

    /** @dev Turns the contracts off. Sets is_active to false. 
      * Can only be called by the owner when contract is active
      */
    function deactivate() 
        public
        onlyOwner
        only_when_activated("Contract is already deactivated!")
    {
        is_active = false;
    }
    

    /** @dev Turns the contracts on. Sets is_active to true. 
      * Can only be called by the owner when contract is inactive
      */
    function activate() 
        public
        onlyOwner
        only_when_deactivated("Contract is already activated!")
    {
        is_active = true;
    }

}
