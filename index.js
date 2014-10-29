/*global $, MatoGame */

var mato, scores;

function saveScore(mato, name, score) {
	'use strict';

	// Here we add the score to top10, sort it and remove any extra scores

	scores.push({
		name: name,
		score: score
	});

	scores.sort(function(a, b) {
		return b.score - a.score;
	});
	if (scores.length > 10) {
		scores.splice(scores.length - 1, 1);
	}

	// For some reason (???), splice or something made the scores go in the wrong order,
	// so this seems to fix it
	scores.sort(function(a, b) {
		return b.score - a.score;
	});

	localStorage.setItem('matoScores', JSON.stringify(scores));

	// resume reading keybinds
	mato.suspendKeys(false);
}

function matoEnd(score) {
	'use strict';

	// Check if we have enough points to get into top 10
	var scoreEnough = scores.length < 10;
	scores.forEach(function(o) {
		if (score > o.score) {
			scoreEnough = true;
		}
	});

	if (!scoreEnough) {
		return false;
	}

	$('#formScore').val(score);
	$('#nameDialog').dialog('open');

	// true to prevent the game from reading keybinds
	return true;
}

$(function() {
	'use strict';

	var canvas = $('#mato')[0];
	if (canvas.getContext) {
		var scoreStorage = localStorage.getItem('matoScores');
		if (!scoreStorage) {
			scores = [];
		} else {
			scores = JSON.parse(scoreStorage);
		}

		// Prepare name form
		$('#nameForm').submit(function(e) {
			saveScore(mato, $('#formName').val(), parseInt($('#formScore').val()));
			$('#nameDialog').dialog('close');
			e.preventDefault();
		});

		// Prepare dialog
		$('#nameDialog').dialog({
			autoOpen: false,
			modal: true,
			width: 'auto',
			minHeight: 0,
			dialogClass: 'noTitleStuff',
			closeOnEscape: false
		});

		mato = new MatoGame(canvas.getContext('2d'));
		// Add callbacks for top10
		mato.onEnd = matoEnd;
		mato.getTopList = function() {
			return scores.map(function(o) {
				return o.score + ' - ' + o.name;
			});
		};
		mato.start(true);
	}
});