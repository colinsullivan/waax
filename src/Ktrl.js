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
 * @namespace Ktrl
 * @version r1
 * @author Hongchan Choi (hoch, hongchan@google.com)
 */
Ktrl = (function() {

  // MIDI support flag
  var supportMIDI = true;

  // available MIDI sources (inputs) and targets (outputs)
  var sources = [];
  var targets = [];
  // target ID counter
  var targetId = 0;

  // on ready event function
  var onready = null;
  // system-ready flag
  var status = false;
  // version
  var version = "r1";

  if (typeof navigator.requestMIDIAccess === "undefined") {
    supportMIDI = false;
    //throw new Error("[Ktrl] your browser does not support Web MIDI API. Halt.");
  }

  /**
   * @class [internal] MIDI source (input port abstraction)
   * @param {MIDIInput} midiinput MIDI input from MIDIAccess instance
   */
  function MIDISource (midiinput) {
    this.input = midiinput;
    this.targets = [];
    var me = this;
    this.input.onmidimessage = function (e) {
      var c = me.targets.length;
      while (c--) {
        me.targets[c].ondata(e);
      }
    };
  }

  // class MIDISource prototype
  MIDISource.prototype = {

    constructor: MIDISource,

    /**
     * removes a target from the source
     * @param {object} target target object to be removed
     */
    removeTarget: function (target) {
      // traverse array looking for the target and remove when found
      var me = this;
      this.targets.map(function (t) {
        if (t === target) {
          var idx = me.targets.indexOf(target);
          me.targets.splice(idx, 1);
        }
      });
    },

    /**
     * adds a target to this source (creating a connection)
     * @param {object} target target object to be added
     */
    addTarget: function (target) {
      // if target already exists, ignore
      for(var i = 0; i < this.targets.length; ++i) {
        if (this.targets[i] === target) {
          post("duplicate target.");
          return;
        }
      }
      this.targets.push(target);
    }

  };

  /**
   * @class [internal] MIDI target (MIDI receiving end abstraction)
   */
  function MIDITarget (label) {
    this.id = targetId++;
    this.label = label || "Untitled";
    this.active = false;
    this.process = function () {};
    var me = this;
    this.ondata = function(e) {
      if (me.active) {
        me.process(e);
      }
    };
    targets.push(this);
  }

  // class MIDItarget prototype
  MIDITarget.prototype = {

    constructor: MIDITarget,

    /**
     * defines message handler for "on data" event
     * @param {function} fn MIDI data handler
     */
    onData: function (fn) {
      this.process = fn;
    },

    /**
     * activates the incoming data processing
     */
    activate: function () {
      this.active = true;
    },

    /**
     * disables the incoming data processing
     */
    disable: function () {
      this.active = false;
    },

    /**
     * get target's ID number
     * @return {int} unique target ID
     */
    getID: function () {
      return this.id;
    }

  };

  /**
   * [helper, factory] creates a new MIDI target
   * @return {object} MIDI target object
   */
  function createTarget (label) {
    return new MIDITarget(label);
  }

  /**
   * routes all sources to a target
   * @param  {object} target MIDI target
   * @return {boolean} result
   */
  function routeAllToTarget (target) {
    // NOTE: this won't work after closure compilation
    // if (target.constructor.name !== "MIDITarget") {
    //   post("invalid argument. (must use MIDITarget)");
    //   return false;
    // }
    // connect all sources to the target
    sources.map(function (s) {
      s.addTarget(target);
    });
    return true;
  }

  /**
   * routes a specific source to a target
   * @param  {int} sourceId MIDI source ID (see Ktrl.report() for available ID)
   * @param  {object} target MIDI target
   * @return {boolean} result
   */
  function routeSourceToTarget (sourceId, target) {
    // check id first
    if (sourceId < sources.length) {
      // remove target from all sources
      sources.map(function (s) {
        s.removeTarget(target);
      });
      // connect a source to target
      sources[sourceId].addTarget(target);
      return true;
    } else {
      post("invalid source id or target.");
      return false;
    }
  }

  /**
   * disconnect a target from all sources (while not removing)
   * @param  {MIDITarget} target a target to be disconnected
   * @return {boolean} result
   */
  function disconnectTarget (target) {
    // NOTE: this won't work after closure compilation
    // if (target.constructor.name !== "MIDITarget") {
    //   post("invalid argument. (must use MIDITarget)");
    //   return false;
    // }
    sources.map(function (s) {
      s.removeTarget(target);
    });
    return true;
  }

  /**
   * disconnect and remove a target from the system
   * @param  {MIDITarget} target a target to be disconnected
   * @return {boolean} result
   */
  function removeTarget (target) {
    // disconnect first
    if (Ktrl.disconnectTarget(target)) {
      // remove target from system wide target pool
      targets.map(function (t) {
        if (t === target) {
          var idx = targets.indexOf(target);
          targets.splice(idx, 1);
        }
      });
      return true;
    } else {
      return false;
    }
  }

  /**
   * [helper] defines onReady function
   * @param {function} fn user-defined function
   */
  function ready (fn) {
    if (typeof fn !== 'function') {
      post("invalid handler function.");
    } else {
      if (supportMIDI) {
        report();
      }
      onready = fn;
    }
  }

  /**
   * [helper] reports available input ports
   */
  function report () {
    var counter = 0;
    post("listing available MIDI sources...");
    sources.map(function (s) {
      console.log("source", counter++, "\t", s.input.name, "\t", s.input.manufacturer);
    });
    post("listing available MIDI targets...");
    targets.map(function (t) {
      console.log("target", t.id, "\t", t.label, "\t", t.active);
    });
  }

  /**
   * [helper] post message with the library tag
   * @param  {string} msg log message
   */
  function post (msg) {
    console.log("[ktrl] " + msg);
  }

  /**
   * [helper] parses MIDI message
   * @param  {array} midimsg 3-bytes MIDI message
   * @return {object} parsed MIDI message (see below for property names)
   *
   * ["noteoff", "noteon"]: { type, channel, pitch, velocity }
   * ["polypressure"]: { type, channel, pitch, pressure }
   * ["controlchange"]: { type, channel, control, value }
   * ["programchange"]: { type, channel, program }
   * ["channelpressure"]: { type, channel, pressure }
   * ["pitchwheel"]: { type, channel, wheel }
   */
  parse = function (midimsg) {
    var data = midimsg.data;
    var timestamp = midimsg.timeStamp * 0.001;
    var type = data[0] >> 4;
    var channel = (data[0] & 0x0F) + 1;
    var parsedData;
    switch (type) {
      case 8:
        parsedData = {
          type: "noteoff",
          channel: channel,
          pitch: data[1],
          velocity: data[2],
          timestamp: timestamp
        };
        break;
      case 9:
        parsedData = {
          type: "noteon",
          channel: channel,
          pitch: data[1],
          velocity: data[2],
          timestamp: timestamp
        };
        break;
      case 10:
        parsedData = {
          type: "polypressure",
          channel: channel,
          pitch: data[1],
          pressure: data[2],
          timestamp: timestamp
        };
        break;
      case 11:
        parsedData = {
          type: "controlchange",
          channel: channel,
          control: data[1],
          value: data[2],
          timestamp: timestamp
        };
        break;
      case 12:
        parsedData = {
          type: "programchange",
          channel: channel,
          program: data[1],
          timestamp: timestamp
        };
        break;
      case 13:
        parsedData = {
          type: "channelpressure",
          channel: channel,
          pressure: data[1],
          timestamp: timestamp
        };
        break;
      case 14:
        parsedData = {
          type: "pitchwheel",
          channel: channel,
          wheel: (data[1] << 8 | data[2]),
          timestamp: timestamp
        };
        break;
    }
    return parsedData;
  };

  // curve utilities
  var curves = {
    linear: new Array(128),
    smooth: new Array(128),
    smooth2: new Array(128),
    sqaured: new Array(128),
    cubed: new Array(128),
    invSquared: new Array(128),
    invCubed: new Array(128),
    sine: new Array(128),
    invSine: new Array(128)
  };

  // filling them up
  for (var i = 0; i < 128; i++) {
    var x = i / 127;
    curves.linear[i] = x;
    curves.smooth[i] = x * x * (3 - 2 * x);
    curves.smooth2[i] = curves.smooth[i] * curves.smooth[i] * (3 - 2 * curves.smooth[i]);
    curves.sqaured[i] = x * x;
    curves.cubed[i] = x * x * x;
    curves.invSquared[i] = 1 - (1 - x) * (1 - x);
    curves.invCubed[i] = 1 - (1 - x) * (1 - x) * (1 - x);
    curves.sine[i] = Math.sin(x * Math.PI / 2);
    curves.invSine[i] = 1.0 - Math.sin(x * Math.PI / 2 + Math.PI / 2);
  }

  /**
   * scaler
   */
  function scale (value, target0, target1) {
    return value * ((target1 || 1.0) - (target0 || 0.0)) + (target0 || 0.0);
  }

  function CurveLinear (MIDIValue) {
    return curves.linear[MIDIValue];
  }

  function CurveSmooth (MIDIValue) {
    return curves.smooth[MIDIValue];
  }

  function CurveSmooth2 (MIDIValue) {
    return curves.smooth2[MIDIValue];
  }

  function CurveSquared (MIDIValue) {
    return curves.sqaured[MIDIValue];
  }

  function CurveCubed (MIDIValue) {
    return curves.cubed[MIDIValue];
  }

  function CurveInvSquared (MIDIValue) {
    return curves.invSquared[MIDIValue];
  }

  function CurveInvCubed (MIDIValue) {
    return curves.invCubed[MIDIValue];
  }

  function CurveSine (MIDIValue) {
    return curves.sine[MIDIValue];
  }

  function CurveInvSine (MIDIValue) {
    return curves.invSine[MIDIValue];
  }

  /**
   * * MIDI note names (A0~C8) associated to MIDI pitch (21~108)
   * @memberOf WX
   * @type {int}
   */
  var NoteName = {
    A0: 21, B0: 23,
    C1: 24, D1: 26, E1: 28, F1: 29, G1: 31, A1: 33, B1: 35,
    C2: 36, D2: 38, E2: 40, F2: 41, G2: 43, A2: 45, B2: 47,
    C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
    C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71,
    C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83,
    C6: 84, D6: 86, E6: 88, F6: 89, G6: 91, A6: 93, B6: 95,
    C7: 96, D7: 98, E7: 100, F7: 101, G7: 103, A7: 105, B7: 107,
    C8: 108
  };

  // requestMIDIAccess is async, so this is needed sometimes...
  function _waitForOnReady () {
    if (typeof onready === 'function') {
      post("executing onReady!");
      onready();
    } else {
      post("onReady is not specified. Wait for it...");
      setTimeout(_waitForOnReady, 1000);
    }
  }

  // ENTRY POINT: scan input port and boot up
  if (supportMIDI) {
    navigator.requestMIDIAccess().then(function (midiAccess) {
      // check input ports
      if (midiAccess.inputs().length === 0) {
        post("no input ports available");
        return;
      }
      // creating MIDI sources
      for(var i = 0; i < midiAccess.inputs().length; ++i) {
        sources[i] = new MIDISource(midiAccess.inputs()[i]);
      }
      post("Ktrl (" + version + ") is ready.");
      status = true;
      // wait and execute onready
      _waitForOnReady();
    }, function (msg) {
      post("failed to get MIDI access: " + msg);
      status = false;
      return;
    });
  } else {
    post("Your browser does not support MIDI. Ktrl is inactive.");
  }


  // exposes handles
  return {
    createTarget: createTarget,
    removeTarget: removeTarget,
    disconnectTarget: disconnectTarget,
    routeAllToTarget: routeAllToTarget,
    routeSourceToTarget: routeSourceToTarget,
    ready: ready,
    parse: parse,
    report: report,
    scale: scale,
    CurveLinear : CurveLinear,
    CurveSmooth : CurveSmooth,
    CurveSmooth2 : CurveSmooth2,
    CurveSquared : CurveSquared,
    CurveCubed : CurveCubed,
    CurveInvSquared : CurveInvSquared,
    CurveInvCubed : CurveInvCubed,
    CurveSine : CurveSine,
    CurveInvSine : CurveInvSine,
    NoteName: NoteName
  };
})();

