
# Leasables: ConsenSys Bootcamp Final Project

*github.com/adnan214*

* [Dev Environment Setup](dev_installation.md)
* [Design Decisions](design_decisions.md)
* [Deployed Addresses](deployed_addresses.md)
* [Avoiding Common Attacks](avoiding_common_attacks.md)

### Details
* [Guiding Walkthru](demo_walkthru.md): The UI is ugly and quite unusable. helps make sense of what happening under the hood.

### Design Choices
* The logical model of the agreement is between the car driver and the car. The owner(s) of the car is a secondary participant that helps manage and facilitate the agreement thru its lifecycle but the Car is at the center of the relationship.
* Lease agreement drafts created by the car are not initially 'remembered' by it. An agreement doesn't become real to the car and added to its list until the driver commits with some cash money. A bad actor can can create all the draft contracts they want at own cost but it won't effect the state of a Car until the prospective driver puts some money down.
* Ownership of the car in the real world isn't handled at all here. Keeping on chain data in sync with the outside world is a much larger fundamental problem.
* The Lease Agreement contract is limited in short-lived time-frame so it is designed to be more rigid and not changeable much after the it is committed to by the participants.
* More: [Design Decisions](design_decisions.md)

### Tests
* Written in javascript - see `test/`
* Focus was on testing:
  * Permission limits on the participants that can interact with each function in the contracts
    * e.g. Drivers cannot access Owner's action function etc.
  * Time elapsed tracking
  * Incremental cost calculation
  * Controlled sequential execution of contract from 1 state to the next
  * Movements of funds into and out of the contract

```
  Contract: TestDriverReturn
    ✓ Checking ownerFinalize() and driverFinalize() with positive driver balance... (339ms)
    ✓ Checking ownerFinalize() with negative driver balance... (289ms)

  Contract: TestSignAgreement
    ✓ Checking driverSign with exact deposit amount... (208ms)
    ✓ Checking driverSign with extra deposit amount... (210ms)
    ✓ Checking driverSign require() conditions... (333ms)
    ✓ Checking ownerSign require() conditions... (496ms)
    ✓ Checking ownerSign with exact deposit amount... (231ms)

  Contract: TestDriverPayments
    ✓ Checking contract_balance()... (354ms)

  Contract: TestDriverPickup
    ✓ Checking driverPickup()... (571ms)

  Contract: TestDriverReturn
    ✓ Checking driverReturn()... (517ms)

  Contract: TestLeasableOwnership
    ✓ Checking ownership... (41ms)
    ✓ Checking activate() and deactivate()... (260ms)

  Contract: TestProcessCycle
    ✓ Checking processCycle()... (656ms)

  Contract: TestRequestContract
    ✓ Checking requestDraftAgreement... (114ms)
    ✓ Checking requestDraftAgreement() on deactivated Leasable... (88ms)

  Contract: TestTimeMachine
    ✓ Checking time in/decrement... (315ms)
    ✓ Checking time mgmt with LeaseAgreement... (556ms)

  17 passing (8s)
```


### Misc
* Circuit breaker:
  * See `Leaseable.sol`: `deactivate()` and `activate()`
* Doxygen tags based on:
  * [Layout of a Solidity Source File — Solidity 0.5.3 documentation](https://solidity.readthedocs.io/en/v0.5.3/layout-of-source-files.html#comments)
  * [Ethereum Natural Specification Format](https://github.com/ethereum/wiki/wiki/Ethereum-Natural-Specification-Format)

