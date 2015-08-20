define([
	'dojo/aspect',
	'../../main',
	'../BenchmarkSuite'
], function (aspect, main, BenchmarkSuite) {
	function registerBenchmarkSuite(descriptor, parentSuite) {
		var benchmarkSuite = new BenchmarkSuite({ parent: parentSuite });
		var value;
		var key;

		parentSuite.tests.push(benchmarkSuite);

		for (key in descriptor) {
			value = descriptor[key];

			if (key === 'before') {
				key = 'setup';
			}
			else if (key === 'after') {
				key = 'teardown';
			}

			switch (key) {
			case 'name':
			case 'timeout':
			case 'tests':
				benchmarkSuite[key] = value;
				break;
			case 'setup':
			case 'beforeEach':
			case 'afterEach':
			case 'teardown':
				aspect.after(benchmarkSuite, key, value);
				break;
			default:
				if (typeof value === 'function') {
					benchmarkSuite.add(key, value);
				}
				else if (Array.isArray(value)) {
					benchmarkSuite.add(key, value[0], value[1]);
				}
				else if (typeof value === 'object' && 'fn' in value) {
					value.name = key;
					benchmarkSuite.add(value);
				}
				else {
					throw new TypeError('Incorrect test passed via benchmark interface.');
				}
			}
		}
	}

	return function (mainDescriptor) {
		main.executor.register(function (suite) {
			var descriptor = mainDescriptor;

			if (typeof descriptor === 'function') {
				descriptor = descriptor();
			}

			registerBenchmarkSuite(descriptor, suite);
		});
	};
});
