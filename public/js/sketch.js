// written by Andrés Villa Torres + Florian Bruggisser + Luke Franzke
// tracking IR Technology by Florian Bruggisser and Luke Franzke
// Interaction Design Group ZHdK
// updated 26 oct 2020 

// references
// reference https://github.com/bohnacker/p5js-screenPosition
// https://github.com/processing/p5.js/issues/1553 -> solving the 2d Projection of 3d points
// https://www.keene.edu/campus/maps/tool/ -> drawing earth maps and converting them into latitude longitude


let socket = io() 

let canvas 
let trackedDevices = []
let myFont

let touchX =0, touchY = 0

/*  full screen */
let elem = document.documentElement
function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen()
  } else if (elem.mozRequestFullScreen) { /* Firefox */
    elem.mozRequestFullScreen()
  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
    elem.webkitRequestFullscreen()
  } else if (elem.msRequestFullscreen) { /* IE/Edge */
    elem.msRequestFullscreen()
  }
}


/* Close fullscreen */
function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen()
  } else if (document.mozCancelFullScreen) { /* Firefox */
    document.mozCancelFullScreen()
  } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
    document.webkitExitFullscreen()
  } else if (document.msExitFullscreen) { /* IE/Edge */
    document.msExitFullscreen()
  }
} 


function init(){

}
let touchCount = 0
let ongoingTouches = []
let isTouch = false
function handleTouch(evt){
	isTouch=true
	touchCount++
	let touches = evt.changedTouches;
	// console.log("touch started at : " + evt.touches[0].clientX + " , " + evt.touches[0].clientY)
	touchX = evt.touches[0].clientX
	touchY = evt.touches[0].clientY
}

function handleEnd(evt) {
	isTouch=false
	// console.log("touch ended at : " + evt.changedTouches[0].pageX + " , " + evt.changedTouches[0].pageY )
	touchX = evt.changedTouches[0].pageX
	touchY = evt.changedTouches[0].pageY
}

function handleMove(evt) {
	 // console.log("touch moved at : " + evt.changedTouches[0].pageX + " , " + evt.changedTouches[0].pageY )
	touchX = evt.changedTouches[0].pageX
	touchY = evt.changedTouches[0].pageY
}


function ongoingTouchIndexById(idToFind) {
  for (var i = 0; i < ongoingTouches.length; i++) {
    var id = ongoingTouches[i].identifier
    
    if (id == idToFind) {
      return i
    }
  }
  return -1    // not found
}

function resize(){
	init()
}


function preload() {
	socket.on('connected',function(data){
		// do something in case another node is connected
		// console.log('new client connected id:' + data.id) 
	}) 
	
	myFont = loadFont('assets/Futura-Lig.otf')
	// openFullscreen()
	init()
}


function setup() {
	canvas = createCanvas(windowWidth, windowHeight)
	noStroke()
	textFont(myFont)
	// Attaching  Touch Listeners to body and P5 JS Canvas 
	document.body.addEventListener('touchstart',handleTouch,false)
	document.getElementById('defaultCanvas0').addEventListener('touchstart',handleTouch,false)
	document.getElementById('defaultCanvas0').addEventListener('touchend',handleEnd,false)
	document.getElementById('defaultCanvas0').addEventListener('touchmove',handleMove,false)
	addScreenPositionFunction(this)
	listenMessages()
}

function draw() {
  	background(0)
	show2d()
}


function windowResized() {
  	resizeCanvas(windowWidth, windowHeight,true)
  	resize()
}

// LISTEN FOR NEW TRACKED DEVICES AND UPDATES
function listenMessages(){
	socket.on('addDevice', function(data){
		let thisDevice = new TrackedDevice()
		thisDevice.uniqueId = data.id
		thisDevice.x = data.x * windowWidth
		thisDevice.y = data.y * windowHeight
		thisDevice.rotation = data.rot
		trackedDevices.push(thisDevice)
	}) 
	socket.on('updateDevice', function(data){
		let id = data.id 
		trackedDevices.forEach( element => {
			if(element.uniqueId === id){
				element.x = data.x * windowWidth
				element.y = data.y * windowHeight
				element.rotation = data.rot
			}
		})
	})
	socket.on('removeDevice', function(data){
		let id = data.id 
		trackedDevices.forEach( function(element,index) {
			if(element.uniqueId == id ){
				trackedDevices.splice(index,1)
			}
		})
	}) 
}

