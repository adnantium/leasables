

const LeasableCarContract = artifacts.require("LeasableCar");
const LeaseAgreementContract = artifacts.require("LeaseAgreement");

var fs = require('fs');
var mustache = require('mustache');


// function extract_agreement_data(agreement) {
    
// }

module.exports = async function(done) {

    try {
        console.log('TCL: process.argv', process.argv)        
        agreement_uid = process.argv.slice(-1)[0];
		console.log('TCL: agreement_uid', agreement_uid)
        
        agreement = await LeaseAgreementContract.at(agreement_uid);

        var agreement_data = {};

        var need_fields = [
            'daily_rate',
            'end_timestamp',
            // 'address',
            'driver_deposit_required',
            'the_car',
            'model',
        ]

        for (let index = 0; index < need_fields.length; index++) {
            const field_name = need_fields[index];
            try {
                const field = await agreement[field_name]();
                field_data = field.toString();                
                agreement_data[field_name] = field_data;
                
            } catch(error) {
				console.log(`Error with field "${field_name}": ${error}`);
            }
        }

        console.log('TCL: agreement_data', agreement_data)

        var fname = 'legalish/lease_agreement_template.txt';
        var template_text = fs.readFileSync(fname, 'utf8');
        mustache.parse(template_text);
        var rendered_text = mustache.render(template_text, agreement_data);
        console.log('TCL: rendered_text:', rendered_text);

    } catch(error) {
		console.log('TCL: catch -> error', error)
    }
    
    done();
}



// const optionDefinitions = [
//     { name: 'script_name', type: String, defaultOption: true },
//     { name: 'agreement_uid', type: String },
//     { name: 'verbose', alias: 'v', type: Boolean },
//     // { name: 'src', type: String, multiple: true},
//     // { name: 'timeout', alias: 't', type: Number },
//     // { partial: true }
// ]
// const commandLineArgs = require('command-line-args')
// const options = commandLineArgs(optionDefinitions)
// console.log('TCL: options', options)

