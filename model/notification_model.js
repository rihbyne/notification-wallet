var mongoose        = require('mongoose');           // For Mongoose

// Schema
var notification_wallet = mongoose.Schema({
    
    user_id:                          {type: String, ref: 'notification_msg'},          // Id
    first_name:                       {type: String},          // First Name of User
    last_name:                        {type: String},          // Last Name of Use

}, { versionKey: false });

var notification_msg = mongoose.Schema({

	user_id: 					      {type: String},           		// User Id
    notification_body: 				  {type: String},           		// Notification Body
    type: 				  			  {type: Number},           		// Type
    category: 				  		  {type: String},           		// Category
    read: 							  {type: Boolean, default:false},	
    slot: 							  {type: String, default:"ST"},		// Slot
    created_at: 					  {type: Date, default:Date.now()}	 

}, { versionKey: false });

// Model
module.exports.notification_msg = mongoose.model('notification_msg', notification_msg);
module.exports.notification_wallet = mongoose.model('notification_wallet', notification_wallet);
