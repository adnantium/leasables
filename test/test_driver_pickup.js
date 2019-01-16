

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");


async function create_agreement(the_car, start_timestamp, end_timestamp, driver_uid) {
    var tx = await the_car.
    requestContractDraft(start_timestamp, end_timestamp, 
        {from: driver_uid});
    var agreement_uid = tx.logs[0].args.contractAddress;
    const agreement_promise = LeaseAgreementArtifact.at(agreement_uid);
    // Trying to await for the .at() call still returns a promise
    // we have to return a promise and await at the function call.
    return agreement_promise;
}

contract('TestAgreementTiming', async function(accounts) {

    var car1;
    var car1_uid;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];
    var some_other_account = accounts[2]

    var g = 4712388;
    var gp = 100000000000;
    const acct_gas = {from: car_owner_uid, gas: g, gasPrice: gp};

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



    before(async function() {
        var daily_rate = web3.utils.toWei(1.5+'');
        car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = car1.address
    });

    it("Checking driverPickup()...", async function() {

        var tx;
        var time_out_ms;
        var time_till_start;
        var error_caught;

        // its dec_3_2018_12noon
        const tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);

        // agreement start: dec_4_2018_12noon
        const car1_agreement = await create_agreement(
            car1, dec_4_2018_12noon, dec_9_2018_12noon, driver_uid);
        tx = await car1_agreement.setTimeSource(tm.address, acct_gas);

        // driver sign + deposit
        var driver_deposit_required = await car1_agreement.driver_deposit_required.call();
        tx = await car1_agreement.
            driverSign({from: driver_uid, value: driver_deposit_required});

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 1, "Agreement should be in PartiallySigned(1) state!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount.toString(), driver_deposit_required.toString(), "Driver depoist amount is not right!");



        
        tx = await tm.setNow(dec_4_2018_12noon, acct_gas);
        // should fail since owner has not signed even though its pickup time
        try {
            tx = await car1_agreement.driverPickup({from: driver_uid, value: 0});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Should not be able to pickup before agreement is fully signed!")

        // owner sign + deposit
        var owner_deposit_required = await car1_agreement.owner_deposit_required.call();
        tx = await car1_agreement.ownerSign({from: car_owner_uid, value: owner_deposit_required});

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 2, "Agreement should be in Approved(2) state!");

        
        
        // driver pickup

        // should fail since its still not time yet
        tx = await tm.setNow(dec_3_2018_12noon, acct_gas);
        try {
            tx = await car1_agreement.driverPickup({from: driver_uid, value: 0});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Should not be able to pickup before its time!")
    
        // now its pickup time
        tx = await await tm.setNow(dec_4_2018_12noon, acct_gas);
        tx = await car1_agreement.driverPickup({from: driver_uid, value: 0});
        assert.equal(tx.logs[0].event, "AgreementStarted", "AgreementStarted event not emitted!")
        
        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 3, "Agreement should be in InProgress(3) state!");
        
        var pickup_time = await car1_agreement.pickup_time.call();
        assert.equal(pickup_time.toNumber(), dec_4_2018_12noon, "Pickup time is wrong!");        
    });

    // it("Checking driverSign ...", async function() {
    // });
});
