/**
 * @module intern/lib/interfaces/object
 */
define([
	'dojo/aspect',
	'../../main',
	'../Suite',
	'../Test'
], function (aspect, main, Suite, Test) {
	/**
	 * @typedef {Object} object~SuiteDescriptor
	 * @property {string} name - The name of the suite
	 * @property {function?} setup - A function to be called before any tests are executed
	 * @property {function?} before - Equivalent to `setup`
	 * @property {function?} teardown - A function to be called after all tests are executed
	 * @property {function?} after - Equivalent to `teardown`
	 * @property {function?} beforeEach - A function to be called before each test is executed
	 * @property {function?} afterEach - A function to be called after each test is executed
	 * @property {number?} timeout - The default async test timeout in milliseconds
	 */

	function registerSuite(descriptor, parentSuite, TestClass) {
		/* jshint maxcomplexity: 13 */
		var suite = new Suite({ parent: parentSuite });
		var tests = suite.tests;
		var test;
		var k;

		parentSuite.tests.push(suite);

		for (k in descriptor) {
			test = descriptor[k];

			if (k === 'before') {
				k = 'setup';
			}
			if (k === 'after') {
				k = 'teardown';
			}

			switch (k) {
			case 'name':
			case 'timeout':
				suite[k] = test;
				break;
			case 'setup':
			case 'beforeEach':
			case 'afterEach':
			case 'teardown':
				aspect.on(suite, k, test);
				break;
			default:
				if (typeof test !== 'function') {
					test.name = test.name || k;
					registerSuite(test, suite, TestClass);
				}
				else {
					tests.push(new TestClass({ name: k, test: test, parent: suite }));
				}
			}
		}
	}

	/**
	 * Register a new test suite. If provided, tests will be constructed using TestClass.
	 *
	 * @param {function|...object~SuiteDescriptor} mainDescriptor - Object or IIFE describing the suite
	 * @param {function?} TestClass - Class to use to construct individual tests
	 */
	return function (mainDescriptor, TestClass) {
		TestClass = TestClass || Test;

		main.executor.register(function (suite) {
			var descriptor = mainDescriptor;

			// enable per-suite closure, to match feature parity with other interfaces like tdd/bdd more closely;
			// without this, it becomes impossible to use the object interface for functional tests since there is no
			// other way to create a closure for each main suite
			if (typeof descriptor === 'function') {
				descriptor = descriptor();
			}

			registerSuite(descriptor, suite, TestClass);
		});
	};
});
