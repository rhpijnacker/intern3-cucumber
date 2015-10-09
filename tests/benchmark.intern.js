define([ './selftest.intern' ], function (config) {
	config.tunnel = 'NullTunnel';
	config.environments = [ { browserName: 'chrome' } ];

	// Include the benchmark reporter for benchmarks.
	config.reporters = [
		{
			id: 'Benchmark',
			filename: 'benchmark.json',
			verbosity: 2,
			// Baseline is true for baselining, falsey for testing
			baseline: true
		}
	];

	// Benchmark suites
	config.suites = [ 'tests/unit/benchmark' ];

	// Benchmarking is only for unit tests
	config.functionalSuites = [];

	// Never instrument while benchmarking
	config.excludeInstrumentation = true;

	return config;
});
