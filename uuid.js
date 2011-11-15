(function() {
  /*
  * Generate a RFC4122(v4) UUID
  *
  * Documentation at https://github.com/broofa/node-uuid
  */

  // Use node.js Buffer class if available, otherwise use the Array class
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Buffer used for generating string uuids
  var _buf = new BufferClass(16);

  // Cache number <-> hex string for octet values
  var toString = [];
  var toNumber = {};
  for (var i = 0; i < 256; i++) {
    toString[i] = (i + 0x100).toString(16).substr(1);
    toNumber[toString[i]] = i;
  }

  function parse(s) {
    var buf = new BufferClass(16);
    var i = 0;
    s.toLowerCase().replace(/[0-9a-f][0-9a-f]/g, function(octet) {
      buf[i++] = toNumber[octet];
    });
    return buf;
  }

  function unparse(buf) {
    var tos = toString, b = buf;
    return tos[b[0]] + tos[b[1]] + tos[b[2]] + tos[b[3]] + '-' +
           tos[b[4]] + tos[b[5]] + '-' +
           tos[b[6]] + tos[b[7]] + '-' +
           tos[b[8]] + tos[b[9]] + '-' +
           tos[b[10]] + tos[b[11]] + tos[b[12]] +
           tos[b[13]] + tos[b[14]] + tos[b[15]];
  }

  var ff = 0xff;

  // Feature detect for the WHATWG crypto API. See
  // http://wiki.whatwg.org/wiki/Crypto
  var useCrypto = this.crypto && crypto.getRandomValues;
  var rnds = useCrypto ? new Uint32Array(4) : new Array(4);

  function uuid(fmt, buf, offset) {
    var b = fmt != 'binary' ? _buf : (buf ? buf : new BufferClass(16));
    var i = buf && offset || 0;

    if (useCrypto) {
      crypto.getRandomValues(rnds);
    } else {
      rnds[0] = Math.random()*0x100000000;
      rnds[1] = Math.random()*0x100000000;
      rnds[2] = Math.random()*0x100000000;
      rnds[3] = Math.random()*0x100000000;
    }

    var r = rnds[0];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;
    r = rnds[1];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & 0x0f | 0x40; // See RFC4122 sect. 4.1.3
    b[i++] = r>>>24 & ff;
    r = rnds[2];
    b[i++] = r & 0x3f | 0x80; // See RFC4122 sect. 4.4
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;
    r = rnds[3];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;

    return fmt === undefined ? unparse(b) : b;
  }

  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html
  function v1(fmt, buf, offset) {
    var b = fmt != 'binary' ? _buf : (buf ? buf : new BufferClass(16));
    var i = buf && offset || 0;

    if (useCrypto) {
      crypto.getRandomValues(rnds);
    } else {
      rnds[0] = Math.random()*0x100000000;
      rnds[1] = Math.random()*0x100000000;
      rnds[2] = Math.random()*0x100000000;
    }

    // Timestamp, see 4.1.4
    // 12219292800000 is the number of milliseconds between
    // UUID epoch 1582-10-15 00:00:00 and UNIX epoch.
    var now = (new Date().getTime());
    var timestamp = now + 12219292800000;
    var tl = ((timestamp & 0xfffffff) * 10000) % 0x100000000;
    var tmh = ((timestamp / 0x100000000) * 10000) & 0xfffffff;
    var tm = tmh & 0xffff;
    var th = tmh >> 16;
    var thav = (th & 0xfff) | 0x1000; // Set version, see 4.1.3

    // Clock sequence, see 4.1.5.
    // Use 14 bit random unsigned integer, see 4.2.2.
    var cs = rnds[0] & 0x3fff; // Cut down 32 bit random integer to 14 bit
    var csl = cs & 0xff;
    var cshar = (cs >>> 8) | 0x80; // Set the variant, see 4.2.2

    // time_low
    b[i++] = tl>>>24 & ff;
    b[i++] = tl>>>16 & ff;
    b[i++] = tl>>>8 & ff;
    b[i++] = tl & ff;

    // time_mid
    b[i++] = tm>>>8 & ff;
    b[i++] = tm & ff;

    // time_high_and_version
    b[i++] = thav>>>8 & ff;
    b[i++] = thav & ff;

    // clock_seq_hi_and_reserved
    b[i++] = cshar;

    // clock_seq_low
    b[i++] = csl;

    // Use randomly generated node instead of mac address. RFC suggests
    // generating a 47 bit random integer, but we're limited to 32 bit in js.
    var r = rnds[1];
    b[i++] = r & ff | 0x01; // Set multicast bit, see 4.1.6.
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;

    r = rnds[2];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;

    return fmt === undefined ? unparse(b) : b;
  }

  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;
  uuid.v1 = v1;

  if (typeof(module) != 'undefined') {
    module.exports = uuid;
  } else {
    // In browser? Set as top-level function
    this.uuid = uuid;
  }
}());
