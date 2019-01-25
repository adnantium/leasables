
import React from "react";

function ts_to_str(epoch_secs_bignumber) {
    let epoch_ms = epoch_secs_bignumber.toNumber() * 1000;
    return new Date(epoch_ms).toLocaleString();
}

class TimeTravelCard extends React.Component {
    constructor(props) {
      super(props);

      this.handleTimeTravel = this.handleTimeTravel.bind(this);

      this.state = {
        time_machine: this.props.time_machine,
        time_machine_owner: this.props.time_machine_owner,
        virtual_time: this.props.virtual_time,
        account: this.props.account,
      }
    }


    handleTimeTravel = async (event) => {
        this.setState({action_error: null})
    
        const { time_machine, time_machine_owner, account, virtual_time } = this.state;
    
        let hours = event.target.attributes.hours.value;
    
        if (time_machine_owner !== account) {
            this.setState({
                action_error: "Only time machine owner (" + time_machine_owner + ") can mess with the time!",
            })
            return;
        }
        try {
            var tx = await time_machine.forwardHours(hours, {from: account});
        } catch (error) {
            console.log(error);
            this.setState({
                // action_error: format_error_message(error.message),
                action_error: error.message,
            })
            return;
        }
        var new_time_secs = await this.state.time_machine.time_now.call();
        this.setState({
            virtual_time: ts_to_str(new_time_secs),
        })
    }

    render() {
  
        return(
        <div className="card">
            <div className="card-body">
              <h5 className="card-title">{this.state.virtual_time}</h5>
              <h6 className="card-subtitle mb-2 text-muted">Time Travel Machine</h6>
              <button onClick={this.handleTimeTravel} hours="-168" className="badge badge-light">&lt; 1Wk</button>
              <button onClick={this.handleTimeTravel} hours="-48" className="badge badge-light">&lt; 2D</button>
              <button onClick={this.handleTimeTravel} hours="-24" className="badge badge-light">&lt; 1D</button>
              <button onClick={this.handleTimeTravel} hours="-6" className="badge badge-light">&lt; 6h</button>
              <button onClick={this.handleTimeTravel} hours="-1" className="badge badge-light">&lt; 1h</button>
              <button onClick={this.handleTimeTravel} hours="1" className="badge badge-light">&gt; 1h</button>
              <button onClick={this.handleTimeTravel} hours="6" className="badge badge-light">&gt; 6h</button>
              <button onClick={this.handleTimeTravel} hours="24" className="badge badge-light">&gt; 1D</button>
              <button onClick={this.handleTimeTravel} hours="48" className="badge badge-light">&gt; 2D</button>
              <button onClick={this.handleTimeTravel} hours="168" className="badge badge-light">&gt; 1Wk</button>
              <p><small>
                A hack for dev, testing and demoing. Each lease agreement gets its "time now" from the time machine (Not the real time on the chain). 
                We can use this to control the flow of time and show a lease agreement in action thru its entire lifecycle.
                </small></p>
                {this.state.action_error}
            </div>
        </div>
        );
    }
  }

  export default TimeTravelCard;
