(function() {
	
	var express = require('express');
	
	var app = express();
	var PORT = 8030;
	
	app.use(express["static"](__dirname + '/'));
	
	app.listen(PORT, function() {
		console.log('jasmine server started at http://localhost:' + PORT);
	});
	
}).call(this);
