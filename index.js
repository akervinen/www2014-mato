$(function() {
	'use strict';

	var canvas = $('#mato')[0];
	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		var mato = new Mato(ctx);
		mato.loop();
	}
});