import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import getWeb3 from "./utils/getWeb3";

import "./App.css";

class App extends Component {
  state = { 
    web3: null, 
    accounts: null, 
    contract: null 
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
      const deployedNetwork = SimpleStorageContract.networks[networkId];
      const instance = new web3.eth.Contract(
        SimpleStorageContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ web3, accounts, contract: instance });
      
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
    if (!this.state.contract._address) {
      contract_status = <p>Contract is not deployed!</p>
    } else {
      contract_status = <p>Contract deployed at: {this.state.contract._address}</p>
    }
    return (
      <div className="App">
        <h1>SimpleStorage.sol Demo</h1>
        <hr/>
        {contract_status}
        <p>Web3 provider: {this.state.web3.currentProvider.host}</p>
        <hr/>
        <ValueToStoreForm 
          contract={this.state.contract} 
          account={this.state.accounts[0]} />
        <hr/>
        <GetStoredValue
          contract={this.state.contract} 
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
      contract: this.props.contract,
      account: this.props.account,
      transactionHash: "nothing yet",
      blockHash: "nothing yet",
      blockNumber: "nothing yet",
      gasUsed: "nothing yet",
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    const { account, contract } = this.state;

    var to_store = this.input.current.value;
    console.log("data: " + to_store);

    const set_response = await contract.methods.set(to_store).send({ from: account });

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
      contract: this.props.contract,
      account: this.props.account,
    }
  }

  handleGet = async (event) => {
    // event.preventDefault();
    const contract = this.state.contract;
    const response = await contract.methods.get().call();
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
