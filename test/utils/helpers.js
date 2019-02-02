/**
 * Unit tests 'leak' gas from the test accounts which can mess up before/after balance checks.
 * Can use this to add some flexibility with a since its unlikly that 2 wei numbers will be exactly the same.
 */
exports.assert_approx_wei_equal = (wei_str1, wei_str2, delta, message) => {
    var w1 = wei_str1.toString().slice(0, -12);
    var w2 = wei_str2.toString().slice(0, -12);
    assert.approximately(parseInt(w1), parseInt(w2), delta, message);
}
