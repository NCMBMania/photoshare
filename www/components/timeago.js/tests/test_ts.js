"use strict";
// just test typescript can be compiled and ran.
// TODO: if trace or error, travis-ci will error
exports.__esModule = true;
console.log('run typescript.');
var __1 = require("..");
var timeagoInstance = __1["default"]();
console.log(timeagoInstance.format('01-01-2017'));
