var LeasableCar = artifacts.require("./LeasableCar.sol")

module.exports = function(deployer, _network, _accounts) {
    deployer.deploy(LeasableCar, 'VIN1231', '2019', 'Audi', 'S4', 'Blue', 10);
    deployer.deploy(LeasableCar, 'VIN4567', '2017', 'Merc', 'S500', 'Black', 7);
};
