module.exports = function (App) {
	'use strict';

	App.filter('formatDate', function () {
		return function (timestamp) {
			var date = new Date(timestamp);
			var seconds = Math.floor((new Date() - date) / 1000);

			var interval = Math.floor(seconds / (60 * 60 * 24 * 365));
			if (interval > 1) {
				return interval + ' years ago';
			}

			interval = Math.floor(seconds / (60 * 60 * 24 * 30));
			if (interval > 1) {
				return interval + ' months ago';
			}

			interval = Math.floor(seconds / (60 * 60 * 24 * 7));
			if (interval > 1) {
				return interval + ' weeks ago';
			}

			interval = Math.floor(seconds / (60 * 60 * 24));
			if (interval > 1) {
				return interval + ' days ago';
			}

			interval = Math.floor(seconds / (60 * 60));
			if (interval > 1) {
				return interval + ' hours ago';
			}

			interval = Math.floor(seconds / 60);
			if (interval > 1) {
				return interval + ' minutes ago';
			}
			return Math.floor(seconds) + ' seconds ago';
		};
	});
};
