import React from "react";

class SimpleStorageRead extends React.Component {
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

export default SimpleStorageRead;
