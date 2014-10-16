module.exports = function (App) {
	'use strict';

	App.directive('bindOnce', [
		'$parse',
		function ($parse) {
			return {
				compile: function (element, attributes) {
					return function link(scope, element) {
						element.text($parse(attributes.bindOnce)(scope));
					};
				}
			};
		}
	]);
};
