module.exports = function (App) {
	'use strict';

	App.directive('shortcut', [
		'$document',
		function ($document) {
			return {
				link: function (scope, element, attrs) {
					attrs.$observe('shortcut', function (value) {
						var keycode = parseInt(value, 10);
						var searchField = document.getElementById('q');
						var handler = function (e) {
							if (e.keyCode !== keycode || document.activeElement === searchField) {
								return;
							}

							element.triggerHandler('click');
						};

						$document.on('keydown', handler);

						scope.$on('$destroy', function () {
							$document.unbind('keydown', handler);
						});
					});
				}
			}
		}
	]);
};
