
# Dev Setup

## Base installation
* Get git, node, nvm, npm etc.
    * `$ sudo apt install git curl npm`
    * `$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash`
    * `$ nvm install v11.6.0`
    * Confirm:
        * `$ node --version` --> v11.6.0
        * `$ npm --version` --> 6.5.0
* Install Ganache - CLI or the pretty UI version
    * `$ sudo npm install -g ganache-cli`
    * or: https://truffleframework.com/ganache
* Get the code:
    * `$ git clone https://github.com/adnan214/leasables.git`
    * `$ cd leasables/`
    * `$ git checkout ConsenSysAcademy`
* Install our packages
    * `$ npm install`
    * `$ cd client`
    * `$ npm install`
    * `$ export PATH=~/leasables/node_modules/.bin:$PATH`
* Setup Metamask add-on: https://metamask.io/
   * It will generate a 12 word mnemonic for you or you can import an existing one if you prefer
* Add that mnemonic to a `.secret` file in the `leasables/` directory
   * `echo "word1 word2 ... word12" > ~/leasables/.secret`
    

## Compile, test & deploy

* `$ truffle compile --all`
```
Compiling ./contracts/Leasable.sol...
Compiling ./contracts/LeasableCar.sol...
Compiling ./contracts/LeaseAgreement.sol...
Compiling ./contracts/Migrations.sol...
Compiling ./contracts/TimeMachine.sol...
Compiling openzeppelin-solidity/contracts/ownership/Ownable.sol...
Writing artifacts to ./client/src/contracts
```

* Start up Ganache (in new terminal as ganache-cli or the UI version)

* `$ truffle test`

```
Using network 'development'.

  Contract: TestDriverReturn
    ✓ Checking ownerFinalize() and driverFinalize() with positive driver balance... (1150ms)
    ✓ Checking ownerFinalize() with negative driver balance... (951ms)

....more....

  Contract: TestTimeMachine
    ✓ Checking time in/decrement... (1298ms)
    ✓ Checking time mgmt with LeaseAgreement... (2546ms)

  17 passing (29s)
```

* `$ truffle deploy`
```
Starting migrations...
======================
> Network name:    'development'
> Network id:      5777

1_initial_migration.js
======================
   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0x09d9e8ee9b930c99c8a2b6537583d28fd6c1fad146880a9cd2bbec640a3db556
   > contract address:    0xEaEc4Ef4a7c503f23916805463f77974D84c8a94
   > ....more...

2_deploy_test_cars.js
=====================
   Deploying 'LeasableCar'
   -----------------------
   > transaction hash:    0xf46f3149d39780ec5aea204716a6a64d3e138fd7d3a0b097c6802510fa3602a8
   > contract address:    0x6881A10BCf517F82689df5CAfCfB014b812FBF85
   > ....more...

3_deploy_time_machine.js
========================
   Deploying 'TimeMachine'
   -----------------------
   > transaction hash:    0x496c7625b6cb2cd902a83d319f6213da176d4fa854a0d3a8bb227c58caf75ead
   > contract address:    0x669F9c7E590421Df3B56d682f22d62434F93fBae
   > ....more...
   
Summary
=======
> Total deployments:   4
> Final cost:          0.17101708 ETH
```

* Take a note of the addresses of few of the 'test cars' created. We'll need those to get the lease agreement creation process started e.g.
   * 0x6881A10BCf517F82689df5CAfCfB014b812FBF85
   * 0x669F9c7E590421Df3B56d682f22d62434F93fBae

## Start up the demo Dapp

* `$ cd ~/leasables/client`
* `$ npm start`



## Common Problems

### Ports 7545, 8545 or 9545??

Ports are configured in a variety of places including:
* Ganache UI settings: "Port Number"
* `ganache-cli --port`
* Metamask settings: "Customer RPC", "Localhost 8545"
* `truffle-config.js` -> `networks` -> `development` -> `port`
Ensure the ports are in sync if you have any connection issues.



