import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import LeasableCarContract from "./contracts/LeasableCar.json";
import getWeb3 from "./utils/getWeb3";

import "./App.css";

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
      const storage_contract = new web3.eth.Contract(
        SimpleStorageContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Not deplloyed to a network
      // deployedNetwork = LeasableCarContract.networks[networkId];
      const car_contract_spec = new web3.eth.Contract(
        LeasableCarContract.abi,
        // deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ web3, accounts, storage_contract, car_contract_spec });
      
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
      <div className="App">
        <h1>SimpleStorage.sol Demo</h1>

        {contract_status}
        <p>Web3 provider: {this.state.web3.currentProvider.host}</p>
        <hr/>

        <LookupCarForm
          car_contract_spec={this.state.car_contract_spec} 
          account={this.state.accounts[0]} />
        <hr/>

        <ValueToStoreForm 
          storage_contract={this.state.storage_contract} 
          account={this.state.accounts[0]} />
        <hr/>

        <GetStoredValue
          storage_contract={this.state.storage_contract} 
          account={this.state.accounts[0]} />    

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

    const set_response = await storage_contract.methods.set(to_store).send({ from: account });

    this.setState({ 
      transactionHash: set_response.transactionHash,
      blockHash: set_response.blockHash,
      blockNumber: set_response.blockNumber,
      gasUsed: set_response.gasUsed,
     });
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <label>
            uint to store:
            <input id="to_store" name="to_store" type="text" ref={this.input} />
          </label>
          <input type="submit" value="Set it!" />
        </form>
        <p>transactionHash: {this.state.transactionHash}</p>
        <p>blockHash: {this.state.blockHash}</p>
        <p>blockNumber: {this.state.blockNumber}</p>
        <p>gasUsed: {this.state.gasUsed}</p>
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

    
    // event.preventDefault();
    const storage_contract = this.state.storage_contract;
    const response = await storage_contract.methods.get().call();
    console.log("got: " + response);
    this.setState({ stored_value: response });
  }

  render() {
    return (
      <p>
        <button type="submit" onClick={this.handleGet}>Get it!</button>
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
      account: this.props.account,
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    const { account, car_contract_spec } = this.state;

    var car_address = this.input.current.value;
    console.log("car_address: " + car_address);

    let car_contract = car_contract_spec.clone();
    car_contract.options.address = car_address;
    let car_vin = await car_contract.methods.VIN().call();

    this.setState({ 
      car_contract: car_contract,
      car_vin,
     });
  }

  render() {
    let car_address = this.state.car_contract ? this.state.car_contract._address : "";
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
      </div>
    );
  }
}
