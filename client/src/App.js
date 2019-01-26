import React, { Component } from "react";

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseAgreementContract from "./contracts/LeaseAgreement.json";
import TimeMachineContract from "./contracts/TimeMachine.json";
import getWeb3 from "./utils/getWeb3";

import ConnectionStatusCard from "./ConnectionStatus";
import AccountsSwitcherCard from "./AccountsSwitcher";
import TimeTravelCard from "./TimeTravelCard.js";

var truffle_contract = require("truffle-contract");
var web3 = require("web3");

const helpers = require('./helpers.js');
const weiToEther = helpers.weiToEther;
const ts_to_str = helpers.ts_to_str;
const agreementStateToStr = helpers.agreementStateToStr;
const format_error_message = helpers.format_error_message;

function update_known_list(list_name, address) {
    // add the address to known_cars list if not there
    var list = JSON.parse(localStorage.getItem(list_name));
    list = list ? list : [];
    if (list.indexOf(address) === -1) {
      list.push(address);
    }
    localStorage.setItem(list_name, JSON.stringify(list));
}

function remove_from_known_list(list_name, address) {
  // add the address to known_cars list if not there
  var stored_list = JSON.parse(localStorage.getItem(list_name));
  if (stored_list) {
    var filtered_list = stored_list.filter(function(value, index, arr){
      return value !== address;
    });    
    localStorage.setItem(list_name, JSON.stringify(filtered_list));
  }
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
    tabIndex: 0,
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

      var time_machine = await time_machine_spec.deployed();
      let virtual_time = await time_machine.time_now.call();
      var time_machine_owner = await time_machine.owner();

      var account_balance = await web3.eth.getBalance(account);
  
      // Set web3, accounts, and contract to the state so that other 
      // components can access it
      this.setState({ 
        web3, 
        all_accounts, 
        account,
        car_contract_spec,
        lease_agreement_spec,
        time_machine_spec,
        time_machine,
        time_machine_owner,
        virtual_time: ts_to_str(virtual_time),
        account_balance,
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
        <div className="row">
          <div className="col-sm">
            <h3>Leasables Dev Demo</h3>
          </div>

          <div className="col-sm">
            <h6 className="text-muted text-right">Hello {this.state.account}</h6>
            <h6 className="text-muted text-right">Time is: {this.state.virtual_time}</h6>
            <h6 className="text-muted text-right">Your balance: {weiToEther(this.state.account_balance)} eth</h6>
          </div>
        </div>
      <Tabs selectedIndex={this.state.tabIndex} 
        onSelect={tabIndex => this.setState({ tabIndex })}>
        <TabList>
          <Tab>Cars</Tab>
          <Tab>Lease Agreements</Tab>
          <Tab>Utils</Tab>
        </TabList>

        <TabPanel>
        <div className="row">
          <div className="col-md-10">
            <CarMgmtForm
              car_contract_spec={this.state.car_contract_spec} 
              lease_agreement_spec={this.state.lease_agreement_spec} 
              time_machine_spec={this.state.time_machine_spec}
              web3={this.state.web3}
              account={this.state.account} />
          </div>
        </div>
        </TabPanel>


        <TabPanel>
        <div className="row">
          <div className="col-sm">
            <AgreementLookupForm
              car_contract_spec={this.state.car_contract_spec} 
              lease_agreement_spec={this.state.lease_agreement_spec} 
              time_machine_spec={this.state.time_machine_spec}
              web3={this.state.web3}
              account={this.state.account} />
          </div>
        </div>
        </TabPanel>

        <TabPanel>
        <div className="row">
          <div className="col-md-10">

          <TimeTravelCard
            time_machine={this.state.time_machine}
            account={this.state.account}
            time_machine_owner={this.state.time_machine_owner}
            virtual_time={this.state.virtual_time}            
          />

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

class AgreementLookupForm extends React.Component {
  constructor(props) {
    super(props);

    this.handleAgreementLookup = this.handleAgreementLookup.bind(this);
    this.agreement_address_input = React.createRef();

    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      account: this.props.account,
      time_machine_spec: this.props.time_machine_spec,
      web3: this.props.web3,

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

  handleAgreementLookup = async (event) => {
    event.preventDefault();
    this.setState({
      lookup_error: null,
      the_car: null,
      lease_agreement: null,
    });

    var agreement_address = event.currentTarget.attributes.agreement_id ?
      event.currentTarget.attributes.agreement_id.value :
      this.agreement_address_input.current.value;

    const { lease_agreement_spec } = this.state;

    try {
      let lease_agreement = await lease_agreement_spec.at(agreement_address);
      update_known_list('known_agreements', lease_agreement.address);

      this.setState({ 
        lease_agreement,
        agreement_address: agreement_address,
      });    
      this.refreshLeaseAgreementInfo(lease_agreement);

    } catch (error) {
      this.setState({lookup_error: error.message})
    }
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

      let agreement_balance_wei = await this.state.web3.eth.getBalance(lease_agreement.address)

      var car_address = await lease_agreement.the_car();
      let the_car = await this.state.car_contract_spec.at(car_address);

      let car_vin = await the_car.VIN.call();
      let car_owner = await the_car.owner.call();

      this.setState({ 
        the_car,
        car_vin,
        car_owner,
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
        agreement_balance: weiToEther(agreement_balance_wei),
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

      // this.refreshCarInfo(the_car);
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
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement);
  }

  handleRemoveFromList(event) {

    let address = event.target.attributes.address.value;
    let list_name = event.target.attributes.list_name.value;
    remove_from_known_list(list_name, address);
  }

  // pickup
  handleDriverPickupSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement} = this.state;
    
    const amt_wei = web3.utils.toWei('0.1');
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

    // driver return
  handleDriverReturn = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})
  
      const { account, lease_agreement } = this.state;
      
      try {
        const tx = await lease_agreement
          .driverReturn({from: account});
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
  
  
  // owner finalize
  handleOwnerFinalize = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})
  
      const { account, lease_agreement } = this.state;
      
      try {
          const tx = await lease_agreement
            .ownerFinalize({from: account});
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
  
  
  // driver finalize
  handleDriverFinalize = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})

      const { account, lease_agreement } = this.state;
      
      try {
          const tx = await lease_agreement
            .driverFinalize({from: account});
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

  agreement_card(is_driver_or_owner) {

    let agreement_address = this.state.agreement_address 
      ? this.state.agreement_address : "";

    let car_address = this.state.the_car 
      ? this.state.the_car.address : "";

    var agreement_subtitle = agreement_address ?
      <h6 className="card-subtitle mb-2 text-muted">Contract: {agreement_address}</h6> :
      <h6 className="card-subtitle mb-2 text-muted">Lookup an agreement...</h6>;

    var agreement_details = agreement_address ?
      <div>
      <ul>
        <li>Car: {car_address}</li>
        <li>VIN: {this.state.car_vin}</li>
        <li>Driver: {this.state.lease_driver}</li>
        <li>You are: {is_driver_or_owner}</li>
      </ul>
      <ul>
        <li>State: {this.state.agreement_state}</li>
        <li><b>{this.state.lease_start_timestamp}</b> to <b>{this.state.lease_end_timestamp}</b></li>
        <li>Daily rate: {this.state.daily_rate} eth</li>
        <li>Driver deposit: {this.state.driver_deposit_amount} eth ({this.state.driver_deposit_required} required)</li>
        <li>Owner deposit: {this.state.owner_deposit_amount} eth ({this.state.owner_deposit_required} required)</li>
        <li>Driver balance: {this.state.driver_balance} eth</li>
        <li>Driver over balance: {this.state.driver_over_balance} eth</li>
        <li>Car balance: {this.state.car_balance} eth</li>
        <li>Contract's balance: {this.state.agreement_balance} eth</li>
        <li>Driver access enabled?: {this.state.driver_access_enabled}</li>
        <li>Is started: {this.state.is_started} | Is ended: {this.state.is_ended}</li>
        <li>Picked up time: {this.state.pickup_time}</li>
        <li>Returned time: {this.state.return_time}</li>
        <li>Last cycle run: {this.state.last_cycle_time}</li>
      </ul>
      </div>
      :
      <div>
        <form onSubmit={this.handleAgreementLookup}>
          <label>
            <input id="agreement_address" name="agreement_address" type="text" ref={this.agreement_address_input} />
          </label>
          <input type="submit" value="Find it!" className="btn btn-primary btn-sm" />
        </form>
      </div>
  
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Lease Agreement</h5>
            {agreement_subtitle}
            {agreement_details}
        </div>
      </div>
    );
  }

  render() {

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
    let payment_disabled = false;

    if (this.state.lease_agreement) {
      if (account === this.state.lease_driver) {
        is_driver = true;
        is_driver_or_owner = "The Driver";
        if (agreement_state === "Draft") {
          driver_deposit_disabled = false;
        }
      } else if (account ===  this.state.car_owner) {
        is_owner = true;
        is_driver_or_owner = "The Car Owner";
        if (agreement_state === "DriverSigned") {
          owner_deposit_disabled = false;
        }
      } else {
        is_driver_or_owner = "Not Owner or Driver!";
      }
    }

    let pickup_disabled = agreement_state === "Approved" && is_driver ? false : true;
    let process_cycle_disabled = agreement_state === "InProgress" && is_owner ? false : true;
    let return_disabled = agreement_state === "InProgress" && is_driver ? false : true;
    let owner_finalize_disabled = agreement_state === "CarReturned" && is_owner ? false : true;
    let driver_finalize_disabled = agreement_state === "Finalized" && is_driver ? false : true;

    var known_agreements = JSON.parse(localStorage.getItem("known_agreements"));
    known_agreements = known_agreements ? known_agreements : [];
    const known_agreements_list = known_agreements.map((agreement_id) =>
          <li>
            <a href="/" onClick={this.handleAgreementLookup} agreement_id={agreement_id} className="badge badge-light">
              {agreement_id}
            </a>
            <a href="/" onClick={this.handleRemoveFromList} address={agreement_id} list_name="known_agreements" className="badge badge-danger">
              X
            </a>
          </li>
    );

      return (
    <div className="row">
      <div className="col-lg-9">

        {lookup_error_text}

        {this.agreement_card(is_driver_or_owner)}

        <div className="card">
            <h6 class="card-header">Recently Seen Lease Agreements</h6>
            <div className="card-body">
              <ul>{known_agreements_list}</ul>
            </div>
        </div>

      </div>

      <div className="col-lg-3">

        {action_error_text}

        <div className="card">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Driver Actions</h6>

            <div class="btn-toolbar mb-3" role="toolbar">
              <div class="btn-group mr-2" role="group">
                <button onClick={this.handleDriverDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={driver_deposit_disabled}>
                  Driver Sign+Deposit
                </button>
              </div>
              <div class="btn-group mr-2" role="group">
                <button onClick={this.handleDriverPickupSubmit} type="submit" className="btn btn-primary btn-sm" disabled={pickup_disabled}>
                  Driver Pickup
                </button>
              </div>

              <div class="btn-group mr-2" role="group">
                <button onClick={this.handlePayment} amount="0.5" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                  Pay 0.5
                </button>
                <button onClick={this.handlePayment} amount="1" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                  Pay 1
                </button>
                <button onClick={this.handlePayment} amount="2" type="submit" className="btn btn-primary btn-sm" disabled={payment_disabled}>
                  Pay 2
                </button>
              </div>

              <div class="btn-group mr-2" role="group">
                <button onClick={this.handleDriverReturn} type="submit" className="btn btn-primary btn-sm" disabled={return_disabled}>
                  Driver Return
                </button>
              </div>

              <div class="btn-group mr-2" role="group">
                <button onClick={this.handleDriverFinalize} type="submit" className="btn btn-primary btn-sm" disabled={driver_finalize_disabled}>
                  Driver Finalize
                </button>
              </div>

            </div>
          </div>
        </div>


        <div className="card">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Owner Actions</h6>

            <div class="btn-toolbar mb-3" role="toolbar">

              <div class="btn-group mr-2" role="group">
              <button onClick={this.handleOwnerDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={owner_deposit_disabled}>
                Owner Sign+Deposit
              </button>
              </div>
              <div class="btn-group mr-2" role="group">
              <button onClick={this.handleProcessCycle} type="submit" className="btn btn-primary btn-sm" disabled={process_cycle_disabled}>
                Process Cycle
              </button>
              </div>
              <div class="btn-group mr-2" role="group">
              <button onClick={this.handleOwnerFinalize} type="submit" className="btn btn-primary btn-sm" disabled={owner_finalize_disabled}>
                Owner Finalize
              </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
    );
  }
}


class CarMgmtForm extends React.Component {
  constructor(props) {
    super(props);

    this.handleCarLookup = this.handleCarLookup.bind(this);
    this.car_address_input = React.createRef();

    this.handleStartDateChange = this.handleStartDateChange.bind(this);
    this.handleEndDateChange = this.handleEndDateChange.bind(this);

    this.handleLeaseRequest = this.handleLeaseRequest.bind(this);

    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      account: this.props.account,
      time_machine_spec: this.props.time_machine_spec,
      web3: this.props.web3,

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
    this.setState({
      lookup_error: null,
      the_car: null,
      lease_agreement: null,
    });

    var car_address = event.currentTarget.attributes.car_id ?
      event.currentTarget.attributes.car_id.value :
      this.car_address_input.current.value;

    let the_car;
    try {
      the_car = await this.state.car_contract_spec.at(car_address);
      update_known_list('known_cars', the_car.address);
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

    let car_vin = await the_car.VIN.call();
    let car_owner = await the_car.owner.call();
    let car_daily_rate_wei = await the_car.daily_rate.call();
    let car_contract_balance_wei = await this.state.web3.eth.getBalance(the_car.address);


    this.setState({ 
      the_car,
      car_vin,
      car_owner,
      car_daily_rate: weiToEther(car_daily_rate_wei),
      car_contract_balance: weiToEther(car_contract_balance_wei),
     });
  }

  handleStartDateChange(date) {
    this.setState({
      requested_start_date: date
    });
  }

  handleEndDateChange(date) {
    this.setState({
      requested_end_date: date
    });
  }

  handleLeaseRequest = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    var tx;
    const { account, the_car, lease_agreement_spec } = this.state;
    if (!the_car) {
      this.setState({action_error: "Select a car!"});
      return;
    }
    
    const { requested_end_date, requested_start_date} = this.state;
    if (!requested_start_date || !requested_end_date) {
      this.setState({action_error: "Select a lease start & end date!"});
      return;
    }
    var start_timestamp = Math.round(requested_start_date.getTime() / 1000);
    var end_timestamp = Math.round(requested_end_date.getTime() / 1000);

    var agreement_address;
    try {
      tx = await the_car.requestDraftAgreement(
        start_timestamp, end_timestamp, 
        this.state.time_machine.address,
        { from: account });

      agreement_address = tx.logs[0].args.contractAddress;
    } catch (error) {
      console.log(error)
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }
    update_known_list("known_agreements", agreement_address);
    const lease_agreement = await lease_agreement_spec.at(agreement_address);

    this.setState({ 
      lease_agreement,
      agreement_address,
      confirmation_message: "Created draft agreement [" + agreement_address + "]",
      tabIndex: 0,
     });
    //  this.refreshLeaseAgreementInfo(lease_agreement);
  }


  car_card() {

    var known_cars = JSON.parse(localStorage.getItem("known_cars"));
    known_cars = known_cars ? known_cars : [];
    const known_cars_list = known_cars.map((car_id) =>
          <li>
            <a href="/" onClick={this.handleCarLookup} car_id={car_id} className="badge badge-light">
              {car_id}
            </a>
            <a href="/" onClick={this.handleRemoveFromList} address={car_id} list_name="known_cars" className="badge badge-danger">
              X
            </a>
          </li>
    );

    let car_address = this.state.the_car 
      ? this.state.the_car.address : "";

    var car_subtitle = car_address ?
      <h6 className="card-subtitle mb-2 text-muted">{car_address}</h6> :
      <h6 className="card-subtitle mb-2 text-muted">Lookup a car...</h6>;
    var car_details;
    if (car_address) {
      car_details = (
      <div>
        <ul>
          <li>VIN: {this.state.car_vin}</li>
          <li>Owner: {this.state.car_owner}</li>
          <li>Daily Rate: {this.state.car_daily_rate}</li>
          <li>Balance: {this.state.car_contract_balance} eth</li>
        </ul>
      </div>
      );
    } else {
      car_details = (
        <div>
          <form onSubmit={this.handleCarLookup}>
            <label>
              <input id="car_address" name="car_address" type="text" ref={this.car_address_input} />
            </label>
            <input type="submit" value="Find it!" className="btn btn-primary btn-sm" />
          </form>
        </div>);
    }

    var request_agreement_form = "";
    if (!this.state.lease_agreement && this.state.the_car) {
      request_agreement_form = (

        <div className="card">
        <div className="card-body">
          <h5 className="card-title">Request Lease Agreement</h5>
  
        <form onSubmit={ this.handleLeaseRequest }>
          <div className="form-group">
            <DatePicker
              name="requested_start_date"
              selected={this.state.requested_start_date}
              onChange={this.handleStartDateChange}
              showTimeSelect
              dateFormat="MMM d, yyyy h:mm aa"
              placeholderText="Start at..."
            />
            <DatePicker
              name="requested_end_date"
              selected={this.state.requested_end_date}
              onChange={this.handleEndDateChange}
              showTimeSelect
              dateFormat="MMM d, yyyy h:mm aa"
              placeholderText="End at..."
            />
          </div>
          <div className="form-group">
            <button className="btn btn-success">Get Draft</button>
          </div>
        </form>
        </div>
      </div>
        );
    }

    return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Leasable Car</h5>
          {car_subtitle}
          {car_details}
          {request_agreement_form}

          <h6 className="card-subtitle mb-2 text-muted">Recent Cars</h6>
          <ul>{known_cars_list}</ul>
      </div>
    </div>
    );
  }

  render() {

    let lookup_error_text;
    if (this.state.lookup_error) {
      lookup_error_text = <small id="lookupError" 
        className="form-text alert alert-warning">
        {this.state.lookup_error}</small>
    }

    let confirmation_message_text;
    if (this.state.confirmation_message) {
      confirmation_message_text = <small id="confirmationMessage" 
        className="form-text alert alert-success">
        {this.state.confirmation_message}</small>
    }

    let action_error_text;
    if (this.state.action_error) {
      action_error_text = <small id="actionError" 
        className="form-text alert alert-warning">
        {this.state.action_error}</small>
    }
    
    return (
    <div className="row">
      <div className="col-md">

        {lookup_error_text}
        {action_error_text}
        {confirmation_message_text}

        {this.car_card()}

      </div>

    </div>
    );
  }  
}
