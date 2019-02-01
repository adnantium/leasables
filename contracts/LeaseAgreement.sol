pragma solidity >=0.4.24 <0.6.0;

import "./LeasableCar.sol";

/** @title Lease Agreement
  * @author Adnan (adnan214@github)
  */

contract LeaseAgreement {

    // The LeasableCar & the driver
    address payable public the_car;
    address payable public the_driver;

    // this is usually the car but not neccasarily
    address public contract_creator;

    uint public start_timestamp;
    uint public end_timestamp;

    bool public is_driver_signed = false;
    bool public is_owner_signed = false;

    // add these balances and amounts are in wei!
    uint256 public daily_rate;
    uint public wei_per_sec;

    uint256 public driver_deposit_required;
    uint256 public owner_deposit_required;


    event AgreementDraftCreated(address the_car, address the_driver, uint start_timestamp, uint end_timestamp, uint256 daily_rate);

    // modifier driver_only(string memory error_message) { require(msg.sender == the_driver, error_message); _; }
    // modifier owner_only(string memory error_message) { address car_owner = getCarOwner(); require(msg.sender == car_owner, error_message); _; } 
    // modifier car_only(string memory error_message) { require(msg.sender == the_car, error_message); _; }
    
    /** @dev Creator
      * @param _car Address of car
      * @param _driver Driver's onchain address
      * @param _start_timestamp The planned pickup time
      * @param _end_timestamp The planned return time
      * @param _daily_rate Cost per 24hours
      */    
    constructor (
        address payable _car, 
        address payable _driver, 
        uint _start_timestamp, 
        uint _end_timestamp,
        uint256 _daily_rate
        ) 
        public 
    {
        contract_creator = msg.sender;
        the_car = _car;
        the_driver = _driver;
        start_timestamp = _start_timestamp;
        end_timestamp = _end_timestamp;
        daily_rate = _daily_rate;

        // 86400 secs in 1 day
        wei_per_sec = daily_rate/86400;

        // default deposit amounts:
        // driver: 4 days
        // owner: 2 days
        driver_deposit_required = daily_rate * 4;
        owner_deposit_required = daily_rate * 2;

        emit AgreementDraftCreated(the_car, the_driver, start_timestamp, end_timestamp, daily_rate);
    }

    /** @dev For convienently getting the UID of the car's onchain owner
      * @return Address of the owner
      */
    function getCarOwner() 
        public 
        view
        returns (address the_owner)
    {
        LeasableCar car_contract = LeasableCar(the_car);
        address car_owner = car_contract.owner();
        return car_owner;
    }


}
