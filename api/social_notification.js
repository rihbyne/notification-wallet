/*global require, module, console */
/*jslint node: true */
"use strict";

var social_noti_Schema  = require('../model/social_notification_model.js');
var http 				= require('http');

var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module
var crypt               = require("../config/crypt");			    		// Crypt Connectivity.

var from_who            = 'donotreply@searchtrade.com';						// Sender of Email
var api_key             = 'key-2b8f2419e616db09b1297ba51d7cc770';			// Api Key For Mailgun
var domain              = 'searchtrade.com';								// Domain Name

var ip                  = 'http://localhost:4020';
var ipn                 = 'http://192.168.2.15:5020';

var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object
var io 					= require('./socket.js');

var smsLoginId 			= '9320027660'; //'7827572892';
var smsPass				= 'tagepuguz';	//'amit123456';
var optins				= 'OPTINS';
var async				= require('async');

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

// PHP Mail Functionality in Node
module.exports.socialNotification = function (req, res){

	var to                  = req.body.to;
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

	var user_id             = req.body.user_id;
	var smsText				= req.body.smsText;
	var mobileNumber		= req.body.mobileNumber;

	var notification_body   = req.body.notification_body;
	var notification_code	= req.body.notification_code;

	var posted_by			= req.body.posted_by;
	var post_description	= req.body.post_description;
	var type 				= req.body.type;
	
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
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	// Validate Signature
	if(to=="" || to== null || to==undefined)
	{
		console.log('Email is Missing');
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	if(!validateEmail(to))
	{
		console.log('Incorrect Email Format');
		sendResponse(req, res, 200, 7, "Incorrect email id format");
		return;
	}

	var notification = notification_body+' ('+post_description+')';

	var query = {publicKey:publicKey,token:true};

	request.post({

        url: ip+'/api/getPvtKey',
        body: query,
        json: true,
        headers: {"content-type": "application/json"}

    },function optionalCallback(err, httpResponse, body){

        if (err)
        {
			sendResponse(req, res, 404, 7, err);
			console.error('Curl request Failed for register api: \n', err);
        }

		if(body.errCode == -1)
		{
			var privateKey = body.errMsg;
			var text = 'to='+to+'&subject='+subject+'&user_id='+user_id+'&notification_code='+notification_code+'&mobileNumber='+mobileNumber+'&publicKey='+publicKey;

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
					
					var notification_message = new social_noti_Schema.social_notification({
						user_id: user_id, 	                    	// User Id
						notification_body: notification,	        // Notification body
						type: type,	        						// Type
						posted_by: posted_by,	        			// Posted By
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
			sendResponse(req, res, 200, body.errCode, body.errMsg);
		}
        
    });
    
}

module.exports.followNotification = function (req, res){

	var to                  = req.body.to;
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

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
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	// Validate Signature
	if(to=="" || to== null || to==undefined)
	{
		console.log('Email is Missing');
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	if(!validateEmail(to))
	{
		console.log('Incorrect Email Format');
		sendResponse(req, res, 200, 7, "Incorrect email id format");
		return;
	}

	var notification 		= notification_body;

	var query = {publicKey:publicKey,token:true};

	request.post({

        url: ip+'/api/getPvtKey',
        body: query,
        json: true,
        headers: {"content-type": "application/json"}

    },function optionalCallback(err, httpResponse, body){

        if (err)
        {
			sendResponse(req, res, 404, 7, err);
			console.error('Curl request Failed for register api: \n', err);
        }

		if(body.errCode == -1)
		{
			var privateKey = body.errMsg;
			var text = 'to='+to+'&subject='+subject+'&user_id='+user_id+'&notification_code='+notification_code+'&mobileNumber='+mobileNumber+'&publicKey='+publicKey;

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
					
					var notification_message = new social_noti_Schema.social_notification({
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
			sendResponse(req, res, 200, body.errCode, body.errMsg);
		}
        
    });
    
}

// PHP Mail Functionality in Node
module.exports.socialMentionNotification = function (req, res){

	var data                = req.body.data; //(userid/email/mobileNumber/preference)
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

	var smsText				= req.body.smsText;
	var notification_body   = req.body.notification_body;

	var post_id				= req.body.post_id;
	var type 				= req.body.type;
	
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
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	// Validate Signature
	if(to=="" || to== null || to==undefined)
	{
		console.log('Email is Missing');
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}

	if(!validateEmail(to))
	{
		console.log('Incorrect Email Format');
		sendResponse(req, res, 200, 7, "Incorrect email id format");
		return;
	}

	var notification = notification_body+' ('+post_description+')';

	var query = {publicKey:publicKey,token:true};

	request.post({

        url: ip+'/api/getPvtKey',
        body: query,
        json: true,
        headers: {"content-type": "application/json"}

    },function optionalCallback(err, httpResponse, body){

        if (err)
        {
			sendResponse(req, res, 404, 7, err);
			console.error('Curl request Failed for register api: \n', err);
        }

		if(body.errCode == -1)
		{
			var privateKey = body.errMsg;
			var text = 'data='+data+'&publicKey='+publicKey;

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
					var email,userid,preference;
					var temp = [];
					
					async.each(data, function(singleData, callback){
						
						singleData 		= singleData.split('/');
					
						email 			= singleData[1];		// Storing Email 
						userid			= singleData[0];		// Storing User id
						mobileNumber	= singleData[2];		// Storing Mobile
						preference		= singleData[3];		// Storing Preference
						
						var obj = {
							receiver_id : userid,
							read: false
						}
						
						temp.push(obj);
						
						if(1&parseInt(notification_code))
						{
							console.log("Push Notification");	
						}
						
						if(2&parseInt(preference))
						{
							console.log("Send Email");
						
							var mailOptions = {
								from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
								to: email, 								    		// List of Receivers
								subject: subject, // Subject line
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

						callback();
						
					},function(err){
						
						if(err)
						{
							console.log(error);
							sendResponse(req, res, 200, 5, "Databse Error");
							return;
						}
					
						else
						{	
							var data = new social_noti_Schema.social_mention_notification({ 
							
								receiver_container: temp, 	                    													// User Id
								notification_body: notification_body,
								type:parseInt(type),
								post_id:post_id
								
							});

							data.save(function(err, result){
							
								if(err)
								{
									console.log(error);
									sendResponse(req, res, 500, 5, "Databse Error");
									return;
								}
								
								else
								{
									sendResponse(req, res, 200, -1, result);
								}
							
							})
						}

					})
					
				}
			})
			
		}
		
		else
		{
			sendResponse(req, res, 200, body.errCode, body.errMsg);
		}
        
    });
    
}


// module.exports.socialdeletenotify = function (req, res){

	// var id = req.params.id;
	
	// id = id.replace(/\[/g,"");
	// id = id.replace(/\]/g,"");
	// id = id.replace(/\\/g,"");
	// id = id.split(",");
	
	// id = JSON.parse(id);
	
	// async.each(id, function(singleData, callback){
					
		// id	= 	singleData;		// Storing Document id
		
		// social_noti_Schema.social_notification
		// .findOneAndRemove({ _id: id})
		// .exec(function(err, result) {
			
			// if(err)
			// {
				// console.log(err)
				// sendResponse(req, res, 500, 5, 'Database Error');
				// return;
			// }
		
			// callback();
		
		// })
		
	// },function(err){
						
		// if(err)
		// {
			// console.log(error);
			// sendResponse(req, res, 500, 5, "Databse Error");
			// return;
		// }
		
		// else
		// {
			// sendResponse(req, res, 200, -1, "Successfully Deleted");
		// }
	// })
// }


module.exports.socialdeletenotify = function (req, res){

	var id = req.query.id;
	var userid = req.params.userid;
	
	id = JSON.parse(id);
	
	// id = id.replace(/\[/g,"");
	// id = id.replace(/\]/g,"");
	// id = id.replace(/\\/g,"");
	// id = id.split(",");
	
	if(!Array.isArray(id))
	{
		console.log('Invalid Input (Document Id Array)')
		sendResponse(req, res, 500, 5, 'Invalid Input Parameter');
		return;
	}
	
	var data = [];
	
	async.each(id, function(singleData, callback){
					
		id	= 	singleData;		// Storing Document id

		social_noti_Schema.social_notification
		.findOneAndRemove({$and:[{ _id: id},{user_id:userid}]})
		.exec(function(err, result) {
			
			if(err)
			{
				console.log(err)
				sendResponse(req, res, 500, 5, 'Database Error');
				return;
			}
		
			if(result=="" || result==undefined || result==null)
			{
				callback();
			}
			
			else
			{
				data.push(result._id);
				callback();
			}
		
		})
		
	},function(err){
						
		if(err)
		{
			console.log(error);
			sendResponse(req, res, 500, 5, "Databse Error");
			return;
		}
		
		else
		{
			sendResponse(req, res, 200, -1, {data:data})
		}
	})
	
}


module.exports.socialgetnotifycount = function (req, res){
	
	var userid 		= req.params.userid;
	var publicKey	= req.query.publicKey;
	var signature	= req.query.signature;
	
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
			var text = 'userid='+userid+'&publicKey='+publicKey;
			
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
					social_noti_Schema.social_notification
					.count({$and:[{user_id:userid},{read:false}]})
					.exec(function(err, result){
					
						if(err)
						{
							console.log(err)
							sendResponse(req, res, 500, 5, 'Database Error');
							return;
						}
						
						console.log('Count : '+result);
						sendResponse(req, res, 200, -1, {count:result});
						
					})
				}
				
			})
		
		}
	
	})

}


