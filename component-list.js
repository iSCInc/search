/*jshint camelcase:false */
'use strict';
var request = require('request');
var throat = require('throat');
var Q = require('q');
var cachedResults;

var REGISTRY_URL = 'https://bower.herokuapp.com/packages';

function createComponentData(name, data, keywords) {
	var ret = {
		name: name,
		description: data.description,
		owner: data.owner.login,
		website: data.html_url,
		forks: data.forks,
		stars: data.watchers,
		created: data.created_at,
		updated: data.pushed_at
	};

	if (keywords) {
		ret.keywords = keywords;
	}

	return ret;
}

// to get a diff between old fetched repos and new repos
function getDiffFromExistingRepos(newRepos) {
	if (typeof newRepos === 'object' && typeof cachedResults === 'object') {
		// get an array of old repos name
		var existingReposName = cachedResults.map(function (item) {
			if (typeof item != 'undefined') {
				return item.name;
			}
		});

		return newRepos.filter(function (item) {
			if (typeof item != 'undefined') {
				return existingReposName.indexOf(item.name) < 0;
			}
		});
	}
}

function fetchKeywords(repoJson, file, cb) {
	var url = 'https://raw.githubusercontent.com/' + repoJson.owner.login + '/' + repoJson.name + '/' + repoJson.default_branch + '/'+ file;

	request.get(url, {json: true}, function (err, response, body) {
		if (!err && body && body.keywords) {
			cb(null, body.keywords);
		} else {
			cb(true);
		}
	});
}

function fetchComponents(fetchNew) {
	return Q.fcall(function () {
		var deferred = Q.defer();
		request.get(REGISTRY_URL, {json: true, timeout: 60000}, function (err, response, body) {
			if (!err && response.statusCode === 200) {
				deferred.resolve(fetchNew === true ? getDiffFromExistingRepos(body) : body);
			} else {
				console.log('err bower registry', response.statusCode, err, body);
				deferred.reject(err);
			}
		});
		return deferred.promise;
	}).then(function (list) {
		var apiLimitExceeded = false;
		var results = list.map(throat(5, function (el) {
			var deferred = Q.defer();
			var re = /github\.com\/([\w\-\.]+)\/([\w\-\.]+)/i;
			var parsedUrl = re.exec(el.url.replace(/\.git$/, ''));

			// only return components from github
			if (!parsedUrl) {
				deferred.resolve();
				return deferred.promise;
			}

			var user = parsedUrl[1];
			var repo = parsedUrl[2];
			var apiUrl = 'https://api.github.com/repos/' + user + '/' + repo;

			request.get(apiUrl, {
				json: true,
				qs: {
					client_id: process.env.GITHUB_CLIENT_ID,
					client_secret: process.env.GITHUB_CLIENT_SECRET
				},
				headers: {
					'User-Agent': 'Node.js'
				},
				timeout: 30000
			}, function (err, response, body) {
				if (!err && body && /API Rate Limit Exceeded/.test(body.message)) {
					apiLimitExceeded = true;
					deferred.resolve();
				} else if (body && /Repository access blocked/.test(body.message)) {
					deferred.resolve();
				} else if (!err && response.statusCode === 200) {
					var complete = function (keywords) {
						if (fetchNew === true) {
							cachedResults.push(createComponentData(el.name, body, keywords));
						}

						deferred.resolve(createComponentData(el.name, body, keywords));
					};

					fetchKeywords(body, 'bower.json', function (err, keywords) {
						if (err) {
							fetchKeywords(body, 'package.json', function (err, keywords) {
								complete(keywords);
							});
							return;
						}

						complete(keywords);
					});
				} else {
					if (response && response.statusCode === 404) {
						deferred.resolve();
					} else {
						console.error('err github fetch', el.name, response && response.statusCode, err, body);
						deferred.resolve();
					}
				}

				return deferred.promise;
			});

			return deferred.promise;
		}));

		if (apiLimitExceeded) {
			console.log('API limit exceeded. Using cached GitHub results.');
			return Q.all(cachedResults);
		}

		if (fetchNew === false) {
			cachedResults = results;
		}

		console.log('Finished fetching data from Bower registry', '' + new Date());
		return Q.all(fetchNew === true ? cachedResults.concat(results) : results);
	});
}

module.exports = fetchComponents;
