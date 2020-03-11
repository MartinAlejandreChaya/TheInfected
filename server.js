/*
POSIBLES MEJORAS
**Boton de reempezar
Usuario (log-in)
**Eliminar partidas ya acabadas (donde todos los jugadores se han desconectado)
Ranking

**Botón para desconectarse de la partida (De esa en específico)
Desconectar a un jugador que ya no esté en el browser
Cerrar sockets de jugadores que estén desconectados Y no en el browser
**Texto que indica jugadores conectados

Buscar dns para la ip (que se pueda acceder on-line)
Servidor en el cloud

Mas visual la municion (A lo mejor tener el numerito encima del jugador (si está infectado))
**Botón reglas
**Forma de ganar para los no infectados --> Tiempo límite 
**Que el jugador tenga presente que color es (o que cuadrado infectado es)
PAREDES FALSAS
*/


var express = require('express');

var app = express();
var server = app.listen(3000);

console.log("running at " + 3000);

var connectCounter = 0;

app.use(express.static('public'));

var socket = require('socket.io');

var io = socket(server);

io.sockets.on('connection', newConnection);


let playerGroups = [];
let online = [];

//defaults
let wG = 30;
let hG = 22;
let playerNum = 4;



setInterval(function() {
	//Emit number of players connected to every playergroup
	for(let i=0; i<playerGroups.length; i++) {
		for (let j=0; j<playerGroups[i].socketIds.length; j++) {
			io.to(playerGroups[i].socketIds[j]).emit('connectedNum', {connectedPlayers: playerGroups[i].connectedCount});
		}
	}
}, 1000);

/*setInterval(function() {
	console.log("Players online: " + online.length);
	for (let i=0; i<online.length; i++)
		io.to(online[i]).emit('onlinePlayers', {onlinePlayers: online.length});//number of online players
}, 10000);*/

