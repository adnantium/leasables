import React from "react";
// import AgreementState from "./AgreementState.js";

var web3 = require("web3");

const helpers = require('./helpers.js');
const weiToEther = helpers.weiToEther;
const ts_to_str = helpers.ts_to_str;
const agreementStateToStr = helpers.agreementStateToStr;
const format_error_message = helpers.format_error_message;
const update_known_list = helpers.update_known_list;
const remove_from_known_list = helpers.remove_from_known_list;

class AgreementMgmtForm extends React.Component {
  constructor(props) {
    super(props);

    this.handleAgreementLookup = this.handleAgreementLookup.bind(this);
    this.agreement_address_input = React.createRef();

    this.state = {
      car_contract_spec: this.props.car_contract_spec,
      lease_agreement_spec: this.props.lease_agreement_spec,
      agreement_executor_spec: this.props.agreement_executor_spec,
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
      agreement_executor: null,
    });

    var agreement_address = event.currentTarget.attributes.agreement_id ?
      event.currentTarget.attributes.agreement_id.value :
      this.agreement_address_input.current.value;

    const { lease_agreement_spec, agreement_executor_spec } = this.state;

    try {
      let lease_agreement = await lease_agreement_spec.at(agreement_address);
      update_known_list('known_agreements', lease_agreement.address);

      var agreement_executor = null;
      var exec_uid = await lease_agreement.agreement_executor();
      if (exec_uid !== "0x0000000000000000000000000000000000000000") {
        agreement_executor = await agreement_executor_spec.at(exec_uid);
      }

      this.setState({ 
        lease_agreement,
        agreement_address: agreement_address,
        agreement_executor,
      });
      
      this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);

    } catch (error) {
      this.setState({lookup_error: error.message})
    }
  }

  async refreshLeaseAgreementInfo(agreement, executor) {
    try {

      // the car
      var car_address = await agreement.the_car();
      let the_car = await this.state.car_contract_spec.at(car_address);
      let car_vin = await the_car.VIN.call();
      let car_owner = await the_car.owner.call();

      // the agreement
      let lease_start_timestamp = await agreement.start_timestamp();
      let lease_end_timestamp = await agreement.end_timestamp();
      let lease_driver = await agreement.the_driver();
      let daily_rate = await agreement.daily_rate();
      let driver_deposit_required = await agreement.driver_deposit_required();
      let owner_deposit_required = await agreement.owner_deposit_required();
      let contract_creator = await agreement.contract_creator();

      // the executor
      if (executor) {
        let agreement_state = await executor.agreement_state();
        let driver_deposit_amount = await executor.driver_deposit_amount();
        let owner_deposit_amount = await executor.owner_deposit_amount();
        let driver_balance = await executor.driver_balance();
        let driver_over_balance = await executor.driver_over_balance();
        let car_balance = await executor.car_balance();
        // let is_started = await executor.is_started();
        // let is_ended = await executor.is_ended();
        let pickup_time = await executor.pickup_time();
        let return_time = await executor.return_time();
        let last_cycle_time = await executor.last_cycle_time();

        let agreement_balance_wei = await this.state.web3.eth.getBalance(agreement.address)

        this.setState({ 
          agreement_state: agreementStateToStr(agreement_state),
          driver_deposit_amount: weiToEther(driver_deposit_amount),
          owner_deposit_amount: weiToEther(owner_deposit_amount),
          driver_balance: weiToEther(driver_balance),
          driver_over_balance: weiToEther(driver_over_balance),
          car_balance: weiToEther(car_balance),
          agreement_balance: weiToEther(agreement_balance_wei),
          // is_started: ts_to_str(is_started),
          // is_ended: ts_to_str(is_ended),
          pickup_time: ts_to_str(pickup_time),
          return_time: ts_to_str(return_time),
          last_cycle_time: ts_to_str(last_cycle_time),
        });
      } else {
        this.setState({ 
          agreement_state: "Draft",
          driver_deposit_amount: 0,
          owner_deposit_amount: 0,
          driver_balance: 0,
          driver_over_balance: 0,
          car_balance: 0,
          agreement_balance: 0,
        });

      }

      this.setState({ 
        the_car,
        car_vin,
        car_owner,
        lease_start_timestamp: ts_to_str(lease_start_timestamp),
        lease_end_timestamp: ts_to_str(lease_end_timestamp),
        lease_driver,
        daily_rate: weiToEther(daily_rate),
        driver_deposit_required: weiToEther(driver_deposit_required),
        owner_deposit_required: weiToEther(owner_deposit_required),
        contract_creator,
      });
    } catch (error) {
      console.log(error)
      this.setState({ lookup_error: error.message, })
      return;
    }
  }

  handleDriverDepositSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, the_car, lease_agreement, agreement_executor_spec, time_machine, driver_deposit_required } = this.state;

    var agreement_executor;
    try {
      var tx = await the_car.initiateAgreement(lease_agreement.address, 
          time_machine.address,
          { from: account });

      var executor_uid = tx.logs[0].args.agreement_executor;
      agreement_executor = await agreement_executor_spec.at(executor_uid);
      this.setState({agreement_executor});

    } catch (error) {
      console.log(error)
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }

    const amt_wei = web3.utils.toWei('' + driver_deposit_required);
    try {
      const tx = await agreement_executor.driverSign({from: account, value: amt_wei});
    } catch (error) {
      console.log(error);
      this.setState({ action_error: format_error_message(error.message), })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }

  handleOwnerDepositSubmit = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, agreement_executor, owner_deposit_required } = this.state;

    const amt_wei = web3.utils.toWei('' + owner_deposit_required);
    try {
      const tx = await agreement_executor.ownerSign({from: account, value: amt_wei});
    } catch (error) {
      this.setState({ action_error: format_error_message(error.message),})
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
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

    const { account, lease_agreement, agreement_executor} = this.state;
    
    const amt_wei = web3.utils.toWei('0.1');
    try {
      const tx = await agreement_executor
        .driverPickup({from: account, value: amt_wei});
      console.log(tx);
    } catch (error) {
      console.log(error);
      this.setState({
        action_error: format_error_message(error.message),
      })
      return;
    }
    this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }


  handlePayment = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, agreement_executor } = this.state;
    let amount = event.currentTarget.attributes.amount.value;
    const amt_wei = web3.utils.toWei('' + amount);
    try {
      const tx = await agreement_executor.driverPayment({from: account, value: amt_wei});
    } catch (error) {
      console.log(error);
      this.setState({ action_error: format_error_message(error.message), })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }


  handleProcessCycle = async (event) => {
    event.preventDefault();
    this.setState({action_error: null})

    const { account, lease_agreement, agreement_executor } = this.state;

    try {
      const tx = await agreement_executor.processCycle({from: account});
    } catch (error) {
      console.log(error);
      this.setState({ action_error: format_error_message(error.message), })
      return;
    }

    this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }

    // driver return
  handleDriverReturn = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})
  
      const { account, lease_agreement, agreement_executor } = this.state;
      
      try {
        const tx = await agreement_executor.driverReturn({from: account});
      } catch (error) {
        console.log(error);
        this.setState({ action_error: format_error_message(error.message), })
        return;
      }
      this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
    }
  
  
  // owner finalize
  handleOwnerFinalize = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})
  
      const { account, lease_agreement, agreement_executor } = this.state;
      
      try {
          const tx = await agreement_executor.ownerFinalize({from: account});
      } catch (error) {
          console.log(error);
          this.setState({ action_error: format_error_message(error.message), })
          return;
      }
      this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }
  
  
  // driver finalize
  handleDriverFinalize = async (event) => {
      event.preventDefault();
      this.setState({action_error: null})

      const { account, lease_agreement, agreement_executor } = this.state;
      
      try {
          const tx = await agreement_executor.driverFinalize({from: account});
          console.log(tx);
      } catch (error) {
          console.log(error);
          this.setState({ action_error: format_error_message(error.message), })
          return;
      }
      this.refreshLeaseAgreementInfo(lease_agreement, agreement_executor);
  }

  agreement_card(is_driver_or_owner) {

    let agreement_address = this.state.agreement_address 
      ? this.state.agreement_address : "";

    let car_address = this.state.the_car 
      ? this.state.the_car.address : "";

    var agreement_details = "";
    var agreement_lookup = "";
    var states_list = "";

    if (agreement_address) {
      const state_names = [ 
        "Draft", 
        "DriverSigned", 
        "Approved", 
        "InProgress", 
        "CarReturned", 
        "Finalized", 
        "Ended"];

      // states_list = state_names.map((state_name) =>
      //     <li className="list-group-item">{state_name}</li>
      // );
      
      var states_list = [];
      state_names.forEach(state_name => {
        var line;
        if (state_name == this.state.agreement_state) {
          line = <li className="list-group-item active">{state_name}</li>
        } else {
          line = <li className="list-group-item">{state_name}</li>
        }
        states_list.push(line);
      });

      agreement_details = 
      <div>
        <h6 className="card-subtitle mb-2 text-muted">Contract: {agreement_address}</h6>
        <div className="row">
          <div className="col-9">
            <ul>
              <li>Car: {car_address}</li>
              <li>VIN: {this.state.car_vin}</li>
              <li>Driver: {this.state.lease_driver}</li>
              <li>Owner: {this.state.car_owner}</li>
              <li>You are: {is_driver_or_owner}</li>
            </ul>
            <ul>
              <li>Agreement:
                <ul>
                  <li>State: {this.state.agreement_state}</li>
                  <li><b>{this.state.lease_start_timestamp}</b> to <b>{this.state.lease_end_timestamp}</b></li>
                  <li>Daily rate: {this.state.daily_rate} eth</li>
                </ul>
              </li>
              <li>Balances:
                <ul>
                  <li>Driver deposit: {this.state.driver_deposit_amount} eth ({this.state.driver_deposit_required} required)</li>
                  <li>Owner deposit: {this.state.owner_deposit_amount} eth ({this.state.owner_deposit_required} required)</li>
                  <li>Driver balance: {this.state.driver_balance} eth</li>
                  <li>Driver over balance: {this.state.driver_over_balance} eth</li>
                  <li>Car balance: {this.state.car_balance} eth</li>
                  <li>Contract's balance: {this.state.agreement_balance} eth</li>
                </ul>
              </li>
              <li>Status:
                <ul>
                  <li>Driver access enabled?: {this.state.driver_access_enabled}</li>
                  <li>Is started: {this.state.is_started} | Is ended: {this.state.is_ended}</li>
                  <li>Picked up time: {this.state.pickup_time}</li>
                  <li>Returned time: {this.state.return_time}</li>
                  <li>Last cycle run: {this.state.last_cycle_time}</li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="col-3">
            {/* <AgreementState
              agreement_state={this.state.agreement_state}
            /> */}
            <h6 className="mb-2">Agreement State</h6>
            <div className="card">
              <ul className="list-group list-group-flush">
                    {states_list}
              </ul>
            </div>
          </div>
        </div>
      </div>


    } else {
      agreement_lookup = 
      <div>
        <form onSubmit={this.handleAgreementLookup}>
          <label>
            <input id="agreement_address" name="agreement_address" 
              className="form-control" 
              type="text" ref={this.agreement_address_input} 
              placeholder="Lookup an agreement..."
            />
          </label>
          <input type="submit" value="Find it!" className="btn btn-primary btn-sm" />
        </form>
      </div>
    }

    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Lease Agreement</h5>
            {agreement_details}
            {agreement_lookup}
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
      } else if (account === this.state.car_owner) {
        is_owner = true;
        is_driver_or_owner = "The Car Owner";
        if (agreement_state === "DriverSigned") {
          owner_deposit_disabled = false;
        }
      } else {
        is_driver_or_owner = "Not Owner or Driver!";
      }
      if (this.state.car_owner === this.state.lease_driver) {
        is_driver_or_owner = "WARNING! Car Owner == Driver!";
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
        {action_error_text}

        {this.agreement_card(is_driver_or_owner)}

        <div className="card">
            <h6 className="card-header">Recently Seen Lease Agreements</h6>
            <div className="card-body">
              <ul>{known_agreements_list}</ul>
            </div>
        </div>

      </div>

      <div className="col-lg-3">

        {/* Driver Actions */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Driver Actions</h6>

            <div class="btn-toolbar mb-3" role="toolbar">

                <button onClick={this.handleDriverDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={driver_deposit_disabled}>
                  Driver Sign+Deposit
                </button>

                <button onClick={this.handleDriverPickupSubmit} type="submit" className="btn btn-primary btn-sm" disabled={pickup_disabled}>
                  Driver Pickup
                </button>

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

                <button onClick={this.handleDriverReturn} type="submit" className="btn btn-primary btn-sm" disabled={return_disabled}>
                  Driver Return
                </button>

                <button onClick={this.handleDriverFinalize} type="submit" className="btn btn-primary btn-sm" disabled={driver_finalize_disabled}>
                  Driver Finalize
                </button>


            </div>
          </div>
        </div>

        {/* Owner Actions */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-subtitle mb-2 text-muted">Owner Actions</h6>

            <div class="btn-toolbar mb-3" role="toolbar">
              <button onClick={this.handleOwnerDepositSubmit} type="submit" className="btn btn-primary btn-sm" disabled={owner_deposit_disabled}>
                Owner Sign+Deposit
              </button>

              <button onClick={this.handleProcessCycle} type="submit" className="btn btn-primary btn-sm" disabled={process_cycle_disabled}>
                Process Cycle
              </button>

              <button onClick={this.handleOwnerFinalize} type="submit" className="btn btn-primary btn-sm" disabled={owner_finalize_disabled}>
                Owner Finalize
              </button>

            </div>
          </div>
        </div>

      </div>

    </div>
    );
  }
}

export default AgreementMgmtForm;
