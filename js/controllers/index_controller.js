module.exports = function (App) {
	'use strict';

	var API_URL = 'https://bower-component-list.herokuapp.com';
	var LEFT_KEY = 37;
	var RIGHT_KEY = 39;

	App.controller('IndexController', [
		'$scope',
		'$http',
		'$location',
		'localStorageService',
		function ($scope, $http, $location, localStorageService) {
			$scope.leftKey  = LEFT_KEY;
			$scope.rightKey = RIGHT_KEY;

			$scope.loading = true;
			$scope.loadingError = false;
			$scope.hasResults = false;

			// data
			var ignore = require('../config/ignore');
			var whitelist = require('../config/whitelist');
			var items = [];
			var matchedResults = [];
			$scope.results = [];

			// pagination
			var extractQuery = function () {
				var urlParams = $location.search();
				return (_.isObject(urlParams) && typeof urlParams.q !== 'undefined') ? urlParams.q : '';
			}
			$scope.q = extractQuery();
			$scope.qParams = {
				keyword: '',
				owner: null
			};

			$scope.sortField = 'stars';
			$scope.sortReverse = true;
			$scope.limit = 30;
			$scope.page = 1;
			$scope.count = 0;
			$scope.pagesCount = 1;

			// matchers
			var matchesByName = function (item) {
				if (item.name.toLowerCase().indexOf($scope.qParams.keyword.toLowerCase()) !== -1) {
					return true;
				}

				return false;
			};

			var matchesByKeyword = function (item) {
				if (!_.isArray(item.keywords) || item.keywords.length === 0) {
					return false;
				}

				return $scope.qParams.keyword.split(' ').every(function (qKeyword) {
					return item.keywords.some(function (keyword) {
						return keyword.toLowerCase().indexOf(qKeyword.toLowerCase()) !== -1;
					});
				});
			};

			var matchesByOwner = function (item) {
				if (!$scope.qParams.owner || $scope.qParams.owner.length === 0) {
					return true;
				}

				if (item.owner && item.owner.length > 0) {
					if (item.owner.toLowerCase().indexOf($scope.qParams.owner.toLowerCase()) !== -1) {
						return true;
					}
				}

				return false;
			};

			// queries
			var find = function (items) {
				return _.filter(items, function (item) {
					if (ignore.indexOf(item.name) !== -1) {
						return false;
					}

					if (_.isString(item.website) && typeof whitelist[item.website] !== 'undefined') {
						var whitelistedName = whitelist[item.website];
						if (item.name !== whitelistedName) {
							return false;
						}
					}

					if ($scope.q.length === 0) {
						return true;
					}

					if ((matchesByName(item) || matchesByKeyword(item)) && matchesByOwner(item)) {
						return true;
					}

					return false;
				});
			};

			var sort = function (matchedResults) {
				var list = _.sortBy(matchedResults, function (item) {
					return item[$scope.sortField];
				});

				if ($scope.sortReverse) {
					list = list.reverse();
				}

				return list;
			};

			var limit = function (matchedResults) {
				var from = ($scope.page - 1) * $scope.limit;
				var to   = from + $scope.limit;
				var list = matchedResults.slice(from, to);

				$scope.hasResults = list.length > 0;
				return list;
			};

			var prioritize = function (matchedResults) {
				if (!$scope.qParams.keyword) {
					return matchedResults;
				}

				var match = _.findIndex(matchedResults, function (item) {
					return $scope.qParams.keyword.toLowerCase() === item.name.toLowerCase();
				});

				if (match !== -1) {
					matchedResults.splice(0, 0, matchedResults.splice(match, 1)[0]);
				}

				return matchedResults;
			};

			// search
			$scope.search = function () {
				if ($scope.loading) {
					return false;
				}

				var keywords = [];
				var owner = null;

				$scope.q.split(' ').forEach(function (v) {
					if (v.indexOf('owner:') === 0) {
						owner = v.replace('owner:', '');
					} else {
						keywords.push(v);
					}
				});

				$scope.qParams = {
					keyword: keywords.join(' '),
					owner: owner
				};

				$scope.page = 1;

				matchedResults = find(items);
				matchedResults = sort(matchedResults);
				matchedResults = prioritize(matchedResults);
				$scope.results = limit(matchedResults);

				$scope.count = matchedResults.length;
				$scope.pagesCount = Math.ceil($scope.count / $scope.limit);
			};

			$scope.sortResults = function (field) {
				$scope.sortReverse = $scope.sortField === field ? !$scope.sortReverse : false;
				$scope.sortField = field;
				matchedResults = sort(matchedResults);
				$scope.results = limit(matchedResults);
			};

			$scope.goToPrev = function () {
				if ($scope.hasPrev()) {
					$scope.page--;
					$scope.results = limit(matchedResults);
				}
			};

			$scope.goToNext = function () {
				if ($scope.hasNext()) {
					$scope.page++;
					$scope.results = limit(matchedResults);
				}
			};

			// checkers
			$scope.hasPrev = function () {
				return $scope.page !== 1;
			};

			$scope.hasNext = function () {
				return $scope.page !== $scope.pagesCount;
			};

			// init
			if ($scope.q.length === 0) {
				// get first page from cache if available
				var firstPage = localStorageService.get('firstPage');
				if (_.isArray(firstPage)) {
					items = firstPage;
					$scope.loading = false;
					$scope.search();
				}
			}

			$http.get(API_URL).then(function (res) {
				if (res.status !== 200) {
					$scope.loadingError = true;
					return false;
				}

				items = res.data;
				$scope.loading = false;

				if ($scope.q.length === 0) {
					// cache results of first page on first visit
					var sorted = sort(items);
					var firstPage = limit(sorted);
					localStorageService.add('firstPage', firstPage);
				}
				$scope.search();

				var searchOnLocationChange = true;
				var updateLocationOnQueryChange = true;
				$scope.$watch('q', _.debounce(function (q) {
					$scope.$apply(function () {
						if (updateLocationOnQueryChange) {
							searchOnLocationChange = false;
							q.length ? $location.search({q: q}) : $location.search({});
						}

						updateLocationOnQueryChange = true;
					});
				}, 300));

				$scope.$on('$locationChangeSuccess', function (next, current) {
					if (searchOnLocationChange) {
						updateLocationOnQueryChange = false;
						$scope.q = extractQuery();
						$scope.search();
					}

					searchOnLocationChange = true;
				});
			});
		}
	]);
};
