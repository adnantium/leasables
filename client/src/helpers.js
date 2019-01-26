
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


exports.update_known_list = (list_name, address) => {
    // add the address to known_cars list if not there
    var list = JSON.parse(localStorage.getItem(list_name));
    list = list ? list : [];
    if (list.indexOf(address) === -1) {
      list.push(address);
    }
    localStorage.setItem(list_name, JSON.stringify(list));
}

exports.remove_from_known_list = (list_name, address) => {
  // add the address to known_cars list if not there
  var stored_list = JSON.parse(localStorage.getItem(list_name));
  if (stored_list) {
    var filtered_list = stored_list.filter(function(value, index, arr){
      return value !== address;
    });    
    localStorage.setItem(list_name, JSON.stringify(filtered_list));
  }
}