function show2d() {
	if(trackedDevices.length>0){

		trackedDevices.forEach( element => {
			element.calculateRange()
			// uncomment this if the tableControl object is available
			// tableControl.interact(element.smoothPosition.x,element.smoothPosition.y,element.smoothRotation,element.uniqueId)
		})

		// you can rename this trackedDevices - call them tokens for instance
		trackedDevices.forEach(element =>{
			if(element.inRange){
				element.show()
				// if(elemnt.uniqueId == 52){ /* example of a loop accessing an specific uniqueId  to do something specific */}
				// access the identifier : element.identifier // changes everytime you add or create a new object on screen
				// access the uniqueId : element.uniqueId // stays the same always for each tracked object
				// text(element.uniqueId, element.smoothPosition.x + 100, element.smoothPosition.y + 100)
			}
		})
	}
}


// *** CLASS FOR THE TRACKED DEVICE *** //
class TrackedDevice{
	constructor(){
		this.uniqueId = -1
		this.identifier = -1
		this.x = 0.0
		this.y = 0.0
		this.rotation =0.0
		this.intensity = 0.0
		this.dead = false
		this.smoothPosition  = createVector(0.0,0.0)
		this.smoothRotation = 0.0
		this.inRange = false
		this.angle = 0
		this.sizeL = 180
		this.thisLabel = new Label()
		this.oldPos = createVector(0,0)
		
	}
	update(){
		let currPos = createVector ( this.x,this.y )
		let delta = currPos.dist(this.oldPos)
		let alpha = 0.1
		this.smoothRotation = this.easeFloatCircular((360 - this.rotation), this.smoothRotation, 0.85)
		this.smoothPosition.x = this.easeFloatCircular(this.x, this.smoothPosition.x, alpha)
   		this.smoothPosition.y = this.easeFloatCircular(this.y, this.smoothPosition.y, alpha)
		this.angle = Math.atan2(this.smoothPosition.y - windowHeight/2, this.smoothPosition.x - windowWidth/2) * 180 / Math.PI
		this.oldPos.x = this.smoothPosition.x
		this.oldPos.y = this.smoothPosition.y
	}
	show(){
		let radius = 45
		let lSize = map(this.smoothRotation,0,360,10,75)
		let rotX = (0 + radius) * Math.cos(radians(this.smoothRotation))
		let rotY = (0+ radius) * Math.sin(radians(this.smoothRotation))

		fill(255,255,100, 25+map(this.smoothRotation,0,360,0,150))
		noStroke()
		ellipse(this.smoothPosition.x,this.smoothPosition.y,radius*2 + lSize,radius*2 + lSize)
		fill(255,255,100)
		stroke(0)
		strokeWeight(10)
		circle(this.smoothPosition.x ,this.smoothPosition.y , radius*2)
		stroke(0)
		strokeWeight(10)
		line(this.smoothPosition.x , this.smoothPosition.y  , this.smoothPosition.x + rotX, this.smoothPosition.y + rotY)

		// DISPLAY DEGREES OF ROTATION
		push()
			translate(this.smoothPosition.x+rotX, this.smoothPosition.y+rotY)
			rotate(radians(this.smoothRotation))
			fill(255,255,100)
			textSize(30)
			// text(Math.round(this.smoothRotation,3) + " , " + Math.round(this.smoothPosition.x) + " , " + Math.round(this.smoothPosition.y), 30,10)
			text(Math.round(this.smoothRotation,3), 30,10)
		pop()

		// DISPLAY LABEL
		this.thisLabel.update(this.smoothPosition.x,this.smoothPosition.y,this.sizeL, this.smoothRotation + 120)		
		noStroke()
	}
	calculateRange(){
		this.update()
		
		// CONDITION DEVICE OUT OF DRAWING RANGE
		if(this.smoothPosition.x > windowWidth || this.smoothPosition.x < 0 || this.smoothPosition.y>windowHeight || this.smoothPosition.y<0){
			let angle = atan2(this.smoothPosition.y - height / 2, this.smoothPosition.x  - width / 2)
			let newX = this.smoothPosition.x > windowWidth ? windowWidth : this.smoothPosition.x
			let newY = this.smoothPosition.y > windowHeight ? windowHeight : this.smoothPosition.y
			newX = newX < 0 ? 0 : newX
			newY = newY < 0 ? 0 : newY
			push()
			let sizeT = 30
			translate(newX,newY)
			rotate(angle)
			let thisTriangle = new Triangle(0,0,sizeT)
			thisTriangle.show()
			pop()
			this.inRange = false
		}else{
			this.inRange = true
		}
	}
	easeFloat (target, value, alpha = 0.1) {
    	const d = target - value
    	return value + (d * alpha)
  	}
	easeFloat2 (target, value, alpha ){
	value = value * alpha + target *(1-alpha)
	return value
	}
  	easeFloatCircular (target, value, maxValue, alpha = 0.1) {
    	let delta = target - value
    	const altDelta = maxValue - Math.abs(delta)

    	if (Math.abs(altDelta) < Math.abs(delta)) {
      		delta = altDelta * (delta < 0 ? 1 : -1)
    	}
		return value + (delta * alpha)
	}
	radians (degrees) {
		let radians = degrees * (Math.PI / 180)
		return radians
	}
}
// CLASS TO DRAW THE TRIANGLE
class Triangle{
	constructor(x, y, size){
		this.x = x
		this.y = y
		this.size = size
	}
	update(){

	}
	show(){
		noStroke()
		fill(255,255,100)
		beginShape()
		vertex(this.x,this.y)
		vertex(this.x-this.size,this.y+this.size)
		vertex(this.x-this.size, this.y-this.size)
		endShape(CLOSE)
		textSize(16)
		text('OBJECT OUT OF RANGE', this.x-200,this.y+4)
	}
}

