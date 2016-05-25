"use strict";

//var socketFile				= require('./socket.js');
var mongo               		= require('./config/mongo.js');
var notificationschema  		= require('./model/notification_model.js');
var app                 		= require('express')();
var http              			= require('http');
var fs 							= require('fs');
var bodyParser          		= require('body-parser');
var notification        		= require('./api/notification.js');
var social_notification        	= require('./api/social_notification.js');
var social_mention_notification = require('./api/social_mention_notification.js');
var mailer              		= require('./api/mail.js');                     // Mail Functionality
var morgan    					= require('morgan');            				// Log To Console
// var io 						= require('socket.io');
var io 							= require('./api/socket.js');
//var socket_func 				= require('./socket.js')

app.use(morgan('dev'));													// Morgan To log Request To Console
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

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


// ******************************************************************** //


// app.post('/secure/sendPHPmail', mailer.sendPHPmail);
// app.post('/secure/getNotificationStatus', mailer.getNotificationStatus);
//app.post('/secure/getMyNotification', notification.getMyNotification);
//app.post('/secure/socketEventTrigger', socket_func);

// app.post('/secure/followNotification', social_notification.followNotification);
// app.post('/secure/followNotification', social_notification.followNotification);
// app.post('/secure/followNotification', social_notification.followNotification);


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/inbox.html');
});

app = app.listen(4100);
io 	= io.listen(app);
io.attach(app);
