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
// The car owner(s) can specifcy:
//  * start and enddate of the time range that this car is available
//  * minimum allowed lease period e.g. 10 days

// The contracts between the car and driver are created thru this contract. 


contract LeasableCar is Leasable {

    string public VIN;
    string public year;
    string public model;
    string public manufacturer;
    string public color;

    string[] public photos;

    LeaseAgreement[] public lease_agreements;

    // this is in wei! Not ether or $$
    uint public daily_rate;

    uint public minimum_lease_days = 1;

    event LeaseAgreementCreated(LeaseAgreement contractAddress);
    event LeaseAgreementClosed(LeaseAgreement contractAddress);

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

    function getLeaseAgreements() public view returns (LeaseAgreement[] memory) {
        return lease_agreements;
    }

    function validate_date_format (
        uint _timestamp)
        public
        pure
        returns (bool)
    {
        require(_timestamp > 1514808000, "All lease dates must be after Jan 1st 2018!");
        // TODO: do more detailed validation
        // HARDCODED
        return true;
    }

    function check_approved_driver (
        address _driver)
        public
        pure
        returns (bool)
    {
        // TODO:
        // check that driver meets the requirements for leasing this car.
        // will involve:
        //  * driver has a valid association with some external identity mgmt protocol e.g. uport
        //  * driver has a deposit in escrow (now or later?)
        //  * 
        // HARDCODED!
        return true;
    }

    function check_dates_are_available (
        uint _start_timestamp,
        uint _end_timestamp)
        public
        pure
        returns (bool)
    {
        require(_end_timestamp > _start_timestamp, "End of lease has to be AFTER the start!");

        // TODO: iterate thru the existing contracts
        // check that start & end dates dont conflict with any of them
        // HARDCODED!
        return true;
    }


    // called by the wanna be driver
    function requestDraftAgreement (
        uint _start_timestamp,
        uint _end_timestamp,
        address _time_machine)
        public
        returns (LeaseAgreement lease_agreement)
    {
        address payable driver = msg.sender;
        address car_address = address(this) ;
        address payable car = address(uint160(car_address));

        // TODO: confirm if this driver is cool enough to get a 
        //  contract for this nice car
        require(check_approved_driver(driver), "Driver is not approved to lease this vehicle");

        // TODO: Check:
        //  start/end dates are valid.
        require(validate_date_format(_start_timestamp), "start date is invalid!");
        require(validate_date_format(_end_timestamp), "end date is invalid!");
         
        //  Need to look at all existing LeaseAgreements for this car
        //  Ensure the timeframe in this LeaseAgreement does not overlap
        //  with any previously created LeaseAgreement contracts
        require(check_dates_are_available(_start_timestamp, _end_timestamp), "Lease term is not available!");

        LeaseAgreement new_leaseagreement = new LeaseAgreement(
            car, driver, _start_timestamp, _end_timestamp, daily_rate, _time_machine);
        lease_agreements.push(new_leaseagreement);

        emit LeaseAgreementCreated(new_leaseagreement);

        return new_leaseagreement;
    }

    function() external payable {}
    // function closeAgreement(address _lease_agreement_address)
    //     payable
    //     external
    // {
    //     // TODO require(msg.sender == a known contract!)
    //     // LeaseAgreement lease_agreement = LeaseAgreement(_lease_agreement_address);
    //     // lease_agreement.carFinalize();

    //     emit LeaseAgreementClosed(_lease_agreement_address);
    // }
    
}
