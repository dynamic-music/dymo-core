var gulp = require('gulp');
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('default', function () {
	//return gulp.src(['./node_modules/google-closure-library/closure/goog/base.js', './src/**/*.js', './lib/soundtouch-js/soundtouch-min.js'], {base: './'})
	return gulp.src(['./src/**/*.js', './lib/soundtouch-js/soundtouch-min.js'], {base: './'})
	.pipe(closureCompiler({
		compilation_level: 'SIMPLE',
		//processCommonJsModules: true,
		//compilation_level: 'WHITESPACE_ONLY',
		warning_level: 'VERBOSE',
		externs: './externs.js',
		//generate_exports: true,
		language_in: 'ECMASCRIPT6',
		language_out: 'ECMASCRIPT5',
		js_output_file: 'dymo-core.min.js'
	}))
	.pipe(gulp.dest('./dist'));
});
