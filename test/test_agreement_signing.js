

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");

async function create_test_agreement(the_car, driver_uid) {
    var start_timestamp = 1543838400;
    var end_timestamp = 1544356799;
    return create_agreement(the_car, start_timestamp, end_timestamp, driver_uid)
}

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

contract('TestRequestContract', async function(accounts) {

    var car1;
    var car1_uid;
    // var car1_agreement;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];
    var some_other_account = accounts[2]

    var g = 4712388;
    var gp = 100000000000;

    before(async function() {
        car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', 99, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = car1.address
    });

    it("Checking driverSign with exact deposit amount...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);
            
        var deposit_required = await car1_agreement.driver_deposit_required.call();
        deposit_required = deposit_required.toNumber();
        deposit_in = deposit_required;
        var tx = await car1_agreement.
            driverSign({from: driver_uid, value: deposit_in});

        assert.equal(tx.logs.length, 1, "driverSign with exact deposit should only have 1 event!");
        assert.ok(tx.logs[0].args, "No args in tx!");
        assert.equal(tx.logs[0].event, "DriverSigned", "No DriverSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "DriverSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "DriverSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toNumber(), deposit_in, "DriverSigned deposit amount in tx response is bad!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount, deposit_in, "Driver depoist amount is not right!");

        var driver_balance_amount = await car1_agreement.driver_balance.call();
        assert.equal(driver_balance_amount, 0, "Driver balance amount should be 0 after exact deposit!");

    });

    it("Checking driverSign with extra deposit amount...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);      
                    
        var deposit_required = await car1_agreement.driver_deposit_required.call();
        deposit_required = deposit_required.toNumber();
        // putting in extra $
        var deposit_in = deposit_required * 1.5;
        var tx = await car1_agreement.
            driverSign({from: driver_uid, value: deposit_in});

        assert.equal(tx.logs.length, 2, "driverSign with extra deposit should have 2 events!");

        assert.ok(tx.logs[0].args, "No args in tx[0]!");
        assert.equal(tx.logs[0].event, "DriverSigned", "No DriverSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "DriverSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "DriverSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toNumber(), deposit_required, "DriverSigned deposit amount is bad!");

        assert.ok(tx.logs[1].args, "No args in tx[1]!");
        assert.equal(tx.logs[1].event, "DriverBalanceUpdated", "No DriverBalanceUpdated event emitted!");
        assert.equal(tx.logs[1].args.the_car, car1_uid, "DriverBalanceUpdated car_uid is bad!");
        assert.equal(tx.logs[1].args.the_driver, driver_uid, "DriverBalanceUpdated driver_uid is bad!");
        var expected_balance = deposit_in - deposit_required;
        assert.equal(tx.logs[1].args.new_balance.toNumber(), expected_balance, "DriverBalanceUpdated baalnce amount is bad!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount, deposit_required, "Driver deposit amount is not right!");

        var driver_balance_amount = await car1_agreement.driver_balance.call();
        assert.equal(driver_balance_amount, expected_balance, "Driver balance amount is not right!");

    });

    it("Checking driverSign require() conditions...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);                          
        var deposit_required = await car1_agreement.driver_deposit_required.call();
        deposit_required = deposit_required.toNumber();


        // Check min deposit required
        // putting in less than required $
        var deposit_in = deposit_required * 0.5;
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Should not be able to give low deposit!")

        deposit_in = deposit_required;
        // Check only driver can sign
        // contract was created by driver_uid but we will try to depoist from another account
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                driverSign({from: some_other_account, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Some other driver should not be able to sign and deposit!")

        // Check double sign & deposit
        var error_caught = false;
        var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        // try to depoit again
        try {
            var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Cannot to sign and deposit again!")
    });

    // it("Checking driverSign ...", async function() {
    // });
});
