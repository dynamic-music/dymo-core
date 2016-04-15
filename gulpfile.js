var gulp = require('gulp');
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('default', function () {
	return gulp.src(['./src/**/*.js', './lib/soundtouch-js/soundtouch-min.js'], {base: './'})
	.pipe(closureCompiler({
		compilation_level: 'ADVANCED_OPTIMIZATIONS',
		warning_level: 'VERBOSE',
		externs: './externs.js',
		language_in: 'ECMASCRIPT6',
		language_out: 'ECMASCRIPT5',
		js_output_file: 'dymo-core.min.js'
	}))
	.pipe(gulp.dest('./dist'));
});