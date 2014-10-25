function Mato(ctx) {
	"use strict";

	// engine stuff
	var currentTime = 0,
		lastTime = (new Date()).getTime();

	// Canvas context
	this.context = ctx;

	// How much the snake has eaten (and how long it is)
	this.eaten = 0;

	// save this for loops
	var that = this;

	// updating and drawing
	var update = function(delta) {
		that.texthing = 'Frametime: ' + delta;
	};

	var draw = function(delta) {
		ctx.save();
		ctx.clearRect(0, 0, 800, 160);

		ctx.font = '12pt sans-serif';
		ctx.fillText(that.texthing, 10, 24);

		ctx.restore();
	};

	var loop = function() {
		// TODO: Polyfill this?
		window.requestAnimationFrame(loop);

		// update time stuff
		currentTime = (new Date()).getTime();
		var delta = (currentTime - lastTime)/1000;

		update(delta);
		draw(delta);

		lastTime = currentTime;
	};
	this.loop = loop;

	// Feed the snake
	this.eat = function() {
		this.eaten++;
	};
}