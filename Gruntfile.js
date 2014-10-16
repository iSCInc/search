'use strict';

module.exports = function (grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		less: {
			app: {
				options: {
					paths: [
						'css',
						'bower_components'
					]
				},
				files: {
					'dist/app.css': 'css/app.less'
				}
			}
		},
		autoprefixer: {
			app: {
				src: 'dist/app.css',
				dest: 'dist/app.css'
			}
		},
		cssmin: {
			app: {
				files: {
					'dist/app.css': ['dist/app.css']
				}
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			app: ['js/*.js']
		},
		browserify: {
			app: {
				files: {
					'dist/app.js': [
						'js/index.js'
					]
				}
			}
		},
		uglify: {
			options: {
				mangle: false
			},
			app: {
				files: {
					'dist/app.js': ['dist/app.js']
				}
			}
		},
		connect: {
			app: {
				options: {
					port: 9001,
					base: '.'
				}
			}
		},
		watch: {
			app: {
				files: [
					'css/app.less',
					'js/**/*.js'
				],
				tasks: ['default']
			}
		}
	});

	grunt.registerTask('duplicates', 'Generate duplicates.json file.', function() {
		var http = require('http');
		var done = this.async();
		var packagesUrl = 'http://bower-component-list.herokuapp.com';

		var processList = function (items) {
			var ignored = require('./js/config/ignore');
			var whitelist = require('./js/config/whitelist');
			var namesByUrl = {};
			items.forEach(function (item) {
				var name = item.name;
				if (ignored.indexOf(name) !== -1) {
					return;
				}

				if (typeof item.website === 'string' && typeof whitelist[item.website] !== 'undefined') {
					var whitelistedName = whitelist[item.website];
					if (item.name !== whitelistedName) {
						return;
					}
				}

				var url = item.website;
				if (typeof namesByUrl[url] === 'undefined') {
					namesByUrl[url] = [];
				}
				namesByUrl[url].push(name);
			});

			var duplicates = {};
			for (var url in namesByUrl) {
				var names = namesByUrl[url];
				if (names.length > 1) {
					duplicates[url] = names;
				}
			}
			grunt.file.write('duplicates.json', JSON.stringify(duplicates, null, '\t'));
		};

		http.get(packagesUrl, function (res) {
			var data = '';
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('end', function () {
				var items = JSON.parse(data);
				processList(items);
				done();
			});
		});
	});

	grunt.registerTask('default', [
		'jshint:app',
		'browserify:app',
		'less:app',
		'autoprefixer:app',
		'cssmin:app',
		'uglify:app'
	]);

	grunt.registerTask('serve', [
		'default',
		'connect:app',
		'watch:app'
	]);
};
