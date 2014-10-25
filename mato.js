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
		up: { x: 0, y: -1 },
		down: { x: 0, y: 1 },
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
		lastDirection: 'right',
		// Mato's position, measured in cells
		head: { x: 8, y: 8 },
		tail: { x: 4, y: 8 },
		// All points where Mato has turned
		turns: [],
		// How many cells per second Mato moves
		speed: 4,
		// How much Mato has eaten (and how long it is)
		eaten: 4,

		setDirection: function setDirection(dir) {
			if (dir !== this.lastDirection && dir !== opposites[this.lastDirection]) {
				this.direction = dir;
			}
		},
		getNextHeadPos: function getNextHeadPos() {
			return {
				x: this.head.x + directions[this.direction].x,
				y: this.head.y + directions[this.direction].y
			};
		},
		getNextTailPos: function getNextTailPos() {
			return {
				x: this.tail.x + directions[this.direction].x,
				y: this.tail.y + directions[this.direction].y
			};
		},
		move: function move() {
			this.head = this.getNextHeadPos();
			this.tail = this.getNextTailPos();
			this.lastDirection = this.direction;
		}
	};

	//-- Gameplay functions

	//-- Window events
	window.onkeydown = function onkeydown(e) {
		var dir = keys[e.keyCode];
		if (dir) {
			self.mato.setDirection(dir);
			e.preventDefault();
		}
	};

	//-- Updating and drawing
	var lastMove = 0;
	var update = function update(delta, curTime) {
		// Update debug text
		self.debugText = [
			'Frametime: ' + delta,
			'Length: ' + self.mato.eaten,
			'Position: ' + self.mato.head.x + ', ' + self.mato.head.y,
			'Direction: ' + self.mato.direction
		];

		// When entering new cell, change direction if needed
		if ((curTime - lastMove) > (1000/self.mato.speed)) {
			self.mato.move();
			lastMove = curTime;
		}
	};

	var lerp = function lerp(start, end, amount) {
		return {
			x: start.x + (end.x - start.x) * amount,
			y: start.y + (end.y - start.y) * amount
		};
	};

	var lerpAmount = 0,
		lastPos;
	var draw = function draw(delta, curTime) {
		ctx.save();
		ctx.clearRect(0, 0, 800, 640);

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

		if (m.head !== lastPos) {
			lerpAmount = 0;
		} else {
			// Animate movement using simple lerp
			lerpAmount += delta * m.speed;
			if (lerpAmount > 1) {
				lerpAmount = 1;
			}
		}

		var head = getCellPos(m.head.x, m.head.y),
			tail = getCellPos(m.tail.x, m.tail.y);
		var nextHead = m.getNextHeadPos(),
			nextTail = m.getNextTailPos();
		nextHead = getCellPos(nextHead.x, nextHead.y);
		nextTail = getCellPos(nextTail.x, nextTail.y);
		var turn;

		lastPos = m.head;

		//head = lerp(head, nextHead, lerpAmount);
		//tail = lerp(tail, nextTail, lerpAmount);

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

		update(delta, currentTime);
		draw(delta, currentTime);

		lastTime = currentTime;
	};

	// Feed Mato
	this.eat = function eat() {
		self.mato.eaten++;
	};
}