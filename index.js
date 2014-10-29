/*global $, MatoGame */

var mato, scores;

function matoEnd(won, score) {
	"use strict";

	scores.push({
		name: 'foo',
		score: score
	});

	scores.sort(function(a, b) {
		return a.score < b.score;
	});
	if (scores.length > 10) {
		scores.splice(scores.length - 1, 1);
	}

	localStorage.setItem('matoScores', JSON.stringify(scores));

	// true to handle restarting game ourselves
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

		mato = new MatoGame(canvas.getContext('2d'));
		mato.onEnd = matoEnd;
		mato.start(true);
	}
});