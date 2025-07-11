const base32 = {
  byte_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".split(''),
  string_map: {'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7,'I':8,'J':9,'K':10,'L':11,'M':12,'N':13,'O':14,'P':15,'Q':16,'R':17,'S':18,'T':19,'U':20,'V':21,'W':22,'X':23,'Y':24,'Z':25,'2':26,'3':27,'4':28,'5':29,'6':30,'7':31},
  encode: function(input) {
    // https://github.com/emn178/hi-base32
    input = new TextEncoder().encode(input);
    var output = '';
    for (var i = 0, length = input.length; i < length; i = i + 5) {
      var a = input[i];
      var b = input[i + 1];
      var c = input[i + 2];
      var d = input[i + 3];
      var e = input[i + 4];
      output += this.byte_map[a >> 3];
      output += this.byte_map[((a & 7) << 2) | (b >> 6)];
      if (isNaN(b)) {
        output += '======';
        break;
      }
      output += this.byte_map[((b & 63) >> 1)];
      output += this.byte_map[((b & 1) << 4) | (c >> 4)];
      if (isNaN(c)) {
        output += '====';
        break;
      }
      output += this.byte_map[((c & 15) << 1) | (d >> 7)];
      if (isNaN(d)) {
        output += '===';
        break;
      }
      output += this.byte_map[((d & 127) >> 2)];
      output += this.byte_map[((d & 3) << 3) | (e >> 5)];
      if (isNaN(e)) {
        output += '=';
        break;
      }
      output += this.byte_map[e & 31];
    }
    return output;
  },
  decode: function(input) {
    // https://github.com/emn178/hi-base32
    input = input.toUpperCase().replace(/=+$/, '');
    var output = new Uint8Array(input.length * 5 / 8 | 0);
    for (var i = 0, j = 0, length = input.length; i < length; i = i + 8) {
      var a = this.string_map[input[i]];
      var b = this.string_map[input[i + 1]];
      var c = this.string_map[input[i + 2]];
      var d = this.string_map[input[i + 3]];
      var e = this.string_map[input[i + 4]];
      var f = this.string_map[input[i + 5]];
      var g = this.string_map[input[i + 6]];
      var h = this.string_map[input[i + 7]];
      output[j++] = (a << 3) | (b >> 2);
      if (c === undefined) { break; }
      output[j++] = ((b & 3) << 6) | (c << 1) | (d >> 4);
      if (e === undefined) { break; }
      output[j++] = ((d & 15) << 4) | (e >> 1);
      if (f === undefined) { break; }
      output[j++] = ((e & 1) << 7) | (f << 2) | (g >> 3);
      if (h === undefined) { break; }
      output[j++] = ((g & 7) << 5) | h;
    }
    return new TextDecoder().decode(output);
  }
};
