const dgram = require('dgram');
const crc16ccitt = require('crc/crc16ccitt');
const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');
const fs = require('fs');
const crc = require('crc');

const STATUS_PORT = 45454;
const CMD_PORT = 45455;
let Host = "10.0.0.153";

const CMD_STANDBY = 0x0001;
const CMD_ON      = 0x0101;
const CMD_VOL     = 0x0004;
const CMD_SOURCE  = 0x0005;
const CMD_MUTE    = 0x0107;
const CMD_UNMUTE  = 0x0007;

let packet_cnt = Math.random() * 65535, cmd_cnt = Math.random() * 65535;
let onStatus = function() {};
let sendQueue = [], sleep;
let status = {vol:0};

//--------------------------------------------------------------
server.on('message', function(msg, rinfo) {

  status.source = 'OFF';

  let b307 = msg.readUInt8(307);
  status.on = (b307 & 0x80) > 0;
  status.startup = (b307 & 0x08) > 0;

  let b308 = msg.readUInt8(308);
  status.sourceNr = (b308 & 0x3C) >> 2;  // 4 Bit
  status.mute     = (b308 >> 1) & 0x01;

//  let uptime = msg.readUInt32BE(0x014B);  // runs even when Devialet is off

/*  
  if(lastBuf) {
    let txt = '';

    for(var i=4; i < 332; i++) {
      if(msg.readUInt8(i) != lastBuf.readUInt8(i)) {
        txt += ` byte ${i} ${lastBuf.readUInt8(i).toString(2)} > ${msg.readUInt8(i).toString(2)}`
      }
    }

    if(txt.length) {
      console.log(txt);
    }

  }

  lastBuf = msg;
*/

  let e = 53 + 17 * status.sourceNr;
      
  for(; e < 53 + 17 * status.sourceNr + 16; e++) 
  {
    let chr = msg.readUInt8(e);
    
    if(chr == 0)
      break;
  }

  status.source = msg.toString('utf-8', 53 + 17 * status.sourceNr, e);
  
  status.vol = msg.readUInt8(310);
  status.vol = (status.vol - 195) / 2; // -97.5 - +30 dB  (127.5)

  // fs.writeFileSync('devialet.dat', msg);

  onStatus(status);
});

server.on('listening', function() {
  var address = server.address();
  console.log(`devialet listening`, address);
});

server.on('error', function(err) {
  console.log(`Error listening on port ${STATUS_PORT}`, err);
});

server.bind(STATUS_PORT);

//--------------------------------------------------------------
function sendPacket(msg) {

  msg.writeUInt8(0x44, 0);  // magic value
  msg.writeUInt8(0x72, 1);
  
  msg.writeUInt16BE(packet_cnt, 2);
  
  packet_cnt++;
  if(packet_cnt > 65535) {
    packet_cnt = 0;
  }
  
  let crc = crc16ccitt(msg.subarray(0, 12));
  msg.writeUInt16BE(crc, 12);
  
  sendQueue.push(msg);

  if(!sleep) {
    sendNext();
  }
}

//--------------------------------------------------------------
function sendNext() {

  let msg = sendQueue.shift();

  if(!msg) {
    return;
  }

  sleep = setTimeout(function() {
    sleep = null;
    sendNext();
  }, 50);

  client.send(msg, 0, msg.length, CMD_PORT, Host, function(err, bytes) {
    if (err) {
      console.log('devialet error', err);
    }
  });

}

//--------------------------------------------------------------
module.exports = {

  //--------------------------------------------------------------
  configure: function(options) {
    if(options['host']) {
      Host = options.host;
    }
  },

  //--------------------------------------------------------------
  power: function(on) {

    console.log(`devialet power > ${on}`);    

    const msg = Buffer.alloc(142);
    msg.writeUInt16BE(++cmd_cnt, 4);
    msg.writeUInt16BE( on ? CMD_ON : CMD_STANDBY, 6);

    sendPacket(msg);
  },

  //--------------------------------------------------------------
  mute: function(on) {

    console.log(`devialet mute > ${on}`);

    const msg = Buffer.alloc(142);
    msg.writeUInt16BE(++cmd_cnt, 4);
    msg.writeUInt16BE( on ? CMD_MUTE : CMD_UNMUTE, 6);

    sendPacket(msg);
  },

  //--------------------------------------------------------------
  vol: function(db) {

    db = Math.floor(db * 2) / 2;  // round to 0.5

    if(db == status.vol) {
      return;
    }

    console.log(`devialet volume > ${db}`);

    function db_convert(db) {

      let db_abs = Math.abs(db);
      let val = 0;

      while(db_abs > 0) {

        if(db_abs == 0.5) {
          val += 0x3F00;
        } else {
          val += 256 >> Math.ceil(1 + Math.log2(db_abs));
        }

        db_abs -= 0.5;
      }

      if(db < 0) {
        val |= 0x8000;
      }
  
      return val;
    }

    let val = db_convert(db);

    const msg = Buffer.alloc(142);
    msg.writeUInt16BE(++cmd_cnt, 4);
    msg.writeUInt16BE( CMD_VOL, 6);
    msg.writeUInt16BE( val, 8);

    sendPacket(msg);

    status.vol = db;
  },

  //--------------------------------------------------------------
  source: function(nr) {

    console.log(`devialet source > ${nr}`);

    const msg = Buffer.alloc(142);
    msg.writeUInt16BE(++cmd_cnt, 4);
    msg.writeUInt16BE( CMD_SOURCE, 6);

    let val = 0x4000 | (nr << 5);

    msg.writeUInt8( (val & 0xFF00) >> 8, 8);

    if(nr > 7) {
      msg.writeUInt8( (val & 0x00FF) >> 1, 9);
    } else {
      msg.writeUInt8(  val & 0x00FF, 9);
    }

    sendPacket(msg);
  },

  //--------------------------------------------------------------
  on(msg, func) {
    if(msg == 'status') {
      onStatus = func;
    }
  },

  //--------------------------------------------------------------
  calcConfigFilesCRC(fileName) {

    // read config file
    let cfg = fs.readFileSync(fileName);

    // remove first line but keep CRLF
    let data = cfg.slice(7);

    // calc CRC
    let crc16 = crc.crc16ccitt(data).toString(16).toUpperCase();

    // insert new CRC into buffer
    cfg.write(crc16, 3);

    // write fixed file to disk
    fs.writeFileSync(fileName, cfg);
  }

}

