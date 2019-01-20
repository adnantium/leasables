import React, { Component } from "react";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseAgreementContract from "./contracts/LeaseAgreement.json";
import TimeMachineContract from "./contracts/TimeMachine.json";
import getWeb3 from "./utils/getWeb3";

import ConnectionStatusCard from "./ConnectionStatus";
import AccountsSwitcherCard from "./AccountsSwitcher";

var truffle_contract = require("truffle-contract");
var web3 = require("web3");


function weiToEther(weis) {
  return web3.utils.fromWei(weis.toString());
}

function ts_to_str(epoch_secs_bignumber) {
  let epoch_ms = epoch_secs_bignumber.toNumber() * 1000;
  return new Date(epoch_ms).toLocaleString();
}

function agreementStateToStr(state_num) {
  const states = [ "Created", "PartiallySigned", "Approved", 
    "InProgress", "Completed", "Finalized"];
  return states[state_num];
}

function format_error_message(msg) {
  const e = 'Error: Error:';
  return msg.indexOf(e) > 0 ? msg.slice(msg.lastIndexOf('Error')) : msg;
}

function update_known_list(list_name, address) {
    // add the address to known_cars list if not there
    var list = JSON.parse(localStorage.getItem(list_name));
    list = list ? list : [];
    if (list.indexOf(address) === -1) {
      list.push(address);
    }
    localStorage.setItem(list_name, JSON.stringify(list));
}

class App extends Component {
  state = { 
    web3: null, 
    all_accounts: null, 
    account: null, 
    car_contract_spec: null,
    the_car: null,
    lease_agreement_spec: null,
    lease_agreement: null,
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      // We'll need this to make a call to the contract
      const all_accounts = await web3.eth.getAccounts();

      const stored_acct = localStorage.getItem('account');
      let account;
      if (all_accounts.indexOf(stored_acct) >= 0) {
        account = stored_acct;
      } else {
        account = all_accounts[0]
        localStorage.setItem('account', account);
      }

      // We're just going the store the 'spec' of the contract. It not a
      // particular instance of a deployed contract. Need the address to do that
      var car_contract_spec = truffle_contract(LeasableCarContract);
      car_contract_spec.setProvider(web3.currentProvider);

      var lease_agreement_spec = truffle_contract(LeaseAgreementContract);
      lease_agreement_spec.setProvider(web3.currentProvider);

      var time_machine_spec = truffle_contract(TimeMachineContract);
      time_machine_spec.setProvider(web3.currentProvider);

      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ 
        web3, 
        all_accounts, 
        account,
        car_contract_spec,
        lease_agreement_spec,
        time_machine_spec,
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

    return (
      <div className="container">
      <Tabs>
        <TabList>
          <Tab>Leaser</Tab>
          <Tab>Status</Tab>
        </TabList>

        <TabPanel>
        <div className="row">
          <div className="col-sm">
            <h2>Leaser</h2>
            <div className="alert alert-light" role="alert">
              Account: {this.state.account}
            </div>
            <LookupCarForm
              car_contract_spec={this.state.car_contract_spec} 
              lease_agreement_spec={this.state.lease_agreement_spec} 
              time_machine_spec={this.state.time_machine_spec}
              account={this.state.account} />
          </div>
        </div>
        </TabPanel>
        <TabPanel>
        <div className="row">
          <div className="col-md-10">

          <ConnectionStatusCard 
            all_accounts={this.state.all_accounts}
            web3={this.state.web3}
          />

          <AccountsSwitcherCard
            all_accounts={this.state.all_accounts}
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

class LookupCarForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleCarLookup = this.handleCarLookup.bind(this);
    this.car_address_input = React.createRef();
    this.agreement_address_input = React.createRef();
    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      // all_accounts: this.props.all_accounts,
      account: this.props.account,
      time_machine_spec: this.props.time_machine_spec,
      lease_start_timestamp: 0,
      lease_end_timestamp: 0,
      lease_driver: 0,
    }
  }


  componentDidMount = async () => {
    var time_machine = await this.state.time_machine_spec.deployed();
    let virtual_time = await time_machine.time_now.call();
    var time_machine_owner = await time_machine.owner();

    this.setState({ 
      time_machine,
      time_machine_owner,
      virtual_time: ts_to_str(virtual_time),
    });

  }

