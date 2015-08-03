/* jshint node:true */
define([
	'dojo/lang',
	'dojo/Promise',
	'./Suite',
	'benchmark'
], function (lang, Promise, Suite, Benchmark) {

	function onComplete(event) {
		var self = this;

		function reportError(error) {
			self.error = error;
			self.reporterManager.emit('error', error);
			self._reject(error);
			self._inOnComplete = false;
		}

		function teardown() {
			return new Promise(function (resolve) {
				return resolve(self.teardown && self.teardown());
			}).catch(reportError);
		}

		self._inOnComplete = true;
		self.event = event;
		if (self.publishAfterSetup) {
			self.reporterManager.emit('benchmarkEnd', self);
		}
		teardown().then(function () {
			if (!self.publishAfterSetup) {
				self.reporterManager.emit('benchmarkEnd', self);
			}
			self.error ? self._reject(self.error) : self._resolve();
			self._inOnComplete = false;
		}).catch(reportError);
	}

	function BenchmarkSuite(/* options */) {
		this.config = {};

		var self = this;

		Suite.apply(self, arguments);

		var benchmarkSuite = this._benchmarkSuite = new Benchmark.Suite();

		benchmarkSuite.on('complete', onComplete.bind(self));
		benchmarkSuite.on('cycle', function (event) {
			self.event = event;
			self.reporterManager.emit('cycle', self);
		});
		benchmarkSuite.on('error', function (event) {
			self.error = event.target.error;
			self.event = event;

			/* Most reporters expect an Intern Test to be passed on failure
			 * therefore we will generate a psuedo test here.
			 */
			self.reporterManager.emit('testFail', {
				name: event.target.name,
				id: self.id + ' - ' + event.target.name,
				timeElapsed: event.target.times.elapsed,
				error: event.target.error
			});

			self.reporterManager.emit('benchmarkError', self);
			self._reject(self.error);
		});

		this.reporterManager && this.reporterManager.emit('newBenchmarkSuite', this);
	}

	var _super = Suite.prototype;
	BenchmarkSuite.prototype = lang.mixin(Object.create(_super), /** @lends module:intern/lib/BenchmarkSuite# */ {
		constructor: BenchmarkSuite,
		name: null,
		args: null,
		config: null,
		_benchmarkSuite: null,

		add: function () {
			return this._benchmarkSuite.add.apply(this._benchmarkSuite, arguments);
		},

		run: function () {
			var self = this;
			var reporterManager = self.reporterManager;
			var benchmarkSuite = self._benchmarkSuite;

			function report(eventName) {
				if (reporterManager) {
					var args = [ eventName, self ].concat(Array.prototype.slice.call(arguments, 1));
					return new Promise(function (resolve) {
						resolve(reporterManager.emit.apply(reporterManager, args));
					});
				}
				else {
					return Promise.resolve();
				}
			}

			function reportError(error) {
				self.error = error;
				return report('fail', error).then(function () {
					throw error;
				});
			}

			function start() {
				return report('benchmarkStart');
			}

			function setup() {
				return new Promise(function (resolve) {
					resolve(self.setup && self.setup());
				}).catch(reportError);
			}

			function runBenchmark() {
				return new Promise(function (resolve, reject) {
					self._resolve = resolve;
					self._reject = reject;
					if (benchmarkSuite.length) {
						benchmarkSuite.run({ 'async': true });
					}
					else {
						onComplete.call(self, { target: benchmarkSuite });
					}
				}).catch(reportError);
			}

			return (function () {
				if (!self.publishAfterSetup) {
					return start().then(setup);
				}
				else {
					return setup().then(start);
				}
			})()
			.then(runBenchmark)
			.finally(function () {
				return self.numTestsFail;
			});
		},
		toJSON: function () {
			return {
				name: this.name,
				id: this.id,
				sessionId: this.sessionId,
				hasParent: Boolean(this.parent),
				tests: this.tests,
				timeElapsed: this.timeElapsed,
				numTests: this.numTests,
				numFailedTests: this.numFailedTests,
				numSkippedTests: this.numSkippedTests,
				error: this.error ? {
					name: this.error.name,
					message: this.error.message,
					stack: this.error.stack,
					relatedTest: this.error.relatedTest
				} : null
			};
		}
	});

	/* dojo/lang::mixin does not properly handle accessor property descriptors */
	Object.defineProperties(BenchmarkSuite.prototype, {
		numTests: {
			get: function () {
				return this._benchmarkSuite && this._benchmarkSuite.length;
			},
			set: undefined,
			enumerable: false,
			configurable: false
		},
		numFailedTests: {
			get: function () {
				var benchmarkSuite = this._benchmarkSuite;
				return benchmarkSuite && (benchmarkSuite.length - benchmarkSuite.filter('successful').length);
			},
			set: undefined,
			enumerable: false,
			configurable: false
		},
		tests: {
			get: function () {
				var benchmarkSuite = this._benchmarkSuite;
				if (benchmarkSuite) {
					var successful = benchmarkSuite.filter('successful');
					return benchmarkSuite.map(function (test) {
						return {
							async: test.async,
							count: test.count,
							cycles: test.count,
							defer: test.count,
							delay: test.delay,
							hasPassed: Boolean(~successful.indexOf(test)),
							hz: test.hz,
							maxTime: test.maxTime,
							minSamples: test.minSamples,
							minTime: test.minTime,
							name: test.name,
							stats: test.stats,
							times: test.times
						};
					});
				}
				else {
					return [];
				}
			},
			set: function (value) {
				var benchmarkSuite = this._benchmarkSuite;
				var key;
				var test;
				var testUid = 0;

				if (!benchmarkSuite) {
					return;
				}

				while (benchmarkSuite.length) {
					benchmarkSuite.pop();
				}

				if (Array.isArray(value)) {
					value.forEach(function (test) {
						if (Array.isArray(test)) {
							benchmarkSuite.add.apply(benchmarkSuite, test);
						}
						if (typeof test === 'function') {
							benchmarkSuite.add('test' + (++testUid), test);
						}
						if (typeof test === 'object') {
							benchmarkSuite.add(test);
						}
					});
				}
				else if (typeof value === 'object') {
					for (key in value) {
						test = value[key];
						if (Array.isArray(test)) {
							benchmarkSuite.add.apply(benchmarkSuite, [ key ].concat(test));
						}
						else if (typeof test === 'function' || typeof test === 'object') {
							benchmarkSuite.add(key, test);
						}
						else {
							throw new TypeError('BenchmarkSuite.tests key values are either' +
								'objects, functions or arrays.');
						}
					}
				}
				else {
					throw new TypeError('BenchmarkSuite.tests are either objects or arrays.');
				}
			},
			enumerable: false,
			configurable: false
		},
		timeElapsed: {
			get: function () {
				var benchmarkSuite = this._benchmarkSuite;
				return benchmarkSuite && (benchmarkSuite.reduce(function (previousValue, currentValue) {
					return previousValue + currentValue.times.elapsed;
				}, 0) * 1000);
			},
			set: undefined,
			enumerable: false,
			configurable: false
		}
	});

	return BenchmarkSuite;
});
