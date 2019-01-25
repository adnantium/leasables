pragma solidity >=0.4.24 <0.6.0;

import "./LeasableCar.sol";
import "./TimeMachine.sol";

contract LeaseAgreement {

    enum LeaseAgreementStates {
        Created,            //0
        PartiallySigned,    //1
        Approved,           //2
        InProgress,         //3
        Completed,          //4
        OverDue,            //5
        Finalized,          //6
        Closed              //7
    }

    // The LeasableCar 
    address payable public the_car;
    // The Driver
    address payable public the_driver;

    // this is usually the car but not neccasarily
    address public contract_creator;

    LeaseAgreementStates public agreement_state = LeaseAgreementStates.Created;
    uint public start_timestamp;
    uint public end_timestamp;

    TimeMachine public time_machine;

    bool public is_driver_signed = false;
    bool public is_owner_signed = false;

    bool public driver_access_enabled = false;

    bool public is_started = false;
    bool public is_ended = false;

    // add these balances and amounts are in wei!
    uint256 public daily_rate;
    uint public wei_per_sec;

    uint256 public driver_deposit_required;
    uint256 public driver_deposit_amount = 0;

    uint256 public owner_deposit_required;
    uint256 public owner_deposit_amount = 0;

    uint256 public driver_balance = 0;
    uint256 public driver_over_balance = 0;
    uint256 public car_balance = 0;

    uint public pickup_time;
    uint public return_time;

    uint public last_cycle_time;

    // Agreement state transition events
    event DraftCreated(address the_car, address the_driver, uint start_timestamp, uint end_timestamp, uint256 daily_rate, address time_machine);
    event DriverSigned(address the_car, address the_driver, uint256 deposit_amount);
    event OwnerSigned(address the_car, address the_driver, uint256 deposit_amount);
    event AgreementApproved(address the_car, address the_driver);
    event AgreementStarted(address the_car, address the_driver);
    event AgreementCompleted(address the_car, address the_driver);
    event AgreementOverDue(address the_car, address the_driver, uint driver_over_balance);
    event AgreementFinalized(address the_car, address the_driver);

    // balance update events
    event DriverBalanceUpdated(address the_car, address the_driver, uint256 new_balance);
    event DriverBalanceLow(address the_car, address the_driver, uint256 the_balance, uint balance_needed);
    event DriverOverBalance(address the_car, address the_driver, uint256 the_over_balance);
    event CarBalanceUpdated(address the_car, address the_driver, uint256 new_balance);
    event CycleProcessed(address the_car, address the_driver, uint start_time, uint end_time, uint256 cycle_cost);
    event OwnerDepositReturned(address the_car, address the_driver, uint owner_deposit_refund_due);
    event CarBalanceTransfered(address the_car, address the_driver, uint car_balance_due);


    // External (physical) events
    event CarReturned(address the_car, address the_driver, uint256 the_time);
    event DriverAccessEnabled(address the_car, address the_driver, uint256 the_time);
    event DriverAccessDisabled(address the_car, address the_driver, uint256 the_time);
    event DriverAccessFailure(address the_car, address the_driver, uint256 the_time);

    
    modifier driver_only(string memory error_message) { require(msg.sender == the_driver, error_message); _; }
    modifier owner_only(string memory error_message) { address car_owner = getCarOwner(); require(msg.sender == car_owner, error_message); _; } 
    modifier car_only(string memory error_message) { require(msg.sender == the_car, error_message); _; }
    
    constructor (
        address payable _car, 
        address payable _driver, 
        uint _start_timestamp, 
        uint _end_timestamp,
        uint256 _daily_rate,
        address _time_machine
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
        // driver: 4 days of payments
        // owner: 2 days
        driver_deposit_required = daily_rate * 4;
        owner_deposit_required = daily_rate * 2;

        time_machine = TimeMachine(_time_machine);
        emit DraftCreated(the_car, the_driver, start_timestamp, end_timestamp, daily_rate, address(time_machine));
    }

    function timeTillStart() public view returns (uint time_till_start)
    {
        uint the_time_now = time_machine.time_now();
        if (the_time_now > start_timestamp) {
            return 0;
        }        
        return start_timestamp - the_time_now;
    }


    function timeTillEnd()
        public
        view
        returns (uint time_till_end)
    {
        uint the_time_now = time_machine.time_now();
        if (the_time_now > end_timestamp) {
            return 0;
        }        
        return end_timestamp - the_time_now;
    }

    function getCarOwner() 
        public 
        view
        returns (address the_owner)
    {
        LeasableCar car_contract = LeasableCar(the_car);
        address car_owner = car_contract.owner();
        return car_owner;
    }

    function contract_balance() 
        public view 
        returns (uint the_balance)
    {
        return address(this).balance;
    }

    function driverSign()
        public 
        payable 
        driver_only("Only driver can sign agreement as the driver!")
    {
        // require(msg.sender == the_driver, "Only driver can sign agreement!");
        require(is_driver_signed == false, "Agreement has already been signed by driver");
        require(msg.value >= driver_deposit_required, "Insufficient deposit amount!");

        driver_deposit_amount = driver_deposit_required;
        is_driver_signed = true;
        emit DriverSigned(the_car, the_driver, driver_deposit_amount);

        if (is_owner_signed) {
            agreement_state = LeaseAgreementStates.Approved;
            emit AgreementApproved(the_car, the_driver);
        } else {
            agreement_state = LeaseAgreementStates.PartiallySigned;
        }

        // add any extra $ to the driver's balance
        if (msg.value > driver_deposit_required) {
            driver_balance = msg.value - driver_deposit_required;
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);
        }
    }

    function ownerSign() 
        public 
        payable 
        owner_only("Only owner can sign agreement as the owner!")
    {
        require(is_owner_signed == false, "Agreement has already been signed by owner");
        require(msg.value >= owner_deposit_required, "Insufficient deposit amount!");

        owner_deposit_amount = owner_deposit_required;
        is_owner_signed = true;
        emit OwnerSigned(the_car, the_driver, owner_deposit_amount);

        if (is_driver_signed) {
            agreement_state = LeaseAgreementStates.Approved;
            emit AgreementApproved(the_car, the_driver);
        } else {
            agreement_state = LeaseAgreementStates.PartiallySigned;
        }

        // add any extra $ to the car's balance
        if (msg.value > owner_deposit_required) {
            car_balance = msg.value - owner_deposit_required;
            emit CarBalanceUpdated(the_car, the_driver, car_balance);
        }
    }

    function driverPickup()
        public
        payable
        driver_only("Only the driver can pickup!")
        // atLeaseState(LeaseAgreementStates.Approved)
        // atTime(0)
    {
    
        require(agreement_state == LeaseAgreementStates.Approved, "Agreement has not been fully approved!");
        require(timeTillStart() == 0, "Agreement is not ready to start yet");
        // require: car location is right (?)

        uint time_now = time_machine.time_now();
        pickup_time = time_now;
        last_cycle_time = pickup_time;

        // change agrement state -> Started
        agreement_state = LeaseAgreementStates.InProgress;
        emit AgreementStarted(the_car, the_driver);

        bool was_enabled = enableDriverAccess();
        if (was_enabled == false) {
            emit DriverAccessFailure(the_car, the_driver, time_now);
        } else {
            driver_access_enabled = true;
        }
    }

    function driverPayment() 
        public 
        payable 
        driver_only("Only the driver can make payments!")
    {

        driver_balance += msg.value;
        emit DriverBalanceUpdated(the_car, the_driver, driver_balance);

        // pay off as much of 'driver_over_balance' possible as needed
        if (driver_over_balance > 0) {
            if (driver_balance >= driver_over_balance) {
                driver_balance = driver_balance - driver_over_balance;
                driver_over_balance = 0;
            } else {
                driver_over_balance = driver_over_balance - driver_balance;
                driver_balance = 0;
                emit DriverOverBalance(the_car, the_driver, driver_over_balance);
            }
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);
        }        
    }

    function processRebalance(uint cost_of_this_cycle) 
        internal 
        returns (uint remaining_balance_due)
    {

        // move $ from driver balance to car's balance
        if (cost_of_this_cycle > driver_balance) {
            emit DriverBalanceLow(the_car, the_driver, driver_balance, cost_of_this_cycle);

            // take all money from driver's balance
            car_balance += driver_balance;
            uint still_due = cost_of_this_cycle - driver_balance;
            driver_balance = 0;

            // take any remaining money needed from the driver's deposit
            if (still_due > driver_deposit_amount) {
                car_balance += driver_deposit_amount;
                still_due = still_due - driver_deposit_amount;
                driver_deposit_amount = 0;
                driver_over_balance = still_due;
                emit DriverOverBalance(the_car, the_driver, driver_over_balance);
            }
            return still_due;

        } else {

            driver_balance -= cost_of_this_cycle;
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);

            car_balance += cost_of_this_cycle;
            emit CarBalanceUpdated(the_car, the_driver, car_balance);

            return 0;
        }
    }

    function processCycle() 
        public 
        returns (uint cycle_cost)
    {
        address car_owner = getCarOwner();

        require(
            msg.sender == the_driver || msg.sender == the_car || msg.sender == car_owner, 
            "Only the driver, the car or its owner can run a cycle!");

        uint time_now = time_machine.time_now();
        // calculate how long (secs) its been since last cycle
        uint since_last_cycle = time_now - last_cycle_time;
        require(since_last_cycle >= 3599, "Too soon to run a cycle. Can only be run once per hour");

        uint cost_of_this_cycle = since_last_cycle * wei_per_sec;

        uint still_due = processRebalance(cost_of_this_cycle);
        driver_over_balance = still_due;

        emit CycleProcessed(the_car, the_driver, last_cycle_time, time_now, cost_of_this_cycle);
        last_cycle_time = time_now;

        return cost_of_this_cycle;
    }

    function driverReturn() 
        public 
        driver_only("Only the driver can do return!")
    { 

        uint time_now = time_machine.time_now();

        // run a quick final cycle
        uint since_last_cycle = time_now - last_cycle_time;
        uint cost_of_this_cycle = since_last_cycle * wei_per_sec;
        uint still_due = processRebalance(cost_of_this_cycle);
        last_cycle_time = time_now;
        driver_over_balance = still_due;

        return_time = time_now;
        bool was_disabled = disableDriverAccess();
        if (was_disabled == false) {
            emit DriverAccessFailure(the_car, the_driver, time_now);
        } else {
            driver_access_enabled = false;
        }
        emit CarReturned(the_car, the_driver, return_time);

        if (driver_over_balance > 0) {
            agreement_state = LeaseAgreementStates.OverDue;
            emit AgreementOverDue(the_car, the_driver, driver_over_balance);

        } else {
            agreement_state = LeaseAgreementStates.Completed;
            emit AgreementCompleted(the_car, the_driver);
        }
    }

    function ownerFinalize()
        public
        owner_only("Only the car owner can ownerFinalize!")
    {
        require(agreement_state == LeaseAgreementStates.Completed || 
            agreement_state == LeaseAgreementStates.OverDue,
            "Agreement can only be finalized when its Completed or OverDue");

        // release the owner's deposit
        uint owner_deposit_refund_due = owner_deposit_amount;
        owner_deposit_amount = 0; 
        msg.sender.transfer(owner_deposit_refund_due);
        emit OwnerDepositReturned(the_car, the_driver, owner_deposit_refund_due);

        // transfer the car's balance
        uint car_balance_due = car_balance;
        car_balance = 0;
        the_car.transfer(car_balance_due);
        // the_car.closeAgreement.value(car_balance_due);
        emit CarBalanceTransfered(the_car, the_driver, car_balance_due);

        if (agreement_state == LeaseAgreementStates.Completed) {
            agreement_state = LeaseAgreementStates.Finalized;
        }
    }

    function driverFinalize()
        public
        driver_only("Only the driver can driverFinalize!")
    {
        require(agreement_state == LeaseAgreementStates.Finalized,
            "Driver cannot finalize the agreement yet. Owner first!");
        require(driver_over_balance == 0, "Driver cannot finalize with an overdue balance");

        // release the driver's deposit
        uint driver_deposit_refund_due = driver_deposit_amount;
        driver_deposit_amount = 0; 
        msg.sender.transfer(driver_deposit_refund_due);

        // return any unused funds balance
        uint driver_balance_refund_due = driver_balance;
        driver_balance = 0; 
        msg.sender.transfer(driver_balance_refund_due);
    }

    function getCarStatus() 
        public
        pure 
        // NOTE: marking as 'pure' to silence compiler warning. Will not be pure once implmented
        returns (uint mileage, string memory geolocation)
    {
        // TODO: this connects to the status of the car in the real world. 
        // IOT integration can give us:
        //  * current mileage 
        //  * current geolocation
        // HARDCODED!!!
        return (11111, "fake_geo_location");
    }

    function disableDriverAccess() 
        private 
        returns (bool was_disabled)
    {
        uint time_now = time_machine.time_now();
        // TODO: call an oracle to handle this

        emit DriverAccessDisabled(the_car, the_driver, time_now);

        return true;
    }

    function enableDriverAccess() 
        private 
        returns (bool was_enabled)
    {
        uint time_now = time_machine.time_now();
        // TODO: call an oracle to handle this

        emit DriverAccessEnabled(the_car, the_driver, time_now);

        return true;
    }
}