module.exports.socialgetnotifydata = function (req, res){
	
	var userid 	= req.params.userid;
	var from	= req.query.from;
	//var publicKey	= req.query.publicKey;
	//var signature	= req.query.signature;
	
	if(from == "" || from == null || from == undefined)
	{
		var date = new Date()
		from = date.toISOString();
	}
	
	var isoDateRegex = new RegExp('/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})\.\d{3}Z/');
	// var isoDateRegex = new RegExp('/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})\+.+(\d{3})\+Z/');
	
	if(!/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})\.\d{3}Z/.test(from))
	{
		sendResponse(req, res, 403, 5, 'Invalid Date Format');
		
	} else{
	
		social_noti_Schema.social_notification
		.find({$and:[{user_id:userid},{created_at:{$lt:from}}]})
		.sort({created_at:-1})
		.limit(50)
		.exec(function(err, result){
		
			if(err)
			{
				console.log(err)
				sendResponse(req, res, 500, 5, 'Database Error');
				return;
				
			} else {
			
				console.log('Result : '+result);
				console.log(Array.isArray(result));
				
				var length = result.length;
				var index;
				
				if(length<50)
				{
					index = parseInt(length);
				}
				
				else
				{
					index = 49;
				}
				
				social_noti_Schema.social_notification
				.update({$and:[{user_id:userid},{created_at:{$gte:result[index-1].created_at}},{created_at:{$lte:result[0].created_at}}]},{$set:{read:true}},{multi:true})
				.exec(function(err, retVal){
				
					if(err)
					{
						console.log(err)
						sendResponse(req, res, 500, 5, 'Database Error');
						return;
						
					} else {
					
						sendResponse(req, res, 200, -1, retVal);
						return;
					}
				})
			
			}
			
		})
	}
}