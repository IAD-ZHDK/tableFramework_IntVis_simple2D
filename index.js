const osc = require("osc"),
    http = require("http"),
    WebSocket = require("ws"),
    socket = require('socket.io'),
    express = require("express")

// Create an Express server app
// and serve up a directory of static files.
const app = express()
const port = 8080
const server = app.listen(port,function(){
	console.log('app running open socket at port 8080 listening for OSC at port 8002')
})

app.use(express.static('public'))
const io = socket(server)


var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8002,
    metadata: true
})

// Listen for incoming OSC messages. -> "message"
udpPort.on("message", function (oscMsg, timeTag, info) {
	// console.log(oscMsg.address);
    trackingC = new TrackingClient(oscMsg,io.sockets)
})
 
// Open the socket.
udpPort.open()

io.on('connection',function(socket){
	var socketID = socket.id
	console.log('new client connected id: ' , socketID)
	// Emit Connected message to all the sockets
	io.sockets.emit('connected',{
		id : socketID
	});
	// 	//Upon disconnect
	socket.on('disconnect',function(){
		console.log('the id :' , socketID , 'has disconnected')
	})
})

// **** Class for Starting the Tracking Client object
// ***+ which is an instance for receiving specific address patterns
// **** and forward them to all the connected sockets via 'emit'
class TrackingClient{
	constructor(msg,sockets){		
		if(msg.address === '/tracker/add'){
    		this.onDeviceAdded(msg,sockets)
    		// console.log(msg);
    	}
    	if(msg.address === '/tracker/update'){
    		this.onDeviceUpdated(msg, sockets)
    	}
    	if(msg.address === '/tracker/remove'){
    		this.onDeviceRemoved(msg, sockets)
    	}
	}
	onDeviceAdded(msg,sockets){

		const uniqueId = msg.args[0].value
		const identifier = msg.args[1].value
		const x = msg.args[2].value
		const y = msg.args[3].value
		const rotation = msg.args[4].value
		const intensity = msg.args[5].value
		sockets.emit('addDevice',{
			id : uniqueId,
			identify: identifier,
			x: x,
			y: y,
			rot: rotation,
			intens: intensity
		})
	}
	onDeviceUpdated(msg, sockets){

		const uniqueId = msg.args[0].value
		const identifier = msg.args[1].value
		const x = msg.args[2].value
		const y = msg.args[3].value
		const rotation = msg.args[4].value
		const intensity = msg.args[5].value
		sockets.emit('updateDevice',{
			id : uniqueId,
			identify: identifier,
			x: x,
			y: y,
			rot: rotation,
			intens: intensity
		})
	}
	onDeviceRemoved(msg, sockets){

		const uniqueId = msg.args[0].value
		// console.log('device removed : '  + uniqueId)
		sockets.emit('removeDevice',{
			id : uniqueId
		})
	}

}
