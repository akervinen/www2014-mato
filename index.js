/*global $, MatoGame */

var mato;

$(function() {
	'use strict';

	var canvas = $('#mato')[0];
	if (canvas.getContext) {
		mato = new MatoGame(canvas.getContext('2d'));
		mato.start(true);
	}
});