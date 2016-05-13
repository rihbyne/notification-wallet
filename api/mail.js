/*global require, module, console */
/*jslint node: true */
"use strict";

var notificationschema  = require('../model/notification_model.js');
var http 				= require('http');
//var notiMessageSchema   = require('../model/notification_message_model.js');
var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module
var crypt               = require("../config/crypt");			    		// Crypt Connectivity.

var from_who            = 'donotreply@searchtrade.com';						// Sender of Email
var api_key             = 'key-2b8f2419e616db09b1297ba51d7cc770';			// Api Key For Mailgun
var domain              = 'searchtrade.com';								// Domain Name


var ip                  = 'http://192.168.2.26:5000';
var ipn                 = 'http://192.168.2.15:5020';

var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object
var io 					= require('./socket.js');

var smsLoginId 			= '9320027660'; //'7827572892';
var smsPass				= 'tagepuguz';	//'amit123456';
var optins				= 'OPTINS';

//var GCM 				= require('gcm').GCM;
//var gcm 				= new GCM(AIzaSyCO79TE_Cdnl2KMLbb4bxxs-P5DrsAI4WI);

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

function validateEmail(email){
    var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
	return re.test(email);
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

// Mis Payment Email
module.exports.sendEmail = function (req, res){

	var to                  = req.body.to;
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

	var mailOptions = {
		from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
		to: to, 								            // List of Receivers
		subject: subject, 		                            // Subject line
		text: email_body,
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
		sendResponse(req, res, 200, -1, "Success");
		
	});
	
}

