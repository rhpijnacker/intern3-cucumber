define([
	'intern',
	'../util'
], function (intern, util) {
	/* global process */

	function secsToMs(number) {
		return (number * 1000).toFixed(2);
	}

	function BenchmarkBaseline(config) {
		config = config || {};
		this._internConfig = config.internConfig;
		this.baseline = {
			thresholds: {
				warn: { rme: 1, hz: 1 },
				fail: { rme: 5, hz: 5 }
			},
			environmentTypes: {}
		};
	}

	BenchmarkBaseline.prototype = {
		constructor: BenchmarkBaseline,

		baseline: null,

		$others: function (name) {
			if (~[ 'newSuite', 'newTest', 'tunnelStatus', 'suiteEnd', 'coverage', 'run',
		 			'suiteStart', 'testStart', 'testPass', 'testEnd', 'sessionEnd' ].indexOf(name)) {
				return;
			}
			console.log('other-->', name);
		},
		benchmarkEnd: function (benchmarkSuite) {
			var tests = benchmarkSuite.tests;
			var hz = [];
			var environmentVersion = typeof process === 'object' && process.versions && process.versions.node;
			if (intern.mode === 'client') {
				this.baseline.tests = tests.map(function (test) {
					hz.push(test.hz);
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
				this.baseline.environmentTypes[benchmarkSuite.sessionId].hz = tests.map(function (test) {
					return test.hz;
				});
			}
		},
		benchmarkError: null,
		benchmarkFail: null,

		benchmarkStart: function (benchmarkSuite) {
			console.log('Start baseline of ' + benchmarkSuite.name + '. ' +
				benchmarkSuite.tests.length + ' benchmarks...');
		},

		cycle: function (test) {
			console.log('CYCLE: ' + test.name + ' (' + secsToMs(test.times.elapsed) + ' ms)');
			console.log('  Operations as Second: ' + test.hz.toFixed(test.hz < 100 ? 2 : 0));
			console.log('  Relative Margin of Error: \xb1' + test.stats.rme.toFixed(2) + '%');
			console.log('  Samples: ' + test.stats.sample.length);
			// console.log('  Mean: ' + secsToMs(test.stats.mean) + 'ms');
			// console.log('  Deviation: \xb1' + secsToMs(test.stats.deviation) + 'ms');
			// console.log('  Variance: \xb1' + secsToMs(test.stats.variance) + 'ms');
			// console.log('  Margin of Error: \xb1' + secsToMs(test.stats.moe) + 'ms');
			// console.log('  Standard Error of Mean: \xb1' + secsToMs(test.stats.sem) + 'ms');
			// console.log('  Cycle Time: ' + secsToMs(test.times.cycle) + 'ms');
		},
		fatalError: null,

		newBenchmarkSuite: function (benchmarkSuite) {
			console.log('newBenchmarkSuite', benchmarkSuite.name);
		},

		reporterError: function (error) {
			console.error('REPORTER ERROR');
			//
		},

		runEnd: function () {
			console.log('-- runEnd --');
			console.log(JSON.stringify(this.baseline));
		},

		runStart: function () {
			console.log('-- runStart --');
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
			console.log('-> Benchmark ' + environmentType.browserName + ' ' +
				environmentType.version + ' on ' + environmentType.platform);
		},

		suiteError: function (suite) {
			console.error('SUITE ERROR');
			console.error(util.getErrorMessage(suite.error));
		},

		testFail: null
	};

	return BenchmarkBaseline;
});
