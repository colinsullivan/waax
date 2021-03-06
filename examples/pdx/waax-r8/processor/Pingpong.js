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
 * WX.Pingpong
 */
WX._unit.pingpong = function (options) {
  // pre-building: processor wrapper
  WX._unit.processor.call(this);
  // building phase
  this._delayL = WX.context.createDelay();
  this._delayR = WX.context.createDelay();
  this._fbL = WX.context.createGain();
  this._fbR = WX.context.createGain();
  this._crosstalkL = WX.context.createGain();
  this._crosstalkR = WX.context.createGain();
  this._merger = WX.context.createChannelMerger(2);
  this._dry = WX.context.createGain();
  this._wet = WX.context.createGain();
  // source distribution
  this._inputGain.connect(this._delayL);
  this._inputGain.connect(this._delayR);
  this._inputGain.connect(this._dry);
  // interconnection: delay, fb, crosstalk
  this._delayL.connect(this._fbL);
  this._delayR.connect(this._fbR);
  this._fbL.connect(this._delayL);
  this._fbR.connect(this._delayR);
  this._fbL.connect(this._crosstalkR);
  this._fbR.connect(this._crosstalkL);
  this._crosstalkR.connect(this._delayR);
  this._crosstalkL.connect(this._delayL);
  // summing
  this._delayL.connect(this._merger, 0, 0);
  this._delayR.connect(this._merger, 0, 1);
  this._merger.connect(this._wet);
  this._dry.connect(this._outputGain);
  this._wet.connect(this._outputGain);
  // // post-building: parameter binding
  WX._unit.bindAudioParam.call(this, "delayTimeLeft", this._delayL.delayTime);
  WX._unit.bindAudioParam.call(this, "delayTimeRight", this._delayR.delayTime);
  WX._unit.bindAudioParam.call(this, "feedbackLeft", this._fbL.gain);
  WX._unit.bindAudioParam.call(this, "feedbackRight", this._fbR.gain);
  WX._unit.bindAudioParam.call(this, "crosstalkLeft", this._crosstalkL.gain);
  WX._unit.bindAudioParam.call(this, "crosstalkRight", this._crosstalkR.gain);
  WX._unit.bindAudioParam.call(this, "dry", this._dry.gain);
  WX._unit.bindAudioParam.call(this, "wet", this._wet.gain);
  // handling initial parameter : post-build
  this._initializeParams(options, this._default);
};

WX._unit.pingpong.prototype = {
  // this label will be appended automatically
  label: "pingpong",
  _default: {
    delayTimeLeft: 0.125,
    delayTimeRight: 0.250,
    feedback: 0.25,
    crosstalk: 0.1,
    mix: 0.5
  },
  delayTime: function (value, moment, type) {
    if (value !== undefined) {
      return this
        .delayTimeLeft(value, moment, type)
        .delayTimeRight(value, moment, type);
    } else {
      return [this.delayTimeLeft(), this.delayTimeRight()];
    }
  },
  crosstalk: function (value, moment, type) {
    if (value !== undefined) {
      return this
        .crosstalkLeft(value, moment, type)
        .crosstalkRight(value, moment, type);
    } else {
      return [this.crosstalkLeft(), this.crosstalkRight()];
    }
  },
  feedback: function(value, moment, type) {
    if (value !== undefined) {
      return this
        .feedbackLeft(value, moment, type)
        .feedbackRight(value, moment, type);
    } else {
      return [this.feedbackLeft(), this.feedbackRight()];
    }
  },
  mix: function (value, moment, type) {
    if (value !== undefined) {
      return this
        .dry(1.0 - value, moment, type)
        .wet(value, moment, type);
    } else {
      return this.wet();
    }
  }
};

WX._unit.extend(WX._unit.pingpong.prototype, WX._unit.processor.prototype);