
var web3 = require("web3");

exports.weiToEther = (weis) => {
    return web3.utils.fromWei(weis.toString());
}

exports.ts_to_str = (epoch_secs_bignumber) => {
    let epoch_ms = epoch_secs_bignumber.toNumber() * 1000;
    return new Date(epoch_ms).toLocaleString();
}

exports.agreementStateToStr = (state_num) => {
    const states = [ 
      "Draft", 
      "DriverSigned", 
      "Approved", 
      "InProgress", 
      "CarReturned", 
      "Finalized", 
      "Ended"];
    return states[state_num];
}

exports.format_error_message = (msg) => {
    const e = 'Error: Error:';
    return msg.indexOf(e) > 0 ? msg.slice(msg.lastIndexOf('Error')) : msg;
}
