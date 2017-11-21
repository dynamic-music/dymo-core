var gulp = require('gulp');
var browserify = require('browserify');
var tsify = require('tsify');
var source = require('vinyl-source-stream');
var buffer = require("vinyl-buffer");
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('default', function () {
  //return gulp.src(['./build/**/*.js', './lib/soundtouch-js/soundtouch-min.js', './lib/LogicJS/logic.js'], {base: './'})
    return browserify({
      standalone: 'dymoCore'
    })
    .add('src/index.ts')
    .plugin(tsify)
    .transform('babelify', {
        presets: ['es2015'],
        extensions: ['.ts']
    })
    .bundle()
    .pipe(source('dymo-core.min.js'))
    .pipe(buffer())
    //.pipe(uglify())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'));
});
