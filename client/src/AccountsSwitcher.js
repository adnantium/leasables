
import React from "react";

function shrinkAddress(full_address) {
  const a = full_address.slice(0, 10);
  const b = '..';
  const c = full_address.slice(-10);

  return a + b + c;
}

class AccountsSwitcherCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      all_accounts: this.props.all_accounts,
    }
  }

  handleClearRememberedList= (event) => {
    event.preventDefault();
    localStorage.removeItem('accounts_seen');
  }


  handleAccountSwitch = (event) => {
    event.preventDefault();

    let acct = event.target.attributes.acct.value;

    localStorage.setItem('account', acct);

    var accts_seen = JSON.parse(localStorage.getItem("accounts_seen"));
    accts_seen = accts_seen ? accts_seen : [];
    accts_seen.push(acct);

    localStorage.setItem("accounts_seen", JSON.stringify(accts_seen));
  }

  render() {
    const accounts_list = this.state.all_accounts.map((acct) =>
          <li>
            <a href="/" onClick={this.handleAccountSwitch} acct={acct} className="badge badge-light">
              {shrinkAddress(acct)}
            </a>
          </li>
    );

    return (
      <div class="card">
      <div class="card-body">
        <h5 class="card-title">Accounts</h5>
        <p class="card-text">
          <ul>{accounts_list}</ul>
        </p>
      </div>
      </div> 
    );
  }
}

export default AccountsSwitcherCard;