// CLASS TO DRAW THE LABEL
class Label{
	constructor(x,y,size, rotation){
		this.x =0
		this.y = 0
		this.size = 0
		this.rotation = 0
		this.count = 0
		this.oldRotation = 0
		this.oldY = 0
		this.labelOff=false
		this.opacity = 0
	}
	update(x,y,size,rotation){

		this.x = x
		this.y = y
		this.size = size
		this.rotation = Math.round(rotation)

		if(this.rotation!=this.oldRotation){
			this.count=30
			this.labelOff = false

		}else{
			if(this.count>0){
				this.count --
			}else{
				this.labelOff = true
			}
		}
		this.opacity = map(this.count,0,30,0,255)
		if(!this.labelOff){
			this.show()
		}
		
		this.oldRotation = this.rotation

	}

	show(){
		// mapping the rotation of the tracked device to the position of the text array
		// if rotation 120 
		let txtContent =[
			"I'M A PROTOTYPE FOR TANGIBLE INTERACTION AND DATA VISUALIZATION",
			"MOVE ME AROUND TO EXPLORE MY AFFORDANCES!",
			"STUDENTS FROM INTERACTION DESIGN USE ME TO EXPLORE THEIR CONCEPTS",
			"DESIGN ... TECHNOLOGY ... THINKING ... CONCEIVING ...  DOING ...  ",
			"PROTOTYPING"
		]
		let peak = 10
		let offX=120
		let offY=0
		push()
		strokeWeight(5)
		stroke(255,255,100,this.opacity)
		noFill()
		translate(this.x,this.y)
		rotate(radians(this.rotation))
		beginShape()
		vertex(offX,offY)
		vertex(offX+peak, offY-peak)
		vertex(offX+peak,offY-this.size/3)
		vertex(offX+peak+this.size, offY-this.size/3)
		vertex(offX+peak+this.size,offY+this.size/3)
		vertex(offX+peak, offY+this.size/3)
		vertex(offX+peak,offY+peak)
		endShape(CLOSE)
		textSize(16)
		fill(255,255,100)
		textAlign(CENTER,CENTER)
		noStroke()
		text(txtContent[int(map(this.rotation%360,1,360,0,txtContent.length))],offX +30 , offY - this.size/4, this.size-25, this.size/2 )
		pop()

	}
}





