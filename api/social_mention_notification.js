/*global require, module, console */
/*jslint node: true */
"use strict";

var social_noti_Schema  = require('../model/social_notification_model.js');
var http 				= require('http');
var async				= require('async');
var _ = require('lodash')
var meta = require('util')

var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module
var crypt               = require("../config/crypt");			    		// Crypt Connectivity.
var util				= require('../helpers/util.js');					// Master Functionality
var log = require('../config/logging')()

var from_who            = process.env.DO_NOT_REPLY;						// Sender of Email
var api_key             = process.env.MAILGUN_API_KEY;			// Api Key For Mailgun
var domain              = process.env.DOMAIN;								// Domain Name

var ip                  = process.env.PROTOCOL+'://'+ process.env.STWALLET_IP + ':'+
                          process.env.STWALLET_PORT;

var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object
var io 					= require('./socket.js');

var smsLoginId 			= process.env.PRIMARY_SMS_GATEWAY_ID;;
var smsPass				= process.env.PRIMARY_SMS_PWD;
var optins				= process.env.SMS_OPTINS;

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

/* Set Socail Mention Notification */
module.exports.socialMentionNotification = function (req, res){

	var data                = req.body.data; //(userid/email/mobileNumber/preference)
	var subject             = req.body.subject;
	var email_body          = req.body.email_body;

	var smsText				= req.body.smsText;
	var notification_body   = req.body.notification_body;

	var post_id				= req.body.post_id;
	var type 				= req.body.type;
	var category 			= req.body.category;
	
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
					// data = data.replace(/\[/g,"");
					// data = data.replace(/\]/g,"");
					// data = data.replace(/\\/g,"");
					
					data = JSON.parse(data);
					
					var length = data.length;
					var email,userid,preference,mobileNumber;
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
						
						var dataRecord = {
						
							notification_code	: preference,
							to					: email,
							subject				: subject,
							email_body			: email_body,
							smsText				: smsText,
							mobileNumber		: mobileNumber
						
						}
						
						util.masterNotification(dataRecord, function(resultResponse){
						
							callback();
						
						})
						
						// if(1&parseInt(preference))
						// {
							// console.log("Push Notification");	
						// }
						
						// if(2&parseInt(preference))
						// {
							// console.log("Send Email");
						
							// var mailOptions = {
								// from: 'Search Trade <donotreply@searchtrade.com>', 	// Sender address
								// to: email, 								    		// List of Receivers
								// subject: subject, 									// Subject line
								// text: email_body,
								// html: email_body
							// };
						
							// mailgun.messages().send(mailOptions, function(err, cb){
								
								// Error In Sending Email
								// if (err) {
									
									// console.log('Mail Not Sent');
									// console.log(err);
									// sendResponse(req, res, 200, 29, "Email Sending Error");
									// return;

								// }
								
								// console.log('Mail Sent Successfully');
		
							// });
						// }
						
						// if(4&parseInt(preference))
						// {
							// console.log("Send SMS");

							// var smsURL = 'http://onlinesms.in/api/sendValidSMSdataUrl.php?login='+smsLoginId+'&pword='+smsPass+'&msg='+smsText+'&senderid='+optins+'&mobnum='+mobileNumber;
											
							// request(smsURL, function (error, response, body) {

								// if(error) 
								// {
									// console.log('SMS Not Sent');
									// console.log(error);
									// sendResponse(req, res, 200, 29, "SMS Sending Error");
									// return;
								// }
								
								// else if(response.statusCode == 200)
								// {
									// console.log('SMS Sent Successfully');
								// }
							
							// })
						// }

						// callback();
						
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
							
								receiver_container	: temp, 	                    													// User Id
								notification_body	: notification_body,
								type				: parseInt(type),
								post_id				: post_id,
								category			: category
								
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

/* Get Socail Mention Notification */
module.exports.getsocialnotifydata = function (req, res){
	
	var userid 		= req.params.userid;
	var category 	= req.query.category;
	var from		= req.query.from;
	var publicKey 	= req.query.publicKey;
	var signature 	= req.query.signature;
	
	if(from == "" || from == null || from == undefined)
	{
		var date = new Date()
		from = date.toISOString();
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
			sendResponse(req, res, 404, 7, err);
			console.error('Curl request Failed for register api: \n', err);
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
					sendResponse(req, res, 500, 14, "Invalid Signature");
					return;
				}
				
				if(!/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})\.\d{3}Z/.test(from))
				{
					sendResponse(req, res, 403, 5, 'Invalid Date Format');
					return;
				}
				
				else
				{
					if(category=="All" || category==null || category==undefined || category=="")
					{
						query = {$and:[{'receiver_container.receiver_id':userid},{created_at:{$lte:from}}]}
					}
					else
					{
						query = {$and:[{'receiver_container.receiver_id':userid},{category:category},{created_at:{$lte:from}}]}
					}
				
					social_noti_Schema.social_mention_notification
					.find(query)
					.sort({'created_at':-1})
					.limit(1)
					.lean()
					.exec(function(err, result){
					
						if(err)
						{
							console.log(error);
							sendResponse(req, res, 500, 5, "Databse Error");
							return;
						}
						
						if(result=="" || result==undefined || result==null)
						{
							console.log('No Result');
							sendResponse(req, res, 200, -1, "No data Found");
							return
						}

            sendResponse(req, res, 200, -1, result)
//=============================== update on GET ==================
//						var tempArray = [];		
//
//						async.each(result, function(singleResult, callback){	
//
//							if(category=="All" || category==null || category==undefined || category=="")
//							{
//								query = {$and: [{"receiver_container.receiver_id": userid},{_id: singleResult._id}]}
//							}
//							else
//							{
//								query = {$and: [{"receiver_container.receiver_id": userid},{category:category},{_id: singleResult._id}]}
//							}
//							
//							console.log(singleResult)
//							social_noti_Schema.social_mention_notification
//							.findOneAndUpdate(query,
//											{
//												"$set": {
//													"receiver_container.$.read": true
//												}
//											}, {new: true}, function(err, revObj) {																																								
//															if (err) {
//																console.log(err)
//																sendResponse(req, res, 500, 5, "Databse Error");
//																return;
//															} else if (!revObj) {
//																// tempArray.push(singleResult);
//																
//															} else {
//																var metaContainer = _.filter(revObj.receiver_container, {'receiver_id': userid})
//																revObj.receiver_container = metaContainer
//																tempArray.push(revObj);
//															}
//															callback()
//							})
//						
//						}, function(err){
//						
//							if(err)
//							{
//								console.log(error);
//								sendResponse(req, res, 500, 5, "Databse Error");
//								return;
//							}
//							
//							sendResponse(req, res, 200, -1, tempArray);																
//						})																	
//=============================== update on GET ==================
					})
				}
			})
		}
	})
}

