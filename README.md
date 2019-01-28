
# Leasables 

The `Leasables` protocol models the relationship between a Lessor and Lessee and facilitates its execution thru the agreement's lifecycle. The `LeasableCar.sol` & `LeaseAgreement.sol` contracts capture the essential elements of any lease agreement for any asset or resource:

* The details of the agreement
  * Start and end times of the lease term
  * Pickup & return locations and conditions
  * Key identifying attributes of the object of lease
  * Terms of use for the lessee and the lessor's responsibilities
  * Payment rate, frequency and method
* The Lessor's & Lessee's available actions at each step such as Sign, Deposit, Pickup & Return
* Handling of Funds
  * Accepting payments from the lessee
  * Holding and releasing deposit and security funds in escrow
  * Distributed funds to the Leasable object's contract balance

This initial implementation is specialized for leasing cars but the underlying concepts apply to any object/asset/resource that can be "rented" for a period of time.

Key components:
* `LeasableCar.sol`: The on-chain representation of a car available for lease
* `LeaseAgreement.sol` An agreement for a limited term contract between a LeasableCar and driver
  
## Setup

Essential Requirements:
* Solidity v5+
* Truffle v5+
* Web3.js v1+
* React v16.5+

Details: [Dev & Demo Environment Setup](docs/dev_env_setup.md)

## Short term lease agreements executed as smart contracts

Using Leasables, 2 participants in a network can come to an agreement on the terms of a lease that will be initiated, executed and enforced by a set of smart contracts in a trustless environment such as Ethereum.

Each lease agreement's primary representation is a digital smart contract but it can also generate a corresponding traditional version in english (aka legalese) that is legally admissible in court if things go bad with the deal.

Implementing the lease transaction as a smart contract gives us all the benefits of doing business on a decentralized trustless platform where the transactions can cost less and can run more securely and efficiently. The lessor & lessee execute the deal without an intermediary between them. The network provides all the trust needed as it serves as witness to:
* What was agreed on in the contract
* What is the current state at each step
* What needs to be done to complete the transaction

The code includes a a rudimentary UI to illustrate how drivers, cars and car owners would interact thru the lifecycle of the agreement. See: [Demo Walkthru](docs/demo_walkthru.md)
