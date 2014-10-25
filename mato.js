function Mato(ctx) {
	"use strict";

	//-- Engine variables
	// time stuff
	var currentTime = 0,
		lastTime = (new Date()).getTime();

	// canvas context
	this.context = ctx;

	//-- Gameplay variables

	// Snake's position, measured in cells
	this.x = 0;
	this.y = 0;

	// how much the snake has eaten (and how long it is)
	this.eaten = 0;

	// save this for loops
	var self = this;

	// updating and drawing
	var update = function draw(delta) {
		self.texthing = 'Frametime: ' + delta;
	};

	var draw = function update(delta) {
		ctx.save();
		ctx.clearRect(0, 0, 800, 160);

		ctx.font = '12pt sans-serif';
		ctx.fillText(self.texthing, 10, 24);

		ctx.restore();
	};

	this.loop = function loop() {
		// TODO: Polyfill this?
		window.requestAnimationFrame(loop);

		// update time stuff
		currentTime = (new Date()).getTime();
		var delta = (currentTime - lastTime)/1000;

		update(delta);
		draw(delta);

		lastTime = currentTime;
	};

	// Feed the snake
	this.eat = function eat() {
		this.eaten++;
	};
}