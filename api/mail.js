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
// module.exports.sendPHPmail = function (req, res){
    
    // var to                  = req.body.to;
    // var subject             = req.body.subject;
    // var message             = req.body.message;
    
    // var first_name          = req.body.first_name;
    // var last_name           = req.body.last_name;
    // var user_id             = req.body.user_id;
    // var notification_body   = req.body.notification_body;
    
    // notification_body = first_name+" "+last_name+", "+notification_body;
    
    // var mailOptions = {
		// from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
		// to: to, 								            // List of Receivers
		// subject: subject, 		                            // Subject line
		// text: message,									    // Text
		// html: message
	// };
    
    // mailgun.messages().send(mailOptions, function(err, cb){
        
         // Error In Sending Email
        // if (err) {
            
            // console.log('Mail Not Sent');
            // console.log(err);
            // sendResponse(req, res, 200, 29, "Email Sending Error");
            // return;

        // } else {
            
        //    console.log('Mail Sent Successfully');
            
            // var notification_message = new notificationschema.notification_msg({ 
                // user_id: user_id, 	                     // User Id
                // first_name: first_name, 				 // User First Name
                // last_name: last_name, 		             // User last Name
                // notification_body: notification_body,	 // Text
            // });
            
            // notification_message.save(function(err){

                // if(err)
                // {
                  // console.log(err);
                  // return err;
                // }

                // console.log('Saved SuccessFully');
                // sendResponse(req, res, 200, -1, "Success");

            // });
            
        // }    
        
    // });
    
// }


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
	var type				= req.body.type

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

	// Validate To
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
          sendResponse(req, res, 404, 7, err);
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
						type: type, 	                    	// Type
						notification_body: notification	        // Text
					});

					notification_message.save(function(err){

						if(err)
						{
						  console.log(err);
						  return err;
						}
							
						// request.post({

							// url: 'http://192.168.2.11:4000/setpost',
							// body: {userid:user_id,post_description:notification,privacy_setting:2},
							// json: true,
							// headers: {"content-type": "application/json"}

						// },function optionalCallback(err, httpResponse, body){

							// if (err)
							// {
								// sendResponse(req, res, 404, 7, err);
								// console.error('Curl request Failed for register api: \n', err);
								// return;
							// }
							
							console.log('Post Successfully Set');
							console.log('Saved SuccessFully');
							sendResponse(req, res, 200, -1, "Success");						
							io.emit("DatabaseEvent",{ signal : 'true' });
							
						// })						

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
		sendResponse(req, res, 200, 1, "Mandatory field not found");
		return;
	}
	
	// Validate Data
	if(data == "" || data == undefined || data == null)
	{
		console.log('No Data Received');
		sendResponse(req, res, 200, -1, "Success");
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
									type: "Reject Bid",
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
									
										request.post({

											url: 'http://192.168.2.23:4000/setpost',
											body: {userid:user_id,post_description:notification_message.notification_body,privacy_setting:2},
											json: true,
											headers: {"content-type": "application/json"}

										},function optionalCallback(err, httpResponse, body){

											if (err)
											{
												sendResponse(req, res, 404, 7, err);
												console.error('Curl request Failed for register api: \n', err);
												return;
											}
											
											console.log('Post Successfully Set');
											
											if(length-p==1)
											{
												callback();
											}	
											
											p++;
											
										})		
									
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


// module.exports.stupdatenotify = function (req, res){

	// var userid = req.params.userid;
	
	// notificationschema.notification_msg
	// .update({user_id:userid},{$set:{read:true}},{multi:true})
	// .exec(function(err, result){
	
		// if(err)
		// {
			// console.log(err)
			// sendResponse(req, res, 200, 5, 'Database Error');
			// return;
		// }
		
		// if(result==null || result=="" || result==undefined)
		// {
			// sendResponse(req, res, 200, -1, 'No Notification Found');
			// return;
		// }
		
		// console.log('Data Updated Successfully');
		// sendResponse(req, res, 200, -1, 'Success');
	
	// })

// }

module.exports.stdeletenotify = function (req, res){

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
		
		console.log(id);
		
		notificationschema.notification_msg
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
	
	
	
	// notificationschema.notification_msg
	// .findOneAndRemove({ _id: id})
	// .exec(function(err, result) {
	
		// if(err)
		// {
			// console.log(err)
			// sendResponse(req, res, 200, 5, 'Database Error');
			// return;
		// }
		
		// if(result==null || result=="" || result==undefined)
		// {
			// sendResponse(req, res, 200, -1, 'No Notification Found');
			// return;
		// }
		
		// console.log('Data Removed');
		// sendResponse(req, res, 200, -1, 'Success');
	
	// })

}

module.exports.stgetnotifycount = function (req, res){
	
	var userid 		= req.params.userid;
	var type		= req.params.type;
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
					if(type=='All' || type=='all' || type=='ALL')
					{
						query = {$and:[{user_id:userid},{read:false}]}
					}
					
					else
					{
						query = {$and:[{user_id:userid},{type:type},{read:false}]}
					}
				
					notificationschema.notification_msg
					.count(query)
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

module.exports.stgetnotifydata = function (req, res){
	
	var userid 	= req.params.userid;
	var from	= req.query.from;
	var type 	= req.query.type;
	var query = "";
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
	
		if(type=='All' || type=='all' || type=='ALL')
		{
			query = {$and:[{user_id:userid},{created_at:{$lt:from}}]}
		}
		
		else
		{
			query = {$and:[{user_id:userid},{type:type},{created_at:{$lt:from}}]}
		}
	
		notificationschema.notification_msg
		.find(query)
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
				
				notificationschema.notification_msg
				.update({$and:[{user_id:userid},{created_at:{$gte:result[index-1].created_at}},{created_at:{$lte:result[0].created_at}}]},{$set:{read:true}},{multi:true})
				.exec(function(err, retVal){
				
					if(err)
					{
						console.log(err)
						sendResponse(req, res, 500, 5, 'Database Error');
						return;
						
					} else {
					
						sendResponse(req, res, 200, -1, result);
						return;
					}
				})
			
			}
			
		})
	}
}


// Getting Notification Status
// module.exports.getNotificationStatus = function (email, cb){
    
    // var email = {email:email};
    
    // request.post({
                                
        // url: ip+'/secure/getNotificationStatus',
        // body: email,
        // json: true,
        // headers: {"content-type": "application/json"}

    // },function optionalCallback(err, httpResponse, body){

        // if (err)
        // {
            // return console.error('Curl request Failed for register api: \n', err);
        // }
        
        // cb(body.errMsg);
        
    // });

// }

// var getNotificationStatus = module.exports.getNotificationStatus;
