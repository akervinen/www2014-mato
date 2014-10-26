/*global performance */

function Mato(ctx) {
	'use strict';

	// Save this for inner functions
	var self = this;

	//-- Engine variables
	// Debug mode, adds some textual info and more keys
	var debug = true,
		debugText = [];

	// Time stuff
	var currentTime = 0,
		lastTime = performance.now();

	var paused = false;

	// Cell stuff
	this.cellSize = 16; // pixels
	this.width = ctx.canvas.width/this.cellSize; // cells
	this.height = ctx.canvas.height/this.cellSize; // cells

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

	//-- Gameplay variables

	this.mato = {
		direction: 'right',
		// Queue of moves, most recent being last
		moveQueue: [],
		// Mato's position, measured in cells
		head: { x: 8, y: 8 },
		tail: { x: 4, y: 8 },
		// All points where Mato has turned
		// First index is turn nearest to the head (most recent turn)
		turns: [],
		// How many cells per second Mato moves
		speed: 16,
		// How much Mato has eaten (and how long it is)
		eaten: 4,

		setDirection: function setDirection(dir) {
			if (self.paused) { return; }

			var lastDir = this.moveQueue[this.moveQueue.length - 1] || this.direction;
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

				return {
					x: x,
					y: y
				};
			}

			return {
				x: this.tail.x + directions[nextMove].x,
				y: this.tail.y + directions[nextMove].y
			};
		},
		move: function move() {
			// Add current position to turn list if we're going to turn
			if (this.moveQueue.length > 0) {
				this.turns.unshift({
					x: this.head.x,
					y: this.head.y
				});
			}

			this.head = this.getNextHeadPos();

			// If we've eaten, don't shorten the tail
			if (!this.longer) {
				this.tail = this.getNextTailPos();
			} else {
				this.longer = false;
			}

			if (this.turns.length > 0) {
				var turn = this.turns[this.turns.length - 1];
				// Remove the last turn if the tail has reached it
				if (this.tail.x === turn.x && this.tail.y === turn.y) {
					this.lastTurn = this.turns.pop();
				}
			}

			if (this.moveQueue.length > 0) {
				this.direction = this.moveQueue.shift();
			}
		},
		eat: function eat() {
			this.longer = true;
		}
	};

	//-- Gameplay functions
	this.pause = function pause() {
		paused = !paused;
	};

	// Key bindings
	var moveKeys = {
		// arrows
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		// wasd
		87: 'up',
		65: 'left',
		83: 'down',
		68: 'right'
	};

	var otherKeys = {
		// space
		32: this.pause
	};

	var debugKeys = {
		// e
		69: function() { self.mato.eat(); }
	};

	//-- Window events
	window.onkeydown = function onkeydown(e) {
		var dir = moveKeys[e.keyCode];
		if (dir) {
			if (paused) {
				self.pause();
			}
			self.mato.setDirection(dir);
			e.preventDefault();
			return;
		}
		if (otherKeys[e.keyCode]) {
			otherKeys[e.keyCode]();
			e.preventDefault();
			return;
		}
		if (debug && debugKeys[e.keyCode]) {
			debugKeys[e.keyCode]();
			e.preventDefault();
		}
	};

	//-- Updating and drawing
	var lastMove = 0;
	var update = function update(delta) {
		// Update debug text
		if (debug) {
			debugText = [
				'Frametime: ' + Math.round(delta * 1000 * 100)/100 + ' ms',
				'Length: ' + self.mato.eaten,
				'Position: ' + self.mato.head.x + ', ' + self.mato.head.y,
				'Direction: ' + self.mato.direction,
				'Window: ' + window.innerWidth + 'x' + window.innerHeight
			];
		}

		// When entering new cell, change direction if needed
		lastMove += delta * 1000;
		if (lastMove > (1000/self.mato.speed)) {
			self.mato.move();
			lastMove = 0;
		}
	};

	var lerp = function lerp(start, end, amount) {
		return {
			x: start.x + (end.x - start.x) * amount,
			y: start.y + (end.y - start.y) * amount
		};
	};

	var pauseText = [
		'Press Space or move to start',
		'',
		'WASD or Arrows to move',
		'Space to pause'
	];

	var lerpAmount = 0,
		// These are for keeping track of when head/tail have changed
		// and updated to current values after that
		lastCurrHead = this.mato.head,
		lastCurrTail = this.mato.tail,
		// These should never be equal to current values after this,
		// since they're used for animating Mato
		lastHead = this.mato.head,
		lastTail = this.mato.tail;

	var draw = function draw(delta) {
		ctx.save();

		ctx.clearRect(0, 0, 800, 640);

		var textY;
		// Debug text
		if (debug && debugText.length > 0) {
			textY = 24;
			ctx.font = '12pt sans-serif';
			debugText.forEach(function(t) {
				ctx.fillText(t, 10, textY);
				textY += 16;
			});
		}
		// Help text if we're paused
		if (paused) {
			textY = 300;
			ctx.font = '16pt sans-serif';
			pauseText.forEach(function(t) {
				ctx.fillText(t, 400, textY);
				textY += 20;
			});
		}

		// TODO: Separate function?
		// draw Mato
		var m = self.mato;

		ctx.fillStyle = 'black';
		ctx.strokeStyle = 'black';
		ctx.lineWidth = self.cellSize;

		if (m.head !== lastCurrHead) {
			lerpAmount = 0;
			lastTail = lastCurrTail;
			lastHead = lastCurrHead;
			lastCurrTail = m.tail;
			lastCurrHead = m.head;
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

		head = lerp(lastHeadPos, head, lerpAmount);
		tail = lerp(lastTailPos, tail, lerpAmount);

		ctx.beginPath();
		ctx.moveTo(head.x, head.y);
		m.turns.forEach(function(t) {
			turn = getCellPos(t.x, t.y);
			ctx.lineTo(turn.x, turn.y);
		});
		// Without this, the tail animates wonky since the last turn was already removed from the list
		// So we keep the turn until our past-tail has reached it and draw it manually
		if (m.lastTurn) {
			if (m.lastTurn.x === lastTail.x && m.lastTurn.y === lastTail.y) {
				m.lastTurn = undefined;
			} else {
				turn = getCellPos(m.lastTurn.x, m.lastTurn.y);
				ctx.lineTo(turn.x, turn.y);
			}
		}
		ctx.lineTo(tail.x, tail.y);
		ctx.stroke();

		ctx.restore();
	};

	var tick = function tick() {
		// TODO: Polyfill this?
		window.requestAnimationFrame(tick, ctx.canvas);

		// Update time stuff
		currentTime = performance.now();
		var delta = (currentTime - lastTime)/1000;

		if (!paused) {
			update(delta);
		}

		draw(delta);

		lastTime = currentTime;
	};

	this.start = function start(startPaused) {
		paused = startPaused;

		// If we start paused, draw one frame so it looks better
		if (paused) {
			update(0);
			draw(0);
		}

		tick();
	};
}