function newConnection(socket) {
  
  socket.on('error', function(error) {
  	console.log("Error with a socket");
  	socket.destroy();
  });

  /*socket.on('disconnect', function() {
  	//Delete socket from online
  	for (let i=0; i<online.length; i++) {
  		if(socket.id == online[i]) {
  			online.splice(i, 1);
  			i = online.length+3;
  		}
  	}
  	//If a player isnt online,
			//mark it as not connected in its group, delete it from the sockets group array, connectedNum--, emit('connectedNum')
	let currentGroup;
	let currentPlayer;
	for (let i=0; i<playerGroups.length; i++) {
		for (let j=0; playerGroups[i] != null && j<playerGroups[i].socketIds.length; j++) {
			if (socket.id == playerGroups[i].socketIds[j]) {
				currentGroup = playerGroups[i];
				currentGroup.connectedNum--;
				currentGroup.socketIds.splice(j, 1);
				currentPlayer = currentGroup.players[findCurrent(currentGroup, socket.id)];
				i = playerGroups.length;
			}
		}
	}
	for (let j=0; j<currentGroup.socketIds.length; j++)
		io.to(currentGroup.socketIds[j]).emit('connectedNum', {connectedPlayers: currentGroup.connectedCount});
	//End socket comunication with it
	console.log("socket disconnected: " + socket.id);
  });*/

  socket.on('setUp', function(data) {
  	let connectedPlayer;
  	let connected = false;
  	while(!connected) {
	  	for (let i=0; i<playerGroups.length; i++) {
	  		if (playerGroups[i].playerNum == data.playerNumber && playerGroups[i].wG == data.gridWidth &&
	  		playerGroups[i].hG == data.gridHeight && playerGroups[i].timer == data.time && playerGroups[i].players.length < playerGroups[i].playerNum) {
	  			connected = true;
	  			connectedPlayer = new Player(playerGroups[i].players.length+1, i);
	  			playerGroups[i].players.push(connectedPlayer);
	  			playerGroups[i].socketIds.push(socket.id);
	  			console.log("Socket connected at group: " + i + ". socket Id:" + socket.id);
	  			online.push(socket.id);
	  			i = playerGroups.length;
	  		}
	  	}
	  	if (!connected) {
	  		playerGroups.push(new PlayerGroup(data.playerNumber, data.gridWidth, data.gridHeight, data.time));
	  		console.log("New player group created");
	  	}
	}
	//recieve data from playerGroup changed
	//emit to sockets in that player group

	let currentGroup = playerGroups[connectedPlayer.group];
	for (let i=0; i<currentGroup.socketIds.length; i++) {
	  	io.to(currentGroup.socketIds[i]).emit('recieveData', {
		  	players : currentGroup.players,
		  	playerNumber: currentGroup.playerNum,
		  	wG : currentGroup.wG,
		  	hG : currentGroup.hG,
		  	id : connectedPlayer.id,
		  	walls : currentGroup.walls,
		});
	}

	currentGroup.connected[findCurrent(currentGroup, connectedPlayer)] = true;
	currentGroup.connectedCount++;

	if (currentGroup.playerNum == currentGroup.players.length) {
	  	currentGroup.players[Math.trunc(Math.random()*currentGroup.playerNum)].infected = true;
	  	for (let i=0; i<currentGroup.socketIds.length; i++)
	  		io.to(currentGroup.socketIds[i]).emit('updateInfected', {players: currentGroup.players, firstInfected: true});
	  	play(currentGroup);
	}
  });


  socket.on('exitPlayerGroup', function(data) {
  	let currentGroup = playerGroups[data.player.group];
  	currentGroup.connectedCount--;
	if (currentGroup.connectedCount == 0)  	{
		if (playerGroups.length == 1)
			playerGroups = [];
		else
			playerGroups.splice(findGroupIndex(currentGroup, 1));
	}
	else {
	  	currentGroup.connected[findCurrent(currentGroup, data.player)] = false;
	  	for (let i=0; i<currentGroup.socketIds.length; i++) {
	  		if (currentGroup.socketIds[i] == data.socketId) {
	  			currentGroup.socketIds.splice(i, 1);
	  			i = currentGroup.socketIds.length+1;
	  		}
	  	}
	}
  });

  socket.on('enterPlayerGroup', function(data) {
  	let connected = false;
  	while(!connected) {
	  	for (let i=0; i<playerGroups.length; i++) {
	  		if (playerGroups[i].playerNum == data.playerNumber && playerGroups[i].wG == data.gridWidth &&
	  		playerGroups[i].hG == data.gridHeight && playerGroups[i].timer == data.time && playerGroups[i].players.length < playerGroups[i].playerNum) {
	  			connected = true;
	  			connectedPlayer = new Player(playerGroups[i].players.length+1, i);
	  			playerGroups[i].players.push(connectedPlayer);
	  			playerGroups[i].socketIds.push(socket.id);
	  			console.log("Socket connected at group: " + i + ". socket Id:" + socket.id);
	  			i = playerGroups.length;
	  		}
	  	}
	  	if (!connected) {
	  		playerGroups.push(new PlayerGroup(data.playerNumber, data.gridWidth, data.gridHeight, data.time));
	  		console.log("New player group created");
	  	}
	}

	//recieve data from playerGroup changed
	//emit to sockets in that player group

	let currentGroup = playerGroups[connectedPlayer.group];
	for (let i=0; i<currentGroup.socketIds.length; i++) {
	  	io.to(currentGroup.socketIds[i]).emit('recieveData', {
		  	players : currentGroup.players,
		  	playerNumber: currentGroup.playerNum,
		  	wG : currentGroup.wG,
		  	hG : currentGroup.hG,
		  	id : connectedPlayer.id,
		  	walls : currentGroup.walls,
		});
	}

	currentGroup.connected[findCurrent(currentGroup, connectedPlayer)] = true;
	currentGroup.connectedCount++;

	if (currentGroup.playerNum == currentGroup.players.length) {
	  	currentGroup.players[Math.trunc(Math.random()*currentGroup.playerNum)].infected = true;
	  	for (let i=0; i<currentGroup.socketIds.length; i++)
	  		io.to(currentGroup.socketIds[i]).emit('updateInfected', {players: currentGroup.players, firstInfected: true});
	  	play(currentGroup);
	}
  });


  socket.on('move', function(data) {
  	let currentGroup = playerGroups[data.currentGroup];
  	if (currentGroup==null) return;
  	let current = findCurrent(currentGroup, data.id);
  	if (current == null) return;
  	//Check it can move here
  	let newX = currentGroup.players[current].x + data.dir[0];
  	let newY = currentGroup.players[current].y + data.dir[1];

  	if (newX > 0 && newX < currentGroup.wG-1 && newY > 0 && newY < currentGroup.hG-1 && !currentGroup.walls[newX][newY]) {
  		currentGroup.players[current].prevX = currentGroup.players[current].x;
  		currentGroup.players[current].prevY = currentGroup.players[current].y;
  		currentGroup.players[current].x = newX;
  		currentGroup.players[current].y = newY;
  	}

  	let anyInfected = false;
	for (let i=0; i<currentGroup.players.length; i++) {
	    if (i != current && currentGroup.players[i].x == currentGroup.players[current].x && currentGroup.players[i].y == currentGroup.players[current].y) {
			if (currentGroup.players[i].infected && !currentGroup.players[current].infected) {
				currentGroup.players[current].infected = true;
				anyInfected = true;
			}
			else if (!currentGroup.players[i].infected && currentGroup.players[current].infected) {
				currentGroup.players[i].infected = true;
				anyInfected = true;
			}
	    }
	}

	if (!currentGroup.players[current].infected) {
		for (let i=0; currentGroup.shots != null && i<currentGroup.shots.length; i++) {
			for (let j=0; currentGroup.shots[i]!=null && j<currentGroup.shots[i].positions.length; j++) {
				if (currentGroup.players[current].x == currentGroup.shots[i].positions[j][0] 
					&& currentGroup.players[current].y == currentGroup.shots[i].positions[j][1]) {
					currentGroup.players[current].infected = true;
					anyInfected = true;
				}
			}
		}
	}

    if (anyInfected) {
		for (let i=0; i<currentGroup.socketIds.length; i++)
			io.to(currentGroup.socketIds[i]).emit('updateInfected', {players: currentGroup.players, firstInfected: false});
		let infNum = 0;
		for (let i=0; i<currentGroup.players.length; i++){
			if (currentGroup.players[i].infected) infNum++;
		}
		currentGroup.infectedNum = infNum;
		if (currentGroup.infectedNum == currentGroup.playerNum) {
			//GAME OVER
			for (let i=0; i<currentGroup.socketIds.length; i++)
				io.to(currentGroup.socketIds[i]).emit('gameOver', {infectedWon: true});
			//detele playerGroup
			currentGroup.gameOver = true;
			playerGroups.splice(findGroupIndex(currentGroup),1);
			currentGroup = null;
		}
	}

	for (let i=0; currentGroup != null && i<currentGroup.tokens.length; i++) {
		if (currentGroup.players[current].x == currentGroup.tokens[i][0] && currentGroup.players[current].y == currentGroup.tokens[i][1]) {
			currentGroup.tokens.splice(i, 1);
			for (let k=0; k<currentGroup.socketIds.length; k++) 
				io.to(currentGroup.socketIds[k]).emit('updateTokens', {newTokens: currentGroup.tokens});
			if (currentGroup.players[current].infected)
				currentGroup.timer += currentGroup.tokenTimeIncrease;
			else 
				currentGroup.timer -= currentGroup.tokenTimeIncrease;
		}
	}

  	for (let i=0; currentGroup!=null && i<currentGroup.socketIds.length; i++)
  		io.to(currentGroup.socketIds[i]).emit('updatePositions', {players: currentGroup.players})
  });


  socket.on('placeWall', function(data) {
  	let currentGroup = playerGroups[data.currentGroup];
  	if (currentGroup==null) return;
  	let current = findCurrent(currentGroup, data.id);

  	//Check there is no other wall, ...
  	currentGroup.walls[currentGroup.players[current].prevX][currentGroup.players[current].prevY] = !currentGroup.walls[currentGroup.players[current].prevX][currentGroup.players[current].prevY];

  	for (let i=0; i<currentGroup.socketIds.length; i++)
  		io.to(currentGroup.socketIds[i]).emit('updateWall', {x: currentGroup.players[current].prevX, y: currentGroup.players[current].prevY, d:true});
  });

  //socket.emit('newShot', {x: currentPlayer.x, y: currentPlayer.y, dir: [currentPlayer.prevX, currentPlayer.prevY]});
  socket.on('newShot', function(data) {
  	let currentGroup = playerGroups[data.currentGroup];
  	let current = currentGroup.players[findCurrent(currentGroup, data.id)];
	if (current.ammo > 0) {
  		let direction = [current.x-current.prevX, current.y-current.prevY];
  		let shot = new Shot(current.x, current.y, direction, 400);
  		currentGroup.shots.push(shot);
  		current.ammo--;
  	}
  	if (current.ammo <= 0 && !current.reloading) {
  		current.reloading = true;
  		setTimeout(function() {if (current!=null) current.ammo = 3; current.reloading = false;}, 5000);
  	}
  });
}



