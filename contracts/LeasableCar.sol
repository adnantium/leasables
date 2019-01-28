pragma solidity >=0.4.24 <0.6.0;

import "./Leasable.sol";
import "./LeaseAgreement.sol";

// On-chain representation of a specific Car in the real world. Each 
// car can (should) only have one "avatar" on the chain
// It manages and coordinates its own individual lease contracts with 
// drivers based on requirements provided by its owner(s)
// The agreements between the car and driver are created thru this contract. 

/**
  * @title Leasable Car
  * @author Adnan (adnan214@github)
  * @notice Represents a real world car. It legal ownership is not handled here. 
    Focus is on its identifying attributes, its state in the terestrial world and the lease agreements
  * @dev 
  */
contract LeasableCar is Leasable {

    string public VIN;
    string public year;
    string public model;
    string public manufacturer;
    string public color;

    LeaseAgreement[] public lease_agreements;

    uint public daily_rate; //wei!

    uint public minimum_lease_days = 1;

    event LeaseAgreementCreated(address contractAddress);
    event LeaseAgreementEnded(address contractAddress);

    /** @dev Constructor
      * @param _VIN The car unique ID in the real world
      * @param _year year
      * @param _model model
      * @param _manufacturer who built it
      * @param _color color
      * @param _daily_rate Cost to lease for 24 hours
      */
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

    /** @dev List of lease agreements that it car is commited to
      * @return address list of LeaseAgreement.sol contracts
      */
    function getLeaseAgreements() 
        public 
        view 
        returns (LeaseAgreement[] memory) 
    {
        return lease_agreements;
    }

    /** @dev Validate for an epoch date 
      * @param _timestamp Number of secs since epoch
      * @return true/false
      */
    function validate_date_format (
        uint _timestamp)
        internal
        pure
        returns (bool)
    {
        require(_timestamp > 1514808000, "All lease dates must be after Jan 1st 2018!");
        // TODO: do more detailed validation
        // HARDCODED
        return true;
    }

    /** @dev Checks out a prospective driver to ensure they are 
      *  good enought to lease a car to
      * @notice Doesnt do much now but intended to check the their
      *  on-chain reputation and anything legal or govt that we can connect to 
      * @param _driver Driver's on-chain UID
      * @return cool enough to lease this car?
      */
    function check_approved_driver (
        address _driver)
        internal
        pure //TODO: 'pure' to silence compiler warning. Remove me
        returns (bool)
    {
        // TODO:
        // check that driver meets the requirements for leasing this car.
        // will involve:
        //  * driver has a valid association with some external identity mgmt protocol e.g. uport
        //  * 
        // HARDCODED!
        require(_driver != address(0), "hack to silence warning about unused variable");
        return true;
    }

    /** @dev Confirms that the car is available to lease during a time period
      * @param _start_timestamp The pickup time
      * @param _end_timestamp The return time
      * @return Is it available?
      */
    function check_dates_are_available (
        uint _start_timestamp,
        uint _end_timestamp)
        internal
        pure //TODO: 'pure' to silence compiler warning. Remove me
        returns (bool)
    {
        require(_end_timestamp > _start_timestamp, "End of lease has to be AFTER the start!");

        // TODO: iterate thru the existing contracts
        // check that start & end dates dont conflict with any of them
        // HARDCODED!
        return true;
    }

    /** @notice Called by a driver looking to lease a car for a specific time period
      * @dev Create a new instance of a LeaseAgreement.sol contract. 
        It does not get added to the car's list until the driver commits. Its
        just a draft agreement created by the car at the driver's gas expense
        NOTE: this takes in an address of a "Time Machine" that the contract will 
        use as its time source. This for dev/prototyping only! Remove me!!
      * @param _start_timestamp The pickup time
      * @param _end_timestamp The return time
      * @param _end_timestamp For easy demo & prototyping. REMOVE ME!
      * @return The address of a newly create draft lease agreement
      */
    function requestDraftAgreement (
        uint _start_timestamp,
        uint _end_timestamp,
        address _time_machine)
        public
        only_when_activated("Cannot create any new lease agreements when car is deactivated!")
        returns (LeaseAgreement lease_agreement)
    {

        address payable driver = msg.sender;
        address car_address = address(this) ;
        address payable car = address(uint160(car_address));

        require(check_approved_driver(driver), "Driver is not approved to lease this vehicle");
        require(validate_date_format(_start_timestamp), "start date is invalid!");
        require(validate_date_format(_end_timestamp), "end date is invalid!");
         
        //  Need to look at all existing LeaseAgreements for this car
        //  Ensure the timeframe in this LeaseAgreement does not overlap
        //  with any previously created LeaseAgreement contracts
        require(check_dates_are_available(_start_timestamp, _end_timestamp), "Lease term is not available!");

        LeaseAgreement new_leaseagreement = new LeaseAgreement(
            car, driver, _start_timestamp, _end_timestamp, daily_rate, _time_machine);
        // lease_agreements.push(new_leaseagreement);
        // NOTE: not adding newly created draft contracts to list yet. Will add 
        // when owner is signing agreement after the driver has signed and 
        // commited a deposit

        emit LeaseAgreementCreated(address(new_leaseagreement));

        return new_leaseagreement;
    }

    /** @dev fallback catch all. 
      * @notice Funds earned by the car from the lease agreements coming thru here 
      */    
    function() external payable {}
    // TODO: not working as expected. Figure out!
    // function closeAgreement(address payable _lease_agreement_address)
    //     payable
    //     public
    // {
    //     // TODO require(msg.sender == a known contract!)
    //     // emit LeaseAgreementEnded(_lease_agreement_address);
    // }
}
