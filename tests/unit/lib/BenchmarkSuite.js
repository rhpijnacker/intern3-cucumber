define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/BenchmarkSuite',
	'../../../lib/Suite',
	'dojo/Promise'
], function (registerSuite, assert, BenchmarkSuite, Suite, Promise) {

	function getCycleTest(options) {
		options = options || {};

		var expectedResults = options.publishAfterSetup ?
			[ 'setup', 'benchmarkStart', 'cycle', 'benchmarkEnd', 'teardown', 'done' ] :
			['benchmarkStart', 'setup', 'cycle', 'teardown', 'benchmarkEnd', 'done'];

		return function () {
			var dfd = this.async(5000);
			var benchmarkSuite = new BenchmarkSuite(options);
			var results = [];

			[ 'setup', 'teardown' ].forEach(function (method) {
				benchmarkSuite[method] = function () {
					results.push(method);
				};
			});

			benchmarkSuite.tests = { '1' : [ function () {
				var date = Date.now();
				date;
			}, { maxTime: 1 }]};

			benchmarkSuite.reporterManager = {
				emit: function (event) {
					results.push(event);
					return Promise.resolve();
				}
			};

			benchmarkSuite.run().then(dfd.callback(function () {
				results.push('done');
				assert.deepEqual(expectedResults, results);
			}));
		};
	}

	function createBenchmarkSuite(options) {
		options = options || {};

		options.reporterManager = {
			emit: function () { return Promise.resolve(); }
		};

		return new BenchmarkSuite(options);
	}

	function createBenchmarkSuiteThrows(method, options) {
		options = options || {};
		return function () {
			var dfd = this.async(1000);
			var benchmarkSuite = createBenchmarkSuite();
			var thrownError = new Error('Oops');
			var finished = false;

			benchmarkSuite[method] = function () {
				if (options.async) {
					return new Promise(function (resolve, reject) {
						setTimeout(function () {
							reject(thrownError);
						});
					}, 20);
				}
				else {
					throw thrownError;
				}
			};

			benchmarkSuite.run().then(function () {
				finished = true;
				dfd.reject(new assert.AssertionError('Suite should never resolve after a fatal error in ' + method));
			}, dfd.callback(function (error) {
				finished = true;
				assert.strictEqual(benchmarkSuite.error, thrownError, 'Error thrown in ' + method +
					' should be the error set on suite');
				assert.strictEqual(error, thrownError, 'Error thrown in ' + method +
					' should be the error used by the promise');
			}));

			assert.isFalse(finished, 'Suite should not finish immediately after run()');
		};
	}

    registerSuite({
        name: 'intern/lib/BenchmarkSuite',

        'BenchmarkSuite Cycle': getCycleTest(),

		'BenchmarkSuite Cycle + publishAfterSetup': getCycleTest({ publishAfterSetup: true }),

		'BenchmarkSuite#setup': function () {
			var dfd = this.async(1000);
			var benchmarkSuite = createBenchmarkSuite();
			var called = false;

			benchmarkSuite.setup = function () {
				called = true;
			};

			benchmarkSuite.run().then(dfd.callback(function () {
				assert.isTrue(called, 'Setup should be called before benchmarkSuite finishes');
			}), dfd.reject);
		},

		'BeanchmarkSuite#teardown': function () {
			var dfd = this.async(1000);
			var benchmarkSuite = createBenchmarkSuite();
			var called = false;

			benchmarkSuite.teardown = function () {
				called = true;
			};

			benchmarkSuite.run().then(dfd.callback(function () {
				assert.isTrue(called, 'Synchronous teardown should be called before benchmarkSuite finishes');
			}), dfd.reject);

			assert.isFalse(called, 'teardown should not be resolved in same turn');
		},

		'BenchmarkSuite#setup -> promise': function () {
			var dfd = this.async(1000);
			var benchmarkSuite = createBenchmarkSuite();
			var waited = false;

			benchmarkSuite.setup = function () {
				return new Promise(function (resolve) {
					setTimeout(function () {
						waited = true;
						resolve();
					}, 20);
				});
			};

			benchmarkSuite.run().then(dfd.callback(function () {
				assert.isTrue(waited, 'Asynchronous setup should be called before suite finishes');
			}), dfd.reject);

			assert.isFalse(waited, 'setup should not have been resolved in same turn');
		},

		'BenchmarkSuite#teardown -> promise': function () {
			var dfd = this.async(1000);
			var benchmarkSuite = createBenchmarkSuite();
			var waited = false;

			benchmarkSuite.teardown = function () {
				return new Promise(function (resolve) {
					setTimeout(function () {
						waited = true;
						resolve();
					}, 20);
				});
			};

			benchmarkSuite.run().then(dfd.callback(function () {
				assert.isTrue(waited, 'Asynchronous teardown should be called before suite finishes');
			}), dfd.reject);

			assert.isFalse(waited, 'teardown should not have been resolved in the same turn');
		},

		'BenchmarkSuite#name': function () {
			var benchmarkSuite = new BenchmarkSuite({ name: 'foo', parent: new Suite({ name: 'parent' }) });
			assert.strictEqual(benchmarkSuite.name, 'foo', 'Suite#name should return correct suite name');
		},

		'BenchmarkSuite#id': function () {
			var benchmarkSuite = new BenchmarkSuite({ name: 'foo', parent: new Suite({ name: 'parent' }) });
			assert.strictEqual(benchmarkSuite.id, 'parent - foo', 'Suite#id should return correct suite id');
		},

		'BenchmarkSuite#setup throws': createBenchmarkSuiteThrows('setup'),

		'BenchmarkSuite#teardown throws': createBenchmarkSuiteThrows('teardown'),

		'BenchmarkSuite#setup rejects': createBenchmarkSuiteThrows('setup', { async: true }),

		'BenchmarkSuite#teardown rejects': createBenchmarkSuiteThrows('teardown', { async: true }),

		'BenchmarkSuite#constructor event': function () {
			var topicFired = false;
			var actualSuite;
			var reporterManager = {
				emit: function (topic, suite) {
					if (topic === 'newSuite') {
						topicFired = true;
						actualSuite = suite;
					}
				}
			};

			var expectedSuite = new BenchmarkSuite({ reporterManager: reporterManager });
			assert.isTrue(topicFired, 'newSuite should be reported after a suite is created');
			assert.strictEqual(actualSuite, expectedSuite, 'newSuite should be passed the suite that was just created');
		},

		'BenchmarkSuite#tests': function () {
			var benchmarkSuite = new BenchmarkSuite({
				name: 'foo',
				reporterManager: {
					emit: function () {}
				}
			});

			benchmarkSuite.tests = [{
				name: 'test',
				fn: function () {},
				maxTime: 1
			}];

			var tests = benchmarkSuite.tests;
			assert.strictEqual(tests.length, 1, 'There should be one test');
			assert.strictEqual(tests[0].name, 'test', 'The test should have the correct name');
			assert.isFalse(tests[0].hasPassed, 'The test shouldn\'t have passed');
			assert.strictEqual(tests[0].maxTime, 1, 'maxTime should have been set properly');
		},

		'BenchmarkSuite#numTests / numFailedTests': function () {
			var benchmarkSuite = new BenchmarkSuite({
				name: 'foo',
				reporterManager: {
					emit: function () {}
				}
			});

			benchmarkSuite.add(function () {
				var date = Date.now();
				date;
			}, { maxTime: 1 });

			benchmarkSuite.add(function () {
				throw new Error('Ooops');
			});

			assert.strictEqual(benchmarkSuite.numTests, 2, 'Should report accurate number of tests');

			return benchmarkSuite.run().then(function () {
				throw new assert.AssertionError('Run should be rejected, not resolved.');
			}, function () {
				assert.strictEqual(benchmarkSuite.numTests, 2, 'Should report accurate number of tests');
				assert.strictEqual(benchmarkSuite.numFailedTests, 1, 'Should report accurate number of failed tests');
			});
		},

		'BenchmarkSuite#toJSON': function () {
			var benchmarkSuite = new BenchmarkSuite({
				name: 'foo',
				reporterManager: {
					emit: function () {}
				}
			}, { maxTime: 1 });

			benchmarkSuite.add('foo', function () {
				var date = Date.now();
				date;
			}, { maxTime: 1 });

			benchmarkSuite.add('bar', function () {
				var date = Date.now() + 1;
				date;
			});

			return benchmarkSuite.run().then(function () {
				var json = benchmarkSuite.toJSON();
				assert.isNull(json.error, 'Error should be null');
				assert.strictEqual(json.name, 'foo', 'Name should be correct');
				assert.strictEqual(json.id, 'foo', 'ID should be correct');
				assert.isNumber(json.timeElapsed, 'timeElapsed should be a number');
				assert.strictEqual(json.tests.length, 2);
				[ 'async', 'count', 'cycles', 'defer', 'delay', 'hasPassed', 'hz',
					'maxTime', 'minSamples', 'minTime', 'name', 'stats', 'times' ].forEach(function (key) {
						assert.property(json.tests[0], key,
							'Test object should contain key "' + key + '"');
						assert.property(json.tests[1], key,
							'Test object should contain key "' + key + '"');
					});
			});
		}
    });
});