setTimeout(loop, 20);


function loop() {


	for (let i=0; i<playerGroups.length; i++) {
		let deletedGroup = false;
		for (let j=0; playerGroups[i]!=null && j<playerGroups[i].shots.length; j++) {
			let shot = playerGroups[i].shots[j];
			if (shot!=null) shot.t += 20;
			if (shot!=null && shot.t > shot.timer) {
				shot.t = 0;
				let newPos = [shot.positions[shot.positions.length-1][0]+shot.dir[0],shot.positions[shot.positions.length-1][1]+shot.dir[1]];
				shot.positions.push(newPos);
				
				if (newPos[0]<=0 || newPos[0]>=playerGroups[i].wG || newPos[1]<=0 || newPos[1]>=playerGroups[i].hG) {
					for (let k=j; k<playerGroups[i].shots.length-1; k++)
						playerGroups[i].shots[k] = playerGroups[i].shots[k+1];
					//j--;
					playerGroups[i].shots[playerGroups[i].shots.length-1] = null;
					for (let j=0; j<playerGroups[i].socketIds.length; j++)
  						io.to(playerGroups[i].socketIds[j]).emit('updateShots', {shots: playerGroups[i].shots});
				}
				else {
				//If its touching another player in the playerGroup infect it
				let hasInfected = false;
				for (let k=0; k<playerGroups[i].players.length; k++) {
					let player = playerGroups[i].players[k];
					for (let l=0; l<shot.positions.length; l++) {
						if (!player.infected && player.x == shot.positions[l][0] && player.y == shot.positions[l][1]) {
							player.infected = true;
							hasInfected = true;
							playerGroups[i].infectedNum++;
							k = playerGroups[i].players.length; //exit for
						}
					}
				}

				
				if (playerGroups[i].infectedNum == playerGroups[i].playerNum) {
					for (let k=0; k<playerGroups[i].socketIds.length; k++)
						io.to(playerGroups[i].socketIds[k]).emit('gameOver', {infectedWon: true});
					playerGroups[i].gameOver = true;
					playerGroups.splice(i,1);
					deletedGroup = true;
				}
				else if (hasInfected) {
					for (let k=0; k<playerGroups[i].socketIds.length; k++)
						io.to(playerGroups[i].socketIds[k]).emit('updateInfected', {players: playerGroups[i].players, firstInfected: false});
				}

				//If its touching a wall make it not a wall
				for (l=0; !deletedGroup && l<shot.positions.length; l++) {
					if (playerGroups[i].walls[shot.positions[l][0]][shot.positions[l][1]]) {
						playerGroups[i].walls[shot.positions[l][0]][shot.positions[l][1]] = false;
						for (let k=0; k<playerGroups[i].socketIds.length; k++)
							io.to(playerGroups[i].socketIds[k]).emit('updateWall', {x: shot.positions[l][0], y: shot.positions[l][1], d: false});
					}
				}
				}
			}
		}
		for (let j=0; !deletedGroup && j<playerGroups[i].socketIds.length; j++)
  			io.to(playerGroups[i].socketIds[j]).emit('updateShots', {shots: playerGroups[i].shots});
	}

	setTimeout(loop, 20);
}

