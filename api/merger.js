/*global require, module, console */
/*jslint node: true */
"use strict";


var http 				= require('http');
var Mailgun             = require('mailgun-js');							// For Emails (Mailgun Module)
var request             = require('request');                               // Request Module
var meta = require('util')
var _ = require('lodash')

var crypt               = require("../config/crypt");			    		// Crypt Connectivity.
var util				= require('../helpers/util.js');					// Master Functionality
var log = require('../config/logging')()

var social_noti_Schema  = require('../model/social_notification_model.js');
var notificationschema  = require('../model/notification_model.js');

var from_who            = process.env.DO_NOT_REPLY;						// Sender of Email
var api_key             = process.env.MAILGUN_API_KEY;			// Api Key For Mailgun
var domain              = process.env.DOMAIN;								// Domain Name

var ip                  = process.env.PROTOCOL+'://'+ process.env.STWALLET_IP + ':'+
                          process.env.STWALLET_PORT;

var mailgun             = new Mailgun({apiKey: api_key, domain: domain});	// Mailgun Object

// var io 					= require('./socket.js');

var smsLoginId 			= process.env.PRIMARY_SMS_GATEWAY_ID;;
var smsPass				= process.env.PRIMARY_SMS_PWD;
var optins				= process.env.SMS_OPTINS;
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

/* Delete */
module.exports.deleteAllNotifications = function (req, res) {
  try {

    var userid = req.params.userid
    var publicKey = req.query.publicKey
    var signature = req.query.signature
    var id_container = null
    var delid_container = []
    var query = {
      publicKey: publicKey,
      token: true
    }

    if (req.query.id_container === undefined) {
      throw new Error("ID object container absent")
      log.warn("ID object container absent")
    } else {
      log.info(JSON.parse(req.query.id_container))
      var extract_json = JSON.parse(req.query.id_container)
      if (!Array.isArray(extract_json)) {
        throw new Error("Array container absent")
      } else if (extract_json.length === 0) {
        throw new Error("Array container empty")
      } else {
        id_container = extract_json
      }
    }

    var notify_type = {
      ST: function(userid, delId, cb) {
        var tempObj = {}
        notificationschema.notification_msg
                          .findOneAndRemove({$and:[{ _id: delId},{user_id:userid}]})
                          .exec(function(err, result) {
                            if (err) {
                              //collect this error
                              tempObj.error = err
                              tempObj.del_id = delId
                              delid_container.push(tempObj)
                            } else if (!result) {
                              console.log(result)
                              tempObj.del_id = delId
                              tempObj.error = "object does not exist"
                              delid_container.push(tempObj)
                            } else {
                              console.log(result)
                              //do nothing just return the delId
                              tempObj.del_id = delId
                              tempObj.slot = result.slot
                              delid_container.push(tempObj)
                            }
                            cb()
                          })
      },
      SN: function(userid, delId, cb) {
        var tempObj = {}
        social_noti_Schema.social_notification
                          .findOneAndRemove({$and: [{_id: delId}, {user_id: userid}]})
                          .exec(function(err, result) {
                            if (err) {
                              //collect this error
                              tempObj.error = err
                              tempObj.del_id = delId
                              delid_container.push(tempObj)
                            } else if (!result) {
                              tempObj.del_id = delId
                              tempObj.error = "object does not exist"
                              delid_container.push(tempObj)
                            } else {
                              //do nothing just return the delId
                              tempObj.del_id = delId
                              tempObj.slot = result.slot
                              delid_container.push(tempObj)
                            }
                            cb()
                          })
      },
      MN: function(userid, delId, cb) {
        var tempObj = {}
        social_noti_Schema.social_mention_notification
                          .findByIdAndUpdate({_id: delId}, {
                            $pull: {
                              'receiver_container': {'receiver_id': userid}
                            }
                          })
                          .exec(function(err, revObj) {
                            if (err) {
                              //collect this error
                              tempObj.error = err
                              tempObj.del_id = delId
                              delid_container.push(tempObj)
                            } else if(!_.find(revObj.receiver_container, {'receiver_id': userid}))  {
                              tempObj.del_id = delId
                              tempObj.error = "object does not exist"
                              delid_container.push(tempObj)
                            } else {
                              //do nothing just return the delId
                              tempObj.del_id = delId
                              tempObj.slot = revObj.slot
                              delid_container.push(tempObj)
                            }
                            cb()
                          })
      }
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
        var text = 'userid='+userid+'&publicKey='+publicKey;

        crypt.validateSignature(text, signature, privateKey, function(isValid) {
          if (!isValid) {
            log.warn("invalid signature")
            sendResponse(req, res, 403, 14, "Invalid Signature")
          }  else {
            //do js object lookup
            async.each(id_container, function(jsonObj, cb) {
              if (/^(MN|ST|SN)$/.test(jsonObj.slot)) {
                notify_type[jsonObj.slot](userid, jsonObj.id, cb)
              } else {
                var slotErr = "delete operation aborted due to invalid slot parameter in id_container"
                cb(slotErr)
              }
            }, function(err) {
              if (err) {
                sendResponse(req, res, 403, err)
              } else {
                log.info("deleted object ids collector -> " + meta.inspect(delid_container))
                sendResponse(req, res, 200, -1, delid_container)
              }
            })
          }
        })
      }
    })
  } catch(rterror) {
    log.error(rterror.message)
    sendResponse(req, res, 403, 41, rterror.message)
  }
}

