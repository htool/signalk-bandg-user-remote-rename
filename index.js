const util = require('util')
const _ = require('lodash')
var globalOptions = []
const renamePGN = '%s,3,130833,%s,255,%s,'


module.exports = function (app) {
  var plugin = {}
  var unsubscribes = []
  var timers = []

  plugin.id = 'signalk-bandg-user-remote-rename';
  plugin.name = 'B&G User1-32 and Remote0-9 rename';
  plugin.description = 'Rename B&G custom User1-32 and Remote0-9 data types to display on Vulcan/Zeus/Triton2';

  var schema = {
    // The plugin schema
    properties: {
      'null': {
        'title': 'Set new names for data types',
        'type': 'null',
      },
    }
  }

  function sendN2k(msgs) {
    app.debug("n2k_msg: " + msgs)
    msgs.map(function(msg) { app.emit('nmea2000out', msg)})
  }

  let userCodes = [
    '38,00',  // 1
    '39,00',  // 2
    '3a,00',  // 3
    '3b,00',  // 4
    '10,00',  // 5
    '11,00',  // 6
    '12,00',  // 7
    '13,00',  // 8
    '14,00',  // 9
    '15,00',  // 10
    '16,00',  // 11
    '17,00',  // 12
    '18,00',  // 13
    '19,00',  // 14
    '1a,00',  // 15
    '1b,00',  // 16
    '0d,13',  // 17
    '0e,13',  // 18
    '0f,13',  // 19
    '00,14',  // 20
    '01,14',  // 21
    '02,14',  // 22
    '03,14',  // 23
    '04,14',  // 24
    '05,14',  // 25
    '06,14',  // 26
    '07,14',  // 27
    '08,14',  // 28
    '09,14',  // 29
    '0a,14',  // 30
    '0b,14',  // 31
    '0c,14'   // 32
  ]

  let remoteCodes = [
    'ef,00',
    'f0,00',
    'f1,00',
    'f2,00',
    'f3,00',
    'f4,00',
    'f5,00',
    'f6,00',
    'f7,00',
    'f8,00'
  ]

  let supportedValues = {}

  // Add User1-32
  for (let i=0; i < userCodes.length; i++) {
    let user='user' + (i+1)
    let User='User ' + (i+1)
    let element = {
      'name'        : User,
      'code'        : userCodes[i]
    }
    supportedValues[user] = element
  };

  // Add Remote0-9
  for (let i=0; i < remoteCodes.length; i++) {
    let remote='remote' + i
    let Remote='Remote' + i
    let element = {
      'name'        : Remote,
      'code'        : remoteCodes[i]
    }
    supportedValues[remote] = element
  };

  async function sendRename() {
    for (var name in supportedValues) {
      var renamePGN_2 = '7d,99,' + supportedValues[name].code + ','
      
      // Create decimals hex
      var decimals = globalOptions[name]['decimals']
      if (decimals == "auto") { decimals = 254 }
      decimals = intToHex(decimals)
      renamePGN_2 += 'ff,' + decimals 

      // Get names and trim to max length
      var newName = globalOptions[name]['newName'].substring(0,7)
      var newLongName = globalOptions[name]['newLongName'].substring(0,16)

      app.debug('globalOptions[%s] newName: %s, newLongName: %s, decimals: %s', name, newName, newLongName, decimals);
      renamePGN_2 += ',' + stringToHex(newName).padEnd(23, ',00') + ',' + stringToHex(newLongName) + ',00'
      var length = intToHex(Math.round(renamePGN_2.length + 1) / 3)
      var msg = util.format(renamePGN + renamePGN_2, (new Date()).toISOString(), 20, length)
      sendN2k([msg])
      await delay(1000)
    }
  }


  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  function updateSchema() {
    Object.keys(supportedValues).forEach(key => {
      var obj =  {
        type: 'object',
        title: supportedValues[key]['name'],
        properties: {
          newName: {
            type: 'string',
            title: 'New data type name (max 8 characters)',
            default: supportedValues[key]['name']
          },
          newLongName: {
            type: 'string',
            title: 'New data type long name (max 16 characters)',
            default: supportedValues[key]['name']
          },
          decimals: {
            enum: ['0','1','2','3','4','auto'],
            title: 'Number of decimals',
            default: 'auto'
          }
        }
      }
      schema.properties[key] = obj;
    });
    app.debug('schema: %j', schema);
  }

  updateSchema()

  plugin.schema = function() {
    updateSchema()
    return schema
  }


  plugin.start = function (options, restartPlugin) {
    // Here we put our plugin logic
    app.debug('Plugin started');
    var unsubscribes = [];

    globalOptions = options;
    app.debug ('%j', globalOptions)

    setTimeout(sendRename, 20000);
  };



  plugin.stop = function () {
    // Here we put logic we need when the plugin stops
    app.debug('Plugin stopped');
    plugin.stop = function () {
      unsubscribes.forEach(f => f());
      unsubscribes = [];
      timers.forEach(timer => {
        clearInterval(timer)
      }) 
    };

  };

  return plugin;
};

function padd(n, p, c)
{
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}


function intToHex(integer) {
	var hex = padd((integer & 0xff).toString(16), 2)
  return hex
}

function stringToHex (str) {
  let j = str.length
  var $ = str.charCodeAt(0).toString(16)
  for (var i = 1; i<j; i++) {
    $ += ',' + str.charCodeAt(i).toString(16);
  }
  return $;
}
