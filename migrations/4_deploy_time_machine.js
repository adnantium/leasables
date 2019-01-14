var TimeMachine = artifacts.require("./TimeMachine.sol");

module.exports = function(deployer) {
  deployer.deploy(TimeMachine, 1543838400);
};
