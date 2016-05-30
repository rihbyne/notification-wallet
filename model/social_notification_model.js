var mongoose        = require('mongoose');           // For Mongoose

var social_notification = mongoose.Schema({

	user_id: 					      {type: String},           		// User id
    notification_body: 				  {type: String},           		// Notification Body
    //post_id: 				  		  {type: String},           		// Post id
    type: 				  		  	  {type: Number},           		// Type
    category: 				  		  {type: String},           		// Category
    post_description: 				  {type: String},           		// Post Description
    posted_by: 						  {type: String},           		// Post Description
    slot: 						  	  {type: String, default:"SN"},     // Slot
    read: 							  {type: Boolean, default:false},
    created_at: 					  {type: Date, default:Date.now()} 

}, { versionKey: false });


var receiverSchema = new mongoose.Schema({

	receiver_id: 			  {type: String},           	// Receiver Id
    read:					  {type: Boolean, default:false}

}, { versionKey: false });


var social_mention_notification = mongoose.Schema({

	receiver_container: 			  [receiverSchema],           	// Receiver Id
    notification_body: 				  {type: String},           	// Notification Body
	type:							  {type: Number},				// Type
    category: 				  		  {type: String},           	// Category
    post_id: 				  		  {type: String},           	// Post Id
    slot: 				  		  	  {type: String, default:"MN"}, // Slot
    created_at: 					  {type: Date, default:Date.now()} 

}, { versionKey: false });


// Model
module.exports.social_notification 			= mongoose.model('social_notification', social_notification);
module.exports.social_mention_notification	= mongoose.model('social_mention_notification', social_mention_notification);
