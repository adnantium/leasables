

var assert = require('assert');
const Web3 = require('web3');

var TimeMachineArtifact = artifacts.require("TimeMachine");
var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");

contract('TestTimeMachine', function(accounts) {

    var acct1_uid = accounts[0];
    var acct2_uid = accounts[1];
    var g = 4712388;
    var gp = 100000000000;
    const acct_gas = {from: acct1_uid, gas: g, gasPrice: gp};

    const one_hour_secs = 60*60;
    const one_day_secs = 60*60*24;
    const dec_2_2018_12noon = 1543752000;
    const dec_3_2018_8am = 1543824000;
    const dec_3_2018_12noon = 1543838400;
    const dec_3_2018_3pm = 1543849200;
    const dec_3_2018_4pm = 1543852800;
    const dec_4_2018_12noon = 1543924800;
    const dec_4_2018_4pm = 1543939200;

    const dec_9_2018_12noon = 1544356800;
    const dec_9_2018_4pm = 1544371200;

    // before(async function() {
    // });

    it("Checking time in/decrement...", async function() {
        var time_out_ms;
        var tx;

        const time_machine = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);
        time_out_ms = await time_machine.time_now.call();

        assert.equal(time_out_ms.toNumber(), dec_3_2018_12noon, "Time out should be same as time that went in!");

        // Forward 3 hours -> dec_3_2018_3pm
        tx = await time_machine.forwardHours(3, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_3_2018_3pm, "Time out after forwardHours(3) is not right!");

        // Forward 1 hour -> dec_3_2018_4pm
        tx = await time_machine.forwardHours(1, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_3_2018_4pm, "Time out after forwardHours(1) is not right!");

        // Forward 1 day -> dec_4_2018_4pm
        tx = await time_machine.forwardDays(1, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_4_2018_4pm, "Time out after forwardDays(1) is not right!");

        // Back 1 day -> dec_3_2018_4pm
        tx = await time_machine.backDays(1, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_3_2018_4pm, "Time out after backDays(1) is not right!");

        // Back 1 hour -> dec_3_2018_3pm
        tx = await time_machine.backHours(1, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_3_2018_3pm, "Time out after backHours(1) is not right!");

        // Back 3 hours -> dec_3_2018_12noon
        tx = await time_machine.backHours(3, acct_gas);
        time_out_ms = await time_machine.time_now.call();
        assert.equal(time_out_ms.toNumber(), dec_3_2018_12noon, "Time out after backHours(3) is not right!");

    });

    it("Checking time mgmt with LeaseAgreement...", async function() {
        test_car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', 99, 
            acct_gas
        );

        var tx;
        tx = await test_car1.
            requestContractDraft(dec_3_2018_12noon, dec_9_2018_12noon, acct_gas);
        const car1_contract_uid = tx.logs[0].args.contractAddress;
        const car1_contract = await LeaseAgreementArtifact.at(car1_contract_uid);
    
        const tm = await TimeMachineArtifact.new(dec_2_2018_12noon, acct_gas);
        tx = await car1_contract.setTimeSource(tm.address);

        time_till_start = await car1_contract.timeTillStart.call(acct_gas);
        assert.equal(time_till_start, dec_3_2018_12noon - dec_2_2018_12noon);

        tx = tm.forwardHours(20, acct_gas);
        time_till_start = await car1_contract.timeTillStart.call(acct_gas);
        assert.equal(time_till_start, dec_3_2018_12noon - dec_3_2018_8am);

        tx = tm.forwardHours(3, acct_gas);
        time_till_start = await car1_contract.timeTillStart.call(acct_gas);
        assert.equal(time_till_start, one_hour_secs);

        tx = tm.forwardHours(1, acct_gas);
        time_till_start = await car1_contract.timeTillStart.call(acct_gas);
        assert.equal(time_till_start, 0);

        // now we're 1 hour past start time
        tx = tm.forwardHours(1, acct_gas);
        time_till_start = await car1_contract.timeTillStart.call(acct_gas);
        assert.equal(time_till_start, 0);

        // Ending time
        tx = tm.setNow(dec_2_2018_12noon, acct_gas);

        time_till_end = await car1_contract.timeTillEnd.call(acct_gas);
        assert.equal(time_till_end, dec_9_2018_12noon - dec_2_2018_12noon);

        tx = tm.forwardDays(6, acct_gas);
        time_till_end = await car1_contract.timeTillEnd.call(acct_gas);
        assert.equal(time_till_end, one_day_secs);

        tx = tm.forwardHours(23, acct_gas);
        time_till_end = await car1_contract.timeTillEnd.call(acct_gas);
        assert.equal(time_till_end, one_hour_secs);

        tx = tm.forwardHours(1, acct_gas);
        time_till_end = await car1_contract.timeTillEnd.call(acct_gas);
        assert.equal(time_till_end, 0);

        // now we're 1 hour past end time
        tx = tm.forwardHours(1, acct_gas);
        time_till_end = await car1_contract.timeTillEnd.call(acct_gas);
        assert.equal(time_till_end, 0);

    });

});
