pragma solidity >=0.4.24 <0.6.0;

import "./LeasableCar.sol";
import "./TimeMachine.sol";

/** @title Lease Agreement
  * @author Adnan (adnan214@github)
  */

// 
// TODO: Split this up into multiple files. It huge.
// TODO: Move external/physical interaction code
// 
contract LeaseAgreement {

    enum LeaseAgreementStates {
        Draft,        //0
        DriverSigned, //1
        Approved,     //2
        InProgress,   //3
        CarReturned,  //4
        Finalized,    //5
        Ended         //6
    }

    // The LeasableCar & the driver
    address payable public the_car;
    address payable public the_driver;

    // this is usually the car but not neccasarily
    address public contract_creator;

    LeaseAgreementStates public agreement_state = LeaseAgreementStates.Draft;
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

    // The last time processCycle() was run
    uint public last_cycle_time;

    // Agreement state transition events
    event DraftCreated(address the_car, address the_driver, uint start_timestamp, uint end_timestamp, uint256 daily_rate, address time_machine);
    event DriverSigned(address the_car, address the_driver, uint256 deposit_amount);
    event OwnerSigned(address the_car, address the_driver, uint256 deposit_amount);
    event AgreementApproved(address the_car, address the_driver);
    event AgreementStarted(address the_car, address the_driver);
    event AgreementCompleted(address the_car, address the_driver);
    event AgreementOverDue(address the_car, address the_driver, uint driver_over_balance);
    event AgreementOwnerFinalized(address the_car, address the_driver);
    event AgreementDriverFinalized(address the_car, address the_driver);
    event AgreementEnded(address the_car, address the_driver);

    // balance update events
    event DriverDepositCollected(address the_car, address the_driver, uint256 deposit_amount);
    event OwnerDepositCollected(address the_car, address the_owner, address the_driver, uint256 deposit_amount);
    
    event DriverBalanceUpdated(address the_car, address the_driver, uint256 new_balance);
    event DriverBalanceLow(address the_car, address the_driver, uint256 the_balance, uint balance_needed);
    event DriverOverBalance(address the_car, address the_driver, uint256 the_over_balance);
    event CarBalanceUpdated(address the_car, address the_driver, uint256 new_balance);

    event CycleProcessed(address the_car, address the_driver, uint start_time, uint end_time, uint256 cycle_cost);

    event DriverDepositReturned(address the_car, address the_driver, uint deposit_refund_amount);
    event OwnerDepositReturned(address the_car, address the_driver, uint deposit_refund_amount);
    event CarBalanceTransfered(address the_car, address the_driver, uint car_balance);


    // External (physical) events
    event CarPickedUp(address the_car, address the_driver, uint256 the_time);
    event CarReturned(address the_car, address the_driver, uint256 the_time);

    event DriverAccessEnabled(address the_car, address the_driver, uint256 the_time);
    event DriverAccessDisabled(address the_car, address the_driver, uint256 the_time);
    event DriverAccessFailure(address the_car, address the_driver, uint256 the_time);

    modifier driver_only(string memory error_message) { require(msg.sender == the_driver, error_message); _; }
    modifier owner_only(string memory error_message) { address car_owner = getCarOwner(); require(msg.sender == car_owner, error_message); _; } 
    modifier car_only(string memory error_message) { require(msg.sender == the_car, error_message); _; }
    
    /** @dev Creator
      * @param _car Address of car
      * @param _driver Driver's onchain address
      * @param _start_timestamp The planned pickup time
      * @param _end_timestamp The planned return time
      * @param _daily_rate Cost per 24hours
      * @param _time_machine FOR DEV ONLY! the time source for 'what time is now'
      */    
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
        // driver: 4 days
        // owner: 2 days
        driver_deposit_required = daily_rate * 4;
        owner_deposit_required = daily_rate * 2;

        time_machine = TimeMachine(_time_machine);
        emit DraftCreated(the_car, the_driver, start_timestamp, end_timestamp, daily_rate, address(time_machine));
    }

    /** @dev Time till the lease agreement's planned start. Based on time_now() from the time machine
      * @return Seconds till start
      */
    function timeTillStart() public view returns (uint time_till_start)
    {
        uint the_time_now = time_machine.time_now();
        if (the_time_now > start_timestamp) {
            return 0;
        }        
        return start_timestamp - the_time_now;
    }

    /** @dev Time till the lease agreement's planned end. Based on time_now() from the time machine
      * @return Seconds till end
      */
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

    /** @dev The agreements collected funds. Represently deposit 
        amounts from the driver+owner and payments collected that 
        have not yet been transferred to the car
      * @return balance in wei
      */

    function contract_balance() 
        public view 
        returns (uint the_balance)
    {
        return address(this).balance;
    }

    /** @notice Collects the deposit into escrow and marks the agreement as signed
      * @dev Triggers DriverDepositCollected, DriverSigned and DriverBalanceUpdated events
      */
    function driverSign()
        public 
        payable 
        driver_only("Only driver can sign agreement as the driver!")
    {
        require(msg.sender == the_driver, "Only driver can sign agreement!");
        require(is_driver_signed == false, "Agreement has already been signed by driver");
        require(msg.value >= driver_deposit_required, "Insufficient deposit amount!");

        driver_deposit_amount = driver_deposit_required;
        emit DriverDepositCollected(the_car, the_driver, driver_deposit_amount);

        is_driver_signed = true;
        emit DriverSigned(the_car, the_driver, driver_deposit_amount);

        agreement_state = LeaseAgreementStates.DriverSigned;

        // add any extra $ to the driver's balance
        if (msg.value > driver_deposit_required) {
            driver_balance = msg.value - driver_deposit_required;
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);
        }
    }

    /** @notice Collects the deposit from the owner and marks the agreement as signed
      * @dev Triggers OwnerDepositCollected, OwnerSigned and AgreementApproved events
      */
    function ownerSign() 
        public 
        payable 
        owner_only("Only owner can sign agreement as the owner!")
    {
        require(is_driver_signed == true, "Car owner cannot sign agreement before the driver");
        require(is_owner_signed == false, "Agreement has already been signed by owner");
        require(msg.value >= owner_deposit_required, "Insufficient deposit amount!");

        owner_deposit_amount = msg.value;
        emit OwnerDepositCollected(the_car, msg.sender, the_driver, owner_deposit_amount);

        is_owner_signed = true;
        emit OwnerSigned(the_car, the_driver, owner_deposit_amount);

        agreement_state = LeaseAgreementStates.Approved;
        emit AgreementApproved(the_car, the_driver);
    }

    /** @notice Initiates the transfer of possesion from the owner to the driver
      * @dev Triggers CarPickedUp, AgreementStarted and DriverAccessEnabled or DriverAccessFailure events
      * @return 
      */
    function driverPickup()
        public
        payable
        driver_only("Only the driver can pickup!")
        // atLeaseState(LeaseAgreementStates.Approved)
        // atTime(0)
    {
    
        // TODO: move these check to modifiers
        require(agreement_state == LeaseAgreementStates.Approved, "Agreement has not been fully approved!");
        require(timeTillStart() == 0, "Agreement is not ready to start yet");

        uint time_now = time_machine.time_now();

        pickup_time = time_now;
        last_cycle_time = pickup_time;
        emit CarPickedUp(the_car, the_driver, time_now);

        agreement_state = LeaseAgreementStates.InProgress;
        emit AgreementStarted(the_car, the_driver);

        bool was_enabled = enableDriverAccess();
        if (was_enabled == false) {
            emit DriverAccessFailure(the_car, the_driver, time_now);
        } else {
            driver_access_enabled = true;
        }
    }

    /** @notice Accepts the driver's payment
      * @dev Payable. Updates the driver's in contract balance. 
      * Triggers DriverBalanceUpdated and DriverOverBalance events
      */
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

    /** @dev Handles the mgmt of funds between from the driver to the car.
      *     Does not deal with time, just how much is owned and updates balances
      *     Triggers DriverBalanceLow, CarBalanceUpdated, DriverBalanceUpdated and DriverOverBalance
      * @param cost_of_this_cycle Cost of the cycles
      * @return Balance still owed by the driver
      */
    function processRebalance(uint cost_of_this_cycle) 
        internal 
        returns (uint remaining_balance_due)
    {

        // move $ from driver balance to car's balance
        if (cost_of_this_cycle > driver_balance) {
            emit DriverBalanceLow(the_car, the_driver, driver_balance, cost_of_this_cycle);

            // take all money from driver's balance
            car_balance += driver_balance;
            emit CarBalanceUpdated(the_car, the_driver, car_balance);

            uint still_due = cost_of_this_cycle - driver_balance;

            driver_balance = 0;
            emit DriverBalanceUpdated(the_car, the_driver, driver_balance);

            // take any remaining money needed from the driver's deposit
            if (still_due > 0) 
            {
                if (still_due <= driver_deposit_amount) {
                    // some deposit money will be left
                    driver_deposit_amount -= still_due;
                    // emit DriverBalanceUpdated(the_car, the_driver, driver_balance);

                    car_balance += still_due;                    
                    emit CarBalanceUpdated(the_car, the_driver, car_balance);

                    still_due = 0;

                } else {
                    // still_due is more than driver_deposit_amount!
                    // take what we can
                    car_balance += driver_deposit_amount;
                    emit CarBalanceUpdated(the_car, the_driver, car_balance);

                    still_due = still_due - driver_deposit_amount;
                    driver_over_balance = still_due;
                    emit DriverOverBalance(the_car, the_driver, driver_over_balance);

                    driver_deposit_amount = 0;
                }
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

    /** @dev Figures out what changed since the last run and updates the numbers
      *     Triggers CycleProcessed event
      * @return Cost of this cycle run
      */
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

    /** @notice Initiates the transfer of car posession from driver to owner
      * @dev It does one finalize process run and disables driver's access to the car
      *     Triggers AgreementOverDue or AgreementCompleted based on how much is owned/remaining 
      */
    function driverReturn() 
        public 
        driver_only("Only the driver can do return!")
    { 
        require(agreement_state == LeaseAgreementStates.InProgress,
            "Driver cannot return the car until after the agreement is InProgress");

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

        agreement_state = LeaseAgreementStates.CarReturned;
        emit CarReturned(the_car, the_driver, return_time);

        if (driver_over_balance > 0) {
            emit AgreementOverDue(the_car, the_driver, driver_over_balance);
        } else {
            emit AgreementCompleted(the_car, the_driver);
        }
    }

    /** @notice Wraps up the lease agreement after the owner has confirmed that 
      *     all the terms and conidtions of the lease were met and the driver can be 
      *     released of the responsibility to the car
      * @dev Refunds the driver's deposit and any remaining funds in the driver's balance
      *     Triggers OwnerDepositReturned, CarBalanceTransfered and AgreementOwnerFinalized
      */
    function ownerFinalize()
        public
        owner_only("Only the car owner can ownerFinalize!")
    {
        require(agreement_state == LeaseAgreementStates.CarReturned,
            "Agreement can only be finalized after CarReturned");

        // release the owner's deposit
        uint owner_deposit_refund_due = owner_deposit_amount;
        owner_deposit_amount = 0; 
        msg.sender.transfer(owner_deposit_refund_due);
        emit OwnerDepositReturned(the_car, the_driver, owner_deposit_refund_due);

        // transfer the car's balance
        uint car_balance_due = car_balance;
        car_balance = 0;
        the_car.transfer(car_balance_due);
        emit CarBalanceTransfered(the_car, the_driver, car_balance_due);

        agreement_state = LeaseAgreementStates.Finalized;
        emit AgreementOwnerFinalized(the_car, the_driver);
    }

    /** @notice Releases the driver and transfers deposit and any remaining balance
      * @dev Triggers AgreementDriverFinalized events
      */
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

        agreement_state = LeaseAgreementStates.Ended;
        emit AgreementDriverFinalized(the_car, the_driver);

    }

    /** @notice Connects out to the real world and get whatever info it can on the car's latest status
      *     That info should be stored in the lease history 
      * @dev HARDCODED!
      * @return mileage
      * @return geolocation
      */
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
        return (11111, "fake_geo,location");
    }

    /** @notice Connects out to the car in the real world and revokes the driver's access to it
      * @dev HARDCODED!
      * @return confirmation of deactivation success/failure
      */
    function disableDriverAccess() 
        private 
        returns (bool was_disabled)
    {
        uint time_now = time_machine.time_now();
        // TODO: call an oracle to handle this

        emit DriverAccessDisabled(the_car, the_driver, time_now);

        return true;
    }

    /** @notice Connects out to the car in the real world and gives the driver's access to it
      * @dev HARDCODED!
      * @return confirmation of activation success/failure
      */
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
