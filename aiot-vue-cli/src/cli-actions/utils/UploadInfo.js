const si = require('systeminformation');
const request = require('request')
const md5 = require('md5-node')
const os = require('os');
const pkgJson = require('../../../package.json');
const store = require('data-store')({ path: os.homedir() + '/.aiot-cli.conf' });

module.exports = function (event, param) {
  //return new Promise((resolve) => {
  //  si.uuid()
  //    .then((data) => {
  //        let version = pkgJson.version
  //        let device_name = md5(data.os)
  //        if (event == "activity") {
  //          let url = 'http://gm.mmstat.com/HaaS-UI-Data.HaaS-UI.Activity-and-Activation-Upload?' + 'device_name=' + device_name + '&event=activity' + '&operation=' + param + '&time=' + Date.now() + '&version=' + version + '&platform=' + os.type() + '&type=haasui_cli' + '&t={' + Date.now() + '}';
  //          request.get(url).on('error', err => {
  //            console.log(`access1 gm.mmstat.com failed ${err}`)
  //          })
  //        } else if (event == "activation") {
  //          let isActivated = store.get('isActivated', false)
  //          if (isActivated == false) {
  //            let url = 'http://gm.mmstat.com/HaaS-UI-Data.HaaS-UI.Activity-and-Activation-Upload?' + 'device_name=' + device_name + '&event=activation' + '&time=' + Date.now() + '&version=' + version + '&platform=' + os.type() + '&type=haasui_cli' + '&t={' + Date.now() + '}';
  //            request.get(url).on('response', function(response) {
  //              if (response.statusCode == 200) {
  //                store.set('isActivated', true)
  //                store.set('device_name', device_name)
  //              }
  //            }).on('error', err => {
  //              console.log(`access2 gm.mmstat.com failed ${err}`)
  //            })
  //          }
  //        }
  //        resolve('UUID get success!');
  //    })
  //    .catch(() => {
  //      resolve('UUID get failed!');
  //    });
  //});
};
