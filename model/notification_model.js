// Packages
var mongoose        = require('mongoose');      // For Mongoose 

// Build the connection string 
var dbURI = 'mongodb://localhost/notification'; 

// Create the database connection 
mongoose.connect(dbURI); 

var db_server  = process.env.DB_ENV || 'primary';

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + dbURI);
  console.log("Connected to " + db_server + " DB!");
}); 

// Schema
var notification_wallet = mongoose.Schema({
    
    user_id:                          {type: String, ref: 'notification_msg'},          // Id
    first_name:                       {type: String},          // First Name of User
    last_name:                        {type: String},          // Last Name of Use

}, { versionKey: false });

var notification_msg = mongoose.Schema({

	user_id: 					      {type: String},           // Notification Body
    notification_body: 				  {type: String},           // Notification Body
    read: 							  {type: Boolean, default:0},
    created_at: 					  {type: Date, default:Date.now()} 

}, { versionKey: false });
// Model
module.exports.notification_msg = mongoose.model('notification_msg', notification_msg);

module.exports.notification_wallet = mongoose.model('notification_wallet', notification_wallet);
