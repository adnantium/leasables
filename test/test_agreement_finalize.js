

var chai = require('chai');
var assert = chai.assert;
var web3_utils = require("web3-utils");

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var AgreementExecutorArtifact = artifacts.require("AgreementExecutor");
var TimeMachineArtifact = artifacts.require("TimeMachine");
const helpers = require('./utils/helpers.js');
const assert_approx_wei_equal = helpers.assert_approx_wei_equal;

/**
 * Test the last 2 steps of the agreement:
 *  1. Finalize By the Car Owner
 *  2. Finalize by the Driver
 */

contract('TestAgreementFinalize', async function(accounts) {

    var the_car;
    var car1_uid;
    var tm;
    var agreement;
    var executor;

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

    var g = 6721975;
    var gp = 20000000000;
    const acct_gas = {from: car_owner_uid, gas: g, gasPrice: gp};
    
    /**
     * Setup a basic car and a TimeMachine to work with
     */
    before(async function() {

        let tx;

        var daily_rate = web3_utils.toWei(0.5+'');
        the_car = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = the_car.address
        car1_wei_per_sec = daily_rate/one_day_secs;

        // its dec_3_2018_12noon
        tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);
    });

    /**
     * Create a basic lease agreement in InProgress state
     * Only a deposit is put in - no additional funds
     */
    beforeEach(async function() {
                
        var tx = await the_car.
            requestDraftAgreement(dec_4_2018_12noon, dec_9_2018_12noon,
                {from: driver_uid});
        var agreement_uid = tx.logs[0].args.contractAddress;
        agreement = await LeaseAgreementArtifact.at(agreement_uid);

        tx = await the_car.initiateAgreement(agreement.address, tm.address);
        var executor_uid = tx.logs[0].args.agreement_executor;
        executor = await AgreementExecutorArtifact.at(executor_uid);    
    
        var driver_deposit_required = await agreement.driver_deposit_required.call();
        tx = await executor.driverSign({from: driver_uid, value: driver_deposit_required});
    
        var owner_deposit_required = await agreement.owner_deposit_required.call();
        tx = await executor.ownerSign({from: car_owner_uid, value: owner_deposit_required});
    
        // at pickup time: dec_4_2018_12noon
        tx = await tm.setNow(dec_4_2018_12noon, acct_gas);
        tx = await executor.driverPickup({from: driver_uid, value: 0});
    
    });
    
    it("Checking ownerFinalize() and driverFinalize() with positive driver balance...", async function() {

        let tx;

        // payment
        // daily rate is 0.5eth. 5 day lease -> 3eth should be good
        var payment_amount = web3_utils.toWei(3+'');
        tx = await executor.driverPayment({from: driver_uid, value: payment_amount,
            gas: g, gasPrice: gp,
        });
    
        // return time:
        tx = await tm.setNow(dec_9_2018_12noon, acct_gas);    
        tx = await executor.driverReturn({from: driver_uid});


        // after ownerFinalize: car owner's wallet balance should += owner refund due
        var in_car_owner_wallet = await web3.eth.getBalance(car_owner_uid);
        var owner_deposit_amount = await executor.owner_deposit_amount();
        var expected_after_owner_finalize = BigInt(in_car_owner_wallet) + BigInt(owner_deposit_amount);

        // the balance car has collected up in the agreement contract
        var car_balance = await executor.car_balance();
        var in_car_wallet_before = await web3.eth.getBalance(car1_uid);
        var expected_after_car_finalize = BigInt(in_car_wallet_before) + BigInt(car_balance);


        tx = await executor.ownerFinalize({from: car_owner_uid});

        var in_car_owner_wallet_after = await web3.eth.getBalance(car_owner_uid);
        assert_approx_wei_equal(in_car_owner_wallet_after, expected_after_owner_finalize, 1000, "Owner funds balance after ownerFinalize is wrong!")

        var in_car_wallet_after = await web3.eth.getBalance(car1_uid);
        assert_approx_wei_equal(in_car_wallet_after, expected_after_car_finalize, 10, "Car funds balance after ownerFinalize is wrong!")

        var agreement_state = await executor.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 5, "Agreement should be in Finalized(5) state after ownerFinalize() with positive balance!");
    

        // before driverFinalize
        var driver_balance = await executor.driver_balance();
        var in_driver_wallet_before = await web3.eth.getBalance(driver_uid);
        var driver_deposit_amount = await executor.driver_deposit_amount();

        var expected_after_driver_finalize = 
            BigInt(in_driver_wallet_before) + 
            BigInt(driver_balance) + 
            BigInt(driver_deposit_amount);

        // now the driver settles up
        tx = await executor.driverFinalize({from: driver_uid});

        var in_driver_wallet_after = await web3.eth.getBalance(driver_uid);
        assert_approx_wei_equal(in_driver_wallet_after, expected_after_driver_finalize, 1000, "Driver funds balance after driverFinalize is wrong!")

    });
    it("Checking ownerFinalize() with negative driver balance...", async function() {

        let tx;

        // payment
        // daily rate is 0.5eth. 5 day lease -> 3eth should be good but only giving 1
        var payment_amount = web3_utils.toWei(1+'');
        tx = await executor.driverPayment({from: driver_uid, value: payment_amount,
            gas: g, gasPrice: gp,
        });
    
        // return time:
        tx = await tm.setNow(dec_9_2018_12noon, acct_gas);    
        tx = await executor.driverReturn({from: driver_uid});

        // after ownerFinalize: car owner's wallet balance should += owner refund due
        var in_car_owner_wallet = await web3.eth.getBalance(car_owner_uid);
        var owner_deposit_amount = await executor.owner_deposit_amount();
        var expected_after_owner_finalize = BigInt(in_car_owner_wallet) + BigInt(owner_deposit_amount);

        // the balance car has collected up in the agreement contract
        var car_balance = await executor.car_balance();
        var in_car_wallet_before = await web3.eth.getBalance(car1_uid);
        var expected_after_car_finalize = BigInt(in_car_wallet_before) + BigInt(car_balance);


        tx = await executor.ownerFinalize({from: car_owner_uid});

        var in_car_owner_wallet_after = await web3.eth.getBalance(car_owner_uid);
        assert_approx_wei_equal(in_car_owner_wallet_after, expected_after_owner_finalize, 1000, "Owner funds balance after ownerFinalzie is wrong!")

        var in_car_wallet_after = await web3.eth.getBalance(car1_uid);
        assert_approx_wei_equal(in_car_wallet_after, expected_after_car_finalize, 10, "Car funds balance after ownerFinalzie is wrong!")

        // var error_caught = false;
        // try {
        //     tx = await agreement.driverFinalize({from: driver_uid});
        // } catch(error) {
        //     error_caught = true;
        // }
        // assert.ok(error_caught === true, "Driver should not be able to finalized with over balance!")
    });

});