module.exports.updateNotify = function(req, res) {
  var userid = req.params.userid
  var docid =  req.params.docid
  var publicKey = req.query.publicKey
  var signature = req.query.signature
  var slot = req.query.slot

  var notifyLookup = {
    ST: function(userid, docid, res) {
      var query = {$and: [{user_id: userid},{_id: docid}]}
      notificationschema.notification_msg
                        .findOneAndUpdate(query, {
                          $set: {read: true}
                        }, {new: true})
                        .select('_id user_id category slot created_at read')
                        .exec(function(err, result){
                          if (err) {
                            util.sendJsonResponse(res, 500, 5, {failed: "datebase error"})
                          } else if (!result) {
                            util.sendJsonResponse(res, 404, 5, {failed: "object does not exist"})
                          } else {
                            util.sendJsonResponse(res, 200, -1, result)
                          }
                        })
    },
    SN: function(userid, docid, res) {
      var query = {$and: [{user_id: userid},{_id: docid}]}
      social_noti_Schema.social_notification
                        .findOneAndUpdate(query, {
                          $set: {read: true}
                        }, {new: true})
                        .select('_id user_id category posted_by slot created_at read')
                        .exec(function(err, result){
                          if (err) {
                            util.sendJsonResponse(res, 500, 5, {failed: "datebase error"})
                          } else if (!result) {
                            util.sendJsonResponse(res, 404, 5, {failed: "object does not exist"})
                          } else {
                            util.sendJsonResponse(res, 200, -1, result)
                          }
                        })
    },
    MN: function(userid, docid, res) {
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
                            return
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
  }

  var query = {
    publicKey: publicKey,
    token: true
  }

  if (/^(MN|ST|SN)$/.test(slot)) {
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
        var text = 'userid='+userid+'&docid='+docid+'&slot='+slot+'&publicKey='+publicKey;

        crypt.validateSignature(text, signature, privateKey, function(isValid) {
          if (!isValid) {
            log.warn("invalid signature")
            sendResponse(req, res, 403, 14, "Invalid Signature")
          }  else {
            notifyLookup[slot](userid, docid, res)
          }
        })
      }
    })
  } else {
    log.warn("appropriate slot paramter not found")
    sendResponse(req, res, 404, 41, {failed: "appropriate slot paramter not found"})
  }
}

module.exports.getAllNotifyData = function(req, res){

	var userid 	= req.params.userid;
	var from 	= req.query.from;
	
	if(from == "" || from == null || from == undefined)
	{
		var date = new Date()
		from = date.toISOString();
	}
	
	if(!/(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})\.\d{3}Z/.test(from))
	{
		sendResponse(req, res, 403, 5, 'Invalid Date Format');
		return;
	}
	
	// async.each
	
	async.parallel([

		function (callback){
			
			notificationschema.notification_msg
			.find({$and:[{user_id:userid},{created_at:{$lt:from}}]})
			.sort({created_at:-1})
			.limit(50)
			.exec(function(err, result){
				
				if (err) {
            
					console.log(err);
					sendResponse(req, res, 500, 5, 'Database Error');
					return;

				}
				
				if(result=="" || result==undefined || result==null || result.length<=0)
				{	
					console.log('No Data Found');
					callback(null , "");
					return;
				}
				
				callback(null, result);
				
			})
		
		},
		
		function (callback){
			
			social_noti_Schema.social_notification
			.find({$and:[{user_id:userid},{created_at:{$lt:from}}]})
			.sort({created_at:-1})
			.limit(50)
			.exec(function(err, result){
			
				if(err)
				{
					console.log(err);
					callback(null ,err);
					return;
				}
			
				if(result=="" || result==undefined || result==null || result.length<=0)
				{	
					console.log('No Data Found');
					callback(null , "");
					return;
				}
				
				callback(null, result);
			
			})
		
		},
		
		function (callback){
			
			social_noti_Schema.social_mention_notification
			.find({$and:[{'receiver_container.receiver_id':userid},{created_at:{$lte:from}}]})
			.sort({'created_at':-1})
			.limit(50)
			.lean()
			.exec(function(err, result){
			
				if(err)
				{
					console.log(error);
					callback(null ,err);
					return;
				}
				
				if(result=="" || result==undefined || result==null)
				{
					console.log('No Result');
					callback(null , "");
					return
				}
				
				callback(null, result);
			
			})
		
		}

	], function(err, response){
	
		if(err)
		{
			console.log(error);
			sendResponse(req, res, 500, 5, 'Database Error');
			return;
		}
	
		var totalResult = response[0].concat(response[1]).concat(response[2]);
		
		function custom_sort(a, b){
		
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		}

		totalResult=totalResult.sort(custom_sort);
		totalResult = totalResult.slice(0, 50);
		console.log(totalResult.length);
    sendResponse(req, res, 200, -1, totalResult)
  })
}
