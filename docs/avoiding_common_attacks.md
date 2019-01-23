

## Race Conditions &  Re-entrancy Attacks
* Avoid calling any external function to untrusted addresses/contracts.
* Handle all internal state changes before calling any external functions
* Pull rather than push payments by using the withdrawl pattern
* Protect again cross-function re-entracy:
  * What if multiple contract functions are called?
    * Could they end up tripping on each other?
    * What shared state are they relying on or modifying?

## Integer Over & Underflow
* Use OpenZepplin SafeMath for uint256
* Check for potential overflow errors before any math is done with the numbers.
* Extra careful when accepting any numbers coming in as external input
* 

## Think About

  * 