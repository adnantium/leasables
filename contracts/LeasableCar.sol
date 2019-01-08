pragma solidity >=0.4.24 <0.6.0;

import "./Leasable.sol";
import "./LeaseAgreement.sol";
// import "ethereum-datetime/contracts/DateTime.sol";

// Digital representation of a specific Car in the real world. Each 
// car can (should) only have one "avatar" on the chain
// 
// It manages and coordinates its own individual lease contracts with 
// drivers based on requirements provided by its owner(s)
// 
// The contract creator can specifcy:
//  * start and enddate of the time range that this car is available
//  * minimum allowed lease period e.g. 10 days
//  * The "home" street address that the car's pickup and return must be done within
//  * Max distance from "home" Default 5 miles
//  * 
// The contracts between the car and driver are created thru this contract. The contract 
//  assures no conflicts in time ranges


contract LeasableCar is Leasable {

    string public VIN;
    string public year;
    string public model;
    string public manufacturer;
    string public color;

    string[] public photos;

    LeaseAgreement[] public lease_agreements;

    uint public daily_rate;
    uint public minimum_lease_days = 1;

    // dict of yyyyddmm -> the price for that day
    // mapping (uint => uint) date_prices;

    // the list dates that any prices have been defined for
    // does not mean the car is available, just that we have a price
    // uint[] dates_priced;

    event LeaseAgreementCreated(LeaseAgreement contractAddress);
    event LeaseAgreementFinalized(LeaseAgreement contractAddress);

    constructor(
            string memory _VIN,
            string memory _year,
            string memory _model,
            string memory _manufacturer,
            string memory _color,
            uint _daily_rate)
        public
    {
        // TODO: check validity of each field
        VIN = _VIN;
        year = _year;
        model = _model;
        manufacturer = _manufacturer;
        color = _color;
        daily_rate = _daily_rate;
    }

    function getDailyRate() public view returns (uint)
    {
        return daily_rate;
    }

    function getLeaseAgreements() public view returns (LeaseAgreement[] memory) {
        return lease_agreements;
    }

    function validate_date_format (
        uint _timestamp)
        public
        pure
        returns (bool)
    {
        // TODO: do the validation
        // will hope for best in meantime
        return true;
    }

    function approve_driver (
        address _driver)
        public
        returns (bool)
    {
        // TODO:
        // check that driver meets the requirements for leasing this car.
        // will involve:
        //  * drover has a valid association with some external identity mgmt protocol e.g. uport
        //  * driver has a deposit in escrow (now or later?)
        //  * 

        // will hope for best in meantime
        return true;
    }

    function check_dates_are_available (
        uint _start_timestamp,
        uint _end_timestamp)
        public
        returns (bool)
    {
        // TODO: iterate thru the existing contracts
        // check that start & end dates dont conflict with any of them

        // will hope for best in meantime
        return true;
    }


    // called by the wanna be driver
    function requestContractDraft (
        uint _start_timestamp,
        uint _end_timestamp)
        public
        returns (LeaseAgreement lease_agreement)
    {
        address driver = msg.sender;
        address car = address(this);

        // TODO: confirm if this driver is cool enough to get a 
        //  contract for this nice car
        require(approve_driver(driver), "Driver is not approved to lease this vehicle");

        // TODO: Check:
        //  start/end dates are valid.
        require(validate_date_format(_start_timestamp), "start date is invalid!");
        require(validate_date_format(_end_timestamp), "end date is invalid!");
         
        //  Need to look at all existing LeaseAgreements for this car
        //  Ensure the timeframe in this LeaseAgreement does not overlap
        //  with any previously created LeaseAgreement contracts
        require(check_dates_are_available(_start_timestamp, _end_timestamp), "Lease term is not available!");

        LeaseAgreement new_leaseagreement = new LeaseAgreement(
            car, driver, _start_timestamp, _end_timestamp);
        lease_agreements.push(new_leaseagreement);

        emit LeaseAgreementCreated(new_leaseagreement);

        return new_leaseagreement;
    }
}
