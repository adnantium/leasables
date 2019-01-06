import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import getWeb3 from "./utils/getWeb3";

import "./App.css";

class App extends Component {
  state = { 
    storageValue: 0, 
    web3: null, 
    accounts: null, 
    contract: null 
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
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
      // Catch any errors for any of the above operations.
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
    return (
      <div className="App">
        <h1>Good to Go!</h1>
        <p>Contract address: {this.state.contract._address}</p>
        <ValueToStoreForm contract={this.state.contract} account={this.state.accounts[0]} />
        <div>The stored value is: {this.state.storageValue}</div>
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
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    const { account, contract } = this.state;

    var to_store = this.input.current.value;
    console.log("data: " + to_store);

    await contract.methods.set(to_store).send({ from: account });
    const response = await contract.methods.get().call();

    this.setState({ storageValue: response });
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          uint to store:
          <input id="to_store" name="to_store" type="text" ref={this.input} />
        </label>
        <input type="submit" value="Submit" />
      </form>
    );
  }
}