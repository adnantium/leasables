

var chai = require('chai');
var assert = chai.assert;

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");
const helpers = require('./utils/helpers.js');
const assert_approx_wei_equal = helpers.assert_approx_wei_equal;

// function assert_approx_wei_equal(wei_str1, wei_str2, delta, message) {
//     var w1 = wei_str1.toString().slice(0, -12);
//     var w2 = wei_str2.toString().slice(0, -12);
//     assert.approximately(parseInt(w1), parseInt(w2), delta, message);
// }



contract('TestDriverReturn', async function(accounts) {

    var the_car;
    var car1_uid;
    var tm;
    var agreement;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];
    var some_other_account = accounts[2]

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

    const dec_19_2018_4pm = 1545235200;

    var g = 4712388;
    var gp = 100000000000;
    const acct_gas = {from: car_owner_uid, gas: g, gasPrice: gp};
    
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

    beforeEach(async function() {
                
        var tx = await the_car.
            requestDraftAgreement(dec_4_2018_12noon, dec_9_2018_12noon, tm.address,
                {from: driver_uid});
        var agreement_uid = tx.logs[0].args.contractAddress;
        agreement = await LeaseAgreementArtifact.at(agreement_uid);
    
        var driver_deposit_required = await agreement.driver_deposit_required.call();
        tx = await agreement.driverSign({from: driver_uid, value: driver_deposit_required});
    
        var owner_deposit_required = await agreement.owner_deposit_required.call();
        tx = await agreement.ownerSign({from: car_owner_uid, value: owner_deposit_required});
    
        // at pickup time: dec_4_2018_12noon
        tx = await tm.setNow(dec_4_2018_12noon, acct_gas);
        tx = await agreement.driverPickup({from: driver_uid, value: 0});
    
    });
    
    it("Checking ownerFinalize() and driverFinalize() with positive driver balance...", async function() {

        let tx;

        // payment
        // daily rate is 0.5eth. 5 day lease -> 3eth should be good
        var payment_amount = web3.utils.toWei(3+'');
        tx = await agreement.driverPayment({from: driver_uid, value: payment_amount,
            gas: g, gasPrice: gp,
        });
    
        // return time:
        tx = await tm.setNow(dec_9_2018_12noon, acct_gas);    
        tx = await agreement.driverReturn({from: driver_uid});


        // after ownerFinalize: car owner's wallet balance should += owner refund due
        var in_car_owner_wallet = await web3.eth.getBalance(car_owner_uid);
        var owner_deposit_amount = await agreement.owner_deposit_amount();
        var expected_after_owner_finalize = BigInt(in_car_owner_wallet) + BigInt(owner_deposit_amount);

        // the balance car has collected up in the agreement contract
        var car_balance = await agreement.car_balance();
        var in_car_wallet_before = await web3.eth.getBalance(car1_uid);
        var expected_after_car_finalize = BigInt(in_car_wallet_before) + BigInt(car_balance);


        tx = await agreement.ownerFinalize({from: car_owner_uid});

        var in_car_owner_wallet_after = await web3.eth.getBalance(car_owner_uid);
        assert_approx_wei_equal(in_car_owner_wallet_after, expected_after_owner_finalize, 1000, "Owner funds balance after ownerFinalize is wrong!")

        var in_car_wallet_after = await web3.eth.getBalance(car1_uid);
        assert_approx_wei_equal(in_car_wallet_after, expected_after_car_finalize, 10, "Car funds balance after ownerFinalize is wrong!")

        var agreement_state = await agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 5, "Agreement should be in Finalized(5) state after ownerFinalize() with positive balance!");
    

        // before driverFinalize
        var driver_balance = await agreement.driver_balance();
        var in_driver_wallet_before = await web3.eth.getBalance(driver_uid);
        var expected_after_driver_finalize = BigInt(in_driver_wallet_before) + BigInt(driver_balance);

        // now the driver settles up
        tx = await agreement.driverFinalize({from: driver_uid});

        var in_driver_wallet_after = await web3.eth.getBalance(driver_uid);
        // assert_approx_wei_equal(in_driver_wallet_after, expected_after_driver_finalize, 100, "Driver funds balance after driverFinalize is wrong!")

    });
    it("Checking ownerFinalize() with negative driver balance...", async function() {

        let tx;

        // payment
        // daily rate is 0.5eth. 5 day lease -> 3eth should be good but only giving 1
        var payment_amount = web3.utils.toWei(1+'');
        tx = await agreement.driverPayment({from: driver_uid, value: payment_amount,
            gas: g, gasPrice: gp,
        });
    
        // return time:
        tx = await tm.setNow(dec_9_2018_12noon, acct_gas);    
        tx = await agreement.driverReturn({from: driver_uid});

        // after ownerFinalize: car owner's wallet balance should += owner refund due
        var in_car_owner_wallet = await web3.eth.getBalance(car_owner_uid);
        var owner_deposit_amount = await agreement.owner_deposit_amount();
        var expected_after_owner_finalize = BigInt(in_car_owner_wallet) + BigInt(owner_deposit_amount);

        // the balance car has collected up in the agreement contract
        var car_balance = await agreement.car_balance();
        var in_car_wallet_before = await web3.eth.getBalance(car1_uid);
        var expected_after_car_finalize = BigInt(in_car_wallet_before) + BigInt(car_balance);


        tx = await agreement.ownerFinalize({from: car_owner_uid});

        var in_car_owner_wallet_after = await web3.eth.getBalance(car_owner_uid);
        assert_approx_wei_equal(in_car_owner_wallet_after, expected_after_owner_finalize, 1000, "Owner funds balance after ownerFinalzie is wrong!")

        var in_car_wallet_after = await web3.eth.getBalance(car1_uid);
        assert_approx_wei_equal(in_car_wallet_after, expected_after_car_finalize, 10, "Car funds balance after ownerFinalzie is wrong!")

    });

});
