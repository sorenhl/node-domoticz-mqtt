#!/usr/bin/nodejs
// This Node creates a simple function to publish switch changes to Domoticz.
var     mqtt            = require('mqtt'),
	events 		= require('events'),
	util   		= require('util');
	STATUS		= 'demo-app/connected',
        TRACE           = false,
	HOST		= '127.0.0.1',
        IDX             = [ ];    		// Device IDX you want to watch.   


// Get Options
var domoticz = function(options) {
	events.EventEmitter.call(this); 	// inherit from EventEmitter
    	TRACE 		= options.log;
	IDX 		= options.idx;
	STATUS 		= options.status;
	HOST 		= options.host;
	this.domoMQTT	= this.connect(options.host);
}

util.inherits(domoticz, events.EventEmitter);

// Connnect
domoticz.prototype.connect = function(host) {
        var self = this;
        var domoMQTT        = mqtt.connect('mqtt://' + host);
	// Incoming MQTT Message
	domoMQTT.on('message', function (topic, message) {
        	var jsonData = JSON.parse(message)
	        if (TRACE) { console.log('IN: ' + message.toString()) };
	        if (IDX.contains(jsonData.idx)) {
	                self.mqttData(jsonData);
        	}
	});

	// OnConnect
	domoMQTT.on('connect', function () {
	        domoMQTT.publish(STATUS, 'true');
        	domoMQTT.subscribe('domoticz/out');
		if (TRACE) { console.log("Domoticz MQTT: connected") };
	});
 
	// OnExit
	process.on( "SIGINT", function() {
	        domoMQTT.publish(STATUS, 'false');
		domoMQTT.end();
	        setTimeout(function() {
                	process.exit()
        	}, 500);
	} );

	return domoMQTT;
}

// Callback on matching Device IDX
domoticz.prototype.mqttData = function(data) {
	var self = this;
	self.data = data;
	self.emit('data', self.data);
	return self;
}

// Publish Switch Commands (0=Off/100=On/-1=Toggle)
domoticz.prototype.switch = function(id,lvl) {
	var self = this;
	if ((isNaN(id)) || (isNaN(lvl))) { return false };
        var cmd = "Set Level";
        if (lvl > 99) { cmd = "On" }
        else if (lvl === 0) { cmd = "Off" }
        else if (lvl < 0) { cmd = "Toggle" }
        var state = { 'command': 'switchlight', 'idx': id, 'switchcmd': cmd };
	if (cmd === 'Set Level') { state['level'] = lvl };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state).toString()) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Publish uDevice Commands
domoticz.prototype.device = function(id,nvalue,svalue) {
	var self = this;
	if ((isNaN(id)) || (isNaN(nvalue))) { return false };
        var state = { 'command': 'udevice', 'idx': id, 'nvalue': nvalue, 'svalue': svalue.toString() };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state))
	return true;
}

// Publish Scene Command
domoticz.prototype.scene = function(id,cmd) {
	var self = this;
	if (isNaN(id)) { return false };
	if (!cmd) { cmd = 'On' }
        var state = { 'command': 'switchscene', 'idx': id, 'switchcmd': cmd };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Publish User Variable
domoticz.prototype.uservar = function(id,val) {
	var self = this;
	if (isNaN(id)) { return false };
	if (!val) { return false };
        var state = { 'command': 'setuservariable', 'idx': id, 'value': val.toString() };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Publish Domoticz Notification
domoticz.prototype.notify = function(subject,body,priority,sound) {
	var self = this;
	if ((!subject) || (!body)) { return false };
	if(isNaN(priority)) { priority = 0 };
	if(!sound) { sound = "default" };
        var state = { 'command': 'sendnotification', 'subject': subject.toString(), 'body': body.toString(), 'priority': priority, 'sound': sound.toString() };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Publish Device Request
domoticz.prototype.request = function(id) {
	var self = this;
	if (isNaN(id)) { return false };
        var state = { 'command': 'getdeviceinfo', 'idx': id };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Publish Domoticz Log Entry
domoticz.prototype.log = function(msg) {
	var self = this;
	if (!msg) { return false };
        var state = { 'command': 'addlogmessage', 'message': msg.toString };
        if(TRACE) { console.log('domoticz/in: ' + JSON.stringify(state)) }
        self.domoMQTT.publish('domoticz/in', JSON.stringify(state));
	return true;
}

// Checks if Array contains
Array.prototype.contains = function(element){
        return this.indexOf(element) > -1;
};
 
exports.domoticz = domoticz;