console.log("My socket server is running");


function Player(id, playerGroup) {
	this.id = id;
	this.group = playerGroup;
	this.x = Math.round(Math.random()*(playerGroups[this.group].wG-3) + 1);
	this.y = Math.round(Math.random()*(playerGroups[this.group].hG-3) + 1);
	this.col;
	this.infected = false;

	while(playerGroups[this.group].walls[this.x][this.y] == true) {
		this.x = Math.round(Math.random()*(playerGroups[this.group].wG-3) + 1);
		this.y = Math.round(Math.random()*(playerGroups[this.group].hG-3) + 1);
	}

	this.prevX = this.x-1;
	this.prevY = this.y;

	this.ammo = 3;
	this.reloading = false;
}

function Shot(x, y, direction, timer) {
	this.positions = [];
	this.positions[0] = [x, y];
	this.dir = direction;

	this.timer = timer;
	this.t = 0;
}


function PlayerGroup(playerNumber, gridWidth, gridHeight, time) {
	this.players = [];
	this.walls = [];
	this.playerNum = playerNumber;
	this.wG = gridWidth;
	this.hG = gridHeight;
	this.infectedNum = 1;
	this.shots = [];
	this.connected = [];
	this.connectedCount = 0;

	this.timer = time;
	this.t = 0;
	this.tokenTimeIncrease = 5000;

	this.wallProb = .1;

	for (let i=0; i<this.wG; i++) {
		this.walls[i] = new Array();
		for (let j=0; j<this.hG; j++) {
			this.walls[i][j] = false;
			if (Math.random()<this.wallProb)
				this.walls[i][j] = true;
		}
	}

	this.socketIds = [];
	this.tokens = [];
	this.tokenTime = 0;
	this.spawnTokenTime = 10000;
	this.tokenMinDist = 5;

	this.gameOver = false;
}



