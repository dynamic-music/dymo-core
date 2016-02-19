var gulp = require('gulp');
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('default', function () {
	return gulp.src(['./src/**/*.js'], {base: './'})
	.pipe(closureCompiler({
		compilation_level: 'SIMPLE_OPTIMIZATIONS',
		warning_level: 'VERBOSE',
		language_in: 'ECMASCRIPT6_STRICT',
		language_out: 'ECMASCRIPT5_STRICT',
		js_output_file: 'dymo-core.min.js'
	}))
	.pipe(gulp.dest('./dist'));
});