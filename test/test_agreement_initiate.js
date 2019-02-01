

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var AgreementExecutorArtifact = artifacts.require("AgreementExecutor");
var TimeMachineArtifact = artifacts.require("TimeMachine");

contract('TestAgreementInitiation', async function(accounts) {

    var car1;
    var tm;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];

    var g = 6721975;
    var gp = 20000000000;
    const acct_gas = {from: accounts[0], gas: g, gasPrice: gp};

    const dec_3_2018_12noon = 1543838400;
    const dec_4_2018_12noon = 1543924800;
    const dec_9_2018_12noon = 1544356800;


    before(async function() {
        var daily_rate = web3.utils.toWei(0.5+'');
        car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );

        // its dec_3_2018_12noon
        tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);
    });

    it("Checking LeasableCar.initiateAgreement()...", async function() {

        var tx = await car1.
            requestDraftAgreement(dec_4_2018_12noon, dec_9_2018_12noon,
                {from: driver_uid});
        var agreement_uid = tx.logs[0].args.contractAddress;
        const agreement = await LeaseAgreementArtifact.at(agreement_uid);

        tx = await car1.initiateAgreement(agreement.address, tm.address);
        var executor_uid = tx.logs[0].args.agreement_executor;
        const executor = await AgreementExecutorArtifact.at(executor_uid);
    
        var driver_deposit_required = await agreement.driver_deposit_required.call();
        tx = await executor.driverSign({from: driver_uid, value: driver_deposit_required});
    
        var owner_deposit_required = await agreement.owner_deposit_required.call();
        tx = await executor.ownerSign({from: car_owner_uid, value: owner_deposit_required});
    
        var executor_state = await executor.agreement_state.call();
        assert.equal(executor_state.toNumber(), 2, "Agreement executor should be in Approved(2) state!");
 
    });

});
