

* [Dev Environment Setup](dev_installation.md)
* [Design Decisions](design_decisions.md)
* [Deployed Addresses](deployed_addresses.md)
* [Avoiding Common Attacks](avoiding_common_attacks.md)

* [Guiding Walkthru](demo_walkthru.md): The UI is ugly and quite unusable. helps make sense of what happening under the hood.

### Design Choices
* The agreement is between the car driver and the car. The owner of the car helps manage and facilitate the agreement thru its lifecycle
* Lease agreement drafts created by the car not 'remembered' by it. An agreement doesnt become real to the car and added to its list until the driver commits with some cash money.

### Tests
* Written in javascript - see `test/`
* Focus was on testing:
  * Permission limits on the participants that can interact with each function in the contracts
    * Drivers cannot access owner function etc.
  * Time mgmt and cost of lease calculation

### Misc
* Circuit breaker:
  * See `Leaseable.sol`: `deactivate()` and `activate()`
* Doxygen tags based on:
  * [Layout of a Solidity Source File — Solidity 0.5.3 documentation](https://solidity.readthedocs.io/en/v0.5.3/layout-of-source-files.html#comments)
  * [Ethereum Natural Specification Format](https://github.com/ethereum/wiki/wiki/Ethereum-Natural-Specification-Format)

