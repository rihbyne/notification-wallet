"use strict";

//var socketFile			= require('./socket.js');
var mongo               = require('./config/mongo.js');
var notificationschema  = require('./model/notification_model.js');
var app                 = require('express')();
var http              	= require('http');
var fs 					= require('fs');
var bodyParser          = require('body-parser');
var notification        = require('./api/notification.js');
var mailer              = require('./api/mail.js');                     // Mail Functionality
var morgan    			= require('morgan');            				// Log To Console
// var io 					= require('socket.io');
var io 					= require('./api/socket.js');
//var socket_func 		= require('./socket.js')

app.use(morgan('dev'));													// Morgan To log Request To Console
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// app.set('view engine', 'ejs');

// app.get('/', function (req, res) {
  // res.sendFile(__dirname + '/index.html');
// });

app.post('/secure/sendVerificationEmail', notification.sendVerificationEmail);
app.post('/secure/sendforgotpassword', notification.sendforgotpassword);
app.post('/secure/changePassEmail', notification.changePassEmail);
app.post('/secure/resettedConfirmation', notification.resettedConfirmation);
app.post('/secure/sendNotification', mailer.sendNotification);
app.post('/secure/sendRejectBidNotification', mailer.sendRejectBidNotification);
// app.post('/secure/getNotificationStatus', mailer.getNotificationStatus);
app.post('/secure/getMyNotification', notification.getMyNotification);
//app.post('/secure/socketEventTrigger', socket_func);

app = app.listen(4100);
io 	= io.listen(app);
io.attach(app);
