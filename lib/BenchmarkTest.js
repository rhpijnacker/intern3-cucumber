/**
 * A wrapper around a Benchmark.js Benchmark that maps its API to that used  by Test. Note that BenchmarkTest doesn't
 * actually inherit from Test.
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
	function BenchmarkTest(kwArgs) {
		// `options`, if present, will be a property on the test function
		this.test = (kwArgs && kwArgs.test) || function () {};
		var options = this.test.options || {};

		var self = this;
		this.benchmark = new Benchmark(kwArgs.name, function () {
			return self.test.apply(self, arguments);
		}, options);

		// Call the superclass constructor with the set of kwArgs not specific to BenchmarkTest
		var args = {};
		for (var key in kwArgs) {
			switch (key) {
			case 'test':
			case 'options':
			case 'name':
				break;
			default:
				args[key] = kwArgs[key];
			}
		}
		Test.call(this, args);
	}

	BenchmarkTest.prototype = Object.create(Test.prototype, {
		constructor: { value: BenchmarkTest },

		error: {
			get: function () {
				return this.benchmark.error;
			}
		},

		name: {
			get: function () {
				return this.benchmark.name;
			}
		},

		timeElapsed: {
			get: function () {
				return this.benchmark.times.elapsed;
			}
		},

		run: {
			value: function () {
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
					if (error === self.SKIP) {
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
			}
		},

		toJSON: {
			value: function () {
				var data = Test.prototype.toJSON.call(this);
				data.benchmark = {
					times: this.benchmark.times,
					hz: this.benchmark.hz,
					stats: this.benchmark.stats
				};
				return data;
			}
		}
	});

	return BenchmarkTest;
});
