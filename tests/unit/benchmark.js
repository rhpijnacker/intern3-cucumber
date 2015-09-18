define([
    'intern!benchmark'
], function (registerBenchmarkSuite) {
    registerBenchmarkSuite({
        name: 'example benchmarks',
        'test1': function () {
            return 2 * 2;
        },
        'test2': function () {
            [ 1, 2, 3, 4, 5 ].forEach(function (item) {
                item = item * item;
            });
        }
    });
});
