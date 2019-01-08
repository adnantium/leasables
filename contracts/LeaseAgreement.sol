pragma solidity >=0.4.24 <0.6.0;


contract LeaseAgreement {

    enum LeaseAgreementStates {
        Draft,
        Created,
        PartiallySigned,
        Approved,
        InProgress,
        Completed,
        Finalized
    }

    // The LeasableCar 
    address public the_car;
    // The Driver
    address public the_driver;
    address public contract_creator;

    LeaseAgreementStates public contract_state = LeaseAgreementStates.Draft;
    uint public start_timestamp = 0;
    uint public end_timestamp = 0;

    constructor (
        address _car, 
        address _driver, 
        uint _start_timestamp, 
        uint _end_timestamp) 
        public 
    {
        contract_creator = msg.sender;
        the_car = _car;
        the_driver = _driver;
        start_timestamp = _start_timestamp;
        end_timestamp = _end_timestamp;
    }

}
