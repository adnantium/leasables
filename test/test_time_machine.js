

var assert = require('assert');
const Web3 = require('web3');

var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");

contract('TestTimeMachine', function(accounts) {

    var acct1_uid = accounts[0];
    var acct2_uid = accounts[1];
    var g = 4712388;
    var gp = 100000000000;
    const acct_gas = {from: acct1_uid, gas: g, gasPrice: gp};

    const dec_3_2018_12noon = 1543838400;
    const dec_3_2018_3pm = 1543849200;
    const dec_3_2018_4pm = 1543852800;
    const dec_4_2018_12noon = 1543924800;
    const dec_4_2018_4pm = 1543939200;

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

});
