

var assert = require('assert');
const Web3 = require('web3');

var LeasableArtifact = artifacts.require("Leasable");

contract('TestLeasableOwnership', function(accounts) {

    // var test_leasable1_uid;
    var test_leasable1_contract;
    // var test_leasable2_uid;
    var test_leasable2_contract;
    var acct1_uid = accounts[0];
    var acct2_uid = accounts[1];
    var acct3_uid = accounts[2];

    var g = 4712388;
    var gp = 100000000000;

    before(async function() {
        // create leasable1 and hold onto its contract and address for later
        // using acct1
        test_leasable1_contract = await LeasableArtifact
            .new(
                {from: acct1_uid, gas: g, gasPrice: gp}
            );
        // test_leasable1_uid = test_leasable1_contract.address
        // console.log("test leasable1 uid: " + test_leasable1_uid);

        // create leasable2 and hold onto its contract and address for later
        // using acct2
        test_leasable2_contract = await LeasableArtifact
            .new(
                {from: acct2_uid, gas: g, gasPrice: gp}
            );
        // test_leasable2_uid = test_leasable2_contract.address
        // console.log("test leasable2 uid: " + test_leasable2_uid);
    });

    it("Checking ownership...", async function() {

        var test_owner;
        var is_owner;

        // leasable 1 should be owned by acct1
        test_owner = await test_leasable1_contract.owner.call();
        assert.equal(test_owner, acct1_uid, "owner should be acct1!");

        is_owner = await test_leasable1_contract.isOwner.call({from: acct1_uid});
        assert.ok(is_owner, "owner should be acct1!");

        // leasable 2 should be owned by acct2
        test_owner = await test_leasable2_contract.owner.call();
        assert.equal(test_owner, acct2_uid, "owner should be acct2!");

        // TODO: transfer leasable2 to acct3
        

    });

});
