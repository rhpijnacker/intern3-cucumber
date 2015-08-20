define([
	'intern!object',
	'intern/chai!assert',
	'../../../../main!benchmark',
	'../../../../main',
	'../../../../lib/BenchmarkSuite',
	'../../../../lib/Suite'
], function (registerSuite, assert, benchmark, main, BenchmarkSuite, Suite) {
	var originalExecutor = main.executor;
	var rootSuites;

	registerSuite({
		name: 'intern/lib/interfaces/benchmark',

		setup: function () {
			main.executor = {
				register: function (callback) {
					rootSuites.forEach(callback);
				}
			};
		},

		teardown: function () {
			main.executor = originalExecutor;
		},

		'benchmark interface registration': {
			setup: function () {
				rootSuites = [
					new Suite({ name: 'benchmark test 1' }),
					new Suite({ name: 'benchmark test 2' })
				];
			},

			registration: function () {
				benchmark({
					name: 'benchmark suite 1',
					'test1': function() {
						var x = 1;
						x = x + 1;
					},
					'test2': {
						fn: function () {
							var x = 1;
							x = x + 1;
						},
						maxTime: 1
					},
					'test3': [
						function () {
							var x = 1;
							x = x + 1;
						},
						{
							maxTime: 1
						}
					]
				});

				benchmark({
					name: 'benchmark suite 2',
					'test1': function () {
						var x = 1;
						x = x + 1;
					}
				});

				for (var i = 0, mainSuite; (mainSuite = rootSuites[i]) && (mainSuite = mainSuite.tests); ++i) {
					assert.strictEqual(mainSuite[0].name, 'benchmark suite 1',
						'the benchmark suite should be named properly');
					assert.instanceOf(mainSuite[0], BenchmarkSuite, 'suite should be instance of BenchmarkSuite');
					assert.strictEqual(mainSuite[0].tests.length, 3, 'benchmark should have three tests');

					assert.strictEqual(mainSuite[0].tests[0].name, 'test1', 'test should have proper name');
					assert.isFalse(mainSuite[0].tests[0].hasPassed, 'test should not be marked passed');
					assert.strictEqual(mainSuite[0].tests[0].maxTime, 5, 'maxTime should be default');

					assert.strictEqual(mainSuite[0].tests[1].name, 'test2', 'test should have proper name');
					assert.isFalse(mainSuite[0].tests[1].hasPassed, 'test should not be marked passed');
					assert.strictEqual(mainSuite[0].tests[1].maxTime, 1, 'maxTime should be default');

					assert.strictEqual(mainSuite[0].tests[2].name, 'test3', 'test should have proper name');
					assert.isFalse(mainSuite[0].tests[2].hasPassed, 'test should not be marked passed');
					assert.strictEqual(mainSuite[0].tests[2].maxTime, 1, 'maxTime should be default');

					assert.strictEqual(mainSuite[1].name, 'benchmark suite 2',
						'the benchmark suite should be named properly');
					assert.instanceOf(mainSuite[1], BenchmarkSuite, 'suite should be instances of BenchmarkSuite');
					assert.strictEqual(mainSuite[1].tests.length, 1, 'benchmark suite should have one test');
				}
			}
		},

		'Benchmark interface lifecycle methods': {
			setup: function () {
				rootSuites = [
					new Suite({ name: 'object test 1' })
				];
			},

			'lifecycle methods': function () {
				var suiteParams = { name: 'root suite' };
				var results = [];
				var expectedResults = ['before', 'beforeEach', 'afterEach', 'after'];
				var lifecycleMethods = ['setup', 'beforeEach', 'afterEach', 'teardown'];

				expectedResults.forEach(function (method) {
					suiteParams[method] = function () {
						results.push(method);
					};
				});

				benchmark(suiteParams);

				lifecycleMethods.forEach(function (method) {
					rootSuites[0].tests[0][method]();
				});

				assert.deepEqual(results, expectedResults, 'benchmark interface methods should get called when ' +
					'corresponding Suite methods get called.');

			}
		}

	});
});