/* Delete Socail Mention Notification */
module.exports.deleteSocialNotify = function (req, res){
	
	var userid 		= req.params.userid;
	var id			= req.query.id;
	var publicKey 	= req.query.publicKey;
	var signature 	= req.query.signature;
	
	id = JSON.parse(id);
	
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
			var text = 'userid='+userid+'&publicKey='+publicKey;

			crypt.validateSignature(text, signature, privateKey, function(isValid){

				// Signature Not Matched
				if (!isValid)
				{
					console.log('Invalid Signature');
					sendResponse(req, res, 500, 14, "Invalid Signature");
					return;
				}
			
				else
				{	
					async.each(id, function(singleResult, callback){		

						social_noti_Schema.social_mention_notification
						.findByIdAndUpdate({_id: singleResult},
											{
												$pull:{
														'receiver_container':{'receiver_id':userid}
														}
											})
						.exec(function(err, revObj){
						
							if (err) {
								console.log(err)
								sendResponse(req, res, 500, 5, "Databse Error");
								return;
							}

							callback()
						
						})
						
					}, function(err){
					
						if(err)
						{
							console.log(error);
							sendResponse(req, res, 500, 5, "Databse Error");
							return;
						}
						
						sendResponse(req, res, 200, -1, "Success");																
					})
				
				}
				
			})
		}
		
	})
}


module.exports.countSocialMentionNotification = function (req, res){
	
	var userid 		= req.params.userid;
	var category 	= req.query.category;
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
					if(category==null || category=='All' || category==undefined || category=="")
					{
						query = {$and: [{"receiver_container.receiver_id": userid}, {"receiver_container.read": false}]}
					}
					else
					{
						query = {$and: [{"receiver_container.receiver_id": userid},{category:category},{"receiver_container.read": false}]}
					}
					
					social_noti_Schema.social_mention_notification
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

module.exports.updateMNnotify = function(req, res) {
  var userid = req.params.userid
  var docid = req.params.docid
  var publicKey = req.query.publicKey
  var signature = req.query.signature

  var query = {
    publicKey: publicKey,
    token: true
  }

  request.post({
    url: ip+'/api/getPvtKey',
    body: query,
    json: true,
    headers: {"content-type": "application/json"}
  }, function(err, response, body) {
    if (err) {
      log.error(err)
      sendResponse(req, res, 403, 7, err)
    }

    if (body.errCode === -1) {
      var privateKey = body.errMsg
      var text = 'userid='+userid+'docid='+docid+'&publicKey='+publicKey;

      crypt.validateSignature(text, signature, privateKey, function(isValid) {
        if (!isValid) {
            log.warn("invalid signature")
            sendResponse(req, res, 403, 14, "Invalid Signature")
        } else {
          var query = {$and: [{"receiver_container.receiver_id": userid},{_id: docid}]}
          social_noti_Schema.social_mention_notification
							              .findOneAndUpdate(query,{
												      "$set": {
													      "receiver_container.$.read": true
												      }
											      }, {new: true})
                            .select('_id type post_id category created_at slot receiver_container')
                            .lean()
                            .exec(function(err, revObj) {
															if (err) {
																log.warn(err)
																util.sendJsonResponse(res, 500, 5, {failed: "database error"});
																return;
															} else if (!revObj) {
                                util.sendJsonResponse(res, 404, 21, {failed: "object does not exist"})
															} else {
																var metaContainer = _.filter(revObj.receiver_container, {'receiver_id': userid})
																revObj.receiver_id = metaContainer[0].receiver_id
                                revObj.read = metaContainer[0].read
                                delete revObj.receiver_container
                                log.info(meta.inspect(revObj))
                                util.sendJsonResponse(res, 200, -1, revObj)
															}
							              })
        }
      })
    }
  })
}
