

var chai = require('chai');
var assert = chai.assert;
const web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");


function assert_approx_wei_equal(wei_str1, wei_str2, message) {
    w1 = wei_str1.toString().slice(0, -5);
    w2 = wei_str2.toString().slice(0, -5);
    // assert.equal(w1, w2, message);
    assert.approximately(parseInt(w1), parseInt(w2), 10, message);
}


async function create_approved_agreement(the_car, start_timestamp, end_timestamp, car_owner_uid, driver_uid, time_machine_address) {
    var tx = await the_car.
        requestDraftAgreement(start_timestamp, end_timestamp, time_machine_address,
            {from: driver_uid});
    var agreement_uid = tx.logs[0].args.contractAddress;
    const agreement = await LeaseAgreementArtifact.at(agreement_uid);

    var driver_deposit_required = await agreement.driver_deposit_required.call();
    tx = await agreement.driverSign({from: driver_uid, value: driver_deposit_required});

    var owner_deposit_required = await agreement.owner_deposit_required.call();
    tx = await agreement.ownerSign({from: car_owner_uid, value: owner_deposit_required});

    var agreement_state = await agreement.agreement_state.call();
    assert.equal(agreement_state.toNumber(), 2, "Agreement should be in Approved(2) state!");

    return agreement;
}

contract('TestDriverReturn', async function(accounts) {

    var the_car;
    var car1_uid;
    var tm;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];
    var some_other_account = accounts[2]

    var g = 4712388;
    var gp = 100000000000;
    const acct_gas = {from: car_owner_uid, gas: g, gasPrice: gp};

    var car1_wei_per_sec;

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

        let tx;

        var daily_rate = web3.utils.toWei(0.5+'');
        the_car = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = the_car.address
        car1_wei_per_sec = daily_rate/one_day_secs;

        // its dec_3_2018_12noon
        tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);

    });

    it("Checking driverReturn()...", async function() {

        let tx;

        const agreement = await create_approved_agreement(
            the_car, dec_4_2018_12noon, dec_9_2018_12noon,
            car_owner_uid, driver_uid, tm.address);
        
        // at pickup time: dec_4_2018_12noon
        tx = await tm.setNow(dec_4_2018_12noon, acct_gas);
        tx = await agreement.driverPickup({from: driver_uid, value: 0});

        // payment 2eth
        var payment_amount = web3.utils.toWei(4+'');
        tx = await agreement.driverPayment({from: driver_uid, value: payment_amount,
            gas: g, gasPrice: gp,
        });

        var driver_balance_amount = await agreement.driver_balance();
        var car_balance_amount = await agreement.car_balance();

        // process cycle
        // tx = await agreement.processCycle({
        //     from: car_owner_uid,
        //     gas: g, gasPrice: gp,
        // });

        // too early to return

        // return time:
        tx = await tm.setNow(dec_9_2018_12noon, acct_gas);


        secs_since_last_cycle = dec_9_2018_12noon - dec_4_2018_12noon;
        expected_cycle_cost = car1_wei_per_sec * secs_since_last_cycle;
        expected_driver_balance = BigInt(driver_balance_amount) - BigInt(expected_cycle_cost);
        expected_car_balance = BigInt(car_balance_amount) + BigInt(expected_cycle_cost);

        // only driver can return!
        var error_caught;
        try { tx = await agreement.driverReturn({from: car_owner_uid});
            } catch(error) { error_caught = true; }
        assert.ok(error_caught === true, "only driver can return the car!")

        tx = await agreement.driverReturn({from: driver_uid});
        // console.log("​catch -> tx", tx)
        // TODO: check for events
        // AgreementCompleted, DriverAccessDisabled, 
        // assert.equal(tx.logs[n].event, "XX event not emitted!")
        // assert.equal(tx.logs[n].args.xxx.toString(), web3.utils.toWei('2'), "XXX(xxx) should be ...!")

        var agreement_state = await agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 4, "Agreement should be in Completed(4) state after return!");
        
        var driver_balance_amount = await agreement.driver_balance();
        assert_approx_wei_equal(driver_balance_amount, expected_driver_balance, "Driver balance after driverReturn() is wrong!")
        var car_balance_amount = await agreement.car_balance();
        assert_approx_wei_equal(car_balance_amount, expected_car_balance, "Car balance after driverReturn() is wrong!");
        

    });

    // it("Checking driverSign ...", async function() {
    // });
});
