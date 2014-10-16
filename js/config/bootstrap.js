/*global require */
(function () {
	'use strict';

	var App = angular.module('BowerSearch', ['LocalStorageModule']);

	App.config([
		'$locationProvider',
		function ($locationProvider) {
			$locationProvider.html5Mode(true);
		}
	]);

	require('../directives/shortcut')(App);
	require('../directives/bind_once')(App);
	require('../directives/bind_attr_once')(App);
	require('../filters/format_date')(App);
	require('../controllers/index_controller')(App);
})();
