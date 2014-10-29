/*global performance */

function MatoGame(ctx) {
	'use strict';

	//-- Polyfills for more recent features
	var performanceFill = (window.performance || {
		offset: Date.now(),
		now: function now() {
			return Date.now() - this.offset;
		}
	});
	// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
	// MIT license
	(function() {
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
			window[vendors[x] + 'CancelRequestAnimationFrame'];
		}

		if (!window.requestAnimationFrame) {
			window.requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() {
						callback(currTime + timeToCall);
					},
					timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}
		if (!window.cancelAnimationFrame) {
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			};
		}
	}());

	// Save this for inner functions
	var game = this;

	//-- Engine variables
	// Debug mode, adds some textual info and more keys
	var debug = true,
		debugText = [],
		debugGrid = false,
		debugPos = true;

	// Time stuff
	var currentTime = 0,
		lastTime = performanceFill.now();

	var paused = false,
		gameOver = false,
		gameWon = false; // Just in case

	// Suspend keys when an external dialog or something is open
	var suspendKeys = false;

	// Callback when the game has ended, for implementing top10 and other similar things
	this.onEnd = function() {};

	// Override this function to return your own top10
	// No default implementation
	this.getTopList = function() { return []; };

	// Cell stuff
	this.cellSize = 16; // pixels
	// Field size in cells (should probably make sure this is an integer)
	this.width = ctx.canvas.width / this.cellSize;
	this.height = ctx.canvas.height / this.cellSize;

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
			x: x * game.cellSize + game.cellSize / 2,
			y: y * game.cellSize + game.cellSize / 2
		};
	};

	// Check if given x,y overlap with Mato
	// returns true on overlap
	var checkForOverlap = function(mato, x, y) {
		var posList = mato.getAllPositions();

		posList = posList.filter(function(pos) {
			return pos.x === x && pos.y === y;
		});

		return posList.length > 0;
	};

	var directions = {
		up: {x: 0, y: -1},
		down: {x: 0, y: 1},
		left: {x: -1, y: 0},
		right: {x: 1, y: 0}
	};

	// Opposite directions to make checking neater later
	var opposites = {
		up: 'down',
		down: 'up',
		left: 'right',
		right: 'left'
	};

	//-- Object for Mato
	var Mato = function(spd, size) {
		// Initial size, add score to get current size
		// Minimum 2
		var initialSize = Math.max(2, size);
		// How many cells per second Mato moves
		var speed = spd;
		// Current direction
		var direction = 'right';

		// Queue of moves, most recent being last
		var moveQueue = [];

		// Mato's position, measured in cells
		var head = {
			x: 8, y: 8
		}, tail = {
			x: head.x - (initialSize - 1), y: head.y
		};
		// Previous positions, kept for animation purposes
		var lastTail = tail;

		var headPos = getCellPos(head.x, head.y),
			tailPos = getCellPos(tail.x, tail.y);
		var lastHeadPos = getCellPos(head.x, head.y),
			lastTailPos = getCellPos(tail.x, tail.y);

		// Whether we've moved to a new cell recently,
		// also for animation purposes (we reset lerp fraction after cell change)
		var cellChanged = false;

		// Holds a cache of all cells Mato is in
		// Invalidated after every move
		var cachedPositions;

		// All points where Mato has turned
		// First index is turn nearest to the head (most recent turn)
		var turns = [];
		// Last turn removed from the list, kept for animation
		var lastTurn;

		// How much Mato has eaten
		var score = 0;

		// True if we have just eaten and need to grow
		var longer = false;

		var lerpAmount = 1;

		this.getSpeed = function() {
			return speed;
		};
		this.getScore = function() {
			return score;
		};
		this.getLength = function() {
			return initialSize + score;
		};

		// Add a move into the queue
		// Only accepts perpendicular moves (ie. only up/down if you're going left or right)
		this.addMove = function addMove(dir) {
			if (game.isPaused()) {
				return;
			}

			var lastDir = moveQueue[moveQueue.length - 1] || direction;
			if (dir !== lastDir && dir !== opposites[lastDir]) {
				moveQueue.push(dir);
			}
		};
		this.getDirection = function() {
			return direction;
		};

		this.getHeadPos = function() {
			return head;
		};

		this.getTailPos = function() {
			return tail;
		};

		this.getTurns = function() {
			return turns;
		};

		// Calculate every position Mato is in
		// Might be expensive
		this.getAllPositions = function() {
			if (cachedPositions) {
				return cachedPositions;
			}
			var positions = [];
			var prevPos = head;

			// For every turn (and then tail), start from previous turn (or head)
			// and advance one cell towards the turn/tail
			turns.forEach(function(t) {
				if (prevPos.x === t.x) {
					for (var y = prevPos.y; y !== t.y; y < t.y ? y++ : y--) {
						positions.push({x: prevPos.x, y: y});
					}
				} else {
					for (var x = prevPos.x; x !== t.x; x < t.x ? x++ : x--) {
						positions.push({x: x, y: prevPos.y});
					}
				}
				prevPos = t;
			});
			if (prevPos.x === tail.x) {
				for (var y = prevPos.y; y !== tail.y; y < tail.y ? y++ : y--) {
					positions.push({x: prevPos.x, y: y});
				}
			} else {
				for (var x = prevPos.x; x !== tail.x; x < tail.x ? x++ : x--) {
					positions.push({x: x, y: prevPos.y});
				}
			}
			positions.push({x: tail.x, y: tail.y});

			cachedPositions = positions;

			return positions;
		};

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
		this.checkCollision = function checkCollision() {
			// Check if we've hit ourselves
			var nextHead = this.getNextHeadPos();
			var collision = checkForOverlap(this, nextHead.x, nextHead.y);

			// And the walls
			if (nextHead.x < 0 || nextHead.x > game.width ||
				nextHead.y < 0 || nextHead.y > game.height) {
				collision = true;
			}

			if (collision) {
				this.die();
			}
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
			lastTail = tail;

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

			// Invalidate position cache
			cachedPositions = undefined;

			this.checkCollision();

			head = this.getNextHeadPos();

			cachedPositions = undefined;

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

				lastHeadPos = headPos;
				lastTailPos = tailPos;
			} else {
				// Animate movement within the cell using lerp
				lerpAmount += delta * speed;
				if (lerpAmount > 1) {
					lerpAmount = 1;
				}
			}

			headPos = getCellPos(head.x, head.y);
			tailPos = getCellPos(tail.x, tail.y);

			var drawList = turns.map(function(t) {
				return getCellPos(t.x, t.y);
			});

			// Draw Mato as a wide line, starting from the head, drawing to each turn,
			// ending in the tail

			ctx.beginPath();

			var nextTurn = drawList[0] || tailPos;

			// This makes the line longer, so it reaches the 'end' of the cell, instead
			// of being in the middle
			// Yes, it's ugly as hell. It has to check which direction the next turn is,
			// then move the head away from it.
			if (nextTurn) {
				if (headPos.x !== nextTurn.x) {
					if (headPos.x < nextTurn.x) {
						headPos.x -= game.cellSize / 2;
					} else {
						headPos.x += game.cellSize / 2;
					}
				} else {
					if (headPos.y < nextTurn.y) {
						headPos.y -= game.cellSize / 2;
					} else {
						headPos.y += game.cellSize / 2;
					}
				}
			}

			// Animate head
			var headLerp = lerp(lastHeadPos, headPos, lerpAmount);

			ctx.moveTo(headLerp.x, headLerp.y);

			// Draw to each turn
			drawList.forEach(function(t, i, a) {
				ctx.lineTo(t.x, t.y);
			});

			// Without this, the tail animates wonky since the last turn was already removed from the list
			// So we keep the turn until our past-tail has reached it and draw it manually
			if (lastTurn) {
				if (lastTurn.x === lastTail.x && lastTurn.y === lastTail.y) {
					lastTurn = undefined;
				} else {
					var turn = getCellPos(lastTurn.x, lastTurn.y);
					ctx.lineTo(turn.x, turn.y);
				}
			}

			// Make the tail-line longer
			var lastPos = drawList[drawList.length - 1] || headPos;
			if (tailPos.x !== lastPos.x) {
				if (tailPos.x < lastPos.x) {
					tailPos.x -= game.cellSize / 2;
				} else {
					tailPos.x += game.cellSize / 2;
				}
			} else {
				if (tailPos.y < lastPos.y) {
					tailPos.y -= game.cellSize / 2;
				} else {
					tailPos.y += game.cellSize / 2;
				}
			}

			// Animate tail
			var tailLerp = lerp(lastTailPos, tailPos, lerpAmount);
			ctx.lineTo(tailLerp.x, tailLerp.y);

			ctx.stroke();

			cellChanged = false;
		};

		this.eat = function eat() {
			if (!longer) {
				score += 1;
			}
			longer = true;

			if (this.getLength() === game.width * game.height) {
				// Somehow we've won. Wow
				game.pause(true);
				gameWon = true;
				if (game.onEnd(this.getScore())) {
					suspendKeys = true;
				}
			}
		};

		this.die = function die() {
			game.pause(true);
			gameOver = true;

			if (game.onEnd(this.getScore())) {
				suspendKeys = true;
			}
		};
	};

	//-- Gameplay variables
	this.mato = new Mato(16, 4);
	var food;

	//-- Gameplay functions
	this.isPaused = function() {
		return paused;
	};
	this.pause = function pause(p) {
		if (gameOver || gameWon) {
			// Restart the game
			game.restart();
		} else {
			p = typeof p !== 'undefined' ? p : !paused;
			paused = p;
		}
	};

	this.restart = function restart() {
		gameOver = false;
		gameWon = false;
		game.mato = new Mato(16, 4);
		game.pause(true);
	};

	this.suspendKeys = function(sk) {
		suspendKeys = sk;
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
		69: function() {
			game.mato.eat();
		},
		// f
		70: function() {
			debugPos = !debugPos;
		},
		// g
		71: function() {
			debugGrid = !debugGrid;
		}
	};

	//-- Window events
	window.onkeydown = function onkeydown(e) {
		if (suspendKeys) {
			return;
		}

		var dir = moveKeys[e.keyCode];
		if (!gameOver && dir) {
			if (game.isPaused()) {
				game.pause();
			}
			game.mato.addMove(dir);
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
				'Frametime: ' + Math.round(delta * 1000 * 100) / 100 + ' ms',
				'Length: ' + m.getLength(),
				'Position: ' + m.getHeadPos().x + ', ' + m.getHeadPos().y,
				'Direction: ' + m.getDirection()
			];
		}

		// Pick a cell for the food randomly, until we find an unoccupied one
		if (!food && !gameOver && !gameWon) {
			var overlap = true;
			while (overlap) {
				food = {
					x: Math.floor(Math.random() * game.width),
					y: Math.floor(Math.random() * game.height)
				};
				overlap = checkForOverlap(m, food.x, food.y);
			}
		}
		if (food) {
			debugText.push('Food: ' + food.x + ', ' + food.y);
		}

		// When entering new cell, change direction if needed
		lastMove += delta * 1000;
		if (lastMove > (1000 / m.getSpeed())) {
			m.move();
			lastMove = 0;

			if (m.getHeadPos().x === food.x && m.getHeadPos().y === food.y) {
				m.eat();

				food = undefined;
			}
		}
	};

	var pauseText = [
		'Press Space or move to start',
		'',
		'WASD or Arrows to move',
		'Space to pause'
	];

	var deadText = [
		'You are dead',
		'',
		'Space to restart'
	];

	var winText = [
		'You have won!',
		'',
		'Space to restart'
	];

	var draw = function draw(delta, ctx) {
		ctx.save();

		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		var textY;
		// Debug text
		if (debug && debugText.length > 0) {
			textY = 24;
			ctx.font = '12pt sans-serif';
			ctx.fillStyle = 'black';
			debugText.forEach(function(t) {
				ctx.fillText(t, 10, textY);
				textY += 16;
			});
		}
		// Help text if we're paused
		if (gameWon) {
			textY = ctx.canvas.height / 2;
			ctx.font = '16pt sans-serif';
			ctx.fillStyle = '#1FED92';
			winText.forEach(function(t) {
				var w = ctx.measureText(t).width;
				ctx.fillText(t, ctx.canvas.width / 2 - w / 2, textY);
				textY += 20;
			});
		} else if (gameOver) {
			textY = ctx.canvas.height / 2;
			ctx.font = '16pt sans-serif';
			ctx.fillStyle = '#ED2660';
			deadText.forEach(function(t) {
				var w = ctx.measureText(t).width;
				ctx.fillText(t, ctx.canvas.width / 2 - w / 2, textY);
				textY += 20;
			});
		} else if (game.isPaused()) {
			textY = ctx.canvas.height / 2;
			ctx.font = '16pt sans-serif';
			ctx.fillStyle = 'black';
			pauseText.forEach(function(t) {
				var w = ctx.measureText(t).width;
				ctx.fillText(t, ctx.canvas.width / 2 - w / 2, textY);
				textY += 20;
			});
		}

		// Draw Top10 if one is implemented
		if (game.isPaused()) {
			var list = game.getTopList();
			if (list && list.length > 0) {
				ctx.font = 'bold 14pt sans-serif';
				ctx.fillStyle = 'black';
				textY = 400;
				ctx.fillText('Top 10', 10, textY);
				ctx.font = '12pt sans-serif';
				textY += 30;
				list.forEach(function(t) {
					ctx.fillText(t, 20, textY);
					textY += 20;
				});
			}
		}

		ctx.font = '16pt sans-serif';
		ctx.fillStyle = 'black';
		ctx.fillText(game.mato.getScore(), 390, 50);

		// Draw grid
		if (debug && debugGrid) {
			ctx.strokeStyle = 'red';
			for (var x = 0; x <= ctx.canvas.width; x += game.cellSize) {
				ctx.moveTo(0.5 + x, 0);
				ctx.lineTo(0.5 + x, ctx.canvas.height);
			}
			for (var y = 0; y <= ctx.canvas.height; y += game.cellSize) {
				ctx.moveTo(0, 0.5 + y);
				ctx.lineTo(ctx.canvas.width, 0.5 + y);
			}
			ctx.stroke();
		}

		// Draw food
		ctx.fillStyle = 'green';

		var pos;
		if (food) {
			pos = getCellPos(food.x, food.y);
			ctx.fillRect(pos.x - game.cellSize / 2 + 1, pos.y - game.cellSize / 2 + 1, 14, 14);
		}

		// Draw Mato
		game.mato.draw(delta, ctx);

		if (debug && debugPos) {
			ctx.fillStyle = 'aqua';
			game.mato.getAllPositions().forEach(function(pos) {
				pos = getCellPos(pos.x, pos.y);
				ctx.fillRect(pos.x - game.cellSize / 2 + 5, pos.y - game.cellSize / 2 + 5, 6, 6);
			});
			ctx.fillStyle = 'green';
			var stuff = game.mato.getTurns().slice(0);
			stuff.unshift(game.mato.getHeadPos());
			stuff.push(game.mato.getTailPos());
			stuff.forEach(function(pos) {
				pos = getCellPos(pos.x, pos.y);
				ctx.fillRect(pos.x - game.cellSize / 2 + 5, pos.y - game.cellSize / 2 + 5, 6, 6);
			});
		}

		ctx.restore();
	};

	var tick = function tick() {
		window.requestAnimationFrame(tick, ctx.canvas);

		// Update time stuff
		currentTime = performanceFill.now();
		var delta = (currentTime - lastTime) / 1000;

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