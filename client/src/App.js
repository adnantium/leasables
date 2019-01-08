import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
// import LeasableCarContract from "./contracts/LeasableCar.json";
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
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      // We'll need this to make a call to the contract
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();

      let deployedNetwork;

      // SimpleStorage contract is already deployed at an address.
      // Need to lookup that address in the json interface object
      // Will need that along with the contract's ABI to
      // get a usable contract object that we can interact with
      deployedNetwork = SimpleStorageContract.networks[networkId];
      // const storage_contract = new web3.eth.Contract(
      //   SimpleStorageContract.abi,
      //   deployedNetwork && deployedNetwork.address,
      // );

      // SimpleStorageContract.network = networkId;
      var storage_contract_spec = truffle_contract(SimpleStorageContract);
      storage_contract_spec.setProvider(web3.currentProvider);
      var storage_contract = await storage_contract_spec.deployed();


      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ web3, accounts, storage_contract });
      
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
    if (!this.state.storage_contract._address) {
      contract_status = <p>Contract is not deployed!</p>
    } else {
      contract_status = <p>Contract deployed at: {this.state.storage_contract._address}</p>
    }

    return (
      <div class="container">
        <div class="row">
          <div class="col-xs-12 col-sm-8 col-sm-push-2">
            <h1 class="text-center">SimpleStorage.sol Demo</h1>
            <hr/>
            <br/>
          </div>
        </div>

        <div id="simple_storage_box" class="row">
        <div class="col-sm-6 col-sm-push-3 col-md-4 col-md-push-4">
          <div class="panel panel-default">
          
            <div class="panel-body">
              <h3 class="panel-title">SimpleStorage</h3>
              {contract_status}
              <p>Web3 provider: {this.state.web3.currentProvider.host}</p>
              <hr/>

              <ValueToStoreForm 
                storage_contract={this.state.storage_contract} 
                account={this.state.accounts[0]} />
              <hr/>

              <GetStoredValue
                storage_contract={this.state.storage_contract} 
                account={this.state.accounts[0]} />    

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

