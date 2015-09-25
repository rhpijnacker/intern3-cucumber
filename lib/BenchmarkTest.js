/**
 * A wrapper around a Benchmark.js Benchmark
 */
define([
	'./Test',
	'benchmark',
	'dojo/Promise'
], function (
	Test,
	Benchmark,
	Promise
) {
	var SKIP = {};

	function BenchmarkTest(kwArgs) {
		// `options`, if present, will be a property on the test function
		var test = kwArgs.test;
		var options = test.options || {};

		var benchmark = new Benchmark(kwArgs.name, test.bind(this), options);
		this.benchmark = benchmark;

		for (var key in kwArgs) {
			switch (key) {
			case 'test':
			case 'options':
			case 'name':
				break;
			default:
				this[key] = kwArgs[key];
			}
		}

		this.reporterManager && this.reporterManager.emit('newTest', this);
	}

	BenchmarkTest.prototype = {
		get error() {
			return this.benchmark.error;
		},

		get id() {
			return Object.getOwnPropertyDescriptor(Test.prototype, 'id').get.call(this);
		},

		get name() {
			return this.benchmark.name;
		},

		get reporterManager() {
			return this.parent && this.parent.reporterManager;
		},

		get sessionId() {
			return this.parent.sessionId;
		},

		get timeElapsed() {
			return this.benchmark.times.elapsed;
		},

		get timeout() {
			return Object.getOwnPropertyDescriptor(Test.prototype, 'timeout').get.call(this);
		},

		run: function () {
			function report(eventName) {
				if (reporterManager) {
					var args = [ eventName, self ].concat(Array.prototype.slice.call(arguments, 1));
					return reporterManager.emit.apply(reporterManager, args).catch(function () {});
				}
				else {
					return Promise.resolve();
				}
			}

			var reporterManager = this.reporterManager;

			this.hasPassed = false;
			this.skipped = null;

			var self = this;
			var benchmark = this.benchmark;

			return new Promise(function (resolve, reject) {
				benchmark.on('error', function () {
					reject(benchmark.error);
				});

				benchmark.on('complete', function () {
					resolve();
				});

				report('testStart').then(function () {
					benchmark.run();
				});
			}).finally(function () {
				// Stop listening for benchmark events once the test is finished
				benchmark.off();
			}).then(function () {
				self.hasPassed = true;
				return report('testPass');
			}, function (error) {
				if (error === SKIP) {
					return report('testSkip');
				}
				else {
					return report('testFail', error).then(function () {
						throw error;
					});
				}
			}).finally(function () {
				return report('testEnd');
			});
		},

		/**
		 * Skips this test.
		 *
		 * @param {String} message
		 * If provided, will be stored in this test's `skipped` property.
		 */
		skip: function (message) {
			this.skipped = message || '';
			throw SKIP;
		},

		toJSON: function () {
			return Test.prototype.toJSON.call(this);
		}
	};

	return BenchmarkTest;
});
