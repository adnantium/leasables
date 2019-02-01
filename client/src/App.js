import React, { Component } from "react";

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

import LeasableCarContract from "./contracts/LeasableCar.json";
import LeaseAgreementContract from "./contracts/LeaseAgreement.json";
import AgreementExecutorContract from "./contracts/AgreementExecutor.json";
import TimeMachineContract from "./contracts/TimeMachine.json";
import getWeb3 from "./utils/getWeb3";

import ConnectionStatusCard from "./ConnectionStatus";
import AccountsSwitcherCard from "./AccountsSwitcher";
import TimeTravelCard from "./TimeTravelCard.js";
import CarMgmtForm from "./CarMgmtForm.js";
import AgreementMgmtForm from "./AgreementMgmtForm.js";

var truffle_contract = require("truffle-contract");

const helpers = require('./helpers.js');
const weiToEther = helpers.weiToEther;
const ts_to_str = helpers.ts_to_str;

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

      var agreement_executor_spec = truffle_contract(AgreementExecutorContract);
      agreement_executor_spec.setProvider(web3.currentProvider);

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
        agreement_executor_spec,
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
            <AgreementMgmtForm
              car_contract_spec={this.state.car_contract_spec} 
              lease_agreement_spec={this.state.lease_agreement_spec} 
              agreement_executor_spec={this.state.agreement_executor_spec}
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
