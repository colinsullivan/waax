/**
 * builtin.js: pre-build noise, impulse train, step func
 */
(function() {
  // builtin namespace
  WX._builtin = {};
  var sr = WX.context.sampleRate,
      l = sr * 10;

  // creating white noise buffer source
  var wn = new Float32Array(l);
  WX._builtin.whitenoise = WX.context.createBuffer(1, l, sr);
  for(var i = 0; i < l; ++i) {
    wn[i] = Math.random() * 2.0 - 1;
  }
  WX._builtin.whitenoise.getChannelData(0).set(wn, 0);

  // creating impulse
  var it = new Float32Array(l);
  WX._builtin.impulse = WX.context.createBuffer(1, l, sr);
  it[0] = 1.0;
  for(var j = 1; j < l; ++j) {
    it[j] = 0;
  }
  WX._builtin.impulse.getChannelData(0).set(it, 0);

  // impulse wavetable (for wavetable or PeriodicWave)
  var it2 = new Float32Array(4096);
  var it3 = new Float32Array(4096);
  for (var a = 0; a < 4096; ++a) {
    it2[a] = 1.0;
    it3[a] = 0.0;
  }
  // TODO: it'll be replace with PeriodicWave
  WX._builtin.impulseWavelet = WX.context.createWaveTable(it2, it3);

  // step function (sr samples of 1.0)
  var st = new Float32Array(sr);
  WX._builtin.step = WX.context.createBuffer(1, sr, sr);
  for(var k = 0; k < sr; ++k) {
    st[k] = 1.0;
  }
  WX._builtin.step.getChannelData(0).set(st, 0);
})();