  handleCarLookup = async (event) => {
    event.preventDefault();
    this.setState({lookup_error: null})

    // var car_address = this.car_address_input.current.value;
    var car_address = event.currentTarget.attributes.car_id ?
      event.currentTarget.attributes.car_id.value :
      this.car_address_input.current.value;

    let the_car;
    try {
      the_car = await this.state.car_contract_spec.at(car_address);
    } catch (error) {
      console.log(error)
      this.setState({
        lookup_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshCarInfo(the_car);
  }

  async refreshCarInfo(the_car) {

    update_known_list('known_cars', the_car.address);

    let car_vin = await the_car.VIN.call();
    let car_owner = await the_car.owner.call();
    let car_daily_rate_wei = await the_car.daily_rate.call();
    let car_daily_rate = weiToEther(car_daily_rate_wei);

    this.setState({ 
      the_car,
      car_vin,
      car_owner,
      car_daily_rate,
     });
  }

  handleAgreementLookup = async (event) => {
    event.preventDefault();
    this.setState({lookup_error: null})
    var agreement_address = this.agreement_address_input.current.value;

    const { lease_agreement_spec } = this.state;

    try {
      let lease_agreement = await lease_agreement_spec.at(agreement_address);

      this.setState({ 
        lease_agreement,
        lease_agreement_address: agreement_address,
      });    
      this.refreshLeaseAgreementInfo(lease_agreement);

    } catch (error) {
      this.setState({lookup_error: error.message})
    }
  }

  handleLeaseRequest = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, the_car, lease_agreement_spec } = this.state;
    var tx;

    // December 3, 2018 12:00:00 PM
    var start_timestamp = 1543838400;
    // December 9, 2018 11:59:59 AM
    var end_timestamp = 1544356799;

    if (!the_car) {
      this.setState({action_error: "Select a car!"});
      return;
    }
    var lease_agreement_address;
    try {
      tx = await the_car.requestContractDraft(start_timestamp, end_timestamp, { from: account });
      console.log(tx);
      lease_agreement_address = tx.logs[0].args.contractAddress;
    } catch (error) {
      console.log(error)
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    const lease_agreement = await lease_agreement_spec.at(lease_agreement_address);

    try {
      tx = await lease_agreement.setTimeSource(this.state.time_machine.address, { from: account });
    } catch (error) {
      console.log(error)
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.setState({ 
      lease_agreement,
      lease_agreement_address,
     });
     this.refreshLeaseAgreementInfo(lease_agreement);
  }

  async refreshLeaseAgreementInfo(lease_agreement) {
    try {
      let lease_start_timestamp = await lease_agreement.start_timestamp();
      let lease_end_timestamp = await lease_agreement.end_timestamp();

      let agreement_state = await lease_agreement.agreement_state();

      let lease_driver = await lease_agreement.the_driver();

      let driver_deposit_required = await lease_agreement.driver_deposit_required();
      let driver_deposit_amount = await lease_agreement.driver_deposit_amount();
      let owner_deposit_required = await lease_agreement.owner_deposit_required();
      let owner_deposit_amount = await lease_agreement.owner_deposit_amount();
      let driver_balance = await lease_agreement.driver_balance();
      let driver_over_balance = await lease_agreement.driver_over_balance();
      let car_balance = await lease_agreement.car_balance();
      // let is_started = await lease_agreement.is_started();
      // let is_ended = await lease_agreement.is_ended();
      let daily_rate = await lease_agreement.daily_rate();
      let pickup_time = await lease_agreement.pickup_time();
      let return_time = await lease_agreement.return_time();
      let last_cycle_time = await lease_agreement.last_cycle_time();
      let contract_creator = await lease_agreement.contract_creator();

      this.setState({ 
        lease_start_timestamp: ts_to_str(lease_start_timestamp),
        lease_end_timestamp: ts_to_str(lease_end_timestamp),
        agreement_state: agreementStateToStr(agreement_state),
        lease_driver,
        driver_deposit_required: weiToEther(driver_deposit_required),
        driver_deposit_amount: weiToEther(driver_deposit_amount),
        owner_deposit_required: weiToEther(owner_deposit_required),
        owner_deposit_amount: weiToEther(owner_deposit_amount),
        driver_balance: weiToEther(driver_balance),
        driver_over_balance: weiToEther(driver_over_balance),
        car_balance: weiToEther(car_balance),
        // is_started: ts_to_str(is_started),
        // is_ended: ts_to_str(is_ended),
        daily_rate: weiToEther(daily_rate),
        pickup_time: ts_to_str(pickup_time),
        return_time: ts_to_str(return_time),
        last_cycle_time: ts_to_str(last_cycle_time),
        contract_creator,
      });
    } catch (error) {
      console.log(error)
      this.setState({ lookup_error: error.message, })
      return;
    }

    try {
      var car_address = await lease_agreement.the_car();
      let the_car = await this.state.car_contract_spec.at(car_address);

      this.refreshCarInfo(the_car);
    } catch (error) {
      console.log(error)
      this.setState({ lookup_error: error.message, })
      return;
    }

  }

  handleDriverDepositSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, driver_deposit_required } = this.state;

    const amt_wei = web3.utils.toWei('' + driver_deposit_required);
    try {
      const tx = await lease_agreement
        .driverSign({from: account, value: amt_wei});
      console.log(tx);
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement);
  }

  handleOwnerDepositSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, owner_deposit_required } = this.state;