// PHP Mail Functionality in Node
module.exports.sendNotification = function (req, res){

	var to                  = req.body.to;
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

	var first_name          = req.body.first_name;
	var last_name           = req.body.last_name;
	var user_id             = req.body.user_id;
	var smsText				= req.body.smsText;
	var mobileNumber		= req.body.mobileNumber;

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

	// Validate To
	if(to=="" || to== null || to==undefined)
	{
		console.log('Email is Missing');
		master.sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	if(!validateEmail(to))
	{
		console.log('Incorrect Email Format');
		master.sendResponse(req, res, 200, 7, "Incorrect email id format");
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
          master.sendResponse(req, res, 404, 7, err);
          console.error('Curl request Failed for register api: \n', err);
        }

		if(body.errCode == -1)
		{
			var privateKey = body.errMsg;
			var text = 'to='+to+'&subject='+subject+'&first_name='+first_name+'&last_name='+last_name+'&user_id='+user_id+'&notification_code='+notification_code+'&mobileNumber='+mobileNumber+'&publicKey='+publicKey;

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
					if(2&parseInt(notification_code))
					{
						console.log("Send Email");

						var mailOptions = {
							from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
							to: to, 								            // List of Receivers
							subject: subject, 		                            // Subject line
							text: email_body,
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

					if(4&parseInt(notification_code))
					{
						console.log("Send SMS");

						var smsURL = 'http://onlinesms.in/api/sendValidSMSdataUrl.php?login='+smsLoginId+'&pword='+smsPass+'&msg='+smsText+'&senderid='+optins+'&mobnum='+mobileNumber;
										
						request(smsURL, function (error, response, body) {

							if(error) 
							{
								console.log('SMS Not Sent');
								console.log(error);
								sendResponse(req, res, 200, 29, "SMS Sending Error");
								return;
							}
							
							else if(response.statusCode == 200)
							{
								console.log('SMS Sent Successfully');
							}
						
						})
					}
					
					if(1&parseInt(notification_code))
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
						io.emit("DatabaseEvent",{ signal : 'true' });

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

// PHP Reject Bid Functionality
module.exports.sendRejectBidNotification = function (req, res){

	var async = require('async');

	var data				= req.body.data;
	var keyword 			= req.body.keyword;
	var publicKey			= req.body.publicKey;
	var signature			= req.body.signature;
	
	// Validate Public Key
	if(publicKey =="" || publicKey == null || publicKey == undefined)
	{
		console.log('Public Key is Missing');
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	// Validate Signature
	if(signature =="" || signature == null || signature == undefined)
	{
		console.log('Signature is Missing');
		master.sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}
	
	// Validate Data
	if(data == "" || data == undefined || data == null)
	{
		console.log('No Data Received');
		master.sendResponse(req, res, 200, -1, "Success");
		return;
	}
	
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
			var text = 'data='+data+'&keyword='+keyword+'&publicKey='+publicKey;
			
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
					data = data.replace(/\[/g,"");
					data = data.replace(/\]/g,"");
					data = data.replace(/\\/g,"");
					data = data.split(",");
					var length = data.length;
					var email = [];
					var amount = [];
				
					for(var i=0; i<length; i++)
					{
						var singleJson 	= data[i].split("/"); 	
						email[i] 		= singleJson[1];		// Storing Email 
						amount[i]		= singleJson[3];
					}	
					
					request.get({
                                
						url: ipn+'/api/subrejectbid/users',
						qs: {user_email_container:JSON.stringify(email)},
						headers: {"content-type": "application/json"}
						
					},function optionalCallback(err, httpResponse, body){
						
						var result = JSON.parse(body);
						var resultLength = result.errMsg.length;
						
						for(var j=0; j<resultLength; j++)
						{
							var notification_code = result.errMsg[j].reject_bid_perms;
							
							if(2&parseInt(notification_code))
							{
								console.log("Send Email");
								
								var bidRetEmail = result.errMsg[j].email;		// Storing Email 

								var bidAmount = amount[j];						// Storing Amount
								
								var emailBody = '<div style="border:solid thin black;padding:5px"><div style="width:100%;text-align:left;min-height:50px;background-color:#25a2dc;padding: 1%;padding-bottom: 0px;"><img style="max-width:200px;" src="www.searchtrade.com/images/searchtrade_white.png"></img></div><p>Hello, <br/> <br/>Your bid of '+bidAmount+' BTC for the keyword #'+keyword+' on SearchTrade.com was not the highest bid and so it has been rejected.</p><p>Regards from SearchTrade team.<br><br>Product of SearchTrade.com Pte Ltd , Singapore<br><br></p></div>';
							
								var mailOptions = {
									from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
									to: bidRetEmail, 								    // List of Receivers
									subject: "SearchTrade: Keyword buy order rejected", // Subject line
									text: emailBody,
									html: emailBody
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
							
							if(4&parseInt(notification_code))
							{
								console.log("Send SMS");	
								
								var bidAmount = amount[j];								// Storing Amount
								
								var mobileNumber = result.errMsg[j].mobile_number;		// Storing Mobile Number
								console.log(mobileNumber);
								
								var smsText = "Your Bid of "+bidAmount+" BTC has been rejected for keyword "+keyword;
								
								var smsURL = 'http://onlinesms.in/api/sendValidSMSdataUrl.php?login='+smsLoginId+'&pword='+smsPass+'&msg='+smsText+'&senderid='+optins+'&mobnum='+mobileNumber;
											
								request(smsURL, function (error, response, body) {

									if(error) 
									{
										console.log('SMS Not Sent');
										console.log(error);
										sendResponse(req, res, 200, 29, "SMS Sending Error");
										return;
									}
									
									else if(response.statusCode == 200)
									{
										console.log('SMS Sent Successfully');
									}
								
								})

							}
							
							if(1&parseInt(notification_code))
							{
								console.log("Push Notification");
							}	
							
						}					
					})
					
					async.series([
					
						function (callback)
						{
							var p = 0;
						
							for(var i=0; i<length; i++)
							{
								var singleJson = data[i].split("/"); 	

								var bidRetEmail = singleJson[1];		// Storing Email 

								var user_id = singleJson[6];			// Storing User ID
								
								user_id = user_id.replace(/\"/g,"");
								user_id = user_id.replace(/\ /g,"");
								
								var bidAmount = singleJson[3];			// Storing Amount
								
								var notification_message = new notificationschema.notification_msg({ 
									user_id: user_id, 	                    													// User Id
									notification_body: "Your bid of "+bidAmount+"BTC has been rejected on keyword #"+keyword   	// Text
								});

								notification_message.save(function(err, result){

									if(err)
									{
										console.log(err);
										sendResponse(req, res, 200, 5, "Database Error");
										return;
									}
									
									if(result)
									{
										if(length-p==1)
										{
											callback();
										}	
										
										p++;
									}

								});
								
							}
						},
						
						function callback()
						{
							io.emit("DatabaseEvent",{ signal : 'true' });
							sendResponse(req, res, 200, -1, "Success");
							
						}
						
					])
					
				}
				
			})
		}
		
		else
		{
			sendResponse(req, res, 200, body.errCode, body.errMsg);
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
