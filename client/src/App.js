import React, { Component } from "react";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

import SimpleStorageContract from "./contracts/SimpleStorage.json";
import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseAgreement from "./contracts/LeaseContract.json";
import getWeb3 from "./utils/getWeb3";

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
              account={this.state.accounts[0]} />
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
            <ValueToStoreForm 
              storage_contract={this.state.storage_contract} 
              account={this.state.accounts[0]} />
            <GetStoredValue
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

class ConnectionStatusCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: this.props.web3,
      accounts: this.props.accounts,
    }
  }

  render() {

    let cp = this.state.web3.currentProvider;
    // let is_metamask = cp.isMetaMask ? "Its metamask!" : "nope.";

    let connection_status;
    if (cp.isMetaMask) {
      connection_status = <ul>
        <li>Using metamask</li>
        <li>selectedAddress: {cp.selectedAddress}</li>
        <li>isConnected(): {cp.isConnected() ? "connected!" : "not connected!"}</li>
      </ul>;
    } else {
      connection_status = <ul>
        <li>Not using metamask</li>
        <li>connected: {cp.connected}</li>
        <li>host: {cp.host}</li>
      </ul>;
    }
    const accounts_list = this.state.accounts.map((acct) =>
      <li>{acct}</li>
    );

    return(
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Connection Status</h5>
          <p class="card-text">
            {connection_status}
            Accounts: <ul>{accounts_list}</ul>
          </p>
        </div>
      </div> 
    );
  }
}
class ValueToStoreForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.input = React.createRef();
    this.state = {
      storage_contract: this.props.storage_contract,
      account: this.props.account,
      transactionHash: "nothing yet",
      blockHash: "nothing yet",
      blockNumber: "nothing yet",
      gasUsed: "nothing yet",
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    const { account, storage_contract } = this.state;

    var to_store = this.input.current.value;
    console.log("data: " + to_store);

    const set_response = await storage_contract.setInt(to_store, { from: account });

    this.setState({ 
      transactionHash: set_response.tx,
      blockHash: set_response.receipt.blockHash,
      blockNumber: set_response.receipt.blockNumber,
      gasUsed: set_response.receipt.gasUsed,
     });
  }



  render() {
    return (
      <div class="card">
        <div class="card-body">
          <h6 class="card-title">SimpleStorage.setInt(uint x)</h6>
          <form onSubmit={this.handleSubmit}>
              <input id="to_store" name="to_store" type="text" class="form-control" placeholder="a uint to store" ref={this.input} />
              <button class="btn btn-primary btn-sm" type="submit">Set it!</button>
          </form>
          <p class="card-text">
            <ul>
              <li>transactionHash: {this.state.transactionHash}</li>
              <li>blockHash: {this.state.blockHash}</li>
              <li>blockNumber: {this.state.blockNumber}</li>
              <li>gasUsed: {this.state.gasUsed}</li>
            </ul>
          </p>
        </div>
      </div>
    );
  }
}
class GetStoredValue extends React.Component {
  constructor(props) {
    super(props);
    this.handleGet = this.handleGet.bind(this);
    this.state = {
      stored_value: null,
      storage_contract: this.props.storage_contract,
      account: this.props.account,
    }
  }

  handleGet = async (event) => {    
    event.preventDefault();
    const storage_contract = this.state.storage_contract;
    const response = await storage_contract.getInt.call();
    console.log("got: " + response.toNumber());
    this.setState({ stored_value: response.toNumber() });
  }

  render() {
    return (
      <div class="card">
        <div class="card-body">
          <h6 class="card-title">SimpleStorage.getInt()</h6>
          <p class="card-text">
            <button type="submit" onClick={this.handleGet} class="btn btn-primary btn-sm">Get it!</button>
            Stored value: {this.state.stored_value}
          </p>
        </div>
      </div>
    );
  }
}

class LookupCarForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.input = React.createRef();
    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      account: this.props.account,
      lease_start_timestamp: 0,
      lease_end_timestamp: 0,
      lease_driver: 0,
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    var car_address = this.input.current.value;
    
    let car_contract = await this.state.car_contract_spec.at(car_address);
    let car_vin = await car_contract.VIN.call();

    this.setState({ 
      car_contract,
      car_vin,
     });
  }


  handleLeaseRequest = async (event) => {
    event.preventDefault();

    const { account, car_contract, lease_agreement_spec } = this.state;

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
    return (
    <div class="card">
      <div class="card-body">
        <form onSubmit={this.handleSubmit}>
          <label>
            LeasableCar Contract address:
            <input id="car_address" name="car_address" type="text" ref={this.input} />
          </label>
          <input type="submit" value="Find it!" />
        </form>

        <ul>
          <li>Address: {car_address}</li>
          <li>VIN: {this.state.car_vin}</li>
        </ul>

        <form onSubmit={this.handleLeaseRequest}>
          <button type="submit" class="btn btn-primary btn-sm">Request Draft</button>
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