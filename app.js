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
let litTable = require("./litTable.json")
// stores previous messages or sender
let state = require("./state.json")

return new Promise((resolve,reject) => {
	login({email: process.env.FB_EMAIL, password: process.env.FB_PASSWORD}, (err, api) => {
	    if(err) reject(err);
		resolve(api)
	});
})
.then((api) => {
	return new Promise((resolve,reject) => {
		api.listen((err, message) => {

			if (message.threadID == 1498135396931396 || message.threadID == 805309687) {
			// if (message.threadID == 1498135396931396) {
				if (message.senderID == 805309687) {
					let condition = _.includes(message.body, 'right?') || _.includes(message.body, 'i am right')
					if (condition) {
						let rightMsg = "Yes Master. You are always right."
						api.sendMessage(rightMsg ,message.threadID);
				  }
				}
				if (!usersHash[message.senderID]) {
	 			   return api.getUserInfo(message.senderID, (err,data) =>{
	 				   let userObject = data[message.senderID]
	 				   userObject.fireCount = 1
	 				   userObject.recentMessage = [];
	 				   state.usersHash[message.senderID] = userObject;
					   fs.writeFile('./state.json', JSON.stringify(state, null,4), (err,data) =>{
						   if (err) console.log(err);

					   })
	 			   })
	 		   }

	 		   if (message.body === '🔥' ||  _.includes(message.body, '🔥') || checkInLitTable(message.body)) {
					let recentMessage = {
					   message:message.body,
					   time:moment().format('M/DD/YYYY h:mm A'),
					   timeStamp:message.timestamp,
					   messageID:message.messageID
					}

	 				state.usersHash[message.senderID].fireCount += 1
					if(!state.usersHash[message.senderID].recentMessages) {
						state.usersHash[message.senderID].recentMessages = []
					}

					if (state.usersHash[message.senderID].recentMessages.length <= 30) {
						state.usersHash[message.senderID].recentMessages.push(recentMessage)
					}
					else {
						state.usersHash[message.senderID].recentMessages.shift()
						state.usersHash[message.senderID].recentMessages.push(recentMessage)
					}
					let emojis = [':love:', ':like:', ':haha:'];
					let random = _.random(0,2)
					api.setMessageReaction(emojis[random], message.messageID, (err) =>{
						console.log(err);
					})
					fs.writeFile('./state.json', JSON.stringify(state, null,4), (err,data) =>{
						if (err) console.log(err);

					})
	 		   }

			  if (message.body === '/mymsgs') {
				  let userObject = state.usersHash[message.senderID]
				  if (!userObject.recentMessages) {
					  api.sendMessage('No Recent Messages for ' + usersHash[message.senderID].firstName, message.threadID)
					  return
				  }

				  let returnMessage = 'Recent Messages for ' + usersHash[message.senderID].firstName + " : \n"
				  let startIndex = userObject.recentMessages.length >= 5 ? userObject.recentMessages.length - 5 : 0
				  let endIndex = userObject.recentMessages.length

				  for (var i = startIndex; i < endIndex; i++) {
				  	let recentMessage = userObject.recentMessages[i]
					returnMessage += recentMessage.message + " @ " + recentMessage.time + "\n"
				  }
				  api.sendMessage(returnMessage ,message.threadID);
			  }

	 		   if (message.body === '/litcount') {
	 			   	let fireCountMsg = state.sersHash[message.senderID].firstName +" your LitCount is: " + usersHash[message.senderID].fireCount + '🔥'
	 			   	api.sendMessage(fireCountMsg ,message.threadID);
	 		   }

	 		   if (_.includes(message.body, 'litboard') || message.body === '/litboard') {
					let split = message.body.split(" ")
					let type = split[1]
					let fireCountMap = generateLitBoard(state.usersHash, type)

					let litboardMsg = '|====LIT🔥RANKINGS====|\n'
					for (var i = 0; i < fireCountMap.length; i++) {
						let line = fireCountMap[i].name + " : " + fireCountMap[i].fireCount + "🔥" + "\n"
						litboardMsg += line
					}
					api.sendMessage(litboardMsg, message.threadID)

	 		   }
			   if (message.body === '/clearrankings') {
				   state.usersHash = {}
				   fs.writeFile('./state.json', JSON.stringify(state), (err,data) =>{
					   if (err) console.log(err);
				   })
			   }
			}

	   })
	})

})


function checkInLitTable(message) {
	return _.includes(litTable, message.toLowerCase())
}

function generateLitBoard(array, type) {
	let identifier
	let returnA
	let returnB
	switch (type) {
		case 'count':
			identifier = 'fireCount'
			returnA = 1
			returnB = -1
			break;
		case 'name':
			identifier = 'name'
			returnA = -1
			returnB = 1
			break;
		default:
			identifier = 'name'
			returnA = -1
			returnB = 1

	}

	return _.map(array, (userIdObj) => {
		return {
			name:userIdObj.name,
			fireCount:parseInt(userIdObj.fireCount)
		}
	}).sort((a,b) => {

		if (a[identifier] < b[identifier]) return returnA
		if (a[identifier] > b[identifier]) return returnB
		return 0
	})
}


app.listen(PORT, () =>{
	console.log('ebchat listening on port ',PORT);
})
