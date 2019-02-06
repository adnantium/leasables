

// USAGE:
// $ truffle exec scripts/mustache_test.js              \
//      0x7af35603C854188930eFFC1608977E003268aeBC    \
//      legalish/lease_agreement_template_testing.txt
// 

// This needs to be run with 'truffle exec'. It provides the 'artifacts' reference
const LeasableCarContract = artifacts.require("LeasableCar");
const LeaseAgreementContract = artifacts.require("LeaseAgreement");

var fs = require('fs');
var mustache = require('mustache');

async function extract_contract_data(contract, fields) {

    var contract_data = {};
    for (let index = 0; index < fields.length; index++) {
        const field_name = fields[index];
        try {
            const field = await contract[field_name]();
            contract_data[field_name] = field.toString();
        } catch(error) {
            console.log(`Error with field "${field_name}": ${error}`);
        }
    }
    return contract_data;
}

// as needed by 'truffle exec'
module.exports = async function(done) {

    try {
        // console.log('TCL: process.argv', process.argv);
        agreement_uid = process.argv.slice(-2)[0]; //2nd to last one
        template_path = process.argv.slice(-1)[0]; //the last one
        // TODO: fix this slice hack
        // TODO: real command line args parsing

        var msg = `Rendering LeaseAgreement(${agreement_uid}) with [${template_path}]....`;
		console.log(msg);
        
        // 
        // extract agreement data
        // 
        var agreement_fields = [
            'the_driver', 'the_car', 'daily_rate', 'start_timestamp', 'end_timestamp',
            'driver_deposit_required', 'owner_deposit_required',
            'agreement_executor',
        ];
        agreement = await LeaseAgreementContract.at(agreement_uid);
        var agreement_data = await extract_contract_data(agreement, agreement_fields);

        // human version of timestamps
        agreement_data['start_time_str'] = 
            Date(Number(agreement_data['start_timestamp'])*1000);
        agreement_data['end_time_str'] = 
            Date(Number(agreement_data['end_timestamp'])*1000);
        // from the associated car contract
        var car_owner = await agreement.getCarOwner()
        agreement_data['car_owner'] = car_owner;

        // 
        // Extract car's data
        // 
        var car_fields = [ 'VIN', 'year', 'model', 'manufacturer', 'color', ];
        car_uid = agreement_data['the_car'];
        the_car = await LeasableCarContract.at(car_uid);
        var car_data = await extract_contract_data(the_car, car_fields);
        var template_data = Object.assign({}, agreement_data, car_data);
        console.log(template_data);

        // 
        // pass thru the legalish contract template
        // 
        // e.g. 'legalish/lease_agreement_template.txt';
        var template_text = fs.readFileSync(template_path, 'utf8');
        mustache.parse(template_text);
        var rendered_text = mustache.render(template_text, template_data);
        console.log(rendered_text);

    } catch(error) {
		console.log('TCL: catch -> error', error)
    }
    done();
}