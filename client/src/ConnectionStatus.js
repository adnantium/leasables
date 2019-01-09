
import React from "react";

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
  
      let connection_status;
      if (cp.isMetaMask) {
        connection_status = <ul>
          <li>Using metamask</li>
          <li>selectedAddress: {cp.selectedAddress}</li>
          <li>isConnected(): {cp.isConnected() ? "yes!" : "no!"}</li>
        </ul>;
      } else {
        connection_status = <ul>
          <li>Not using metamask</li>
          <li>Is connected?: {cp.connected}</li>
          <li>Host: {cp.host}</li>
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

  export default ConnectionStatusCard;
