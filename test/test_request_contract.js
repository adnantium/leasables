

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");

contract('TestRequestContract', async function(accounts) {

    var test_car1;
    var test_car1_uid;
    var acct1_uid = accounts[0];
    var acct2_uid = accounts[1];

    var g = 4712388;
    var gp = 100000000000;

    var tm;
    const acct_gas = {from: accounts[0], gas: g, gasPrice: gp};
    const dec_3_2018_12noon = 1543838400;

    before(async function() {
        // create a car from acct1
        test_car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', 99, 
            {from: acct1_uid, gas: g, gasPrice: gp}
        );
        test_car1_uid = test_car1.address
        // console.log("test car uid: " + test_car1_uid);

        // Promise cascades suck. Using async and await instead
        // It should still work but unstable
        // 
        // LeasableCarArtifact.new('VIN1231', '2019', 'Audi', 'S4', 'Blue', 99, 
        //     {from: acct1_uid, gas: g, gasPrice: gp})
        //     .then(function(instance) {
        //         test_car1 = instance
        //         console.log(instance.address);
        //     })
        //     .catch(function(error) {
        //         console.log("error!! : " + error);
        //     });

        // its dec_3_2018_12noon
        tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);

    });

    it("Checking requestDraftAgreement...", async function() {

        // December 3, 2018 12:00:00 PM
        var start_timestamp = 1543838400;
        // December 9, 2018 11:59:59 AM
        var end_timestamp = 1544356799;

        var tx = await test_car1.
            requestDraftAgreement(start_timestamp, end_timestamp, tm.address, {from: acct2_uid});
        assert.equal(tx.logs.length, 1, "New LeaseAgreement creation should only have 1 event!");
        assert.ok(tx.logs[0].args, "No args in tx!");
        assert.ok(tx.logs[0].args.contractAddress, "No contractAddress in tx!");

        var car1_contract_uid = tx.logs[0].args.contractAddress;
        var car1_contract = await LeaseAgreementArtifact.at(car1_contract_uid);

        var start_ts;

        // Have seen some funky issues with different behaviour here. test to keep an eye on it
        // Future changes to visibility of these vars in the contract will effect this again
        start_ts = await car1_contract.start_timestamp.call({from: acct2_uid});
        assert.equal(start_ts, start_timestamp, "Start timestamp (with a call()) is messed up!");    
        start_ts = await car1_contract.start_timestamp({from: acct2_uid});
        assert.equal(start_ts, start_timestamp, "Start timestamp (withOUT a call()) is messed up!");

        var end_ts = await car1_contract.end_timestamp.call({from: acct2_uid});
        assert.equal(end_ts, end_timestamp, "End timestamp is messed up!");    

        

    });

});
