pragma solidity >=0.4.24 <0.6.0;

import {Ownable} from "openzeppelin-solidity/contracts/ownership/Ownable.sol";

// WARNING!! This is a tool for dev & demo only. Time Travel is theoretically possible but not 
// WARNING!!  been proven yet and can certainly not be done on-chain.

/** @title Time Machine
  * @author Adnan (adnan214@github)
  */
contract TimeMachine is Ownable {

    uint secs_in_hour = 60*60;
    uint secs_in_day = 60*60*24;

    uint public time_now; 

    /** @dev Constructor
      * @param _time_now The machine's inital epoch time
      */
    constructor(uint _time_now) public {
        time_now = _time_now;
    }

    /** @dev Sets the 'now' to the given epoch secs
      * @param _time_now The to move forward or back to
      */
    function setNow(uint _time_now) public onlyOwner {
        time_now = _time_now;
    }

    /** @dev Moves time forward by hours relative to 'time_now'
      * @param _hours The hours into the future
      * @return The new 'now' time
      */
    function forwardHours(uint _hours) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now + _hours * secs_in_hour;
        return time_now;
    }

    /** @dev Moves time backwards by hours relative to 'time_now'
      * @param _hours The hours into the past
      * @return The new 'now' time
      */
    function backHours(uint _hours) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now - _hours * secs_in_hour;
        return time_now;
    }

    /** @dev Moves time forward by days relative to 'time_now'
      * @param _days The days into the future
      * @return The new 'now' time
      */
    function forwardDays(uint _days) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now + _days * secs_in_day;
        return time_now;
    }

    /** @dev Moves time backwards by days relative to 'time_now'
      * @param _days The days into the past
      * @return The new 'now' time
      */
    function backDays(uint _days) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now - _days * secs_in_day;
        return time_now;
    }
}
