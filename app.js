const express = require('express');
const app = express();
const request = require('request');
const rp = require('request-promise');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const path = require('path');
const logger = require("morgan");
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const PORT = 3300;
const login = require("facebook-chat-api");

require('dotenv').config();


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let usersHash = require("./usersHash.json")
// Create simple echo bot
return new Promise((resolve,reject) => {
	login({email: process.env.FB_EMAIL, password: process.env.FB_PASSWORD}, (err, api) => {
	    if(err) reject(err);
		resolve(api)
	});
})
.then((api) => {
	return new Promise((resolve,reject) => {
		api.listen((err, message) => {
			if (message.threadID == 1498135396931396) {
				console.log(message);
			// if (message.threadID == 1498135396931396 || message.threadID == 805309687) {
				if (!usersHash[message.senderID]) {
	 			   return api.getUserInfo(message.senderID, (err,data) =>{
	 				   let userObject = data[message.senderID]
	 				   userObject.fireCount = 1
	 				   usersHash[message.senderID] = userObject;
					   fs.writeFile('./usersHash.json', JSON.stringify(usersHash), (err,data) =>{
						   if (err) console.log(err);
					   })
	 			   })
	 		   }
	 		   if (message.body === '🔥' || _.includes(message.body, '🔥' ) == true) {
	 				usersHash[message.senderID].fireCount += 1
					fs.writeFile('./usersHash.json', JSON.stringify(usersHash), (err,data) =>{
						if (err) console.log(err);
					})
	 		   }
	 		   if (message.body === '/litcount') {
	 			   	let fireCountMsg = usersHash[message.senderID].firstName +" your LitCount is: " + usersHash[message.senderID].fireCount + '🔥'
	 			   	api.sendMessage(fireCountMsg ,message.threadID);
	 		   }

	 		   if (message.body === '/litboard') {
					let remapped = _.map(usersHash, (userIdObj) => {
						return {
							name:userIdObj.name,
							fireCount:userIdObj.fireCount
						}
					})
					let litboardMsg = '|====LIT🔥RANKINGS====|\n'
					for (var i = 0; i < remapped.length; i++) {
						let line = remapped[i].name + " : " + remapped[i].fireCount + "🔥" + "\n"
						litboardMsg += line
					}
					api.sendMessage(litboardMsg, message.threadID)

	 		   }
			   if (message.body === '/clearrankings') {
				   fs.writeFile('./usersHash.json', JSON.stringify({}), (err,data) =>{
					   if (err) console.log(err);
				   })
			   }
			}



	   })
	})

})







app.listen(PORT, () =>{
	console.log('ebchat listening on port ',PORT);
})
