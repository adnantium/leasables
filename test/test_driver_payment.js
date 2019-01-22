

var assert = require('assert');
const web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");
var TimeMachineArtifact = artifacts.require("TimeMachine");

contract('TestDriverPayments', async function(accounts) {

    var the_car;
    var car1_uid;
    var tm;

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

        let tx;

        var daily_rate = web3.utils.toWei(0.5+'');
        the_car = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = the_car.address

        // its dec_3_2018_12noon
        tm = await TimeMachineArtifact.new(dec_3_2018_12noon, acct_gas);

    });

    it("Checking contract_balance()...", async function() {

                
        // --------------------------------------------------------------------
        // create a basic agreement
        let tx = await the_car.requestContractDraft(dec_4_2018_12noon, dec_9_2018_12noon, {from: driver_uid});
        var agreement_uid = tx.logs[0].args.contractAddress;
        const agreement = await LeaseAgreementArtifact.at(agreement_uid);     
        tx = await agreement.setTimeSource(tm.address, acct_gas);


        // --------------------------------------------------------------------
        // driver sign + deposit
        var driver_deposit_required = await agreement.driver_deposit_required.call();
        tx = await agreement.driverSign({from: driver_uid, value: driver_deposit_required});

        var contract_balance = await agreement.contract_balance();
        assert.equal(
            contract_balance.toString(),
            driver_deposit_required.toString(),
            "Contract balance should be equal to driver_deposit at this point!"
        );

        
        // --------------------------------------------------------------------
        // owner sign + deposit
        var owner_deposit_required = await agreement.owner_deposit_required.call();
        tx = await agreement.ownerSign({from: car_owner_uid, value: owner_deposit_required});

        var contract_balance = await agreement.contract_balance();
        assert.equal(
            contract_balance.toString(),
            driver_deposit_required.add(owner_deposit_required).toString(),
            "Contract balance should be sum(owner_deposit+driver_deposit)!"
        );

        var driver_balance_amount = await agreement.driver_balance();
        assert.equal(
            driver_balance_amount.toString(), 
            "0", 
            "Driver balance amount should be 0 after exact deposit!"
        );


        
        // --------------------------------------------------------------------
        // Pay 2 eth
        var payment_amount = web3.utils.toWei(2+'');
        tx = await agreement.driverPayment({
            from: driver_uid,
            value: payment_amount,
            gas: g, gasPrice: gp,
        });
        var driver_balance_amount = await agreement.driver_balance();
        assert.equal(tx.logs[0].event, "DriverBalanceUpdated", "DriverBalanceUpdated event not emitted!")
        assert.equal(tx.logs[0].args.new_balance.toString(), web3.utils.toWei('2'), "DriverBalanceUpdated(new_balance) should be 2eth!")
        assert.equal(driver_balance_amount.toString(), web3.utils.toWei('2'), "Driver balance amount should be 2 after a 2eth payment!");


    });

    // it("Checking driverSign ...", async function() {
    // });
});
