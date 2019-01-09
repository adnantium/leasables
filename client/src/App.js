import React, { Component } from "react";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

import SimpleStorageContract from "./contracts/SimpleStorage.json";
import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseAgreement from "./contracts/LeaseContract.json";
import getWeb3 from "./utils/getWeb3";

import ConnectionStatusCard from "./ConnectionStatus";
import SimpleStorageWrite from "./SimpleStorageWrite";
import SimpleStorageRead from "./SimpleStorageRead";

var truffle_contract = require("truffle-contract");

class App extends Component {
  state = { 
    web3: null, 
    accounts: null, 
    storage_contract: null,
    car_contract_spec: null,
    car_contract: null,
    lease_agreement_spec: null,
    lease_agreement: null,
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      // We'll need this to make a call to the contract
      const accounts = await web3.eth.getAccounts();

      var storage_contract_spec = truffle_contract(SimpleStorageContract);
      storage_contract_spec.setProvider(web3.currentProvider);
      var storage_contract = await storage_contract_spec.deployed();

      // We're just going the store the 'spec' of the contract. It not a
      // particular instance of a deployed contract. Need the address to do that
      var car_contract_spec = truffle_contract(LeasableCarContract);
      car_contract_spec.setProvider(web3.currentProvider);

      var lease_agreement_spec = truffle_contract(LeaseAgreement);
      lease_agreement_spec.setProvider(web3.currentProvider);

      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ web3, accounts, 
        storage_contract, 
        car_contract_spec,
        lease_agreement_spec,
      });
      
    } catch (error) {
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    let contract_status;
    if (!this.state.storage_contract.address) {
      contract_status = <li>Contract is not deployed!</li>
    } else {
      contract_status = <li>Contract deployed at: {this.state.storage_contract.address}</li>
    }

    return (
      <div class="container">
      <Tabs>
        <TabList>
          <Tab>Leaser</Tab>
          <Tab>SimpleStorage</Tab>
          <Tab>Status</Tab>
        </TabList>

        <TabPanel>
        <div class="row">
          <div class="col-sm-10">
            <h2>Leaser</h2>
            <LookupCarForm
              car_contract_spec={this.state.car_contract_spec} 
              lease_agreement_spec={this.state.lease_agreement_spec} 
              accounts={this.state.accounts} />
          </div>
        </div>
        </TabPanel>

        <TabPanel>
        <div class="row">
          <div class="col-sm-10">

            <div class="card">
              <div class="card-body">
                <h5 class="card-title">SimpleStorage.sol Demo</h5>
                <p class="card-text">
                  <ul>
                    {contract_status}
                  </ul>
                </p>
              </div>
            </div>
            <SimpleStorageWrite 
              storage_contract={this.state.storage_contract} 
              account={this.state.accounts[0]} />
            <SimpleStorageRead
              storage_contract={this.state.storage_contract} 
              account={this.state.accounts[0]} />    
          </div>
        </div>
      </TabPanel>


      <TabPanel>
        <div class="row">
          <div class="col-md-10">

          <ConnectionStatusCard 
            accounts={this.state.accounts}
            web3={this.state.web3}
          />

          </div>
        </div>
      </TabPanel>

      </Tabs>
      </div>
    );
  }
}

export default App;

class LookupCarForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleCarLookup = this.handleCarLookup.bind(this);
    this.car_address_input = React.createRef();
    this.agreement_address_input = React.createRef();
    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      accounts: this.props.accounts,
      lease_start_timestamp: 0,
      lease_end_timestamp: 0,
      lease_driver: 0,
      car_lookup_error: "",
    }
  }

  handleCarLookup = async (event) => {
    event.preventDefault();

    var car_address = this.car_address_input.current.value;

    let car_contract;
    try {
      car_contract = await this.state.car_contract_spec.at(car_address);
    } catch (error) {
      console.log(error)
      this.setState({
        car_lookup_error: error.message,
      })
      return;
    }

    let car_vin = await car_contract.VIN.call();

    this.setState({ 
      car_contract,
      car_vin,
     });
  }

  handleAgreementLookup = async (event) => {
    event.preventDefault();
    var agreement_address = this.agreement_address_input.current.value;

    const { lease_agreement_spec } = this.state;

    try {
      let lease_agreement = await lease_agreement_spec.at(agreement_address);
      let lease_start_timestamp = await lease_agreement.start_timestamp();
      let lease_end_timestamp = await lease_agreement.end_timestamp();
      let lease_driver = await lease_agreement.the_driver();

      this.setState({ 
        draft_contract: lease_agreement,
        draft_contract_address: agreement_address,
        lease_start_timestamp: lease_start_timestamp.toNumber(),
        lease_end_timestamp: lease_end_timestamp.toNumber(),
        lease_driver,
      });    
    } catch (error) {
      this.setState({car_lookup_error})
    }
  }

  handleLeaseRequest = async (event) => {
    event.preventDefault();

    const { accounts, car_contract, lease_agreement_spec } = this.state;
    const account = accounts[0];

    // December 3, 2018 12:00:00 PM
    var start_timestamp = 1543838400;
    // December 9, 2018 11:59:59 AM
    var end_timestamp = 1544356799;

    const tx = await car_contract.requestContractDraft(start_timestamp, end_timestamp, { from: account });
    console.log(tx);
    let draft_contract_address = tx.logs[0].args.contractAddress;

    let lease_agreement = await lease_agreement_spec.at(draft_contract_address);
    let lease_start_timestamp = await lease_agreement.start_timestamp();
    let lease_end_timestamp = await lease_agreement.end_timestamp();
    let lease_driver = await lease_agreement.the_driver();

    this.setState({ 
      draft_contract: lease_agreement,
      draft_contract_address,
      lease_start_timestamp: lease_start_timestamp.toNumber(),
      lease_end_timestamp: lease_end_timestamp.toNumber(),
      lease_driver,
     });
  }

  render() {
    let car_address = this.state.car_contract ? this.state.car_contract.address : "";
    let error_text;
    if (this.state.car_lookup_error) {
      error_text = <small id="passwordHelpBlockcarLookupError" class="form-text text-muted alert alert-warning">{this.state.car_lookup_error}</small>
    }
    return (
    <div class="card">
      <div class="card-body">
        <form onSubmit={this.handleCarLookup}>
          <label>
            LeasableCar Contract address:
            <input id="car_address" name="car_address" type="text" ref={this.car_address_input} />
          </label>
          {error_text}
          <input type="submit" value="Find it!" />
        </form>

        <ul>
          <li>Address: {car_address}</li>
          <li>VIN: {this.state.car_vin}</li>
        </ul>

        <form onSubmit={this.handleLeaseRequest}>
          <button type="submit" class="btn btn-primary btn-sm">Request Draft</button>
        </form>

        <form onSubmit={this.handleAgreementLookup}>
          <label>
            Agreement address:
            <input id="agreement_address" name="agreement_address" type="text" ref={this.agreement_address_input} />
          </label>
          <input type="submit" value="Find it!" />
        </form>

        <ul>
          <li>Draft contract: {this.state.draft_contract_address}</li>
          <li>Start: {this.state.lease_start_timestamp}</li>
          <li>End: {this.state.lease_end_timestamp}</li>
          <li>Driver: {this.state.lease_driver}</li>
        </ul>
      </div>
    </div>
    );
  }
}