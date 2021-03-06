/*
  Copyright 2013, Google Inc.
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are
  met:

      * Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following disclaimer
  in the documentation and/or other materials provided with the
  distribution.
      * Neither the name of Google Inc. nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


/**
 * WX.fader : WX.Fader
 * @file fader abstraction. supports mono and stereo (default) channel. 
 * @param {string} type "stereo (default)" or "mono" according to the incoming source.
 * @param {float} panner stereo panner. 0.0 (hard left) ~ 1.0 (hard right)
 * @param {float} gain fader gain in linear amplitude
 * @param {float} db fader gain in decibels
 * @param {boolean} mute mutes fader when true
 * @param {boolean} invert inverts signal when true
 */
WX._unit.fader = function (options) {
  // pre-building
  WX._unit.processor.call(this);
  // building
  this._inverter = WX.context.createGain();
  this._splitter = WX.context.createChannelSplitter(2);
  this._left = WX.context.createGain();
  this._right = WX.context.createGain();
  var merger = WX.context.createChannelMerger(2);
  // connection
  this._inputGain.connect(this._inverter);
  this._inverter.connect(this._splitter);
  this._left.connect(merger, 0, 0);
  this._right.connect(merger, 0, 1);
  merger.connect(this._outputGain);
  this._position = 0.0;
  // bind parameter
  WX._unit.bindAudioParam.call(this, "inputGain", this._inputGain.gain);
  WX._unit.bindAudioParam.call(this, "gainLeft", this._left.gain);
  WX._unit.bindAudioParam.call(this, "gainRight", this._right.gain);
  // handling initial parameter : post-build
  this._initializeParams(options, this._default);
};

WX._unit.fader.prototype = {

  label: "fader",
  _default: {
    type: "stereo",
    panner: 0.5,
    gain: 1.0
  },

  /**
   * set/get signal volume in decibels
   * @param  {float} decibel signal volume in decibels
   * @param  {float} moment target time
   * @param  {string} type transition type ("step", "linear", "exponential")
   * @return {float} signal volume in decibels (with no arguments)
   */
  db: function (decibel, moment, type) {
    if (decibel !== undefined) {
      return this.gain(WX.db2lin(decibel), moment, type);
    } else {
      return WX.lin2db(this.gain());
    }
  },


  mute: function (bool, moment) {
    if (typeof bool === "boolean") {
      var amp = (bool) ? 0.0 : 1.0;
      return this.inputGain(amp, moment);
    } else {
      return (this.inputGain() === 0.0) ? true : false;
    }
  },
  panner: function(pos, moment, type) {
    if (pos !== undefined) {
      // minmaxing & scaling
      var p = (Math.min(1.0, Math.max(0.0, pos)));
      this._position = p;
      this.gainLeft(Math.sqrt(p), moment, type);
      this.gainRight(Math.sqrt(1 - p), moment, type);
      return this;
    } else {
      return this._position;
    }
  },
  invert: function(bool, moment) {
    if (typeof bool === "boolean") {
      var phi = (bool) ? -1.0 : 1.0;
      this._inverter.gain.setValueAtTime(phi, (moment || WX.now));
      return this;
    } else {
      return (this._inverter.gain.value == -1.0) ? true : false;
    }
  },
  type: function(type) {
    // reset connection
    this._splitter.disconnect();
    // create connections
    if (type === "stereo") {
      this._splitter.connect(this._left, 0, 0);
      this._splitter.connect(this._right, 1, 0);
    } else {
      this._splitter.connect(this._left, 0, 0);
      this._splitter.connect(this._right, 0, 0);
    }
  }
};

WX._unit.extend(WX._unit.fader.prototype, WX._unit.processor.prototype);