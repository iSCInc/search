'use strict';

// init new relic agent only in prod
if (process.env.NODE_ENV === 'production') require('newrelic');

var crypto = require('crypto');
var connect = require('connect');
var Q = require('q');
var fetchComponents = require('./component-list');
var registry;
var entity;

var HTTP_PORT = process.env.PORT || 8011;
//interval for updating old repos
var UPDATE_OLD_REPOS_INTERVAL_IN_DAYS =  7;
//interval for fetching new repos
var UPDATE_NEW_REPOS_INTERVAL_IN_MINUTES = 120;

function createEntity(list) {
	var obj = {json: JSON.stringify(list)};
	var shasum = crypto.createHash('sha1');
	shasum.update(obj.json);
	obj.etag = shasum.digest('hex');
	return obj;
}

function createCustomEntity(keyword) {
	return createEntity(registry.filter(function (el) {
		return el.keywords && el.keywords.indexOf(keyword) !== -1;
	}));
}

function getComponentListEntity(fetchNew) {
	fetchComponents(fetchNew || false).then(function (list) {
		console.log('Finished fetching data from GitHub', '' + new Date());

		registry = list.filter(function (el) {
			return el != null;
		});

		entity = createEntity(registry);
	}).fail(function (err) {
		console.log('fetchComponents error', err);
	});
}

function serveComponentList(request, response, next) {
	if (!entity) {
		response.statusCode = 418;
		response.end();
		return;
	}

	var localEntity = entity;
	var matches = /^\/keyword\/([\w-]+)/.exec(request._parsedUrl.pathname);

	if (matches) {
		localEntity = createCustomEntity(matches[1]);
	}

	response.setHeader('ETag', localEntity.etag);
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Content-Type', 'application/json');

	if (request.headers['if-none-match'] === localEntity.etag) {
		response.statusCode = 304;
		response.end();
		return;
	}

	response.statusCode = 200;
	response.end(new Buffer(localEntity.json));
}

getComponentListEntity();

connect()
	.use(connect.errorHandler())
	.use(connect.timeout(30000))
	.use(connect.logger('dev'))
	.use(connect.compress())
	.use(serveComponentList)
	.listen(HTTP_PORT);

//interval for getting old repository every week
setInterval(getComponentListEntity, UPDATE_OLD_REPOS_INTERVAL_IN_DAYS * 24 * 60 * 60 * 1000);

//interval for fetching new repos
setInterval(function () {
	getComponentListEntity(true);
}, UPDATE_NEW_REPOS_INTERVAL_IN_MINUTES * 60 * 1000);

// sorry...
// restart the process once a day
// i don't have time to actually fix it
setInterval(function () {
	process.exit(0);
}, 1000 * 60 * 60 * 24);

console.log('Server running on port ' + HTTP_PORT);
