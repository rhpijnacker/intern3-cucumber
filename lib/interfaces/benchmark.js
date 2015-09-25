define([
	'./object',
	'../BenchmarkTest'
], function (registerSuite, BenchmarkTest) {
	return function (mainDescriptor) {
		registerSuite(mainDescriptor, BenchmarkTest);
	};
});
