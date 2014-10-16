module.exports = function (App) {
	'use strict';

	App.directive('bindAttrOnce', [
		'$parse',
		function ($parse) {
			return {
				compile: function (element, attributes) {
					return function link(scope, element) {
						var attrs = $parse(attributes.bindAttrOnce)(scope);

						angular.forEach(attrs, function (value, key) {
							element[0][key] = value;
						});
					};
				}
			};
		}
	]);
};
