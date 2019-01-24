var TimeMachine = artifacts.require("./TimeMachine.sol");

module.exports = function(deployer) {
  deployer.deploy(TimeMachine, 1546689600);
  // 1546689600 == Saturday, January 5, 2019 12:00:00 PM
};
