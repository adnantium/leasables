var LeasableCar = artifacts.require("./LeasableCar.sol")

const ether = 10**18
var web3 = require("web3");

module.exports = function(deployer, _network, _accounts) {
    deployer.deploy(LeasableCar, 
        'VIN1231', '2019', 'Audi', 'S4', 'Blue', 
        web3.utils.toWei(1+''));
    deployer.deploy(LeasableCar, 
        'VIN4567', '2017', 'Merc', 'S500', 'Black', 
        web3.utils.toWei(1.5+''));
};
