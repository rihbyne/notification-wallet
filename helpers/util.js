/*global require, module, console */
/*jslint node: true */
"use strict";

var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module

var from_who            = process.env.DO_NOT_REPLY;						// Sender of Email
var api_key             = process.env.MAILGUN_API_KEY;			// Api Key For Mailgun
var domain              = process.env.DOMAIN;								// Domain Name

var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object

var smsLoginId 			= process.env.PRIMARY_SMS_GATEWAY_ID;;
var smsPass				= process.env.PRIMARY_SMS_PWD;
var optins				= process.env.SMS_OPTINS;

var async				= require('async');

var log = require('../config/logging')()
module.exports.sendJsonResponse = function (res, status, errCode, errMsg) {
  res.contentType('application/json')
  //  res.status(status)
  //  res.json(content)

  res.status(status).send({
    errCode: errCode,
    errMsg: errMsg
  })
}

module.exports.validateEmail = function(email){
    var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
	return re.test(email);
}

module.exports.validateParameter = function (parameter, name) {
  if (parameter === undefined || parameter.length <= 0) {
    log.error(name + ' Is Missing')
    return false
  }

  return true
}

module.exports.masterNotification = function(data, cb){

	//notification_code, to, subject, email_body, smsText, mobileNumber,
	
	var notification_code 	= data.notification_code;
	var to 					= data.to;
	var subject 			= data.subject;
	var email_body 			= data.email_body;
	var smsText 			= data.smsText;
	var mobileNumber 		= data.mobileNumber;

	var possibleResponse = {};
	
	async.parallel([

		email,
		sms,
		pushNotification

	], function(err, result) {

		if(err)
		{
			console.log(err);
			cb(err);
			return;
		}
		
		console.log(possibleResponse);
		cb(possibleResponse)

	});
	
	function email(callback){
	
		if(2&parseInt(notification_code))
		{
			var mailOptions = {
				from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
				to: to, 								            // List of Receivers
				subject: subject, 		                            // Subject line
				text: email_body,
				html: email_body
			};

			mailgun.messages().send(mailOptions, function(err, mailResponse){

				//Error In Sending Email
				if (err) {

					console.log('Mail Not Sent');
					console.log(err);
					possibleResponse.mail = err;
				}
				
				else
				{
					console.log('Mail Sent Successfully');
					possibleResponse.mail = mailResponse.message;
				}
				
				callback(null, possibleResponse);
				
			});
		}
		
		else
		{
			callback(null, possibleResponse);
		}
	
	}

	function sms(callback){
		
		if(4&parseInt(notification_code))
		{
			var smsURL = 'http://onlinesms.in/api/sendValidSMSdataUrl.php?login='+smsLoginId+'&pword='+smsPass+'&msg='+smsText+'&senderid='+optins+'&mobnum='+mobileNumber;
							
			request(smsURL, function (error, response, body) {

				if(error) 
				{
					console.log('SMS Not Sent');
					console.log(error);
					possibleResponse.sms = error;
				}
				
				else if(response.statusCode == 200)
				{
					console.log('SMS Sent Successfully');
					// console.log('sms res : '+util.inspect(body));	
					possibleResponse.sms = "SMS Sent";
				}
			
				callback(null, possibleResponse);
			
			})
		}
		
		else
		{
			callback(null, possibleResponse);
		}
	
	}
	
	function pushNotification(callback){
		
		if(1&parseInt(notification_code))
		{
			//console.log("Push Notification");
			callback(null, possibleResponse);
		}
		
		else
		{
			callback(null, possibleResponse);
		}
	
	}

	// console.log(util.inspect(possibleResponse));
	
	// cb(possibleResponse);
}
