var notificationschema  = require('../model/notification_model.js');
var io 					= require('socket.io')();

var sockets = {};

io.on('connection', function(socket){

	console.log('Connected Socket');
	
	socket.on('message_to_server', function(data){
	
		var user_id = data['user_id'];
		
		//console.log('User Id ',user_id);
		
		sockets[socket.id] = {user_id:user_id, socket:socket};
		
		socket.join(data.user_id);
		
		//console.log(sockets);
		
		if(user_id == "" || user_id == undefined || user_id == null)
		{
			io.to(user_id).emit("message_to_client",{ data : '' });
			console.log('Blank Data');
		}
	
		else
		{
			notificationschema.notification_msg.find({user_id:user_id}).sort({created_at:-1}).exec(function(err, result){
			
				var length = result.length;
				var record = '';
				
				for(var i =length, p=0; i>0; i--)
				{
					//record += '<li>'+result[p].notification_body+'</li>';
					
					record += '<a href="#" class="list-group-item">'+
								'<div class="checkbox">'+
									'<label>'+
										'<input type="checkbox">'+
									'</label>'+
								'</div>'+
								'<span class="glyphicon glyphicon-star-empty"></span><span class="name" style="min-width: 120px; display: inline-block;"></span> <span class="">'+result[p].notification_body+'</span>'+
								'<span class="text-muted" style="font-size: 11px;"></span><span class="badge">'+result[p].created_at+'</span> <span class="pull-right"></span>'+
							'</a>';

					p++;
					if(p==length)
					{
						io.to(user_id).emit("message_to_client",{ data : record });
						//console.log('Record : '+record);
					}
				}
			
			})
		}
	
	})

})

module.exports = io;	