function play(playerG) {
	let sendTime;
	let endGame = setInterval(function() {
		if (playerG.gameOver) {
			clearInterval(sendTime);
			clearInterval(endGame);
			return;
		}
		if (playerG.timer - playerG.t <= 0) {
			for (let k=0; k<playerG.socketIds.length; k++)
				io.to(playerG.socketIds[k]).emit('gameOver', {infectedWon: false});
			playerGroups.splice(findGroupIndex(playerG),1);
			clearInterval(sendTime);
			clearInterval(endGame);
		}
		else if (playerG.tokenTime >= playerG.spawnTokenTime) {
			playerG.tokenTime = 0;
			let xT = -1;
			let yT = -1;
			let onPlayer = true;
			while(onPlayer || playerG.walls[xT][yT]) {
				xT = Math.round(Math.random()*(playerG.wG-3) + 1);
				yT = Math.round(Math.random()*(playerG.hG-3) + 1);
				onPlayer = false;
				for (let i=0; i<playerG.players.length; i++) {
					onPlayer = onPlayer || Math.pow(playerG.players[i].x-xT, 2) + Math.pow(playerG.players[i].y-yT,2) <= playerG.tokenMinDist;
				}
			}
			playerG.tokens.push([xT, yT]);
			for (let i=0; i<playerG.socketIds.length; i++)
				io.to(playerG.socketIds[i]).emit('updateTokens', {newTokens: playerG.tokens});
		}
	}, 1000);

	sendTime = setInterval(function() {
		playerG.t += 1000;
		playerG.tokenTime += 1000;
		for (let i=0; playerG.socketIds!=null &&  i<playerG.socketIds.length; i++) {
			io.to(playerG.socketIds[i]).emit('timeLeft', {t : playerG.timer-playerG.t});
		}
	}, 1000);
}


function findCurrent(currentGroup, idC) {
	for (let i=0; i<currentGroup.players.length; i++) {
  		if (currentGroup.players[i].id == idC) {
  			return i;
  		}
  	}
}

function deleteShot(shot, shots) {
	for (let i=0; i<shots.length; i++) {
		if (shots[i] == shot) {
			for (let j=i; j<shots.length-1; j++) {
				shots[j] = shots[j+1];
			}
			shots[shots.length-1] = null;
			i = shots.length+1;
		}
	}
}

function findGroupIndex(g) {
	for (let ii=0; ii<playerGroups.length; ii++)
		if (playerGroups[ii] == g) return ii;
}