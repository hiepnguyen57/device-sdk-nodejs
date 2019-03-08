var WiFiControl = require('wifi-control')
var Transmit =  require('./ioctl').Transmit
// Initialize wifi-control package with verbose output
WiFiControl.init({
    debug: false,
    iface: 'wlan0',
});

var exec = require('child_process').exec
var path = require('path')

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var password
var ssid

function WifiSetup() {
    app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname+'/conf/index.html'))
    })

    app.get('/wifi_list.json', function (req, res) {
            var json_wifi_list = "{\"wifi_list\":["
        
            WiFiControl.scanForWiFi( function(err, response) {
            if (err) console.log(err);

            console.log('number of wifi: '+ response.networks.length);
            for (var i = response.networks.length - 1; i >= 0; i--) {
                json_wifi_list += "{\"SSID\": \"" + response.networks[i].ssid + "\"}"
                if ( i > 0) {
                    json_wifi_list += ","
                }
            }
            console.log(json_wifi_list)
        });
        json_wifi_list += "]}"
        res.send(json_wifi_list);
    })


    app.post('/setssid', function(req, res) {
        console.log('setssid')
        res.send('HTTP/1.1 200 OK')
    })

    io.on('connection', function(socket) {
        socket.on('ssid', function(msg) {
            ssid = msg
        })
    })

    io.on('connection', function(socket) {
        socket.on('password', function(msg) {
            password = msg
        })
    })

    io.on('connection', function(socket) {
        socket.on('setting', function(msg) {
            //create effect on led-ring
            Transmit(0x00, 0x34, 0x38)
            var _ap = {
                ssid: ssid,
                password: password
            };

            console.log('Connecting to: ' + ssid + ' with password: ' + password)

            var results = WiFiControl.connectToAP(_ap, function(err, response) {
                if(err) console.log(err)
                console.log(response)
                io.emit('error', response.msg)
                console.log(response.msg)
            })
        })
    })

    io.on('connection', function(socket) {
        socket.on('getIP', function(){
            exec(`hostname -i`, (err, stdout, stderr) => {
                console.log(stdout);
                io.emit('ip', stdout)
            })
        })
    })

    exec(`nmcli con add con-name dg-ap2 ifname SoftAp0 type wifi ssid dg-ap2`,
            function(error, stdout, stderr) {
        console.log(stdout)
        console.log(error)

        exec(`nmcli con modify dg-ap2 ipv4.method shared connection.autoconnect no wifi.mode ap`,
                function(error, stdout, stderr) {
            console.log(stdout)
            console.log(error)
            exec(`nmcli con up dg-ap2`, function(error, stdout, stderr) {
                console.log(stdout)
                console.log(error)
                http.listen(3000, function() {
                    console.log('Example app listening on port 3000!')
                })
            })
        })
    })
}

module.exports.Setup = WifiSetup