
import React from "react";

class SimpleStorageWrite extends React.Component {
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
export default SimpleStorageWrite;

