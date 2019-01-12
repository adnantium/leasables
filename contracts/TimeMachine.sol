pragma solidity >=0.4.24 <0.6.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TimeMachine is Ownable {

    uint secs_in_hour = 60*60;
    uint secs_in_day = 60*60*24;
    uint public time_now; 

    constructor(uint _time_now) public {
        time_now = _time_now;
    }

    function setNow(uint _time_now) public onlyOwner {
        time_now = _time_now;
    }

    function forwardHours(uint _hours) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now + _hours * secs_in_hour;
        return time_now;
    }

    function backHours(uint _hours) 
        public 
        onlyOwner
        returns (uint timethe_time_now_now)
    {
        time_now = time_now - _hours * secs_in_hour;
        return time_now;
    }

    function forwardDays(uint _days) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now + _days * secs_in_day;
        return time_now;
    }

    function backDays(uint _days) 
        public 
        onlyOwner
        returns (uint the_time_now)
    {
        time_now = time_now - _days * secs_in_day;
        return time_now;
    }
}
