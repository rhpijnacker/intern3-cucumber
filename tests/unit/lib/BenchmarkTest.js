define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/BenchmarkTest',
	'dojo/Promise'
], function (registerSuite, assert, BenchmarkTest, Promise) {
	function createTest(options) {
		if (!options.parent) {
			options.parent = {
				reporterManager: {
					emit: function () {
						options.reporterManagerEmit && options.reporterManagerEmit.apply(this, arguments);
						return Promise.resolve();
					}
				}
			};
		}
		return new BenchmarkTest(options);
	}

	registerSuite({
		name: 'intern/lib/BenchmarkTest',

		'BenchmarkTest#test': function () {
			var dfd = this.async(250);
			var executionCount = 0;

			var test = new BenchmarkTest({
				test: function () {
					executionCount++;
				}
			});

			test.run().then(dfd.callback(function () {
				assert.isAbove(executionCount, 1,
					'Test function should have been called multiple times when run is called');
			}));
		},

		'BenchmarkTest#constructor topic': function () {
			var topicFired = false;
			var actualTest;
			var expectedTest = createTest({
				reporterManagerEmit: function (topic, test) {
					if (topic === 'newTest') {
						topicFired = true;
						actualTest = test;
					}
				}
			});
			assert.isTrue(topicFired, 'newTest topic should fire after a test is created');
			assert.strictEqual(actualTest, expectedTest,
				'newTest topic should be passed the test that was just created');
		},

		'BenchmarkTest#constructor with benchmark options': function () {
			var runCount = 0;
			var onStartCalled = false;
			var test = new BenchmarkTest({
				name: 'test 1',
				test: (function () {
					function testFunction() {
						runCount++;
					}
					testFunction.options = {
						onStart: function () {
							onStartCalled = true;
						}
					};
					return testFunction;
				})()
			});

			test.run().then(function () {
				assert.isAbove(runCount, 1, 'test should have run more than once');
				assert.isTrue(onStartCalled, 'Benchmark#onStart should have been called');
			});
		},

		'BenchmarkTest#skip': function () {
			var skipped;
			var test = createTest({
				test: function () {
					this.skip('foo');
				},
				reporterManagerEmit: function (topic) {
					if (topic === 'testSkip') {
						skipped = true;
					}
				}
			});

			return test.run().then(function () {
				assert.isTrue(skipped, 'testSkip topic should fire when a test is skipped');
				assert.propertyVal(test, 'skipped', 'foo', 'test should have `skipped` property with expected value');
			});
		},

		'BenchmarkTest#toJSON': {
			'no error': function () {
				var test = new BenchmarkTest({
					name: 'test name',
					parent: {
						id: 'parent id',
						name: 'parent id',
						sessionId: 'abcd',
						timeout: 30000
					},
					test: function () {}
				});
				var expected = {
					error: null,
					id: 'parent id - test name',
					name: 'test name',
					sessionId: 'abcd',
					timeout: 30000,
					hasPassed: true,
					skipped: null
				};

				return test.run().then(function () {
					var testJson = test.toJSON();

					// Elapsed time is non-deterministic, so just force it to a value we can test
					assert.isAbove(testJson.timeElapsed, 0);

					// Check that a benchmark property exists and has values
					assert.property(test, 'benchmark');
					assert.isAbove(test.benchmark.hz, 0);

					// Delete the values we don't want deepEqual with the expected values
					delete testJson.timeElapsed;
					delete testJson.benchmark;

					assert.deepEqual(testJson, expected,
						'Test#toJSON should return expected JSON structure for test with no error');
				});
			},

			error: function () {
				var test = new BenchmarkTest({
					name: 'test name',
					parent: {
						id: 'parent id',
						name: 'parent id',
						sessionId: 'abcd',
						timeout: 30000
					},
					test: function () {
						var error = new Error('fail');
						error.stack = 'stack';
						throw error;
					}
				});

				return test.run().then(
					function () {
						throw new Error('test should not have passed');
					},
					function () {
						var testJson = test.toJSON();

						// Check that a benchmark property exists and has values
						assert.deepEqual(testJson.error, { name: 'Error', message: 'fail', stack: 'stack' });
					}
				);
			}
		}
	});
});
