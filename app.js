"use strict";

//var socketFile			= require('./socket.js');
var express = require('express')
var fs 					        = require('fs');
var http              	= require('http');
var bodyParser          = require('body-parser');
var debug = require('debug')('Express4')
var morgan    			= require('morgan');            				// Log To Console
var cookieParser = require('cookie-parser')
var bformat = require('bunyan-format')
// var io 					= require('socket.io');

require('dotenv').config() // loads project specific process.env settings from .env
var log = require('./config/logging')()
require('./config/db.js') //keep the connection open to db when app boots/reboots

var notificationschema  			= require('./model/notification_model.js');
var notification        			= require('./api/notification.js');
var social_notification        		= require('./api/social_notification.js');
var social_mention_notification 	= require('./api/social_mention_notification.js');
var merger = require('./api/merger.js');
var mailer              			= require('./api/mail.js');                     // Mail Functionality
var io 								= require('./api/socket.js');
//var socket_func 		= require('./socket.js')

/* create http server and pass the express appln to it */
var app = require('express')()
var server = require('http').createServer(app)

app.use(morgan('dev'));													// Morgan To log Request To Console
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser())

// app.set('view engine', 'ejs');

// app.get('/', function (req, res) {
  // res.sendFile(__dirname + '/index.html');
// });

// ******************************************************************** //

// ST Default Email
app.post('/secure/sendVerificationEmail', notification.sendVerificationEmail);
app.post('/secure/sendforgotpassword', notification.sendforgotpassword);
app.post('/secure/changePassEmail', notification.changePassEmail);
app.post('/secure/resettedConfirmation', notification.resettedConfirmation);

// St Notification
app.post('/stnotify/sendnotification', mailer.sendNotification);
app.post('/stnotify/sendRejectBidNotification', mailer.sendRejectBidNotification);
app.delete('/stnotify/user/:userid', mailer.stdeletenotify);
app.get('/stnotify/user/:userid', mailer.stgetnotifydata);
app.get('/stnotify/user/:userid/count', mailer.stgetnotifycount)

// Social Simple Notification
app.post('/socialnotify/socialNotification', social_notification.socialNotification);
app.post('/socialnotify/followNotification', social_notification.followNotification);
app.delete('/socialnotify/user/:userid', social_notification.socialdeletenotify);
app.get('/socialnotify/user/:userid', social_notification.socialgetnotifydata);
app.get('/socialnotify/user/:userid/count', social_notification.socialgetnotifycount);

// Social Mention Notification
app.post('/socialmention/user', social_mention_notification.socialMentionNotification);
app.delete('/socialmention/user/:userid', social_mention_notification.deleteSocialNotify);
app.get('/socialmention/user/:userid', social_mention_notification.getsocialnotifydata);
app.get('/socialmention/user/:userid/count', social_mention_notification.countSocialMentionNotification);
// app.put('/socialmention/user/:userid', social_notification.updateSocialMentionNotify);

// All
app.delete('/allnotify/user/:userid', merger.deleteAllNotifications);
// app.get('/allnotify/user/:userid', general.getAllNotifications);

// ******************************************************************** //


// app.post('/secure/sendPHPmail', mailer.sendPHPmail);
// app.post('/secure/getNotificationStatus', mailer.getNotificationStatus);
app.post('/secure/getMyNotification', notification.getMyNotification);
app.post('/secure/missingpayment', mailer.sendMissingPaymentEmail);
//app.post('/secure/socketEventTrigger', socket_func);

/* error handling for 404 routes */
app.use(function (req, res, next) {
  var err = new Error('request not found')
  err.status = 404
  next(err)
})

// error handler middleware returns stacktraces
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error.html', {
      message: err.message,
      error: err
    })
  })
}

// production env error handler
// In prod, dont return stacktrace to the browser
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error.html', {
    message: err.message,
    error: {}
  })
})

app.use(function (req, res, next) {
  log.info('==================================')
  log.info(req.url)
  next()
})

app.set('port', process.env.NODE_SERVER_PORT || 4100)

var notifyServer = app.listen(app.get('port'), process.env.NODE_SERVER_IP || '127.0.0.1', function () {
  log.info('server listening on address ' + notifyServer.address().address + ':' + notifyServer.address().port)
  debug('server listening on port ' + notifyServer.address().port)
})

io 	= io.listen(server);
io.attach(server);
