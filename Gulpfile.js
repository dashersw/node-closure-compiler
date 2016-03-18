var gulp = require('gulp'),
    babel = require('gulp-babel'),
    del = require('del'),
    fs = require('fs-extra'),
    runSequence = require('run-sequence'),
    sourcemaps = require('gulp-sourcemaps'),
    watch = require('gulp-watch');

var queue = [];
var inProgress = 0;
var MAX_PARALLEL_CLOSURE_INVOCATIONS = 4;

/**
 * @return {Promise} Compilation promise.
 */
var closureCompile = function() {
    // Rate limit closure compilation to MAX_PARALLEL_CLOSURE_INVOCATIONS
    // concurrent processes.
    return new Promise(function(resolve) {
        function start() {
            inProgress++;
            compile().then(function() {
                inProgress--;
                next();
                resolve();
            }, function(e) {
                console.error('Compilation error', e.message, 'bok ye', e.stack);
                process.exit(1);
            });
        }

        function next() {
            if (!queue.length) {
                return;
            }
            if (inProgress < MAX_PARALLEL_CLOSURE_INVOCATIONS) {
                queue.shift()();
            }
        }

        queue.push(start);
        next();
    });
};

function compile() {
    var closureCompiler = require('google-closure-compiler').gulp();

    return new Promise(function(resolve, reject) {
        console.log('Starting closure compiler');

        // var wrapper = '(function(){%output%})();';

        var srcs = [
            'src/**/*.js',
            '!**_test.js',
            '!**/test-*.js'
        ];

        var externs = [];

        return gulp.src(srcs).
                    pipe(sourcemaps.init()).
                    pipe(closureCompiler({
                        compilation_level: 'ADVANCED_OPTIMIZATIONS',
                        warning_level: 'VERBOSE',
                        language_in: 'ECMASCRIPT6_TYPED',
                        assume_function_wrapper: true,
                        language_out: 'ECMASCRIPT5_STRICT',
                        // output_module_dependencies: 'dist/dependencies.json',
                        // preserve_type_annotations: true,
                        summary_detail_level: 3,
                        // new_type_inf: true,
                        // tracer_mode: 'ALL',
                        use_types_for_optimization: true,
                        // output_wrapper: wrapper,
                        externs: externs,
                        dependency_mode: 'STRICT',
                        process_common_js_modules: true,
                        formatting: ['PRETTY_PRINT'/*, 'PRINT_INPUT_DELIMITER'*/],
                        js_module_root: '/src',
                        jscomp_error: '*',
                        jscomp_warning: ['lintChecks'],
                        jscomp_off: ['extraRequire', 'inferredConstCheck'],
                        hide_warnings_for: '[synthetic',
                        entry_point: 'index',
                        generate_exports: true,
                        export_local_property_definitions: true,
                        angular_pass: true,
                        // output_manifest: 'dist/manifest.txt',
                        // variable_renaming_report: 'dist/variable_map.txt',
                        // property_renaming_report: 'dist/property_map.txt',
                        js_output_file: 'index.js'
                    })).
                    on('error', function(err) {
                        console.error(err);
                        process.exit(1);
                    }).
                    pipe(sourcemaps.write('/')).
                    pipe(gulp.dest('dist')).
                    on('end', function() {
                        console.log('Compilation successful.');
                        resolve();
                    }).
                    on('error', function() {
                        console.log('Error during compilation!');
                        reject();
                    });
    });
}

gulp.task('default', function(cb) {
    runSequence('clean', 'compile', cb);
});

gulp.task('clean', function() {
    return del(['dist/*']);
});

gulp.task('compile', function() {
    return closureCompile();
});

gulp.task('watch', function() {
    return gulp.src(['src/**/*.js']).
                pipe(watch('src/**/*.js')).
                pipe(sourcemaps.init()).
                pipe(babel({
                    presets: ['es2015'], resolveModuleSource: (src, fn) => `./${src}`
                })).
                pipe(sourcemaps.write('.')).
                pipe(gulp.dest('dist'));
});
