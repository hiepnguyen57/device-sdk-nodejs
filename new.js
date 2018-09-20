

// async function set_volume () {
// 	var control = await exec(`amixer -D bluealsa scontrols | grep A2DP`)
// 	var rl = require('readline').createInterface({input: control.stdout})
// 	rl.on('line', async function(line) {
//     	var name = line.slice(20, line.length-2)
//     	console.log('name: ' + name);
//    		exec(`amixer -D bluealsa sset ${name} 50%`)

// 	});
// }

//set_volume()
var device_info = require('./test').device_info
//var bluetooth_init = require('./test').bluetooth_init
var bluetooth = require('./test').bluetooth
const exec = require("child_process").exec


async function update() {
	console.log('address: ' + device_info.address);
	console.log('objPath: ' + device_info.objPath);
	if(device_info.objPath != '') {
		const device = await bluetooth.getDevice(device_info.objPath)
		var DeviceName = await device.Name() + ' - A2DP'
		console.log('DeviceName: ' + DeviceName);
		//exec(`amixer -D bluealsa sset '${DeviceName}' 65%`)

	}
}
setInterval(update, 2000);
