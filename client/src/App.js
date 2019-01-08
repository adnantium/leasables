import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseContract from "./contracts/LeaseContract.json";
import getWeb3 from "./utils/getWeb3";

import "./App.css";

var truffle_contract = require("truffle-contract");

class App extends Component {
  state = { 
    web3: null, 
    accounts: null, 
    storage_contract: null,
    car_contract_spec: null,
    car_contract: null,
    lease_contract_spec: null,
    lease_contract: null,
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

      var lease_contract_spec = truffle_contract(LeaseContract);
      lease_contract_spec.setProvider(web3.currentProvider);

      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ web3, accounts, 
        storage_contract, 
        car_contract_spec,
        lease_contract_spec,
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
        <div class="row">
          <div class="col-xs-12 col-sm-8 col-sm-push-2">
            <h1>SimpleStorage.sol Demo</h1>
            <hr/>
            <br/>
          </div>
        </div>

        <div id="simple_storage_box" class="row">
        <div class="col-sm-6 col-sm-push-3 col-md-4 col-md-push-4">
          <div class="panel panel-default">

            <div class="panel-body">
              <h3 class="panel-title">SimpleStorage</h3>
              <ul>
                {contract_status}
                <li>Web3 provider: {this.state.web3.currentProvider.host}</li>
              </ul>
              <hr/>

              <ValueToStoreForm 
                storage_contract={this.state.storage_contract} 
                account={this.state.accounts[0]} />
              <hr/>

              <GetStoredValue
                storage_contract={this.state.storage_contract} 
                account={this.state.accounts[0]} />    

              <LookupCarForm
                  car_contract_spec={this.state.car_contract_spec} 
                  lease_contract_spec={this.state.lease_contract_spec} 
                  account={this.state.accounts[0]} />
              <hr/>
            </div>

          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default App;

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
      <div>
        <form onSubmit={this.handleSubmit}>
            <input id="to_store" name="to_store" type="text" class="form-control" placeholder="a uint to store" ref={this.input} />
            <button class="btn btn-primary btn-sm" type="submit">Set it!</button>
        </form>
        <ul>
          <li>transactionHash: {this.state.transactionHash}</li>
          <li>blockHash: {this.state.blockHash}</li>
          <li>blockNumber: {this.state.blockNumber}</li>
          <li>gasUsed: {this.state.gasUsed}</li>
        </ul>
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
      <p>
        <button type="submit" onClick={this.handleGet} class="btn btn-primary btn-sm">Get it!</button>
        Stored value: {this.state.stored_value}
      </p>
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
      lease_contract_spec: this.props.lease_contract_spec,
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

    const { account, car_contract, lease_contract_spec } = this.state;

    // December 3, 2018 12:00:00 PM
    var start_timestamp = 1543838400;
    // December 9, 2018 11:59:59 AM
    var end_timestamp = 1544356799;

    const tx = await car_contract.requestContractDraft(start_timestamp, end_timestamp, { from: account });
    console.log(tx);
    let draft_contract_address = tx.logs[0].args.contractAddress;
    let lease_contract = await lease_contract_spec.at(draft_contract_address);
    let lease_start_timestamp = await lease_contract.start_timestamp();
    let lease_end_timestamp = await lease_contract.end_timestamp();
    let lease_driver = await lease_contract.the_driver();

    this.setState({ 
      draft_contract: lease_contract,
      draft_contract_address,
      lease_start_timestamp: lease_start_timestamp.toNumber(),
      lease_end_timestamp: lease_end_timestamp.toNumber(),
      lease_driver,
     });
  }

  render() {
    let car_address = this.state.car_contract ? this.state.car_contract.address : "";
    return (
      <div>
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
    );
  }
}