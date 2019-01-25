





### Upgradability
  * New car and lease contract creation done thru `LeasablesRegistry.sol`
  * New cars being brought onto chain will use latest version of `LeasableCar.sol` contract as its configured in the registry contract.
  * New lease agreements `LeaseAgreement.sol` created by each car will also go thru registry
  * Registry ensures that all newly created contracts use the latest most secure an cost efficient versions.
  * Car contracts can be retired and the car on chain representation can be moved to a new contract

### Risk and Damage controls
  * Minimized amount of funds exposed at risk thru the contract:
    * The contracts act as pass thru channels for the flow money from the driver to the car owner and they keep a low balance of funds within the each of the contracts.
    * Car's balance of collected funds can be withdrawn into the safety of owner's account(s) as frequently as needed.
    * Drivers can maintain the minimum balance needed by controlling payment into the lease agreement contract.

### Circuit Breakers
  * It any issues are found in the `LeasableCar.sol` contract:
    * `LeasableCar.disable()`:
      * Car owners can disable the availability of a car at anytime to prevent new lease agreements from it. The owner can transfer (retire old contract and create new contract) to new contract based on the 
  * (Future) If any issues are found in the `LeaseAgreement.sol` contract:
    * `LeaseAgreement.offerUpdatedContract(address new_agreement_contract`:
      * Owner can offer the driver a new agreement contract that contains the same terms but utilized the upgraded version of `LeaseAgreemen.sol`
      * Can also be used for non-security issues that require a fresh lease agreement but still maintains a connection to the original agreement
      * Driver can `acceptUpdatedAgreement(address new_agreement_contract` and then all future processing and execution of the payments will be done on new contract and the original contract will be disabled.
    * 

### Push vs Pull Payments using Withdrawal pattern:
  * Drivers push payments into `LeaseAgreement.sol`. All transfers of funds go the `LeaseAgreement.withdraw()`

### Rate Limiting & Speed Bumps
  * The LeaseAgreement contract limits the frequency that the `processCycle()` function can be run at (default 1 hour). Slows down the impacts of any attack that tries to move money out of the contract.
  * 

### Restricted Access
  * Minimize the contract details and state information that is public exposed outside the contract.
  * Only the car driver or its owner(s) can interact with any functions on the LeaseAgreement
  * check require() condition in the beginning of each function
  * Whenever possible, restricted other contract’s access to the state by making state variables private.
  * 


### Smart Contract Documentation
  * document data state expectations incoming for each function
  * document expected end of function data state for each function

### Auto-deprecation and Contract Mortality
* LeaseAgreement.sol contract effectively self expire at the end of its term.
* Funds cannot go in or out of LeaseAgreement contracts once its been completed and settled by the driver & owner. The LeaseAgreement has a limit lifespan that it can function within.
* 