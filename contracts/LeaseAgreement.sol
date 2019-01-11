pragma solidity >=0.4.24 <0.6.0;

import "./LeasableCar.sol";

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

    bool is_driver_signed = false;
    bool is_owner_signed = false;

    bool is_started = false;
    bool is_ended = false;

    // add these balances and amounts are in wei!
    uint256 public daily_rate;

    uint256 public driver_deposit_required;
    uint256 public driver_deposit_amount = 0;

    uint256 public owner_deposit_required;
    uint256 public owner_deposit_amount = 0;

    uint256 public driver_balance = 0;
    uint256 public car_balance = 0;

    event DraftCreated(address the_car, address the_driver, uint start_timestamp, uint end_timestamp, uint256 daily_rate);
    event DriverSigned(address the_car, address the_driver, uint256 deposit_amount);
    event DriverBalanceUpdated(address the_car, address the_driver, uint256 new_balance);
    event OwnerSigned(address the_car, address the_driver, uint256 deposit_amount);
    event CarBalanceUpdated(address the_car, address the_driver, uint256 new_balance);
    
    constructor (
        address _car, 
        address _driver, 
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

        // default deposit amounts:
        // driver: 4 weeks of payments
        // owner: 2 weeks
        driver_deposit_required = daily_rate * 28;
        owner_deposit_required = daily_rate * 14;

        emit DraftCreated(the_car, the_driver, start_timestamp, end_timestamp, daily_rate);
    }

    function driverSign() public payable {
        require(msg.sender == the_driver, "Only driver can sign agreement!");
        require(is_driver_signed == false, "Agreement has already been signed by driver");
        require(msg.value >= driver_deposit_required, "Insufficient deposit amount!");

        driver_deposit_amount = driver_deposit_required;
        is_driver_signed = true;
        emit DriverSigned(the_car, the_driver, driver_deposit_amount);

        // add any extra $ to the driver's balance
        if (msg.value > driver_deposit_required) {
            driver_balance = msg.value - driver_deposit_required;
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);
        }
    }

    function ownerSign() public payable {

        LeasableCar car_contract = LeasableCar(the_car);
        address car_owner = car_contract.owner();

        require(msg.sender == car_owner, "Only owner can sign agreement!");
        require(is_owner_signed == false, "Agreement has already been signed by owner");
        require(msg.value >= owner_deposit_required, "Insufficient deposit amount!");

        owner_deposit_amount = owner_deposit_required;
        is_owner_signed = true;
        emit OwnerSigned(the_car, the_driver, owner_deposit_amount);

        // add any extra $ to the driver's balance
        if (msg.value > owner_deposit_required) {
            car_balance = msg.value - owner_deposit_required;
            emit CarBalanceUpdated(the_car, the_driver, car_balance);
        }
    }
}
