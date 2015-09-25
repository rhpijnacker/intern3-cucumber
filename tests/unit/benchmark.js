define([
    'intern!benchmark'
], function (registerSuite) {
    registerSuite({
        name: 'example benchmarks',

        test1: function () {
            return 2 * 2;
        },

        test2: (function () {
			function test() {
				[ 1, 2, 3, 4, 5 ].forEach(function (item) {
					item = item * item;
				});
			}

			test.options = {
			};

			return test;
        })(),

		nested: {
			nested1: function () {
				return 23 * 23;
			},

			nested2: function () {
				return 23 / 12;
			}
		}
    });
});
