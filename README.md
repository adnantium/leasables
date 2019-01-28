

# Leasables 

The Leasables protocol models the relationship between a Lessor and Lessee and facilitates its execution thru the agreement's lifecycle. The Leasable.sol Contract captures the essential elements of any lease agreement for any asset or resource:

* The details of the agreement
  * Start and end times of the lease term
  * Pickup & return locations and conditions
  * Key identifying attributes of the object
  * Terms of use for the lessee
  * The lessor's responsibilities during the lease
  * Payment rate, frequency and method
* The Lessor's & Lessee's available actions at each step such as Sign, Deposit,Pickup & Return
* Handling of Funds
  * Accepting payments from the lessee
  * Holding and releasing deposit and security funds in escrow
  * Distributed funds to the Leasable object's contract balance

This initial implementation is specialized for leasing cars but the underlying concepts apply to any object/asset/resource that can be "rented" for a period of time.

Key components:
* `LeasableCar.sol`: The on-chain representation of a car available for lease
* `LeaseAgreement.sol` An agreement between a LeasableCar and driver
  
## Setup

Essential Requirements:
* Solidity v5+
* Truffle v5+
* Web3 v1+
* React v16.5+

See details at: [Dev & Demo Environment Setup](docs/dev_installation.md)


## Short term lease agreements executed as smart contracts

Using Leasables, 2 participants in a network can come to an agreement on the terms of a lease that will be initiated, executed and enforced by a set of smart contracts in a trustless environment such as Ethereum.

Each lease agreement's primary representation is a digital smart contract but it can also generate a corresponding traditional version in english (legalese) that is legally admissible in court if things go bad with the deal.

Implementing the lease transaction as a smart contract gives us all the benefits of doing business on a decentralized trustless platform where the transactions can cost less and run more securely and efficiently. The lessor & lessee execute the deal without an intermediary between them. The network provides all the trust needed as it serves as witness to:
* what was agreed on in the contract
* what is the current state at each step
* what needs to be done to complete the transaction


## Leasable Agreement Lifecycle

An agreement transitions thru the following states:
 * Draft
 * Driver Signed
 * Approved
 * InProgress
 * Car Returned
 * Finalized
 * Ended

### Draft
  * Created by Car at the request of an interested driver
  * The contract has no funds in it or commitments made. Just a draft for review.
  * The car will create draft contracts by its choice based on availability, pricing and driver reputation

### DriverSigned
  * Driver has signed the agreement by putting down the required deposit

### Committed
  * Owner has signed and put in promise deposit
  * Driver and the car now have a committed agreement for a lease
  
### InProgress
  * Driver has picked up the car and the clock is running

### CarReturned
  * Driver has returned the car by transferring possession as defined in the agreement.
  * Driver may still own money to the agreement.
  * The condition of the returned car needs to be validated by the owner
  
### Finalized
  * Owner has finalized the agreement. 
  * Driver's deposit and any other remaining balance will be used to settle balances
  * This also triggers:
    * Car's funds earned from the lease agreement are transfered to the car contract
    * Owner's promise deposit is refunded

### Ended
  * Driver has withdrawn deposit and any remaining funds from the agreement.
  * The agreement is over and contract is read-only now.


