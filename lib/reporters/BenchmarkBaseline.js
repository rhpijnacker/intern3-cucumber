/**
 * Benchmark is a wrapper around a Benchmark.js Benchmark that implements Intern's Test API.
 */
define([
	'intern'
], function (intern) {
	// jshint node:true

	function Benchmark(config) {
		config = config || {};
		this._internConfig = config.internConfig;
		this.console = config.console;

		// rme -> relative margin of error as a percentage of the mean margin of error
		// hz -> Hertz (executions per second)
		this.baseline = {
			thresholds: {
				warn: { rme: 1, hz: 1 },
				fail: { rme: 5, hz: 5 }
			},
			environmentTypes: {}
		};
	}

	Benchmark.prototype = {
		constructor: Benchmark,

		baseline: null,

		runEnd: function () {
			this.console.log('Benchmark baseline:');
			this.console.log(JSON.stringify(this.baseline, null, '    '));
		},

		sessionStart: function (session) {
			var environmentType = session.environmentType;
			this.baseline.environmentTypes[session._session._sessionId] = {
				environmentType: {
					version: environmentType.version,
					platform: environmentType.platform,
					browserName: environmentType.browserName
				}
			};
			this.console.log('-> Benchmark ' + environmentType.browserName + ' ' +
				environmentType.version + ' on ' + environmentType.platform);
		},

		suiteEnd: function (suite) {
			if (!suite.hasParent) {
				return;
			}

			var tests = suite.tests;
			var hz = [];
			var environmentVersion = typeof process === 'object' && process.versions && process.versions.node;
			if (intern.mode === 'client') {
				this.baseline.tests = tests.map(function (test) {
					hz.push(test.benchmark.hz);
					return test.name;
				});
				this.baseline.environmentTypes.client = {
					environmentType: {
						version: environmentVersion || null,
						platform: environmentVersion ? 'node' : null
					},
					hz: hz
				};
			}
			else {
				if (!this.baseline.tests) {
					this.baseline.tests = tests.map(function (test) {
						return test.name;
					});
				}
				this.baseline.environmentTypes[suite.sessionId].hz = tests.map(function (test) {
					return test.benchmark.hz;
				});
			}
		},

		suiteStart: function (suite) {
			if (!suite.hasParent) {
				return;
			}
			this.console.log('Start baseline of ' + suite.name + ' with ' + suite.tests.length + ' benchmarks...');
		},

		testPass: function (test) {
			function secsToMs(number) {
				return (number * 1000).toFixed(2);
			}

			var benchmark = test.benchmark;
			this.console.log('PASS: ' + test.name + ' (' + secsToMs(benchmark.times.elapsed) + ' ms)');
			this.console.log('  Operations per Second: ' + benchmark.hz.toFixed(benchmark.hz < 100 ? 2 : 0));
			this.console.log('  Relative Margin of Error: \xb1' + benchmark.stats.rme.toFixed(2) + '%');
			this.console.log('  Samples: ' + benchmark.stats.sample.length);
			// this.console.log('  Mean: ' + secsToMs(benchmark.stats.mean) + 'ms');
			// this.console.log('  Deviation: \xb1' + secsToMs(benchmark.stats.deviation) + 'ms');
			// this.console.log('  Variance: \xb1' + secsToMs(benchmark.stats.variance) + 'ms');
			// this.console.log('  Margin of Error: \xb1' + secsToMs(benchmark.stats.moe) + 'ms');
			// this.console.log('  Standard Error of Mean: \xb1' + secsToMs(benchmark.stats.sem) + 'ms');
			// this.console.log('  Cycle Time: ' + secsToMs(benchmark.times.cycle) + 'ms');
		}
	};

	return Benchmark;
});
