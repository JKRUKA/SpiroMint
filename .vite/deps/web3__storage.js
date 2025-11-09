import {
  __commonJS,
  __esm,
  __export,
  __toCommonJS,
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "node_modules/retry/lib/retry_operation.js"(exports2, module2) {
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      this._timer = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    module2.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts.slice(0);
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (this._timer) {
        clearTimeout(this._timer);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.push(err);
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(0, this._errors.length - 1);
          timeout = this._cachedTimeouts.slice(-1);
        } else {
          return false;
        }
      }
      var self2 = this;
      this._timer = setTimeout(function() {
        self2._attempts++;
        if (self2._operationTimeoutCb) {
          self2._timeout = setTimeout(function() {
            self2._operationTimeoutCb(self2._attempts);
          }, self2._operationTimeout);
          if (self2._options.unref) {
            self2._timeout.unref();
          }
        }
        self2._fn(self2._attempts);
      }, timeout);
      if (this._options.unref) {
        this._timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self2 = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self2._operationTimeoutCb();
        }, self2._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message = error.message;
        var count = (counts[message] || 0) + 1;
        counts[message] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "node_modules/retry/lib/retry.js"(exports2) {
    var RetryOperation = require_retry_operation();
    exports2.operation = function(options) {
      var timeouts = exports2.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && (options.forever || options.retries === Infinity),
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports2.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports2.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports2.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = (function retryWrapper(original2) {
          var op = exports2.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }).bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// node_modules/retry/index.js
var require_retry2 = __commonJS({
  "node_modules/retry/index.js"(exports2, module2) {
    module2.exports = require_retry();
  }
});

// node_modules/p-retry/index.js
var require_p_retry = __commonJS({
  "node_modules/p-retry/index.js"(exports2, module2) {
    "use strict";
    var retry = require_retry2();
    var networkErrorMsgs = [
      "Failed to fetch",
      // Chrome
      "NetworkError when attempting to fetch resource.",
      // Firefox
      "The Internet connection appears to be offline.",
      // Safari
      "Network request failed"
      // `cross-fetch`
    ];
    var AbortError2 = class extends Error {
      constructor(message) {
        super();
        if (message instanceof Error) {
          this.originalError = message;
          ({ message } = message);
        } else {
          this.originalError = new Error(message);
          this.originalError.stack = this.stack;
        }
        this.name = "AbortError";
        this.message = message;
      }
    };
    var decorateErrorWithCounts = (error, attemptNumber, options) => {
      const retriesLeft = options.retries - (attemptNumber - 1);
      error.attemptNumber = attemptNumber;
      error.retriesLeft = retriesLeft;
      return error;
    };
    var isNetworkError = (errorMessage) => networkErrorMsgs.includes(errorMessage);
    var pRetry2 = (input, options) => new Promise((resolve5, reject) => {
      options = {
        onFailedAttempt: () => {
        },
        retries: 10,
        ...options
      };
      const operation = retry.operation(options);
      operation.attempt(async (attemptNumber) => {
        try {
          resolve5(await input(attemptNumber));
        } catch (error) {
          if (!(error instanceof Error)) {
            reject(new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`));
            return;
          }
          if (error instanceof AbortError2) {
            operation.stop();
            reject(error.originalError);
          } else if (error instanceof TypeError && !isNetworkError(error.message)) {
            operation.stop();
            reject(error);
          } else {
            decorateErrorWithCounts(error, attemptNumber, options);
            try {
              await options.onFailedAttempt(error);
            } catch (error2) {
              reject(error2);
              return;
            }
            if (!operation.retry(error)) {
              reject(operation.mainError());
            }
          }
        }
      });
    });
    module2.exports = pRetry2;
    module2.exports.default = pRetry2;
    module2.exports.AbortError = AbortError2;
  }
});

// node_modules/it-last/index.js
var require_it_last = __commonJS({
  "node_modules/it-last/index.js"(exports2, module2) {
    "use strict";
    var last3 = async (source) => {
      let res;
      for await (const entry of source) {
        res = entry;
      }
      return res;
    };
    module2.exports = last3;
  }
});

// node_modules/it-pipe/index.js
var require_it_pipe = __commonJS({
  "node_modules/it-pipe/index.js"(exports2, module2) {
    var rawPipe = (...fns) => {
      let res;
      while (fns.length) {
        res = fns.shift()(res);
      }
      return res;
    };
    var isIterable2 = (obj) => obj && (typeof obj[Symbol.asyncIterator] === "function" || typeof obj[Symbol.iterator] === "function" || typeof obj.next === "function");
    var isDuplex = (obj) => obj && typeof obj.sink === "function" && isIterable2(obj.source);
    var duplexPipelineFn = (duplex) => (source) => {
      duplex.sink(source);
      return duplex.source;
    };
    var pipe2 = (...fns) => {
      if (isDuplex(fns[0])) {
        const duplex = fns[0];
        fns[0] = () => duplex.source;
      } else if (isIterable2(fns[0])) {
        const source = fns[0];
        fns[0] = () => source;
      }
      if (fns.length > 1) {
        if (isDuplex(fns[fns.length - 1])) {
          fns[fns.length - 1] = fns[fns.length - 1].sink;
        }
      }
      if (fns.length > 2) {
        for (let i = 1; i < fns.length - 1; i++) {
          if (isDuplex(fns[i])) {
            fns[i] = duplexPipelineFn(fns[i]);
          }
        }
      }
      return rawPipe(...fns);
    };
    module2.exports = pipe2;
    module2.exports.pipe = pipe2;
    module2.exports.rawPipe = rawPipe;
    module2.exports.isIterable = isIterable2;
    module2.exports.isDuplex = isDuplex;
  }
});

// node_modules/varint/encode.js
var require_encode = __commonJS({
  "node_modules/varint/encode.js"(exports2, module2) {
    module2.exports = encode10;
    var MSB2 = 128;
    var REST2 = 127;
    var MSBALL2 = ~REST2;
    var INT2 = Math.pow(2, 31);
    function encode10(num, out, offset) {
      if (Number.MAX_SAFE_INTEGER && num > Number.MAX_SAFE_INTEGER) {
        encode10.bytes = 0;
        throw new RangeError("Could not encode varint");
      }
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;
      while (num >= INT2) {
        out[offset++] = num & 255 | MSB2;
        num /= 128;
      }
      while (num & MSBALL2) {
        out[offset++] = num & 255 | MSB2;
        num >>>= 7;
      }
      out[offset] = num | 0;
      encode10.bytes = offset - oldOffset + 1;
      return out;
    }
  }
});

// node_modules/varint/decode.js
var require_decode = __commonJS({
  "node_modules/varint/decode.js"(exports2, module2) {
    module2.exports = read2;
    var MSB2 = 128;
    var REST2 = 127;
    function read2(buf2, offset) {
      var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf2.length;
      do {
        if (counter >= l || shift > 49) {
          read2.bytes = 0;
          throw new RangeError("Could not decode varint");
        }
        b = buf2[counter++];
        res += shift < 28 ? (b & REST2) << shift : (b & REST2) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB2);
      read2.bytes = counter - offset;
      return res;
    }
  }
});

// node_modules/varint/length.js
var require_length = __commonJS({
  "node_modules/varint/length.js"(exports2, module2) {
    var N12 = Math.pow(2, 7);
    var N22 = Math.pow(2, 14);
    var N32 = Math.pow(2, 21);
    var N42 = Math.pow(2, 28);
    var N52 = Math.pow(2, 35);
    var N62 = Math.pow(2, 42);
    var N72 = Math.pow(2, 49);
    var N82 = Math.pow(2, 56);
    var N92 = Math.pow(2, 63);
    module2.exports = function(value) {
      return value < N12 ? 1 : value < N22 ? 2 : value < N32 ? 3 : value < N42 ? 4 : value < N52 ? 5 : value < N62 ? 6 : value < N72 ? 7 : value < N82 ? 8 : value < N92 ? 9 : 10;
    };
  }
});

// node_modules/varint/index.js
var require_varint = __commonJS({
  "node_modules/varint/index.js"(exports2, module2) {
    module2.exports = {
      encode: require_encode(),
      decode: require_decode(),
      encodingLength: require_length()
    };
  }
});

// node_modules/multiformats/esm/vendor/varint.js
function encode(num, out, offset) {
  out = out || [];
  offset = offset || 0;
  var oldOffset = offset;
  while (num >= INT) {
    out[offset++] = num & 255 | MSB;
    num /= 128;
  }
  while (num & MSBALL) {
    out[offset++] = num & 255 | MSB;
    num >>>= 7;
  }
  out[offset] = num | 0;
  encode.bytes = offset - oldOffset + 1;
  return out;
}
function read(buf2, offset) {
  var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf2.length;
  do {
    if (counter >= l) {
      read.bytes = 0;
      throw new RangeError("Could not decode varint");
    }
    b = buf2[counter++];
    res += shift < 28 ? (b & REST$1) << shift : (b & REST$1) * Math.pow(2, shift);
    shift += 7;
  } while (b >= MSB$1);
  read.bytes = counter - offset;
  return res;
}
var encode_1, MSB, REST, MSBALL, INT, decode, MSB$1, REST$1, N1, N2, N3, N4, N5, N6, N7, N8, N9, length, varint, _brrp_varint, varint_default;
var init_varint = __esm({
  "node_modules/multiformats/esm/vendor/varint.js"() {
    encode_1 = encode;
    MSB = 128;
    REST = 127;
    MSBALL = ~REST;
    INT = Math.pow(2, 31);
    decode = read;
    MSB$1 = 128;
    REST$1 = 127;
    N1 = Math.pow(2, 7);
    N2 = Math.pow(2, 14);
    N3 = Math.pow(2, 21);
    N4 = Math.pow(2, 28);
    N5 = Math.pow(2, 35);
    N6 = Math.pow(2, 42);
    N7 = Math.pow(2, 49);
    N8 = Math.pow(2, 56);
    N9 = Math.pow(2, 63);
    length = function(value) {
      return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
    };
    varint = {
      encode: encode_1,
      decode,
      encodingLength: length
    };
    _brrp_varint = varint;
    varint_default = _brrp_varint;
  }
});

// node_modules/multiformats/esm/src/varint.js
var decode2, encodeTo, encodingLength;
var init_varint2 = __esm({
  "node_modules/multiformats/esm/src/varint.js"() {
    init_varint();
    decode2 = (data, offset = 0) => {
      const code6 = varint_default.decode(data, offset);
      return [
        code6,
        varint_default.decode.bytes
      ];
    };
    encodeTo = (int, target, offset = 0) => {
      varint_default.encode(int, target, offset);
      return target;
    };
    encodingLength = (int) => {
      return varint_default.encodingLength(int);
    };
  }
});

// node_modules/multiformats/esm/src/bytes.js
var bytes_exports = {};
__export(bytes_exports, {
  coerce: () => coerce,
  empty: () => empty,
  equals: () => equals,
  fromHex: () => fromHex,
  fromString: () => fromString,
  isBinary: () => isBinary,
  toHex: () => toHex,
  toString: () => toString
});
var empty, toHex, fromHex, equals, coerce, isBinary, fromString, toString;
var init_bytes = __esm({
  "node_modules/multiformats/esm/src/bytes.js"() {
    empty = new Uint8Array(0);
    toHex = (d) => d.reduce((hex, byte) => hex + byte.toString(16).padStart(2, "0"), "");
    fromHex = (hex) => {
      const hexes = hex.match(/../g);
      return hexes ? new Uint8Array(hexes.map((b) => parseInt(b, 16))) : empty;
    };
    equals = (aa, bb) => {
      if (aa === bb)
        return true;
      if (aa.byteLength !== bb.byteLength) {
        return false;
      }
      for (let ii = 0; ii < aa.byteLength; ii++) {
        if (aa[ii] !== bb[ii]) {
          return false;
        }
      }
      return true;
    };
    coerce = (o) => {
      if (o instanceof Uint8Array && o.constructor.name === "Uint8Array")
        return o;
      if (o instanceof ArrayBuffer)
        return new Uint8Array(o);
      if (ArrayBuffer.isView(o)) {
        return new Uint8Array(o.buffer, o.byteOffset, o.byteLength);
      }
      throw new Error("Unknown type, must be binary type");
    };
    isBinary = (o) => o instanceof ArrayBuffer || ArrayBuffer.isView(o);
    fromString = (str) => new TextEncoder().encode(str);
    toString = (b) => new TextDecoder().decode(b);
  }
});

// node_modules/multiformats/esm/src/hashes/digest.js
var create, decode3, equals2, Digest;
var init_digest = __esm({
  "node_modules/multiformats/esm/src/hashes/digest.js"() {
    init_bytes();
    init_varint2();
    create = (code6, digest2) => {
      const size = digest2.byteLength;
      const sizeOffset = encodingLength(code6);
      const digestOffset = sizeOffset + encodingLength(size);
      const bytes = new Uint8Array(digestOffset + size);
      encodeTo(code6, bytes, 0);
      encodeTo(size, bytes, sizeOffset);
      bytes.set(digest2, digestOffset);
      return new Digest(code6, size, digest2, bytes);
    };
    decode3 = (multihash) => {
      const bytes = coerce(multihash);
      const [code6, sizeOffset] = decode2(bytes);
      const [size, digestOffset] = decode2(bytes.subarray(sizeOffset));
      const digest2 = bytes.subarray(sizeOffset + digestOffset);
      if (digest2.byteLength !== size) {
        throw new Error("Incorrect length");
      }
      return new Digest(code6, size, digest2, bytes);
    };
    equals2 = (a, b) => {
      if (a === b) {
        return true;
      } else {
        return a.code === b.code && a.size === b.size && equals(a.bytes, b.bytes);
      }
    };
    Digest = class {
      constructor(code6, size, digest2, bytes) {
        this.code = code6;
        this.size = size;
        this.digest = digest2;
        this.bytes = bytes;
      }
    };
  }
});

// node_modules/multiformats/esm/vendor/base-x.js
function base(ALPHABET, name5) {
  if (ALPHABET.length >= 255) {
    throw new TypeError("Alphabet too long");
  }
  var BASE_MAP = new Uint8Array(256);
  for (var j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255;
  }
  for (var i = 0; i < ALPHABET.length; i++) {
    var x = ALPHABET.charAt(i);
    var xc = x.charCodeAt(0);
    if (BASE_MAP[xc] !== 255) {
      throw new TypeError(x + " is ambiguous");
    }
    BASE_MAP[xc] = i;
  }
  var BASE = ALPHABET.length;
  var LEADER = ALPHABET.charAt(0);
  var FACTOR = Math.log(BASE) / Math.log(256);
  var iFACTOR = Math.log(256) / Math.log(BASE);
  function encode10(source) {
    if (source instanceof Uint8Array) ;
    else if (ArrayBuffer.isView(source)) {
      source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else if (Array.isArray(source)) {
      source = Uint8Array.from(source);
    }
    if (!(source instanceof Uint8Array)) {
      throw new TypeError("Expected Uint8Array");
    }
    if (source.length === 0) {
      return "";
    }
    var zeroes = 0;
    var length2 = 0;
    var pbegin = 0;
    var pend = source.length;
    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++;
      zeroes++;
    }
    var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
    var b58 = new Uint8Array(size);
    while (pbegin !== pend) {
      var carry = source[pbegin];
      var i2 = 0;
      for (var it1 = size - 1; (carry !== 0 || i2 < length2) && it1 !== -1; it1--, i2++) {
        carry += 256 * b58[it1] >>> 0;
        b58[it1] = carry % BASE >>> 0;
        carry = carry / BASE >>> 0;
      }
      if (carry !== 0) {
        throw new Error("Non-zero carry");
      }
      length2 = i2;
      pbegin++;
    }
    var it2 = size - length2;
    while (it2 !== size && b58[it2] === 0) {
      it2++;
    }
    var str = LEADER.repeat(zeroes);
    for (; it2 < size; ++it2) {
      str += ALPHABET.charAt(b58[it2]);
    }
    return str;
  }
  function decodeUnsafe(source) {
    if (typeof source !== "string") {
      throw new TypeError("Expected String");
    }
    if (source.length === 0) {
      return new Uint8Array();
    }
    var psz = 0;
    if (source[psz] === " ") {
      return;
    }
    var zeroes = 0;
    var length2 = 0;
    while (source[psz] === LEADER) {
      zeroes++;
      psz++;
    }
    var size = (source.length - psz) * FACTOR + 1 >>> 0;
    var b256 = new Uint8Array(size);
    while (source[psz]) {
      var carry = BASE_MAP[source.charCodeAt(psz)];
      if (carry === 255) {
        return;
      }
      var i2 = 0;
      for (var it3 = size - 1; (carry !== 0 || i2 < length2) && it3 !== -1; it3--, i2++) {
        carry += BASE * b256[it3] >>> 0;
        b256[it3] = carry % 256 >>> 0;
        carry = carry / 256 >>> 0;
      }
      if (carry !== 0) {
        throw new Error("Non-zero carry");
      }
      length2 = i2;
      psz++;
    }
    if (source[psz] === " ") {
      return;
    }
    var it4 = size - length2;
    while (it4 !== size && b256[it4] === 0) {
      it4++;
    }
    var vch = new Uint8Array(zeroes + (size - it4));
    var j2 = zeroes;
    while (it4 !== size) {
      vch[j2++] = b256[it4++];
    }
    return vch;
  }
  function decode11(string2) {
    var buffer2 = decodeUnsafe(string2);
    if (buffer2) {
      return buffer2;
    }
    throw new Error(`Non-${name5} character`);
  }
  return {
    encode: encode10,
    decodeUnsafe,
    decode: decode11
  };
}
var src, _brrp__multiformats_scope_baseX, base_x_default;
var init_base_x = __esm({
  "node_modules/multiformats/esm/vendor/base-x.js"() {
    src = base;
    _brrp__multiformats_scope_baseX = src;
    base_x_default = _brrp__multiformats_scope_baseX;
  }
});

// node_modules/multiformats/esm/src/bases/base.js
var Encoder, Decoder, ComposedDecoder, or, Codec, from, baseX, decode4, encode2, rfc4648;
var init_base = __esm({
  "node_modules/multiformats/esm/src/bases/base.js"() {
    init_base_x();
    init_bytes();
    Encoder = class {
      constructor(name5, prefix, baseEncode) {
        this.name = name5;
        this.prefix = prefix;
        this.baseEncode = baseEncode;
      }
      encode(bytes) {
        if (bytes instanceof Uint8Array) {
          return `${this.prefix}${this.baseEncode(bytes)}`;
        } else {
          throw Error("Unknown type, must be binary type");
        }
      }
    };
    Decoder = class {
      constructor(name5, prefix, baseDecode) {
        this.name = name5;
        this.prefix = prefix;
        if (prefix.codePointAt(0) === void 0) {
          throw new Error("Invalid prefix character");
        }
        this.prefixCodePoint = prefix.codePointAt(0);
        this.baseDecode = baseDecode;
      }
      decode(text) {
        if (typeof text === "string") {
          if (text.codePointAt(0) !== this.prefixCodePoint) {
            throw Error(`Unable to decode multibase string ${JSON.stringify(text)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
          }
          return this.baseDecode(text.slice(this.prefix.length));
        } else {
          throw Error("Can only multibase decode strings");
        }
      }
      or(decoder) {
        return or(this, decoder);
      }
    };
    ComposedDecoder = class {
      constructor(decoders) {
        this.decoders = decoders;
      }
      or(decoder) {
        return or(this, decoder);
      }
      decode(input) {
        const prefix = input[0];
        const decoder = this.decoders[prefix];
        if (decoder) {
          return decoder.decode(input);
        } else {
          throw RangeError(`Unable to decode multibase string ${JSON.stringify(input)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
        }
      }
    };
    or = (left, right) => new ComposedDecoder({
      ...left.decoders || { [left.prefix]: left },
      ...right.decoders || { [right.prefix]: right }
    });
    Codec = class {
      constructor(name5, prefix, baseEncode, baseDecode) {
        this.name = name5;
        this.prefix = prefix;
        this.baseEncode = baseEncode;
        this.baseDecode = baseDecode;
        this.encoder = new Encoder(name5, prefix, baseEncode);
        this.decoder = new Decoder(name5, prefix, baseDecode);
      }
      encode(input) {
        return this.encoder.encode(input);
      }
      decode(input) {
        return this.decoder.decode(input);
      }
    };
    from = ({ name: name5, prefix, encode: encode10, decode: decode11 }) => new Codec(name5, prefix, encode10, decode11);
    baseX = ({ prefix, name: name5, alphabet: alphabet2 }) => {
      const { encode: encode10, decode: decode11 } = base_x_default(alphabet2, name5);
      return from({
        prefix,
        name: name5,
        encode: encode10,
        decode: (text) => coerce(decode11(text))
      });
    };
    decode4 = (string2, alphabet2, bitsPerChar, name5) => {
      const codes = {};
      for (let i = 0; i < alphabet2.length; ++i) {
        codes[alphabet2[i]] = i;
      }
      let end = string2.length;
      while (string2[end - 1] === "=") {
        --end;
      }
      const out = new Uint8Array(end * bitsPerChar / 8 | 0);
      let bits = 0;
      let buffer2 = 0;
      let written = 0;
      for (let i = 0; i < end; ++i) {
        const value = codes[string2[i]];
        if (value === void 0) {
          throw new SyntaxError(`Non-${name5} character`);
        }
        buffer2 = buffer2 << bitsPerChar | value;
        bits += bitsPerChar;
        if (bits >= 8) {
          bits -= 8;
          out[written++] = 255 & buffer2 >> bits;
        }
      }
      if (bits >= bitsPerChar || 255 & buffer2 << 8 - bits) {
        throw new SyntaxError("Unexpected end of data");
      }
      return out;
    };
    encode2 = (data, alphabet2, bitsPerChar) => {
      const pad = alphabet2[alphabet2.length - 1] === "=";
      const mask = (1 << bitsPerChar) - 1;
      let out = "";
      let bits = 0;
      let buffer2 = 0;
      for (let i = 0; i < data.length; ++i) {
        buffer2 = buffer2 << 8 | data[i];
        bits += 8;
        while (bits > bitsPerChar) {
          bits -= bitsPerChar;
          out += alphabet2[mask & buffer2 >> bits];
        }
      }
      if (bits) {
        out += alphabet2[mask & buffer2 << bitsPerChar - bits];
      }
      if (pad) {
        while (out.length * bitsPerChar & 7) {
          out += "=";
        }
      }
      return out;
    };
    rfc4648 = ({ name: name5, prefix, bitsPerChar, alphabet: alphabet2 }) => {
      return from({
        prefix,
        name: name5,
        encode(input) {
          return encode2(input, alphabet2, bitsPerChar);
        },
        decode(input) {
          return decode4(input, alphabet2, bitsPerChar, name5);
        }
      });
    };
  }
});

// node_modules/multiformats/esm/src/bases/base58.js
var base58_exports = {};
__export(base58_exports, {
  base58btc: () => base58btc,
  base58flickr: () => base58flickr
});
var base58btc, base58flickr;
var init_base58 = __esm({
  "node_modules/multiformats/esm/src/bases/base58.js"() {
    init_base();
    base58btc = baseX({
      name: "base58btc",
      prefix: "z",
      alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    });
    base58flickr = baseX({
      name: "base58flickr",
      prefix: "Z",
      alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
    });
  }
});

// node_modules/multiformats/esm/src/bases/base32.js
var base32_exports = {};
__export(base32_exports, {
  base32: () => base32,
  base32hex: () => base32hex,
  base32hexpad: () => base32hexpad,
  base32hexpadupper: () => base32hexpadupper,
  base32hexupper: () => base32hexupper,
  base32pad: () => base32pad,
  base32padupper: () => base32padupper,
  base32upper: () => base32upper,
  base32z: () => base32z
});
var base32, base32upper, base32pad, base32padupper, base32hex, base32hexupper, base32hexpad, base32hexpadupper, base32z;
var init_base32 = __esm({
  "node_modules/multiformats/esm/src/bases/base32.js"() {
    init_base();
    base32 = rfc4648({
      prefix: "b",
      name: "base32",
      alphabet: "abcdefghijklmnopqrstuvwxyz234567",
      bitsPerChar: 5
    });
    base32upper = rfc4648({
      prefix: "B",
      name: "base32upper",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
      bitsPerChar: 5
    });
    base32pad = rfc4648({
      prefix: "c",
      name: "base32pad",
      alphabet: "abcdefghijklmnopqrstuvwxyz234567=",
      bitsPerChar: 5
    });
    base32padupper = rfc4648({
      prefix: "C",
      name: "base32padupper",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
      bitsPerChar: 5
    });
    base32hex = rfc4648({
      prefix: "v",
      name: "base32hex",
      alphabet: "0123456789abcdefghijklmnopqrstuv",
      bitsPerChar: 5
    });
    base32hexupper = rfc4648({
      prefix: "V",
      name: "base32hexupper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
      bitsPerChar: 5
    });
    base32hexpad = rfc4648({
      prefix: "t",
      name: "base32hexpad",
      alphabet: "0123456789abcdefghijklmnopqrstuv=",
      bitsPerChar: 5
    });
    base32hexpadupper = rfc4648({
      prefix: "T",
      name: "base32hexpadupper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
      bitsPerChar: 5
    });
    base32z = rfc4648({
      prefix: "h",
      name: "base32z",
      alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769",
      bitsPerChar: 5
    });
  }
});

// node_modules/multiformats/esm/src/cid.js
var CID, parseCIDtoBytes, toStringV0, toStringV1, DAG_PB_CODE, SHA_256_CODE, encodeCID, cidSymbol, readonly, hidden, version, deprecate, IS_CID_DEPRECATION;
var init_cid = __esm({
  "node_modules/multiformats/esm/src/cid.js"() {
    init_varint2();
    init_digest();
    init_base58();
    init_base32();
    init_bytes();
    CID = class _CID {
      constructor(version2, code6, multihash, bytes) {
        this.code = code6;
        this.version = version2;
        this.multihash = multihash;
        this.bytes = bytes;
        this.byteOffset = bytes.byteOffset;
        this.byteLength = bytes.byteLength;
        this.asCID = this;
        this._baseCache = /* @__PURE__ */ new Map();
        Object.defineProperties(this, {
          byteOffset: hidden,
          byteLength: hidden,
          code: readonly,
          version: readonly,
          multihash: readonly,
          bytes: readonly,
          _baseCache: hidden,
          asCID: hidden
        });
      }
      toV0() {
        switch (this.version) {
          case 0: {
            return this;
          }
          default: {
            const { code: code6, multihash } = this;
            if (code6 !== DAG_PB_CODE) {
              throw new Error("Cannot convert a non dag-pb CID to CIDv0");
            }
            if (multihash.code !== SHA_256_CODE) {
              throw new Error("Cannot convert non sha2-256 multihash CID to CIDv0");
            }
            return _CID.createV0(multihash);
          }
        }
      }
      toV1() {
        switch (this.version) {
          case 0: {
            const { code: code6, digest: digest2 } = this.multihash;
            const multihash = create(code6, digest2);
            return _CID.createV1(this.code, multihash);
          }
          case 1: {
            return this;
          }
          default: {
            throw Error(`Can not convert CID version ${this.version} to version 0. This is a bug please report`);
          }
        }
      }
      equals(other) {
        return other && this.code === other.code && this.version === other.version && equals2(this.multihash, other.multihash);
      }
      toString(base3) {
        const { bytes, version: version2, _baseCache } = this;
        switch (version2) {
          case 0:
            return toStringV0(bytes, _baseCache, base3 || base58btc.encoder);
          default:
            return toStringV1(bytes, _baseCache, base3 || base32.encoder);
        }
      }
      toJSON() {
        return {
          code: this.code,
          version: this.version,
          hash: this.multihash.bytes
        };
      }
      get [Symbol.toStringTag]() {
        return "CID";
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return "CID(" + this.toString() + ")";
      }
      static isCID(value) {
        deprecate(/^0\.0/, IS_CID_DEPRECATION);
        return !!(value && (value[cidSymbol] || value.asCID === value));
      }
      get toBaseEncodedString() {
        throw new Error("Deprecated, use .toString()");
      }
      get codec() {
        throw new Error('"codec" property is deprecated, use integer "code" property instead');
      }
      get buffer() {
        throw new Error("Deprecated .buffer property, use .bytes to get Uint8Array instead");
      }
      get multibaseName() {
        throw new Error('"multibaseName" property is deprecated');
      }
      get prefix() {
        throw new Error('"prefix" property is deprecated');
      }
      static asCID(value) {
        if (value instanceof _CID) {
          return value;
        } else if (value != null && value.asCID === value) {
          const { version: version2, code: code6, multihash, bytes } = value;
          return new _CID(version2, code6, multihash, bytes || encodeCID(version2, code6, multihash.bytes));
        } else if (value != null && value[cidSymbol] === true) {
          const { version: version2, multihash, code: code6 } = value;
          const digest2 = decode3(multihash);
          return _CID.create(version2, code6, digest2);
        } else {
          return null;
        }
      }
      static create(version2, code6, digest2) {
        if (typeof code6 !== "number") {
          throw new Error("String codecs are no longer supported");
        }
        switch (version2) {
          case 0: {
            if (code6 !== DAG_PB_CODE) {
              throw new Error(`Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`);
            } else {
              return new _CID(version2, code6, digest2, digest2.bytes);
            }
          }
          case 1: {
            const bytes = encodeCID(version2, code6, digest2.bytes);
            return new _CID(version2, code6, digest2, bytes);
          }
          default: {
            throw new Error("Invalid version");
          }
        }
      }
      static createV0(digest2) {
        return _CID.create(0, DAG_PB_CODE, digest2);
      }
      static createV1(code6, digest2) {
        return _CID.create(1, code6, digest2);
      }
      static decode(bytes) {
        const [cid, remainder] = _CID.decodeFirst(bytes);
        if (remainder.length) {
          throw new Error("Incorrect length");
        }
        return cid;
      }
      static decodeFirst(bytes) {
        const specs = _CID.inspectBytes(bytes);
        const prefixSize = specs.size - specs.multihashSize;
        const multihashBytes = coerce(bytes.subarray(prefixSize, prefixSize + specs.multihashSize));
        if (multihashBytes.byteLength !== specs.multihashSize) {
          throw new Error("Incorrect length");
        }
        const digestBytes = multihashBytes.subarray(specs.multihashSize - specs.digestSize);
        const digest2 = new Digest(specs.multihashCode, specs.digestSize, digestBytes, multihashBytes);
        const cid = specs.version === 0 ? _CID.createV0(digest2) : _CID.createV1(specs.codec, digest2);
        return [
          cid,
          bytes.subarray(specs.size)
        ];
      }
      static inspectBytes(initialBytes) {
        let offset = 0;
        const next = () => {
          const [i, length2] = decode2(initialBytes.subarray(offset));
          offset += length2;
          return i;
        };
        let version2 = next();
        let codec = DAG_PB_CODE;
        if (version2 === 18) {
          version2 = 0;
          offset = 0;
        } else if (version2 === 1) {
          codec = next();
        }
        if (version2 !== 0 && version2 !== 1) {
          throw new RangeError(`Invalid CID version ${version2}`);
        }
        const prefixSize = offset;
        const multihashCode = next();
        const digestSize = next();
        const size = offset + digestSize;
        const multihashSize = size - prefixSize;
        return {
          version: version2,
          codec,
          multihashCode,
          digestSize,
          multihashSize,
          size
        };
      }
      static parse(source, base3) {
        const [prefix, bytes] = parseCIDtoBytes(source, base3);
        const cid = _CID.decode(bytes);
        cid._baseCache.set(prefix, source);
        return cid;
      }
    };
    parseCIDtoBytes = (source, base3) => {
      switch (source[0]) {
        case "Q": {
          const decoder = base3 || base58btc;
          return [
            base58btc.prefix,
            decoder.decode(`${base58btc.prefix}${source}`)
          ];
        }
        case base58btc.prefix: {
          const decoder = base3 || base58btc;
          return [
            base58btc.prefix,
            decoder.decode(source)
          ];
        }
        case base32.prefix: {
          const decoder = base3 || base32;
          return [
            base32.prefix,
            decoder.decode(source)
          ];
        }
        default: {
          if (base3 == null) {
            throw Error("To parse non base32 or base58btc encoded CID multibase decoder must be provided");
          }
          return [
            source[0],
            base3.decode(source)
          ];
        }
      }
    };
    toStringV0 = (bytes, cache, base3) => {
      const { prefix } = base3;
      if (prefix !== base58btc.prefix) {
        throw Error(`Cannot string encode V0 in ${base3.name} encoding`);
      }
      const cid = cache.get(prefix);
      if (cid == null) {
        const cid2 = base3.encode(bytes).slice(1);
        cache.set(prefix, cid2);
        return cid2;
      } else {
        return cid;
      }
    };
    toStringV1 = (bytes, cache, base3) => {
      const { prefix } = base3;
      const cid = cache.get(prefix);
      if (cid == null) {
        const cid2 = base3.encode(bytes);
        cache.set(prefix, cid2);
        return cid2;
      } else {
        return cid;
      }
    };
    DAG_PB_CODE = 112;
    SHA_256_CODE = 18;
    encodeCID = (version2, code6, multihash) => {
      const codeOffset = encodingLength(version2);
      const hashOffset = codeOffset + encodingLength(code6);
      const bytes = new Uint8Array(hashOffset + multihash.byteLength);
      encodeTo(version2, bytes, 0);
      encodeTo(code6, bytes, codeOffset);
      bytes.set(multihash, hashOffset);
      return bytes;
    };
    cidSymbol = Symbol.for("@ipld/js-cid/CID");
    readonly = {
      writable: false,
      configurable: false,
      enumerable: true
    };
    hidden = {
      writable: false,
      enumerable: false,
      configurable: false
    };
    version = "0.0.0-dev";
    deprecate = (range, message) => {
      if (range.test(version)) {
        console.warn(message);
      } else {
        throw new Error(message);
      }
    };
    IS_CID_DEPRECATION = `CID.isCID(v) is deprecated and will be removed in the next major release.
Following code pattern:

if (CID.isCID(value)) {
  doSomethingWithCID(value)
}

Is replaced with:

const cid = CID.asCID(value)
if (cid) {
  // Make sure to use cid instead of value
  doSomethingWithCID(cid)
}
`;
  }
});

// node_modules/it-batch/index.js
var require_it_batch = __commonJS({
  "node_modules/it-batch/index.js"(exports2, module2) {
    "use strict";
    async function* batch3(source, size = 1) {
      let things = [];
      if (size < 1) {
        size = 1;
      }
      for await (const thing of source) {
        things.push(thing);
        while (things.length >= size) {
          yield things.slice(0, size);
          things = things.slice(size);
        }
      }
      while (things.length) {
        yield things.slice(0, size);
        things = things.slice(size);
      }
    }
    module2.exports = batch3;
  }
});

// node_modules/it-parallel-batch/index.js
var require_it_parallel_batch = __commonJS({
  "node_modules/it-parallel-batch/index.js"(exports2, module2) {
    "use strict";
    var batch3 = require_it_batch();
    async function* parallelBatch3(source, size = 1) {
      for await (const tasks of batch3(source, size)) {
        const things = tasks.map(
          /**
           * @param {() => Promise<T>} p
           */
          (p) => {
            return p().then((value) => ({ ok: true, value }), (err) => ({ ok: false, err }));
          }
        );
        for (let i = 0; i < things.length; i++) {
          const result = await things[i];
          if (result.ok) {
            yield result.value;
          } else {
            throw result.err;
          }
        }
      }
    }
    module2.exports = parallelBatch3;
  }
});

// node_modules/is-plain-obj/index.js
var require_is_plain_obj = __commonJS({
  "node_modules/is-plain-obj/index.js"(exports2, module2) {
    "use strict";
    module2.exports = (value) => {
      if (Object.prototype.toString.call(value) !== "[object Object]") {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === null || prototype === Object.prototype;
    };
  }
});

// node_modules/merge-options/index.js
var require_merge_options = __commonJS({
  "node_modules/merge-options/index.js"(exports2, module2) {
    "use strict";
    var isOptionObject = require_is_plain_obj();
    var { hasOwnProperty } = Object.prototype;
    var { propertyIsEnumerable } = Object;
    var defineProperty = (object, name5, value) => Object.defineProperty(object, name5, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
    var globalThis2 = exports2;
    var defaultMergeOptions = {
      concatArrays: false,
      ignoreUndefined: false
    };
    var getEnumerableOwnPropertyKeys = (value) => {
      const keys = [];
      for (const key in value) {
        if (hasOwnProperty.call(value, key)) {
          keys.push(key);
        }
      }
      if (Object.getOwnPropertySymbols) {
        const symbols = Object.getOwnPropertySymbols(value);
        for (const symbol of symbols) {
          if (propertyIsEnumerable.call(value, symbol)) {
            keys.push(symbol);
          }
        }
      }
      return keys;
    };
    function clone(value) {
      if (Array.isArray(value)) {
        return cloneArray(value);
      }
      if (isOptionObject(value)) {
        return cloneOptionObject(value);
      }
      return value;
    }
    function cloneArray(array) {
      const result = array.slice(0, 0);
      getEnumerableOwnPropertyKeys(array).forEach((key) => {
        defineProperty(result, key, clone(array[key]));
      });
      return result;
    }
    function cloneOptionObject(object) {
      const result = Object.getPrototypeOf(object) === null ? /* @__PURE__ */ Object.create(null) : {};
      getEnumerableOwnPropertyKeys(object).forEach((key) => {
        defineProperty(result, key, clone(object[key]));
      });
      return result;
    }
    var mergeKeys = (merged, source, keys, config) => {
      keys.forEach((key) => {
        if (typeof source[key] === "undefined" && config.ignoreUndefined) {
          return;
        }
        if (key in merged && merged[key] !== Object.getPrototypeOf(merged)) {
          defineProperty(merged, key, merge(merged[key], source[key], config));
        } else {
          defineProperty(merged, key, clone(source[key]));
        }
      });
      return merged;
    };
    var concatArrays = (merged, source, config) => {
      let result = merged.slice(0, 0);
      let resultIndex = 0;
      [merged, source].forEach((array) => {
        const indices = [];
        for (let k = 0; k < array.length; k++) {
          if (!hasOwnProperty.call(array, k)) {
            continue;
          }
          indices.push(String(k));
          if (array === merged) {
            defineProperty(result, resultIndex++, array[k]);
          } else {
            defineProperty(result, resultIndex++, clone(array[k]));
          }
        }
        result = mergeKeys(result, array, getEnumerableOwnPropertyKeys(array).filter((key) => !indices.includes(key)), config);
      });
      return result;
    };
    function merge(merged, source, config) {
      if (config.concatArrays && Array.isArray(merged) && Array.isArray(source)) {
        return concatArrays(merged, source, config);
      }
      if (!isOptionObject(source) || !isOptionObject(merged)) {
        return clone(source);
      }
      return mergeKeys(merged, source, getEnumerableOwnPropertyKeys(source), config);
    }
    module2.exports = function(...options) {
      const config = merge(clone(defaultMergeOptions), this !== globalThis2 && this || {}, defaultMergeOptions);
      let merged = { _: {} };
      for (const option of options) {
        if (option === void 0) {
          continue;
        }
        if (!isOptionObject(option)) {
          throw new TypeError("`" + option + "` is not an Option Object");
        }
        merged = merge(merged, { _: option }, config);
      }
      return merged._;
    };
  }
});

// node_modules/multiformats/esm/src/hashes/hasher.js
var from2, Hasher;
var init_hasher = __esm({
  "node_modules/multiformats/esm/src/hashes/hasher.js"() {
    init_digest();
    from2 = ({ name: name5, code: code6, encode: encode10 }) => new Hasher(name5, code6, encode10);
    Hasher = class {
      constructor(name5, code6, encode10) {
        this.name = name5;
        this.code = code6;
        this.encode = encode10;
      }
      digest(input) {
        if (input instanceof Uint8Array) {
          const result = this.encode(input);
          return result instanceof Uint8Array ? create(this.code, result) : result.then((digest2) => create(this.code, digest2));
        } else {
          throw Error("Unknown type, must be binary type");
        }
      }
    };
  }
});

// node_modules/multiformats/esm/src/hashes/sha2-browser.js
var sha2_browser_exports = {};
__export(sha2_browser_exports, {
  sha256: () => sha256,
  sha512: () => sha512
});
var sha, sha256, sha512;
var init_sha2_browser = __esm({
  "node_modules/multiformats/esm/src/hashes/sha2-browser.js"() {
    init_hasher();
    sha = (name5) => async (data) => new Uint8Array(await crypto.subtle.digest(name5, data));
    sha256 = from2({
      name: "sha2-256",
      code: 18,
      encode: sha("SHA-256")
    });
    sha512 = from2({
      name: "sha2-512",
      code: 19,
      encode: sha("SHA-512")
    });
  }
});

// node_modules/multiformats/esm/src/index.js
var init_src = __esm({
  "node_modules/multiformats/esm/src/index.js"() {
    init_cid();
    init_varint2();
    init_bytes();
    init_hasher();
    init_digest();
  }
});

// node_modules/murmurhash3js-revisited/lib/murmurHash3js.js
var require_murmurHash3js = __commonJS({
  "node_modules/murmurhash3js-revisited/lib/murmurHash3js.js"(exports2, module2) {
    (function(root, undefined2) {
      "use strict";
      var library = {
        "version": "3.0.0",
        "x86": {},
        "x64": {},
        "inputValidation": true
      };
      function _validBytes(bytes) {
        if (!Array.isArray(bytes) && !ArrayBuffer.isView(bytes)) {
          return false;
        }
        for (var i = 0; i < bytes.length; i++) {
          if (!Number.isInteger(bytes[i]) || bytes[i] < 0 || bytes[i] > 255) {
            return false;
          }
        }
        return true;
      }
      function _x86Multiply(m, n) {
        return (m & 65535) * n + (((m >>> 16) * n & 65535) << 16);
      }
      function _x86Rotl(m, n) {
        return m << n | m >>> 32 - n;
      }
      function _x86Fmix(h) {
        h ^= h >>> 16;
        h = _x86Multiply(h, 2246822507);
        h ^= h >>> 13;
        h = _x86Multiply(h, 3266489909);
        h ^= h >>> 16;
        return h;
      }
      function _x64Add(m, n) {
        m = [m[0] >>> 16, m[0] & 65535, m[1] >>> 16, m[1] & 65535];
        n = [n[0] >>> 16, n[0] & 65535, n[1] >>> 16, n[1] & 65535];
        var o = [0, 0, 0, 0];
        o[3] += m[3] + n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 65535;
        o[2] += m[2] + n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 65535;
        o[1] += m[1] + n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 65535;
        o[0] += m[0] + n[0];
        o[0] &= 65535;
        return [o[0] << 16 | o[1], o[2] << 16 | o[3]];
      }
      function _x64Multiply(m, n) {
        m = [m[0] >>> 16, m[0] & 65535, m[1] >>> 16, m[1] & 65535];
        n = [n[0] >>> 16, n[0] & 65535, n[1] >>> 16, n[1] & 65535];
        var o = [0, 0, 0, 0];
        o[3] += m[3] * n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 65535;
        o[2] += m[2] * n[3];
        o[1] += o[2] >>> 16;
        o[2] &= 65535;
        o[2] += m[3] * n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 65535;
        o[1] += m[1] * n[3];
        o[0] += o[1] >>> 16;
        o[1] &= 65535;
        o[1] += m[2] * n[2];
        o[0] += o[1] >>> 16;
        o[1] &= 65535;
        o[1] += m[3] * n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 65535;
        o[0] += m[0] * n[3] + m[1] * n[2] + m[2] * n[1] + m[3] * n[0];
        o[0] &= 65535;
        return [o[0] << 16 | o[1], o[2] << 16 | o[3]];
      }
      function _x64Rotl(m, n) {
        n %= 64;
        if (n === 32) {
          return [m[1], m[0]];
        } else if (n < 32) {
          return [m[0] << n | m[1] >>> 32 - n, m[1] << n | m[0] >>> 32 - n];
        } else {
          n -= 32;
          return [m[1] << n | m[0] >>> 32 - n, m[0] << n | m[1] >>> 32 - n];
        }
      }
      function _x64LeftShift(m, n) {
        n %= 64;
        if (n === 0) {
          return m;
        } else if (n < 32) {
          return [m[0] << n | m[1] >>> 32 - n, m[1] << n];
        } else {
          return [m[1] << n - 32, 0];
        }
      }
      function _x64Xor(m, n) {
        return [m[0] ^ n[0], m[1] ^ n[1]];
      }
      function _x64Fmix(h) {
        h = _x64Xor(h, [0, h[0] >>> 1]);
        h = _x64Multiply(h, [4283543511, 3981806797]);
        h = _x64Xor(h, [0, h[0] >>> 1]);
        h = _x64Multiply(h, [3301882366, 444984403]);
        h = _x64Xor(h, [0, h[0] >>> 1]);
        return h;
      }
      library.x86.hash32 = function(bytes, seed) {
        if (library.inputValidation && !_validBytes(bytes)) {
          return undefined2;
        }
        seed = seed || 0;
        var remainder = bytes.length % 4;
        var blocks = bytes.length - remainder;
        var h1 = seed;
        var k1 = 0;
        var c1 = 3432918353;
        var c2 = 461845907;
        for (var i = 0; i < blocks; i = i + 4) {
          k1 = bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24;
          k1 = _x86Multiply(k1, c1);
          k1 = _x86Rotl(k1, 15);
          k1 = _x86Multiply(k1, c2);
          h1 ^= k1;
          h1 = _x86Rotl(h1, 13);
          h1 = _x86Multiply(h1, 5) + 3864292196;
        }
        k1 = 0;
        switch (remainder) {
          case 3:
            k1 ^= bytes[i + 2] << 16;
          case 2:
            k1 ^= bytes[i + 1] << 8;
          case 1:
            k1 ^= bytes[i];
            k1 = _x86Multiply(k1, c1);
            k1 = _x86Rotl(k1, 15);
            k1 = _x86Multiply(k1, c2);
            h1 ^= k1;
        }
        h1 ^= bytes.length;
        h1 = _x86Fmix(h1);
        return h1 >>> 0;
      };
      library.x86.hash128 = function(bytes, seed) {
        if (library.inputValidation && !_validBytes(bytes)) {
          return undefined2;
        }
        seed = seed || 0;
        var remainder = bytes.length % 16;
        var blocks = bytes.length - remainder;
        var h1 = seed;
        var h2 = seed;
        var h3 = seed;
        var h4 = seed;
        var k1 = 0;
        var k2 = 0;
        var k3 = 0;
        var k4 = 0;
        var c1 = 597399067;
        var c2 = 2869860233;
        var c3 = 951274213;
        var c4 = 2716044179;
        for (var i = 0; i < blocks; i = i + 16) {
          k1 = bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24;
          k2 = bytes[i + 4] | bytes[i + 5] << 8 | bytes[i + 6] << 16 | bytes[i + 7] << 24;
          k3 = bytes[i + 8] | bytes[i + 9] << 8 | bytes[i + 10] << 16 | bytes[i + 11] << 24;
          k4 = bytes[i + 12] | bytes[i + 13] << 8 | bytes[i + 14] << 16 | bytes[i + 15] << 24;
          k1 = _x86Multiply(k1, c1);
          k1 = _x86Rotl(k1, 15);
          k1 = _x86Multiply(k1, c2);
          h1 ^= k1;
          h1 = _x86Rotl(h1, 19);
          h1 += h2;
          h1 = _x86Multiply(h1, 5) + 1444728091;
          k2 = _x86Multiply(k2, c2);
          k2 = _x86Rotl(k2, 16);
          k2 = _x86Multiply(k2, c3);
          h2 ^= k2;
          h2 = _x86Rotl(h2, 17);
          h2 += h3;
          h2 = _x86Multiply(h2, 5) + 197830471;
          k3 = _x86Multiply(k3, c3);
          k3 = _x86Rotl(k3, 17);
          k3 = _x86Multiply(k3, c4);
          h3 ^= k3;
          h3 = _x86Rotl(h3, 15);
          h3 += h4;
          h3 = _x86Multiply(h3, 5) + 2530024501;
          k4 = _x86Multiply(k4, c4);
          k4 = _x86Rotl(k4, 18);
          k4 = _x86Multiply(k4, c1);
          h4 ^= k4;
          h4 = _x86Rotl(h4, 13);
          h4 += h1;
          h4 = _x86Multiply(h4, 5) + 850148119;
        }
        k1 = 0;
        k2 = 0;
        k3 = 0;
        k4 = 0;
        switch (remainder) {
          case 15:
            k4 ^= bytes[i + 14] << 16;
          case 14:
            k4 ^= bytes[i + 13] << 8;
          case 13:
            k4 ^= bytes[i + 12];
            k4 = _x86Multiply(k4, c4);
            k4 = _x86Rotl(k4, 18);
            k4 = _x86Multiply(k4, c1);
            h4 ^= k4;
          case 12:
            k3 ^= bytes[i + 11] << 24;
          case 11:
            k3 ^= bytes[i + 10] << 16;
          case 10:
            k3 ^= bytes[i + 9] << 8;
          case 9:
            k3 ^= bytes[i + 8];
            k3 = _x86Multiply(k3, c3);
            k3 = _x86Rotl(k3, 17);
            k3 = _x86Multiply(k3, c4);
            h3 ^= k3;
          case 8:
            k2 ^= bytes[i + 7] << 24;
          case 7:
            k2 ^= bytes[i + 6] << 16;
          case 6:
            k2 ^= bytes[i + 5] << 8;
          case 5:
            k2 ^= bytes[i + 4];
            k2 = _x86Multiply(k2, c2);
            k2 = _x86Rotl(k2, 16);
            k2 = _x86Multiply(k2, c3);
            h2 ^= k2;
          case 4:
            k1 ^= bytes[i + 3] << 24;
          case 3:
            k1 ^= bytes[i + 2] << 16;
          case 2:
            k1 ^= bytes[i + 1] << 8;
          case 1:
            k1 ^= bytes[i];
            k1 = _x86Multiply(k1, c1);
            k1 = _x86Rotl(k1, 15);
            k1 = _x86Multiply(k1, c2);
            h1 ^= k1;
        }
        h1 ^= bytes.length;
        h2 ^= bytes.length;
        h3 ^= bytes.length;
        h4 ^= bytes.length;
        h1 += h2;
        h1 += h3;
        h1 += h4;
        h2 += h1;
        h3 += h1;
        h4 += h1;
        h1 = _x86Fmix(h1);
        h2 = _x86Fmix(h2);
        h3 = _x86Fmix(h3);
        h4 = _x86Fmix(h4);
        h1 += h2;
        h1 += h3;
        h1 += h4;
        h2 += h1;
        h3 += h1;
        h4 += h1;
        return ("00000000" + (h1 >>> 0).toString(16)).slice(-8) + ("00000000" + (h2 >>> 0).toString(16)).slice(-8) + ("00000000" + (h3 >>> 0).toString(16)).slice(-8) + ("00000000" + (h4 >>> 0).toString(16)).slice(-8);
      };
      library.x64.hash128 = function(bytes, seed) {
        if (library.inputValidation && !_validBytes(bytes)) {
          return undefined2;
        }
        seed = seed || 0;
        var remainder = bytes.length % 16;
        var blocks = bytes.length - remainder;
        var h1 = [0, seed];
        var h2 = [0, seed];
        var k1 = [0, 0];
        var k2 = [0, 0];
        var c1 = [2277735313, 289559509];
        var c2 = [1291169091, 658871167];
        for (var i = 0; i < blocks; i = i + 16) {
          k1 = [bytes[i + 4] | bytes[i + 5] << 8 | bytes[i + 6] << 16 | bytes[i + 7] << 24, bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24];
          k2 = [bytes[i + 12] | bytes[i + 13] << 8 | bytes[i + 14] << 16 | bytes[i + 15] << 24, bytes[i + 8] | bytes[i + 9] << 8 | bytes[i + 10] << 16 | bytes[i + 11] << 24];
          k1 = _x64Multiply(k1, c1);
          k1 = _x64Rotl(k1, 31);
          k1 = _x64Multiply(k1, c2);
          h1 = _x64Xor(h1, k1);
          h1 = _x64Rotl(h1, 27);
          h1 = _x64Add(h1, h2);
          h1 = _x64Add(_x64Multiply(h1, [0, 5]), [0, 1390208809]);
          k2 = _x64Multiply(k2, c2);
          k2 = _x64Rotl(k2, 33);
          k2 = _x64Multiply(k2, c1);
          h2 = _x64Xor(h2, k2);
          h2 = _x64Rotl(h2, 31);
          h2 = _x64Add(h2, h1);
          h2 = _x64Add(_x64Multiply(h2, [0, 5]), [0, 944331445]);
        }
        k1 = [0, 0];
        k2 = [0, 0];
        switch (remainder) {
          case 15:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 14]], 48));
          case 14:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 13]], 40));
          case 13:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 12]], 32));
          case 12:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 11]], 24));
          case 11:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 10]], 16));
          case 10:
            k2 = _x64Xor(k2, _x64LeftShift([0, bytes[i + 9]], 8));
          case 9:
            k2 = _x64Xor(k2, [0, bytes[i + 8]]);
            k2 = _x64Multiply(k2, c2);
            k2 = _x64Rotl(k2, 33);
            k2 = _x64Multiply(k2, c1);
            h2 = _x64Xor(h2, k2);
          case 8:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 7]], 56));
          case 7:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 6]], 48));
          case 6:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 5]], 40));
          case 5:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 4]], 32));
          case 4:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 3]], 24));
          case 3:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 2]], 16));
          case 2:
            k1 = _x64Xor(k1, _x64LeftShift([0, bytes[i + 1]], 8));
          case 1:
            k1 = _x64Xor(k1, [0, bytes[i]]);
            k1 = _x64Multiply(k1, c1);
            k1 = _x64Rotl(k1, 31);
            k1 = _x64Multiply(k1, c2);
            h1 = _x64Xor(h1, k1);
        }
        h1 = _x64Xor(h1, [0, bytes.length]);
        h2 = _x64Xor(h2, [0, bytes.length]);
        h1 = _x64Add(h1, h2);
        h2 = _x64Add(h2, h1);
        h1 = _x64Fmix(h1);
        h2 = _x64Fmix(h2);
        h1 = _x64Add(h1, h2);
        h2 = _x64Add(h2, h1);
        return ("00000000" + (h1[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h1[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[1] >>> 0).toString(16)).slice(-8);
      };
      if (typeof exports2 !== "undefined") {
        if (typeof module2 !== "undefined" && module2.exports) {
          exports2 = module2.exports = library;
        }
        exports2.murmurHash3 = library;
      } else if (typeof define === "function" && define.amd) {
        define([], function() {
          return library;
        });
      } else {
        library._murmurHash3 = root.murmurHash3;
        library.noConflict = function() {
          root.murmurHash3 = library._murmurHash3;
          library._murmurHash3 = undefined2;
          library.noConflict = undefined2;
          return library;
        };
        root.murmurHash3 = library;
      }
    })(exports2);
  }
});

// node_modules/murmurhash3js-revisited/index.js
var require_murmurhash3js_revisited = __commonJS({
  "node_modules/murmurhash3js-revisited/index.js"(exports2, module2) {
    module2.exports = require_murmurHash3js();
  }
});

// node_modules/err-code/index.js
var require_err_code = __commonJS({
  "node_modules/err-code/index.js"(exports2, module2) {
    "use strict";
    function assign(obj, props) {
      for (const key in props) {
        Object.defineProperty(obj, key, {
          value: props[key],
          enumerable: true,
          configurable: true
        });
      }
      return obj;
    }
    function createError(err, code6, props) {
      if (!err || typeof err === "string") {
        throw new TypeError("Please pass an Error to err-code");
      }
      if (!props) {
        props = {};
      }
      if (typeof code6 === "object") {
        props = code6;
        code6 = "";
      }
      if (code6) {
        props.code = code6;
      }
      try {
        return assign(err, props);
      } catch (_) {
        props.message = err.message;
        props.stack = err.stack;
        const ErrClass = function() {
        };
        ErrClass.prototype = Object.create(Object.getPrototypeOf(err));
        const output = assign(new ErrClass(), props);
        return output;
      }
    }
    module2.exports = createError;
  }
});

// node_modules/@protobufjs/aspromise/index.js
var require_aspromise = __commonJS({
  "node_modules/@protobufjs/aspromise/index.js"(exports2, module2) {
    "use strict";
    module2.exports = asPromise;
    function asPromise(fn, ctx) {
      var params = new Array(arguments.length - 1), offset = 0, index = 2, pending = true;
      while (index < arguments.length)
        params[offset++] = arguments[index++];
      return new Promise(function executor(resolve5, reject) {
        params[offset] = function callback(err) {
          if (pending) {
            pending = false;
            if (err)
              reject(err);
            else {
              var params2 = new Array(arguments.length - 1), offset2 = 0;
              while (offset2 < params2.length)
                params2[offset2++] = arguments[offset2];
              resolve5.apply(null, params2);
            }
          }
        };
        try {
          fn.apply(ctx || null, params);
        } catch (err) {
          if (pending) {
            pending = false;
            reject(err);
          }
        }
      });
    }
  }
});

// node_modules/@protobufjs/base64/index.js
var require_base64 = __commonJS({
  "node_modules/@protobufjs/base64/index.js"(exports2) {
    "use strict";
    var base642 = exports2;
    base642.length = function length2(string2) {
      var p = string2.length;
      if (!p)
        return 0;
      var n = 0;
      while (--p % 4 > 1 && string2.charAt(p) === "=")
        ++n;
      return Math.ceil(string2.length * 3) / 4 - n;
    };
    var b64 = new Array(64);
    var s64 = new Array(123);
    for (i = 0; i < 64; )
      s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;
    var i;
    base642.encode = function encode10(buffer2, start, end) {
      var parts = null, chunk = [];
      var i2 = 0, j = 0, t;
      while (start < end) {
        var b = buffer2[start++];
        switch (j) {
          case 0:
            chunk[i2++] = b64[b >> 2];
            t = (b & 3) << 4;
            j = 1;
            break;
          case 1:
            chunk[i2++] = b64[t | b >> 4];
            t = (b & 15) << 2;
            j = 2;
            break;
          case 2:
            chunk[i2++] = b64[t | b >> 6];
            chunk[i2++] = b64[b & 63];
            j = 0;
            break;
        }
        if (i2 > 8191) {
          (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
          i2 = 0;
        }
      }
      if (j) {
        chunk[i2++] = b64[t];
        chunk[i2++] = 61;
        if (j === 1)
          chunk[i2++] = 61;
      }
      if (parts) {
        if (i2)
          parts.push(String.fromCharCode.apply(String, chunk.slice(0, i2)));
        return parts.join("");
      }
      return String.fromCharCode.apply(String, chunk.slice(0, i2));
    };
    var invalidEncoding = "invalid encoding";
    base642.decode = function decode11(string2, buffer2, offset) {
      var start = offset;
      var j = 0, t;
      for (var i2 = 0; i2 < string2.length; ) {
        var c = string2.charCodeAt(i2++);
        if (c === 61 && j > 1)
          break;
        if ((c = s64[c]) === void 0)
          throw Error(invalidEncoding);
        switch (j) {
          case 0:
            t = c;
            j = 1;
            break;
          case 1:
            buffer2[offset++] = t << 2 | (c & 48) >> 4;
            t = c;
            j = 2;
            break;
          case 2:
            buffer2[offset++] = (t & 15) << 4 | (c & 60) >> 2;
            t = c;
            j = 3;
            break;
          case 3:
            buffer2[offset++] = (t & 3) << 6 | c;
            j = 0;
            break;
        }
      }
      if (j === 1)
        throw Error(invalidEncoding);
      return offset - start;
    };
    base642.test = function test(string2) {
      return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string2);
    };
  }
});

// node_modules/@protobufjs/eventemitter/index.js
var require_eventemitter = __commonJS({
  "node_modules/@protobufjs/eventemitter/index.js"(exports2, module2) {
    "use strict";
    module2.exports = EventEmitter;
    function EventEmitter() {
      this._listeners = {};
    }
    EventEmitter.prototype.on = function on(evt, fn, ctx) {
      (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn,
        ctx: ctx || this
      });
      return this;
    };
    EventEmitter.prototype.off = function off(evt, fn) {
      if (evt === void 0)
        this._listeners = {};
      else {
        if (fn === void 0)
          this._listeners[evt] = [];
        else {
          var listeners = this._listeners[evt];
          for (var i = 0; i < listeners.length; )
            if (listeners[i].fn === fn)
              listeners.splice(i, 1);
            else
              ++i;
        }
      }
      return this;
    };
    EventEmitter.prototype.emit = function emit(evt) {
      var listeners = this._listeners[evt];
      if (listeners) {
        var args = [], i = 1;
        for (; i < arguments.length; )
          args.push(arguments[i++]);
        for (i = 0; i < listeners.length; )
          listeners[i].fn.apply(listeners[i++].ctx, args);
      }
      return this;
    };
  }
});

// node_modules/@protobufjs/float/index.js
var require_float = __commonJS({
  "node_modules/@protobufjs/float/index.js"(exports2, module2) {
    "use strict";
    module2.exports = factory(factory);
    function factory(exports3) {
      if (typeof Float32Array !== "undefined") (function() {
        var f32 = new Float32Array([-0]), f8b = new Uint8Array(f32.buffer), le = f8b[3] === 128;
        function writeFloat_f32_cpy(val, buf2, pos) {
          f32[0] = val;
          buf2[pos] = f8b[0];
          buf2[pos + 1] = f8b[1];
          buf2[pos + 2] = f8b[2];
          buf2[pos + 3] = f8b[3];
        }
        function writeFloat_f32_rev(val, buf2, pos) {
          f32[0] = val;
          buf2[pos] = f8b[3];
          buf2[pos + 1] = f8b[2];
          buf2[pos + 2] = f8b[1];
          buf2[pos + 3] = f8b[0];
        }
        exports3.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        exports3.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;
        function readFloat_f32_cpy(buf2, pos) {
          f8b[0] = buf2[pos];
          f8b[1] = buf2[pos + 1];
          f8b[2] = buf2[pos + 2];
          f8b[3] = buf2[pos + 3];
          return f32[0];
        }
        function readFloat_f32_rev(buf2, pos) {
          f8b[3] = buf2[pos];
          f8b[2] = buf2[pos + 1];
          f8b[1] = buf2[pos + 2];
          f8b[0] = buf2[pos + 3];
          return f32[0];
        }
        exports3.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        exports3.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;
      })();
      else (function() {
        function writeFloat_ieee754(writeUint, val, buf2, pos) {
          var sign = val < 0 ? 1 : 0;
          if (sign)
            val = -val;
          if (val === 0)
            writeUint(1 / val > 0 ? (
              /* positive */
              0
            ) : (
              /* negative 0 */
              2147483648
            ), buf2, pos);
          else if (isNaN(val))
            writeUint(2143289344, buf2, pos);
          else if (val > 34028234663852886e22)
            writeUint((sign << 31 | 2139095040) >>> 0, buf2, pos);
          else if (val < 11754943508222875e-54)
            writeUint((sign << 31 | Math.round(val / 1401298464324817e-60)) >>> 0, buf2, pos);
          else {
            var exponent = Math.floor(Math.log(val) / Math.LN2), mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
            writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf2, pos);
          }
        }
        exports3.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports3.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);
        function readFloat_ieee754(readUint, buf2, pos) {
          var uint = readUint(buf2, pos), sign = (uint >> 31) * 2 + 1, exponent = uint >>> 23 & 255, mantissa = uint & 8388607;
          return exponent === 255 ? mantissa ? NaN : sign * Infinity : exponent === 0 ? sign * 1401298464324817e-60 * mantissa : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }
        exports3.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports3.readFloatBE = readFloat_ieee754.bind(null, readUintBE);
      })();
      if (typeof Float64Array !== "undefined") (function() {
        var f64 = new Float64Array([-0]), f8b = new Uint8Array(f64.buffer), le = f8b[7] === 128;
        function writeDouble_f64_cpy(val, buf2, pos) {
          f64[0] = val;
          buf2[pos] = f8b[0];
          buf2[pos + 1] = f8b[1];
          buf2[pos + 2] = f8b[2];
          buf2[pos + 3] = f8b[3];
          buf2[pos + 4] = f8b[4];
          buf2[pos + 5] = f8b[5];
          buf2[pos + 6] = f8b[6];
          buf2[pos + 7] = f8b[7];
        }
        function writeDouble_f64_rev(val, buf2, pos) {
          f64[0] = val;
          buf2[pos] = f8b[7];
          buf2[pos + 1] = f8b[6];
          buf2[pos + 2] = f8b[5];
          buf2[pos + 3] = f8b[4];
          buf2[pos + 4] = f8b[3];
          buf2[pos + 5] = f8b[2];
          buf2[pos + 6] = f8b[1];
          buf2[pos + 7] = f8b[0];
        }
        exports3.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        exports3.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;
        function readDouble_f64_cpy(buf2, pos) {
          f8b[0] = buf2[pos];
          f8b[1] = buf2[pos + 1];
          f8b[2] = buf2[pos + 2];
          f8b[3] = buf2[pos + 3];
          f8b[4] = buf2[pos + 4];
          f8b[5] = buf2[pos + 5];
          f8b[6] = buf2[pos + 6];
          f8b[7] = buf2[pos + 7];
          return f64[0];
        }
        function readDouble_f64_rev(buf2, pos) {
          f8b[7] = buf2[pos];
          f8b[6] = buf2[pos + 1];
          f8b[5] = buf2[pos + 2];
          f8b[4] = buf2[pos + 3];
          f8b[3] = buf2[pos + 4];
          f8b[2] = buf2[pos + 5];
          f8b[1] = buf2[pos + 6];
          f8b[0] = buf2[pos + 7];
          return f64[0];
        }
        exports3.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        exports3.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;
      })();
      else (function() {
        function writeDouble_ieee754(writeUint, off0, off1, val, buf2, pos) {
          var sign = val < 0 ? 1 : 0;
          if (sign)
            val = -val;
          if (val === 0) {
            writeUint(0, buf2, pos + off0);
            writeUint(1 / val > 0 ? (
              /* positive */
              0
            ) : (
              /* negative 0 */
              2147483648
            ), buf2, pos + off1);
          } else if (isNaN(val)) {
            writeUint(0, buf2, pos + off0);
            writeUint(2146959360, buf2, pos + off1);
          } else if (val > 17976931348623157e292) {
            writeUint(0, buf2, pos + off0);
            writeUint((sign << 31 | 2146435072) >>> 0, buf2, pos + off1);
          } else {
            var mantissa;
            if (val < 22250738585072014e-324) {
              mantissa = val / 5e-324;
              writeUint(mantissa >>> 0, buf2, pos + off0);
              writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf2, pos + off1);
            } else {
              var exponent = Math.floor(Math.log(val) / Math.LN2);
              if (exponent === 1024)
                exponent = 1023;
              mantissa = val * Math.pow(2, -exponent);
              writeUint(mantissa * 4503599627370496 >>> 0, buf2, pos + off0);
              writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf2, pos + off1);
            }
          }
        }
        exports3.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports3.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);
        function readDouble_ieee754(readUint, off0, off1, buf2, pos) {
          var lo = readUint(buf2, pos + off0), hi = readUint(buf2, pos + off1);
          var sign = (hi >> 31) * 2 + 1, exponent = hi >>> 20 & 2047, mantissa = 4294967296 * (hi & 1048575) + lo;
          return exponent === 2047 ? mantissa ? NaN : sign * Infinity : exponent === 0 ? sign * 5e-324 * mantissa : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }
        exports3.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports3.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);
      })();
      return exports3;
    }
    function writeUintLE(val, buf2, pos) {
      buf2[pos] = val & 255;
      buf2[pos + 1] = val >>> 8 & 255;
      buf2[pos + 2] = val >>> 16 & 255;
      buf2[pos + 3] = val >>> 24;
    }
    function writeUintBE(val, buf2, pos) {
      buf2[pos] = val >>> 24;
      buf2[pos + 1] = val >>> 16 & 255;
      buf2[pos + 2] = val >>> 8 & 255;
      buf2[pos + 3] = val & 255;
    }
    function readUintLE(buf2, pos) {
      return (buf2[pos] | buf2[pos + 1] << 8 | buf2[pos + 2] << 16 | buf2[pos + 3] << 24) >>> 0;
    }
    function readUintBE(buf2, pos) {
      return (buf2[pos] << 24 | buf2[pos + 1] << 16 | buf2[pos + 2] << 8 | buf2[pos + 3]) >>> 0;
    }
  }
});

// node_modules/@protobufjs/inquire/index.js
var require_inquire = __commonJS({
  "node_modules/@protobufjs/inquire/index.js"(exports, module) {
    "use strict";
    module.exports = inquire;
    function inquire(moduleName) {
      try {
        var mod = eval("quire".replace(/^/, "re"))(moduleName);
        if (mod && (mod.length || Object.keys(mod).length))
          return mod;
      } catch (e) {
      }
      return null;
    }
  }
});

// node_modules/@protobufjs/utf8/index.js
var require_utf8 = __commonJS({
  "node_modules/@protobufjs/utf8/index.js"(exports2) {
    "use strict";
    var utf8 = exports2;
    utf8.length = function utf8_length(string2) {
      var len = 0, c = 0;
      for (var i = 0; i < string2.length; ++i) {
        c = string2.charCodeAt(i);
        if (c < 128)
          len += 1;
        else if (c < 2048)
          len += 2;
        else if ((c & 64512) === 55296 && (string2.charCodeAt(i + 1) & 64512) === 56320) {
          ++i;
          len += 4;
        } else
          len += 3;
      }
      return len;
    };
    utf8.read = function utf8_read(buffer2, start, end) {
      var len = end - start;
      if (len < 1)
        return "";
      var parts = null, chunk = [], i = 0, t;
      while (start < end) {
        t = buffer2[start++];
        if (t < 128)
          chunk[i++] = t;
        else if (t > 191 && t < 224)
          chunk[i++] = (t & 31) << 6 | buffer2[start++] & 63;
        else if (t > 239 && t < 365) {
          t = ((t & 7) << 18 | (buffer2[start++] & 63) << 12 | (buffer2[start++] & 63) << 6 | buffer2[start++] & 63) - 65536;
          chunk[i++] = 55296 + (t >> 10);
          chunk[i++] = 56320 + (t & 1023);
        } else
          chunk[i++] = (t & 15) << 12 | (buffer2[start++] & 63) << 6 | buffer2[start++] & 63;
        if (i > 8191) {
          (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
          i = 0;
        }
      }
      if (parts) {
        if (i)
          parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
      }
      return String.fromCharCode.apply(String, chunk.slice(0, i));
    };
    utf8.write = function utf8_write(string2, buffer2, offset) {
      var start = offset, c1, c2;
      for (var i = 0; i < string2.length; ++i) {
        c1 = string2.charCodeAt(i);
        if (c1 < 128) {
          buffer2[offset++] = c1;
        } else if (c1 < 2048) {
          buffer2[offset++] = c1 >> 6 | 192;
          buffer2[offset++] = c1 & 63 | 128;
        } else if ((c1 & 64512) === 55296 && ((c2 = string2.charCodeAt(i + 1)) & 64512) === 56320) {
          c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
          ++i;
          buffer2[offset++] = c1 >> 18 | 240;
          buffer2[offset++] = c1 >> 12 & 63 | 128;
          buffer2[offset++] = c1 >> 6 & 63 | 128;
          buffer2[offset++] = c1 & 63 | 128;
        } else {
          buffer2[offset++] = c1 >> 12 | 224;
          buffer2[offset++] = c1 >> 6 & 63 | 128;
          buffer2[offset++] = c1 & 63 | 128;
        }
      }
      return offset - start;
    };
  }
});

// node_modules/@protobufjs/pool/index.js
var require_pool = __commonJS({
  "node_modules/@protobufjs/pool/index.js"(exports2, module2) {
    "use strict";
    module2.exports = pool;
    function pool(alloc2, slice2, size) {
      var SIZE = size || 8192;
      var MAX = SIZE >>> 1;
      var slab = null;
      var offset = SIZE;
      return function pool_alloc(size2) {
        if (size2 < 1 || size2 > MAX)
          return alloc2(size2);
        if (offset + size2 > SIZE) {
          slab = alloc2(SIZE);
          offset = 0;
        }
        var buf2 = slice2.call(slab, offset, offset += size2);
        if (offset & 7)
          offset = (offset | 7) + 1;
        return buf2;
      };
    }
  }
});

// node_modules/protobufjs/src/util/longbits.js
var require_longbits = __commonJS({
  "node_modules/protobufjs/src/util/longbits.js"(exports2, module2) {
    "use strict";
    module2.exports = LongBits;
    var util = require_minimal();
    function LongBits(lo, hi) {
      this.lo = lo >>> 0;
      this.hi = hi >>> 0;
    }
    var zero = LongBits.zero = new LongBits(0, 0);
    zero.toNumber = function() {
      return 0;
    };
    zero.zzEncode = zero.zzDecode = function() {
      return this;
    };
    zero.length = function() {
      return 1;
    };
    var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";
    LongBits.fromNumber = function fromNumber(value) {
      if (value === 0)
        return zero;
      var sign = value < 0;
      if (sign)
        value = -value;
      var lo = value >>> 0, hi = (value - lo) / 4294967296 >>> 0;
      if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
          lo = 0;
          if (++hi > 4294967295)
            hi = 0;
        }
      }
      return new LongBits(lo, hi);
    };
    LongBits.from = function from3(value) {
      if (typeof value === "number")
        return LongBits.fromNumber(value);
      if (util.isString(value)) {
        if (util.Long)
          value = util.Long.fromString(value);
        else
          return LongBits.fromNumber(parseInt(value, 10));
      }
      return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
    };
    LongBits.prototype.toNumber = function toNumber(unsigned) {
      if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0, hi = ~this.hi >>> 0;
        if (!lo)
          hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
      }
      return this.lo + this.hi * 4294967296;
    };
    LongBits.prototype.toLong = function toLong(unsigned) {
      return util.Long ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned)) : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
    };
    var charCodeAt = String.prototype.charCodeAt;
    LongBits.fromHash = function fromHash(hash) {
      if (hash === zeroHash)
        return zero;
      return new LongBits(
        (charCodeAt.call(hash, 0) | charCodeAt.call(hash, 1) << 8 | charCodeAt.call(hash, 2) << 16 | charCodeAt.call(hash, 3) << 24) >>> 0,
        (charCodeAt.call(hash, 4) | charCodeAt.call(hash, 5) << 8 | charCodeAt.call(hash, 6) << 16 | charCodeAt.call(hash, 7) << 24) >>> 0
      );
    };
    LongBits.prototype.toHash = function toHash() {
      return String.fromCharCode(
        this.lo & 255,
        this.lo >>> 8 & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24,
        this.hi & 255,
        this.hi >>> 8 & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
      );
    };
    LongBits.prototype.zzEncode = function zzEncode() {
      var mask = this.hi >> 31;
      this.hi = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
      this.lo = (this.lo << 1 ^ mask) >>> 0;
      return this;
    };
    LongBits.prototype.zzDecode = function zzDecode() {
      var mask = -(this.lo & 1);
      this.lo = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
      this.hi = (this.hi >>> 1 ^ mask) >>> 0;
      return this;
    };
    LongBits.prototype.length = function length2() {
      var part0 = this.lo, part1 = (this.lo >>> 28 | this.hi << 4) >>> 0, part2 = this.hi >>> 24;
      return part2 === 0 ? part1 === 0 ? part0 < 16384 ? part0 < 128 ? 1 : 2 : part0 < 2097152 ? 3 : 4 : part1 < 16384 ? part1 < 128 ? 5 : 6 : part1 < 2097152 ? 7 : 8 : part2 < 128 ? 9 : 10;
    };
  }
});

// node_modules/protobufjs/src/util/minimal.js
var require_minimal = __commonJS({
  "node_modules/protobufjs/src/util/minimal.js"(exports2) {
    "use strict";
    var util = exports2;
    util.asPromise = require_aspromise();
    util.base64 = require_base64();
    util.EventEmitter = require_eventemitter();
    util.float = require_float();
    util.inquire = require_inquire();
    util.utf8 = require_utf8();
    util.pool = require_pool();
    util.LongBits = require_longbits();
    util.isNode = Boolean(typeof global !== "undefined" && global && global.process && global.process.versions && global.process.versions.node);
    util.global = util.isNode && global || typeof window !== "undefined" && window || typeof self !== "undefined" && self || exports2;
    util.emptyArray = Object.freeze ? Object.freeze([]) : (
      /* istanbul ignore next */
      []
    );
    util.emptyObject = Object.freeze ? Object.freeze({}) : (
      /* istanbul ignore next */
      {}
    );
    util.isInteger = Number.isInteger || /* istanbul ignore next */
    function isInteger(value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
    util.isString = function isString(value) {
      return typeof value === "string" || value instanceof String;
    };
    util.isObject = function isObject(value) {
      return value && typeof value === "object";
    };
    util.isset = /**
     * Checks if a property on a message is considered to be present.
     * @param {Object} obj Plain object or message instance
     * @param {string} prop Property name
     * @returns {boolean} `true` if considered to be present, otherwise `false`
     */
    util.isSet = function isSet(obj, prop) {
      var value = obj[prop];
      if (value != null && obj.hasOwnProperty(prop))
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
      return false;
    };
    util.Buffer = (function() {
      try {
        var Buffer = util.inquire("buffer").Buffer;
        return Buffer.prototype.utf8Write ? Buffer : (
          /* istanbul ignore next */
          null
        );
      } catch (e) {
        return null;
      }
    })();
    util._Buffer_from = null;
    util._Buffer_allocUnsafe = null;
    util.newBuffer = function newBuffer(sizeOrArray) {
      return typeof sizeOrArray === "number" ? util.Buffer ? util._Buffer_allocUnsafe(sizeOrArray) : new util.Array(sizeOrArray) : util.Buffer ? util._Buffer_from(sizeOrArray) : typeof Uint8Array === "undefined" ? sizeOrArray : new Uint8Array(sizeOrArray);
    };
    util.Array = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    util.Long = /* istanbul ignore next */
    util.global.dcodeIO && /* istanbul ignore next */
    util.global.dcodeIO.Long || /* istanbul ignore next */
    util.global.Long || util.inquire("long");
    util.key2Re = /^true|false|0|1$/;
    util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;
    util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;
    util.longToHash = function longToHash(value) {
      return value ? util.LongBits.from(value).toHash() : util.LongBits.zeroHash;
    };
    util.longFromHash = function longFromHash(hash, unsigned) {
      var bits = util.LongBits.fromHash(hash);
      if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
      return bits.toNumber(Boolean(unsigned));
    };
    function merge(dst, src2, ifNotSet) {
      for (var keys = Object.keys(src2), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === void 0 || !ifNotSet)
          dst[keys[i]] = src2[keys[i]];
      return dst;
    }
    util.merge = merge;
    util.lcFirst = function lcFirst(str) {
      return str.charAt(0).toLowerCase() + str.substring(1);
    };
    function newError(name5) {
      function CustomError(message, properties) {
        if (!(this instanceof CustomError))
          return new CustomError(message, properties);
        Object.defineProperty(this, "message", { get: function() {
          return message;
        } });
        if (Error.captureStackTrace)
          Error.captureStackTrace(this, CustomError);
        else
          Object.defineProperty(this, "stack", { value: new Error().stack || "" });
        if (properties)
          merge(this, properties);
      }
      (CustomError.prototype = Object.create(Error.prototype)).constructor = CustomError;
      Object.defineProperty(CustomError.prototype, "name", { get: function() {
        return name5;
      } });
      CustomError.prototype.toString = function toString3() {
        return this.name + ": " + this.message;
      };
      return CustomError;
    }
    util.newError = newError;
    util.ProtocolError = newError("ProtocolError");
    util.oneOfGetter = function getOneOf(fieldNames) {
      var fieldMap = {};
      for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;
      return function() {
        for (var keys = Object.keys(this), i2 = keys.length - 1; i2 > -1; --i2)
          if (fieldMap[keys[i2]] === 1 && this[keys[i2]] !== void 0 && this[keys[i2]] !== null)
            return keys[i2];
      };
    };
    util.oneOfSetter = function setOneOf(fieldNames) {
      return function(name5) {
        for (var i = 0; i < fieldNames.length; ++i)
          if (fieldNames[i] !== name5)
            delete this[fieldNames[i]];
      };
    };
    util.toJSONOptions = {
      longs: String,
      enums: String,
      bytes: String,
      json: true
    };
    util._configure = function() {
      var Buffer = util.Buffer;
      if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
      }
      util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from || /* istanbul ignore next */
      function Buffer_from(value, encoding) {
        return new Buffer(value, encoding);
      };
      util._Buffer_allocUnsafe = Buffer.allocUnsafe || /* istanbul ignore next */
      function Buffer_allocUnsafe(size) {
        return new Buffer(size);
      };
    };
  }
});

// node_modules/protobufjs/src/writer.js
var require_writer = __commonJS({
  "node_modules/protobufjs/src/writer.js"(exports2, module2) {
    "use strict";
    module2.exports = Writer;
    var util = require_minimal();
    var BufferWriter;
    var LongBits = util.LongBits;
    var base642 = util.base64;
    var utf8 = util.utf8;
    function Op(fn, len, val) {
      this.fn = fn;
      this.len = len;
      this.next = void 0;
      this.val = val;
    }
    function noop2() {
    }
    function State(writer) {
      this.head = writer.head;
      this.tail = writer.tail;
      this.len = writer.len;
      this.next = writer.states;
    }
    function Writer() {
      this.len = 0;
      this.head = new Op(noop2, 0, 0);
      this.tail = this.head;
      this.states = null;
    }
    var create4 = function create5() {
      return util.Buffer ? function create_buffer_setup() {
        return (Writer.create = function create_buffer() {
          return new BufferWriter();
        })();
      } : function create_array() {
        return new Writer();
      };
    };
    Writer.create = create4();
    Writer.alloc = function alloc2(size) {
      return new util.Array(size);
    };
    if (util.Array !== Array)
      Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);
    Writer.prototype._push = function push(fn, len, val) {
      this.tail = this.tail.next = new Op(fn, len, val);
      this.len += len;
      return this;
    };
    function writeByte(val, buf2, pos) {
      buf2[pos] = val & 255;
    }
    function writeVarint32(val, buf2, pos) {
      while (val > 127) {
        buf2[pos++] = val & 127 | 128;
        val >>>= 7;
      }
      buf2[pos] = val;
    }
    function VarintOp(len, val) {
      this.len = len;
      this.next = void 0;
      this.val = val;
    }
    VarintOp.prototype = Object.create(Op.prototype);
    VarintOp.prototype.fn = writeVarint32;
    Writer.prototype.uint32 = function write_uint32(value) {
      this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0) < 128 ? 1 : value < 16384 ? 2 : value < 2097152 ? 3 : value < 268435456 ? 4 : 5,
        value
      )).len;
      return this;
    };
    Writer.prototype.int32 = function write_int32(value) {
      return value < 0 ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) : this.uint32(value);
    };
    Writer.prototype.sint32 = function write_sint32(value) {
      return this.uint32((value << 1 ^ value >> 31) >>> 0);
    };
    function writeVarint64(val, buf2, pos) {
      while (val.hi) {
        buf2[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
      }
      while (val.lo > 127) {
        buf2[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
      }
      buf2[pos++] = val.lo;
    }
    Writer.prototype.uint64 = function write_uint64(value) {
      var bits = LongBits.from(value);
      return this._push(writeVarint64, bits.length(), bits);
    };
    Writer.prototype.int64 = Writer.prototype.uint64;
    Writer.prototype.sint64 = function write_sint64(value) {
      var bits = LongBits.from(value).zzEncode();
      return this._push(writeVarint64, bits.length(), bits);
    };
    Writer.prototype.bool = function write_bool(value) {
      return this._push(writeByte, 1, value ? 1 : 0);
    };
    function writeFixed32(val, buf2, pos) {
      buf2[pos] = val & 255;
      buf2[pos + 1] = val >>> 8 & 255;
      buf2[pos + 2] = val >>> 16 & 255;
      buf2[pos + 3] = val >>> 24;
    }
    Writer.prototype.fixed32 = function write_fixed32(value) {
      return this._push(writeFixed32, 4, value >>> 0);
    };
    Writer.prototype.sfixed32 = Writer.prototype.fixed32;
    Writer.prototype.fixed64 = function write_fixed64(value) {
      var bits = LongBits.from(value);
      return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
    };
    Writer.prototype.sfixed64 = Writer.prototype.fixed64;
    Writer.prototype.float = function write_float(value) {
      return this._push(util.float.writeFloatLE, 4, value);
    };
    Writer.prototype.double = function write_double(value) {
      return this._push(util.float.writeDoubleLE, 8, value);
    };
    var writeBytes = util.Array.prototype.set ? function writeBytes_set(val, buf2, pos) {
      buf2.set(val, pos);
    } : function writeBytes_for(val, buf2, pos) {
      for (var i = 0; i < val.length; ++i)
        buf2[pos + i] = val[i];
    };
    Writer.prototype.bytes = function write_bytes(value) {
      var len = value.length >>> 0;
      if (!len)
        return this._push(writeByte, 1, 0);
      if (util.isString(value)) {
        var buf2 = Writer.alloc(len = base642.length(value));
        base642.decode(value, buf2, 0);
        value = buf2;
      }
      return this.uint32(len)._push(writeBytes, len, value);
    };
    Writer.prototype.string = function write_string(value) {
      var len = utf8.length(value);
      return len ? this.uint32(len)._push(utf8.write, len, value) : this._push(writeByte, 1, 0);
    };
    Writer.prototype.fork = function fork() {
      this.states = new State(this);
      this.head = this.tail = new Op(noop2, 0, 0);
      this.len = 0;
      return this;
    };
    Writer.prototype.reset = function reset() {
      if (this.states) {
        this.head = this.states.head;
        this.tail = this.states.tail;
        this.len = this.states.len;
        this.states = this.states.next;
      } else {
        this.head = this.tail = new Op(noop2, 0, 0);
        this.len = 0;
      }
      return this;
    };
    Writer.prototype.ldelim = function ldelim() {
      var head = this.head, tail = this.tail, len = this.len;
      this.reset().uint32(len);
      if (len) {
        this.tail.next = head.next;
        this.tail = tail;
        this.len += len;
      }
      return this;
    };
    Writer.prototype.finish = function finish() {
      var head = this.head.next, buf2 = this.constructor.alloc(this.len), pos = 0;
      while (head) {
        head.fn(head.val, buf2, pos);
        pos += head.len;
        head = head.next;
      }
      return buf2;
    };
    Writer._configure = function(BufferWriter_) {
      BufferWriter = BufferWriter_;
      Writer.create = create4();
      BufferWriter._configure();
    };
  }
});

// node_modules/protobufjs/src/writer_buffer.js
var require_writer_buffer = __commonJS({
  "node_modules/protobufjs/src/writer_buffer.js"(exports2, module2) {
    "use strict";
    module2.exports = BufferWriter;
    var Writer = require_writer();
    (BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;
    var util = require_minimal();
    function BufferWriter() {
      Writer.call(this);
    }
    BufferWriter._configure = function() {
      BufferWriter.alloc = util._Buffer_allocUnsafe;
      BufferWriter.writeBytesBuffer = util.Buffer && util.Buffer.prototype instanceof Uint8Array && util.Buffer.prototype.set.name === "set" ? function writeBytesBuffer_set(val, buf2, pos) {
        buf2.set(val, pos);
      } : function writeBytesBuffer_copy(val, buf2, pos) {
        if (val.copy)
          val.copy(buf2, pos, 0, val.length);
        else for (var i = 0; i < val.length; )
          buf2[pos++] = val[i++];
      };
    };
    BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
      if (util.isString(value))
        value = util._Buffer_from(value, "base64");
      var len = value.length >>> 0;
      this.uint32(len);
      if (len)
        this._push(BufferWriter.writeBytesBuffer, len, value);
      return this;
    };
    function writeStringBuffer(val, buf2, pos) {
      if (val.length < 40)
        util.utf8.write(val, buf2, pos);
      else if (buf2.utf8Write)
        buf2.utf8Write(val, pos);
      else
        buf2.write(val, pos);
    }
    BufferWriter.prototype.string = function write_string_buffer(value) {
      var len = util.Buffer.byteLength(value);
      this.uint32(len);
      if (len)
        this._push(writeStringBuffer, len, value);
      return this;
    };
    BufferWriter._configure();
  }
});

// node_modules/protobufjs/src/reader.js
var require_reader = __commonJS({
  "node_modules/protobufjs/src/reader.js"(exports2, module2) {
    "use strict";
    module2.exports = Reader;
    var util = require_minimal();
    var BufferReader;
    var LongBits = util.LongBits;
    var utf8 = util.utf8;
    function indexOutOfRange(reader, writeLength) {
      return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
    }
    function Reader(buffer2) {
      this.buf = buffer2;
      this.pos = 0;
      this.len = buffer2.length;
    }
    var create_array = typeof Uint8Array !== "undefined" ? function create_typed_array(buffer2) {
      if (buffer2 instanceof Uint8Array || Array.isArray(buffer2))
        return new Reader(buffer2);
      throw Error("illegal buffer");
    } : function create_array2(buffer2) {
      if (Array.isArray(buffer2))
        return new Reader(buffer2);
      throw Error("illegal buffer");
    };
    var create4 = function create5() {
      return util.Buffer ? function create_buffer_setup(buffer2) {
        return (Reader.create = function create_buffer(buffer3) {
          return util.Buffer.isBuffer(buffer3) ? new BufferReader(buffer3) : create_array(buffer3);
        })(buffer2);
      } : create_array;
    };
    Reader.create = create4();
    Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */
    util.Array.prototype.slice;
    Reader.prototype.uint32 = /* @__PURE__ */ (function read_uint32_setup() {
      var value = 4294967295;
      return function read_uint32() {
        value = (this.buf[this.pos] & 127) >>> 0;
        if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 7) >>> 0;
        if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0;
        if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0;
        if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 15) << 28) >>> 0;
        if (this.buf[this.pos++] < 128) return value;
        if ((this.pos += 5) > this.len) {
          this.pos = this.len;
          throw indexOutOfRange(this, 10);
        }
        return value;
      };
    })();
    Reader.prototype.int32 = function read_int32() {
      return this.uint32() | 0;
    };
    Reader.prototype.sint32 = function read_sint32() {
      var value = this.uint32();
      return value >>> 1 ^ -(value & 1) | 0;
    };
    function readLongVarint() {
      var bits = new LongBits(0, 0);
      var i = 0;
      if (this.len - this.pos > 4) {
        for (; i < 4; ++i) {
          bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
          if (this.buf[this.pos++] < 128)
            return bits;
        }
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >> 4) >>> 0;
        if (this.buf[this.pos++] < 128)
          return bits;
        i = 0;
      } else {
        for (; i < 3; ++i) {
          if (this.pos >= this.len)
            throw indexOutOfRange(this);
          bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
          if (this.buf[this.pos++] < 128)
            return bits;
        }
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
      }
      if (this.len - this.pos > 4) {
        for (; i < 5; ++i) {
          bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
          if (this.buf[this.pos++] < 128)
            return bits;
        }
      } else {
        for (; i < 5; ++i) {
          if (this.pos >= this.len)
            throw indexOutOfRange(this);
          bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
          if (this.buf[this.pos++] < 128)
            return bits;
        }
      }
      throw Error("invalid varint encoding");
    }
    Reader.prototype.bool = function read_bool() {
      return this.uint32() !== 0;
    };
    function readFixed32_end(buf2, end) {
      return (buf2[end - 4] | buf2[end - 3] << 8 | buf2[end - 2] << 16 | buf2[end - 1] << 24) >>> 0;
    }
    Reader.prototype.fixed32 = function read_fixed32() {
      if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);
      return readFixed32_end(this.buf, this.pos += 4);
    };
    Reader.prototype.sfixed32 = function read_sfixed32() {
      if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);
      return readFixed32_end(this.buf, this.pos += 4) | 0;
    };
    function readFixed64() {
      if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);
      return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
    }
    Reader.prototype.float = function read_float() {
      if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);
      var value = util.float.readFloatLE(this.buf, this.pos);
      this.pos += 4;
      return value;
    };
    Reader.prototype.double = function read_double() {
      if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);
      var value = util.float.readDoubleLE(this.buf, this.pos);
      this.pos += 8;
      return value;
    };
    Reader.prototype.bytes = function read_bytes() {
      var length2 = this.uint32(), start = this.pos, end = this.pos + length2;
      if (end > this.len)
        throw indexOutOfRange(this, length2);
      this.pos += length2;
      if (Array.isArray(this.buf))
        return this.buf.slice(start, end);
      return start === end ? new this.buf.constructor(0) : this._slice.call(this.buf, start, end);
    };
    Reader.prototype.string = function read_string() {
      var bytes = this.bytes();
      return utf8.read(bytes, 0, bytes.length);
    };
    Reader.prototype.skip = function skip(length2) {
      if (typeof length2 === "number") {
        if (this.pos + length2 > this.len)
          throw indexOutOfRange(this, length2);
        this.pos += length2;
      } else {
        do {
          if (this.pos >= this.len)
            throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
      }
      return this;
    };
    Reader.prototype.skipType = function(wireType) {
      switch (wireType) {
        case 0:
          this.skip();
          break;
        case 1:
          this.skip(8);
          break;
        case 2:
          this.skip(this.uint32());
          break;
        case 3:
          while ((wireType = this.uint32() & 7) !== 4) {
            this.skipType(wireType);
          }
          break;
        case 5:
          this.skip(4);
          break;
        /* istanbul ignore next */
        default:
          throw Error("invalid wire type " + wireType + " at offset " + this.pos);
      }
      return this;
    };
    Reader._configure = function(BufferReader_) {
      BufferReader = BufferReader_;
      Reader.create = create4();
      BufferReader._configure();
      var fn = util.Long ? "toLong" : (
        /* istanbul ignore next */
        "toNumber"
      );
      util.merge(Reader.prototype, {
        int64: function read_int64() {
          return readLongVarint.call(this)[fn](false);
        },
        uint64: function read_uint64() {
          return readLongVarint.call(this)[fn](true);
        },
        sint64: function read_sint64() {
          return readLongVarint.call(this).zzDecode()[fn](false);
        },
        fixed64: function read_fixed64() {
          return readFixed64.call(this)[fn](true);
        },
        sfixed64: function read_sfixed64() {
          return readFixed64.call(this)[fn](false);
        }
      });
    };
  }
});

// node_modules/protobufjs/src/reader_buffer.js
var require_reader_buffer = __commonJS({
  "node_modules/protobufjs/src/reader_buffer.js"(exports2, module2) {
    "use strict";
    module2.exports = BufferReader;
    var Reader = require_reader();
    (BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;
    var util = require_minimal();
    function BufferReader(buffer2) {
      Reader.call(this, buffer2);
    }
    BufferReader._configure = function() {
      if (util.Buffer)
        BufferReader.prototype._slice = util.Buffer.prototype.slice;
    };
    BufferReader.prototype.string = function read_string_buffer() {
      var len = this.uint32();
      return this.buf.utf8Slice ? this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len)) : this.buf.toString("utf-8", this.pos, this.pos = Math.min(this.pos + len, this.len));
    };
    BufferReader._configure();
  }
});

// node_modules/protobufjs/src/rpc/service.js
var require_service = __commonJS({
  "node_modules/protobufjs/src/rpc/service.js"(exports2, module2) {
    "use strict";
    module2.exports = Service;
    var util = require_minimal();
    (Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;
    function Service(rpcImpl, requestDelimited, responseDelimited) {
      if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");
      util.EventEmitter.call(this);
      this.rpcImpl = rpcImpl;
      this.requestDelimited = Boolean(requestDelimited);
      this.responseDelimited = Boolean(responseDelimited);
    }
    Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {
      if (!request)
        throw TypeError("request must be specified");
      var self2 = this;
      if (!callback)
        return util.asPromise(rpcCall, self2, method, requestCtor, responseCtor, request);
      if (!self2.rpcImpl) {
        setTimeout(function() {
          callback(Error("already ended"));
        }, 0);
        return void 0;
      }
      try {
        return self2.rpcImpl(
          method,
          requestCtor[self2.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
          function rpcCallback(err, response) {
            if (err) {
              self2.emit("error", err, method);
              return callback(err);
            }
            if (response === null) {
              self2.end(
                /* endedByRPC */
                true
              );
              return void 0;
            }
            if (!(response instanceof responseCtor)) {
              try {
                response = responseCtor[self2.responseDelimited ? "decodeDelimited" : "decode"](response);
              } catch (err2) {
                self2.emit("error", err2, method);
                return callback(err2);
              }
            }
            self2.emit("data", response, method);
            return callback(null, response);
          }
        );
      } catch (err) {
        self2.emit("error", err, method);
        setTimeout(function() {
          callback(err);
        }, 0);
        return void 0;
      }
    };
    Service.prototype.end = function end(endedByRPC) {
      if (this.rpcImpl) {
        if (!endedByRPC)
          this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
      }
      return this;
    };
  }
});

// node_modules/protobufjs/src/rpc.js
var require_rpc = __commonJS({
  "node_modules/protobufjs/src/rpc.js"(exports2) {
    "use strict";
    var rpc = exports2;
    rpc.Service = require_service();
  }
});

// node_modules/protobufjs/src/roots.js
var require_roots = __commonJS({
  "node_modules/protobufjs/src/roots.js"(exports2, module2) {
    "use strict";
    module2.exports = {};
  }
});

// node_modules/protobufjs/src/index-minimal.js
var require_index_minimal = __commonJS({
  "node_modules/protobufjs/src/index-minimal.js"(exports2) {
    "use strict";
    var protobuf = exports2;
    protobuf.build = "minimal";
    protobuf.Writer = require_writer();
    protobuf.BufferWriter = require_writer_buffer();
    protobuf.Reader = require_reader();
    protobuf.BufferReader = require_reader_buffer();
    protobuf.util = require_minimal();
    protobuf.rpc = require_rpc();
    protobuf.roots = require_roots();
    protobuf.configure = configure;
    function configure() {
      protobuf.util._configure();
      protobuf.Writer._configure(protobuf.BufferWriter);
      protobuf.Reader._configure(protobuf.BufferReader);
    }
    configure();
  }
});

// node_modules/protobufjs/minimal.js
var require_minimal2 = __commonJS({
  "node_modules/protobufjs/minimal.js"(exports2, module2) {
    "use strict";
    module2.exports = require_index_minimal();
  }
});

// node_modules/multiformats/esm/src/codecs/raw.js
var raw_exports = {};
__export(raw_exports, {
  code: () => code3,
  decode: () => decode8,
  encode: () => encode6,
  name: () => name2
});
var name2, code3, encode6, decode8;
var init_raw = __esm({
  "node_modules/multiformats/esm/src/codecs/raw.js"() {
    init_bytes();
    name2 = "raw";
    code3 = 85;
    encode6 = (node) => coerce(node);
    decode8 = (data) => coerce(data);
  }
});

// node_modules/it-all/index.js
var require_it_all = __commonJS({
  "node_modules/it-all/index.js"(exports2, module2) {
    "use strict";
    var all4 = async (source) => {
      const arr = [];
      for await (const entry of source) {
        arr.push(entry);
      }
      return arr;
    };
    module2.exports = all4;
  }
});

// node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "node_modules/base64-js/index.js"(exports2) {
    "use strict";
    exports2.byteLength = byteLength;
    exports2.toByteArray = toByteArray;
    exports2.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code6 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i = 0, len = code6.length; i < len; ++i) {
      lookup[i] = code6[i];
      revLookup[code6.charCodeAt(i)] = i;
    }
    var i;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
  }
});

// node_modules/ieee754/index.js
var require_ieee754 = __commonJS({
  "node_modules/ieee754/index.js"(exports2) {
    exports2.read = function(buffer2, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d = isLE ? -1 : 1;
      var s = buffer2[offset + i];
      i += d;
      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer2[offset + i], i += d, nBits -= 8) {
      }
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer2[offset + i], i += d, nBits -= 8) {
      }
      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : (s ? -1 : 1) * Infinity;
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };
    exports2.write = function(buffer2, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d = isLE ? 1 : -1;
      var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }
      for (; mLen >= 8; buffer2[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
      }
      e = e << mLen | m;
      eLen += mLen;
      for (; eLen > 0; buffer2[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
      }
      buffer2[offset + i - d] |= s * 128;
    };
  }
});

// node_modules/buffer/index.js
var require_buffer = __commonJS({
  "node_modules/buffer/index.js"(exports2) {
    "use strict";
    var base642 = require_base64_js();
    var ieee754 = require_ieee754();
    var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
    exports2.Buffer = Buffer;
    exports2.SlowBuffer = SlowBuffer;
    exports2.INSPECT_MAX_BYTES = 50;
    var K_MAX_LENGTH = 2147483647;
    exports2.kMaxLength = K_MAX_LENGTH;
    Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();
    if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
      console.error(
        "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
      );
    }
    function typedArraySupport() {
      try {
        const arr = new Uint8Array(1);
        const proto = { foo: function() {
          return 42;
        } };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42;
      } catch (e) {
        return false;
      }
    }
    Object.defineProperty(Buffer.prototype, "parent", {
      enumerable: true,
      get: function() {
        if (!Buffer.isBuffer(this)) return void 0;
        return this.buffer;
      }
    });
    Object.defineProperty(Buffer.prototype, "offset", {
      enumerable: true,
      get: function() {
        if (!Buffer.isBuffer(this)) return void 0;
        return this.byteOffset;
      }
    });
    function createBuffer(length2) {
      if (length2 > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length2 + '" is invalid for option "size"');
      }
      const buf2 = new Uint8Array(length2);
      Object.setPrototypeOf(buf2, Buffer.prototype);
      return buf2;
    }
    function Buffer(arg, encodingOrOffset, length2) {
      if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        }
        return allocUnsafe2(arg);
      }
      return from3(arg, encodingOrOffset, length2);
    }
    Buffer.poolSize = 8192;
    function from3(value, encodingOrOffset, length2) {
      if (typeof value === "string") {
        return fromString4(value, encodingOrOffset);
      }
      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value);
      }
      if (value == null) {
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
        return fromArrayBuffer(value, encodingOrOffset, length2);
      }
      if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length2);
      }
      if (typeof value === "number") {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      }
      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer.from(valueOf, encodingOrOffset, length2);
      }
      const b = fromObject(value);
      if (b) return b;
      if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
        return Buffer.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length2);
      }
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    Buffer.from = function(value, encodingOrOffset, length2) {
      return from3(value, encodingOrOffset, length2);
    };
    Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer, Uint8Array);
    function assertSize(size) {
      if (typeof size !== "number") {
        throw new TypeError('"size" argument must be of type number');
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
      }
    }
    function alloc2(size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size);
      }
      if (fill !== void 0) {
        return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
      }
      return createBuffer(size);
    }
    Buffer.alloc = function(size, fill, encoding) {
      return alloc2(size, fill, encoding);
    };
    function allocUnsafe2(size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0);
    }
    Buffer.allocUnsafe = function(size) {
      return allocUnsafe2(size);
    };
    Buffer.allocUnsafeSlow = function(size) {
      return allocUnsafe2(size);
    };
    function fromString4(string2, encoding) {
      if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
      }
      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      const length2 = byteLength(string2, encoding) | 0;
      let buf2 = createBuffer(length2);
      const actual = buf2.write(string2, encoding);
      if (actual !== length2) {
        buf2 = buf2.slice(0, actual);
      }
      return buf2;
    }
    function fromArrayLike(array) {
      const length2 = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf2 = createBuffer(length2);
      for (let i = 0; i < length2; i += 1) {
        buf2[i] = array[i] & 255;
      }
      return buf2;
    }
    function fromArrayView(arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
      }
      return fromArrayLike(arrayView);
    }
    function fromArrayBuffer(array, byteOffset, length2) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
      }
      if (array.byteLength < byteOffset + (length2 || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
      }
      let buf2;
      if (byteOffset === void 0 && length2 === void 0) {
        buf2 = new Uint8Array(array);
      } else if (length2 === void 0) {
        buf2 = new Uint8Array(array, byteOffset);
      } else {
        buf2 = new Uint8Array(array, byteOffset, length2);
      }
      Object.setPrototypeOf(buf2, Buffer.prototype);
      return buf2;
    }
    function fromObject(obj) {
      if (Buffer.isBuffer(obj)) {
        const len = checked(obj.length) | 0;
        const buf2 = createBuffer(len);
        if (buf2.length === 0) {
          return buf2;
        }
        obj.copy(buf2, 0, 0, len);
        return buf2;
      }
      if (obj.length !== void 0) {
        if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
          return createBuffer(0);
        }
        return fromArrayLike(obj);
      }
      if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
      }
    }
    function checked(length2) {
      if (length2 >= K_MAX_LENGTH) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
      }
      return length2 | 0;
    }
    function SlowBuffer(length2) {
      if (+length2 != length2) {
        length2 = 0;
      }
      return Buffer.alloc(+length2);
    }
    Buffer.isBuffer = function isBuffer3(b) {
      return b != null && b._isBuffer === true && b !== Buffer.prototype;
    };
    Buffer.compare = function compare2(a, b) {
      if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
      if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
      if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      }
      if (a === b) return 0;
      let x = a.length;
      let y = b.length;
      for (let i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break;
        }
      }
      if (x < y) return -1;
      if (y < x) return 1;
      return 0;
    };
    Buffer.isEncoding = function isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    Buffer.concat = function concat3(list, length2) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      if (list.length === 0) {
        return Buffer.alloc(0);
      }
      let i;
      if (length2 === void 0) {
        length2 = 0;
        for (i = 0; i < list.length; ++i) {
          length2 += list[i].length;
        }
      }
      const buffer2 = Buffer.allocUnsafe(length2);
      let pos = 0;
      for (i = 0; i < list.length; ++i) {
        let buf2 = list[i];
        if (isInstance(buf2, Uint8Array)) {
          if (pos + buf2.length > buffer2.length) {
            if (!Buffer.isBuffer(buf2)) buf2 = Buffer.from(buf2);
            buf2.copy(buffer2, pos);
          } else {
            Uint8Array.prototype.set.call(
              buffer2,
              buf2,
              pos
            );
          }
        } else if (!Buffer.isBuffer(buf2)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        } else {
          buf2.copy(buffer2, pos);
        }
        pos += buf2.length;
      }
      return buffer2;
    };
    function byteLength(string2, encoding) {
      if (Buffer.isBuffer(string2)) {
        return string2.length;
      }
      if (ArrayBuffer.isView(string2) || isInstance(string2, ArrayBuffer)) {
        return string2.byteLength;
      }
      if (typeof string2 !== "string") {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string2
        );
      }
      const len = string2.length;
      const mustMatch = arguments.length > 2 && arguments[2] === true;
      if (!mustMatch && len === 0) return 0;
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "ascii":
          case "latin1":
          case "binary":
            return len;
          case "utf8":
          case "utf-8":
            return utf8ToBytes2(string2).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return len * 2;
          case "hex":
            return len >>> 1;
          case "base64":
            return base64ToBytes(string2).length;
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes2(string2).length;
            }
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;
    function slowToString(encoding, start, end) {
      let loweredCase = false;
      if (start === void 0 || start < 0) {
        start = 0;
      }
      if (start > this.length) {
        return "";
      }
      if (end === void 0 || end > this.length) {
        end = this.length;
      }
      if (end <= 0) {
        return "";
      }
      end >>>= 0;
      start >>>= 0;
      if (end <= start) {
        return "";
      }
      if (!encoding) encoding = "utf8";
      while (true) {
        switch (encoding) {
          case "hex":
            return hexSlice(this, start, end);
          case "utf8":
          case "utf-8":
            return utf8Slice2(this, start, end);
          case "ascii":
            return asciiSlice(this, start, end);
          case "latin1":
          case "binary":
            return latin1Slice(this, start, end);
          case "base64":
            return base64Slice(this, start, end);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return utf16leSlice(this, start, end);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = (encoding + "").toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.prototype._isBuffer = true;
    function swap(b, n, m) {
      const i = b[n];
      b[n] = b[m];
      b[m] = i;
    }
    Buffer.prototype.swap16 = function swap16() {
      const len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      }
      for (let i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this;
    };
    Buffer.prototype.swap32 = function swap32() {
      const len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      }
      for (let i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this;
    };
    Buffer.prototype.swap64 = function swap64() {
      const len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      }
      for (let i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this;
    };
    Buffer.prototype.toString = function toString3() {
      const length2 = this.length;
      if (length2 === 0) return "";
      if (arguments.length === 0) return utf8Slice2(this, 0, length2);
      return slowToString.apply(this, arguments);
    };
    Buffer.prototype.toLocaleString = Buffer.prototype.toString;
    Buffer.prototype.equals = function equals4(b) {
      if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
      if (this === b) return true;
      return Buffer.compare(this, b) === 0;
    };
    Buffer.prototype.inspect = function inspect() {
      let str = "";
      const max = exports2.INSPECT_MAX_BYTES;
      str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
      if (this.length > max) str += " ... ";
      return "<Buffer " + str + ">";
    };
    if (customInspectSymbol) {
      Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
    }
    Buffer.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer.from(target, target.offset, target.byteLength);
      }
      if (!Buffer.isBuffer(target)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
        );
      }
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = target ? target.length : 0;
      }
      if (thisStart === void 0) {
        thisStart = 0;
      }
      if (thisEnd === void 0) {
        thisEnd = this.length;
      }
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError("out of range index");
      }
      if (thisStart >= thisEnd && start >= end) {
        return 0;
      }
      if (thisStart >= thisEnd) {
        return -1;
      }
      if (start >= end) {
        return 1;
      }
      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;
      if (this === target) return 0;
      let x = thisEnd - thisStart;
      let y = end - start;
      const len = Math.min(x, y);
      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);
      for (let i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break;
        }
      }
      if (x < y) return -1;
      if (y < x) return 1;
      return 0;
    };
    function bidirectionalIndexOf(buffer2, val, byteOffset, encoding, dir) {
      if (buffer2.length === 0) return -1;
      if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 2147483647) {
        byteOffset = 2147483647;
      } else if (byteOffset < -2147483648) {
        byteOffset = -2147483648;
      }
      byteOffset = +byteOffset;
      if (numberIsNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer2.length - 1;
      }
      if (byteOffset < 0) byteOffset = buffer2.length + byteOffset;
      if (byteOffset >= buffer2.length) {
        if (dir) return -1;
        else byteOffset = buffer2.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1;
      }
      if (typeof val === "string") {
        val = Buffer.from(val, encoding);
      }
      if (Buffer.isBuffer(val)) {
        if (val.length === 0) {
          return -1;
        }
        return arrayIndexOf(buffer2, val, byteOffset, encoding, dir);
      } else if (typeof val === "number") {
        val = val & 255;
        if (typeof Uint8Array.prototype.indexOf === "function") {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer2, val, byteOffset);
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer2, val, byteOffset);
          }
        }
        return arrayIndexOf(buffer2, [val], byteOffset, encoding, dir);
      }
      throw new TypeError("val must be string, number or Buffer");
    }
    function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;
      if (encoding !== void 0) {
        encoding = String(encoding).toLowerCase();
        if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
          if (arr.length < 2 || val.length < 2) {
            return -1;
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }
      function read2(buf2, i2) {
        if (indexSize === 1) {
          return buf2[i2];
        } else {
          return buf2.readUInt16BE(i2 * indexSize);
        }
      }
      let i;
      if (dir) {
        let foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read2(arr, i) === read2(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          let found = true;
          for (let j = 0; j < valLength; j++) {
            if (read2(arr, i + j) !== read2(val, j)) {
              found = false;
              break;
            }
          }
          if (found) return i;
        }
      }
      return -1;
    }
    Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1;
    };
    Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    };
    Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    };
    function hexWrite(buf2, string2, offset, length2) {
      offset = Number(offset) || 0;
      const remaining = buf2.length - offset;
      if (!length2) {
        length2 = remaining;
      } else {
        length2 = Number(length2);
        if (length2 > remaining) {
          length2 = remaining;
        }
      }
      const strLen = string2.length;
      if (length2 > strLen / 2) {
        length2 = strLen / 2;
      }
      let i;
      for (i = 0; i < length2; ++i) {
        const parsed = parseInt(string2.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i;
        buf2[offset + i] = parsed;
      }
      return i;
    }
    function utf8Write(buf2, string2, offset, length2) {
      return blitBuffer(utf8ToBytes2(string2, buf2.length - offset), buf2, offset, length2);
    }
    function asciiWrite(buf2, string2, offset, length2) {
      return blitBuffer(asciiToBytes(string2), buf2, offset, length2);
    }
    function base64Write(buf2, string2, offset, length2) {
      return blitBuffer(base64ToBytes(string2), buf2, offset, length2);
    }
    function ucs2Write(buf2, string2, offset, length2) {
      return blitBuffer(utf16leToBytes(string2, buf2.length - offset), buf2, offset, length2);
    }
    Buffer.prototype.write = function write(string2, offset, length2, encoding) {
      if (offset === void 0) {
        encoding = "utf8";
        length2 = this.length;
        offset = 0;
      } else if (length2 === void 0 && typeof offset === "string") {
        encoding = offset;
        length2 = this.length;
        offset = 0;
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length2)) {
          length2 = length2 >>> 0;
          if (encoding === void 0) encoding = "utf8";
        } else {
          encoding = length2;
          length2 = void 0;
        }
      } else {
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      }
      const remaining = this.length - offset;
      if (length2 === void 0 || length2 > remaining) length2 = remaining;
      if (string2.length > 0 && (length2 < 0 || offset < 0) || offset > this.length) {
        throw new RangeError("Attempt to write outside buffer bounds");
      }
      if (!encoding) encoding = "utf8";
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "hex":
            return hexWrite(this, string2, offset, length2);
          case "utf8":
          case "utf-8":
            return utf8Write(this, string2, offset, length2);
          case "ascii":
          case "latin1":
          case "binary":
            return asciiWrite(this, string2, offset, length2);
          case "base64":
            return base64Write(this, string2, offset, length2);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ucs2Write(this, string2, offset, length2);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };
    Buffer.prototype.toJSON = function toJSON() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function base64Slice(buf2, start, end) {
      if (start === 0 && end === buf2.length) {
        return base642.fromByteArray(buf2);
      } else {
        return base642.fromByteArray(buf2.slice(start, end));
      }
    }
    function utf8Slice2(buf2, start, end) {
      end = Math.min(buf2.length, end);
      const res = [];
      let i = start;
      while (i < end) {
        const firstByte = buf2[i];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = buf2[i + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = buf2[i + 1];
              thirdByte = buf2[i + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = buf2[i + 1];
              thirdByte = buf2[i + 2];
              fourthByte = buf2[i + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint === null) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i += bytesPerSequence;
      }
      return decodeCodePointsArray2(res);
    }
    var MAX_ARGUMENTS_LENGTH2 = 4096;
    function decodeCodePointsArray2(codePoints) {
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH2) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH2)
        );
      }
      return res;
    }
    function asciiSlice(buf2, start, end) {
      let ret = "";
      end = Math.min(buf2.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf2[i] & 127);
      }
      return ret;
    }
    function latin1Slice(buf2, start, end) {
      let ret = "";
      end = Math.min(buf2.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf2[i]);
      }
      return ret;
    }
    function hexSlice(buf2, start, end) {
      const len = buf2.length;
      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;
      let out = "";
      for (let i = start; i < end; ++i) {
        out += hexSliceLookupTable[buf2[i]];
      }
      return out;
    }
    function utf16leSlice(buf2, start, end) {
      const bytes = buf2.slice(start, end);
      let res = "";
      for (let i = 0; i < bytes.length - 1; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res;
    }
    Buffer.prototype.slice = function slice2(start, end) {
      const len = this.length;
      start = ~~start;
      end = end === void 0 ? len : ~~end;
      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }
      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }
      if (end < start) end = start;
      const newBuf = this.subarray(start, end);
      Object.setPrototypeOf(newBuf, Buffer.prototype);
      return newBuf;
    };
    function checkOffset(offset, ext, length2) {
      if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
      if (offset + ext > length2) throw new RangeError("Trying to access beyond buffer length");
    }
    Buffer.prototype.readUintLE = Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      return val;
    };
    Buffer.prototype.readUintBE = Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength2, this.length);
      }
      let val = this[offset + --byteLength2];
      let mul = 1;
      while (byteLength2 > 0 && (mul *= 256)) {
        val += this[offset + --byteLength2] * mul;
      }
      return val;
    };
    Buffer.prototype.readUint8 = Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset];
    };
    Buffer.prototype.readUint16LE = Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | this[offset + 1] << 8;
    };
    Buffer.prototype.readUint16BE = Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] << 8 | this[offset + 1];
    };
    Buffer.prototype.readUint32LE = Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
    };
    Buffer.prototype.readUint32BE = Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    };
    Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last3 = this[offset + 7];
      if (first === void 0 || last3 === void 0) {
        boundsError(offset, this.length - 8);
      }
      const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
      const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last3 * 2 ** 24;
      return BigInt(lo) + (BigInt(hi) << BigInt(32));
    });
    Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last3 = this[offset + 7];
      if (first === void 0 || last3 === void 0) {
        boundsError(offset, this.length - 8);
      }
      const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last3;
      return (BigInt(hi) << BigInt(32)) + BigInt(lo);
    });
    Buffer.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let i = byteLength2;
      let mul = 1;
      let val = this[offset + --i];
      while (i > 0 && (mul *= 256)) {
        val += this[offset + --i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 128)) return this[offset];
      return (255 - this[offset] + 1) * -1;
    };
    Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset] | this[offset + 1] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | this[offset] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    };
    Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    };
    Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last3 = this[offset + 7];
      if (first === void 0 || last3 === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last3 << 24);
      return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
    });
    Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last3 = this[offset + 7];
      if (first === void 0 || last3 === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = (first << 24) + // Overflow
      this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last3);
    });
    Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, true, 23, 4);
    };
    Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, false, 23, 4);
    };
    Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, true, 52, 8);
    };
    Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, false, 52, 8);
    };
    function checkInt(buf2, value, offset, ext, max, min) {
      if (!Buffer.isBuffer(buf2)) throw new TypeError('"buffer" argument must be a Buffer instance');
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
      if (offset + ext > buf2.length) throw new RangeError("Index out of range");
    }
    Buffer.prototype.writeUintLE = Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let mul = 1;
      let i = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer.prototype.writeUintBE = Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer.prototype.writeUint8 = Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer.prototype.writeUint16LE = Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer.prototype.writeUint16BE = Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer.prototype.writeUint32LE = Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 255;
      return offset + 4;
    };
    Buffer.prototype.writeUint32BE = Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    function wrtBigUInt64LE(buf2, value, offset, min, max) {
      checkIntBI(value, min, max, buf2, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf2[offset++] = lo;
      lo = lo >> 8;
      buf2[offset++] = lo;
      lo = lo >> 8;
      buf2[offset++] = lo;
      lo = lo >> 8;
      buf2[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf2[offset++] = hi;
      hi = hi >> 8;
      buf2[offset++] = hi;
      hi = hi >> 8;
      buf2[offset++] = hi;
      hi = hi >> 8;
      buf2[offset++] = hi;
      return offset;
    }
    function wrtBigUInt64BE(buf2, value, offset, min, max) {
      checkIntBI(value, min, max, buf2, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf2[offset + 7] = lo;
      lo = lo >> 8;
      buf2[offset + 6] = lo;
      lo = lo >> 8;
      buf2[offset + 5] = lo;
      lo = lo >> 8;
      buf2[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf2[offset + 3] = hi;
      hi = hi >> 8;
      buf2[offset + 2] = hi;
      hi = hi >> 8;
      buf2[offset + 1] = hi;
      hi = hi >> 8;
      buf2[offset] = hi;
      return offset + 8;
    }
    Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
      if (value < 0) value = 255 + value + 1;
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
      return offset + 4;
    };
    Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      if (value < 0) value = 4294967295 + value + 1;
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function checkIEEE754(buf2, value, offset, ext, max, min) {
      if (offset + ext > buf2.length) throw new RangeError("Index out of range");
      if (offset < 0) throw new RangeError("Index out of range");
    }
    function writeFloat(buf2, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf2, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
      }
      ieee754.write(buf2, value, offset, littleEndian, 23, 4);
      return offset + 4;
    }
    Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert);
    };
    Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert);
    };
    function writeDouble(buf2, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf2, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
      }
      ieee754.write(buf2, value, offset, littleEndian, 52, 8);
      return offset + 8;
    }
    Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert);
    };
    Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert);
    };
    Buffer.prototype.copy = function copy(target, targetStart, start, end) {
      if (!Buffer.isBuffer(target)) throw new TypeError("argument should be a Buffer");
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;
      if (end === start) return 0;
      if (target.length === 0 || this.length === 0) return 0;
      if (targetStart < 0) {
        throw new RangeError("targetStart out of bounds");
      }
      if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
      if (end < 0) throw new RangeError("sourceEnd out of bounds");
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }
      const len = end - start;
      if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        );
      }
      return len;
    };
    Buffer.prototype.fill = function fill(val, start, end, encoding) {
      if (typeof val === "string") {
        if (typeof start === "string") {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === "string") {
          encoding = end;
          end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
          throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
          const code6 = val.charCodeAt(0);
          if (encoding === "utf8" && code6 < 128 || encoding === "latin1") {
            val = code6;
          }
        }
      } else if (typeof val === "number") {
        val = val & 255;
      } else if (typeof val === "boolean") {
        val = Number(val);
      }
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
      }
      if (end <= start) {
        return this;
      }
      start = start >>> 0;
      end = end === void 0 ? this.length : end >>> 0;
      if (!val) val = 0;
      let i;
      if (typeof val === "number") {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        const bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
          throw new TypeError('The value "' + val + '" is invalid for argument "value"');
        }
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }
      return this;
    };
    var errors = {};
    function E(sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor() {
          super();
          Object.defineProperty(this, "message", {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });
          this.name = `${this.name} [${sym}]`;
          this.stack;
          delete this.name;
        }
        get code() {
          return sym;
        }
        set code(value) {
          Object.defineProperty(this, "code", {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
        toString() {
          return `${this.name} [${sym}]: ${this.message}`;
        }
      };
    }
    E(
      "ERR_BUFFER_OUT_OF_BOUNDS",
      function(name5) {
        if (name5) {
          return `${name5} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      },
      RangeError
    );
    E(
      "ERR_INVALID_ARG_TYPE",
      function(name5, actual) {
        return `The "${name5}" argument must be of type number. Received type ${typeof actual}`;
      },
      TypeError
    );
    E(
      "ERR_OUT_OF_RANGE",
      function(str, range, input) {
        let msg = `The value of "${str}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg;
      },
      RangeError
    );
    function addNumericalSeparator(val) {
      let res = "";
      let i = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`;
    }
    function checkBounds(buf2, offset, byteLength2) {
      validateNumber(offset, "offset");
      if (buf2[offset] === void 0 || buf2[offset + byteLength2] === void 0) {
        boundsError(offset, buf2.length - (byteLength2 + 1));
      }
    }
    function checkIntBI(value, min, max, buf2, offset, byteLength2) {
      if (value > max || value < min) {
        const n = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength2 > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
          } else {
            range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
          }
        } else {
          range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new errors.ERR_OUT_OF_RANGE("value", range, value);
      }
      checkBounds(buf2, offset, byteLength2);
    }
    function validateNumber(value, name5) {
      if (typeof value !== "number") {
        throw new errors.ERR_INVALID_ARG_TYPE(name5, "number", value);
      }
    }
    function boundsError(value, length2, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
      }
      if (length2 < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
      }
      throw new errors.ERR_OUT_OF_RANGE(
        type || "offset",
        `>= ${type ? 1 : 0} and <= ${length2}`,
        value
      );
    }
    var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
    function base64clean(str) {
      str = str.split("=")[0];
      str = str.trim().replace(INVALID_BASE64_RE, "");
      if (str.length < 2) return "";
      while (str.length % 4 !== 0) {
        str = str + "=";
      }
      return str;
    }
    function utf8ToBytes2(string2, units) {
      units = units || Infinity;
      let codePoint;
      const length2 = string2.length;
      let leadSurrogate = null;
      const bytes = [];
      for (let i = 0; i < length2; ++i) {
        codePoint = string2.charCodeAt(i);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            } else if (i + 1 === length2) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
        }
        leadSurrogate = null;
        if (codePoint < 128) {
          if ((units -= 1) < 0) break;
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          if ((units -= 2) < 0) break;
          bytes.push(
            codePoint >> 6 | 192,
            codePoint & 63 | 128
          );
        } else if (codePoint < 65536) {
          if ((units -= 3) < 0) break;
          bytes.push(
            codePoint >> 12 | 224,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else if (codePoint < 1114112) {
          if ((units -= 4) < 0) break;
          bytes.push(
            codePoint >> 18 | 240,
            codePoint >> 12 & 63 | 128,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else {
          throw new Error("Invalid code point");
        }
      }
      return bytes;
    }
    function asciiToBytes(str) {
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        byteArray.push(str.charCodeAt(i) & 255);
      }
      return byteArray;
    }
    function utf16leToBytes(str, units) {
      let c, hi, lo;
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break;
        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }
      return byteArray;
    }
    function base64ToBytes(str) {
      return base642.toByteArray(base64clean(str));
    }
    function blitBuffer(src2, dst, offset, length2) {
      let i;
      for (i = 0; i < length2; ++i) {
        if (i + offset >= dst.length || i >= src2.length) break;
        dst[i + offset] = src2[i];
      }
      return i;
    }
    function isInstance(obj, type) {
      return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    function numberIsNaN(obj) {
      return obj !== obj;
    }
    var hexSliceLookupTable = (function() {
      const alphabet2 = "0123456789abcdef";
      const table = new Array(256);
      for (let i = 0; i < 16; ++i) {
        const i16 = i * 16;
        for (let j = 0; j < 16; ++j) {
          table[i16 + j] = alphabet2[i] + alphabet2[j];
        }
      }
      return table;
    })();
    function defineBigIntMethod(fn) {
      return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
    }
    function BufferBigIntNotDefined() {
      throw new Error("BigInt not supported");
    }
  }
});

// node_modules/bl/BufferList.js
var require_BufferList = __commonJS({
  "node_modules/bl/BufferList.js"(exports2, module2) {
    "use strict";
    var { Buffer } = require_buffer();
    var symbol = Symbol.for("BufferList");
    function BufferList3(buf2) {
      if (!(this instanceof BufferList3)) {
        return new BufferList3(buf2);
      }
      BufferList3._init.call(this, buf2);
    }
    BufferList3._init = function _init(buf2) {
      Object.defineProperty(this, symbol, { value: true });
      this._bufs = [];
      this.length = 0;
      if (buf2) {
        this.append(buf2);
      }
    };
    BufferList3.prototype._new = function _new(buf2) {
      return new BufferList3(buf2);
    };
    BufferList3.prototype._offset = function _offset(offset) {
      if (offset === 0) {
        return [0, 0];
      }
      let tot = 0;
      for (let i = 0; i < this._bufs.length; i++) {
        const _t = tot + this._bufs[i].length;
        if (offset < _t || i === this._bufs.length - 1) {
          return [i, offset - tot];
        }
        tot = _t;
      }
    };
    BufferList3.prototype._reverseOffset = function(blOffset) {
      const bufferId = blOffset[0];
      let offset = blOffset[1];
      for (let i = 0; i < bufferId; i++) {
        offset += this._bufs[i].length;
      }
      return offset;
    };
    BufferList3.prototype.get = function get2(index) {
      if (index > this.length || index < 0) {
        return void 0;
      }
      const offset = this._offset(index);
      return this._bufs[offset[0]][offset[1]];
    };
    BufferList3.prototype.slice = function slice2(start, end) {
      if (typeof start === "number" && start < 0) {
        start += this.length;
      }
      if (typeof end === "number" && end < 0) {
        end += this.length;
      }
      return this.copy(null, 0, start, end);
    };
    BufferList3.prototype.copy = function copy(dst, dstStart, srcStart, srcEnd) {
      if (typeof srcStart !== "number" || srcStart < 0) {
        srcStart = 0;
      }
      if (typeof srcEnd !== "number" || srcEnd > this.length) {
        srcEnd = this.length;
      }
      if (srcStart >= this.length) {
        return dst || Buffer.alloc(0);
      }
      if (srcEnd <= 0) {
        return dst || Buffer.alloc(0);
      }
      const copy2 = !!dst;
      const off = this._offset(srcStart);
      const len = srcEnd - srcStart;
      let bytes = len;
      let bufoff = copy2 && dstStart || 0;
      let start = off[1];
      if (srcStart === 0 && srcEnd === this.length) {
        if (!copy2) {
          return this._bufs.length === 1 ? this._bufs[0] : Buffer.concat(this._bufs, this.length);
        }
        for (let i = 0; i < this._bufs.length; i++) {
          this._bufs[i].copy(dst, bufoff);
          bufoff += this._bufs[i].length;
        }
        return dst;
      }
      if (bytes <= this._bufs[off[0]].length - start) {
        return copy2 ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes) : this._bufs[off[0]].slice(start, start + bytes);
      }
      if (!copy2) {
        dst = Buffer.allocUnsafe(len);
      }
      for (let i = off[0]; i < this._bufs.length; i++) {
        const l = this._bufs[i].length - start;
        if (bytes > l) {
          this._bufs[i].copy(dst, bufoff, start);
          bufoff += l;
        } else {
          this._bufs[i].copy(dst, bufoff, start, start + bytes);
          bufoff += l;
          break;
        }
        bytes -= l;
        if (start) {
          start = 0;
        }
      }
      if (dst.length > bufoff) return dst.slice(0, bufoff);
      return dst;
    };
    BufferList3.prototype.shallowSlice = function shallowSlice(start, end) {
      start = start || 0;
      end = typeof end !== "number" ? this.length : end;
      if (start < 0) {
        start += this.length;
      }
      if (end < 0) {
        end += this.length;
      }
      if (start === end) {
        return this._new();
      }
      const startOffset = this._offset(start);
      const endOffset = this._offset(end);
      const buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1);
      if (endOffset[1] === 0) {
        buffers.pop();
      } else {
        buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1]);
      }
      if (startOffset[1] !== 0) {
        buffers[0] = buffers[0].slice(startOffset[1]);
      }
      return this._new(buffers);
    };
    BufferList3.prototype.toString = function toString3(encoding, start, end) {
      return this.slice(start, end).toString(encoding);
    };
    BufferList3.prototype.consume = function consume(bytes) {
      bytes = Math.trunc(bytes);
      if (Number.isNaN(bytes) || bytes <= 0) return this;
      while (this._bufs.length) {
        if (bytes >= this._bufs[0].length) {
          bytes -= this._bufs[0].length;
          this.length -= this._bufs[0].length;
          this._bufs.shift();
        } else {
          this._bufs[0] = this._bufs[0].slice(bytes);
          this.length -= bytes;
          break;
        }
      }
      return this;
    };
    BufferList3.prototype.duplicate = function duplicate() {
      const copy = this._new();
      for (let i = 0; i < this._bufs.length; i++) {
        copy.append(this._bufs[i]);
      }
      return copy;
    };
    BufferList3.prototype.append = function append(buf2) {
      if (buf2 == null) {
        return this;
      }
      if (buf2.buffer) {
        this._appendBuffer(Buffer.from(buf2.buffer, buf2.byteOffset, buf2.byteLength));
      } else if (Array.isArray(buf2)) {
        for (let i = 0; i < buf2.length; i++) {
          this.append(buf2[i]);
        }
      } else if (this._isBufferList(buf2)) {
        for (let i = 0; i < buf2._bufs.length; i++) {
          this.append(buf2._bufs[i]);
        }
      } else {
        if (typeof buf2 === "number") {
          buf2 = buf2.toString();
        }
        this._appendBuffer(Buffer.from(buf2));
      }
      return this;
    };
    BufferList3.prototype._appendBuffer = function appendBuffer(buf2) {
      this._bufs.push(buf2);
      this.length += buf2.length;
    };
    BufferList3.prototype.indexOf = function(search, offset, encoding) {
      if (encoding === void 0 && typeof offset === "string") {
        encoding = offset;
        offset = void 0;
      }
      if (typeof search === "function" || Array.isArray(search)) {
        throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');
      } else if (typeof search === "number") {
        search = Buffer.from([search]);
      } else if (typeof search === "string") {
        search = Buffer.from(search, encoding);
      } else if (this._isBufferList(search)) {
        search = search.slice();
      } else if (Array.isArray(search.buffer)) {
        search = Buffer.from(search.buffer, search.byteOffset, search.byteLength);
      } else if (!Buffer.isBuffer(search)) {
        search = Buffer.from(search);
      }
      offset = Number(offset || 0);
      if (isNaN(offset)) {
        offset = 0;
      }
      if (offset < 0) {
        offset = this.length + offset;
      }
      if (offset < 0) {
        offset = 0;
      }
      if (search.length === 0) {
        return offset > this.length ? this.length : offset;
      }
      const blOffset = this._offset(offset);
      let blIndex = blOffset[0];
      let buffOffset = blOffset[1];
      for (; blIndex < this._bufs.length; blIndex++) {
        const buff = this._bufs[blIndex];
        while (buffOffset < buff.length) {
          const availableWindow = buff.length - buffOffset;
          if (availableWindow >= search.length) {
            const nativeSearchResult = buff.indexOf(search, buffOffset);
            if (nativeSearchResult !== -1) {
              return this._reverseOffset([blIndex, nativeSearchResult]);
            }
            buffOffset = buff.length - search.length + 1;
          } else {
            const revOffset = this._reverseOffset([blIndex, buffOffset]);
            if (this._match(revOffset, search)) {
              return revOffset;
            }
            buffOffset++;
          }
        }
        buffOffset = 0;
      }
      return -1;
    };
    BufferList3.prototype._match = function(offset, search) {
      if (this.length - offset < search.length) {
        return false;
      }
      for (let searchOffset = 0; searchOffset < search.length; searchOffset++) {
        if (this.get(offset + searchOffset) !== search[searchOffset]) {
          return false;
        }
      }
      return true;
    };
    (function() {
      const methods = {
        readDoubleBE: 8,
        readDoubleLE: 8,
        readFloatBE: 4,
        readFloatLE: 4,
        readInt32BE: 4,
        readInt32LE: 4,
        readUInt32BE: 4,
        readUInt32LE: 4,
        readInt16BE: 2,
        readInt16LE: 2,
        readUInt16BE: 2,
        readUInt16LE: 2,
        readInt8: 1,
        readUInt8: 1,
        readIntBE: null,
        readIntLE: null,
        readUIntBE: null,
        readUIntLE: null
      };
      for (const m in methods) {
        (function(m2) {
          if (methods[m2] === null) {
            BufferList3.prototype[m2] = function(offset, byteLength) {
              return this.slice(offset, offset + byteLength)[m2](0, byteLength);
            };
          } else {
            BufferList3.prototype[m2] = function(offset = 0) {
              return this.slice(offset, offset + methods[m2])[m2](0);
            };
          }
        })(m);
      }
    })();
    BufferList3.prototype._isBufferList = function _isBufferList(b) {
      return b instanceof BufferList3 || BufferList3.isBufferList(b);
    };
    BufferList3.isBufferList = function isBufferList(b) {
      return b != null && b[symbol];
    };
    module2.exports = BufferList3;
  }
});

// node_modules/rabin-wasm/src/rabin.js
var require_rabin = __commonJS({
  "node_modules/rabin-wasm/src/rabin.js"(exports2, module2) {
    var Rabin = class {
      /**
       * Creates an instance of Rabin.
       * @param { import("./../dist/rabin-wasm") } asModule
       * @param {number} [bits=12]
       * @param {number} [min=8 * 1024]
       * @param {number} [max=32 * 1024]
       * @param {number} polynomial
       * @memberof Rabin
       */
      constructor(asModule, bits = 12, min = 8 * 1024, max = 32 * 1024, windowSize = 64, polynomial) {
        this.bits = bits;
        this.min = min;
        this.max = max;
        this.asModule = asModule;
        this.rabin = new asModule.Rabin(bits, min, max, windowSize, polynomial);
        this.polynomial = polynomial;
      }
      /**
       * Fingerprints the buffer
       *
       * @param {Uint8Array} buf
       * @returns {Array<number>}
       * @memberof Rabin
       */
      fingerprint(buf2) {
        const {
          __retain,
          __release,
          __allocArray,
          __getInt32Array,
          Int32Array_ID,
          Uint8Array_ID
        } = this.asModule;
        const lengths = new Int32Array(Math.ceil(buf2.length / this.min));
        const lengthsPtr = __retain(__allocArray(Int32Array_ID, lengths));
        const pointer = __retain(__allocArray(Uint8Array_ID, buf2));
        const out = this.rabin.fingerprint(pointer, lengthsPtr);
        const processed = __getInt32Array(out);
        __release(pointer);
        __release(lengthsPtr);
        const end = processed.indexOf(0);
        return end >= 0 ? processed.subarray(0, end) : processed;
      }
    };
    module2.exports = Rabin;
  }
});

// node_modules/@assemblyscript/loader/index.js
var require_loader = __commonJS({
  "node_modules/@assemblyscript/loader/index.js"(exports2) {
    "use strict";
    var ID_OFFSET = -8;
    var SIZE_OFFSET = -4;
    var ARRAYBUFFER_ID = 0;
    var STRING_ID = 1;
    var ARRAYBUFFERVIEW = 1 << 0;
    var ARRAY = 1 << 1;
    var SET = 1 << 2;
    var MAP = 1 << 3;
    var VAL_ALIGN_OFFSET = 5;
    var VAL_ALIGN = 1 << VAL_ALIGN_OFFSET;
    var VAL_SIGNED = 1 << 10;
    var VAL_FLOAT = 1 << 11;
    var VAL_NULLABLE = 1 << 12;
    var VAL_MANAGED = 1 << 13;
    var KEY_ALIGN_OFFSET = 14;
    var KEY_ALIGN = 1 << KEY_ALIGN_OFFSET;
    var KEY_SIGNED = 1 << 19;
    var KEY_FLOAT = 1 << 20;
    var KEY_NULLABLE = 1 << 21;
    var KEY_MANAGED = 1 << 22;
    var ARRAYBUFFERVIEW_BUFFER_OFFSET = 0;
    var ARRAYBUFFERVIEW_DATASTART_OFFSET = 4;
    var ARRAYBUFFERVIEW_DATALENGTH_OFFSET = 8;
    var ARRAYBUFFERVIEW_SIZE = 12;
    var ARRAY_LENGTH_OFFSET = 12;
    var ARRAY_SIZE = 16;
    var BIGINT = typeof BigUint64Array !== "undefined";
    var THIS = Symbol();
    var CHUNKSIZE = 1024;
    function getStringImpl(buffer2, ptr) {
      const U32 = new Uint32Array(buffer2);
      const U16 = new Uint16Array(buffer2);
      var length2 = U32[ptr + SIZE_OFFSET >>> 2] >>> 1;
      var offset = ptr >>> 1;
      if (length2 <= CHUNKSIZE) return String.fromCharCode.apply(String, U16.subarray(offset, offset + length2));
      const parts = [];
      do {
        const last3 = U16[offset + CHUNKSIZE - 1];
        const size = last3 >= 55296 && last3 < 56320 ? CHUNKSIZE - 1 : CHUNKSIZE;
        parts.push(String.fromCharCode.apply(String, U16.subarray(offset, offset += size)));
        length2 -= size;
      } while (length2 > CHUNKSIZE);
      return parts.join("") + String.fromCharCode.apply(String, U16.subarray(offset, offset + length2));
    }
    function preInstantiate(imports) {
      const baseModule = {};
      function getString(memory, ptr) {
        if (!memory) return "<yet unknown>";
        return getStringImpl(memory.buffer, ptr);
      }
      const env = imports.env = imports.env || {};
      env.abort = env.abort || function abort(mesg, file, line, colm) {
        const memory = baseModule.memory || env.memory;
        throw Error("abort: " + getString(memory, mesg) + " at " + getString(memory, file) + ":" + line + ":" + colm);
      };
      env.trace = env.trace || function trace(mesg, n) {
        const memory = baseModule.memory || env.memory;
        console.log("trace: " + getString(memory, mesg) + (n ? " " : "") + Array.prototype.slice.call(arguments, 2, 2 + n).join(", "));
      };
      imports.Math = imports.Math || Math;
      imports.Date = imports.Date || Date;
      return baseModule;
    }
    function postInstantiate(baseModule, instance) {
      const rawExports = instance.exports;
      const memory = rawExports.memory;
      const table = rawExports.table;
      const alloc2 = rawExports["__alloc"];
      const retain = rawExports["__retain"];
      const rttiBase = rawExports["__rtti_base"] || ~0;
      function getInfo(id) {
        const U32 = new Uint32Array(memory.buffer);
        const count = U32[rttiBase >>> 2];
        if ((id >>>= 0) >= count) throw Error("invalid id: " + id);
        return U32[(rttiBase + 4 >>> 2) + id * 2];
      }
      function getBase(id) {
        const U32 = new Uint32Array(memory.buffer);
        const count = U32[rttiBase >>> 2];
        if ((id >>>= 0) >= count) throw Error("invalid id: " + id);
        return U32[(rttiBase + 4 >>> 2) + id * 2 + 1];
      }
      function getValueAlign(info) {
        return 31 - Math.clz32(info >>> VAL_ALIGN_OFFSET & 31);
      }
      function getKeyAlign(info) {
        return 31 - Math.clz32(info >>> KEY_ALIGN_OFFSET & 31);
      }
      function __allocString(str) {
        const length2 = str.length;
        const ptr = alloc2(length2 << 1, STRING_ID);
        const U16 = new Uint16Array(memory.buffer);
        for (var i = 0, p = ptr >>> 1; i < length2; ++i) U16[p + i] = str.charCodeAt(i);
        return ptr;
      }
      baseModule.__allocString = __allocString;
      function __getString(ptr) {
        const buffer2 = memory.buffer;
        const id = new Uint32Array(buffer2)[ptr + ID_OFFSET >>> 2];
        if (id !== STRING_ID) throw Error("not a string: " + ptr);
        return getStringImpl(buffer2, ptr);
      }
      baseModule.__getString = __getString;
      function getView(alignLog2, signed, float) {
        const buffer2 = memory.buffer;
        if (float) {
          switch (alignLog2) {
            case 2:
              return new Float32Array(buffer2);
            case 3:
              return new Float64Array(buffer2);
          }
        } else {
          switch (alignLog2) {
            case 0:
              return new (signed ? Int8Array : Uint8Array)(buffer2);
            case 1:
              return new (signed ? Int16Array : Uint16Array)(buffer2);
            case 2:
              return new (signed ? Int32Array : Uint32Array)(buffer2);
            case 3:
              return new (signed ? BigInt64Array : BigUint64Array)(buffer2);
          }
        }
        throw Error("unsupported align: " + alignLog2);
      }
      function __allocArray(id, values) {
        const info = getInfo(id);
        if (!(info & (ARRAYBUFFERVIEW | ARRAY))) throw Error("not an array: " + id + " @ " + info);
        const align = getValueAlign(info);
        const length2 = values.length;
        const buf2 = alloc2(length2 << align, ARRAYBUFFER_ID);
        const arr = alloc2(info & ARRAY ? ARRAY_SIZE : ARRAYBUFFERVIEW_SIZE, id);
        const U32 = new Uint32Array(memory.buffer);
        U32[arr + ARRAYBUFFERVIEW_BUFFER_OFFSET >>> 2] = retain(buf2);
        U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2] = buf2;
        U32[arr + ARRAYBUFFERVIEW_DATALENGTH_OFFSET >>> 2] = length2 << align;
        if (info & ARRAY) U32[arr + ARRAY_LENGTH_OFFSET >>> 2] = length2;
        const view = getView(align, info & VAL_SIGNED, info & VAL_FLOAT);
        if (info & VAL_MANAGED) {
          for (let i = 0; i < length2; ++i) view[(buf2 >>> align) + i] = retain(values[i]);
        } else {
          view.set(values, buf2 >>> align);
        }
        return arr;
      }
      baseModule.__allocArray = __allocArray;
      function __getArrayView(arr) {
        const U32 = new Uint32Array(memory.buffer);
        const id = U32[arr + ID_OFFSET >>> 2];
        const info = getInfo(id);
        if (!(info & ARRAYBUFFERVIEW)) throw Error("not an array: " + id);
        const align = getValueAlign(info);
        var buf2 = U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2];
        const length2 = info & ARRAY ? U32[arr + ARRAY_LENGTH_OFFSET >>> 2] : U32[buf2 + SIZE_OFFSET >>> 2] >>> align;
        return getView(align, info & VAL_SIGNED, info & VAL_FLOAT).subarray(buf2 >>>= align, buf2 + length2);
      }
      baseModule.__getArrayView = __getArrayView;
      function __getArray(arr) {
        const input = __getArrayView(arr);
        const len = input.length;
        const out = new Array(len);
        for (let i = 0; i < len; i++) out[i] = input[i];
        return out;
      }
      baseModule.__getArray = __getArray;
      function __getArrayBuffer(ptr) {
        const buffer2 = memory.buffer;
        const length2 = new Uint32Array(buffer2)[ptr + SIZE_OFFSET >>> 2];
        return buffer2.slice(ptr, ptr + length2);
      }
      baseModule.__getArrayBuffer = __getArrayBuffer;
      function getTypedArray(Type2, alignLog2, ptr) {
        return new Type2(getTypedArrayView(Type2, alignLog2, ptr));
      }
      function getTypedArrayView(Type2, alignLog2, ptr) {
        const buffer2 = memory.buffer;
        const U32 = new Uint32Array(buffer2);
        const bufPtr = U32[ptr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2];
        return new Type2(buffer2, bufPtr, U32[bufPtr + SIZE_OFFSET >>> 2] >>> alignLog2);
      }
      baseModule.__getInt8Array = getTypedArray.bind(null, Int8Array, 0);
      baseModule.__getInt8ArrayView = getTypedArrayView.bind(null, Int8Array, 0);
      baseModule.__getUint8Array = getTypedArray.bind(null, Uint8Array, 0);
      baseModule.__getUint8ArrayView = getTypedArrayView.bind(null, Uint8Array, 0);
      baseModule.__getUint8ClampedArray = getTypedArray.bind(null, Uint8ClampedArray, 0);
      baseModule.__getUint8ClampedArrayView = getTypedArrayView.bind(null, Uint8ClampedArray, 0);
      baseModule.__getInt16Array = getTypedArray.bind(null, Int16Array, 1);
      baseModule.__getInt16ArrayView = getTypedArrayView.bind(null, Int16Array, 1);
      baseModule.__getUint16Array = getTypedArray.bind(null, Uint16Array, 1);
      baseModule.__getUint16ArrayView = getTypedArrayView.bind(null, Uint16Array, 1);
      baseModule.__getInt32Array = getTypedArray.bind(null, Int32Array, 2);
      baseModule.__getInt32ArrayView = getTypedArrayView.bind(null, Int32Array, 2);
      baseModule.__getUint32Array = getTypedArray.bind(null, Uint32Array, 2);
      baseModule.__getUint32ArrayView = getTypedArrayView.bind(null, Uint32Array, 2);
      if (BIGINT) {
        baseModule.__getInt64Array = getTypedArray.bind(null, BigInt64Array, 3);
        baseModule.__getInt64ArrayView = getTypedArrayView.bind(null, BigInt64Array, 3);
        baseModule.__getUint64Array = getTypedArray.bind(null, BigUint64Array, 3);
        baseModule.__getUint64ArrayView = getTypedArrayView.bind(null, BigUint64Array, 3);
      }
      baseModule.__getFloat32Array = getTypedArray.bind(null, Float32Array, 2);
      baseModule.__getFloat32ArrayView = getTypedArrayView.bind(null, Float32Array, 2);
      baseModule.__getFloat64Array = getTypedArray.bind(null, Float64Array, 3);
      baseModule.__getFloat64ArrayView = getTypedArrayView.bind(null, Float64Array, 3);
      function __instanceof(ptr, baseId) {
        const U32 = new Uint32Array(memory.buffer);
        var id = U32[ptr + ID_OFFSET >>> 2];
        if (id <= U32[rttiBase >>> 2]) {
          do
            if (id == baseId) return true;
          while (id = getBase(id));
        }
        return false;
      }
      baseModule.__instanceof = __instanceof;
      baseModule.memory = baseModule.memory || memory;
      baseModule.table = baseModule.table || table;
      return demangle(rawExports, baseModule);
    }
    function isResponse(o) {
      return typeof Response !== "undefined" && o instanceof Response;
    }
    async function instantiate(source, imports) {
      if (isResponse(source = await source)) return instantiateStreaming(source, imports);
      return postInstantiate(
        preInstantiate(imports || (imports = {})),
        await WebAssembly.instantiate(
          source instanceof WebAssembly.Module ? source : await WebAssembly.compile(source),
          imports
        )
      );
    }
    exports2.instantiate = instantiate;
    function instantiateSync(source, imports) {
      return postInstantiate(
        preInstantiate(imports || (imports = {})),
        new WebAssembly.Instance(
          source instanceof WebAssembly.Module ? source : new WebAssembly.Module(source),
          imports
        )
      );
    }
    exports2.instantiateSync = instantiateSync;
    async function instantiateStreaming(source, imports) {
      if (!WebAssembly.instantiateStreaming) {
        return instantiate(
          isResponse(source = await source) ? source.arrayBuffer() : source,
          imports
        );
      }
      return postInstantiate(
        preInstantiate(imports || (imports = {})),
        (await WebAssembly.instantiateStreaming(source, imports)).instance
      );
    }
    exports2.instantiateStreaming = instantiateStreaming;
    function demangle(exports3, baseModule) {
      var module3 = baseModule ? Object.create(baseModule) : {};
      var setArgumentsLength = exports3["__argumentsLength"] ? function(length2) {
        exports3["__argumentsLength"].value = length2;
      } : exports3["__setArgumentsLength"] || exports3["__setargc"] || function() {
      };
      for (let internalName in exports3) {
        if (!Object.prototype.hasOwnProperty.call(exports3, internalName)) continue;
        const elem = exports3[internalName];
        let parts = internalName.split(".");
        let curr = module3;
        while (parts.length > 1) {
          let part = parts.shift();
          if (!Object.prototype.hasOwnProperty.call(curr, part)) curr[part] = {};
          curr = curr[part];
        }
        let name5 = parts[0];
        let hash = name5.indexOf("#");
        if (hash >= 0) {
          let className = name5.substring(0, hash);
          let classElem = curr[className];
          if (typeof classElem === "undefined" || !classElem.prototype) {
            let ctor = function(...args) {
              return ctor.wrap(ctor.prototype.constructor(0, ...args));
            };
            ctor.prototype = {
              valueOf: function valueOf() {
                return this[THIS];
              }
            };
            ctor.wrap = function(thisValue) {
              return Object.create(ctor.prototype, { [THIS]: { value: thisValue, writable: false } });
            };
            if (classElem) Object.getOwnPropertyNames(classElem).forEach(
              (name6) => Object.defineProperty(ctor, name6, Object.getOwnPropertyDescriptor(classElem, name6))
            );
            curr[className] = ctor;
          }
          name5 = name5.substring(hash + 1);
          curr = curr[className].prototype;
          if (/^(get|set):/.test(name5)) {
            if (!Object.prototype.hasOwnProperty.call(curr, name5 = name5.substring(4))) {
              let getter = exports3[internalName.replace("set:", "get:")];
              let setter = exports3[internalName.replace("get:", "set:")];
              Object.defineProperty(curr, name5, {
                get: function() {
                  return getter(this[THIS]);
                },
                set: function(value) {
                  setter(this[THIS], value);
                },
                enumerable: true
              });
            }
          } else {
            if (name5 === "constructor") {
              (curr[name5] = (...args) => {
                setArgumentsLength(args.length);
                return elem(...args);
              }).original = elem;
            } else {
              (curr[name5] = function(...args) {
                setArgumentsLength(args.length);
                return elem(this[THIS], ...args);
              }).original = elem;
            }
          }
        } else {
          if (/^(get|set):/.test(name5)) {
            if (!Object.prototype.hasOwnProperty.call(curr, name5 = name5.substring(4))) {
              Object.defineProperty(curr, name5, {
                get: exports3[internalName.replace("set:", "get:")],
                set: exports3[internalName.replace("get:", "set:")],
                enumerable: true
              });
            }
          } else if (typeof elem === "function" && elem !== setArgumentsLength) {
            (curr[name5] = (...args) => {
              setArgumentsLength(args.length);
              return elem(...args);
            }).original = elem;
          } else {
            curr[name5] = elem;
          }
        }
      }
      return module3;
    }
    exports2.demangle = demangle;
  }
});

// node_modules/rabin-wasm/dist/rabin-wasm.js
var require_rabin_wasm = __commonJS({
  "node_modules/rabin-wasm/dist/rabin-wasm.js"(exports2, module2) {
    var { instantiate } = require_loader();
    loadWebAssembly.supported = typeof WebAssembly !== "undefined";
    function loadWebAssembly(imp = {}) {
      if (!loadWebAssembly.supported) return null;
      var wasm = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 78, 14, 96, 2, 127, 126, 0, 96, 1, 127, 1, 126, 96, 2, 127, 127, 0, 96, 1, 127, 1, 127, 96, 1, 127, 0, 96, 2, 127, 127, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 0, 0, 96, 3, 127, 127, 127, 0, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 0, 96, 5, 127, 127, 127, 127, 127, 1, 127, 96, 1, 126, 1, 127, 96, 2, 126, 126, 1, 126, 2, 13, 1, 3, 101, 110, 118, 5, 97, 98, 111, 114, 116, 0, 10, 3, 54, 53, 2, 2, 8, 9, 3, 5, 2, 8, 6, 5, 3, 4, 2, 6, 9, 12, 13, 2, 5, 11, 3, 2, 3, 2, 3, 2, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6, 7, 7, 4, 4, 5, 3, 1, 0, 1, 6, 47, 9, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 0, 65, 3, 11, 127, 0, 65, 4, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 0, 65, 240, 2, 11, 127, 0, 65, 6, 11, 7, 240, 5, 41, 6, 109, 101, 109, 111, 114, 121, 2, 0, 7, 95, 95, 97, 108, 108, 111, 99, 0, 10, 8, 95, 95, 114, 101, 116, 97, 105, 110, 0, 11, 9, 95, 95, 114, 101, 108, 101, 97, 115, 101, 0, 12, 9, 95, 95, 99, 111, 108, 108, 101, 99, 116, 0, 51, 11, 95, 95, 114, 116, 116, 105, 95, 98, 97, 115, 101, 3, 7, 13, 73, 110, 116, 51, 50, 65, 114, 114, 97, 121, 95, 73, 68, 3, 2, 13, 85, 105, 110, 116, 56, 65, 114, 114, 97, 121, 95, 73, 68, 3, 3, 6, 100, 101, 103, 114, 101, 101, 0, 16, 3, 109, 111, 100, 0, 17, 5, 82, 97, 98, 105, 110, 3, 8, 16, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 119, 105, 110, 100, 111, 119, 0, 21, 16, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 119, 105, 110, 100, 111, 119, 0, 22, 21, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 119, 105, 110, 100, 111, 119, 95, 115, 105, 122, 101, 0, 23, 21, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 119, 105, 110, 100, 111, 119, 95, 115, 105, 122, 101, 0, 24, 14, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 119, 112, 111, 115, 0, 25, 14, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 119, 112, 111, 115, 0, 26, 15, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 99, 111, 117, 110, 116, 0, 27, 15, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 99, 111, 117, 110, 116, 0, 28, 13, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 112, 111, 115, 0, 29, 13, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 112, 111, 115, 0, 30, 15, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 115, 116, 97, 114, 116, 0, 31, 15, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 115, 116, 97, 114, 116, 0, 32, 16, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 100, 105, 103, 101, 115, 116, 0, 33, 16, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 100, 105, 103, 101, 115, 116, 0, 34, 21, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 99, 104, 117, 110, 107, 95, 115, 116, 97, 114, 116, 0, 35, 21, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 99, 104, 117, 110, 107, 95, 115, 116, 97, 114, 116, 0, 36, 22, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 99, 104, 117, 110, 107, 95, 108, 101, 110, 103, 116, 104, 0, 37, 22, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 99, 104, 117, 110, 107, 95, 108, 101, 110, 103, 116, 104, 0, 38, 31, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 99, 104, 117, 110, 107, 95, 99, 117, 116, 95, 102, 105, 110, 103, 101, 114, 112, 114, 105, 110, 116, 0, 39, 31, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 99, 104, 117, 110, 107, 95, 99, 117, 116, 95, 102, 105, 110, 103, 101, 114, 112, 114, 105, 110, 116, 0, 40, 20, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 112, 111, 108, 121, 110, 111, 109, 105, 97, 108, 0, 41, 20, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 112, 111, 108, 121, 110, 111, 109, 105, 97, 108, 0, 42, 17, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 109, 105, 110, 115, 105, 122, 101, 0, 43, 17, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 109, 105, 110, 115, 105, 122, 101, 0, 44, 17, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 109, 97, 120, 115, 105, 122, 101, 0, 45, 17, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 109, 97, 120, 115, 105, 122, 101, 0, 46, 14, 82, 97, 98, 105, 110, 35, 103, 101, 116, 58, 109, 97, 115, 107, 0, 47, 14, 82, 97, 98, 105, 110, 35, 115, 101, 116, 58, 109, 97, 115, 107, 0, 48, 17, 82, 97, 98, 105, 110, 35, 99, 111, 110, 115, 116, 114, 117, 99, 116, 111, 114, 0, 20, 17, 82, 97, 98, 105, 110, 35, 102, 105, 110, 103, 101, 114, 112, 114, 105, 110, 116, 0, 49, 8, 1, 50, 10, 165, 31, 53, 199, 1, 1, 4, 127, 32, 1, 40, 2, 0, 65, 124, 113, 34, 2, 65, 128, 2, 73, 4, 127, 32, 2, 65, 4, 118, 33, 4, 65, 0, 5, 32, 2, 65, 31, 32, 2, 103, 107, 34, 3, 65, 4, 107, 118, 65, 16, 115, 33, 4, 32, 3, 65, 7, 107, 11, 33, 3, 32, 1, 40, 2, 20, 33, 2, 32, 1, 40, 2, 16, 34, 5, 4, 64, 32, 5, 32, 2, 54, 2, 20, 11, 32, 2, 4, 64, 32, 2, 32, 5, 54, 2, 16, 11, 32, 1, 32, 0, 32, 4, 32, 3, 65, 4, 116, 106, 65, 2, 116, 106, 40, 2, 96, 70, 4, 64, 32, 0, 32, 4, 32, 3, 65, 4, 116, 106, 65, 2, 116, 106, 32, 2, 54, 2, 96, 32, 2, 69, 4, 64, 32, 0, 32, 3, 65, 2, 116, 106, 32, 0, 32, 3, 65, 2, 116, 106, 40, 2, 4, 65, 1, 32, 4, 116, 65, 127, 115, 113, 34, 1, 54, 2, 4, 32, 1, 69, 4, 64, 32, 0, 32, 0, 40, 2, 0, 65, 1, 32, 3, 116, 65, 127, 115, 113, 54, 2, 0, 11, 11, 11, 11, 226, 2, 1, 6, 127, 32, 1, 40, 2, 0, 33, 3, 32, 1, 65, 16, 106, 32, 1, 40, 2, 0, 65, 124, 113, 106, 34, 4, 40, 2, 0, 34, 5, 65, 1, 113, 4, 64, 32, 3, 65, 124, 113, 65, 16, 106, 32, 5, 65, 124, 113, 106, 34, 2, 65, 240, 255, 255, 255, 3, 73, 4, 64, 32, 0, 32, 4, 16, 1, 32, 1, 32, 2, 32, 3, 65, 3, 113, 114, 34, 3, 54, 2, 0, 32, 1, 65, 16, 106, 32, 1, 40, 2, 0, 65, 124, 113, 106, 34, 4, 40, 2, 0, 33, 5, 11, 11, 32, 3, 65, 2, 113, 4, 64, 32, 1, 65, 4, 107, 40, 2, 0, 34, 2, 40, 2, 0, 34, 6, 65, 124, 113, 65, 16, 106, 32, 3, 65, 124, 113, 106, 34, 7, 65, 240, 255, 255, 255, 3, 73, 4, 64, 32, 0, 32, 2, 16, 1, 32, 2, 32, 7, 32, 6, 65, 3, 113, 114, 34, 3, 54, 2, 0, 32, 2, 33, 1, 11, 11, 32, 4, 32, 5, 65, 2, 114, 54, 2, 0, 32, 4, 65, 4, 107, 32, 1, 54, 2, 0, 32, 0, 32, 3, 65, 124, 113, 34, 2, 65, 128, 2, 73, 4, 127, 32, 2, 65, 4, 118, 33, 4, 65, 0, 5, 32, 2, 65, 31, 32, 2, 103, 107, 34, 2, 65, 4, 107, 118, 65, 16, 115, 33, 4, 32, 2, 65, 7, 107, 11, 34, 3, 65, 4, 116, 32, 4, 106, 65, 2, 116, 106, 40, 2, 96, 33, 2, 32, 1, 65, 0, 54, 2, 16, 32, 1, 32, 2, 54, 2, 20, 32, 2, 4, 64, 32, 2, 32, 1, 54, 2, 16, 11, 32, 0, 32, 4, 32, 3, 65, 4, 116, 106, 65, 2, 116, 106, 32, 1, 54, 2, 96, 32, 0, 32, 0, 40, 2, 0, 65, 1, 32, 3, 116, 114, 54, 2, 0, 32, 0, 32, 3, 65, 2, 116, 106, 32, 0, 32, 3, 65, 2, 116, 106, 40, 2, 4, 65, 1, 32, 4, 116, 114, 54, 2, 4, 11, 119, 1, 1, 127, 32, 2, 2, 127, 32, 0, 40, 2, 160, 12, 34, 2, 4, 64, 32, 2, 32, 1, 65, 16, 107, 70, 4, 64, 32, 2, 40, 2, 0, 33, 3, 32, 1, 65, 16, 107, 33, 1, 11, 11, 32, 1, 11, 107, 34, 2, 65, 48, 73, 4, 64, 15, 11, 32, 1, 32, 3, 65, 2, 113, 32, 2, 65, 32, 107, 65, 1, 114, 114, 54, 2, 0, 32, 1, 65, 0, 54, 2, 16, 32, 1, 65, 0, 54, 2, 20, 32, 1, 32, 2, 106, 65, 16, 107, 34, 2, 65, 2, 54, 2, 0, 32, 0, 32, 2, 54, 2, 160, 12, 32, 0, 32, 1, 16, 2, 11, 155, 1, 1, 3, 127, 35, 0, 34, 0, 69, 4, 64, 65, 1, 63, 0, 34, 0, 74, 4, 127, 65, 1, 32, 0, 107, 64, 0, 65, 0, 72, 5, 65, 0, 11, 4, 64, 0, 11, 65, 176, 3, 34, 0, 65, 0, 54, 2, 0, 65, 208, 15, 65, 0, 54, 2, 0, 3, 64, 32, 1, 65, 23, 73, 4, 64, 32, 1, 65, 2, 116, 65, 176, 3, 106, 65, 0, 54, 2, 4, 65, 0, 33, 2, 3, 64, 32, 2, 65, 16, 73, 4, 64, 32, 1, 65, 4, 116, 32, 2, 106, 65, 2, 116, 65, 176, 3, 106, 65, 0, 54, 2, 96, 32, 2, 65, 1, 106, 33, 2, 12, 1, 11, 11, 32, 1, 65, 1, 106, 33, 1, 12, 1, 11, 11, 65, 176, 3, 65, 224, 15, 63, 0, 65, 16, 116, 16, 3, 65, 176, 3, 36, 0, 11, 32, 0, 11, 45, 0, 32, 0, 65, 240, 255, 255, 255, 3, 79, 4, 64, 65, 32, 65, 224, 0, 65, 201, 3, 65, 29, 16, 0, 0, 11, 32, 0, 65, 15, 106, 65, 112, 113, 34, 0, 65, 16, 32, 0, 65, 16, 75, 27, 11, 169, 1, 1, 1, 127, 32, 0, 32, 1, 65, 128, 2, 73, 4, 127, 32, 1, 65, 4, 118, 33, 1, 65, 0, 5, 32, 1, 65, 248, 255, 255, 255, 1, 73, 4, 64, 32, 1, 65, 1, 65, 27, 32, 1, 103, 107, 116, 106, 65, 1, 107, 33, 1, 11, 32, 1, 65, 31, 32, 1, 103, 107, 34, 2, 65, 4, 107, 118, 65, 16, 115, 33, 1, 32, 2, 65, 7, 107, 11, 34, 2, 65, 2, 116, 106, 40, 2, 4, 65, 127, 32, 1, 116, 113, 34, 1, 4, 127, 32, 0, 32, 1, 104, 32, 2, 65, 4, 116, 106, 65, 2, 116, 106, 40, 2, 96, 5, 32, 0, 40, 2, 0, 65, 127, 32, 2, 65, 1, 106, 116, 113, 34, 1, 4, 127, 32, 0, 32, 0, 32, 1, 104, 34, 0, 65, 2, 116, 106, 40, 2, 4, 104, 32, 0, 65, 4, 116, 106, 65, 2, 116, 106, 40, 2, 96, 5, 65, 0, 11, 11, 11, 111, 1, 1, 127, 63, 0, 34, 2, 32, 1, 65, 248, 255, 255, 255, 1, 73, 4, 127, 32, 1, 65, 1, 65, 27, 32, 1, 103, 107, 116, 65, 1, 107, 106, 5, 32, 1, 11, 65, 16, 32, 0, 40, 2, 160, 12, 32, 2, 65, 16, 116, 65, 16, 107, 71, 116, 106, 65, 255, 255, 3, 106, 65, 128, 128, 124, 113, 65, 16, 118, 34, 1, 32, 2, 32, 1, 74, 27, 64, 0, 65, 0, 72, 4, 64, 32, 1, 64, 0, 65, 0, 72, 4, 64, 0, 11, 11, 32, 0, 32, 2, 65, 16, 116, 63, 0, 65, 16, 116, 16, 3, 11, 113, 1, 2, 127, 32, 1, 40, 2, 0, 34, 3, 65, 124, 113, 32, 2, 107, 34, 4, 65, 32, 79, 4, 64, 32, 1, 32, 2, 32, 3, 65, 2, 113, 114, 54, 2, 0, 32, 2, 32, 1, 65, 16, 106, 106, 34, 1, 32, 4, 65, 16, 107, 65, 1, 114, 54, 2, 0, 32, 0, 32, 1, 16, 2, 5, 32, 1, 32, 3, 65, 126, 113, 54, 2, 0, 32, 1, 65, 16, 106, 32, 1, 40, 2, 0, 65, 124, 113, 106, 32, 1, 65, 16, 106, 32, 1, 40, 2, 0, 65, 124, 113, 106, 40, 2, 0, 65, 125, 113, 54, 2, 0, 11, 11, 91, 1, 2, 127, 32, 0, 32, 1, 16, 5, 34, 4, 16, 6, 34, 3, 69, 4, 64, 65, 1, 36, 1, 65, 0, 36, 1, 32, 0, 32, 4, 16, 6, 34, 3, 69, 4, 64, 32, 0, 32, 4, 16, 7, 32, 0, 32, 4, 16, 6, 33, 3, 11, 11, 32, 3, 65, 0, 54, 2, 4, 32, 3, 32, 2, 54, 2, 8, 32, 3, 32, 1, 54, 2, 12, 32, 0, 32, 3, 16, 1, 32, 0, 32, 3, 32, 4, 16, 8, 32, 3, 11, 13, 0, 16, 4, 32, 0, 32, 1, 16, 9, 65, 16, 106, 11, 33, 1, 1, 127, 32, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 34, 1, 32, 1, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 0, 11, 18, 0, 32, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 16, 52, 11, 11, 140, 3, 1, 1, 127, 2, 64, 32, 1, 69, 13, 0, 32, 0, 65, 0, 58, 0, 0, 32, 0, 32, 1, 106, 65, 1, 107, 65, 0, 58, 0, 0, 32, 1, 65, 2, 77, 13, 0, 32, 0, 65, 1, 106, 65, 0, 58, 0, 0, 32, 0, 65, 2, 106, 65, 0, 58, 0, 0, 32, 0, 32, 1, 106, 34, 2, 65, 2, 107, 65, 0, 58, 0, 0, 32, 2, 65, 3, 107, 65, 0, 58, 0, 0, 32, 1, 65, 6, 77, 13, 0, 32, 0, 65, 3, 106, 65, 0, 58, 0, 0, 32, 0, 32, 1, 106, 65, 4, 107, 65, 0, 58, 0, 0, 32, 1, 65, 8, 77, 13, 0, 32, 1, 65, 0, 32, 0, 107, 65, 3, 113, 34, 1, 107, 33, 2, 32, 0, 32, 1, 106, 34, 0, 65, 0, 54, 2, 0, 32, 0, 32, 2, 65, 124, 113, 34, 1, 106, 65, 4, 107, 65, 0, 54, 2, 0, 32, 1, 65, 8, 77, 13, 0, 32, 0, 65, 4, 106, 65, 0, 54, 2, 0, 32, 0, 65, 8, 106, 65, 0, 54, 2, 0, 32, 0, 32, 1, 106, 34, 2, 65, 12, 107, 65, 0, 54, 2, 0, 32, 2, 65, 8, 107, 65, 0, 54, 2, 0, 32, 1, 65, 24, 77, 13, 0, 32, 0, 65, 12, 106, 65, 0, 54, 2, 0, 32, 0, 65, 16, 106, 65, 0, 54, 2, 0, 32, 0, 65, 20, 106, 65, 0, 54, 2, 0, 32, 0, 65, 24, 106, 65, 0, 54, 2, 0, 32, 0, 32, 1, 106, 34, 2, 65, 28, 107, 65, 0, 54, 2, 0, 32, 2, 65, 24, 107, 65, 0, 54, 2, 0, 32, 2, 65, 20, 107, 65, 0, 54, 2, 0, 32, 2, 65, 16, 107, 65, 0, 54, 2, 0, 32, 0, 32, 0, 65, 4, 113, 65, 24, 106, 34, 2, 106, 33, 0, 32, 1, 32, 2, 107, 33, 1, 3, 64, 32, 1, 65, 32, 79, 4, 64, 32, 0, 66, 0, 55, 3, 0, 32, 0, 65, 8, 106, 66, 0, 55, 3, 0, 32, 0, 65, 16, 106, 66, 0, 55, 3, 0, 32, 0, 65, 24, 106, 66, 0, 55, 3, 0, 32, 1, 65, 32, 107, 33, 1, 32, 0, 65, 32, 106, 33, 0, 12, 1, 11, 11, 11, 11, 178, 1, 1, 3, 127, 32, 1, 65, 240, 255, 255, 255, 3, 32, 2, 118, 75, 4, 64, 65, 144, 1, 65, 192, 1, 65, 23, 65, 56, 16, 0, 0, 11, 32, 1, 32, 2, 116, 34, 3, 65, 0, 16, 10, 34, 2, 32, 3, 16, 13, 32, 0, 69, 4, 64, 65, 12, 65, 2, 16, 10, 34, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 34, 1, 32, 1, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 11, 32, 0, 65, 0, 54, 2, 0, 32, 0, 65, 0, 54, 2, 4, 32, 0, 65, 0, 54, 2, 8, 32, 2, 34, 1, 32, 0, 40, 2, 0, 34, 4, 71, 4, 64, 32, 1, 65, 172, 3, 75, 4, 64, 32, 1, 65, 16, 107, 34, 5, 32, 5, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 4, 16, 12, 11, 32, 0, 32, 1, 54, 2, 0, 32, 0, 32, 2, 54, 2, 4, 32, 0, 32, 3, 54, 2, 8, 32, 0, 11, 46, 1, 2, 127, 65, 12, 65, 5, 16, 10, 34, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 34, 1, 32, 1, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 0, 65, 128, 2, 65, 3, 16, 14, 11, 9, 0, 65, 63, 32, 0, 121, 167, 107, 11, 49, 1, 2, 127, 65, 63, 32, 1, 121, 167, 107, 33, 2, 3, 64, 65, 63, 32, 0, 121, 167, 107, 32, 2, 107, 34, 3, 65, 0, 78, 4, 64, 32, 0, 32, 1, 32, 3, 172, 134, 133, 33, 0, 12, 1, 11, 11, 32, 0, 11, 40, 0, 32, 1, 32, 0, 40, 2, 8, 79, 4, 64, 65, 128, 2, 65, 192, 2, 65, 163, 1, 65, 44, 16, 0, 0, 11, 32, 1, 32, 0, 40, 2, 4, 106, 65, 0, 58, 0, 0, 11, 38, 0, 32, 1, 32, 0, 40, 2, 8, 79, 4, 64, 65, 128, 2, 65, 192, 2, 65, 152, 1, 65, 44, 16, 0, 0, 11, 32, 1, 32, 0, 40, 2, 4, 106, 45, 0, 0, 11, 254, 5, 2, 1, 127, 4, 126, 32, 0, 69, 4, 64, 65, 232, 0, 65, 6, 16, 10, 34, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 34, 5, 32, 5, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 11, 32, 0, 65, 0, 54, 2, 0, 32, 0, 65, 0, 54, 2, 4, 32, 0, 65, 0, 54, 2, 8, 32, 0, 66, 0, 55, 3, 16, 32, 0, 66, 0, 55, 3, 24, 32, 0, 66, 0, 55, 3, 32, 32, 0, 66, 0, 55, 3, 40, 32, 0, 66, 0, 55, 3, 48, 32, 0, 66, 0, 55, 3, 56, 32, 0, 66, 0, 55, 3, 64, 32, 0, 66, 0, 55, 3, 72, 32, 0, 66, 0, 55, 3, 80, 32, 0, 66, 0, 55, 3, 88, 32, 0, 66, 0, 55, 3, 96, 32, 0, 32, 2, 173, 55, 3, 80, 32, 0, 32, 3, 173, 55, 3, 88, 65, 12, 65, 4, 16, 10, 34, 2, 65, 172, 3, 75, 4, 64, 32, 2, 65, 16, 107, 34, 3, 32, 3, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 2, 32, 4, 65, 0, 16, 14, 33, 2, 32, 0, 40, 2, 0, 16, 12, 32, 0, 32, 2, 54, 2, 0, 32, 0, 32, 4, 54, 2, 4, 32, 0, 66, 1, 32, 1, 173, 134, 66, 1, 125, 55, 3, 96, 32, 0, 66, 243, 130, 183, 218, 216, 230, 232, 30, 55, 3, 72, 35, 4, 69, 4, 64, 65, 0, 33, 2, 3, 64, 32, 2, 65, 128, 2, 72, 4, 64, 32, 2, 65, 255, 1, 113, 173, 33, 6, 32, 0, 41, 3, 72, 34, 7, 33, 8, 65, 63, 32, 7, 121, 167, 107, 33, 1, 3, 64, 65, 63, 32, 6, 121, 167, 107, 32, 1, 107, 34, 3, 65, 0, 78, 4, 64, 32, 6, 32, 8, 32, 3, 172, 134, 133, 33, 6, 12, 1, 11, 11, 65, 0, 33, 4, 3, 64, 32, 4, 32, 0, 40, 2, 4, 65, 1, 107, 72, 4, 64, 32, 6, 66, 8, 134, 33, 6, 32, 0, 41, 3, 72, 34, 7, 33, 8, 65, 63, 32, 7, 121, 167, 107, 33, 1, 3, 64, 65, 63, 32, 6, 121, 167, 107, 32, 1, 107, 34, 3, 65, 0, 78, 4, 64, 32, 6, 32, 8, 32, 3, 172, 134, 133, 33, 6, 12, 1, 11, 11, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 11, 35, 6, 40, 2, 4, 32, 2, 65, 3, 116, 106, 32, 6, 55, 3, 0, 32, 2, 65, 1, 106, 33, 2, 12, 1, 11, 11, 65, 63, 32, 0, 41, 3, 72, 121, 167, 107, 172, 33, 7, 65, 0, 33, 2, 3, 64, 32, 2, 65, 128, 2, 72, 4, 64, 35, 5, 33, 1, 32, 2, 172, 32, 7, 134, 34, 8, 33, 6, 65, 63, 32, 0, 41, 3, 72, 34, 9, 121, 167, 107, 33, 3, 3, 64, 65, 63, 32, 6, 121, 167, 107, 32, 3, 107, 34, 4, 65, 0, 78, 4, 64, 32, 6, 32, 9, 32, 4, 172, 134, 133, 33, 6, 12, 1, 11, 11, 32, 1, 40, 2, 4, 32, 2, 65, 3, 116, 106, 32, 6, 32, 8, 132, 55, 3, 0, 32, 2, 65, 1, 106, 33, 2, 12, 1, 11, 11, 65, 1, 36, 4, 11, 32, 0, 66, 0, 55, 3, 24, 32, 0, 66, 0, 55, 3, 32, 65, 0, 33, 2, 3, 64, 32, 2, 32, 0, 40, 2, 4, 72, 4, 64, 32, 0, 40, 2, 0, 32, 2, 16, 18, 32, 2, 65, 1, 106, 33, 2, 12, 1, 11, 11, 32, 0, 66, 0, 55, 3, 40, 32, 0, 65, 0, 54, 2, 8, 32, 0, 66, 0, 55, 3, 16, 32, 0, 66, 0, 55, 3, 40, 32, 0, 40, 2, 0, 32, 0, 40, 2, 8, 16, 19, 33, 1, 32, 0, 40, 2, 8, 32, 0, 40, 2, 0, 40, 2, 4, 106, 65, 1, 58, 0, 0, 32, 0, 32, 0, 41, 3, 40, 35, 6, 40, 2, 4, 32, 1, 65, 3, 116, 106, 41, 3, 0, 133, 55, 3, 40, 32, 0, 32, 0, 40, 2, 8, 65, 1, 106, 32, 0, 40, 2, 4, 111, 54, 2, 8, 32, 0, 35, 5, 40, 2, 4, 32, 0, 41, 3, 40, 34, 6, 66, 45, 136, 167, 65, 3, 116, 106, 41, 3, 0, 32, 6, 66, 8, 134, 66, 1, 132, 133, 55, 3, 40, 32, 0, 11, 38, 1, 1, 127, 32, 0, 40, 2, 0, 34, 0, 65, 172, 3, 75, 4, 64, 32, 0, 65, 16, 107, 34, 1, 32, 1, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 0, 11, 55, 1, 2, 127, 32, 1, 32, 0, 40, 2, 0, 34, 2, 71, 4, 64, 32, 1, 65, 172, 3, 75, 4, 64, 32, 1, 65, 16, 107, 34, 3, 32, 3, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 2, 16, 12, 11, 32, 0, 32, 1, 54, 2, 0, 11, 7, 0, 32, 0, 40, 2, 4, 11, 9, 0, 32, 0, 32, 1, 54, 2, 4, 11, 7, 0, 32, 0, 40, 2, 8, 11, 9, 0, 32, 0, 32, 1, 54, 2, 8, 11, 7, 0, 32, 0, 41, 3, 16, 11, 9, 0, 32, 0, 32, 1, 55, 3, 16, 11, 7, 0, 32, 0, 41, 3, 24, 11, 9, 0, 32, 0, 32, 1, 55, 3, 24, 11, 7, 0, 32, 0, 41, 3, 32, 11, 9, 0, 32, 0, 32, 1, 55, 3, 32, 11, 7, 0, 32, 0, 41, 3, 40, 11, 9, 0, 32, 0, 32, 1, 55, 3, 40, 11, 7, 0, 32, 0, 41, 3, 48, 11, 9, 0, 32, 0, 32, 1, 55, 3, 48, 11, 7, 0, 32, 0, 41, 3, 56, 11, 9, 0, 32, 0, 32, 1, 55, 3, 56, 11, 7, 0, 32, 0, 41, 3, 64, 11, 9, 0, 32, 0, 32, 1, 55, 3, 64, 11, 7, 0, 32, 0, 41, 3, 72, 11, 9, 0, 32, 0, 32, 1, 55, 3, 72, 11, 7, 0, 32, 0, 41, 3, 80, 11, 9, 0, 32, 0, 32, 1, 55, 3, 80, 11, 7, 0, 32, 0, 41, 3, 88, 11, 9, 0, 32, 0, 32, 1, 55, 3, 88, 11, 7, 0, 32, 0, 41, 3, 96, 11, 9, 0, 32, 0, 32, 1, 55, 3, 96, 11, 172, 4, 2, 5, 127, 1, 126, 32, 2, 65, 172, 3, 75, 4, 64, 32, 2, 65, 16, 107, 34, 4, 32, 4, 40, 2, 4, 65, 1, 106, 54, 2, 4, 11, 32, 2, 33, 4, 65, 0, 33, 2, 32, 1, 40, 2, 8, 33, 5, 32, 1, 40, 2, 4, 33, 6, 3, 64, 2, 127, 65, 0, 33, 3, 3, 64, 32, 3, 32, 5, 72, 4, 64, 32, 3, 32, 6, 106, 45, 0, 0, 33, 1, 32, 0, 40, 2, 0, 32, 0, 40, 2, 8, 16, 19, 33, 7, 32, 0, 40, 2, 8, 32, 0, 40, 2, 0, 40, 2, 4, 106, 32, 1, 58, 0, 0, 32, 0, 32, 0, 41, 3, 40, 35, 6, 40, 2, 4, 32, 7, 65, 3, 116, 106, 41, 3, 0, 133, 55, 3, 40, 32, 0, 32, 0, 40, 2, 8, 65, 1, 106, 32, 0, 40, 2, 4, 111, 54, 2, 8, 32, 0, 35, 5, 40, 2, 4, 32, 0, 41, 3, 40, 34, 8, 66, 45, 136, 167, 65, 3, 116, 106, 41, 3, 0, 32, 1, 173, 32, 8, 66, 8, 134, 132, 133, 55, 3, 40, 32, 0, 32, 0, 41, 3, 16, 66, 1, 124, 55, 3, 16, 32, 0, 32, 0, 41, 3, 24, 66, 1, 124, 55, 3, 24, 32, 0, 41, 3, 16, 32, 0, 41, 3, 80, 90, 4, 127, 32, 0, 41, 3, 40, 32, 0, 41, 3, 96, 131, 80, 5, 65, 0, 11, 4, 127, 65, 1, 5, 32, 0, 41, 3, 16, 32, 0, 41, 3, 88, 90, 11, 4, 64, 32, 0, 32, 0, 41, 3, 32, 55, 3, 48, 32, 0, 32, 0, 41, 3, 16, 55, 3, 56, 32, 0, 32, 0, 41, 3, 40, 55, 3, 64, 65, 0, 33, 1, 3, 64, 32, 1, 32, 0, 40, 2, 4, 72, 4, 64, 32, 0, 40, 2, 0, 32, 1, 16, 18, 32, 1, 65, 1, 106, 33, 1, 12, 1, 11, 11, 32, 0, 66, 0, 55, 3, 40, 32, 0, 65, 0, 54, 2, 8, 32, 0, 66, 0, 55, 3, 16, 32, 0, 66, 0, 55, 3, 40, 32, 0, 40, 2, 0, 32, 0, 40, 2, 8, 16, 19, 33, 1, 32, 0, 40, 2, 8, 32, 0, 40, 2, 0, 40, 2, 4, 106, 65, 1, 58, 0, 0, 32, 0, 32, 0, 41, 3, 40, 35, 6, 40, 2, 4, 32, 1, 65, 3, 116, 106, 41, 3, 0, 133, 55, 3, 40, 32, 0, 32, 0, 40, 2, 8, 65, 1, 106, 32, 0, 40, 2, 4, 111, 54, 2, 8, 32, 0, 35, 5, 40, 2, 4, 32, 0, 41, 3, 40, 34, 8, 66, 45, 136, 167, 65, 3, 116, 106, 41, 3, 0, 32, 8, 66, 8, 134, 66, 1, 132, 133, 55, 3, 40, 32, 3, 65, 1, 106, 12, 3, 11, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 11, 65, 127, 11, 34, 1, 65, 0, 78, 4, 64, 32, 5, 32, 1, 107, 33, 5, 32, 1, 32, 6, 106, 33, 6, 32, 2, 34, 1, 65, 1, 106, 33, 2, 32, 4, 40, 2, 4, 32, 1, 65, 2, 116, 106, 32, 0, 41, 3, 56, 62, 2, 0, 12, 1, 11, 11, 32, 4, 11, 10, 0, 16, 15, 36, 5, 16, 15, 36, 6, 11, 3, 0, 1, 11, 73, 1, 2, 127, 32, 0, 40, 2, 4, 34, 1, 65, 255, 255, 255, 255, 0, 113, 34, 2, 65, 1, 70, 4, 64, 32, 0, 65, 16, 106, 16, 53, 32, 0, 32, 0, 40, 2, 0, 65, 1, 114, 54, 2, 0, 35, 0, 32, 0, 16, 2, 5, 32, 0, 32, 2, 65, 1, 107, 32, 1, 65, 128, 128, 128, 128, 127, 113, 114, 54, 2, 4, 11, 11, 58, 0, 2, 64, 2, 64, 2, 64, 32, 0, 65, 8, 107, 40, 2, 0, 14, 7, 0, 0, 1, 1, 1, 1, 1, 2, 11, 15, 11, 32, 0, 40, 2, 0, 34, 0, 4, 64, 32, 0, 65, 172, 3, 79, 4, 64, 32, 0, 65, 16, 107, 16, 52, 11, 11, 15, 11, 0, 11, 11, 137, 3, 7, 0, 65, 16, 11, 55, 40, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 40, 0, 0, 0, 97, 0, 108, 0, 108, 0, 111, 0, 99, 0, 97, 0, 116, 0, 105, 0, 111, 0, 110, 0, 32, 0, 116, 0, 111, 0, 111, 0, 32, 0, 108, 0, 97, 0, 114, 0, 103, 0, 101, 0, 65, 208, 0, 11, 45, 30, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 30, 0, 0, 0, 126, 0, 108, 0, 105, 0, 98, 0, 47, 0, 114, 0, 116, 0, 47, 0, 116, 0, 108, 0, 115, 0, 102, 0, 46, 0, 116, 0, 115, 0, 65, 128, 1, 11, 43, 28, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 28, 0, 0, 0, 73, 0, 110, 0, 118, 0, 97, 0, 108, 0, 105, 0, 100, 0, 32, 0, 108, 0, 101, 0, 110, 0, 103, 0, 116, 0, 104, 0, 65, 176, 1, 11, 53, 38, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 38, 0, 0, 0, 126, 0, 108, 0, 105, 0, 98, 0, 47, 0, 97, 0, 114, 0, 114, 0, 97, 0, 121, 0, 98, 0, 117, 0, 102, 0, 102, 0, 101, 0, 114, 0, 46, 0, 116, 0, 115, 0, 65, 240, 1, 11, 51, 36, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 36, 0, 0, 0, 73, 0, 110, 0, 100, 0, 101, 0, 120, 0, 32, 0, 111, 0, 117, 0, 116, 0, 32, 0, 111, 0, 102, 0, 32, 0, 114, 0, 97, 0, 110, 0, 103, 0, 101, 0, 65, 176, 2, 11, 51, 36, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 36, 0, 0, 0, 126, 0, 108, 0, 105, 0, 98, 0, 47, 0, 116, 0, 121, 0, 112, 0, 101, 0, 100, 0, 97, 0, 114, 0, 114, 0, 97, 0, 121, 0, 46, 0, 116, 0, 115, 0, 65, 240, 2, 11, 53, 7, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 145, 4, 0, 0, 2, 0, 0, 0, 49, 0, 0, 0, 2, 0, 0, 0, 17, 1, 0, 0, 2, 0, 0, 0, 16, 0, 34, 16, 115, 111, 117, 114, 99, 101, 77, 97, 112, 112, 105, 110, 103, 85, 82, 76, 16, 46, 47, 114, 97, 98, 105, 110, 46, 119, 97, 115, 109, 46, 109, 97, 112]);
      return instantiate(new Response(new Blob([wasm], { type: "application/wasm" })), imp);
    }
    module2.exports = loadWebAssembly;
  }
});

// node_modules/rabin-wasm/src/index.js
var require_src = __commonJS({
  "node_modules/rabin-wasm/src/index.js"(exports2, module2) {
    var Rabin = require_rabin();
    var getRabin = require_rabin_wasm();
    var create4 = async (avg, min, max, windowSize, polynomial) => {
      const compiled = await getRabin();
      return new Rabin(compiled, avg, min, max, windowSize, polynomial);
    };
    module2.exports = {
      Rabin,
      create: create4
    };
  }
});

// node_modules/multiformats/esm/src/bases/identity.js
var identity_exports = {};
__export(identity_exports, {
  identity: () => identity
});
var identity;
var init_identity = __esm({
  "node_modules/multiformats/esm/src/bases/identity.js"() {
    init_base();
    init_bytes();
    identity = from({
      prefix: "\0",
      name: "identity",
      encode: (buf2) => toString(buf2),
      decode: (str) => fromString(str)
    });
  }
});

// node_modules/multiformats/esm/src/bases/base2.js
var base2_exports = {};
__export(base2_exports, {
  base2: () => base2
});
var base2;
var init_base2 = __esm({
  "node_modules/multiformats/esm/src/bases/base2.js"() {
    init_base();
    base2 = rfc4648({
      prefix: "0",
      name: "base2",
      alphabet: "01",
      bitsPerChar: 1
    });
  }
});

// node_modules/multiformats/esm/src/bases/base8.js
var base8_exports = {};
__export(base8_exports, {
  base8: () => base8
});
var base8;
var init_base8 = __esm({
  "node_modules/multiformats/esm/src/bases/base8.js"() {
    init_base();
    base8 = rfc4648({
      prefix: "7",
      name: "base8",
      alphabet: "01234567",
      bitsPerChar: 3
    });
  }
});

// node_modules/multiformats/esm/src/bases/base10.js
var base10_exports = {};
__export(base10_exports, {
  base10: () => base10
});
var base10;
var init_base10 = __esm({
  "node_modules/multiformats/esm/src/bases/base10.js"() {
    init_base();
    base10 = baseX({
      prefix: "9",
      name: "base10",
      alphabet: "0123456789"
    });
  }
});

// node_modules/multiformats/esm/src/bases/base16.js
var base16_exports = {};
__export(base16_exports, {
  base16: () => base16,
  base16upper: () => base16upper
});
var base16, base16upper;
var init_base16 = __esm({
  "node_modules/multiformats/esm/src/bases/base16.js"() {
    init_base();
    base16 = rfc4648({
      prefix: "f",
      name: "base16",
      alphabet: "0123456789abcdef",
      bitsPerChar: 4
    });
    base16upper = rfc4648({
      prefix: "F",
      name: "base16upper",
      alphabet: "0123456789ABCDEF",
      bitsPerChar: 4
    });
  }
});

// node_modules/multiformats/esm/src/bases/base36.js
var base36_exports = {};
__export(base36_exports, {
  base36: () => base36,
  base36upper: () => base36upper
});
var base36, base36upper;
var init_base36 = __esm({
  "node_modules/multiformats/esm/src/bases/base36.js"() {
    init_base();
    base36 = baseX({
      prefix: "k",
      name: "base36",
      alphabet: "0123456789abcdefghijklmnopqrstuvwxyz"
    });
    base36upper = baseX({
      prefix: "K",
      name: "base36upper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    });
  }
});

// node_modules/multiformats/esm/src/bases/base64.js
var base64_exports = {};
__export(base64_exports, {
  base64: () => base64,
  base64pad: () => base64pad,
  base64url: () => base64url,
  base64urlpad: () => base64urlpad
});
var base64, base64pad, base64url, base64urlpad;
var init_base64 = __esm({
  "node_modules/multiformats/esm/src/bases/base64.js"() {
    init_base();
    base64 = rfc4648({
      prefix: "m",
      name: "base64",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      bitsPerChar: 6
    });
    base64pad = rfc4648({
      prefix: "M",
      name: "base64pad",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      bitsPerChar: 6
    });
    base64url = rfc4648({
      prefix: "u",
      name: "base64url",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      bitsPerChar: 6
    });
    base64urlpad = rfc4648({
      prefix: "U",
      name: "base64urlpad",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",
      bitsPerChar: 6
    });
  }
});

// node_modules/multiformats/esm/src/bases/base256emoji.js
var base256emoji_exports = {};
__export(base256emoji_exports, {
  base256emoji: () => base256emoji
});
function encode7(data) {
  return data.reduce((p, c) => {
    p += alphabetBytesToChars[c];
    return p;
  }, "");
}
function decode9(str) {
  const byts = [];
  for (const char of str) {
    const byt = alphabetCharsToBytes[char.codePointAt(0)];
    if (byt === void 0) {
      throw new Error(`Non-base256emoji character: ${char}`);
    }
    byts.push(byt);
  }
  return new Uint8Array(byts);
}
var alphabet, alphabetBytesToChars, alphabetCharsToBytes, base256emoji;
var init_base256emoji = __esm({
  "node_modules/multiformats/esm/src/bases/base256emoji.js"() {
    init_base();
    alphabet = Array.from("🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂");
    alphabetBytesToChars = alphabet.reduce((p, c, i) => {
      p[i] = c;
      return p;
    }, []);
    alphabetCharsToBytes = alphabet.reduce((p, c, i) => {
      p[c.codePointAt(0)] = i;
      return p;
    }, []);
    base256emoji = from({
      prefix: "🚀",
      name: "base256emoji",
      encode: encode7,
      decode: decode9
    });
  }
});

// node_modules/multiformats/esm/src/hashes/identity.js
var identity_exports2 = {};
__export(identity_exports2, {
  identity: () => identity2
});
var code4, name3, encode8, digest, identity2;
var init_identity2 = __esm({
  "node_modules/multiformats/esm/src/hashes/identity.js"() {
    init_bytes();
    init_digest();
    code4 = 0;
    name3 = "identity";
    encode8 = coerce;
    digest = (input) => create(code4, encode8(input));
    identity2 = {
      code: code4,
      name: name3,
      encode: encode8,
      digest
    };
  }
});

// node_modules/multiformats/esm/src/codecs/json.js
var textEncoder4, textDecoder3;
var init_json = __esm({
  "node_modules/multiformats/esm/src/codecs/json.js"() {
    textEncoder4 = new TextEncoder();
    textDecoder3 = new TextDecoder();
  }
});

// node_modules/multiformats/esm/src/basics.js
var bases, hashes;
var init_basics = __esm({
  "node_modules/multiformats/esm/src/basics.js"() {
    init_identity();
    init_base2();
    init_base8();
    init_base10();
    init_base16();
    init_base32();
    init_base36();
    init_base58();
    init_base64();
    init_base256emoji();
    init_sha2_browser();
    init_identity2();
    init_raw();
    init_json();
    init_src();
    bases = {
      ...identity_exports,
      ...base2_exports,
      ...base8_exports,
      ...base10_exports,
      ...base16_exports,
      ...base32_exports,
      ...base36_exports,
      ...base58_exports,
      ...base64_exports,
      ...base256emoji_exports
    };
    hashes = {
      ...sha2_browser_exports,
      ...identity_exports2
    };
  }
});

// node_modules/uint8arrays/esm/src/util/as-uint8array.js
function asUint8Array(buf2) {
  if (globalThis.Buffer != null) {
    return new Uint8Array(buf2.buffer, buf2.byteOffset, buf2.byteLength);
  }
  return buf2;
}
var init_as_uint8array = __esm({
  "node_modules/uint8arrays/esm/src/util/as-uint8array.js"() {
  }
});

// node_modules/uint8arrays/esm/src/alloc.js
function allocUnsafe(size = 0) {
  if (globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null) {
    return asUint8Array(globalThis.Buffer.allocUnsafe(size));
  }
  return new Uint8Array(size);
}
var init_alloc = __esm({
  "node_modules/uint8arrays/esm/src/alloc.js"() {
    init_as_uint8array();
  }
});

// node_modules/uint8arrays/esm/src/util/bases.js
function createCodec(name5, prefix, encode10, decode11) {
  return {
    name: name5,
    prefix,
    encoder: {
      name: name5,
      prefix,
      encode: encode10
    },
    decoder: { decode: decode11 }
  };
}
var string, ascii, BASES, bases_default;
var init_bases = __esm({
  "node_modules/uint8arrays/esm/src/util/bases.js"() {
    init_basics();
    init_alloc();
    string = createCodec("utf8", "u", (buf2) => {
      const decoder = new TextDecoder("utf8");
      return "u" + decoder.decode(buf2);
    }, (str) => {
      const encoder = new TextEncoder();
      return encoder.encode(str.substring(1));
    });
    ascii = createCodec("ascii", "a", (buf2) => {
      let string2 = "a";
      for (let i = 0; i < buf2.length; i++) {
        string2 += String.fromCharCode(buf2[i]);
      }
      return string2;
    }, (str) => {
      str = str.substring(1);
      const buf2 = allocUnsafe(str.length);
      for (let i = 0; i < str.length; i++) {
        buf2[i] = str.charCodeAt(i);
      }
      return buf2;
    });
    BASES = {
      utf8: string,
      "utf-8": string,
      hex: bases.base16,
      latin1: ascii,
      ascii,
      binary: ascii,
      ...bases
    };
    bases_default = BASES;
  }
});

// node_modules/uint8arrays/esm/src/from-string.js
var from_string_exports = {};
__export(from_string_exports, {
  fromString: () => fromString3
});
function fromString3(string2, encoding = "utf8") {
  const base3 = bases_default[encoding];
  if (!base3) {
    throw new Error(`Unsupported encoding "${encoding}"`);
  }
  if ((encoding === "utf8" || encoding === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null) {
    return asUint8Array(globalThis.Buffer.from(string2, "utf-8"));
  }
  return base3.decoder.decode(`${base3.prefix}${string2}`);
}
var init_from_string = __esm({
  "node_modules/uint8arrays/esm/src/from-string.js"() {
    init_bases();
    init_as_uint8array();
  }
});

// node_modules/sparse-array/index.js
var require_sparse_array = __commonJS({
  "node_modules/sparse-array/index.js"(exports2, module2) {
    "use strict";
    var BITS_PER_BYTE = 7;
    module2.exports = class SparseArray {
      constructor() {
        this._bitArrays = [];
        this._data = [];
        this._length = 0;
        this._changedLength = false;
        this._changedData = false;
      }
      set(index, value) {
        let pos = this._internalPositionFor(index, false);
        if (value === void 0) {
          if (pos !== -1) {
            this._unsetInternalPos(pos);
            this._unsetBit(index);
            this._changedLength = true;
            this._changedData = true;
          }
        } else {
          let needsSort = false;
          if (pos === -1) {
            pos = this._data.length;
            this._setBit(index);
            this._changedData = true;
          } else {
            needsSort = true;
          }
          this._setInternalPos(pos, index, value, needsSort);
          this._changedLength = true;
        }
      }
      unset(index) {
        this.set(index, void 0);
      }
      get(index) {
        this._sortData();
        const pos = this._internalPositionFor(index, true);
        if (pos === -1) {
          return void 0;
        }
        return this._data[pos][1];
      }
      push(value) {
        this.set(this.length, value);
        return this.length;
      }
      get length() {
        this._sortData();
        if (this._changedLength) {
          const last3 = this._data[this._data.length - 1];
          this._length = last3 ? last3[0] + 1 : 0;
          this._changedLength = false;
        }
        return this._length;
      }
      forEach(iterator) {
        let i = 0;
        while (i < this.length) {
          iterator(this.get(i), i, this);
          i++;
        }
      }
      map(iterator) {
        let i = 0;
        let mapped = new Array(this.length);
        while (i < this.length) {
          mapped[i] = iterator(this.get(i), i, this);
          i++;
        }
        return mapped;
      }
      reduce(reducer, initialValue) {
        let i = 0;
        let acc = initialValue;
        while (i < this.length) {
          const value = this.get(i);
          acc = reducer(acc, value, i);
          i++;
        }
        return acc;
      }
      find(finder) {
        let i = 0, found, last3;
        while (i < this.length && !found) {
          last3 = this.get(i);
          found = finder(last3);
          i++;
        }
        return found ? last3 : void 0;
      }
      _internalPositionFor(index, noCreate) {
        const bytePos = this._bytePosFor(index, noCreate);
        if (bytePos >= this._bitArrays.length) {
          return -1;
        }
        const byte = this._bitArrays[bytePos];
        const bitPos = index - bytePos * BITS_PER_BYTE;
        const exists = (byte & 1 << bitPos) > 0;
        if (!exists) {
          return -1;
        }
        const previousPopCount = this._bitArrays.slice(0, bytePos).reduce(popCountReduce, 0);
        const mask = ~(4294967295 << bitPos + 1);
        const bytePopCount = popCount(byte & mask);
        const arrayPos = previousPopCount + bytePopCount - 1;
        return arrayPos;
      }
      _bytePosFor(index, noCreate) {
        const bytePos = Math.floor(index / BITS_PER_BYTE);
        const targetLength = bytePos + 1;
        while (!noCreate && this._bitArrays.length < targetLength) {
          this._bitArrays.push(0);
        }
        return bytePos;
      }
      _setBit(index) {
        const bytePos = this._bytePosFor(index, false);
        this._bitArrays[bytePos] |= 1 << index - bytePos * BITS_PER_BYTE;
      }
      _unsetBit(index) {
        const bytePos = this._bytePosFor(index, false);
        this._bitArrays[bytePos] &= ~(1 << index - bytePos * BITS_PER_BYTE);
      }
      _setInternalPos(pos, index, value, needsSort) {
        const data = this._data;
        const elem = [index, value];
        if (needsSort) {
          this._sortData();
          data[pos] = elem;
        } else {
          if (data.length) {
            if (data[data.length - 1][0] >= index) {
              data.push(elem);
            } else if (data[0][0] <= index) {
              data.unshift(elem);
            } else {
              const randomIndex = Math.round(data.length / 2);
              this._data = data.slice(0, randomIndex).concat(elem).concat(data.slice(randomIndex));
            }
          } else {
            this._data.push(elem);
          }
          this._changedData = true;
          this._changedLength = true;
        }
      }
      _unsetInternalPos(pos) {
        this._data.splice(pos, 1);
      }
      _sortData() {
        if (this._changedData) {
          this._data.sort(sortInternal);
        }
        this._changedData = false;
      }
      bitField() {
        const bytes = [];
        let pendingBitsForResultingByte = 8;
        let pendingBitsForNewByte = 0;
        let resultingByte = 0;
        let newByte;
        const pending = this._bitArrays.slice();
        while (pending.length || pendingBitsForNewByte) {
          if (pendingBitsForNewByte === 0) {
            newByte = pending.shift();
            pendingBitsForNewByte = 7;
          }
          const usingBits = Math.min(pendingBitsForNewByte, pendingBitsForResultingByte);
          const mask = ~(255 << usingBits);
          const masked = newByte & mask;
          resultingByte |= masked << 8 - pendingBitsForResultingByte;
          newByte = newByte >>> usingBits;
          pendingBitsForNewByte -= usingBits;
          pendingBitsForResultingByte -= usingBits;
          if (!pendingBitsForResultingByte || !pendingBitsForNewByte && !pending.length) {
            bytes.push(resultingByte);
            resultingByte = 0;
            pendingBitsForResultingByte = 8;
          }
        }
        for (var i = bytes.length - 1; i > 0; i--) {
          const value = bytes[i];
          if (value === 0) {
            bytes.pop();
          } else {
            break;
          }
        }
        return bytes;
      }
      compactArray() {
        this._sortData();
        return this._data.map(valueOnly);
      }
    };
    function popCountReduce(count, byte) {
      return count + popCount(byte);
    }
    function popCount(_v) {
      let v = _v;
      v = v - (v >> 1 & 1431655765);
      v = (v & 858993459) + (v >> 2 & 858993459);
      return (v + (v >> 4) & 252645135) * 16843009 >> 24;
    }
    function sortInternal(a, b) {
      return a[0] - b[0];
    }
    function valueOnly(elem) {
      return elem[1];
    }
  }
});

// node_modules/hamt-sharding/src/bucket.js
var require_bucket = __commonJS({
  "node_modules/hamt-sharding/src/bucket.js"(exports2, module2) {
    "use strict";
    var SparseArray = require_sparse_array();
    var { fromString: uint8ArrayFromString } = (init_from_string(), __toCommonJS(from_string_exports));
    var Bucket3 = class _Bucket {
      /**
       * @param {BucketOptions} options
       * @param {Bucket<T>} [parent]
       * @param {number} [posAtParent=0]
       */
      constructor(options, parent, posAtParent = 0) {
        this._options = options;
        this._popCount = 0;
        this._parent = parent;
        this._posAtParent = posAtParent;
        this._children = new SparseArray();
        this.key = null;
      }
      /**
       * @param {string} key
       * @param {T} value
       */
      async put(key, value) {
        const place = await this._findNewBucketAndPos(key);
        await place.bucket._putAt(place, key, value);
      }
      /**
       * @param {string} key
       */
      async get(key) {
        const child = await this._findChild(key);
        if (child) {
          return child.value;
        }
      }
      /**
       * @param {string} key
       */
      async del(key) {
        const place = await this._findPlace(key);
        const child = place.bucket._at(place.pos);
        if (child && child.key === key) {
          place.bucket._delAt(place.pos);
        }
      }
      /**
       * @returns {number}
       */
      leafCount() {
        const children = this._children.compactArray();
        return children.reduce((acc, child) => {
          if (child instanceof _Bucket) {
            return acc + child.leafCount();
          }
          return acc + 1;
        }, 0);
      }
      childrenCount() {
        return this._children.length;
      }
      onlyChild() {
        return this._children.get(0);
      }
      /**
       * @returns {Iterable<BucketChild<T>>}
       */
      *eachLeafSeries() {
        const children = this._children.compactArray();
        for (const child of children) {
          if (child instanceof _Bucket) {
            yield* child.eachLeafSeries();
          } else {
            yield child;
          }
        }
        return [];
      }
      /**
       * @param {(value: BucketChild<T>, index: number) => T} map
       * @param {(reduced: any) => any} reduce
       */
      serialize(map3, reduce2) {
        const acc = [];
        return reduce2(this._children.reduce((acc2, child, index) => {
          if (child) {
            if (child instanceof _Bucket) {
              acc2.push(child.serialize(map3, reduce2));
            } else {
              acc2.push(map3(child, index));
            }
          }
          return acc2;
        }, acc));
      }
      /**
       * @param {(value: BucketChild<T>) => Promise<T[]>} asyncMap
       * @param {(reduced: any) => Promise<any>} asyncReduce
       */
      asyncTransform(asyncMap, asyncReduce) {
        return asyncTransformBucket(this, asyncMap, asyncReduce);
      }
      toJSON() {
        return this.serialize(mapNode, reduceNodes);
      }
      prettyPrint() {
        return JSON.stringify(this.toJSON(), null, "  ");
      }
      tableSize() {
        return Math.pow(2, this._options.bits);
      }
      /**
       * @param {string} key
       * @returns {Promise<BucketChild<T> | undefined>}
       */
      async _findChild(key) {
        const result = await this._findPlace(key);
        const child = result.bucket._at(result.pos);
        if (child instanceof _Bucket) {
          return void 0;
        }
        if (child && child.key === key) {
          return child;
        }
      }
      /**
       * @param {string | InfiniteHash} key
       * @returns {Promise<BucketPosition<T>>}
       */
      async _findPlace(key) {
        const hashValue = this._options.hash(typeof key === "string" ? uint8ArrayFromString(key) : key);
        const index = await hashValue.take(this._options.bits);
        const child = this._children.get(index);
        if (child instanceof _Bucket) {
          return child._findPlace(hashValue);
        }
        return {
          bucket: this,
          pos: index,
          hash: hashValue,
          existingChild: child
        };
      }
      /**
       * @param {string | InfiniteHash} key
       * @returns {Promise<BucketPosition<T>>}
       */
      async _findNewBucketAndPos(key) {
        const place = await this._findPlace(key);
        if (place.existingChild && place.existingChild.key !== key) {
          const bucket = new _Bucket(this._options, place.bucket, place.pos);
          place.bucket._putObjectAt(place.pos, bucket);
          const newPlace = await bucket._findPlace(place.existingChild.hash);
          newPlace.bucket._putAt(newPlace, place.existingChild.key, place.existingChild.value);
          return bucket._findNewBucketAndPos(place.hash);
        }
        return place;
      }
      /**
       * @param {BucketPosition<T>} place
       * @param {string} key
       * @param {T} value
       */
      _putAt(place, key, value) {
        this._putObjectAt(place.pos, {
          key,
          value,
          hash: place.hash
        });
      }
      /**
       * @param {number} pos
       * @param {Bucket<T> | BucketChild<T>} object
       */
      _putObjectAt(pos, object) {
        if (!this._children.get(pos)) {
          this._popCount++;
        }
        this._children.set(pos, object);
      }
      /**
       * @param {number} pos
       */
      _delAt(pos) {
        if (pos === -1) {
          throw new Error("Invalid position");
        }
        if (this._children.get(pos)) {
          this._popCount--;
        }
        this._children.unset(pos);
        this._level();
      }
      _level() {
        if (this._parent && this._popCount <= 1) {
          if (this._popCount === 1) {
            const onlyChild = this._children.find(exists);
            if (onlyChild && !(onlyChild instanceof _Bucket)) {
              const hash = onlyChild.hash;
              hash.untake(this._options.bits);
              const place = {
                pos: this._posAtParent,
                hash,
                bucket: this._parent
              };
              this._parent._putAt(place, onlyChild.key, onlyChild.value);
            }
          } else {
            this._parent._delAt(this._posAtParent);
          }
        }
      }
      /**
       * @param {number} index
       * @returns {BucketChild<T> | Bucket<T> | undefined}
       */
      _at(index) {
        return this._children.get(index);
      }
    };
    function exists(o) {
      return Boolean(o);
    }
    function mapNode(node, index) {
      return node.key;
    }
    function reduceNodes(nodes) {
      return nodes;
    }
    async function asyncTransformBucket(bucket, asyncMap, asyncReduce) {
      const output = [];
      for (const child of bucket._children.compactArray()) {
        if (child instanceof Bucket3) {
          await asyncTransformBucket(child, asyncMap, asyncReduce);
        } else {
          const mappedChildren = await asyncMap(child);
          output.push({
            bitField: bucket._children.bitField(),
            children: mappedChildren
          });
        }
      }
      return asyncReduce(output);
    }
    module2.exports = Bucket3;
  }
});

// node_modules/hamt-sharding/src/consumable-buffer.js
var require_consumable_buffer = __commonJS({
  "node_modules/hamt-sharding/src/consumable-buffer.js"(exports2, module2) {
    "use strict";
    var START_MASKS = [
      255,
      254,
      252,
      248,
      240,
      224,
      192,
      128
    ];
    var STOP_MASKS = [
      1,
      3,
      7,
      15,
      31,
      63,
      127,
      255
    ];
    module2.exports = class ConsumableBuffer {
      /**
       * @param {Uint8Array} value
       */
      constructor(value) {
        this._value = value;
        this._currentBytePos = value.length - 1;
        this._currentBitPos = 7;
      }
      availableBits() {
        return this._currentBitPos + 1 + this._currentBytePos * 8;
      }
      totalBits() {
        return this._value.length * 8;
      }
      /**
       * @param {number} bits
       */
      take(bits) {
        let pendingBits = bits;
        let result = 0;
        while (pendingBits && this._haveBits()) {
          const byte = this._value[this._currentBytePos];
          const availableBits = this._currentBitPos + 1;
          const taking = Math.min(availableBits, pendingBits);
          const value = byteBitsToInt(byte, availableBits - taking, taking);
          result = (result << taking) + value;
          pendingBits -= taking;
          this._currentBitPos -= taking;
          if (this._currentBitPos < 0) {
            this._currentBitPos = 7;
            this._currentBytePos--;
          }
        }
        return result;
      }
      /**
       * @param {number} bits
       */
      untake(bits) {
        this._currentBitPos += bits;
        while (this._currentBitPos > 7) {
          this._currentBitPos -= 8;
          this._currentBytePos += 1;
        }
      }
      _haveBits() {
        return this._currentBytePos >= 0;
      }
    };
    function byteBitsToInt(byte, start, length2) {
      const mask = maskFor(start, length2);
      return (byte & mask) >>> start;
    }
    function maskFor(start, length2) {
      return START_MASKS[start] & STOP_MASKS[Math.min(length2 + start - 1, 7)];
    }
  }
});

// node_modules/uint8arrays/esm/src/concat.js
var concat_exports = {};
__export(concat_exports, {
  concat: () => concat2
});
function concat2(arrays, length2) {
  if (!length2) {
    length2 = arrays.reduce((acc, curr) => acc + curr.length, 0);
  }
  const output = allocUnsafe(length2);
  let offset = 0;
  for (const arr of arrays) {
    output.set(arr, offset);
    offset += arr.length;
  }
  return asUint8Array(output);
}
var init_concat = __esm({
  "node_modules/uint8arrays/esm/src/concat.js"() {
    init_alloc();
    init_as_uint8array();
  }
});

// node_modules/hamt-sharding/src/consumable-hash.js
var require_consumable_hash = __commonJS({
  "node_modules/hamt-sharding/src/consumable-hash.js"(exports2, module2) {
    "use strict";
    var ConsumableBuffer = require_consumable_buffer();
    var { concat: uint8ArrayConcat } = (init_concat(), __toCommonJS(concat_exports));
    function wrapHash(hashFn2) {
      function hashing(value) {
        if (value instanceof InfiniteHash) {
          return value;
        } else {
          return new InfiniteHash(value, hashFn2);
        }
      }
      return hashing;
    }
    var InfiniteHash = class {
      /**
       *
       * @param {Uint8Array} value
       * @param {(value: Uint8Array) => Promise<Uint8Array>} hashFn
       */
      constructor(value, hashFn2) {
        if (!(value instanceof Uint8Array)) {
          throw new Error("can only hash Uint8Arrays");
        }
        this._value = value;
        this._hashFn = hashFn2;
        this._depth = -1;
        this._availableBits = 0;
        this._currentBufferIndex = 0;
        this._buffers = [];
      }
      /**
       * @param {number} bits
       */
      async take(bits) {
        let pendingBits = bits;
        while (this._availableBits < pendingBits) {
          await this._produceMoreBits();
        }
        let result = 0;
        while (pendingBits > 0) {
          const hash = this._buffers[this._currentBufferIndex];
          const available = Math.min(hash.availableBits(), pendingBits);
          const took = hash.take(available);
          result = (result << available) + took;
          pendingBits -= available;
          this._availableBits -= available;
          if (hash.availableBits() === 0) {
            this._currentBufferIndex++;
          }
        }
        return result;
      }
      /**
       * @param {number} bits
       */
      untake(bits) {
        let pendingBits = bits;
        while (pendingBits > 0) {
          const hash = this._buffers[this._currentBufferIndex];
          const availableForUntake = Math.min(hash.totalBits() - hash.availableBits(), pendingBits);
          hash.untake(availableForUntake);
          pendingBits -= availableForUntake;
          this._availableBits += availableForUntake;
          if (this._currentBufferIndex > 0 && hash.totalBits() === hash.availableBits()) {
            this._depth--;
            this._currentBufferIndex--;
          }
        }
      }
      async _produceMoreBits() {
        this._depth++;
        const value = this._depth ? uint8ArrayConcat([this._value, Uint8Array.from([this._depth])]) : this._value;
        const hashValue = await this._hashFn(value);
        const buffer2 = new ConsumableBuffer(hashValue);
        this._buffers.push(buffer2);
        this._availableBits += buffer2.availableBits();
      }
    };
    module2.exports = wrapHash;
    module2.exports.InfiniteHash = InfiniteHash;
  }
});

// node_modules/hamt-sharding/src/index.js
var require_src2 = __commonJS({
  "node_modules/hamt-sharding/src/index.js"(exports2, module2) {
    "use strict";
    var Bucket3 = require_bucket();
    var wrapHash = require_consumable_hash();
    function createHAMT3(options) {
      if (!options || !options.hashFn) {
        throw new Error("please define an options.hashFn");
      }
      const bucketOptions = {
        bits: options.bits || 8,
        hash: wrapHash(options.hashFn)
      };
      return new Bucket3(bucketOptions);
    }
    module2.exports = {
      createHAMT: createHAMT3,
      Bucket: Bucket3
    };
  }
});

// node_modules/browser-readablestream-to-it/index.js
var require_browser_readablestream_to_it = __commonJS({
  "node_modules/browser-readablestream-to-it/index.js"(exports2, module2) {
    "use strict";
    async function* browserReadableStreamToIt(stream, options = {}) {
      const reader = stream.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) {
            return;
          }
          yield result.value;
        }
      } finally {
        if (options.preventCancel !== true) {
          reader.cancel();
        }
        reader.releaseLock();
      }
    }
    module2.exports = browserReadableStreamToIt;
  }
});

// node_modules/blob-to-it/index.js
var require_blob_to_it = __commonJS({
  "node_modules/blob-to-it/index.js"(exports2, module2) {
    "use strict";
    var browserReadableStreamToIt = require_browser_readablestream_to_it();
    function blobToIt2(blob) {
      if (typeof blob.stream === "function") {
        return browserReadableStreamToIt(blob.stream());
      }
      return browserReadableStreamToIt(new Response(blob).body);
    }
    module2.exports = blobToIt2;
  }
});

// node_modules/it-peekable/index.js
var require_it_peekable = __commonJS({
  "node_modules/it-peekable/index.js"(exports2, module2) {
    "use strict";
    function peekableIterator(iterable) {
      const [iterator, symbol] = iterable[Symbol.asyncIterator] ? [iterable[Symbol.asyncIterator](), Symbol.asyncIterator] : [iterable[Symbol.iterator](), Symbol.iterator];
      const queue = [];
      return {
        peek: () => {
          return iterator.next();
        },
        push: (value) => {
          queue.push(value);
        },
        next: () => {
          if (queue.length) {
            return {
              done: false,
              value: queue.shift()
            };
          }
          return iterator.next();
        },
        [symbol]() {
          return this;
        }
      };
    }
    module2.exports = peekableIterator;
  }
});

// node_modules/it-map/index.js
var require_it_map = __commonJS({
  "node_modules/it-map/index.js"(exports2, module2) {
    "use strict";
    var map3 = async function* (source, func) {
      for await (const val of source) {
        yield func(val);
      }
    };
    module2.exports = map3;
  }
});

// node_modules/it-drain/index.js
var require_it_drain = __commonJS({
  "node_modules/it-drain/index.js"(exports2, module2) {
    "use strict";
    var drain2 = async (source) => {
      for await (const _ of source) {
      }
    };
    module2.exports = drain2;
  }
});

// node_modules/it-filter/index.js
var require_it_filter = __commonJS({
  "node_modules/it-filter/index.js"(exports2, module2) {
    "use strict";
    var filter2 = async function* (source, fn) {
      for await (const entry of source) {
        if (await fn(entry)) {
          yield entry;
        }
      }
    };
    module2.exports = filter2;
  }
});

// node_modules/it-take/index.js
var require_it_take = __commonJS({
  "node_modules/it-take/index.js"(exports2, module2) {
    "use strict";
    var take2 = async function* (source, limit) {
      let items = 0;
      if (limit < 1) {
        return;
      }
      for await (const entry of source) {
        yield entry;
        items++;
        if (items === limit) {
          return;
        }
      }
    };
    module2.exports = take2;
  }
});

// node_modules/throttled-queue/dist/throttledQueue.js
var require_throttledQueue = __commonJS({
  "node_modules/throttled-queue/dist/throttledQueue.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function throttledQueue2(maxRequestsPerInterval, interval, evenlySpaced) {
      if (evenlySpaced === void 0) {
        evenlySpaced = false;
      }
      if (evenlySpaced) {
        interval = interval / maxRequestsPerInterval;
        maxRequestsPerInterval = 1;
      }
      var queue = [];
      var lastIntervalStart = 0;
      var numRequestsPerInterval = 0;
      var timeout;
      var dequeue = function() {
        var intervalEnd = lastIntervalStart + interval;
        var now = Date.now();
        if (now < intervalEnd) {
          timeout !== void 0 && clearTimeout(timeout);
          timeout = setTimeout(dequeue, intervalEnd - now);
          return;
        }
        lastIntervalStart = now;
        numRequestsPerInterval = 0;
        for (var _i = 0, _a = queue.splice(0, maxRequestsPerInterval); _i < _a.length; _i++) {
          var callback = _a[_i];
          numRequestsPerInterval++;
          void callback();
        }
        if (queue.length) {
          timeout = setTimeout(dequeue, interval);
        } else {
          timeout = void 0;
        }
      };
      return function(fn) {
        return new Promise(function(resolve5, reject) {
          var callback = function() {
            return Promise.resolve().then(fn).then(resolve5).catch(reject);
          };
          var now = Date.now();
          if (timeout === void 0 && now - lastIntervalStart > interval) {
            lastIntervalStart = now;
            numRequestsPerInterval = 0;
          }
          if (numRequestsPerInterval++ < maxRequestsPerInterval) {
            void callback();
          } else {
            queue.push(callback);
            if (timeout === void 0) {
              timeout = setTimeout(dequeue, lastIntervalStart + interval - now);
            }
          }
        });
      };
    }
    module2.exports = throttledQueue2;
    exports2.default = throttledQueue2;
  }
});

// node_modules/streaming-iterables/dist/index.mjs
var TIMEOUT = Symbol("TIMEOUT");
function getIterator(iterable) {
  if (typeof iterable.next === "function") {
    return iterable;
  }
  if (typeof iterable[Symbol.iterator] === "function") {
    return iterable[Symbol.iterator]();
  }
  if (typeof iterable[Symbol.asyncIterator] === "function") {
    return iterable[Symbol.asyncIterator]();
  }
  throw new TypeError('"values" does not to conform to any of the iterator or iterable protocols');
}
function defer() {
  let reject;
  let resolve5;
  const promise = new Promise((resolveFunc, rejectFunc) => {
    resolve5 = resolveFunc;
    reject = rejectFunc;
  });
  return {
    promise,
    reject,
    resolve: resolve5
  };
}
function _transform(concurrency, func, iterable) {
  const iterator = getIterator(iterable);
  const resultQueue = [];
  const readQueue = [];
  let ended = false;
  let reading = false;
  let inflightCount = 0;
  let lastError = null;
  function fulfillReadQueue() {
    while (readQueue.length > 0 && resultQueue.length > 0) {
      const { resolve: resolve5 } = readQueue.shift();
      const value = resultQueue.shift();
      resolve5({ done: false, value });
    }
    while (readQueue.length > 0 && inflightCount === 0 && ended) {
      const { resolve: resolve5, reject } = readQueue.shift();
      if (lastError) {
        reject(lastError);
        lastError = null;
      } else {
        resolve5({ done: true, value: void 0 });
      }
    }
  }
  async function fillQueue() {
    if (ended) {
      fulfillReadQueue();
      return;
    }
    if (reading) {
      return;
    }
    if (inflightCount + resultQueue.length >= concurrency) {
      return;
    }
    reading = true;
    inflightCount++;
    try {
      const { done, value } = await iterator.next();
      if (done) {
        ended = true;
        inflightCount--;
        fulfillReadQueue();
      } else {
        mapAndQueue(value);
      }
    } catch (error) {
      ended = true;
      inflightCount--;
      lastError = error;
      fulfillReadQueue();
    }
    reading = false;
    fillQueue();
  }
  async function mapAndQueue(itrValue) {
    try {
      const value = await func(itrValue);
      resultQueue.push(value);
    } catch (error) {
      ended = true;
      lastError = error;
    }
    inflightCount--;
    fulfillReadQueue();
    fillQueue();
  }
  async function next() {
    if (resultQueue.length === 0) {
      const deferred = defer();
      readQueue.push(deferred);
      fillQueue();
      return deferred.promise;
    }
    const value = resultQueue.shift();
    fillQueue();
    return { done: false, value };
  }
  const asyncIterableIterator = {
    next,
    [Symbol.asyncIterator]: () => asyncIterableIterator
  };
  return asyncIterableIterator;
}
function transform(concurrency, func, iterable) {
  if (func === void 0) {
    return (curriedFunc, curriedIterable) => curriedIterable ? transform(concurrency, curriedFunc, curriedIterable) : transform(concurrency, curriedFunc);
  }
  if (iterable === void 0) {
    return (curriedIterable) => transform(concurrency, func, curriedIterable);
  }
  return _transform(concurrency, func, iterable);
}

// node_modules/web3.storage/src/lib.js
var import_p_retry = __toESM(require_p_retry());

// node_modules/ipfs-car/dist/esm/pack/index.js
var import_it_last = __toESM(require_it_last());
var import_it_pipe = __toESM(require_it_pipe());

// node_modules/@ipld/car/esm/lib/decoder.js
var import_varint2 = __toESM(require_varint(), 1);
init_cid();
init_digest();

// node_modules/cborg/esm/lib/is.js
var typeofs = [
  "string",
  "number",
  "bigint",
  "symbol"
];
var objectTypeNames = [
  "Function",
  "Generator",
  "AsyncGenerator",
  "GeneratorFunction",
  "AsyncGeneratorFunction",
  "AsyncFunction",
  "Observable",
  "Array",
  "Buffer",
  "Object",
  "RegExp",
  "Date",
  "Error",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Promise",
  "URL",
  "HTMLElement",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array"
];
function is(value) {
  if (value === null) {
    return "null";
  }
  if (value === void 0) {
    return "undefined";
  }
  if (value === true || value === false) {
    return "boolean";
  }
  const typeOf = typeof value;
  if (typeofs.includes(typeOf)) {
    return typeOf;
  }
  if (typeOf === "function") {
    return "Function";
  }
  if (Array.isArray(value)) {
    return "Array";
  }
  if (isBuffer(value)) {
    return "Buffer";
  }
  const objectType = getObjectType(value);
  if (objectType) {
    return objectType;
  }
  return "Object";
}
function isBuffer(value) {
  return value && value.constructor && value.constructor.isBuffer && value.constructor.isBuffer.call(null, value);
}
function getObjectType(value) {
  const objectTypeName = Object.prototype.toString.call(value).slice(8, -1);
  if (objectTypeNames.includes(objectTypeName)) {
    return objectTypeName;
  }
  return void 0;
}

// node_modules/cborg/esm/lib/token.js
var Type = class {
  constructor(major, name5, terminal) {
    this.major = major;
    this.majorEncoded = major << 5;
    this.name = name5;
    this.terminal = terminal;
  }
  toString() {
    return `Type[${this.major}].${this.name}`;
  }
  compare(typ) {
    return this.major < typ.major ? -1 : this.major > typ.major ? 1 : 0;
  }
};
Type.uint = new Type(0, "uint", true);
Type.negint = new Type(1, "negint", true);
Type.bytes = new Type(2, "bytes", true);
Type.string = new Type(3, "string", true);
Type.array = new Type(4, "array", false);
Type.map = new Type(5, "map", false);
Type.tag = new Type(6, "tag", false);
Type.float = new Type(7, "float", true);
Type.false = new Type(7, "false", true);
Type.true = new Type(7, "true", true);
Type.null = new Type(7, "null", true);
Type.undefined = new Type(7, "undefined", true);
Type.break = new Type(7, "break", true);
var Token = class {
  constructor(type, value, encodedLength) {
    this.type = type;
    this.value = value;
    this.encodedLength = encodedLength;
    this.encodedBytes = void 0;
    this.byteValue = void 0;
  }
  toString() {
    return `Token[${this.type}].${this.value}`;
  }
};

// node_modules/cborg/esm/lib/byte-utils.js
var useBuffer = globalThis.process && !globalThis.process.browser && globalThis.Buffer && typeof globalThis.Buffer.isBuffer === "function";
var textDecoder = new TextDecoder();
var textEncoder = new TextEncoder();
function isBuffer2(buf2) {
  return useBuffer && globalThis.Buffer.isBuffer(buf2);
}
function asU8A(buf2) {
  if (!(buf2 instanceof Uint8Array)) {
    return Uint8Array.from(buf2);
  }
  return isBuffer2(buf2) ? new Uint8Array(buf2.buffer, buf2.byteOffset, buf2.byteLength) : buf2;
}
var toString2 = useBuffer ? (bytes, start, end) => {
  return end - start > 64 ? globalThis.Buffer.from(bytes.subarray(start, end)).toString("utf8") : utf8Slice(bytes, start, end);
} : (bytes, start, end) => {
  return end - start > 64 ? textDecoder.decode(bytes.subarray(start, end)) : utf8Slice(bytes, start, end);
};
var fromString2 = useBuffer ? (string2) => {
  return string2.length > 64 ? globalThis.Buffer.from(string2) : utf8ToBytes(string2);
} : (string2) => {
  return string2.length > 64 ? textEncoder.encode(string2) : utf8ToBytes(string2);
};
var fromArray = (arr) => {
  return Uint8Array.from(arr);
};
var slice = useBuffer ? (bytes, start, end) => {
  if (isBuffer2(bytes)) {
    return new Uint8Array(bytes.subarray(start, end));
  }
  return bytes.slice(start, end);
} : (bytes, start, end) => {
  return bytes.slice(start, end);
};
var concat = useBuffer ? (chunks, length2) => {
  chunks = chunks.map((c) => c instanceof Uint8Array ? c : globalThis.Buffer.from(c));
  return asU8A(globalThis.Buffer.concat(chunks, length2));
} : (chunks, length2) => {
  const out = new Uint8Array(length2);
  let off = 0;
  for (let b of chunks) {
    if (off + b.length > out.length) {
      b = b.subarray(0, out.length - off);
    }
    out.set(b, off);
    off += b.length;
  }
  return out;
};
var alloc = useBuffer ? (size) => {
  return globalThis.Buffer.allocUnsafe(size);
} : (size) => {
  return new Uint8Array(size);
};
function compare(b1, b2) {
  if (isBuffer2(b1) && isBuffer2(b2)) {
    return b1.compare(b2);
  }
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] === b2[i]) {
      continue;
    }
    return b1[i] < b2[i] ? -1 : 1;
  }
  return 0;
}
function utf8ToBytes(string2, units = Infinity) {
  let codePoint;
  const length2 = string2.length;
  let leadSurrogate = null;
  const bytes = [];
  for (let i = 0; i < length2; ++i) {
    codePoint = string2.charCodeAt(i);
    if (codePoint > 55295 && codePoint < 57344) {
      if (!leadSurrogate) {
        if (codePoint > 56319) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        } else if (i + 1 === length2) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        }
        leadSurrogate = codePoint;
        continue;
      }
      if (codePoint < 56320) {
        if ((units -= 3) > -1)
          bytes.push(239, 191, 189);
        leadSurrogate = codePoint;
        continue;
      }
      codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
    } else if (leadSurrogate) {
      if ((units -= 3) > -1)
        bytes.push(239, 191, 189);
    }
    leadSurrogate = null;
    if (codePoint < 128) {
      if ((units -= 1) < 0)
        break;
      bytes.push(codePoint);
    } else if (codePoint < 2048) {
      if ((units -= 2) < 0)
        break;
      bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
    } else if (codePoint < 65536) {
      if ((units -= 3) < 0)
        break;
      bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else if (codePoint < 1114112) {
      if ((units -= 4) < 0)
        break;
      bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else {
      throw new Error("Invalid code point");
    }
  }
  return bytes;
}
function utf8Slice(buf2, offset, end) {
  const res = [];
  while (offset < end) {
    const firstByte = buf2[offset];
    let codePoint = null;
    let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
    if (offset + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint;
      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 128) {
            codePoint = firstByte;
          }
          break;
        case 2:
          secondByte = buf2[offset + 1];
          if ((secondByte & 192) === 128) {
            tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
            if (tempCodePoint > 127) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 3:
          secondByte = buf2[offset + 1];
          thirdByte = buf2[offset + 2];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
            if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 4:
          secondByte = buf2[offset + 1];
          thirdByte = buf2[offset + 2];
          fourthByte = buf2[offset + 3];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
            if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
              codePoint = tempCodePoint;
            }
          }
      }
    }
    if (codePoint === null) {
      codePoint = 65533;
      bytesPerSequence = 1;
    } else if (codePoint > 65535) {
      codePoint -= 65536;
      res.push(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    res.push(codePoint);
    offset += bytesPerSequence;
  }
  return decodeCodePointsArray(res);
}
var MAX_ARGUMENTS_LENGTH = 4096;
function decodeCodePointsArray(codePoints) {
  const len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints);
  }
  let res = "";
  let i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
  }
  return res;
}

// node_modules/cborg/esm/lib/bl.js
var defaultChunkSize = 256;
var Bl = class {
  constructor(chunkSize = defaultChunkSize) {
    this.chunkSize = chunkSize;
    this.cursor = 0;
    this.maxCursor = -1;
    this.chunks = [];
    this._initReuseChunk = null;
  }
  reset() {
    this.cursor = 0;
    this.maxCursor = -1;
    if (this.chunks.length) {
      this.chunks = [];
    }
    if (this._initReuseChunk !== null) {
      this.chunks.push(this._initReuseChunk);
      this.maxCursor = this._initReuseChunk.length - 1;
    }
  }
  push(bytes) {
    let topChunk = this.chunks[this.chunks.length - 1];
    const newMax = this.cursor + bytes.length;
    if (newMax <= this.maxCursor + 1) {
      const chunkPos = topChunk.length - (this.maxCursor - this.cursor) - 1;
      topChunk.set(bytes, chunkPos);
    } else {
      if (topChunk) {
        const chunkPos = topChunk.length - (this.maxCursor - this.cursor) - 1;
        if (chunkPos < topChunk.length) {
          this.chunks[this.chunks.length - 1] = topChunk.subarray(0, chunkPos);
          this.maxCursor = this.cursor - 1;
        }
      }
      if (bytes.length < 64 && bytes.length < this.chunkSize) {
        topChunk = alloc(this.chunkSize);
        this.chunks.push(topChunk);
        this.maxCursor += topChunk.length;
        if (this._initReuseChunk === null) {
          this._initReuseChunk = topChunk;
        }
        topChunk.set(bytes, 0);
      } else {
        this.chunks.push(bytes);
        this.maxCursor += bytes.length;
      }
    }
    this.cursor += bytes.length;
  }
  toBytes(reset = false) {
    let byts;
    if (this.chunks.length === 1) {
      const chunk = this.chunks[0];
      if (reset && this.cursor > chunk.length / 2) {
        byts = this.cursor === chunk.length ? chunk : chunk.subarray(0, this.cursor);
        this._initReuseChunk = null;
        this.chunks = [];
      } else {
        byts = slice(chunk, 0, this.cursor);
      }
    } else {
      byts = concat(this.chunks, this.cursor);
    }
    if (reset) {
      this.reset();
    }
    return byts;
  }
};

// node_modules/cborg/esm/lib/common.js
var decodeErrPrefix = "CBOR decode error:";
var encodeErrPrefix = "CBOR encode error:";
var uintMinorPrefixBytes = [];
uintMinorPrefixBytes[23] = 1;
uintMinorPrefixBytes[24] = 2;
uintMinorPrefixBytes[25] = 3;
uintMinorPrefixBytes[26] = 5;
uintMinorPrefixBytes[27] = 9;
function assertEnoughData(data, pos, need) {
  if (data.length - pos < need) {
    throw new Error(`${decodeErrPrefix} not enough data for type`);
  }
}

// node_modules/cborg/esm/lib/0uint.js
var uintBoundaries = [
  24,
  256,
  65536,
  4294967296,
  BigInt("18446744073709551616")
];
function readUint8(data, offset, options) {
  assertEnoughData(data, offset, 1);
  const value = data[offset];
  if (options.strict === true && value < uintBoundaries[0]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`);
  }
  return value;
}
function readUint16(data, offset, options) {
  assertEnoughData(data, offset, 2);
  const value = data[offset] << 8 | data[offset + 1];
  if (options.strict === true && value < uintBoundaries[1]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`);
  }
  return value;
}
function readUint32(data, offset, options) {
  assertEnoughData(data, offset, 4);
  const value = data[offset] * 16777216 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
  if (options.strict === true && value < uintBoundaries[2]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`);
  }
  return value;
}
function readUint64(data, offset, options) {
  assertEnoughData(data, offset, 8);
  const hi = data[offset] * 16777216 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
  const lo = data[offset + 4] * 16777216 + (data[offset + 5] << 16) + (data[offset + 6] << 8) + data[offset + 7];
  const value = (BigInt(hi) << BigInt(32)) + BigInt(lo);
  if (options.strict === true && value < uintBoundaries[3]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`);
  }
  if (value <= Number.MAX_SAFE_INTEGER) {
    return Number(value);
  }
  if (options.allowBigInt === true) {
    return value;
  }
  throw new Error(`${decodeErrPrefix} integers outside of the safe integer range are not supported`);
}
function decodeUint8(data, pos, _minor, options) {
  return new Token(Type.uint, readUint8(data, pos + 1, options), 2);
}
function decodeUint16(data, pos, _minor, options) {
  return new Token(Type.uint, readUint16(data, pos + 1, options), 3);
}
function decodeUint32(data, pos, _minor, options) {
  return new Token(Type.uint, readUint32(data, pos + 1, options), 5);
}
function decodeUint64(data, pos, _minor, options) {
  return new Token(Type.uint, readUint64(data, pos + 1, options), 9);
}
function encodeUint(buf2, token) {
  return encodeUintValue(buf2, 0, token.value);
}
function encodeUintValue(buf2, major, uint) {
  if (uint < uintBoundaries[0]) {
    const nuint = Number(uint);
    buf2.push([major | nuint]);
  } else if (uint < uintBoundaries[1]) {
    const nuint = Number(uint);
    buf2.push([
      major | 24,
      nuint
    ]);
  } else if (uint < uintBoundaries[2]) {
    const nuint = Number(uint);
    buf2.push([
      major | 25,
      nuint >>> 8,
      nuint & 255
    ]);
  } else if (uint < uintBoundaries[3]) {
    const nuint = Number(uint);
    buf2.push([
      major | 26,
      nuint >>> 24 & 255,
      nuint >>> 16 & 255,
      nuint >>> 8 & 255,
      nuint & 255
    ]);
  } else {
    const buint = BigInt(uint);
    if (buint < uintBoundaries[4]) {
      const set = [
        major | 27,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ];
      let lo = Number(buint & BigInt(4294967295));
      let hi = Number(buint >> BigInt(32) & BigInt(4294967295));
      set[8] = lo & 255;
      lo = lo >> 8;
      set[7] = lo & 255;
      lo = lo >> 8;
      set[6] = lo & 255;
      lo = lo >> 8;
      set[5] = lo & 255;
      set[4] = hi & 255;
      hi = hi >> 8;
      set[3] = hi & 255;
      hi = hi >> 8;
      set[2] = hi & 255;
      hi = hi >> 8;
      set[1] = hi & 255;
      buf2.push(set);
    } else {
      throw new Error(`${decodeErrPrefix} encountered BigInt larger than allowable range`);
    }
  }
}
encodeUint.encodedSize = function encodedSize(token) {
  return encodeUintValue.encodedSize(token.value);
};
encodeUintValue.encodedSize = function encodedSize2(uint) {
  if (uint < uintBoundaries[0]) {
    return 1;
  }
  if (uint < uintBoundaries[1]) {
    return 2;
  }
  if (uint < uintBoundaries[2]) {
    return 3;
  }
  if (uint < uintBoundaries[3]) {
    return 5;
  }
  return 9;
};
encodeUint.compareTokens = function compareTokens(tok1, tok2) {
  return tok1.value < tok2.value ? -1 : tok1.value > tok2.value ? 1 : 0;
};

// node_modules/cborg/esm/lib/1negint.js
function decodeNegint8(data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint8(data, pos + 1, options), 2);
}
function decodeNegint16(data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint16(data, pos + 1, options), 3);
}
function decodeNegint32(data, pos, _minor, options) {
  return new Token(Type.negint, -1 - readUint32(data, pos + 1, options), 5);
}
var neg1b = BigInt(-1);
var pos1b = BigInt(1);
function decodeNegint64(data, pos, _minor, options) {
  const int = readUint64(data, pos + 1, options);
  if (typeof int !== "bigint") {
    const value = -1 - int;
    if (value >= Number.MIN_SAFE_INTEGER) {
      return new Token(Type.negint, value, 9);
    }
  }
  if (options.allowBigInt !== true) {
    throw new Error(`${decodeErrPrefix} integers outside of the safe integer range are not supported`);
  }
  return new Token(Type.negint, neg1b - BigInt(int), 9);
}
function encodeNegint(buf2, token) {
  const negint = token.value;
  const unsigned = typeof negint === "bigint" ? negint * neg1b - pos1b : negint * -1 - 1;
  encodeUintValue(buf2, token.type.majorEncoded, unsigned);
}
encodeNegint.encodedSize = function encodedSize3(token) {
  const negint = token.value;
  const unsigned = typeof negint === "bigint" ? negint * neg1b - pos1b : negint * -1 - 1;
  if (unsigned < uintBoundaries[0]) {
    return 1;
  }
  if (unsigned < uintBoundaries[1]) {
    return 2;
  }
  if (unsigned < uintBoundaries[2]) {
    return 3;
  }
  if (unsigned < uintBoundaries[3]) {
    return 5;
  }
  return 9;
};
encodeNegint.compareTokens = function compareTokens2(tok1, tok2) {
  return tok1.value < tok2.value ? 1 : tok1.value > tok2.value ? -1 : 0;
};

// node_modules/cborg/esm/lib/2bytes.js
function toToken(data, pos, prefix, length2) {
  assertEnoughData(data, pos, prefix + length2);
  const buf2 = slice(data, pos + prefix, pos + prefix + length2);
  return new Token(Type.bytes, buf2, prefix + length2);
}
function decodeBytesCompact(data, pos, minor, _options) {
  return toToken(data, pos, 1, minor);
}
function decodeBytes8(data, pos, _minor, options) {
  return toToken(data, pos, 2, readUint8(data, pos + 1, options));
}
function decodeBytes16(data, pos, _minor, options) {
  return toToken(data, pos, 3, readUint16(data, pos + 1, options));
}
function decodeBytes32(data, pos, _minor, options) {
  return toToken(data, pos, 5, readUint32(data, pos + 1, options));
}
function decodeBytes64(data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options);
  if (typeof l === "bigint") {
    throw new Error(`${decodeErrPrefix} 64-bit integer bytes lengths not supported`);
  }
  return toToken(data, pos, 9, l);
}
function tokenBytes(token) {
  if (token.encodedBytes === void 0) {
    token.encodedBytes = token.type === Type.string ? fromString2(token.value) : token.value;
  }
  return token.encodedBytes;
}
function encodeBytes(buf2, token) {
  const bytes = tokenBytes(token);
  encodeUintValue(buf2, token.type.majorEncoded, bytes.length);
  buf2.push(bytes);
}
encodeBytes.encodedSize = function encodedSize4(token) {
  const bytes = tokenBytes(token);
  return encodeUintValue.encodedSize(bytes.length) + bytes.length;
};
encodeBytes.compareTokens = function compareTokens3(tok1, tok2) {
  return compareBytes(tokenBytes(tok1), tokenBytes(tok2));
};
function compareBytes(b1, b2) {
  return b1.length < b2.length ? -1 : b1.length > b2.length ? 1 : compare(b1, b2);
}

// node_modules/cborg/esm/lib/3string.js
function toToken2(data, pos, prefix, length2, options) {
  const totLength = prefix + length2;
  assertEnoughData(data, pos, totLength);
  const tok = new Token(Type.string, toString2(data, pos + prefix, pos + totLength), totLength);
  if (options.retainStringBytes === true) {
    tok.byteValue = slice(data, pos + prefix, pos + totLength);
  }
  return tok;
}
function decodeStringCompact(data, pos, minor, options) {
  return toToken2(data, pos, 1, minor, options);
}
function decodeString8(data, pos, _minor, options) {
  return toToken2(data, pos, 2, readUint8(data, pos + 1, options), options);
}
function decodeString16(data, pos, _minor, options) {
  return toToken2(data, pos, 3, readUint16(data, pos + 1, options), options);
}
function decodeString32(data, pos, _minor, options) {
  return toToken2(data, pos, 5, readUint32(data, pos + 1, options), options);
}
function decodeString64(data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options);
  if (typeof l === "bigint") {
    throw new Error(`${decodeErrPrefix} 64-bit integer string lengths not supported`);
  }
  return toToken2(data, pos, 9, l, options);
}
var encodeString = encodeBytes;

// node_modules/cborg/esm/lib/4array.js
function toToken3(_data, _pos, prefix, length2) {
  return new Token(Type.array, length2, prefix);
}
function decodeArrayCompact(data, pos, minor, _options) {
  return toToken3(data, pos, 1, minor);
}
function decodeArray8(data, pos, _minor, options) {
  return toToken3(data, pos, 2, readUint8(data, pos + 1, options));
}
function decodeArray16(data, pos, _minor, options) {
  return toToken3(data, pos, 3, readUint16(data, pos + 1, options));
}
function decodeArray32(data, pos, _minor, options) {
  return toToken3(data, pos, 5, readUint32(data, pos + 1, options));
}
function decodeArray64(data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options);
  if (typeof l === "bigint") {
    throw new Error(`${decodeErrPrefix} 64-bit integer array lengths not supported`);
  }
  return toToken3(data, pos, 9, l);
}
function decodeArrayIndefinite(data, pos, _minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`);
  }
  return toToken3(data, pos, 1, Infinity);
}
function encodeArray(buf2, token) {
  encodeUintValue(buf2, Type.array.majorEncoded, token.value);
}
encodeArray.compareTokens = encodeUint.compareTokens;
encodeArray.encodedSize = function encodedSize5(token) {
  return encodeUintValue.encodedSize(token.value);
};

// node_modules/cborg/esm/lib/5map.js
function toToken4(_data, _pos, prefix, length2) {
  return new Token(Type.map, length2, prefix);
}
function decodeMapCompact(data, pos, minor, _options) {
  return toToken4(data, pos, 1, minor);
}
function decodeMap8(data, pos, _minor, options) {
  return toToken4(data, pos, 2, readUint8(data, pos + 1, options));
}
function decodeMap16(data, pos, _minor, options) {
  return toToken4(data, pos, 3, readUint16(data, pos + 1, options));
}
function decodeMap32(data, pos, _minor, options) {
  return toToken4(data, pos, 5, readUint32(data, pos + 1, options));
}
function decodeMap64(data, pos, _minor, options) {
  const l = readUint64(data, pos + 1, options);
  if (typeof l === "bigint") {
    throw new Error(`${decodeErrPrefix} 64-bit integer map lengths not supported`);
  }
  return toToken4(data, pos, 9, l);
}
function decodeMapIndefinite(data, pos, _minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`);
  }
  return toToken4(data, pos, 1, Infinity);
}
function encodeMap(buf2, token) {
  encodeUintValue(buf2, Type.map.majorEncoded, token.value);
}
encodeMap.compareTokens = encodeUint.compareTokens;
encodeMap.encodedSize = function encodedSize6(token) {
  return encodeUintValue.encodedSize(token.value);
};

// node_modules/cborg/esm/lib/6tag.js
function decodeTagCompact(_data, _pos, minor, _options) {
  return new Token(Type.tag, minor, 1);
}
function decodeTag8(data, pos, _minor, options) {
  return new Token(Type.tag, readUint8(data, pos + 1, options), 2);
}
function decodeTag16(data, pos, _minor, options) {
  return new Token(Type.tag, readUint16(data, pos + 1, options), 3);
}
function decodeTag32(data, pos, _minor, options) {
  return new Token(Type.tag, readUint32(data, pos + 1, options), 5);
}
function decodeTag64(data, pos, _minor, options) {
  return new Token(Type.tag, readUint64(data, pos + 1, options), 9);
}
function encodeTag(buf2, token) {
  encodeUintValue(buf2, Type.tag.majorEncoded, token.value);
}
encodeTag.compareTokens = encodeUint.compareTokens;
encodeTag.encodedSize = function encodedSize7(token) {
  return encodeUintValue.encodedSize(token.value);
};

// node_modules/cborg/esm/lib/7float.js
var MINOR_FALSE = 20;
var MINOR_TRUE = 21;
var MINOR_NULL = 22;
var MINOR_UNDEFINED = 23;
function decodeUndefined(_data, _pos, _minor, options) {
  if (options.allowUndefined === false) {
    throw new Error(`${decodeErrPrefix} undefined values are not supported`);
  } else if (options.coerceUndefinedToNull === true) {
    return new Token(Type.null, null, 1);
  }
  return new Token(Type.undefined, void 0, 1);
}
function decodeBreak(_data, _pos, _minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`);
  }
  return new Token(Type.break, void 0, 1);
}
function createToken(value, bytes, options) {
  if (options) {
    if (options.allowNaN === false && Number.isNaN(value)) {
      throw new Error(`${decodeErrPrefix} NaN values are not supported`);
    }
    if (options.allowInfinity === false && (value === Infinity || value === -Infinity)) {
      throw new Error(`${decodeErrPrefix} Infinity values are not supported`);
    }
  }
  return new Token(Type.float, value, bytes);
}
function decodeFloat16(data, pos, _minor, options) {
  return createToken(readFloat16(data, pos + 1), 3, options);
}
function decodeFloat32(data, pos, _minor, options) {
  return createToken(readFloat32(data, pos + 1), 5, options);
}
function decodeFloat64(data, pos, _minor, options) {
  return createToken(readFloat64(data, pos + 1), 9, options);
}
function encodeFloat(buf2, token, options) {
  const float = token.value;
  if (float === false) {
    buf2.push([Type.float.majorEncoded | MINOR_FALSE]);
  } else if (float === true) {
    buf2.push([Type.float.majorEncoded | MINOR_TRUE]);
  } else if (float === null) {
    buf2.push([Type.float.majorEncoded | MINOR_NULL]);
  } else if (float === void 0) {
    buf2.push([Type.float.majorEncoded | MINOR_UNDEFINED]);
  } else {
    let decoded;
    let success = false;
    if (!options || options.float64 !== true) {
      encodeFloat16(float);
      decoded = readFloat16(ui8a, 1);
      if (float === decoded || Number.isNaN(float)) {
        ui8a[0] = 249;
        buf2.push(ui8a.slice(0, 3));
        success = true;
      } else {
        encodeFloat32(float);
        decoded = readFloat32(ui8a, 1);
        if (float === decoded) {
          ui8a[0] = 250;
          buf2.push(ui8a.slice(0, 5));
          success = true;
        }
      }
    }
    if (!success) {
      encodeFloat64(float);
      decoded = readFloat64(ui8a, 1);
      ui8a[0] = 251;
      buf2.push(ui8a.slice(0, 9));
    }
  }
}
encodeFloat.encodedSize = function encodedSize8(token, options) {
  const float = token.value;
  if (float === false || float === true || float === null || float === void 0) {
    return 1;
  }
  if (!options || options.float64 !== true) {
    encodeFloat16(float);
    let decoded = readFloat16(ui8a, 1);
    if (float === decoded || Number.isNaN(float)) {
      return 3;
    }
    encodeFloat32(float);
    decoded = readFloat32(ui8a, 1);
    if (float === decoded) {
      return 5;
    }
  }
  return 9;
};
var buffer = new ArrayBuffer(9);
var dataView = new DataView(buffer, 1);
var ui8a = new Uint8Array(buffer, 0);
function encodeFloat16(inp) {
  if (inp === Infinity) {
    dataView.setUint16(0, 31744, false);
  } else if (inp === -Infinity) {
    dataView.setUint16(0, 64512, false);
  } else if (Number.isNaN(inp)) {
    dataView.setUint16(0, 32256, false);
  } else {
    dataView.setFloat32(0, inp);
    const valu32 = dataView.getUint32(0);
    const exponent = (valu32 & 2139095040) >> 23;
    const mantissa = valu32 & 8388607;
    if (exponent === 255) {
      dataView.setUint16(0, 31744, false);
    } else if (exponent === 0) {
      dataView.setUint16(0, (inp & 2147483648) >> 16 | mantissa >> 13, false);
    } else {
      const logicalExponent = exponent - 127;
      if (logicalExponent < -24) {
        dataView.setUint16(0, 0);
      } else if (logicalExponent < -14) {
        dataView.setUint16(0, (valu32 & 2147483648) >> 16 | 1 << 24 + logicalExponent, false);
      } else {
        dataView.setUint16(0, (valu32 & 2147483648) >> 16 | logicalExponent + 15 << 10 | mantissa >> 13, false);
      }
    }
  }
}
function readFloat16(ui8a2, pos) {
  if (ui8a2.length - pos < 2) {
    throw new Error(`${decodeErrPrefix} not enough data for float16`);
  }
  const half = (ui8a2[pos] << 8) + ui8a2[pos + 1];
  if (half === 31744) {
    return Infinity;
  }
  if (half === 64512) {
    return -Infinity;
  }
  if (half === 32256) {
    return NaN;
  }
  const exp = half >> 10 & 31;
  const mant = half & 1023;
  let val;
  if (exp === 0) {
    val = mant * 2 ** -24;
  } else if (exp !== 31) {
    val = (mant + 1024) * 2 ** (exp - 25);
  } else {
    val = mant === 0 ? Infinity : NaN;
  }
  return half & 32768 ? -val : val;
}
function encodeFloat32(inp) {
  dataView.setFloat32(0, inp, false);
}
function readFloat32(ui8a2, pos) {
  if (ui8a2.length - pos < 4) {
    throw new Error(`${decodeErrPrefix} not enough data for float32`);
  }
  const offset = (ui8a2.byteOffset || 0) + pos;
  return new DataView(ui8a2.buffer, offset, 4).getFloat32(0, false);
}
function encodeFloat64(inp) {
  dataView.setFloat64(0, inp, false);
}
function readFloat64(ui8a2, pos) {
  if (ui8a2.length - pos < 8) {
    throw new Error(`${decodeErrPrefix} not enough data for float64`);
  }
  const offset = (ui8a2.byteOffset || 0) + pos;
  return new DataView(ui8a2.buffer, offset, 8).getFloat64(0, false);
}
encodeFloat.compareTokens = encodeUint.compareTokens;

// node_modules/cborg/esm/lib/jump.js
function invalidMinor(data, pos, minor) {
  throw new Error(`${decodeErrPrefix} encountered invalid minor (${minor}) for major ${data[pos] >>> 5}`);
}
function errorer(msg) {
  return () => {
    throw new Error(`${decodeErrPrefix} ${msg}`);
  };
}
var jump = [];
for (let i = 0; i <= 23; i++) {
  jump[i] = invalidMinor;
}
jump[24] = decodeUint8;
jump[25] = decodeUint16;
jump[26] = decodeUint32;
jump[27] = decodeUint64;
jump[28] = invalidMinor;
jump[29] = invalidMinor;
jump[30] = invalidMinor;
jump[31] = invalidMinor;
for (let i = 32; i <= 55; i++) {
  jump[i] = invalidMinor;
}
jump[56] = decodeNegint8;
jump[57] = decodeNegint16;
jump[58] = decodeNegint32;
jump[59] = decodeNegint64;
jump[60] = invalidMinor;
jump[61] = invalidMinor;
jump[62] = invalidMinor;
jump[63] = invalidMinor;
for (let i = 64; i <= 87; i++) {
  jump[i] = decodeBytesCompact;
}
jump[88] = decodeBytes8;
jump[89] = decodeBytes16;
jump[90] = decodeBytes32;
jump[91] = decodeBytes64;
jump[92] = invalidMinor;
jump[93] = invalidMinor;
jump[94] = invalidMinor;
jump[95] = errorer("indefinite length bytes/strings are not supported");
for (let i = 96; i <= 119; i++) {
  jump[i] = decodeStringCompact;
}
jump[120] = decodeString8;
jump[121] = decodeString16;
jump[122] = decodeString32;
jump[123] = decodeString64;
jump[124] = invalidMinor;
jump[125] = invalidMinor;
jump[126] = invalidMinor;
jump[127] = errorer("indefinite length bytes/strings are not supported");
for (let i = 128; i <= 151; i++) {
  jump[i] = decodeArrayCompact;
}
jump[152] = decodeArray8;
jump[153] = decodeArray16;
jump[154] = decodeArray32;
jump[155] = decodeArray64;
jump[156] = invalidMinor;
jump[157] = invalidMinor;
jump[158] = invalidMinor;
jump[159] = decodeArrayIndefinite;
for (let i = 160; i <= 183; i++) {
  jump[i] = decodeMapCompact;
}
jump[184] = decodeMap8;
jump[185] = decodeMap16;
jump[186] = decodeMap32;
jump[187] = decodeMap64;
jump[188] = invalidMinor;
jump[189] = invalidMinor;
jump[190] = invalidMinor;
jump[191] = decodeMapIndefinite;
for (let i = 192; i <= 215; i++) {
  jump[i] = decodeTagCompact;
}
jump[216] = decodeTag8;
jump[217] = decodeTag16;
jump[218] = decodeTag32;
jump[219] = decodeTag64;
jump[220] = invalidMinor;
jump[221] = invalidMinor;
jump[222] = invalidMinor;
jump[223] = invalidMinor;
for (let i = 224; i <= 243; i++) {
  jump[i] = errorer("simple values are not supported");
}
jump[244] = invalidMinor;
jump[245] = invalidMinor;
jump[246] = invalidMinor;
jump[247] = decodeUndefined;
jump[248] = errorer("simple values are not supported");
jump[249] = decodeFloat16;
jump[250] = decodeFloat32;
jump[251] = decodeFloat64;
jump[252] = invalidMinor;
jump[253] = invalidMinor;
jump[254] = invalidMinor;
jump[255] = decodeBreak;
var quick = [];
for (let i = 0; i < 24; i++) {
  quick[i] = new Token(Type.uint, i, 1);
}
for (let i = -1; i >= -24; i--) {
  quick[31 - i] = new Token(Type.negint, i, 1);
}
quick[64] = new Token(Type.bytes, new Uint8Array(0), 1);
quick[96] = new Token(Type.string, "", 1);
quick[128] = new Token(Type.array, 0, 1);
quick[160] = new Token(Type.map, 0, 1);
quick[244] = new Token(Type.false, false, 1);
quick[245] = new Token(Type.true, true, 1);
quick[246] = new Token(Type.null, null, 1);
function quickEncodeToken(token) {
  switch (token.type) {
    case Type.false:
      return fromArray([244]);
    case Type.true:
      return fromArray([245]);
    case Type.null:
      return fromArray([246]);
    case Type.bytes:
      if (!token.value.length) {
        return fromArray([64]);
      }
      return;
    case Type.string:
      if (token.value === "") {
        return fromArray([96]);
      }
      return;
    case Type.array:
      if (token.value === 0) {
        return fromArray([128]);
      }
      return;
    case Type.map:
      if (token.value === 0) {
        return fromArray([160]);
      }
      return;
    case Type.uint:
      if (token.value < 24) {
        return fromArray([Number(token.value)]);
      }
      return;
    case Type.negint:
      if (token.value >= -24) {
        return fromArray([31 - Number(token.value)]);
      }
  }
}

// node_modules/cborg/esm/lib/encode.js
var defaultEncodeOptions = {
  float64: false,
  mapSorter,
  quickEncodeToken
};
function makeCborEncoders() {
  const encoders = [];
  encoders[Type.uint.major] = encodeUint;
  encoders[Type.negint.major] = encodeNegint;
  encoders[Type.bytes.major] = encodeBytes;
  encoders[Type.string.major] = encodeString;
  encoders[Type.array.major] = encodeArray;
  encoders[Type.map.major] = encodeMap;
  encoders[Type.tag.major] = encodeTag;
  encoders[Type.float.major] = encodeFloat;
  return encoders;
}
var cborEncoders = makeCborEncoders();
var buf = new Bl();
var Ref = class _Ref {
  constructor(obj, parent) {
    this.obj = obj;
    this.parent = parent;
  }
  includes(obj) {
    let p = this;
    do {
      if (p.obj === obj) {
        return true;
      }
    } while (p = p.parent);
    return false;
  }
  static createCheck(stack, obj) {
    if (stack && stack.includes(obj)) {
      throw new Error(`${encodeErrPrefix} object contains circular references`);
    }
    return new _Ref(obj, stack);
  }
};
var simpleTokens = {
  null: new Token(Type.null, null),
  undefined: new Token(Type.undefined, void 0),
  true: new Token(Type.true, true),
  false: new Token(Type.false, false),
  emptyArray: new Token(Type.array, 0),
  emptyMap: new Token(Type.map, 0)
};
var typeEncoders = {
  number(obj, _typ, _options, _refStack) {
    if (!Number.isInteger(obj) || !Number.isSafeInteger(obj)) {
      return new Token(Type.float, obj);
    } else if (obj >= 0) {
      return new Token(Type.uint, obj);
    } else {
      return new Token(Type.negint, obj);
    }
  },
  bigint(obj, _typ, _options, _refStack) {
    if (obj >= BigInt(0)) {
      return new Token(Type.uint, obj);
    } else {
      return new Token(Type.negint, obj);
    }
  },
  Uint8Array(obj, _typ, _options, _refStack) {
    return new Token(Type.bytes, obj);
  },
  string(obj, _typ, _options, _refStack) {
    return new Token(Type.string, obj);
  },
  boolean(obj, _typ, _options, _refStack) {
    return obj ? simpleTokens.true : simpleTokens.false;
  },
  null(_obj, _typ, _options, _refStack) {
    return simpleTokens.null;
  },
  undefined(_obj, _typ, _options, _refStack) {
    return simpleTokens.undefined;
  },
  ArrayBuffer(obj, _typ, _options, _refStack) {
    return new Token(Type.bytes, new Uint8Array(obj));
  },
  DataView(obj, _typ, _options, _refStack) {
    return new Token(Type.bytes, new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength));
  },
  Array(obj, _typ, options, refStack) {
    if (!obj.length) {
      if (options.addBreakTokens === true) {
        return [
          simpleTokens.emptyArray,
          new Token(Type.break)
        ];
      }
      return simpleTokens.emptyArray;
    }
    refStack = Ref.createCheck(refStack, obj);
    const entries = [];
    let i = 0;
    for (const e of obj) {
      entries[i++] = objectToTokens(e, options, refStack);
    }
    if (options.addBreakTokens) {
      return [
        new Token(Type.array, obj.length),
        entries,
        new Token(Type.break)
      ];
    }
    return [
      new Token(Type.array, obj.length),
      entries
    ];
  },
  Object(obj, typ, options, refStack) {
    const isMap = typ !== "Object";
    const keys = isMap ? obj.keys() : Object.keys(obj);
    const length2 = isMap ? obj.size : keys.length;
    if (!length2) {
      if (options.addBreakTokens === true) {
        return [
          simpleTokens.emptyMap,
          new Token(Type.break)
        ];
      }
      return simpleTokens.emptyMap;
    }
    refStack = Ref.createCheck(refStack, obj);
    const entries = [];
    let i = 0;
    for (const key of keys) {
      entries[i++] = [
        objectToTokens(key, options, refStack),
        objectToTokens(isMap ? obj.get(key) : obj[key], options, refStack)
      ];
    }
    sortMapEntries(entries, options);
    if (options.addBreakTokens) {
      return [
        new Token(Type.map, length2),
        entries,
        new Token(Type.break)
      ];
    }
    return [
      new Token(Type.map, length2),
      entries
    ];
  }
};
typeEncoders.Map = typeEncoders.Object;
typeEncoders.Buffer = typeEncoders.Uint8Array;
for (const typ of "Uint8Clamped Uint16 Uint32 Int8 Int16 Int32 BigUint64 BigInt64 Float32 Float64".split(" ")) {
  typeEncoders[`${typ}Array`] = typeEncoders.DataView;
}
function objectToTokens(obj, options = {}, refStack) {
  const typ = is(obj);
  const customTypeEncoder = options && options.typeEncoders && options.typeEncoders[typ] || typeEncoders[typ];
  if (typeof customTypeEncoder === "function") {
    const tokens = customTypeEncoder(obj, typ, options, refStack);
    if (tokens != null) {
      return tokens;
    }
  }
  const typeEncoder = typeEncoders[typ];
  if (!typeEncoder) {
    throw new Error(`${encodeErrPrefix} unsupported type: ${typ}`);
  }
  return typeEncoder(obj, typ, options, refStack);
}
function sortMapEntries(entries, options) {
  if (options.mapSorter) {
    entries.sort(options.mapSorter);
  }
}
function mapSorter(e1, e2) {
  const keyToken1 = Array.isArray(e1[0]) ? e1[0][0] : e1[0];
  const keyToken2 = Array.isArray(e2[0]) ? e2[0][0] : e2[0];
  if (keyToken1.type !== keyToken2.type) {
    return keyToken1.type.compare(keyToken2.type);
  }
  const major = keyToken1.type.major;
  const tcmp = cborEncoders[major].compareTokens(keyToken1, keyToken2);
  if (tcmp === 0) {
    console.warn("WARNING: complex key types used, CBOR key sorting guarantees are gone");
  }
  return tcmp;
}
function tokensToEncoded(buf2, tokens, encoders, options) {
  if (Array.isArray(tokens)) {
    for (const token of tokens) {
      tokensToEncoded(buf2, token, encoders, options);
    }
  } else {
    encoders[tokens.type.major](buf2, tokens, options);
  }
}
function encodeCustom(data, encoders, options) {
  const tokens = objectToTokens(data, options);
  if (!Array.isArray(tokens) && options.quickEncodeToken) {
    const quickBytes = options.quickEncodeToken(tokens);
    if (quickBytes) {
      return quickBytes;
    }
    const encoder = encoders[tokens.type.major];
    if (encoder.encodedSize) {
      const size = encoder.encodedSize(tokens, options);
      const buf2 = new Bl(size);
      encoder(buf2, tokens, options);
      if (buf2.chunks.length !== 1) {
        throw new Error(`Unexpected error: pre-calculated length for ${tokens} was wrong`);
      }
      return asU8A(buf2.chunks[0]);
    }
  }
  buf.reset();
  tokensToEncoded(buf, tokens, encoders, options);
  return buf.toBytes(true);
}
function encode3(data, options) {
  options = Object.assign({}, defaultEncodeOptions, options);
  return encodeCustom(data, cborEncoders, options);
}

// node_modules/cborg/esm/lib/decode.js
var defaultDecodeOptions = {
  strict: false,
  allowIndefinite: true,
  allowUndefined: true,
  allowBigInt: true
};
var Tokeniser = class {
  constructor(data, options = {}) {
    this.pos = 0;
    this.data = data;
    this.options = options;
  }
  done() {
    return this.pos >= this.data.length;
  }
  next() {
    const byt = this.data[this.pos];
    let token = quick[byt];
    if (token === void 0) {
      const decoder = jump[byt];
      if (!decoder) {
        throw new Error(`${decodeErrPrefix} no decoder for major type ${byt >>> 5} (byte 0x${byt.toString(16).padStart(2, "0")})`);
      }
      const minor = byt & 31;
      token = decoder(this.data, this.pos, minor, this.options);
    }
    this.pos += token.encodedLength;
    return token;
  }
};
var DONE = Symbol.for("DONE");
var BREAK = Symbol.for("BREAK");
function tokenToArray(token, tokeniser, options) {
  const arr = [];
  for (let i = 0; i < token.value; i++) {
    const value = tokensToObject(tokeniser, options);
    if (value === BREAK) {
      if (token.value === Infinity) {
        break;
      }
      throw new Error(`${decodeErrPrefix} got unexpected break to lengthed array`);
    }
    if (value === DONE) {
      throw new Error(`${decodeErrPrefix} found array but not enough entries (got ${i}, expected ${token.value})`);
    }
    arr[i] = value;
  }
  return arr;
}
function tokenToMap(token, tokeniser, options) {
  const useMaps = options.useMaps === true;
  const obj = useMaps ? void 0 : {};
  const m = useMaps ? /* @__PURE__ */ new Map() : void 0;
  for (let i = 0; i < token.value; i++) {
    const key = tokensToObject(tokeniser, options);
    if (key === BREAK) {
      if (token.value === Infinity) {
        break;
      }
      throw new Error(`${decodeErrPrefix} got unexpected break to lengthed map`);
    }
    if (key === DONE) {
      throw new Error(`${decodeErrPrefix} found map but not enough entries (got ${i} [no key], expected ${token.value})`);
    }
    if (useMaps !== true && typeof key !== "string") {
      throw new Error(`${decodeErrPrefix} non-string keys not supported (got ${typeof key})`);
    }
    if (options.rejectDuplicateMapKeys === true) {
      if (useMaps && m.has(key) || !useMaps && key in obj) {
        throw new Error(`${decodeErrPrefix} found repeat map key "${key}"`);
      }
    }
    const value = tokensToObject(tokeniser, options);
    if (value === DONE) {
      throw new Error(`${decodeErrPrefix} found map but not enough entries (got ${i} [no value], expected ${token.value})`);
    }
    if (useMaps) {
      m.set(key, value);
    } else {
      obj[key] = value;
    }
  }
  return useMaps ? m : obj;
}
function tokensToObject(tokeniser, options) {
  if (tokeniser.done()) {
    return DONE;
  }
  const token = tokeniser.next();
  if (token.type === Type.break) {
    return BREAK;
  }
  if (token.type.terminal) {
    return token.value;
  }
  if (token.type === Type.array) {
    return tokenToArray(token, tokeniser, options);
  }
  if (token.type === Type.map) {
    return tokenToMap(token, tokeniser, options);
  }
  if (token.type === Type.tag) {
    if (options.tags && typeof options.tags[token.value] === "function") {
      const tagged = tokensToObject(tokeniser, options);
      return options.tags[token.value](tagged);
    }
    throw new Error(`${decodeErrPrefix} tag not supported (${token.value})`);
  }
  throw new Error("unsupported");
}
function decode5(data, options) {
  if (!(data instanceof Uint8Array)) {
    throw new Error(`${decodeErrPrefix} data to decode must be a Uint8Array`);
  }
  options = Object.assign({}, defaultDecodeOptions, options);
  const tokeniser = options.tokenizer || new Tokeniser(data, options);
  const decoded = tokensToObject(tokeniser, options);
  if (decoded === DONE) {
    throw new Error(`${decodeErrPrefix} did not find any content to decode`);
  }
  if (decoded === BREAK) {
    throw new Error(`${decodeErrPrefix} got unexpected break`);
  }
  if (!tokeniser.done()) {
    throw new Error(`${decodeErrPrefix} too many terminals, data makes no sense`);
  }
  return decoded;
}

// node_modules/@ipld/dag-cbor/esm/index.js
init_cid();
var CID_CBOR_TAG = 42;
function cidEncoder(obj) {
  if (obj.asCID !== obj) {
    return null;
  }
  const cid = CID.asCID(obj);
  if (!cid) {
    return null;
  }
  const bytes = new Uint8Array(cid.bytes.byteLength + 1);
  bytes.set(cid.bytes, 1);
  return [
    new Token(Type.tag, CID_CBOR_TAG),
    new Token(Type.bytes, bytes)
  ];
}
function undefinedEncoder() {
  throw new Error("`undefined` is not supported by the IPLD Data Model and cannot be encoded");
}
function numberEncoder(num) {
  if (Number.isNaN(num)) {
    throw new Error("`NaN` is not supported by the IPLD Data Model and cannot be encoded");
  }
  if (num === Infinity || num === -Infinity) {
    throw new Error("`Infinity` and `-Infinity` is not supported by the IPLD Data Model and cannot be encoded");
  }
  return null;
}
var encodeOptions = {
  float64: true,
  typeEncoders: {
    Object: cidEncoder,
    undefined: undefinedEncoder,
    number: numberEncoder
  }
};
function cidDecoder(bytes) {
  if (bytes[0] !== 0) {
    throw new Error("Invalid CID for CBOR tag 42; expected leading 0x00");
  }
  return CID.decode(bytes.subarray(1));
}
var decodeOptions = {
  allowIndefinite: false,
  coerceUndefinedToNull: true,
  allowNaN: false,
  allowInfinity: false,
  allowBigInt: true,
  strict: true,
  useMaps: false,
  tags: []
};
decodeOptions.tags[CID_CBOR_TAG] = cidDecoder;
var code = 113;
var encode4 = (node) => encode3(node, encodeOptions);
var decode6 = (data) => decode5(data, decodeOptions);

// node_modules/@ipld/car/esm/lib/decoder.js
var CIDV0_BYTES = {
  SHA2_256: 18,
  LENGTH: 32,
  DAG_PB: 112
};
async function readVarint(reader) {
  const bytes = await reader.upTo(8);
  const i = import_varint2.default.decode(bytes);
  reader.seek(import_varint2.default.decode.bytes);
  return i;
}
async function readHeader(reader) {
  const length2 = await readVarint(reader);
  if (length2 === 0) {
    throw new Error("Invalid CAR header (zero length)");
  }
  const header = await reader.exactly(length2);
  reader.seek(length2);
  const block = decode6(header);
  if (block == null || Array.isArray(block) || typeof block !== "object") {
    throw new Error("Invalid CAR header format");
  }
  if (block.version !== 1) {
    if (typeof block.version === "string") {
      throw new Error(`Invalid CAR version: "${block.version}"`);
    }
    throw new Error(`Invalid CAR version: ${block.version}`);
  }
  if (!Array.isArray(block.roots)) {
    throw new Error("Invalid CAR header format");
  }
  if (Object.keys(block).filter((p) => p !== "roots" && p !== "version").length) {
    throw new Error("Invalid CAR header format");
  }
  return block;
}
async function readMultihash(reader) {
  const bytes = await reader.upTo(8);
  import_varint2.default.decode(bytes);
  const codeLength = import_varint2.default.decode.bytes;
  const length2 = import_varint2.default.decode(bytes.subarray(import_varint2.default.decode.bytes));
  const lengthLength = import_varint2.default.decode.bytes;
  const mhLength = codeLength + lengthLength + length2;
  const multihash = await reader.exactly(mhLength);
  reader.seek(mhLength);
  return multihash;
}
async function readCid(reader) {
  const first = await reader.exactly(2);
  if (first[0] === CIDV0_BYTES.SHA2_256 && first[1] === CIDV0_BYTES.LENGTH) {
    const bytes2 = await reader.exactly(34);
    reader.seek(34);
    const multihash2 = decode3(bytes2);
    return CID.create(0, CIDV0_BYTES.DAG_PB, multihash2);
  }
  const version2 = await readVarint(reader);
  if (version2 !== 1) {
    throw new Error(`Unexpected CID version (${version2})`);
  }
  const codec = await readVarint(reader);
  const bytes = await readMultihash(reader);
  const multihash = decode3(bytes);
  return CID.create(version2, codec, multihash);
}
async function readBlockHead(reader) {
  const start = reader.pos;
  let length2 = await readVarint(reader);
  if (length2 === 0) {
    throw new Error("Invalid CAR section (zero length)");
  }
  length2 += reader.pos - start;
  const cid = await readCid(reader);
  const blockLength = length2 - (reader.pos - start);
  return {
    cid,
    length: length2,
    blockLength
  };
}
async function readBlock(reader) {
  const { cid, blockLength } = await readBlockHead(reader);
  const bytes = await reader.exactly(blockLength);
  reader.seek(blockLength);
  return {
    bytes,
    cid
  };
}
async function readBlockIndex(reader) {
  const offset = reader.pos;
  const { cid, length: length2, blockLength } = await readBlockHead(reader);
  const index = {
    cid,
    length: length2,
    blockLength,
    offset,
    blockOffset: reader.pos
  };
  reader.seek(index.blockLength);
  return index;
}
function createDecoder(reader) {
  const headerPromise = readHeader(reader);
  return {
    header: () => headerPromise,
    async *blocks() {
      await headerPromise;
      while ((await reader.upTo(8)).length > 0) {
        yield await readBlock(reader);
      }
    },
    async *blocksIndex() {
      await headerPromise;
      while ((await reader.upTo(8)).length > 0) {
        yield await readBlockIndex(reader);
      }
    }
  };
}
function bytesReader(bytes) {
  let pos = 0;
  return {
    async upTo(length2) {
      return bytes.subarray(pos, pos + Math.min(length2, bytes.length - pos));
    },
    async exactly(length2) {
      if (length2 > bytes.length - pos) {
        throw new Error("Unexpected end of data");
      }
      return bytes.subarray(pos, pos + length2);
    },
    seek(length2) {
      pos += length2;
    },
    get pos() {
      return pos;
    }
  };
}
function chunkReader(readChunk) {
  let pos = 0;
  let have = 0;
  let offset = 0;
  let currentChunk = new Uint8Array(0);
  const read2 = async (length2) => {
    have = currentChunk.length - offset;
    const bufa = [currentChunk.subarray(offset)];
    while (have < length2) {
      const chunk = await readChunk();
      if (chunk == null) {
        break;
      }
      if (have < 0) {
        if (chunk.length > have) {
          bufa.push(chunk.subarray(-have));
        }
      } else {
        bufa.push(chunk);
      }
      have += chunk.length;
    }
    currentChunk = new Uint8Array(bufa.reduce((p, c) => p + c.length, 0));
    let off = 0;
    for (const b of bufa) {
      currentChunk.set(b, off);
      off += b.length;
    }
    offset = 0;
  };
  return {
    async upTo(length2) {
      if (currentChunk.length - offset < length2) {
        await read2(length2);
      }
      return currentChunk.subarray(offset, offset + Math.min(currentChunk.length - offset, length2));
    },
    async exactly(length2) {
      if (currentChunk.length - offset < length2) {
        await read2(length2);
      }
      if (currentChunk.length - offset < length2) {
        throw new Error("Unexpected end of data");
      }
      return currentChunk.subarray(offset, offset + length2);
    },
    seek(length2) {
      pos += length2;
      offset += length2;
    },
    get pos() {
      return pos;
    }
  };
}
function asyncIterableReader(asyncIterable) {
  const iterator = asyncIterable[Symbol.asyncIterator]();
  async function readChunk() {
    const next = await iterator.next();
    if (next.done) {
      return null;
    }
    return next.value;
  }
  return chunkReader(readChunk);
}

// node_modules/@ipld/car/esm/lib/reader-browser.js
var CarReader = class {
  constructor(version2, roots, blocks) {
    this._version = version2;
    this._roots = roots;
    this._blocks = blocks;
    this._keys = blocks.map((b) => b.cid.toString());
  }
  get version() {
    return this._version;
  }
  async getRoots() {
    return this._roots;
  }
  async has(key) {
    return this._keys.indexOf(key.toString()) > -1;
  }
  async get(key) {
    const index = this._keys.indexOf(key.toString());
    return index > -1 ? this._blocks[index] : void 0;
  }
  async *blocks() {
    for (const block of this._blocks) {
      yield block;
    }
  }
  async *cids() {
    for (const block of this._blocks) {
      yield block.cid;
    }
  }
  static async fromBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("fromBytes() requires a Uint8Array");
    }
    return decodeReaderComplete(bytesReader(bytes));
  }
  static async fromIterable(asyncIterable) {
    if (!asyncIterable || !(typeof asyncIterable[Symbol.asyncIterator] === "function")) {
      throw new TypeError("fromIterable() requires an async iterable");
    }
    return decodeReaderComplete(asyncIterableReader(asyncIterable));
  }
};
async function decodeReaderComplete(reader) {
  const decoder = createDecoder(reader);
  const { version: version2, roots } = await decoder.header();
  const blocks = [];
  for await (const block of decoder.blocks()) {
    blocks.push(block);
  }
  return new CarReader(version2, roots, blocks);
}

// node_modules/@ipld/car/esm/lib/iterator.js
var CarIteratorBase = class {
  constructor(version2, roots, iterable) {
    this._version = version2;
    this._roots = roots;
    this._iterable = iterable;
    this._decoded = false;
  }
  get version() {
    return this._version;
  }
  async getRoots() {
    return this._roots;
  }
};
var CarBlockIterator = class _CarBlockIterator extends CarIteratorBase {
  [Symbol.asyncIterator]() {
    if (this._decoded) {
      throw new Error("Cannot decode more than once");
    }
    if (!this._iterable) {
      throw new Error("Block iterable not found");
    }
    this._decoded = true;
    return this._iterable[Symbol.asyncIterator]();
  }
  static async fromBytes(bytes) {
    const { version: version2, roots, iterator } = await fromBytes(bytes);
    return new _CarBlockIterator(version2, roots, iterator);
  }
  static async fromIterable(asyncIterable) {
    const { version: version2, roots, iterator } = await fromIterable(asyncIterable);
    return new _CarBlockIterator(version2, roots, iterator);
  }
};
async function fromBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("fromBytes() requires a Uint8Array");
  }
  return decodeIterator(bytesReader(bytes));
}
async function fromIterable(asyncIterable) {
  if (!asyncIterable || !(typeof asyncIterable[Symbol.asyncIterator] === "function")) {
    throw new TypeError("fromIterable() requires an async iterable");
  }
  return decodeIterator(asyncIterableReader(asyncIterable));
}
async function decodeIterator(reader) {
  const decoder = createDecoder(reader);
  const { version: version2, roots } = await decoder.header();
  return {
    version: version2,
    roots,
    iterator: decoder.blocks()
  };
}

// node_modules/@ipld/car/esm/lib/writer-browser.js
init_cid();

// node_modules/@ipld/car/esm/lib/encoder.js
var import_varint3 = __toESM(require_varint(), 1);
function createHeader(roots) {
  const headerBytes = encode4({
    version: 1,
    roots
  });
  const varintBytes = import_varint3.default.encode(headerBytes.length);
  const header = new Uint8Array(varintBytes.length + headerBytes.length);
  header.set(varintBytes, 0);
  header.set(headerBytes, varintBytes.length);
  return header;
}
function createEncoder(writer) {
  return {
    async setRoots(roots) {
      const bytes = createHeader(roots);
      await writer.write(bytes);
    },
    async writeBlock(block) {
      const { cid, bytes } = block;
      await writer.write(new Uint8Array(import_varint3.default.encode(cid.bytes.length + bytes.length)));
      await writer.write(cid.bytes);
      if (bytes.length) {
        await writer.write(bytes);
      }
    },
    async close() {
      return writer.end();
    }
  };
}

// node_modules/@ipld/car/esm/lib/iterator-channel.js
function noop() {
}
function create2() {
  const chunkQueue = [];
  let drainer = null;
  let drainerResolver = noop;
  let ended = false;
  let outWait = null;
  let outWaitResolver = noop;
  const makeDrainer = () => {
    if (!drainer) {
      drainer = new Promise((resolve5) => {
        drainerResolver = () => {
          drainer = null;
          drainerResolver = noop;
          resolve5();
        };
      });
    }
    return drainer;
  };
  const writer = {
    write(chunk) {
      chunkQueue.push(chunk);
      const drainer2 = makeDrainer();
      outWaitResolver();
      return drainer2;
    },
    async end() {
      ended = true;
      const drainer2 = makeDrainer();
      outWaitResolver();
      return drainer2;
    }
  };
  const iterator = {
    async next() {
      const chunk = chunkQueue.shift();
      if (chunk) {
        if (chunkQueue.length === 0) {
          drainerResolver();
        }
        return {
          done: false,
          value: chunk
        };
      }
      if (ended) {
        drainerResolver();
        return {
          done: true,
          value: void 0
        };
      }
      if (!outWait) {
        outWait = new Promise((resolve5) => {
          outWaitResolver = () => {
            outWait = null;
            outWaitResolver = noop;
            return resolve5(iterator.next());
          };
        });
      }
      return outWait;
    }
  };
  return {
    writer,
    iterator
  };
}

// node_modules/@ipld/car/esm/lib/writer-browser.js
var CarWriter = class _CarWriter {
  constructor(roots, encoder) {
    this._encoder = encoder;
    this._mutex = encoder.setRoots(roots);
    this._ended = false;
  }
  async put(block) {
    if (!(block.bytes instanceof Uint8Array) || !block.cid) {
      throw new TypeError("Can only write {cid, bytes} objects");
    }
    if (this._ended) {
      throw new Error("Already closed");
    }
    const cid = CID.asCID(block.cid);
    if (!cid) {
      throw new TypeError("Can only write {cid, bytes} objects");
    }
    this._mutex = this._mutex.then(() => this._encoder.writeBlock({
      cid,
      bytes: block.bytes
    }));
    return this._mutex;
  }
  async close() {
    if (this._ended) {
      throw new Error("Already closed");
    }
    await this._mutex;
    this._ended = true;
    return this._encoder.close();
  }
  static create(roots) {
    roots = toRoots(roots);
    const { encoder, iterator } = encodeWriter();
    const writer = new _CarWriter(roots, encoder);
    const out = new CarWriterOut(iterator);
    return {
      writer,
      out
    };
  }
  static createAppender() {
    const { encoder, iterator } = encodeWriter();
    encoder.setRoots = () => Promise.resolve();
    const writer = new _CarWriter([], encoder);
    const out = new CarWriterOut(iterator);
    return {
      writer,
      out
    };
  }
  static async updateRootsInBytes(bytes, roots) {
    const reader = bytesReader(bytes);
    await readHeader(reader);
    const newHeader = createHeader(roots);
    if (reader.pos !== newHeader.length) {
      throw new Error(`updateRoots() can only overwrite a header of the same length (old header is ${reader.pos} bytes, new header is ${newHeader.length} bytes)`);
    }
    bytes.set(newHeader, 0);
    return bytes;
  }
};
var CarWriterOut = class {
  constructor(iterator) {
    this._iterator = iterator;
  }
  [Symbol.asyncIterator]() {
    if (this._iterating) {
      throw new Error("Multiple iterator not supported");
    }
    this._iterating = true;
    return this._iterator;
  }
};
function encodeWriter() {
  const iw = create2();
  const { writer, iterator } = iw;
  const encoder = createEncoder(writer);
  return {
    encoder,
    iterator
  };
}
function toRoots(roots) {
  if (roots === void 0) {
    return [];
  }
  if (!Array.isArray(roots)) {
    const cid = CID.asCID(roots);
    if (!cid) {
      throw new TypeError("roots must be a single CID or an array of CIDs");
    }
    return [cid];
  }
  const _roots = [];
  for (const root of roots) {
    const _root = CID.asCID(root);
    if (!_root) {
      throw new TypeError("roots must be a single CID or an array of CIDs");
    }
    _roots.push(_root);
  }
  return _roots;
}

// node_modules/ipfs-unixfs-importer/esm/src/index.js
var import_it_parallel_batch2 = __toESM(require_it_parallel_batch());

// node_modules/merge-options/index.mjs
var import_index = __toESM(require_merge_options(), 1);
var merge_options_default = import_index.default;

// node_modules/ipfs-unixfs-importer/esm/src/options.js
init_sha2_browser();

// node_modules/@multiformats/murmur3/esm/index.js
init_hasher();
init_src();
var import_murmurhash3js_revisited = __toESM(require_murmurhash3js_revisited());
function fromNumberTo32BitBuf(number) {
  const bytes = new Array(4);
  for (let i = 0; i < 4; i++) {
    bytes[i] = number & 255;
    number = number >> 8;
  }
  return new Uint8Array(bytes);
}
var murmur332 = from2({
  name: "murmur3-32",
  code: 35,
  encode: (input) => fromNumberTo32BitBuf(import_murmurhash3js_revisited.default.x86.hash32(input))
});
var murmur3128 = from2({
  name: "murmur3-128",
  code: 34,
  encode: (input) => bytes_exports.fromHex(import_murmurhash3js_revisited.default.x64.hash128(input))
});

// node_modules/ipfs-unixfs-importer/esm/src/options.js
async function hamtHashFn(buf2) {
  return (await murmur3128.encode(buf2)).slice(0, 8).reverse();
}
var defaultOptions = {
  chunker: "fixed",
  strategy: "balanced",
  rawLeaves: false,
  onlyHash: false,
  reduceSingleLeafToSelf: true,
  hasher: sha256,
  leafType: "file",
  cidVersion: 0,
  progress: () => () => {
  },
  shardSplitThreshold: 1e3,
  fileImportConcurrency: 50,
  blockWriteConcurrency: 10,
  minChunkSize: 262144,
  maxChunkSize: 262144,
  avgChunkSize: 262144,
  window: 16,
  polynomial: 17437180132763652,
  maxChildrenPerNode: 174,
  layerRepeat: 4,
  wrapWithDirectory: false,
  recursive: false,
  hidden: false,
  timeout: void 0,
  hamtHashFn,
  hamtHashCode: 34,
  hamtBucketBits: 8
};
var options_default = (options = {}) => {
  const defaults = merge_options_default.bind({ ignoreUndefined: true });
  return defaults(defaultOptions, options);
};

// node_modules/ipfs-unixfs/esm/src/index.js
var import_err_code = __toESM(require_err_code());

// node_modules/ipfs-unixfs/esm/src/unixfs.js
var import_minimal = __toESM(require_minimal2(), 1);
var $Reader = import_minimal.default.Reader;
var $Writer = import_minimal.default.Writer;
var $util = import_minimal.default.util;
var $root = import_minimal.default.roots["ipfs-unixfs"] || (import_minimal.default.roots["ipfs-unixfs"] = {});
var Data = $root.Data = (() => {
  function Data2(p) {
    this.blocksizes = [];
    if (p) {
      for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
        if (p[ks[i]] != null)
          this[ks[i]] = p[ks[i]];
    }
  }
  Data2.prototype.Type = 0;
  Data2.prototype.Data = $util.newBuffer([]);
  Data2.prototype.filesize = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;
  Data2.prototype.blocksizes = $util.emptyArray;
  Data2.prototype.hashType = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;
  Data2.prototype.fanout = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;
  Data2.prototype.mode = 0;
  Data2.prototype.mtime = null;
  Data2.encode = function encode10(m, w) {
    if (!w)
      w = $Writer.create();
    w.uint32(8).int32(m.Type);
    if (m.Data != null && Object.hasOwnProperty.call(m, "Data"))
      w.uint32(18).bytes(m.Data);
    if (m.filesize != null && Object.hasOwnProperty.call(m, "filesize"))
      w.uint32(24).uint64(m.filesize);
    if (m.blocksizes != null && m.blocksizes.length) {
      for (var i = 0; i < m.blocksizes.length; ++i)
        w.uint32(32).uint64(m.blocksizes[i]);
    }
    if (m.hashType != null && Object.hasOwnProperty.call(m, "hashType"))
      w.uint32(40).uint64(m.hashType);
    if (m.fanout != null && Object.hasOwnProperty.call(m, "fanout"))
      w.uint32(48).uint64(m.fanout);
    if (m.mode != null && Object.hasOwnProperty.call(m, "mode"))
      w.uint32(56).uint32(m.mode);
    if (m.mtime != null && Object.hasOwnProperty.call(m, "mtime"))
      $root.UnixTime.encode(m.mtime, w.uint32(66).fork()).ldelim();
    return w;
  };
  Data2.decode = function decode11(r, l) {
    if (!(r instanceof $Reader))
      r = $Reader.create(r);
    var c = l === void 0 ? r.len : r.pos + l, m = new $root.Data();
    while (r.pos < c) {
      var t = r.uint32();
      switch (t >>> 3) {
        case 1:
          m.Type = r.int32();
          break;
        case 2:
          m.Data = r.bytes();
          break;
        case 3:
          m.filesize = r.uint64();
          break;
        case 4:
          if (!(m.blocksizes && m.blocksizes.length))
            m.blocksizes = [];
          if ((t & 7) === 2) {
            var c2 = r.uint32() + r.pos;
            while (r.pos < c2)
              m.blocksizes.push(r.uint64());
          } else
            m.blocksizes.push(r.uint64());
          break;
        case 5:
          m.hashType = r.uint64();
          break;
        case 6:
          m.fanout = r.uint64();
          break;
        case 7:
          m.mode = r.uint32();
          break;
        case 8:
          m.mtime = $root.UnixTime.decode(r, r.uint32());
          break;
        default:
          r.skipType(t & 7);
          break;
      }
    }
    if (!m.hasOwnProperty("Type"))
      throw $util.ProtocolError("missing required 'Type'", { instance: m });
    return m;
  };
  Data2.fromObject = function fromObject(d) {
    if (d instanceof $root.Data)
      return d;
    var m = new $root.Data();
    switch (d.Type) {
      case "Raw":
      case 0:
        m.Type = 0;
        break;
      case "Directory":
      case 1:
        m.Type = 1;
        break;
      case "File":
      case 2:
        m.Type = 2;
        break;
      case "Metadata":
      case 3:
        m.Type = 3;
        break;
      case "Symlink":
      case 4:
        m.Type = 4;
        break;
      case "HAMTShard":
      case 5:
        m.Type = 5;
        break;
    }
    if (d.Data != null) {
      if (typeof d.Data === "string")
        $util.base64.decode(d.Data, m.Data = $util.newBuffer($util.base64.length(d.Data)), 0);
      else if (d.Data.length)
        m.Data = d.Data;
    }
    if (d.filesize != null) {
      if ($util.Long)
        (m.filesize = $util.Long.fromValue(d.filesize)).unsigned = true;
      else if (typeof d.filesize === "string")
        m.filesize = parseInt(d.filesize, 10);
      else if (typeof d.filesize === "number")
        m.filesize = d.filesize;
      else if (typeof d.filesize === "object")
        m.filesize = new $util.LongBits(d.filesize.low >>> 0, d.filesize.high >>> 0).toNumber(true);
    }
    if (d.blocksizes) {
      if (!Array.isArray(d.blocksizes))
        throw TypeError(".Data.blocksizes: array expected");
      m.blocksizes = [];
      for (var i = 0; i < d.blocksizes.length; ++i) {
        if ($util.Long)
          (m.blocksizes[i] = $util.Long.fromValue(d.blocksizes[i])).unsigned = true;
        else if (typeof d.blocksizes[i] === "string")
          m.blocksizes[i] = parseInt(d.blocksizes[i], 10);
        else if (typeof d.blocksizes[i] === "number")
          m.blocksizes[i] = d.blocksizes[i];
        else if (typeof d.blocksizes[i] === "object")
          m.blocksizes[i] = new $util.LongBits(d.blocksizes[i].low >>> 0, d.blocksizes[i].high >>> 0).toNumber(true);
      }
    }
    if (d.hashType != null) {
      if ($util.Long)
        (m.hashType = $util.Long.fromValue(d.hashType)).unsigned = true;
      else if (typeof d.hashType === "string")
        m.hashType = parseInt(d.hashType, 10);
      else if (typeof d.hashType === "number")
        m.hashType = d.hashType;
      else if (typeof d.hashType === "object")
        m.hashType = new $util.LongBits(d.hashType.low >>> 0, d.hashType.high >>> 0).toNumber(true);
    }
    if (d.fanout != null) {
      if ($util.Long)
        (m.fanout = $util.Long.fromValue(d.fanout)).unsigned = true;
      else if (typeof d.fanout === "string")
        m.fanout = parseInt(d.fanout, 10);
      else if (typeof d.fanout === "number")
        m.fanout = d.fanout;
      else if (typeof d.fanout === "object")
        m.fanout = new $util.LongBits(d.fanout.low >>> 0, d.fanout.high >>> 0).toNumber(true);
    }
    if (d.mode != null) {
      m.mode = d.mode >>> 0;
    }
    if (d.mtime != null) {
      if (typeof d.mtime !== "object")
        throw TypeError(".Data.mtime: object expected");
      m.mtime = $root.UnixTime.fromObject(d.mtime);
    }
    return m;
  };
  Data2.toObject = function toObject(m, o) {
    if (!o)
      o = {};
    var d = {};
    if (o.arrays || o.defaults) {
      d.blocksizes = [];
    }
    if (o.defaults) {
      d.Type = o.enums === String ? "Raw" : 0;
      if (o.bytes === String)
        d.Data = "";
      else {
        d.Data = [];
        if (o.bytes !== Array)
          d.Data = $util.newBuffer(d.Data);
      }
      if ($util.Long) {
        var n = new $util.Long(0, 0, true);
        d.filesize = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
      } else
        d.filesize = o.longs === String ? "0" : 0;
      if ($util.Long) {
        var n = new $util.Long(0, 0, true);
        d.hashType = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
      } else
        d.hashType = o.longs === String ? "0" : 0;
      if ($util.Long) {
        var n = new $util.Long(0, 0, true);
        d.fanout = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
      } else
        d.fanout = o.longs === String ? "0" : 0;
      d.mode = 0;
      d.mtime = null;
    }
    if (m.Type != null && m.hasOwnProperty("Type")) {
      d.Type = o.enums === String ? $root.Data.DataType[m.Type] : m.Type;
    }
    if (m.Data != null && m.hasOwnProperty("Data")) {
      d.Data = o.bytes === String ? $util.base64.encode(m.Data, 0, m.Data.length) : o.bytes === Array ? Array.prototype.slice.call(m.Data) : m.Data;
    }
    if (m.filesize != null && m.hasOwnProperty("filesize")) {
      if (typeof m.filesize === "number")
        d.filesize = o.longs === String ? String(m.filesize) : m.filesize;
      else
        d.filesize = o.longs === String ? $util.Long.prototype.toString.call(m.filesize) : o.longs === Number ? new $util.LongBits(m.filesize.low >>> 0, m.filesize.high >>> 0).toNumber(true) : m.filesize;
    }
    if (m.blocksizes && m.blocksizes.length) {
      d.blocksizes = [];
      for (var j = 0; j < m.blocksizes.length; ++j) {
        if (typeof m.blocksizes[j] === "number")
          d.blocksizes[j] = o.longs === String ? String(m.blocksizes[j]) : m.blocksizes[j];
        else
          d.blocksizes[j] = o.longs === String ? $util.Long.prototype.toString.call(m.blocksizes[j]) : o.longs === Number ? new $util.LongBits(m.blocksizes[j].low >>> 0, m.blocksizes[j].high >>> 0).toNumber(true) : m.blocksizes[j];
      }
    }
    if (m.hashType != null && m.hasOwnProperty("hashType")) {
      if (typeof m.hashType === "number")
        d.hashType = o.longs === String ? String(m.hashType) : m.hashType;
      else
        d.hashType = o.longs === String ? $util.Long.prototype.toString.call(m.hashType) : o.longs === Number ? new $util.LongBits(m.hashType.low >>> 0, m.hashType.high >>> 0).toNumber(true) : m.hashType;
    }
    if (m.fanout != null && m.hasOwnProperty("fanout")) {
      if (typeof m.fanout === "number")
        d.fanout = o.longs === String ? String(m.fanout) : m.fanout;
      else
        d.fanout = o.longs === String ? $util.Long.prototype.toString.call(m.fanout) : o.longs === Number ? new $util.LongBits(m.fanout.low >>> 0, m.fanout.high >>> 0).toNumber(true) : m.fanout;
    }
    if (m.mode != null && m.hasOwnProperty("mode")) {
      d.mode = m.mode;
    }
    if (m.mtime != null && m.hasOwnProperty("mtime")) {
      d.mtime = $root.UnixTime.toObject(m.mtime, o);
    }
    return d;
  };
  Data2.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, import_minimal.default.util.toJSONOptions);
  };
  Data2.DataType = (function() {
    const valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "Raw"] = 0;
    values[valuesById[1] = "Directory"] = 1;
    values[valuesById[2] = "File"] = 2;
    values[valuesById[3] = "Metadata"] = 3;
    values[valuesById[4] = "Symlink"] = 4;
    values[valuesById[5] = "HAMTShard"] = 5;
    return values;
  })();
  return Data2;
})();
var UnixTime = $root.UnixTime = (() => {
  function UnixTime2(p) {
    if (p) {
      for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
        if (p[ks[i]] != null)
          this[ks[i]] = p[ks[i]];
    }
  }
  UnixTime2.prototype.Seconds = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;
  UnixTime2.prototype.FractionalNanoseconds = 0;
  UnixTime2.encode = function encode10(m, w) {
    if (!w)
      w = $Writer.create();
    w.uint32(8).int64(m.Seconds);
    if (m.FractionalNanoseconds != null && Object.hasOwnProperty.call(m, "FractionalNanoseconds"))
      w.uint32(21).fixed32(m.FractionalNanoseconds);
    return w;
  };
  UnixTime2.decode = function decode11(r, l) {
    if (!(r instanceof $Reader))
      r = $Reader.create(r);
    var c = l === void 0 ? r.len : r.pos + l, m = new $root.UnixTime();
    while (r.pos < c) {
      var t = r.uint32();
      switch (t >>> 3) {
        case 1:
          m.Seconds = r.int64();
          break;
        case 2:
          m.FractionalNanoseconds = r.fixed32();
          break;
        default:
          r.skipType(t & 7);
          break;
      }
    }
    if (!m.hasOwnProperty("Seconds"))
      throw $util.ProtocolError("missing required 'Seconds'", { instance: m });
    return m;
  };
  UnixTime2.fromObject = function fromObject(d) {
    if (d instanceof $root.UnixTime)
      return d;
    var m = new $root.UnixTime();
    if (d.Seconds != null) {
      if ($util.Long)
        (m.Seconds = $util.Long.fromValue(d.Seconds)).unsigned = false;
      else if (typeof d.Seconds === "string")
        m.Seconds = parseInt(d.Seconds, 10);
      else if (typeof d.Seconds === "number")
        m.Seconds = d.Seconds;
      else if (typeof d.Seconds === "object")
        m.Seconds = new $util.LongBits(d.Seconds.low >>> 0, d.Seconds.high >>> 0).toNumber();
    }
    if (d.FractionalNanoseconds != null) {
      m.FractionalNanoseconds = d.FractionalNanoseconds >>> 0;
    }
    return m;
  };
  UnixTime2.toObject = function toObject(m, o) {
    if (!o)
      o = {};
    var d = {};
    if (o.defaults) {
      if ($util.Long) {
        var n = new $util.Long(0, 0, false);
        d.Seconds = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
      } else
        d.Seconds = o.longs === String ? "0" : 0;
      d.FractionalNanoseconds = 0;
    }
    if (m.Seconds != null && m.hasOwnProperty("Seconds")) {
      if (typeof m.Seconds === "number")
        d.Seconds = o.longs === String ? String(m.Seconds) : m.Seconds;
      else
        d.Seconds = o.longs === String ? $util.Long.prototype.toString.call(m.Seconds) : o.longs === Number ? new $util.LongBits(m.Seconds.low >>> 0, m.Seconds.high >>> 0).toNumber() : m.Seconds;
    }
    if (m.FractionalNanoseconds != null && m.hasOwnProperty("FractionalNanoseconds")) {
      d.FractionalNanoseconds = m.FractionalNanoseconds;
    }
    return d;
  };
  UnixTime2.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, import_minimal.default.util.toJSONOptions);
  };
  return UnixTime2;
})();
var Metadata = $root.Metadata = (() => {
  function Metadata2(p) {
    if (p) {
      for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
        if (p[ks[i]] != null)
          this[ks[i]] = p[ks[i]];
    }
  }
  Metadata2.prototype.MimeType = "";
  Metadata2.encode = function encode10(m, w) {
    if (!w)
      w = $Writer.create();
    if (m.MimeType != null && Object.hasOwnProperty.call(m, "MimeType"))
      w.uint32(10).string(m.MimeType);
    return w;
  };
  Metadata2.decode = function decode11(r, l) {
    if (!(r instanceof $Reader))
      r = $Reader.create(r);
    var c = l === void 0 ? r.len : r.pos + l, m = new $root.Metadata();
    while (r.pos < c) {
      var t = r.uint32();
      switch (t >>> 3) {
        case 1:
          m.MimeType = r.string();
          break;
        default:
          r.skipType(t & 7);
          break;
      }
    }
    return m;
  };
  Metadata2.fromObject = function fromObject(d) {
    if (d instanceof $root.Metadata)
      return d;
    var m = new $root.Metadata();
    if (d.MimeType != null) {
      m.MimeType = String(d.MimeType);
    }
    return m;
  };
  Metadata2.toObject = function toObject(m, o) {
    if (!o)
      o = {};
    var d = {};
    if (o.defaults) {
      d.MimeType = "";
    }
    if (m.MimeType != null && m.hasOwnProperty("MimeType")) {
      d.MimeType = m.MimeType;
    }
    return d;
  };
  Metadata2.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, import_minimal.default.util.toJSONOptions);
  };
  return Metadata2;
})();

// node_modules/ipfs-unixfs/esm/src/index.js
var PBData = Data;
var types = [
  "raw",
  "directory",
  "file",
  "metadata",
  "symlink",
  "hamt-sharded-directory"
];
var dirTypes = [
  "directory",
  "hamt-sharded-directory"
];
var DEFAULT_FILE_MODE = parseInt("0644", 8);
var DEFAULT_DIRECTORY_MODE = parseInt("0755", 8);
function parseMode(mode) {
  if (mode == null) {
    return void 0;
  }
  if (typeof mode === "number") {
    return mode & 4095;
  }
  mode = mode.toString();
  if (mode.substring(0, 1) === "0") {
    return parseInt(mode, 8) & 4095;
  }
  return parseInt(mode, 10) & 4095;
}
function parseMtime(input) {
  if (input == null) {
    return void 0;
  }
  let mtime;
  if (input.secs != null) {
    mtime = {
      secs: input.secs,
      nsecs: input.nsecs
    };
  }
  if (input.Seconds != null) {
    mtime = {
      secs: input.Seconds,
      nsecs: input.FractionalNanoseconds
    };
  }
  if (Array.isArray(input)) {
    mtime = {
      secs: input[0],
      nsecs: input[1]
    };
  }
  if (input instanceof Date) {
    const ms = input.getTime();
    const secs = Math.floor(ms / 1e3);
    mtime = {
      secs,
      nsecs: (ms - secs * 1e3) * 1e3
    };
  }
  if (!Object.prototype.hasOwnProperty.call(mtime, "secs")) {
    return void 0;
  }
  if (mtime != null && mtime.nsecs != null && (mtime.nsecs < 0 || mtime.nsecs > 999999999)) {
    throw (0, import_err_code.default)(new Error("mtime-nsecs must be within the range [0,999999999]"), "ERR_INVALID_MTIME_NSECS");
  }
  return mtime;
}
var UnixFS = class _UnixFS {
  static unmarshal(marshaled) {
    const message = PBData.decode(marshaled);
    const decoded = PBData.toObject(message, {
      defaults: false,
      arrays: true,
      longs: Number,
      objects: false
    });
    const data = new _UnixFS({
      type: types[decoded.Type],
      data: decoded.Data,
      blockSizes: decoded.blocksizes,
      mode: decoded.mode,
      mtime: decoded.mtime ? {
        secs: decoded.mtime.Seconds,
        nsecs: decoded.mtime.FractionalNanoseconds
      } : void 0
    });
    data._originalMode = decoded.mode || 0;
    return data;
  }
  constructor(options = { type: "file" }) {
    const { type, data, blockSizes, hashType, fanout, mtime, mode } = options;
    if (type && !types.includes(type)) {
      throw (0, import_err_code.default)(new Error("Type: " + type + " is not valid"), "ERR_INVALID_TYPE");
    }
    this.type = type || "file";
    this.data = data;
    this.hashType = hashType;
    this.fanout = fanout;
    this.blockSizes = blockSizes || [];
    this._originalMode = 0;
    this.mode = parseMode(mode);
    if (mtime) {
      this.mtime = parseMtime(mtime);
      if (this.mtime && !this.mtime.nsecs) {
        this.mtime.nsecs = 0;
      }
    }
  }
  set mode(mode) {
    this._mode = this.isDirectory() ? DEFAULT_DIRECTORY_MODE : DEFAULT_FILE_MODE;
    const parsedMode = parseMode(mode);
    if (parsedMode !== void 0) {
      this._mode = parsedMode;
    }
  }
  get mode() {
    return this._mode;
  }
  isDirectory() {
    return Boolean(this.type && dirTypes.includes(this.type));
  }
  addBlockSize(size) {
    this.blockSizes.push(size);
  }
  removeBlockSize(index) {
    this.blockSizes.splice(index, 1);
  }
  fileSize() {
    if (this.isDirectory()) {
      return 0;
    }
    let sum = 0;
    this.blockSizes.forEach((size) => {
      sum += size;
    });
    if (this.data) {
      sum += this.data.length;
    }
    return sum;
  }
  marshal() {
    let type;
    switch (this.type) {
      case "raw":
        type = PBData.DataType.Raw;
        break;
      case "directory":
        type = PBData.DataType.Directory;
        break;
      case "file":
        type = PBData.DataType.File;
        break;
      case "metadata":
        type = PBData.DataType.Metadata;
        break;
      case "symlink":
        type = PBData.DataType.Symlink;
        break;
      case "hamt-sharded-directory":
        type = PBData.DataType.HAMTShard;
        break;
      default:
        throw (0, import_err_code.default)(new Error("Type: " + type + " is not valid"), "ERR_INVALID_TYPE");
    }
    let data = this.data;
    if (!this.data || !this.data.length) {
      data = void 0;
    }
    let mode;
    if (this.mode != null) {
      mode = this._originalMode & 4294963200 | (parseMode(this.mode) || 0);
      if (mode === DEFAULT_FILE_MODE && !this.isDirectory()) {
        mode = void 0;
      }
      if (mode === DEFAULT_DIRECTORY_MODE && this.isDirectory()) {
        mode = void 0;
      }
    }
    let mtime;
    if (this.mtime != null) {
      const parsed = parseMtime(this.mtime);
      if (parsed) {
        mtime = {
          Seconds: parsed.secs,
          FractionalNanoseconds: parsed.nsecs
        };
        if (mtime.FractionalNanoseconds === 0) {
          delete mtime.FractionalNanoseconds;
        }
      }
    }
    const pbData = {
      Type: type,
      Data: data,
      filesize: this.isDirectory() ? void 0 : this.fileSize(),
      blocksizes: this.blockSizes,
      hashType: this.hashType,
      fanout: this.fanout,
      mode,
      mtime
    };
    return PBData.encode(pbData).finish();
  }
};

// node_modules/ipfs-unixfs-importer/esm/src/utils/persist.js
init_cid();

// node_modules/@ipld/dag-pb/esm/src/index.js
var src_exports = {};
__export(src_exports, {
  code: () => code2,
  createLink: () => createLink,
  createNode: () => createNode,
  decode: () => decode7,
  encode: () => encode5,
  name: () => name,
  prepare: () => prepare,
  validate: () => validate
});
init_cid();

// node_modules/@ipld/dag-pb/esm/src/pb-decode.js
var textDecoder2 = new TextDecoder();
function decodeVarint(bytes, offset) {
  let v = 0;
  for (let shift = 0; ; shift += 7) {
    if (shift >= 64) {
      throw new Error("protobuf: varint overflow");
    }
    if (offset >= bytes.length) {
      throw new Error("protobuf: unexpected end of data");
    }
    const b = bytes[offset++];
    v += shift < 28 ? (b & 127) << shift : (b & 127) * 2 ** shift;
    if (b < 128) {
      break;
    }
  }
  return [
    v,
    offset
  ];
}
function decodeBytes(bytes, offset) {
  let byteLen;
  [byteLen, offset] = decodeVarint(bytes, offset);
  const postOffset = offset + byteLen;
  if (byteLen < 0 || postOffset < 0) {
    throw new Error("protobuf: invalid length");
  }
  if (postOffset > bytes.length) {
    throw new Error("protobuf: unexpected end of data");
  }
  return [
    bytes.subarray(offset, postOffset),
    postOffset
  ];
}
function decodeKey(bytes, index) {
  let wire;
  [wire, index] = decodeVarint(bytes, index);
  return [
    wire & 7,
    wire >> 3,
    index
  ];
}
function decodeLink(bytes) {
  const link = {};
  const l = bytes.length;
  let index = 0;
  while (index < l) {
    let wireType, fieldNum;
    [wireType, fieldNum, index] = decodeKey(bytes, index);
    if (fieldNum === 1) {
      if (link.Hash) {
        throw new Error("protobuf: (PBLink) duplicate Hash section");
      }
      if (wireType !== 2) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Hash`);
      }
      if (link.Name !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Name before Hash");
      }
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Tsize before Hash");
      }
      ;
      [link.Hash, index] = decodeBytes(bytes, index);
    } else if (fieldNum === 2) {
      if (link.Name !== void 0) {
        throw new Error("protobuf: (PBLink) duplicate Name section");
      }
      if (wireType !== 2) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Name`);
      }
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Tsize before Name");
      }
      let byts;
      [byts, index] = decodeBytes(bytes, index);
      link.Name = textDecoder2.decode(byts);
    } else if (fieldNum === 3) {
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) duplicate Tsize section");
      }
      if (wireType !== 0) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Tsize`);
      }
      ;
      [link.Tsize, index] = decodeVarint(bytes, index);
    } else {
      throw new Error(`protobuf: (PBLink) invalid fieldNumber, expected 1, 2 or 3, got ${fieldNum}`);
    }
  }
  if (index > l) {
    throw new Error("protobuf: (PBLink) unexpected end of data");
  }
  return link;
}
function decodeNode(bytes) {
  const l = bytes.length;
  let index = 0;
  let links2;
  let linksBeforeData = false;
  let data;
  while (index < l) {
    let wireType, fieldNum;
    [wireType, fieldNum, index] = decodeKey(bytes, index);
    if (wireType !== 2) {
      throw new Error(`protobuf: (PBNode) invalid wireType, expected 2, got ${wireType}`);
    }
    if (fieldNum === 1) {
      if (data) {
        throw new Error("protobuf: (PBNode) duplicate Data section");
      }
      ;
      [data, index] = decodeBytes(bytes, index);
      if (links2) {
        linksBeforeData = true;
      }
    } else if (fieldNum === 2) {
      if (linksBeforeData) {
        throw new Error("protobuf: (PBNode) duplicate Links section");
      } else if (!links2) {
        links2 = [];
      }
      let byts;
      [byts, index] = decodeBytes(bytes, index);
      links2.push(decodeLink(byts));
    } else {
      throw new Error(`protobuf: (PBNode) invalid fieldNumber, expected 1 or 2, got ${fieldNum}`);
    }
  }
  if (index > l) {
    throw new Error("protobuf: (PBNode) unexpected end of data");
  }
  const node = {};
  if (data) {
    node.Data = data;
  }
  node.Links = links2 || [];
  return node;
}

// node_modules/@ipld/dag-pb/esm/src/pb-encode.js
var textEncoder2 = new TextEncoder();
var maxInt32 = 2 ** 32;
var maxUInt32 = 2 ** 31;
function encodeLink(link, bytes) {
  let i = bytes.length;
  if (typeof link.Tsize === "number") {
    if (link.Tsize < 0) {
      throw new Error("Tsize cannot be negative");
    }
    if (!Number.isSafeInteger(link.Tsize)) {
      throw new Error("Tsize too large for encoding");
    }
    i = encodeVarint(bytes, i, link.Tsize) - 1;
    bytes[i] = 24;
  }
  if (typeof link.Name === "string") {
    const nameBytes = textEncoder2.encode(link.Name);
    i -= nameBytes.length;
    bytes.set(nameBytes, i);
    i = encodeVarint(bytes, i, nameBytes.length) - 1;
    bytes[i] = 18;
  }
  if (link.Hash) {
    i -= link.Hash.length;
    bytes.set(link.Hash, i);
    i = encodeVarint(bytes, i, link.Hash.length) - 1;
    bytes[i] = 10;
  }
  return bytes.length - i;
}
function encodeNode(node) {
  const size = sizeNode(node);
  const bytes = new Uint8Array(size);
  let i = size;
  if (node.Data) {
    i -= node.Data.length;
    bytes.set(node.Data, i);
    i = encodeVarint(bytes, i, node.Data.length) - 1;
    bytes[i] = 10;
  }
  if (node.Links) {
    for (let index = node.Links.length - 1; index >= 0; index--) {
      const size2 = encodeLink(node.Links[index], bytes.subarray(0, i));
      i -= size2;
      i = encodeVarint(bytes, i, size2) - 1;
      bytes[i] = 18;
    }
  }
  return bytes;
}
function sizeLink(link) {
  let n = 0;
  if (link.Hash) {
    const l = link.Hash.length;
    n += 1 + l + sov(l);
  }
  if (typeof link.Name === "string") {
    const l = textEncoder2.encode(link.Name).length;
    n += 1 + l + sov(l);
  }
  if (typeof link.Tsize === "number") {
    n += 1 + sov(link.Tsize);
  }
  return n;
}
function sizeNode(node) {
  let n = 0;
  if (node.Data) {
    const l = node.Data.length;
    n += 1 + l + sov(l);
  }
  if (node.Links) {
    for (const link of node.Links) {
      const l = sizeLink(link);
      n += 1 + l + sov(l);
    }
  }
  return n;
}
function encodeVarint(bytes, offset, v) {
  offset -= sov(v);
  const base3 = offset;
  while (v >= maxUInt32) {
    bytes[offset++] = v & 127 | 128;
    v /= 128;
  }
  while (v >= 128) {
    bytes[offset++] = v & 127 | 128;
    v >>>= 7;
  }
  bytes[offset] = v;
  return base3;
}
function sov(x) {
  if (x % 2 === 0) {
    x++;
  }
  return Math.floor((len64(x) + 6) / 7);
}
function len64(x) {
  let n = 0;
  if (x >= maxInt32) {
    x = Math.floor(x / maxInt32);
    n = 32;
  }
  if (x >= 1 << 16) {
    x >>>= 16;
    n += 16;
  }
  if (x >= 1 << 8) {
    x >>>= 8;
    n += 8;
  }
  return n + len8tab[x];
}
var len8tab = [
  0,
  1,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  7,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8,
  8
];

// node_modules/@ipld/dag-pb/esm/src/util.js
init_cid();
var pbNodeProperties = [
  "Data",
  "Links"
];
var pbLinkProperties = [
  "Hash",
  "Name",
  "Tsize"
];
var textEncoder3 = new TextEncoder();
function linkComparator(a, b) {
  if (a === b) {
    return 0;
  }
  const abuf = a.Name ? textEncoder3.encode(a.Name) : [];
  const bbuf = b.Name ? textEncoder3.encode(b.Name) : [];
  let x = abuf.length;
  let y = bbuf.length;
  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (abuf[i] !== bbuf[i]) {
      x = abuf[i];
      y = bbuf[i];
      break;
    }
  }
  return x < y ? -1 : y < x ? 1 : 0;
}
function hasOnlyProperties(node, properties) {
  return !Object.keys(node).some((p) => !properties.includes(p));
}
function asLink(link) {
  if (typeof link.asCID === "object") {
    const Hash = CID.asCID(link);
    if (!Hash) {
      throw new TypeError("Invalid DAG-PB form");
    }
    return { Hash };
  }
  if (typeof link !== "object" || Array.isArray(link)) {
    throw new TypeError("Invalid DAG-PB form");
  }
  const pbl = {};
  if (link.Hash) {
    let cid = CID.asCID(link.Hash);
    try {
      if (!cid) {
        if (typeof link.Hash === "string") {
          cid = CID.parse(link.Hash);
        } else if (link.Hash instanceof Uint8Array) {
          cid = CID.decode(link.Hash);
        }
      }
    } catch (e) {
      throw new TypeError(`Invalid DAG-PB form: ${e.message}`);
    }
    if (cid) {
      pbl.Hash = cid;
    }
  }
  if (!pbl.Hash) {
    throw new TypeError("Invalid DAG-PB form");
  }
  if (typeof link.Name === "string") {
    pbl.Name = link.Name;
  }
  if (typeof link.Tsize === "number") {
    pbl.Tsize = link.Tsize;
  }
  return pbl;
}
function prepare(node) {
  if (node instanceof Uint8Array || typeof node === "string") {
    node = { Data: node };
  }
  if (typeof node !== "object" || Array.isArray(node)) {
    throw new TypeError("Invalid DAG-PB form");
  }
  const pbn = {};
  if (node.Data !== void 0) {
    if (typeof node.Data === "string") {
      pbn.Data = textEncoder3.encode(node.Data);
    } else if (node.Data instanceof Uint8Array) {
      pbn.Data = node.Data;
    } else {
      throw new TypeError("Invalid DAG-PB form");
    }
  }
  if (node.Links !== void 0) {
    if (Array.isArray(node.Links)) {
      pbn.Links = node.Links.map(asLink);
      pbn.Links.sort(linkComparator);
    } else {
      throw new TypeError("Invalid DAG-PB form");
    }
  } else {
    pbn.Links = [];
  }
  return pbn;
}
function validate(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new TypeError("Invalid DAG-PB form");
  }
  if (!hasOnlyProperties(node, pbNodeProperties)) {
    throw new TypeError("Invalid DAG-PB form (extraneous properties)");
  }
  if (node.Data !== void 0 && !(node.Data instanceof Uint8Array)) {
    throw new TypeError("Invalid DAG-PB form (Data must be a Uint8Array)");
  }
  if (!Array.isArray(node.Links)) {
    throw new TypeError("Invalid DAG-PB form (Links must be an array)");
  }
  for (let i = 0; i < node.Links.length; i++) {
    const link = node.Links[i];
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw new TypeError("Invalid DAG-PB form (bad link object)");
    }
    if (!hasOnlyProperties(link, pbLinkProperties)) {
      throw new TypeError("Invalid DAG-PB form (extraneous properties on link object)");
    }
    if (!link.Hash) {
      throw new TypeError("Invalid DAG-PB form (link must have a Hash)");
    }
    if (link.Hash.asCID !== link.Hash) {
      throw new TypeError("Invalid DAG-PB form (link Hash must be a CID)");
    }
    if (link.Name !== void 0 && typeof link.Name !== "string") {
      throw new TypeError("Invalid DAG-PB form (link Name must be a string)");
    }
    if (link.Tsize !== void 0 && (typeof link.Tsize !== "number" || link.Tsize % 1 !== 0)) {
      throw new TypeError("Invalid DAG-PB form (link Tsize must be an integer)");
    }
    if (i > 0 && linkComparator(link, node.Links[i - 1]) === -1) {
      throw new TypeError("Invalid DAG-PB form (links must be sorted by Name bytes)");
    }
  }
}
function createNode(data, links2 = []) {
  return prepare({
    Data: data,
    Links: links2
  });
}
function createLink(name5, size, cid) {
  return asLink({
    Hash: cid,
    Name: name5,
    Tsize: size
  });
}

// node_modules/@ipld/dag-pb/esm/src/index.js
var name = "dag-pb";
var code2 = 112;
function encode5(node) {
  validate(node);
  const pbn = {};
  if (node.Links) {
    pbn.Links = node.Links.map((l) => {
      const link = {};
      if (l.Hash) {
        link.Hash = l.Hash.bytes;
      }
      if (l.Name !== void 0) {
        link.Name = l.Name;
      }
      if (l.Tsize !== void 0) {
        link.Tsize = l.Tsize;
      }
      return link;
    });
  }
  if (node.Data) {
    pbn.Data = node.Data;
  }
  return encodeNode(pbn);
}
function decode7(bytes) {
  const pbn = decodeNode(bytes);
  const node = {};
  if (pbn.Data) {
    node.Data = pbn.Data;
  }
  if (pbn.Links) {
    node.Links = pbn.Links.map((l) => {
      const link = {};
      try {
        link.Hash = CID.decode(l.Hash);
      } catch (e) {
      }
      if (!link.Hash) {
        throw new Error("Invalid Hash field found in link, expected CID");
      }
      if (l.Name !== void 0) {
        link.Name = l.Name;
      }
      if (l.Tsize !== void 0) {
        link.Tsize = l.Tsize;
      }
      return link;
    });
  }
  return node;
}

// node_modules/ipfs-unixfs-importer/esm/src/utils/persist.js
init_sha2_browser();
var persist = async (buffer2, blockstore, options) => {
  if (!options.codec) {
    options.codec = src_exports;
  }
  if (!options.hasher) {
    options.hasher = sha256;
  }
  if (options.cidVersion === void 0) {
    options.cidVersion = 1;
  }
  if (options.codec === src_exports && options.hasher !== sha256) {
    options.cidVersion = 1;
  }
  const multihash = await options.hasher.digest(buffer2);
  const cid = CID.create(options.cidVersion, options.codec.code, multihash);
  if (!options.onlyHash) {
    await blockstore.put(cid, buffer2, { signal: options.signal });
  }
  return cid;
};
var persist_default = persist;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/dir.js
var dirBuilder = async (item, blockstore, options) => {
  const unixfs = new UnixFS({
    type: "directory",
    mtime: item.mtime,
    mode: item.mode
  });
  const buffer2 = encode5(prepare({ Data: unixfs.marshal() }));
  const cid = await persist_default(buffer2, blockstore, options);
  const path = item.path;
  return {
    cid,
    path,
    unixfs,
    size: buffer2.length
  };
};
var dir_default = dirBuilder;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/index.js
var import_err_code2 = __toESM(require_err_code(), 1);
var import_it_parallel_batch = __toESM(require_it_parallel_batch(), 1);
init_raw();

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/flat.js
var import_it_all = __toESM(require_it_all(), 1);
async function flat(source, reduce2) {
  return reduce2(await (0, import_it_all.default)(source));
}
var flat_default = flat;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/balanced.js
var import_it_batch = __toESM(require_it_batch(), 1);
function balanced(source, reduce2, options) {
  return reduceToParents(source, reduce2, options);
}
async function reduceToParents(source, reduce2, options) {
  const roots = [];
  for await (const chunked of (0, import_it_batch.default)(source, options.maxChildrenPerNode)) {
    roots.push(await reduce2(chunked));
  }
  if (roots.length > 1) {
    return reduceToParents(roots, reduce2, options);
  }
  return roots[0];
}
var balanced_default = balanced;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/trickle.js
var import_it_batch2 = __toESM(require_it_batch(), 1);
async function trickleStream(source, reduce2, options) {
  const root = new Root(options.layerRepeat);
  let iteration = 0;
  let maxDepth = 1;
  let subTree = root;
  for await (const layer of (0, import_it_batch2.default)(source, options.maxChildrenPerNode)) {
    if (subTree.isFull()) {
      if (subTree !== root) {
        root.addChild(await subTree.reduce(reduce2));
      }
      if (iteration && iteration % options.layerRepeat === 0) {
        maxDepth++;
      }
      subTree = new SubTree(maxDepth, options.layerRepeat, iteration);
      iteration++;
    }
    subTree.append(layer);
  }
  if (subTree && subTree !== root) {
    root.addChild(await subTree.reduce(reduce2));
  }
  return root.reduce(reduce2);
}
var trickle_default = trickleStream;
var SubTree = class {
  constructor(maxDepth, layerRepeat, iteration = 0) {
    this.maxDepth = maxDepth;
    this.layerRepeat = layerRepeat;
    this.currentDepth = 1;
    this.iteration = iteration;
    this.root = this.node = this.parent = {
      children: [],
      depth: this.currentDepth,
      maxDepth,
      maxChildren: (this.maxDepth - this.currentDepth) * this.layerRepeat
    };
  }
  isFull() {
    if (!this.root.data) {
      return false;
    }
    if (this.currentDepth < this.maxDepth && this.node.maxChildren) {
      this._addNextNodeToParent(this.node);
      return false;
    }
    const distantRelative = this._findParent(this.node, this.currentDepth);
    if (distantRelative) {
      this._addNextNodeToParent(distantRelative);
      return false;
    }
    return true;
  }
  _addNextNodeToParent(parent) {
    this.parent = parent;
    const nextNode = {
      children: [],
      depth: parent.depth + 1,
      parent,
      maxDepth: this.maxDepth,
      maxChildren: Math.floor(parent.children.length / this.layerRepeat) * this.layerRepeat
    };
    parent.children.push(nextNode);
    this.currentDepth = nextNode.depth;
    this.node = nextNode;
  }
  append(layer) {
    this.node.data = layer;
  }
  reduce(reduce2) {
    return this._reduce(this.root, reduce2);
  }
  async _reduce(node, reduce2) {
    let children = [];
    if (node.children.length) {
      children = await Promise.all(node.children.filter((child) => child.data).map((child) => this._reduce(child, reduce2)));
    }
    return reduce2((node.data || []).concat(children));
  }
  _findParent(node, depth) {
    const parent = node.parent;
    if (!parent || parent.depth === 0) {
      return;
    }
    if (parent.children.length === parent.maxChildren || !parent.maxChildren) {
      return this._findParent(parent, depth);
    }
    return parent;
  }
};
var Root = class extends SubTree {
  constructor(layerRepeat) {
    super(0, layerRepeat);
    this.root.depth = 0;
    this.currentDepth = 1;
  }
  addChild(child) {
    this.root.children.push(child);
  }
  reduce(reduce2) {
    return reduce2((this.root.data || []).concat(this.root.children));
  }
};

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/buffer-importer.js
init_raw();
async function* bufferImporter(file, block, options) {
  for await (let buffer2 of file.content) {
    yield async () => {
      options.progress(buffer2.length, file.path);
      let unixfs;
      const opts = {
        codec: src_exports,
        cidVersion: options.cidVersion,
        hasher: options.hasher,
        onlyHash: options.onlyHash
      };
      if (options.rawLeaves) {
        opts.codec = raw_exports;
        opts.cidVersion = 1;
      } else {
        unixfs = new UnixFS({
          type: options.leafType,
          data: buffer2
        });
        buffer2 = encode5({
          Data: unixfs.marshal(),
          Links: []
        });
      }
      return {
        cid: await persist_default(buffer2, block, opts),
        unixfs,
        size: buffer2.length
      };
    };
  }
}
var buffer_importer_default = bufferImporter;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/file/index.js
var dagBuilders = {
  flat: flat_default,
  balanced: balanced_default,
  trickle: trickle_default
};
async function* buildFileBatch(file, blockstore, options) {
  let count = -1;
  let previous;
  let bufferImporter2;
  if (typeof options.bufferImporter === "function") {
    bufferImporter2 = options.bufferImporter;
  } else {
    bufferImporter2 = buffer_importer_default;
  }
  for await (const entry of (0, import_it_parallel_batch.default)(bufferImporter2(file, blockstore, options), options.blockWriteConcurrency)) {
    count++;
    if (count === 0) {
      previous = entry;
      continue;
    } else if (count === 1 && previous) {
      yield previous;
      previous = null;
    }
    yield entry;
  }
  if (previous) {
    previous.single = true;
    yield previous;
  }
}
var reduce = (file, blockstore, options) => {
  async function reducer(leaves) {
    if (leaves.length === 1 && leaves[0].single && options.reduceSingleLeafToSelf) {
      const leaf = leaves[0];
      if (file.mtime !== void 0 || file.mode !== void 0) {
        let buffer3 = await blockstore.get(leaf.cid);
        leaf.unixfs = new UnixFS({
          type: "file",
          mtime: file.mtime,
          mode: file.mode,
          data: buffer3
        });
        buffer3 = encode5(prepare({ Data: leaf.unixfs.marshal() }));
        leaf.cid = await persist_default(buffer3, blockstore, {
          ...options,
          codec: src_exports,
          hasher: options.hasher,
          cidVersion: options.cidVersion
        });
        leaf.size = buffer3.length;
      }
      return {
        cid: leaf.cid,
        path: file.path,
        unixfs: leaf.unixfs,
        size: leaf.size
      };
    }
    const f = new UnixFS({
      type: "file",
      mtime: file.mtime,
      mode: file.mode
    });
    const links2 = leaves.filter((leaf) => {
      if (leaf.cid.code === code3 && leaf.size) {
        return true;
      }
      if (leaf.unixfs && !leaf.unixfs.data && leaf.unixfs.fileSize()) {
        return true;
      }
      return Boolean(leaf.unixfs && leaf.unixfs.data && leaf.unixfs.data.length);
    }).map((leaf) => {
      if (leaf.cid.code === code3) {
        f.addBlockSize(leaf.size);
        return {
          Name: "",
          Tsize: leaf.size,
          Hash: leaf.cid
        };
      }
      if (!leaf.unixfs || !leaf.unixfs.data) {
        f.addBlockSize(leaf.unixfs && leaf.unixfs.fileSize() || 0);
      } else {
        f.addBlockSize(leaf.unixfs.data.length);
      }
      return {
        Name: "",
        Tsize: leaf.size,
        Hash: leaf.cid
      };
    });
    const node = {
      Data: f.marshal(),
      Links: links2
    };
    const buffer2 = encode5(prepare(node));
    const cid = await persist_default(buffer2, blockstore, options);
    return {
      cid,
      path: file.path,
      unixfs: f,
      size: buffer2.length + node.Links.reduce((acc, curr) => acc + curr.Tsize, 0)
    };
  }
  return reducer;
};
function fileBuilder(file, block, options) {
  const dagBuilder2 = dagBuilders[options.strategy];
  if (!dagBuilder2) {
    throw (0, import_err_code2.default)(new Error(`Unknown importer build strategy name: ${options.strategy}`), "ERR_BAD_STRATEGY");
  }
  return dagBuilder2(buildFileBatch(file, block, options), reduce(file, block, options), options);
}
var file_default = fileBuilder;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/index.js
var import_err_code5 = __toESM(require_err_code(), 1);

// node_modules/ipfs-unixfs-importer/esm/src/chunker/rabin.js
var import_BufferList = __toESM(require_BufferList(), 1);
var import_rabin_wasm = __toESM(require_src(), 1);
var import_err_code3 = __toESM(require_err_code(), 1);
async function* rabinChunker(source, options) {
  let min, max, avg;
  if (options.minChunkSize && options.maxChunkSize && options.avgChunkSize) {
    avg = options.avgChunkSize;
    min = options.minChunkSize;
    max = options.maxChunkSize;
  } else if (!options.avgChunkSize) {
    throw (0, import_err_code3.default)(new Error("please specify an average chunk size"), "ERR_INVALID_AVG_CHUNK_SIZE");
  } else {
    avg = options.avgChunkSize;
    min = avg / 3;
    max = avg + avg / 2;
  }
  if (min < 16) {
    throw (0, import_err_code3.default)(new Error("rabin min must be greater than 16"), "ERR_INVALID_MIN_CHUNK_SIZE");
  }
  if (max < min) {
    max = min;
  }
  if (avg < min) {
    avg = min;
  }
  const sizepow = Math.floor(Math.log2(avg));
  for await (const chunk of rabin(source, {
    min,
    max,
    bits: sizepow,
    window: options.window,
    polynomial: options.polynomial
  })) {
    yield chunk;
  }
}
var rabin_default = rabinChunker;
async function* rabin(source, options) {
  const r = await (0, import_rabin_wasm.create)(options.bits, options.min, options.max, options.window);
  const buffers = new import_BufferList.default();
  for await (const chunk of source) {
    buffers.append(chunk);
    const sizes = r.fingerprint(chunk);
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const buf2 = buffers.slice(0, size);
      buffers.consume(size);
      yield buf2;
    }
  }
  if (buffers.length) {
    yield buffers.slice(0);
  }
}

// node_modules/ipfs-unixfs-importer/esm/src/chunker/fixed-size.js
var import_BufferList2 = __toESM(require_BufferList(), 1);
async function* fixedSizeChunker(source, options) {
  let bl = new import_BufferList2.default();
  let currentLength = 0;
  let emitted = false;
  const maxChunkSize = options.maxChunkSize;
  for await (const buffer2 of source) {
    bl.append(buffer2);
    currentLength += buffer2.length;
    while (currentLength >= maxChunkSize) {
      yield bl.slice(0, maxChunkSize);
      emitted = true;
      if (maxChunkSize === bl.length) {
        bl = new import_BufferList2.default();
        currentLength = 0;
      } else {
        const newBl = new import_BufferList2.default();
        newBl.append(bl.shallowSlice(maxChunkSize));
        bl = newBl;
        currentLength -= maxChunkSize;
      }
    }
  }
  if (!emitted || currentLength) {
    yield bl.slice(0, currentLength);
  }
}
var fixed_size_default = fixedSizeChunker;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/validate-chunks.js
var import_err_code4 = __toESM(require_err_code(), 1);
init_from_string();
async function* validateChunks(source) {
  for await (const content of source) {
    if (content.length === void 0) {
      throw (0, import_err_code4.default)(new Error("Content was invalid"), "ERR_INVALID_CONTENT");
    }
    if (typeof content === "string" || content instanceof String) {
      yield fromString3(content.toString());
    } else if (Array.isArray(content)) {
      yield Uint8Array.from(content);
    } else if (content instanceof Uint8Array) {
      yield content;
    } else {
      throw (0, import_err_code4.default)(new Error("Content was invalid"), "ERR_INVALID_CONTENT");
    }
  }
}
var validate_chunks_default = validateChunks;

// node_modules/ipfs-unixfs-importer/esm/src/dag-builder/index.js
function isIterable(thing) {
  return Symbol.iterator in thing;
}
function isAsyncIterable(thing) {
  return Symbol.asyncIterator in thing;
}
function contentAsAsyncIterable(content) {
  try {
    if (content instanceof Uint8Array) {
      return (async function* () {
        yield content;
      })();
    } else if (isIterable(content)) {
      return (async function* () {
        yield* content;
      })();
    } else if (isAsyncIterable(content)) {
      return content;
    }
  } catch {
    throw (0, import_err_code5.default)(new Error("Content was invalid"), "ERR_INVALID_CONTENT");
  }
  throw (0, import_err_code5.default)(new Error("Content was invalid"), "ERR_INVALID_CONTENT");
}
async function* dagBuilder(source, blockstore, options) {
  for await (const entry of source) {
    if (entry.path) {
      if (entry.path.substring(0, 2) === "./") {
        options.wrapWithDirectory = true;
      }
      entry.path = entry.path.split("/").filter((path) => path && path !== ".").join("/");
    }
    if (entry.content) {
      let chunker;
      if (typeof options.chunker === "function") {
        chunker = options.chunker;
      } else if (options.chunker === "rabin") {
        chunker = rabin_default;
      } else {
        chunker = fixed_size_default;
      }
      let chunkValidator;
      if (typeof options.chunkValidator === "function") {
        chunkValidator = options.chunkValidator;
      } else {
        chunkValidator = validate_chunks_default;
      }
      const file = {
        path: entry.path,
        mtime: entry.mtime,
        mode: entry.mode,
        content: chunker(chunkValidator(contentAsAsyncIterable(entry.content), options), options)
      };
      yield () => file_default(file, blockstore, options);
    } else if (entry.path) {
      const dir = {
        path: entry.path,
        mtime: entry.mtime,
        mode: entry.mode
      };
      yield () => dir_default(dir, blockstore, options);
    } else {
      throw new Error("Import candidate must have content or path or both");
    }
  }
}
var dag_builder_default = dagBuilder;

// node_modules/ipfs-unixfs-importer/esm/src/dir.js
var Dir = class {
  constructor(props, options) {
    this.options = options || {};
    this.root = props.root;
    this.dir = props.dir;
    this.path = props.path;
    this.dirty = props.dirty;
    this.flat = props.flat;
    this.parent = props.parent;
    this.parentKey = props.parentKey;
    this.unixfs = props.unixfs;
    this.mode = props.mode;
    this.mtime = props.mtime;
    this.cid = void 0;
    this.size = void 0;
  }
  async put(name5, value) {
  }
  get(name5) {
    return Promise.resolve(this);
  }
  async *eachChildSeries() {
  }
  async *flush(blockstore) {
  }
};
var dir_default2 = Dir;

// node_modules/ipfs-unixfs-importer/esm/src/dir-flat.js
var DirFlat = class extends dir_default2 {
  constructor(props, options) {
    super(props, options);
    this._children = {};
  }
  async put(name5, value) {
    this.cid = void 0;
    this.size = void 0;
    this._children[name5] = value;
  }
  get(name5) {
    return Promise.resolve(this._children[name5]);
  }
  childCount() {
    return Object.keys(this._children).length;
  }
  directChildrenCount() {
    return this.childCount();
  }
  onlyChild() {
    return this._children[Object.keys(this._children)[0]];
  }
  async *eachChildSeries() {
    const keys = Object.keys(this._children);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      yield {
        key,
        child: this._children[key]
      };
    }
  }
  async *flush(block) {
    const children = Object.keys(this._children);
    const links2 = [];
    for (let i = 0; i < children.length; i++) {
      let child = this._children[children[i]];
      if (child instanceof dir_default2) {
        for await (const entry of child.flush(block)) {
          child = entry;
          yield child;
        }
      }
      if (child.size != null && child.cid) {
        links2.push({
          Name: children[i],
          Tsize: child.size,
          Hash: child.cid
        });
      }
    }
    const unixfs = new UnixFS({
      type: "directory",
      mtime: this.mtime,
      mode: this.mode
    });
    const node = {
      Data: unixfs.marshal(),
      Links: links2
    };
    const buffer2 = encode5(prepare(node));
    const cid = await persist_default(buffer2, block, this.options);
    const size = buffer2.length + node.Links.reduce((acc, curr) => acc + (curr.Tsize == null ? 0 : curr.Tsize), 0);
    this.cid = cid;
    this.size = size;
    yield {
      cid,
      unixfs,
      path: this.path,
      size
    };
  }
};
var dir_flat_default = DirFlat;

// node_modules/ipfs-unixfs-importer/esm/src/dir-sharded.js
var import_hamt_sharding = __toESM(require_src2(), 1);
var DirSharded = class extends dir_default2 {
  constructor(props, options) {
    super(props, options);
    this._bucket = (0, import_hamt_sharding.createHAMT)({
      hashFn: options.hamtHashFn,
      bits: options.hamtBucketBits
    });
  }
  async put(name5, value) {
    await this._bucket.put(name5, value);
  }
  get(name5) {
    return this._bucket.get(name5);
  }
  childCount() {
    return this._bucket.leafCount();
  }
  directChildrenCount() {
    return this._bucket.childrenCount();
  }
  onlyChild() {
    return this._bucket.onlyChild();
  }
  async *eachChildSeries() {
    for await (const { key, value } of this._bucket.eachLeafSeries()) {
      yield {
        key,
        child: value
      };
    }
  }
  async *flush(blockstore) {
    for await (const entry of flush(this._bucket, blockstore, this, this.options)) {
      yield {
        ...entry,
        path: this.path
      };
    }
  }
};
var dir_sharded_default = DirSharded;
async function* flush(bucket, blockstore, shardRoot, options) {
  const children = bucket._children;
  const links2 = [];
  let childrenSize = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children.get(i);
    if (!child) {
      continue;
    }
    const labelPrefix = i.toString(16).toUpperCase().padStart(2, "0");
    if (child instanceof import_hamt_sharding.Bucket) {
      let shard;
      for await (const subShard of await flush(child, blockstore, null, options)) {
        shard = subShard;
      }
      if (!shard) {
        throw new Error("Could not flush sharded directory, no subshard found");
      }
      links2.push({
        Name: labelPrefix,
        Tsize: shard.size,
        Hash: shard.cid
      });
      childrenSize += shard.size;
    } else if (typeof child.value.flush === "function") {
      const dir2 = child.value;
      let flushedDir;
      for await (const entry of dir2.flush(blockstore)) {
        flushedDir = entry;
        yield flushedDir;
      }
      const label = labelPrefix + child.key;
      links2.push({
        Name: label,
        Tsize: flushedDir.size,
        Hash: flushedDir.cid
      });
      childrenSize += flushedDir.size;
    } else {
      const value = child.value;
      if (!value.cid) {
        continue;
      }
      const label = labelPrefix + child.key;
      const size2 = value.size;
      links2.push({
        Name: label,
        Tsize: size2,
        Hash: value.cid
      });
      childrenSize += size2;
    }
  }
  const data = Uint8Array.from(children.bitField().reverse());
  const dir = new UnixFS({
    type: "hamt-sharded-directory",
    data,
    fanout: bucket.tableSize(),
    hashType: options.hamtHashCode,
    mtime: shardRoot && shardRoot.mtime,
    mode: shardRoot && shardRoot.mode
  });
  const node = {
    Data: dir.marshal(),
    Links: links2
  };
  const buffer2 = encode5(prepare(node));
  const cid = await persist_default(buffer2, blockstore, options);
  const size = buffer2.length + childrenSize;
  yield {
    cid,
    unixfs: dir,
    size
  };
}

// node_modules/ipfs-unixfs-importer/esm/src/flat-to-shard.js
async function flatToShard(child, dir, threshold, options) {
  let newDir = dir;
  if (dir instanceof dir_flat_default && dir.directChildrenCount() >= threshold) {
    newDir = await convertToShard(dir, options);
  }
  const parent = newDir.parent;
  if (parent) {
    if (newDir !== dir) {
      if (child) {
        child.parent = newDir;
      }
      if (!newDir.parentKey) {
        throw new Error("No parent key found");
      }
      await parent.put(newDir.parentKey, newDir);
    }
    return flatToShard(newDir, parent, threshold, options);
  }
  return newDir;
}
async function convertToShard(oldDir, options) {
  const newDir = new dir_sharded_default({
    root: oldDir.root,
    dir: true,
    parent: oldDir.parent,
    parentKey: oldDir.parentKey,
    path: oldDir.path,
    dirty: oldDir.dirty,
    flat: false,
    mtime: oldDir.mtime,
    mode: oldDir.mode
  }, options);
  for await (const { key, child } of oldDir.eachChildSeries()) {
    await newDir.put(key, child);
  }
  return newDir;
}
var flat_to_shard_default = flatToShard;

// node_modules/ipfs-unixfs-importer/esm/src/utils/to-path-components.js
var toPathComponents = (path = "") => {
  return (path.trim().match(/([^\\/]|\\\/)+/g) || []).filter(Boolean);
};
var to_path_components_default = toPathComponents;

// node_modules/ipfs-unixfs-importer/esm/src/tree-builder.js
async function addToTree(elem, tree2, options) {
  const pathElems = to_path_components_default(elem.path || "");
  const lastIndex = pathElems.length - 1;
  let parent = tree2;
  let currentPath = "";
  for (let i = 0; i < pathElems.length; i++) {
    const pathElem = pathElems[i];
    currentPath += `${currentPath ? "/" : ""}${pathElem}`;
    const last3 = i === lastIndex;
    parent.dirty = true;
    parent.cid = void 0;
    parent.size = void 0;
    if (last3) {
      await parent.put(pathElem, elem);
      tree2 = await flat_to_shard_default(null, parent, options.shardSplitThreshold, options);
    } else {
      let dir = await parent.get(pathElem);
      if (!dir || !(dir instanceof dir_default2)) {
        dir = new dir_flat_default({
          root: false,
          dir: true,
          parent,
          parentKey: pathElem,
          path: currentPath,
          dirty: true,
          flat: true,
          mtime: dir && dir.unixfs && dir.unixfs.mtime,
          mode: dir && dir.unixfs && dir.unixfs.mode
        }, options);
      }
      await parent.put(pathElem, dir);
      parent = dir;
    }
  }
  return tree2;
}
async function* flushAndYield(tree2, blockstore) {
  if (!(tree2 instanceof dir_default2)) {
    if (tree2 && tree2.unixfs && tree2.unixfs.isDirectory()) {
      yield tree2;
    }
    return;
  }
  yield* tree2.flush(blockstore);
}
async function* treeBuilder(source, block, options) {
  let tree2 = new dir_flat_default({
    root: true,
    dir: true,
    path: "",
    dirty: true,
    flat: true
  }, options);
  for await (const entry of source) {
    if (!entry) {
      continue;
    }
    tree2 = await addToTree(entry, tree2, options);
    if (!entry.unixfs || !entry.unixfs.isDirectory()) {
      yield entry;
    }
  }
  if (options.wrapWithDirectory) {
    yield* flushAndYield(tree2, block);
  } else {
    for await (const unwrapped of tree2.eachChildSeries()) {
      if (!unwrapped) {
        continue;
      }
      yield* flushAndYield(unwrapped.child, block);
    }
  }
}
var tree_builder_default = treeBuilder;

// node_modules/ipfs-unixfs-importer/esm/src/index.js
async function* importer(source, blockstore, options = {}) {
  const opts = options_default(options);
  let dagBuilder2;
  if (typeof options.dagBuilder === "function") {
    dagBuilder2 = options.dagBuilder;
  } else {
    dagBuilder2 = dag_builder_default;
  }
  let treeBuilder2;
  if (typeof options.treeBuilder === "function") {
    treeBuilder2 = options.treeBuilder;
  } else {
    treeBuilder2 = tree_builder_default;
  }
  let candidates;
  if (Symbol.asyncIterator in source || Symbol.iterator in source) {
    candidates = source;
  } else {
    candidates = [source];
  }
  for await (const entry of treeBuilder2((0, import_it_parallel_batch2.default)(dagBuilder2(candidates, blockstore, opts), opts.fileImportConcurrency), blockstore, opts)) {
    yield {
      cid: entry.cid,
      path: entry.path,
      unixfs: entry.unixfs,
      size: entry.size
    };
  }
}

// node_modules/ipfs-core-utils/esm/src/files/normalise-content.js
var import_err_code6 = __toESM(require_err_code(), 1);
init_from_string();
var import_browser_readablestream_to_it = __toESM(require_browser_readablestream_to_it(), 1);
var import_blob_to_it = __toESM(require_blob_to_it(), 1);
var import_it_peekable = __toESM(require_it_peekable(), 1);
var import_it_all2 = __toESM(require_it_all(), 1);
var import_it_map = __toESM(require_it_map(), 1);

// node_modules/ipfs-core-utils/esm/src/files/utils.js
function isBytes(obj) {
  return ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer;
}
function isBlob(obj) {
  return obj.constructor && (obj.constructor.name === "Blob" || obj.constructor.name === "File") && typeof obj.stream === "function";
}
function isFileObject(obj) {
  return typeof obj === "object" && (obj.path || obj.content);
}
var isReadableStream = (value) => value && typeof value.getReader === "function";

// node_modules/ipfs-core-utils/esm/src/files/normalise-content.js
async function* toAsyncIterable(thing) {
  yield thing;
}
async function normaliseContent(input) {
  if (isBytes(input)) {
    return toAsyncIterable(toBytes(input));
  }
  if (typeof input === "string" || input instanceof String) {
    return toAsyncIterable(toBytes(input.toString()));
  }
  if (isBlob(input)) {
    return (0, import_blob_to_it.default)(input);
  }
  if (isReadableStream(input)) {
    input = (0, import_browser_readablestream_to_it.default)(input);
  }
  if (Symbol.iterator in input || Symbol.asyncIterator in input) {
    const peekable = (0, import_it_peekable.default)(input);
    const { value, done } = await peekable.peek();
    if (done) {
      return toAsyncIterable(new Uint8Array(0));
    }
    peekable.push(value);
    if (Number.isInteger(value)) {
      return toAsyncIterable(Uint8Array.from(await (0, import_it_all2.default)(peekable)));
    }
    if (isBytes(value) || typeof value === "string" || value instanceof String) {
      return (0, import_it_map.default)(peekable, toBytes);
    }
  }
  throw (0, import_err_code6.default)(new Error(`Unexpected input: ${input}`), "ERR_UNEXPECTED_INPUT");
}
function toBytes(chunk) {
  if (chunk instanceof Uint8Array) {
    return chunk;
  }
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk);
  }
  if (Array.isArray(chunk)) {
    return Uint8Array.from(chunk);
  }
  return fromString3(chunk.toString());
}

// node_modules/ipfs-core-utils/esm/src/files/normalise-candidate-single.js
var import_err_code7 = __toESM(require_err_code(), 1);
var import_browser_readablestream_to_it2 = __toESM(require_browser_readablestream_to_it(), 1);
var import_it_peekable2 = __toESM(require_it_peekable(), 1);
async function* normaliseCandidateSingle(input, normaliseContent2) {
  if (input === null || input === void 0) {
    throw (0, import_err_code7.default)(new Error(`Unexpected input: ${input}`), "ERR_UNEXPECTED_INPUT");
  }
  if (typeof input === "string" || input instanceof String) {
    yield toFileObject(input.toString(), normaliseContent2);
    return;
  }
  if (isBytes(input) || isBlob(input)) {
    yield toFileObject(input, normaliseContent2);
    return;
  }
  if (isReadableStream(input)) {
    input = (0, import_browser_readablestream_to_it2.default)(input);
  }
  if (Symbol.iterator in input || Symbol.asyncIterator in input) {
    const peekable = (0, import_it_peekable2.default)(input);
    const { value, done } = await peekable.peek();
    if (done) {
      yield { content: [] };
      return;
    }
    peekable.push(value);
    if (Number.isInteger(value) || isBytes(value) || typeof value === "string" || value instanceof String) {
      yield toFileObject(peekable, normaliseContent2);
      return;
    }
    throw (0, import_err_code7.default)(new Error("Unexpected input: multiple items passed - if you are using ipfs.add, please use ipfs.addAll instead"), "ERR_UNEXPECTED_INPUT");
  }
  if (isFileObject(input)) {
    yield toFileObject(input, normaliseContent2);
    return;
  }
  throw (0, import_err_code7.default)(new Error('Unexpected input: cannot convert "' + typeof input + '" into ImportCandidate'), "ERR_UNEXPECTED_INPUT");
}
async function toFileObject(input, normaliseContent2) {
  const { path, mode, mtime, content } = input;
  const file = {
    path: path || "",
    mode: parseMode(mode),
    mtime: parseMtime(mtime)
  };
  if (content) {
    file.content = await normaliseContent2(content);
  } else if (!path) {
    file.content = await normaliseContent2(input);
  }
  return file;
}

// node_modules/ipfs-core-utils/esm/src/files/normalise-input-single.js
function normaliseInput(input) {
  return normaliseCandidateSingle(input, normaliseContent);
}

// node_modules/ipfs-core-utils/esm/src/files/normalise-candidate-multiple.js
var import_err_code8 = __toESM(require_err_code(), 1);
var import_browser_readablestream_to_it3 = __toESM(require_browser_readablestream_to_it(), 1);
var import_it_peekable3 = __toESM(require_it_peekable(), 1);
var import_it_map2 = __toESM(require_it_map(), 1);
async function* normaliseCandidateMultiple(input, normaliseContent2) {
  if (typeof input === "string" || input instanceof String || isBytes(input) || isBlob(input) || input._readableState) {
    throw (0, import_err_code8.default)(new Error("Unexpected input: single item passed - if you are using ipfs.addAll, please use ipfs.add instead"), "ERR_UNEXPECTED_INPUT");
  }
  if (isReadableStream(input)) {
    input = (0, import_browser_readablestream_to_it3.default)(input);
  }
  if (Symbol.iterator in input || Symbol.asyncIterator in input) {
    const peekable = (0, import_it_peekable3.default)(input);
    const { value, done } = await peekable.peek();
    if (done) {
      yield* [];
      return;
    }
    peekable.push(value);
    if (Number.isInteger(value)) {
      throw (0, import_err_code8.default)(new Error("Unexpected input: single item passed - if you are using ipfs.addAll, please use ipfs.add instead"), "ERR_UNEXPECTED_INPUT");
    }
    if (value._readableState) {
      yield* (0, import_it_map2.default)(peekable, (value2) => toFileObject2({ content: value2 }, normaliseContent2));
      return;
    }
    if (isBytes(value)) {
      yield toFileObject2({ content: peekable }, normaliseContent2);
      return;
    }
    if (isFileObject(value) || value[Symbol.iterator] || value[Symbol.asyncIterator] || isReadableStream(value) || isBlob(value)) {
      yield* (0, import_it_map2.default)(peekable, (value2) => toFileObject2(value2, normaliseContent2));
      return;
    }
  }
  if (isFileObject(input)) {
    throw (0, import_err_code8.default)(new Error("Unexpected input: single item passed - if you are using ipfs.addAll, please use ipfs.add instead"), "ERR_UNEXPECTED_INPUT");
  }
  throw (0, import_err_code8.default)(new Error("Unexpected input: " + typeof input), "ERR_UNEXPECTED_INPUT");
}
async function toFileObject2(input, normaliseContent2) {
  const { path, mode, mtime, content } = input;
  const file = {
    path: path || "",
    mode: parseMode(mode),
    mtime: parseMtime(mtime)
  };
  if (content) {
    file.content = await normaliseContent2(content);
  } else if (!path) {
    file.content = await normaliseContent2(input);
  }
  return file;
}

// node_modules/ipfs-core-utils/esm/src/files/normalise-input-multiple.js
function normaliseInput2(input) {
  return normaliseCandidateMultiple(input, normaliseContent);
}

// node_modules/ipfs-car/dist/esm/pack/utils/normalise-input.js
function isBytes2(obj) {
  return ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer;
}
function isBlob2(obj) {
  return Boolean(obj.constructor) && (obj.constructor.name === "Blob" || obj.constructor.name === "File") && typeof obj.stream === "function";
}
function isSingle(input) {
  return typeof input === "string" || input instanceof String || isBytes2(input) || isBlob2(input) || "_readableState" in input;
}
function getNormaliser(input) {
  if (isSingle(input)) {
    return normaliseInput(input);
  } else {
    return normaliseInput2(input);
  }
}

// node_modules/ipfs-car/dist/esm/blockstore/memory.js
init_src();

// node_modules/blockstore-core/esm/src/errors.js
var errors_exports = {};
__export(errors_exports, {
  abortedError: () => abortedError,
  notFoundError: () => notFoundError
});
var import_err_code9 = __toESM(require_err_code(), 1);
function notFoundError(err) {
  err = err || new Error("Not Found");
  return (0, import_err_code9.default)(err, "ERR_NOT_FOUND");
}
function abortedError(err) {
  err = err || new Error("Aborted");
  return (0, import_err_code9.default)(err, "ERR_ABORTED");
}

// node_modules/blockstore-core/esm/src/base.js
var import_it_drain = __toESM(require_it_drain(), 1);
var import_it_filter = __toESM(require_it_filter(), 1);
var import_it_take = __toESM(require_it_take(), 1);
var import_it_all3 = __toESM(require_it_all(), 1);
var sortAll = (iterable, sorter) => {
  return (async function* () {
    const values = await (0, import_it_all3.default)(iterable);
    yield* values.sort(sorter);
  })();
};
var BaseBlockstore = class {
  open() {
    return Promise.reject(new Error(".open is not implemented"));
  }
  close() {
    return Promise.reject(new Error(".close is not implemented"));
  }
  put(key, val, options) {
    return Promise.reject(new Error(".put is not implemented"));
  }
  get(key, options) {
    return Promise.reject(new Error(".get is not implemented"));
  }
  has(key, options) {
    return Promise.reject(new Error(".has is not implemented"));
  }
  delete(key, options) {
    return Promise.reject(new Error(".delete is not implemented"));
  }
  async *putMany(source, options = {}) {
    for await (const { key, value } of source) {
      await this.put(key, value, options);
      yield {
        key,
        value
      };
    }
  }
  async *getMany(source, options = {}) {
    for await (const key of source) {
      yield this.get(key, options);
    }
  }
  async *deleteMany(source, options = {}) {
    for await (const key of source) {
      await this.delete(key, options);
      yield key;
    }
  }
  batch() {
    let puts = [];
    let dels = [];
    return {
      put(key, value) {
        puts.push({
          key,
          value
        });
      },
      delete(key) {
        dels.push(key);
      },
      commit: async (options) => {
        await (0, import_it_drain.default)(this.putMany(puts, options));
        puts = [];
        await (0, import_it_drain.default)(this.deleteMany(dels, options));
        dels = [];
      }
    };
  }
  async *_all(q, options) {
    throw new Error("._all is not implemented");
  }
  async *_allKeys(q, options) {
    throw new Error("._allKeys is not implemented");
  }
  query(q, options) {
    let it = this._all(q, options);
    if (q.prefix != null) {
      it = (0, import_it_filter.default)(it, (e) => e.key.toString().startsWith(q.prefix || ""));
    }
    if (Array.isArray(q.filters)) {
      it = q.filters.reduce((it2, f) => (0, import_it_filter.default)(it2, f), it);
    }
    if (Array.isArray(q.orders)) {
      it = q.orders.reduce((it2, f) => sortAll(it2, f), it);
    }
    if (q.offset != null) {
      let i = 0;
      it = (0, import_it_filter.default)(it, () => i++ >= (q.offset || 0));
    }
    if (q.limit != null) {
      it = (0, import_it_take.default)(it, q.limit);
    }
    return it;
  }
  queryKeys(q, options) {
    let it = this._allKeys(q, options);
    if (q.prefix != null) {
      it = (0, import_it_filter.default)(it, (cid) => cid.toString().startsWith(q.prefix || ""));
    }
    if (Array.isArray(q.filters)) {
      it = q.filters.reduce((it2, f) => (0, import_it_filter.default)(it2, f), it);
    }
    if (Array.isArray(q.orders)) {
      it = q.orders.reduce((it2, f) => sortAll(it2, f), it);
    }
    if (q.offset != null) {
      let i = 0;
      it = (0, import_it_filter.default)(it, () => i++ >= q.offset);
    }
    if (q.limit != null) {
      it = (0, import_it_take.default)(it, q.limit);
    }
    return it;
  }
};

// node_modules/blockstore-core/esm/src/memory.js
init_base32();
init_raw();
init_cid();
init_digest();

// node_modules/blockstore-core/esm/src/index.js
var Errors = { ...errors_exports };

// node_modules/ipfs-car/dist/esm/blockstore/memory.js
var MemoryBlockStore = class extends BaseBlockstore {
  constructor() {
    super();
    this.store = /* @__PURE__ */ new Map();
  }
  async *blocks() {
    for (const [cidStr, bytes] of this.store.entries()) {
      yield { cid: CID.parse(cidStr), bytes };
    }
  }
  put(cid, bytes) {
    this.store.set(cid.toString(), bytes);
    return Promise.resolve();
  }
  get(cid) {
    const bytes = this.store.get(cid.toString());
    if (!bytes) {
      throw new Error(`block with cid ${cid.toString()} no found`);
    }
    return Promise.resolve(bytes);
  }
  has(cid) {
    return Promise.resolve(this.store.has(cid.toString()));
  }
  close() {
    this.store.clear();
    return Promise.resolve();
  }
};

// node_modules/ipfs-car/dist/esm/pack/constants.js
init_sha2_browser();
var unixfsImporterOptionsDefault = {
  cidVersion: 1,
  chunker: "fixed",
  maxChunkSize: 262144,
  hasher: sha256,
  rawLeaves: true,
  wrapWithDirectory: true,
  maxChildrenPerNode: 174
};

// node_modules/ipfs-car/dist/esm/pack/index.js
async function pack({ input, blockstore: userBlockstore, hasher, maxChunkSize, maxChildrenPerNode, wrapWithDirectory, rawLeaves }) {
  if (!input || Array.isArray(input) && !input.length) {
    throw new Error("missing input file(s)");
  }
  const blockstore = userBlockstore ? userBlockstore : new MemoryBlockStore();
  const rootEntry = await (0, import_it_last.default)((0, import_it_pipe.default)(getNormaliser(input), (source) => importer(source, blockstore, {
    ...unixfsImporterOptionsDefault,
    hasher: hasher || unixfsImporterOptionsDefault.hasher,
    maxChunkSize: maxChunkSize || unixfsImporterOptionsDefault.maxChunkSize,
    maxChildrenPerNode: maxChildrenPerNode || unixfsImporterOptionsDefault.maxChildrenPerNode,
    wrapWithDirectory: wrapWithDirectory === false ? false : unixfsImporterOptionsDefault.wrapWithDirectory,
    rawLeaves: rawLeaves == null ? unixfsImporterOptionsDefault.rawLeaves : rawLeaves
  })));
  if (!rootEntry || !rootEntry.cid) {
    throw new Error("given input could not be parsed correctly");
  }
  const root = rootEntry.cid;
  const { writer, out: carOut } = await CarWriter.create([root]);
  const carOutIter = carOut[Symbol.asyncIterator]();
  let writingPromise;
  const writeAll = async () => {
    for await (const block of blockstore.blocks()) {
      await writer.put(block);
    }
    await writer.close();
    if (!userBlockstore) {
      await blockstore.close();
    }
  };
  const out = {
    [Symbol.asyncIterator]() {
      if (writingPromise != null) {
        throw new Error("Multiple iterator not supported");
      }
      writingPromise = writeAll();
      return {
        async next() {
          const result = await carOutIter.next();
          if (result.done) {
            await writingPromise;
          }
          return result;
        }
      };
    }
  };
  return { root, out };
}

// node_modules/@web3-storage/parse-link-header/index.js
var MAX_HEADER_LENGTH = 2e3;
var THROW_ON_MAX_HEADER_LENGTH_EXCEEDED = false;
function hasRel(x) {
  return x && x.rel;
}
function intoRels(acc, x) {
  function splitRel(rel) {
    acc[rel] = Object.assign({}, x, { rel });
  }
  x.rel.split(/\s+/).forEach(splitRel);
  return acc;
}
function createObjects(acc, p) {
  const m = p.match(/\s*(.+)\s*=\s*"?([^"]+)"?/);
  if (m) acc[m[1]] = m[2];
  return acc;
}
function parseLink(link) {
  try {
    const m = link.match(/<?([^>]*)>(.*)/);
    const linkUrl = m[1];
    const parts = m[2].split(";");
    const qry = {};
    const url = new URL(linkUrl, "https://example.com");
    for (const [key, value] of url.searchParams) {
      qry[key] = value;
    }
    parts.shift();
    let info = parts.reduce(createObjects, {});
    info = Object.assign({}, qry, info);
    info.url = linkUrl;
    return info;
  } catch {
    return null;
  }
}
function checkHeader(linkHeader, options) {
  if (!linkHeader) return false;
  options = options || {};
  const maxHeaderLength = options.maxHeaderLength || MAX_HEADER_LENGTH;
  const throwOnMaxHeaderLengthExceeded = options.throwOnMaxHeaderLengthExceeded || THROW_ON_MAX_HEADER_LENGTH_EXCEEDED;
  if (linkHeader.length > maxHeaderLength) {
    if (throwOnMaxHeaderLengthExceeded) {
      throw new Error("Input string too long, it should be under " + maxHeaderLength + " characters.");
    } else {
      return false;
    }
  }
  return true;
}
function parseLinkHeader(linkHeader, options) {
  if (!checkHeader(linkHeader, options)) return null;
  return linkHeader.split(/,\s*</).map(parseLink).filter(hasRel).reduce(intoRels, {});
}

// node_modules/ipfs-car/dist/esm/unpack/index.js
var import_browser_readablestream_to_it4 = __toESM(require_browser_readablestream_to_it());

// node_modules/ipfs-unixfs-exporter/esm/src/index.js
var import_err_code17 = __toESM(require_err_code());
init_cid();

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/index.js
var import_err_code16 = __toESM(require_err_code(), 1);
init_raw();
init_identity2();

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/unixfs-v1/index.js
var import_err_code12 = __toESM(require_err_code(), 1);

// node_modules/ipfs-unixfs-exporter/esm/src/utils/find-cid-in-shard.js
var import_hamt_sharding2 = __toESM(require_src2(), 1);
var hashFn = async function(buf2) {
  return (await murmur3128.encode(buf2)).slice(0, 8).reverse();
};
var addLinksToHamtBucket = (links2, bucket, rootBucket) => {
  return Promise.all(links2.map((link) => {
    if (link.Name == null) {
      throw new Error("Unexpected Link without a Name");
    }
    if (link.Name.length === 2) {
      const pos = parseInt(link.Name, 16);
      return bucket._putObjectAt(pos, new import_hamt_sharding2.Bucket({
        hash: rootBucket._options.hash,
        bits: rootBucket._options.bits
      }, bucket, pos));
    }
    return rootBucket.put(link.Name.substring(2), true);
  }));
};
var toPrefix = (position) => {
  return position.toString(16).toUpperCase().padStart(2, "0").substring(0, 2);
};
var toBucketPath = (position) => {
  let bucket = position.bucket;
  const path = [];
  while (bucket._parent) {
    path.push(bucket);
    bucket = bucket._parent;
  }
  path.push(bucket);
  return path.reverse();
};
var findShardCid = async (node, name5, blockstore, context, options) => {
  if (!context) {
    const rootBucket = (0, import_hamt_sharding2.createHAMT)({ hashFn });
    context = {
      rootBucket,
      hamtDepth: 1,
      lastBucket: rootBucket
    };
  }
  await addLinksToHamtBucket(node.Links, context.lastBucket, context.rootBucket);
  const position = await context.rootBucket._findNewBucketAndPos(name5);
  let prefix = toPrefix(position.pos);
  const bucketPath = toBucketPath(position);
  if (bucketPath.length > context.hamtDepth) {
    context.lastBucket = bucketPath[context.hamtDepth];
    prefix = toPrefix(context.lastBucket._posAtParent);
  }
  const link = node.Links.find((link2) => {
    if (link2.Name == null) {
      return false;
    }
    const entryPrefix = link2.Name.substring(0, 2);
    const entryName = link2.Name.substring(2);
    if (entryPrefix !== prefix) {
      return false;
    }
    if (entryName && entryName !== name5) {
      return false;
    }
    return true;
  });
  if (!link) {
    return null;
  }
  if (link.Name != null && link.Name.substring(2) === name5) {
    return link.Hash;
  }
  context.hamtDepth++;
  const block = await blockstore.get(link.Hash, options);
  node = decode7(block);
  return findShardCid(node, name5, blockstore, context, options);
};
var find_cid_in_shard_default = findShardCid;

// node_modules/ipfs-unixfs-exporter/esm/src/utils/extract-data-from-block.js
function extractDataFromBlock(block, blockStart, requestedStart, requestedEnd) {
  const blockLength = block.length;
  const blockEnd = blockStart + blockLength;
  if (requestedStart >= blockEnd || requestedEnd < blockStart) {
    return new Uint8Array(0);
  }
  if (requestedEnd >= blockStart && requestedEnd < blockEnd) {
    block = block.slice(0, requestedEnd - blockStart);
  }
  if (requestedStart >= blockStart && requestedStart < blockEnd) {
    block = block.slice(requestedStart - blockStart);
  }
  return block;
}
var extract_data_from_block_default = extractDataFromBlock;

// node_modules/ipfs-unixfs-exporter/esm/src/utils/validate-offset-and-length.js
var import_err_code10 = __toESM(require_err_code(), 1);
var validateOffsetAndLength = (size, offset, length2) => {
  if (!offset) {
    offset = 0;
  }
  if (offset < 0) {
    throw (0, import_err_code10.default)(new Error("Offset must be greater than or equal to 0"), "ERR_INVALID_PARAMS");
  }
  if (offset > size) {
    throw (0, import_err_code10.default)(new Error("Offset must be less than the file size"), "ERR_INVALID_PARAMS");
  }
  if (!length2 && length2 !== 0) {
    length2 = size - offset;
  }
  if (length2 < 0) {
    throw (0, import_err_code10.default)(new Error("Length must be greater than or equal to 0"), "ERR_INVALID_PARAMS");
  }
  if (offset + length2 > size) {
    length2 = size - offset;
  }
  return {
    offset,
    length: length2
  };
};
var validate_offset_and_length_default = validateOffsetAndLength;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/unixfs-v1/content/file.js
var import_err_code11 = __toESM(require_err_code(), 1);
init_raw();
async function* emitBytes(blockstore, node, start, end, streamPosition = 0, options) {
  if (node instanceof Uint8Array) {
    const buf2 = extract_data_from_block_default(node, streamPosition, start, end);
    if (buf2.length) {
      yield buf2;
    }
    streamPosition += buf2.length;
    return streamPosition;
  }
  if (node.Data == null) {
    throw (0, import_err_code11.default)(new Error("no data in PBNode"), "ERR_NOT_UNIXFS");
  }
  let file;
  try {
    file = UnixFS.unmarshal(node.Data);
  } catch (err) {
    throw (0, import_err_code11.default)(err, "ERR_NOT_UNIXFS");
  }
  if (file.data && file.data.length) {
    const buf2 = extract_data_from_block_default(file.data, streamPosition, start, end);
    if (buf2.length) {
      yield buf2;
    }
    streamPosition += file.data.length;
  }
  let childStart = streamPosition;
  for (let i = 0; i < node.Links.length; i++) {
    const childLink = node.Links[i];
    const childEnd = streamPosition + file.blockSizes[i];
    if (start >= childStart && start < childEnd || end > childStart && end <= childEnd || start < childStart && end > childEnd) {
      const block = await blockstore.get(childLink.Hash, { signal: options.signal });
      let child;
      switch (childLink.Hash.code) {
        case code2:
          child = await decode7(block);
          break;
        case code3:
          child = block;
          break;
        case code:
          child = await decode6(block);
          break;
        default:
          throw Error(`Unsupported codec: ${childLink.Hash.code}`);
      }
      for await (const buf2 of emitBytes(blockstore, child, start, end, streamPosition, options)) {
        streamPosition += buf2.length;
        yield buf2;
      }
    }
    streamPosition = childEnd;
    childStart = childEnd + 1;
  }
}
var fileContent = (cid, node, unixfs, path, resolve5, depth, blockstore) => {
  function yieldFileContent(options = {}) {
    const fileSize = unixfs.fileSize();
    if (fileSize === void 0) {
      throw new Error("File was a directory");
    }
    const { offset, length: length2 } = validate_offset_and_length_default(fileSize, options.offset, options.length);
    const start = offset;
    const end = offset + length2;
    return emitBytes(blockstore, node, start, end, 0, options);
  }
  return yieldFileContent;
};
var file_default2 = fileContent;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/unixfs-v1/content/directory.js
var directoryContent = (cid, node, unixfs, path, resolve5, depth, blockstore) => {
  async function* yieldDirectoryContent(options = {}) {
    const offset = options.offset || 0;
    const length2 = options.length || node.Links.length;
    const links2 = node.Links.slice(offset, length2);
    for (const link of links2) {
      const result = await resolve5(link.Hash, link.Name || "", `${path}/${link.Name || ""}`, [], depth + 1, blockstore, options);
      if (result.entry) {
        yield result.entry;
      }
    }
  }
  return yieldDirectoryContent;
};
var directory_default = directoryContent;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/unixfs-v1/content/hamt-sharded-directory.js
var hamtShardedDirectoryContent = (cid, node, unixfs, path, resolve5, depth, blockstore) => {
  function yieldHamtDirectoryContent(options = {}) {
    return listDirectory(node, path, resolve5, depth, blockstore, options);
  }
  return yieldHamtDirectoryContent;
};
async function* listDirectory(node, path, resolve5, depth, blockstore, options) {
  const links2 = node.Links;
  for (const link of links2) {
    const name5 = link.Name != null ? link.Name.substring(2) : null;
    if (name5) {
      const result = await resolve5(link.Hash, name5, `${path}/${name5}`, [], depth + 1, blockstore, options);
      yield result.entry;
    } else {
      const block = await blockstore.get(link.Hash);
      node = decode7(block);
      for await (const file of listDirectory(node, path, resolve5, depth, blockstore, options)) {
        yield file;
      }
    }
  }
}
var hamt_sharded_directory_default = hamtShardedDirectoryContent;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/unixfs-v1/index.js
var findLinkCid = (node, name5) => {
  const link = node.Links.find((link2) => link2.Name === name5);
  return link && link.Hash;
};
var contentExporters = {
  raw: file_default2,
  file: file_default2,
  directory: directory_default,
  "hamt-sharded-directory": hamt_sharded_directory_default,
  metadata: (cid, node, unixfs, path, resolve5, depth, blockstore) => {
    return () => [];
  },
  symlink: (cid, node, unixfs, path, resolve5, depth, blockstore) => {
    return () => [];
  }
};
var unixFsResolver = async (cid, name5, path, toResolve, resolve5, depth, blockstore, options) => {
  const block = await blockstore.get(cid, options);
  const node = decode7(block);
  let unixfs;
  let next;
  if (!name5) {
    name5 = cid.toString();
  }
  if (node.Data == null) {
    throw (0, import_err_code12.default)(new Error("no data in PBNode"), "ERR_NOT_UNIXFS");
  }
  try {
    unixfs = UnixFS.unmarshal(node.Data);
  } catch (err) {
    throw (0, import_err_code12.default)(err, "ERR_NOT_UNIXFS");
  }
  if (!path) {
    path = name5;
  }
  if (toResolve.length) {
    let linkCid;
    if (unixfs && unixfs.type === "hamt-sharded-directory") {
      linkCid = await find_cid_in_shard_default(node, toResolve[0], blockstore);
    } else {
      linkCid = findLinkCid(node, toResolve[0]);
    }
    if (!linkCid) {
      throw (0, import_err_code12.default)(new Error("file does not exist"), "ERR_NOT_FOUND");
    }
    const nextName = toResolve.shift();
    const nextPath = `${path}/${nextName}`;
    next = {
      cid: linkCid,
      toResolve,
      name: nextName || "",
      path: nextPath
    };
  }
  return {
    entry: {
      type: unixfs.isDirectory() ? "directory" : "file",
      name: name5,
      path,
      cid,
      content: contentExporters[unixfs.type](cid, node, unixfs, path, resolve5, depth, blockstore),
      unixfs,
      depth,
      node,
      size: unixfs.fileSize()
    },
    next
  };
};
var unixfs_v1_default = unixFsResolver;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/raw.js
var import_err_code13 = __toESM(require_err_code(), 1);
var rawContent = (node) => {
  async function* contentGenerator(options = {}) {
    const { offset, length: length2 } = validate_offset_and_length_default(node.length, options.offset, options.length);
    yield extract_data_from_block_default(node, 0, offset, offset + length2);
  }
  return contentGenerator;
};
var resolve = async (cid, name5, path, toResolve, resolve5, depth, blockstore, options) => {
  if (toResolve.length) {
    throw (0, import_err_code13.default)(new Error(`No link named ${path} found in raw node ${cid}`), "ERR_NOT_FOUND");
  }
  const block = await blockstore.get(cid, options);
  return {
    entry: {
      type: "raw",
      name: name5,
      path,
      cid,
      content: rawContent(block),
      depth,
      size: block.length,
      node: block
    }
  };
};
var raw_default = resolve;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/dag-cbor.js
init_cid();
var import_err_code14 = __toESM(require_err_code(), 1);
var resolve2 = async (cid, name5, path, toResolve, resolve5, depth, blockstore, options) => {
  const block = await blockstore.get(cid);
  const object = decode6(block);
  let subObject = object;
  let subPath = path;
  while (toResolve.length) {
    const prop = toResolve[0];
    if (prop in subObject) {
      toResolve.shift();
      subPath = `${subPath}/${prop}`;
      const subObjectCid = CID.asCID(subObject[prop]);
      if (subObjectCid) {
        return {
          entry: {
            type: "object",
            name: name5,
            path,
            cid,
            node: block,
            depth,
            size: block.length,
            content: async function* () {
              yield object;
            }
          },
          next: {
            cid: subObjectCid,
            name: prop,
            path: subPath,
            toResolve
          }
        };
      }
      subObject = subObject[prop];
    } else {
      throw (0, import_err_code14.default)(new Error(`No property named ${prop} found in cbor node ${cid}`), "ERR_NO_PROP");
    }
  }
  return {
    entry: {
      type: "object",
      name: name5,
      path,
      cid,
      node: block,
      depth,
      size: block.length,
      content: async function* () {
        yield object;
      }
    }
  };
};
var dag_cbor_default = resolve2;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/identity.js
var import_err_code15 = __toESM(require_err_code(), 1);
init_digest();
var rawContent2 = (node) => {
  async function* contentGenerator(options = {}) {
    const { offset, length: length2 } = validate_offset_and_length_default(node.length, options.offset, options.length);
    yield extract_data_from_block_default(node, 0, offset, offset + length2);
  }
  return contentGenerator;
};
var resolve3 = async (cid, name5, path, toResolve, resolve5, depth, blockstore, options) => {
  if (toResolve.length) {
    throw (0, import_err_code15.default)(new Error(`No link named ${path} found in raw node ${cid}`), "ERR_NOT_FOUND");
  }
  const buf2 = await decode3(cid.multihash.bytes);
  return {
    entry: {
      type: "identity",
      name: name5,
      path,
      cid,
      content: rawContent2(buf2.digest),
      depth,
      size: buf2.digest.length,
      node: buf2.digest
    }
  };
};
var identity_default = resolve3;

// node_modules/ipfs-unixfs-exporter/esm/src/resolvers/index.js
var resolvers = {
  [code2]: unixfs_v1_default,
  [code3]: raw_default,
  [code]: dag_cbor_default,
  [identity2.code]: identity_default
};
function resolve4(cid, name5, path, toResolve, depth, blockstore, options) {
  const resolver = resolvers[cid.code];
  if (!resolver) {
    throw (0, import_err_code16.default)(new Error(`No resolver for code ${cid.code}`), "ERR_NO_RESOLVER");
  }
  return resolver(cid, name5, path, toResolve, resolve4, depth, blockstore, options);
}
var resolvers_default = resolve4;

// node_modules/ipfs-unixfs-exporter/esm/src/index.js
var import_it_last2 = __toESM(require_it_last());
var toPathComponents2 = (path = "") => {
  return (path.trim().match(/([^\\^/]|\\\/)+/g) || []).filter(Boolean);
};
var cidAndRest = (path) => {
  if (path instanceof Uint8Array) {
    return {
      cid: CID.decode(path),
      toResolve: []
    };
  }
  const cid = CID.asCID(path);
  if (cid) {
    return {
      cid,
      toResolve: []
    };
  }
  if (typeof path === "string") {
    if (path.indexOf("/ipfs/") === 0) {
      path = path.substring(6);
    }
    const output = toPathComponents2(path);
    return {
      cid: CID.parse(output[0]),
      toResolve: output.slice(1)
    };
  }
  throw (0, import_err_code17.default)(new Error(`Unknown path type ${path}`), "ERR_BAD_PATH");
};
async function* walkPath(path, blockstore, options = {}) {
  let { cid, toResolve } = cidAndRest(path);
  let name5 = cid.toString();
  let entryPath = name5;
  const startingDepth = toResolve.length;
  while (true) {
    const result = await resolvers_default(cid, name5, entryPath, toResolve, startingDepth, blockstore, options);
    if (!result.entry && !result.next) {
      throw (0, import_err_code17.default)(new Error(`Could not resolve ${path}`), "ERR_NOT_FOUND");
    }
    if (result.entry) {
      yield result.entry;
    }
    if (!result.next) {
      return;
    }
    toResolve = result.next.toResolve;
    cid = result.next.cid;
    name5 = result.next.name;
    entryPath = result.next.path;
  }
}
async function exporter(path, blockstore, options = {}) {
  const result = await (0, import_it_last2.default)(walkPath(path, blockstore, options));
  if (!result) {
    throw (0, import_err_code17.default)(new Error(`Could not resolve ${path}`), "ERR_NOT_FOUND");
  }
  return result;
}
async function* recursive(path, blockstore, options = {}) {
  const node = await exporter(path, blockstore, options);
  if (!node) {
    return;
  }
  yield node;
  if (node.type === "directory") {
    for await (const child of recurse(node, options)) {
      yield child;
    }
  }
  async function* recurse(node2, options2) {
    for await (const file of node2.content(options2)) {
      yield file;
      if (file instanceof Uint8Array) {
        continue;
      }
      if (file.type === "directory") {
        yield* recurse(file, options2);
      }
    }
  }
}

// node_modules/uint8arrays/esm/src/equals.js
function equals3(a, b) {
  if (a === b) {
    return true;
  }
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// node_modules/ipfs-car/dist/esm/unpack/utils/verifying-get-only-blockstore.js
init_sha2_browser();
var VerifyingGetOnlyBlockStore = class _VerifyingGetOnlyBlockStore extends BaseBlockstore {
  constructor(blockstore) {
    super();
    this.store = blockstore;
  }
  async get(cid) {
    const res = await this.store.get(cid);
    if (!res) {
      throw new Error(`Incomplete CAR. Block missing for CID ${cid}`);
    }
    if (!isValid({ cid, bytes: res })) {
      throw new Error(`Invalid CAR. Hash of block data does not match CID ${cid}`);
    }
    return res;
  }
  static fromBlockstore(b) {
    return new _VerifyingGetOnlyBlockStore(b);
  }
  static fromCarReader(cr) {
    return new _VerifyingGetOnlyBlockStore({
      // Return bytes in the same fashion as a Blockstore implementation
      get: async (cid) => {
        const block = await cr.get(cid);
        return block === null || block === void 0 ? void 0 : block.bytes;
      }
    });
  }
};
async function isValid({ cid, bytes }) {
  const hash = await sha256.digest(bytes);
  return equals3(hash.digest, cid.multihash.digest);
}

// node_modules/ipfs-car/dist/esm/unpack/index.js
async function* unpackStream(readable, { roots, blockstore: userBlockstore } = {}) {
  const carIterator = await CarBlockIterator.fromIterable(asAsyncIterable(readable));
  const blockstore = userBlockstore || new MemoryBlockStore();
  for await (const block of carIterator) {
    await blockstore.put(block.cid, block.bytes);
  }
  const verifyingBlockStore = VerifyingGetOnlyBlockStore.fromBlockstore(blockstore);
  if (!roots || roots.length === 0) {
    roots = await carIterator.getRoots();
  }
  for (const root of roots) {
    yield* recursive(root, verifyingBlockStore);
  }
}
function asAsyncIterable(readable) {
  return Symbol.asyncIterator in readable ? readable : (0, import_browser_readablestream_to_it4.default)(readable);
}

// node_modules/multiformats/esm/src/block.js
init_src();
var readonly2 = ({ enumerable = true, configurable = false } = {}) => ({
  enumerable,
  configurable,
  writable: false
});
var links = function* (source, base3) {
  if (source == null)
    return;
  if (source instanceof Uint8Array)
    return;
  for (const [key, value] of Object.entries(source)) {
    const path = [
      ...base3,
      key
    ];
    if (value != null && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const [index, element] of value.entries()) {
          const elementPath = [
            ...path,
            index
          ];
          const cid = CID.asCID(element);
          if (cid) {
            yield [
              elementPath.join("/"),
              cid
            ];
          } else if (typeof element === "object") {
            yield* links(element, elementPath);
          }
        }
      } else {
        const cid = CID.asCID(value);
        if (cid) {
          yield [
            path.join("/"),
            cid
          ];
        } else {
          yield* links(value, path);
        }
      }
    }
  }
};
var tree = function* (source, base3) {
  if (source == null)
    return;
  for (const [key, value] of Object.entries(source)) {
    const path = [
      ...base3,
      key
    ];
    yield path.join("/");
    if (value != null && !(value instanceof Uint8Array) && typeof value === "object" && !CID.asCID(value)) {
      if (Array.isArray(value)) {
        for (const [index, element] of value.entries()) {
          const elementPath = [
            ...path,
            index
          ];
          yield elementPath.join("/");
          if (typeof element === "object" && !CID.asCID(element)) {
            yield* tree(element, elementPath);
          }
        }
      } else {
        yield* tree(value, path);
      }
    }
  }
};
var get = (source, path) => {
  let node = source;
  for (const [index, key] of path.entries()) {
    node = node[key];
    if (node == null) {
      throw new Error(`Object has no property at ${path.slice(0, index + 1).map((part) => `[${JSON.stringify(part)}]`).join("")}`);
    }
    const cid = CID.asCID(node);
    if (cid) {
      return {
        value: cid,
        remaining: path.slice(index + 1).join("/")
      };
    }
  }
  return { value: node };
};
var Block = class {
  constructor({ cid, bytes, value }) {
    if (!cid || !bytes || typeof value === "undefined")
      throw new Error("Missing required argument");
    this.cid = cid;
    this.bytes = bytes;
    this.value = value;
    this.asBlock = this;
    Object.defineProperties(this, {
      cid: readonly2(),
      bytes: readonly2(),
      value: readonly2(),
      asBlock: readonly2()
    });
  }
  links() {
    return links(this.value, []);
  }
  tree() {
    return tree(this.value, []);
  }
  get(path = "/") {
    return get(this.value, path.split("/").filter(Boolean));
  }
};

// node_modules/carbites/esm/lib/treewalk/splitter.js
init_raw();

// node_modules/carbites/node_modules/@ipld/dag-cbor/esm/index.js
var esm_exports2 = {};
__export(esm_exports2, {
  code: () => code5,
  decode: () => decode10,
  encode: () => encode9,
  name: () => name4
});
init_cid();
var CID_CBOR_TAG2 = 42;
function cidEncoder2(obj) {
  if (obj.asCID !== obj) {
    return null;
  }
  const cid = CID.asCID(obj);
  if (!cid) {
    return null;
  }
  const bytes = new Uint8Array(cid.bytes.byteLength + 1);
  bytes.set(cid.bytes, 1);
  return [
    new Token(Type.tag, CID_CBOR_TAG2),
    new Token(Type.bytes, bytes)
  ];
}
function undefinedEncoder2() {
  throw new Error("`undefined` is not supported by the IPLD Data Model and cannot be encoded");
}
function numberEncoder2(num) {
  if (Number.isNaN(num)) {
    throw new Error("`NaN` is not supported by the IPLD Data Model and cannot be encoded");
  }
  if (num === Infinity || num === -Infinity) {
    throw new Error("`Infinity` and `-Infinity` is not supported by the IPLD Data Model and cannot be encoded");
  }
  return null;
}
var encodeOptions2 = {
  float64: true,
  typeEncoders: {
    Object: cidEncoder2,
    undefined: undefinedEncoder2,
    number: numberEncoder2
  }
};
function cidDecoder2(bytes) {
  if (bytes[0] !== 0) {
    throw new Error("Invalid CID for CBOR tag 42; expected leading 0x00");
  }
  return CID.decode(bytes.subarray(1));
}
var decodeOptions2 = {
  allowIndefinite: false,
  allowUndefined: false,
  allowNaN: false,
  allowInfinity: false,
  allowBigInt: true,
  strict: true,
  useMaps: false,
  tags: []
};
decodeOptions2.tags[CID_CBOR_TAG2] = cidDecoder2;
var name4 = "dag-cbor";
var code5 = 113;
var encode9 = (node) => encode3(node, encodeOptions2);
var decode10 = (data) => decode5(data, decodeOptions2);

// node_modules/carbites/esm/lib/treewalk/splitter.js
var TreewalkCarSplitter = class _TreewalkCarSplitter {
  constructor(reader, targetSize, options = {}) {
    if (typeof targetSize !== "number" || targetSize <= 0) {
      throw new Error("invalid target chunk size");
    }
    this._reader = reader;
    this._targetSize = targetSize;
    this._decoders = [
      src_exports,
      raw_exports,
      esm_exports2,
      ...options.decoders || []
    ];
  }
  async *cars() {
    const roots = await this._reader.getRoots();
    if (roots.length !== 1)
      throw new Error(`unexpected number of roots: ${roots.length}`);
    let channel;
    for await (const val of this._cars(roots[0])) {
      channel = val.channel;
      if (val.out)
        yield val.out;
    }
    if (!channel) {
      throw new Error("missing CAR writer channel");
    }
    channel.writer.close();
    yield channel.out;
  }
  async _get(cid) {
    const rawBlock = await this._reader.get(cid);
    if (!rawBlock)
      throw new Error(`missing block for ${cid}`);
    const { bytes } = rawBlock;
    const decoder = this._decoders.find((d) => d.code === cid.code);
    if (!decoder)
      throw new Error(`missing decoder for ${cid.code}`);
    return new Block({
      cid,
      bytes,
      value: decoder.decode(bytes)
    });
  }
  async *_cars(cid, parents = [], channel = void 0) {
    const block = await this._get(cid);
    channel = channel || Object.assign(CarWriter.create(cid), { size: 0 });
    if (channel.size > 0 && channel.size + block.bytes.byteLength >= this._targetSize) {
      channel.writer.close();
      const { out } = channel;
      channel = newCar(parents);
      yield {
        channel,
        out
      };
    }
    parents = parents.concat(block);
    channel.size += block.bytes.byteLength;
    channel.writer.put(block);
    for (const [, cid2] of block.links()) {
      for await (const val of this._cars(cid2, parents, channel)) {
        channel = val.channel;
        yield val;
      }
    }
    if (!channel) {
      throw new Error("missing CAR writer channel");
    }
    yield { channel };
  }
  static async fromIterable(iterable, targetSize, options) {
    const reader = await CarReader.fromIterable(iterable);
    return new _TreewalkCarSplitter(reader, targetSize, options);
  }
  static async fromBlob(blob, targetSize, options) {
    const buffer2 = await blob.arrayBuffer();
    const reader = await CarReader.fromBytes(new Uint8Array(buffer2));
    return new _TreewalkCarSplitter(reader, targetSize, options);
  }
};
function newCar(parents) {
  const ch = Object.assign(CarWriter.create(parents[0].cid), { size: parents.reduce((size, b) => size + b.bytes.byteLength, 0) });
  for (const b of parents) {
    ch.writer.put(b);
  }
  return ch;
}

// node_modules/files-from-path/esm/src/index.browser.js
async function getFilesFromPath() {
  throw new Error("Unsupported in this environment");
}
async function* filesFromPath() {
  throw new Error("Unsupported in this environment");
}

// node_modules/web3.storage/src/lib.js
var import_throttled_queue = __toESM(require_throttledQueue());

// node_modules/web3.storage/src/platform.web.js
var fetch = globalThis.fetch;
var Request = globalThis.Request;
var Response2 = globalThis.Response;
var Blob2 = globalThis.Blob;
var File = globalThis.File;
var Blockstore = MemoryBlockStore;

// node_modules/web3.storage/src/lib.js
var MAX_PUT_RETRIES = 5;
var MAX_CONCURRENT_UPLOADS = 3;
var DEFAULT_CHUNK_SIZE = 1024 * 1024 * 50;
var MAX_BLOCK_SIZE = 1048576;
var MAX_CHUNK_SIZE = 104857600;
var RATE_LIMIT_REQUESTS = 30;
var RATE_LIMIT_PERIOD = 10 * 1e3;
function createRateLimiter() {
  const throttle = (0, import_throttled_queue.default)(RATE_LIMIT_REQUESTS, RATE_LIMIT_PERIOD);
  return () => throttle(() => {
  });
}
var globalRateLimiter = createRateLimiter();
var Web3Storage = class _Web3Storage {
  /**
   * Constructs a client bound to the given `options.token` and
   * `options.endpoint`.
   *
   * @example
   * ```js
   * import { Web3Storage } from 'web3.storage'
   * const client = new Web3Storage({ token: API_TOKEN })
   * ```
   *
    @param {Service} options
   */
  constructor({
    token,
    endpoint = new URL("https://api.web3.storage"),
    rateLimiter,
    fetch: fetch2 = fetch
  }) {
    this.token = token;
    this.endpoint = endpoint;
    this.rateLimiter = rateLimiter || createRateLimiter();
    this.fetch = fetch2;
  }
  /**
   * @hidden
   * @param {string} token
   * @returns {Record<string, string>}
   */
  static headers(token) {
    if (!token) throw new Error("missing token");
    return {
      Authorization: `Bearer ${token}`,
      "X-Client": "web3.storage/js"
    };
  }
  /**
   * @param {Service} service
   * @param {Iterable<Filelike>} files
   * @param {PutOptions} [options]
   * @returns {Promise<CIDString>}
   */
  static async put({ endpoint, token, rateLimiter = globalRateLimiter, fetch: fetch2 = fetch }, files, {
    onRootCidReady,
    onStoredChunk,
    maxRetries = MAX_PUT_RETRIES,
    maxChunkSize = DEFAULT_CHUNK_SIZE,
    wrapWithDirectory = true,
    name: name5,
    signal
  } = {}) {
    if (maxChunkSize >= MAX_CHUNK_SIZE || maxChunkSize < MAX_BLOCK_SIZE) {
      throw new Error("maximum chunk size must be less than 100MiB and greater than or equal to 1MB");
    }
    const blockstore = new Blockstore();
    try {
      const { out, root } = await pack({
        input: Array.from(files).map(toImportCandidate),
        blockstore,
        wrapWithDirectory,
        maxChunkSize: MAX_BLOCK_SIZE,
        maxChildrenPerNode: 1024
      });
      onRootCidReady && onRootCidReady(root.toString());
      const car = await CarReader.fromIterable(out);
      return await _Web3Storage.putCar({ endpoint, token, rateLimiter, fetch: fetch2 }, car, { onStoredChunk, maxRetries, maxChunkSize, name: name5, signal });
    } finally {
      await blockstore.close();
    }
  }
  /**
   * @param {Service} service
   * @param {import('@ipld/car/api').CarReader} car
   * @param {PutCarOptions} [options]
   * @returns {Promise<CIDString>}
   */
  static async putCar({ endpoint, token, rateLimiter = globalRateLimiter, fetch: fetch2 = fetch }, car, {
    name: name5,
    onStoredChunk,
    maxRetries = MAX_PUT_RETRIES,
    maxChunkSize = DEFAULT_CHUNK_SIZE,
    decoders,
    signal
  } = {}) {
    if (maxChunkSize >= MAX_CHUNK_SIZE || maxChunkSize < MAX_BLOCK_SIZE) {
      throw new Error("maximum chunk size must be less than 100MiB and greater than or equal to 1MB");
    }
    const targetSize = maxChunkSize;
    const url = new URL("car", endpoint);
    const headers = {
      ..._Web3Storage.headers(token),
      "Content-Type": "application/vnd.ipld.car",
      ...name5 ? { "X-Name": encodeURIComponent(name5) } : {}
    };
    const roots = await car.getRoots();
    if (roots[0] == null) {
      throw new Error("missing root CID");
    }
    if (roots.length > 1) {
      throw new Error("too many roots");
    }
    const carRoot = roots[0].toString();
    const splitter = new TreewalkCarSplitter(car, targetSize, { decoders });
    const onCarChunk = async (car2) => {
      const carParts = [];
      for await (const part of car2) {
        carParts.push(part);
      }
      const carFile = new Blob2(carParts, { type: "application/vnd.ipld.car" });
      let body = carFile;
      if (parseInt(globalThis.process?.versions?.node) > 18) {
        body = await body.arrayBuffer();
      }
      const res = await (0, import_p_retry.default)(
        async () => {
          await rateLimiter();
          let response;
          try {
            response = await fetch2(url.toString(), {
              method: "POST",
              headers,
              body,
              signal
            });
          } catch (err) {
            throw signal && signal.aborted ? new import_p_retry.AbortError(err) : err;
          }
          if (response.status === 429) {
            throw new Error("rate limited");
          }
          const res2 = await response.json();
          if (!response.ok) {
            throw new Error(res2.message);
          }
          if (res2.cid !== carRoot) {
            throw new Error(`root CID mismatch, expected: ${carRoot}, received: ${res2.cid}`);
          }
          return res2.cid;
        },
        { retries: maxRetries }
      );
      onStoredChunk && onStoredChunk(carFile.size);
      return res;
    };
    const upload = transform(MAX_CONCURRENT_UPLOADS, onCarChunk);
    for await (const _ of upload(splitter.cars())) {
    }
    return carRoot;
  }
  /**
   * @param {Service} service
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   * @returns {Promise<Web3Response | null>}
   */
  static async get({ endpoint, token, rateLimiter = globalRateLimiter, fetch: fetch2 = fetch }, cid, options = {}) {
    const url = new URL(`car/${cid}`, endpoint);
    await rateLimiter();
    const res = await fetch2(url.toString(), {
      method: "GET",
      headers: _Web3Storage.headers(token),
      signal: options.signal
    });
    if (res.status === 429) {
      throw new Error("rate limited");
    }
    return toWeb3Response(res);
  }
  /**
   * @param {Service} service
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   * @returns {Promise<CIDString>}
   */
  /* c8 ignore next 4 */
  static async delete({ endpoint, token, rateLimiter = globalRateLimiter }, cid, options = {}) {
    console.log("Not deleting", cid, endpoint, token, rateLimiter, options);
    throw Error(".delete not implemented yet");
  }
  /**
   * @param {Service} service
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   * @returns {Promise<Status | undefined>}
   */
  static async status({ endpoint, token, rateLimiter = globalRateLimiter, fetch: fetch2 = fetch }, cid, options = {}) {
    const url = new URL(`status/${cid}`, endpoint);
    await rateLimiter();
    const res = await fetch2(url.toString(), {
      method: "GET",
      headers: _Web3Storage.headers(token),
      signal: options.signal
    });
    if (res.status === 429) {
      throw new Error("rate limited");
    }
    if (res.status === 404) {
      return void 0;
    }
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    return res.json();
  }
  /**
   * @param {Service} service
   * @param {ListOptions} [opts]
   * @returns {AsyncIterable<Upload>}
   */
  static async *list(service, { before = (/* @__PURE__ */ new Date()).toISOString(), maxResults = Infinity, signal } = {}) {
    async function listPage({ endpoint, token, rateLimiter = globalRateLimiter, fetch: fetch2 = fetch }, { before: before2, size: size2 }) {
      const search = new URLSearchParams({ before: before2, size: size2.toString() });
      const url = new URL(`user/uploads?${search}`, endpoint);
      await rateLimiter();
      return fetch2(url.toString(), {
        method: "GET",
        headers: {
          ..._Web3Storage.headers(token),
          "Access-Control-Request-Headers": "Link"
        },
        signal
      });
    }
    let count = 0;
    const size = maxResults > 100 ? 100 : maxResults;
    for await (const res of paginator(listPage, service, { before, size })) {
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("rate limited");
        }
        const errorMessage = await res.json();
        throw new Error(`${res.status} ${res.statusText} ${errorMessage ? "- " + errorMessage.message : ""}`);
      }
      const page = await res.json();
      for (const upload of page) {
        if (++count > maxResults) {
          return;
        }
        yield upload;
      }
    }
  }
  // Just a sugar so you don't have to pass around endpoint and token around.
  /**
   * Uploads files to web3.storage. Files are hashed in the client and uploaded as a single
   * [Content Addressed Archive(CAR)](https://github.com/ipld/specs/blob/master/block-layer/content-addressable-archives.md).
   * Takes a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob)
   *
   * Returns the corresponding Content Identifier (CID).
   *
   * @example
   * ```js
   * const file = new File(['hello world'], 'hello.txt', { type: 'text/plain' })
   * const cid = await client.put([file])
   * ```
   * @param {Iterable<Filelike>} files
   * @param {PutOptions} [options]
   */
  put(files, options) {
    return _Web3Storage.put(this, files, options);
  }
  /**
     * Uploads a CAR ([Content Addressed Archive](https://github.com/ipld/specs/blob/master/block-layer/content-addressable-archives.md)) file to web3.storage.
     * Takes a CarReader interface from @ipld/car
     *
     * Returns the corresponding Content Identifier (CID).
     *
     * @example
     * ```js
     * import fs from 'fs'
     * import { Readable } from 'stream'
     * import { CarReader, CarWriter } from '@ipld/car'
     * import * as raw from 'multiformats/codecs/raw'
     * import { CID } from 'multiformats/cid'
     * import { sha256 } from 'multiformats/hashes/sha2'
     *
     * async function getCar() {
     *    const bytes = new TextEncoder().encode('random meaningless bytes')
     *    const hash = await sha256.digest(raw.encode(bytes))
     *    const cid = CID.create(1, raw.code, hash)
     *
     *    // create the writer and set the header with a single root
     *    const { writer, out } = await CarWriter.create([cid])
     *    Readable.from(out).pipe(fs.createWriteStream('example.car'))
  
     *    // store a new block, creates a new file entry in the CAR archive
     *    await writer.put({ cid, bytes })
     *    await writer.close()
  
     *    const inStream = fs.createReadStream('example.car')
     *    // read and parse the entire stream in one go, this will cache the contents of
     *    // the car in memory so is not suitable for large files.
     *    const reader = await CarReader.fromIterable(inStream)
     *    return reader
     * }
     *
     * const car = await getCar()
     * const cid = await client.putCar(car)
     * ```
     * @param {import('@ipld/car/api').CarReader} car
     * @param {PutCarOptions} [options]
     */
  putCar(car, options) {
    return _Web3Storage.putCar(this, car, options);
  }
  /**
   * Fetch the Content Addressed Archive by its root CID.
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   */
  get(cid, options) {
    return _Web3Storage.get(this, cid, options);
  }
  /**
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   */
  /* c8 ignore next 3 */
  delete(cid, options) {
    return _Web3Storage.delete(this, cid, options);
  }
  /**
   * Fetch info on Filecoin deals and IPFS pins that a given CID is replicated in.
   * @param {CIDString} cid
   * @param {RequestOptions} [options]
   */
  status(cid, options) {
    return _Web3Storage.status(this, cid, options);
  }
  /**
   * Find all uploads for this account. Use a `for await...of` loop to fetch them all.
   * @example
   * Fetch all the uploads
   * ```js
   * const uploads = []
   * for await (const item of client.list()) {
   *    uploads.push(item)
   * }
   * ```
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
   * @param {ListOptions} [opts]
   * @returns {AsyncIterable<Upload>}
   */
  list(opts) {
    return _Web3Storage.list(this, opts);
  }
};
async function toWeb3File({ content, path, cid }) {
  const chunks = [];
  for await (const chunk of content()) {
    chunks.push(chunk);
  }
  const file = new File(chunks, toFilenameWithPath(path));
  return Object.assign(file, { cid: cid.toString() });
}
function toFilenameWithPath(unixFsPath) {
  const slashIndex = unixFsPath.indexOf("/");
  return slashIndex === -1 ? unixFsPath : unixFsPath.substring(slashIndex + 1);
}
function toWeb3Response(res) {
  const response = Object.assign(res, {
    unixFsIterator: async function* () {
      if (!res.ok) {
        throw new Error(`Response was not ok: ${res.status} ${res.statusText} - Check for { "ok": false } on the Response object before calling .unixFsIterator`);
      }
      if (!res.body) {
        throw new Error("No body on response");
      }
      const blockstore = new Blockstore();
      try {
        for await (const entry of unpackStream(res.body, { blockstore })) {
          yield entry;
        }
      } finally {
        await blockstore.close();
      }
    },
    files: async () => {
      if (!res.ok) {
        throw new Error(`Response was not ok: ${res.status} ${res.statusText} - Check for { "ok": false } on the Response object before calling .files`);
      }
      const files = [];
      for await (const entry of response.unixFsIterator()) {
        if (entry.type === "directory") {
          continue;
        }
        const file = await toWeb3File(entry);
        files.push(file);
      }
      return files;
    }
  });
  return response;
}
function toImportCandidate(file) {
  let stream;
  return {
    path: file.name,
    get content() {
      stream = stream || file.stream();
      return stream;
    }
  };
}
async function* paginator(fn, service, opts) {
  let res = await fn(service, opts);
  yield res;
  let link = parseLinkHeader(res.headers.get("Link") || "");
  while (link && link.next) {
    res = await fn(service, link.next);
    yield res;
    link = parseLinkHeader(res.headers.get("Link") || "");
  }
}
export {
  Blob2 as Blob,
  File,
  Web3Storage,
  createRateLimiter,
  filesFromPath,
  getFilesFromPath
};
//# sourceMappingURL=web3__storage.js.map
