function Mato(ctx) {
	"use strict";

	// Save this for inner functions
	var self = this;

	//-- Engine variables
	// Time stuff
	var currentTime = 0,
		lastTime = (new Date()).getTime();

	// Canvas context
	this.context = ctx;

	// Cell stuff
	this.cellSize = 16; // pixels
	this.width = 800/16; // cells
	this.height = 640/16; // cells

	// Get the x,y of cell's center
	var getCellPos = function getCellPos(x, y) {
		return {
			x: x * self.cellSize + self.cellSize/2,
			y: y * self.cellSize + self.cellSize/2
		};
	};

	var directions = {
		up: { x: 0, y: 1 },
		down: { x: 0, y: -1 },
		left: { x: -1, y: 0 },
		right: { x: 1, y: 0 }
	};

	// Opposite directions to make checking neater later
	var opposites = {
		up: 'down',
		down: 'up',
		left: 'right',
		right: 'left'
	};

	var keys = {
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down'
	};

	//-- Gameplay variables

	this.mato = {
		direction: 'right',
		// Mato's position, measured in cells
		head: { x: 8, y: 8 },
		tail: { x: 4, y: 8 },
		// All points where Mato has turned
		turns: [],
		// How much Mato has eaten (and how long it is)
		eaten: 4
	};

	// Updating and drawing
	var update = function update(delta) {
		// Update debug text
		self.debugText = [
			'Frametime: ' + delta,
			'Length: ' + self.mato.eaten,
			'Position: ' + self.mato.head.x + ', ' + self.mato.head.y
		];


	};

	var draw = function draw(delta) {
		ctx.save();
		ctx.clearRect(0, 0, 800, 160);

		// Debug text
		var textY = 24;
		ctx.font = '12pt sans-serif';
		self.debugText.forEach(function(t) {
			ctx.fillText(t, 10, textY);
			textY += 16;
		});

		// TODO: Separate function?
		// draw Mato
		var m = self.mato;

		ctx.fillStyle = 'black';
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 16;

		var head = getCellPos(m.head.x, m.head.y);
		var tail = getCellPos(m.tail.x, m.tail.y);
		var turn;

		ctx.beginPath();
		ctx.moveTo(head.x, head.y);
		m.turns.forEach(function(t) {
			turn = getCellPos(t.x, t.y);
			ctx.lineTo(turn.x, turn.y);
		});
		ctx.lineTo(tail.x, tail.y);
		ctx.stroke();

		ctx.restore();
	};

	this.loop = function loop() {
		// TODO: Polyfill this?
		window.requestAnimationFrame(loop);

		// Update time stuff
		currentTime = (new Date()).getTime();
		var delta = (currentTime - lastTime)/1000;

		update(delta);
		draw(delta);

		lastTime = currentTime;
	};

	// Feed Mato
	this.eat = function eat() {
		self.mato.eaten++;
	};
}