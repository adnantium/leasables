import React, { Component } from "react";

import "react-tabs/style/react-tabs.css";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const helpers = require('./helpers.js');
const weiToEther = helpers.weiToEther;
const ts_to_str = helpers.ts_to_str;
const format_error_message = helpers.format_error_message;
const update_known_list = helpers.update_known_list;
const remove_from_known_list = helpers.remove_from_known_list;


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
        // this.state.time_machine.address,
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
      "";

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
              <input id="car_address" name="car_address" 
                type="text" ref={this.car_address_input} placeholder="Lookup a car..." 
                className="form-control" 
              />
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

export default CarMgmtForm;
