"use strict";

var mongo               = require('./config/mongo.js');
var notificationschema  = require('./model/notification_model.js');
var app                 = require('express')();
var server              = require('http').Server(app);
var bodyParser          = require('body-parser');
var notification        = require('./api/notification.js');  
var mailer              = require('./api/mail.js');                     // Mail Functionality
var morgan    			= require('morgan');            				// Log To Console

app.use(morgan('dev'));													// Morgan To log Request To Console

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.set('view engine', 'ejs');  

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post('/secure/sendVerificationEmail', notification.sendVerificationEmail);
app.post('/secure/sendforgotpassword', notification.sendforgotpassword);
app.post('/secure/changePassEmail', notification.changePassEmail);
app.post('/secure/resettedConfirmation', notification.resettedConfirmation);
app.post('/secure/sendNotification', mailer.sendNotification);
app.post('/secure/sendRejectBidNotification', mailer.sendRejectBidNotification);
app.post('/secure/getNotificationStatus', mailer.getNotificationStatus);

app.post('/secure/getMyNotification', notification.getMyNotification);

server.listen(4100, function(){
	console.log('Connected To server at port 4000 with socket');
});