    const amt_wei = web3.utils.toWei('' + owner_deposit_required);
    try {
      const tx = await lease_agreement
        .ownerSign({from: account, value: amt_wei});
        console.log("​LookupCarForm -> handleOwnerDepositSubmit -> tx", tx)
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement);
  }

  handleTimeTravel = async (event) => {
    this.setState({action_error: null})

    const { time_machine, time_machine_owner, account } = this.state;

    let hours = event.target.attributes.hours.value;

    if (time_machine_owner !== account) {
      this.setState({
        action_error: "Only time machine owner (" + time_machine_owner + ") can mess with the time!",
      })
      return;
    }
    try {
      var tx = await time_machine.forwardHours(hours, {from: account});
      console.log("​LookupCarForm -> handleTimeTravel -> tx", tx)
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }
    var new_time_secs = await this.state.time_machine.time_now.call();
    this.setState({
      virtual_time: ts_to_str(new_time_secs),
    })
  }

  // pickup
  handleDriverPickupSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, driver_deposit_required } = this.state;
    
    const amt_wei = web3.utils.toWei('0.1');
		// console.log("​LookupCarForm -> handleDriverPickupSubmit -> amt_wei", amt_wei)
    try {
      const tx = await lease_agreement
        .driverPickup({from: account, value: amt_wei});
      console.log(tx);
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }
    this.refreshLeaseAgreementInfo(lease_agreement);
  }


  handlePayment = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement } = this.state;
    let amount = event.currentTarget.attributes.amount.value;
    const amt_wei = web3.utils.toWei('' + amount);
    try {
      const tx = await lease_agreement
        .driverPayment({from: account, value: amt_wei});
      console.log(tx);
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement);
  }


  handleProcessCycle = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement } = this.state;

    try {
      const tx = await lease_agreement
        .processCycle({from: account});
      console.log(tx);
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement);
  }

  render() {
    let car_address = this.state.the_car ? this.state.the_car.address : "";

    let lookup_error_text;
    if (this.state.lookup_error) {
      lookup_error_text = <small id="lookupError" 
        className="form-text alert alert-warning">
        {this.state.lookup_error}</small>
    }

    let action_error_text;
    if (this.state.action_error) {
      action_error_text = <small id="actionError" 
        className="form-text alert alert-warning">
        {this.state.action_error}</small>
    }

    let account = this.state.account;
    let agreement_state = this.state.agreement_state;

    let is_driver = false;
    let is_owner = false;
    let is_driver_or_owner = "?";

    let driver_deposit_disabled = true;
    let owner_deposit_disabled = true;
    let lease_request_disabled = false;
    let payment_disabled = false;

    if (this.state.lease_agreement) {
      lease_request_disabled = true;
      if (account === this.state.lease_driver) {
        is_driver = true;
        if (agreement_state === "Created" || agreement_state === "PartiallySigned") {
          driver_deposit_disabled = false;
        }
        is_driver_or_owner = "The Driver";
      } else if (account ===  this.state.car_owner) {
        is_owner = true;
        if (agreement_state === "Created" || agreement_state === "PartiallySigned") {
          owner_deposit_disabled = false;
        }
        is_driver_or_owner = "The Car Owner";
      } else {
        is_driver_or_owner = "Not Owner or Driver!";
      }
    }

    let pickup_disabled = agreement_state === "Approved" ? false : true;
    let process_cycle_disabled = agreement_state === "InProgress" ? false : true;

    
    var known_cars = JSON.parse(localStorage.getItem("known_cars"));
    known_cars = known_cars ? known_cars : [];
    const known_cars_list = known_cars.map((car_id) =>
          <li>
            <a href="/" onClick={this.handleCarLookup} car_id={car_id} className="badge badge-light">
              {car_id}
            </a>
            <a href="/" onClick={this.handleRemoveFromList} address={car_id} list_name="known_cars" className="badge badge-light">
              X
            </a>
          </li>
    );


    return (
    <div className="row">
      <div className="col-sm">
        <div className="card">
      <div className="card-body">

        {lookup_error_text}

        <form onSubmit={this.handleCarLookup}>
          <label>
            Car:
            <input id="car_address" name="car_address" type="text" ref={this.car_address_input} />
          </label>
          <input type="submit" value="Find it!" />
        </form>

        <ul>
          <li>Car: {car_address}</li>
          <li>VIN: {this.state.car_vin}</li>
          <li>Owner: {this.state.car_owner}</li>
          <li>Daily Rate: {this.state.car_daily_rate}</li>
        </ul>

        <form onSubmit={this.handleAgreementLookup}>
          <label>
            Agreement address:
            <input id="agreement_address" name="agreement_address" type="text" ref={this.agreement_address_input} />
          </label>
          <input type="submit" value="Find it!" />
        </form>

        <ul>
          <li>Agreement: {this.state.lease_agreement_address}</li>
          <li>Driver: {this.state.lease_driver}</li>
          <li>State: {this.state.agreement_state}</li>
          <li>Start: {this.state.lease_start_timestamp}</li>
          <li>End: {this.state.lease_end_timestamp}</li>
          <li>You are: {is_driver_or_owner}</li>
          <li>Driver deposit required: {this.state.driver_deposit_required} eth</li>
          <li>Driver deposit received: {this.state.driver_deposit_amount} eth</li>
          <li>Owner deposit required: {this.state.owner_deposit_required} eth</li>
          <li>Owner deposit received: {this.state.owner_deposit_amount} eth</li>
          <li>Driver balance: {this.state.driver_balance} eth</li>
          <li>Driver over balance: {this.state.driver_over_balance} eth</li>
          <li>Car balance: {this.state.car_balance} eth</li>
          <li>Driver access enabled?: {this.state.driver_access_enabled}</li>
          <li>Is started: {this.state.is_started}</li>
          <li>Is ended: {this.state.is_ended}</li>
          <li>Daily rate: {this.state.daily_rate}</li>
          <li>Picked up time: {this.state.pickup_time}</li>
          <li>Returned time: {this.state.return_time}</li>
          <li>Last cycle run: {this.state.last_cycle_time}</li>
          <li>Contract creator: {this.state.contract_creator}</li>
        </ul>

      </div>
    </div>
      </div>
      <div className="col-sm">
      {action_error_text}
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Actions</h5>

            <ul>
              <li>
              <button onClick={this.handleLeaseRequest} type="submit" className="btn btn-primary btn-sm" disabled={lease_request_disabled}>
                Request Lease
              </button>
              </li>
              <li>
              <button onClick={this.handleDriverDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={driver_deposit_disabled}>
                Driver Sign+Deposit
              </button>
              </li>
              <li>
              <button onClick={this.handleOwnerDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={owner_deposit_disabled}>
                Owner Sign+Deposit
              </button>
              </li>
              <li>
              <button onClick={this.handleDriverPickupSubmit} type="submit" className="btn btn-primary btn-sm" disabled={pickup_disabled}>
                Driver Pickup
              </button>
              </li>

              <li>
              <button onClick={this.handlePayment} amount="0.5" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                Pay 0.5
              </button>
              <button onClick={this.handlePayment} amount="1" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                Pay 1
              </button>
              <button onClick={this.handlePayment} amount="2" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                Pay 2
              </button>
              </li>

              <li>
              <button onClick={this.handleProcessCycle} type="submit" className="btn btn-primary btn-sm" disabled={process_cycle_disabled}>
                Process Cycle
              </button>
              </li>

            </ul>
          </div>
        </div>

        <div className="card">
            <div className="card-body">
              <h5 className="card-title">{this.state.virtual_time}</h5>
              <h6 className="card-subtitle mb-2 text-muted">Time Machine</h6>
              <button onClick={this.handleTimeTravel} hours="-24" className="badge badge-light">&lt; 1D</button>
              <button onClick={this.handleTimeTravel} hours="-6" className="badge badge-light">&lt; 6h</button>
              <button onClick={this.handleTimeTravel} hours="-1" className="badge badge-light">&lt; 1h</button>
              <button onClick={this.handleTimeTravel} hours="1" className="badge badge-light">&gt; 1h</button>
              <button onClick={this.handleTimeTravel} hours="6" className="badge badge-light">&gt; 6h</button>
              <button onClick={this.handleTimeTravel} hours="24" className="badge badge-light">&gt; 1D</button>
            </div>
        </div>

        <div className="card">
            <div className="card-body">
              <h5 className="card-title">Recent Cars</h5>

              <ul>{known_cars_list}</ul>

            </div>
        </div>

      </div>
    </div>
    );
  }
}