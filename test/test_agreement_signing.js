

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");

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
        // create a car from acct1
        car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', 99, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = car1.address
        // console.log("test car uid: " + car1_uid);
    });

    it("Checking driverSign with exact deposit amount...", async function() {

        var start_timestamp = 1543838400;
        // December 9, 2018 11:59:59 AM
        var end_timestamp = 1544356799;

        const car1_agreement = await create_agreement(
            car1, start_timestamp, end_timestamp, driver_uid);      
                    
        deposit_in = 3;
        var tx = await car1_agreement.
            driverSign(
                {from: driver_uid,
                    value: 3,
                });

        assert.equal(tx.logs.length, 1, "driverSign with exact deposit should only have 1 event!");
        assert.ok(tx.logs[0].args, "No args in tx!");
        assert.equal(tx.logs[0].event, "DriverSigned", "No DriverSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "DriverSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "DriverSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toNumber(), 3, "DriverSigned deposit amount is bad!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount, deposit_in, "Driver depoist amount is not right!");

        var driver_balance_amount = await car1_agreement.driver_balance.call();
        assert.equal(driver_balance_amount, 0, "Driver balance amount is not right!");

    });

});
