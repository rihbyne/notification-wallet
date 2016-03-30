/*global require, module, console */
/*jslint node: true */
"use strict";

var notificationschema  = require('../model/notification_model.js');
//var notiMessageSchema   = require('../model/notification_message_model.js');
var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module
var crypt               = require("../config/crypt");			    		// Crypt Connectivity.

var from_who            = 'donotreply@searchtrade.com';						// Sender of Email
var api_key             = 'key-2b8f2419e616db09b1297ba51d7cc770';			// Api Key For Mailgun
var domain              = 'searchtrade.com';								// Domain Name

var ip                  = 'http://192.168.2.12:5000';
var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object


// Response Function
var sendResponse = function(req, res, status, errCode, errMsg) {

    var d = Date();
    console.log(status +" "+ errCode +" "+ errMsg + " " + d);
    res.status(status).send({
        errCode: errCode, 
        errMsg: errMsg,
        dbDate: d
    });
    
}

// Email Sending Function
module.exports.sendmail = function (mailinfo, res) {

    var mailSent = false;

    mailgun.messages().send(mailinfo, function (err, cb) {

        // Error In Sending Email
        if (err) {
            
            console.log('Mail Not Sent');
            console.log(err);
            return;

        } else {
            
            mailSent = true;
            console.log('Mail Sent Successfully');
        }

        res(mailSent);
            
    });

};


// PHP Mail Functionality in Node
module.exports.sendNotification = function (req, res){
    
    var to                  = req.body.to;
    var subject             = req.body.subject;
    var email_body          = req.body.email_body;
    
    var first_name          = req.body.first_name;
    var last_name           = req.body.last_name;
    var user_id             = req.body.user_id;
    var notification_body   = req.body.notification_body;
	var notification_code	= req.body.notification_code;
    
	var publicKey			= req.body.publicKey;
	var signature			= req.body.signature;
	
	// Validate Public Key
	if(publicKey=="" || publicKey== null || publicKey==undefined)
	{
		console.log('Public Key is Missing');
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	// Validate Signature
	if(signature=="" || signature== null || signature==undefined)
	{
		console.log('Signature is Missing');
		master.sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}
	
	var notification 		= first_name+" "+last_name+", "+notification_body;
	
	var query = {publicKey:publicKey,token:true};
	
	request.post({
                                
        url: ip+'/api/getPvtKey',
        body: query,
        json: true,
        headers: {"content-type": "application/json"}

    },function optionalCallback(err, httpResponse, body){

        if (err)
        {
            return console.error('Curl request Failed for register api: \n', err);
        }
        
		if(body.errCode == -1)
		{
			var privateKey = body.errMsg;
			var text = 'to='+to+'&subject='+subject+'&first_name='+first_name+'&last_name='+last_name+'&user_id='+user_id+'&notification_code='+notification_code+'&publicKey='+publicKey;
			
			crypt.validateSignature(text, signature, privateKey, function(isValid){
            
				// Signature Not Matched
				if (!isValid)
				{
					console.log('Invalid Signature');
					sendResponse(req, res, 200, 14, "Invalid Signature");
					return;
				}
				
				else
				{
					if(1&parseInt(notification_code))
					{
						console.log("Send Email");
						
						var mailOptions = {
							from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
							to: to, 								            // List of Receivers
							subject: subject, 		                            // Subject line
							text: email_body,									// Text
							html: email_body
						};
					
						mailgun.messages().send(mailOptions, function(err, cb){
							
							//Error In Sending Email
							if (err) {
								
								console.log('Mail Not Sent');
								console.log(err);
								sendResponse(req, res, 200, 29, "Email Sending Error");
								return;

							}
							
							console.log('Mail Sent Successfully');
	
						});
					}

					if(2&parseInt(notification_code))
					{
						console.log("Send SMS");		
					}
					
					if(4&parseInt(notification_code))
					{
						console.log("Push Notification");		
					}
					
					var notification_message = new notificationschema.notification_msg({ 
						user_id: user_id, 	                    // User Id
						notification_body: notification	        // Text
					});

					notification_message.save(function(err){

						if(err)
						{
						  console.log(err);
						  return err;
						}

						console.log('Saved SuccessFully');
						sendResponse(req, res, 200, -1, "Success");

					});
					
				}
				
			})
		}
		
		else
		{
			master.sendResponse(req, res, 200, body.errCode, body.errMsg);
		}
        
    });
    
}

// Getting Notification Status
module.exports.getNotificationStatus = function (email, cb){
    
    var email = {email:email};
    
    request.post({
                                
        url: ip+'/secure/getNotificationStatus',
        body: email,
        json: true,
        headers: {"content-type": "application/json"}

    },function optionalCallback(err, httpResponse, body){

        if (err)
        {
            return console.error('Curl request Failed for register api: \n', err);
        }
        
        cb(body.errMsg);
        
    });

}

var getNotificationStatus = module.exports.getNotificationStatus;