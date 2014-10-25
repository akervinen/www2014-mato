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
		moveQueue: [],
		// Mato's position, measured in cells
		head: { x: 8, y: 8 },
		tail: { x: 4, y: 8 },
		// All points where Mato has turned
		turns: [],
		// How many cells per second Mato moves
		speed: 12,
		// How much Mato has eaten (and how long it is)
		eaten: 4,

		setDirection: function setDirection(dir) {
			var lastDir = this.moveQueue[0] || this.direction;
			if (dir !== lastDir && dir !== opposites[lastDir]) {
				this.moveQueue.push(dir);
			}
		},
		getNextHeadPos: function getNextHeadPos() {
			var nextMove = this.moveQueue[0] || this.direction;
			return {
				x: this.head.x + directions[nextMove].x,
				y: this.head.y + directions[nextMove].y
			};
		},
		getNextTailPos: function getNextTailPos() {
			var nextMove = this.moveQueue[0] || this.direction;
			if (this.turns.length > 0) {
				var x = this.tail.x,
					y = this.tail.y,
					turn = this.turns[this.turns.length - 1];

				if (x < turn.x) {
					x += 1;
				} else if (x > turn.x) {
					x -= 1;
				}

				if (y < turn.y) {
					y += 1;
				} else if (y > turn.y) {
					y -= 1;
				}

				if (x === turn.x && y === turn.y) {
					this.turns.pop();
				}

				return {
					x: x,
					y: y
				};
			} else {
				return {
					x: this.tail.x + directions[nextMove].x,
					y: this.tail.y + directions[nextMove].y
				};
			}
		},
		move: function move() {
			if (this.moveQueue.length > 0) {
				this.turns.unshift({
					x: this.head.x,
					y: this.head.y
				});
			}

			this.head = this.getNextHeadPos();
			this.tail = this.getNextTailPos();

			if (this.moveQueue.length > 0) {
				this.direction = this.moveQueue.shift();
			}
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
		lastHead = this.mato.head,
		lastTail = this.mato.tail;
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

		if (m.head !== lastHead) {
			lerpAmount = 0;
			lastHead = m.head;
			lastTail = m.tail;
		} else {
			// Animate movement using simple lerp
			lerpAmount += delta * m.speed;
			if (lerpAmount > 1) {
				lerpAmount = 1;
			}
		}

		var head = getCellPos(m.head.x, m.head.y),
			tail = getCellPos(m.tail.x, m.tail.y);
		var lastHeadPos = getCellPos(lastHead.x, lastHead.y),
			lastTailPos = getCellPos(lastTail.x, lastTail.y);
		var turn;

		//head = lerp(lastHeadPos, head, lerpAmount);
		//tail = lerp(lastTailPos, tail, lerpAmount);

		//lastHead = m.head;
		//lastTail = m.tail;

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