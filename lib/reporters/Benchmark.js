/**
 * Benchmark is a reporter that can generate a baseline report and do runtime comparisons against an existing baseline.
 *
 * Configuration
 * -------------
 * Along with the default reporter options, Benchmark also supports a `mode` option. This can have two
 * values:
 *
 *     'baseline': Benchmark data will be written to a baseline file when testing is finished
 *     'test': Benchmark is compared to a baseline read from a file when testing starts
 *
 * Baseline data is stored hierarchically by environment and then by test. 
 *
 * Notation
 * --------
 * rme: relative margin of error -- margin of error as a percentage of the mean margin of error
 * mean: mean execution time per function run
 * hz: Hertz (number of executions of a function per second). 1/Hz is the mean execution time of function.
 */
define([ 'dojo/node!fs', '../util' ], function (fs, util) {
	// jshint node:true
	function formatSeconds(value) {
		var places;
		var units = 's';
		if (value < 1) {
			places = Math.ceil(Math.log(value) / Math.log(10)) - 1;
			if (places < -9) {
				value *= Math.pow(10, 12);
				units = 'ps';
			}
			else if (places < -6) {
				value *= Math.pow(10, 9);
				units = 'ns';
			}
			else if (places < -3) {
				value *= Math.pow(10, 6);
				units = 'µs';
			}
			else if (places < 0) {
				value *= Math.pow(10, 3);
				units = 'ms';
			}
		}

		return value.toFixed(3) + units;
	}

	function Benchmark(config) {
		this.config = config;

		this.mode = config.baseline ? 'baseline' : 'test';
		this.thresholds = config.thresholds || {
				warn: { rme: 3, mean: 5 },
				fail: { rme: 6, mean: 10 }
		};
		this.verbosity = config.verbosity || 0;

		// Use this.print for output; disable in debug mode
		this.print = this.verbosity > 0 ? function () {
			config.console.log.apply(config.console, arguments);
		} : function () {};

		if (this.mode === 'test') {
			this.baseline = JSON.parse(fs.readFileSync(config.filename, { encoding: 'utf8' }));
		}
		else {
			this.baseline = { environments: {} };
		}

		// Cache environments by session ID so we can look them up again when serialized tests come back from remote
		// browsers
		this.sessionEnvironments = {};
	}

	Benchmark.prototype = {
		constructor: Benchmark,

		baseline: null,

		getEnvironment: function (testOrSuite) {
			var environment;
			var version;
			var platform;
			var client;

			// Tests from Runner will have a remote or sessionId
			if (testOrSuite.sessionId) {
				if (testOrSuite.remote) {
					environment = testOrSuite.remote.environmentType;
					this.sessionEnvironments[testOrSuite.sessionId] = environment;
				}
				else {
					environment = this.sessionEnvironments[testOrSuite.sessionId];
				}

				client = environment.browserName;
				version = environment.version;
				platform = environment.platform;
			}
			// Tests from Client won't
			else {
				client = process.title;
				version = process.version;
				platform = process.platform;
			}

			return {
				id: client + ':' + version + ':' + platform,
				client: client,
				version: version,
				platform: platform
			};
		},

		runEnd: function () {
			this.config.output.write(JSON.stringify(this.baseline, null, '    '));

			// TODO: display run summary
		},

		suiteEnd: function (suite) {
			var environment = this.getEnvironment(suite);

			if (!suite.hasParent) {
				this.print('Finished ' + environment.client + ' ' +
					environment.version + ' on ' + environment.platform);
			}
		},

		suiteStart: function (suite) {
			// This is a session root suite
			if (!suite.hasParent) {
				var environment = this.getEnvironment(suite);

				if (this.mode === 'baseline') {
					this.baseline.environments[environment.id] = {
						client: environment.client,
						version: environment.version,
						platform: environment.platform,
						tests: {}
					};
				}

				var operation = this.mode === 'baseline' ? 'Baselining' : 'Testing';
				this.print(operation + ' ' + environment.client + ' ' + environment.version + ' on ' +
					environment.platform);
			}
		},

		testFail: function (test) {
			this.print('FAIL ' + test.id);
			this.print(util.getErrorMessage(test.error));
		},

		testPass: function (test) {
			function checkTest() {
				var warn = [];
				var fail = [];

				var baselineMean = baseline.stats.mean;
				var percentDifference = (benchmark.stats.mean - baselineMean) / baselineMean;
				if (Math.abs(percentDifference) > self.thresholds.warn.mean) {
					warn.push('Execution time is ' + percentDifference.toFixed(1) + '% off');
				}
				if (Math.abs(percentDifference) > self.thresholds.fail.mean) {
					fail.push('Execution time is ' + percentDifference.toFixed(1) + '% off');
				}

				var baselineRme = baseline.stats.rme;
				// RME is already a percent
				percentDifference = test.benchmark.stats.rme - baselineRme;
				if (Math.abs(percentDifference) > self.thresholds.warn.rme) {
					warn.push('RME is ' + percentDifference.toFixed(1) + '% off');
				}
				if (Math.abs(percentDifference) > self.thresholds.fail.rme) {
					fail.push('RME is ' + percentDifference.toFixed(1) + '% off');
				}

				if (fail.length > 0) {
					self.print('FAIL ' + test.id + ' (' + fail.join(', '));
					return false;
				}
				else if (warn.length > 0) {
					self.print('WARN ' + test.id + ' (' + warn.join(', '));
					return false;
				}

				return true;
			}

			// Ignore non-benchmark tests
			if (!test.benchmark) {
				console.log('ignoring test', test);
				return;
			}

			var environment = this.getEnvironment(test);
			var baseline = this.baseline.environments[environment.id].tests[test.id];
			var benchmark = test.benchmark;
			var self = this;

			if (this.mode === 'baseline') {
				baseline = {
					hz: benchmark.hz,
					times: benchmark.times,
					stats: {
						rme: benchmark.stats.rme,
						moe: benchmark.stats.moe,
						mean: benchmark.stats.mean
					}
				};
				this.print('Finished baselining ' + test.id);
				if (this.verbosity > 1) {
					this.print('  Time per run: ' + formatSeconds(benchmark.stats.mean) + ' \xb1 ' +
						benchmark.stats.rme.toFixed(2) + '%');
				}
			}
			else {
				if (checkTest()) {
					this.print('PASS ' + test.id);
					if (this.verbosity > 1) {
						this.print('  Expected time per run: ' + formatSeconds(baseline.stats.mean) + ' \xb1 ' +
							baseline.stats.rme.toFixed(2) + '%');
						this.print('  Actual time per run:   ' + formatSeconds(benchmark.stats.mean) + ' \xb1 ' +
							benchmark.stats.rme.toFixed(2) + '%');
					}
				}
			}
		}
	};

	return Benchmark;
});
