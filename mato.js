/*global performance */

function MatoGame(ctx) {
	'use strict';

	// Save this for inner functions
	var game = this;

	//-- Engine variables
	// Debug mode, adds some textual info and more keys
	var debug = true,
		debugText = [];

	// Time stuff
	// TODO: Polyfill performance.now
	var currentTime = 0,
		lastTime = performance.now();

	var paused = false;

	// Cell stuff
	this.cellSize = 16; // pixels
	// Field size in cells (should probably make sure this is an integer)
	this.width = ctx.canvas.width/this.cellSize;
	this.height = ctx.canvas.height/this.cellSize;

	// Linear interpolation for animations
	var lerp = function lerp(start, end, amount) {
		return {
			x: start.x + (end.x - start.x) * amount,
			y: start.y + (end.y - start.y) * amount
		};
	};

	// Get the x,y of cell's center
	var getCellPos = function getCellPos(x, y) {
		return {
			x: x * game.cellSize + game.cellSize/2,
			y: y * game.cellSize + game.cellSize/2
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

	//-- Object for Mato
	var Mato = function(spd) {
		var direction = 'right';

		var moveQueue = [];

		var head = {
			x: 8, y: 8
		}, tail = {
			x: 4, y: 8
		};
		var lastHead = head,
			lastTail = tail;
		var cellChanged = false;

		var turns = [];
		var lastTurn;

		var speed = spd;
		var score = 4;

		// True if we have just eaten and need to grow
		var longer = false;

		var lerpAmount = 0;

		this.getSpeed = function() { return speed; };
		this.getScore = function() { return score; };

		this.setDirection = function setDirection(dir) {
			if (game.isPaused()) { return; }

			var lastDir = moveQueue[moveQueue.length - 1] || direction;
			if (dir !== lastDir && dir !== opposites[lastDir]) {
				moveQueue.push(dir);
			}
		};
		this.getDirection = function() { return direction; };

		this.getHeadPos = function() { return head; };

		this.getNextHeadPos = function getNextHeadPos() {
			var nextMove = moveQueue[0] || direction;
			return {
				x: head.x + directions[nextMove].x,
				y: head.y + directions[nextMove].y
			};
		};

		this.getNextTailPos = function getNextTailPos() {
			var nextMove = moveQueue[0] || direction;
			if (turns.length > 0) {
				var x = tail.x,
					y = tail.y,
					turn = turns[turns.length - 1];

				// Advance one cell to the last turn's direction
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
				x: tail.x + directions[nextMove].x,
				y: tail.y + directions[nextMove].y
			};
		};

		this.move = function move() {
			// Add current position to turn list if we're going to turn
			if (moveQueue.length > 0) {
				turns.unshift({
					x: head.x,
					y: head.y
				});
			}

			cellChanged = true;

			// Update previous positions
			lastHead = head;
			lastTail = tail;

			head = this.getNextHeadPos();

			// If we've eaten, don't shorten the tail
			if (!longer) {
				tail = this.getNextTailPos();
			} else {
				longer = false;
			}

			if (turns.length > 0) {
				var turn = turns[turns.length - 1];
				// Remove the last turn if the tail has reached it
				if (tail.x === turn.x && tail.y === turn.y) {
					lastTurn = turns.pop();
				}
			}

			if (moveQueue.length > 0) {
				direction = moveQueue.shift();
			}
		};

		this.draw = function draw(delta, ctx) {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 14;

			// Check if we've advanced to a new cell
			if (cellChanged) {
				lerpAmount = 0;
				cellChanged = false;
			} else {
				// Animate movement within the cell using lerp
				lerpAmount += delta * speed;
				if (lerpAmount > 1) {
					lerpAmount = 1;
				}
			}

			var headPos = getCellPos(head.x, head.y),
				tailPos = getCellPos(tail.x, tail.y);
			var lastHeadPos = getCellPos(lastHead.x, lastHead.y),
				lastTailPos = getCellPos(lastTail.x, lastTail.y);
			var turn;

			// Animate head and tail
			headPos = lerp(lastHeadPos, headPos, lerpAmount);
			tailPos = lerp(lastTailPos, tailPos, lerpAmount);

			// Draw Mato as a wide line, starting from the head, drawing to each turn,
			// ending in the tail
			ctx.beginPath();
			ctx.moveTo(headPos.x, headPos.y);
			turns.forEach(function(t) {
				turn = getCellPos(t.x, t.y);
				ctx.lineTo(turn.x, turn.y);
			});

			// Without this, the tail animates wonky since the last turn was already removed from the list
			// So we keep the turn until our past-tail has reached it and draw it manually
			if (lastTurn) {
				if (lastTurn.x === lastTail.x && lastTurn.y === lastTail.y) {
					lastTurn = undefined;
				} else {
					turn = getCellPos(lastTurn.x, lastTurn.y);
					ctx.lineTo(turn.x, turn.y);
				}
			}
			ctx.lineTo(tailPos.x, tailPos.y);
			ctx.stroke();
		};

		this.eat = function eat() {
			longer = true;
			score += 1;
		};
	};

	//-- Gameplay variables
	this.mato = new Mato(16);

	//-- Gameplay functions
	this.isPaused = function() { return paused; };
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
		69: function() { game.mato.eat(); }
	};

	//-- Window events
	window.onkeydown = function onkeydown(e) {
		var dir = moveKeys[e.keyCode];
		if (dir) {
			if (game.isPaused()) {
				game.pause();
			}
			game.mato.setDirection(dir);
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
		var m = game.mato;
		// Update debug text
		if (debug) {
			debugText = [
				'Frametime: ' + Math.round(delta * 1000 * 100)/100 + ' ms',
				'Length: ' + m.getScore(),
				'Position: ' + m.getHeadPos().x + ', ' + m.getHeadPos().y,
				'Direction: ' + m.getDirection()
			];
		}

		// When entering new cell, change direction if needed
		lastMove += delta * 1000;
		if (lastMove > (1000 / m.getSpeed())) {
			m.move();
			lastMove = 0;
		}
	};

	var pauseText = [
		'Press Space or move to start',
		'',
		'WASD or Arrows to move',
		'Space to pause'
	];

	var draw = function draw(delta, ctx) {
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
		if (game.isPaused()) {
			textY = 400;
			ctx.font = '16pt sans-serif';
			pauseText.forEach(function(t) {
				ctx.fillText(t, 280, textY);
				textY += 20;
			});
		}

		game.mato.draw(delta, ctx);

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

		draw(delta, ctx);

		lastTime = currentTime;
	};

	this.start = function start(startPaused) {
		paused = startPaused;

		tick();
	};
}