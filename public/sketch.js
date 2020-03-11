let socket;


let players = [];

let player;

let w, h;

let wG, hG;

let playerID = -1;

let walls;
let playerNum = 0;
let gameOver = false;
let infectedWon = false;

let shots = [];
let gameLoop = false;

let connectedNum = 0;

let connected = false;
let youWin = false;
let firstInfected = false;

let wMult = 1;
let hMult = .77;

let tokens = [];

function setup() {
  calcMults();
  let cnv = createCanvas(windowWidth*wMult, windowWidth*hMult);
  cnv.parent("canvasContainer");
  noLoop();
  noStroke();
}

function checkIfPlay() {
  background(200);
  fill(0);
  textSize(20);
  textAlign(CENTER);
  text(("Waiting for players... " + "(" + players.length + "/" + playerNum + ")"),width/2, height/2);
  w = width/wG;
  h = height/hG;
  if (players.length == playerNum) {
    updateColors();
    loop();
    gameLoop = true;
    textSize(w/2);
    textAlign(LEFT);
  }
}

function windowResized() {
  calcMults();
  resizeCanvas(windowWidth*wMult, windowWidth*hMult);
  w = width/wG;
  h = height/hG;
}

function connectWithServer(nPlayers, size, connectionExists, time) {
  background(200);
  connected = true;
  youWin = false;
  gameOver = false;
  playerNum = nPlayers;
  wG = size[0];
  hG = size[1];

  if (!connectionExists) {
    socket = io.connect('http://192.168.1.28:3000');
    console.log("connected with server");
    socket.emit('setUp', {playerNumber: playerNum, gridWidth: wG, gridHeight: hG, time: time});
  }
  else {
    socket.emit('enterPlayerGroup', {playerNumber: playerNum, gridWidth: wG, gridHeight: hG, time: time});
  }
  //I want to get pushed to a group with playerNum = nPlayers, wG = size[0], hG = size[1]

  //Recieve other players grids
  socket.on('recieveData', function(data) {
    players = data.players;
    if (playerID == -1) {
      wG = data.wG;
      hG = data.hG;
      playerID = data.id;
      walls = data.walls;
      playerNum = data.playerNumber;
    }
    checkIfPlay();
  });

  socket.on('updatePositions', function(data) {
    players = data.players;
    updateColors();
  });

  socket.on('updateInfected', function(data) {
    players = data.players; 
    updateColors(); 
    if(data.firstInfected && players[findCurrent(playerID)].infected)
      firstInfected = true;
  });
  socket.on('updateWall', function(data) {walls[data.x][data.y] = data.d});
  socket.on('updateTokens', function(data) {tokens = data.newTokens;});

  socket.on('gameOver', function(data) {
    console.log("game over");
    infectedWon = data.infectedWon;
    if (!gameOver) {youWin = (firstInfected == infectedWon);}
    gameOver = true;
    wG = 0;
    hG = 0;
    playerID = -1;
    walls = [];
    playerNum = 0;
    shots = [];
    players = [];
    tokens = [];
    connectedNum = 0;
    gameLoop = false;
    firstInfected = false;
    document.getElementById("connectedPlayersNumber").innerHTML = connectedNum + "/" + playerNum;
    gameOver = true;
    allGray();
  });

  socket.on('updateShots', function(data) {shots = data.shots;});


  socket.on('connectedNum', function(data) {
    if (connectedNum != data.connectedPlayers) {
      connectedNum = data.connectedPlayers;
      document.getElementById("connectedPlayersNumber").innerHTML = connectedNum + "/" + playerNum;
    }
  });

  socket.on('onlinePlayers', function(data) {
    document.getElementById("onlinePlayersNumber").innerHTML = data.onlinePlayers;
  });

  socket.on('timeLeft', function(data) {
    if (data.t/1000 < 10) {
    document.getElementById("clockText").style.color = "red";
    document.getElementById("clockText").style.borderColor = "red";
   }
   else {
    document.getElementById("clockText").style.color = "black";
    document.getElementById("clockText").style.borderColor = "black";
   }
    document.getElementById("clockText").innerHTML = data.t/1000 + "s";
  });
}


function exitGame() {
  background(200);
  if (!connected) {
   alert("You arent currently connected to any game");
   return;
  }
  socket.emit('exitPlayerGroup', {player: players[findCurrent(playerID)], socketId: socket.id});
  connected = false;
  firstInfected = false;
  youWin = false;
  wG = 0;
  hG = 0;
  playerID = -1;
  walls = [];
  playerNum = 0;
  shots = [];
  players = [];
  tokens = [];
  connectedNum = 0;
  gameLoop = false;
  document.getElementById("connectedPlayersNumber").innerHTML = connectedNum + "/" + playerNum;
  gameOver = true;

  allGray();

}

function draw() {

  stroke(0); strokeWeight(1);
  for (let i=0; i<wG; i++) {
    for (let j=0; j<hG; j++) {
      stroke(0);
      if (i==0 || i==wG-1 || j==0 || j==hG-1) {
        noStroke();
        if (!players[findCurrent(playerID)].infected) fill(players[findCurrent(playerID)].col);
        else fill(255, 0, 0);
      }
      else if (walls[i][j]) fill(0);
      else fill(200);
      rect(i*w, j*h, w, h);
    }
  }
  for (let i=0; i<players.length; i++) {
    noStroke(); fill(players[i].col);
    if (players[i].infected) fill(255, 0, 0);
    rect(players[i].x*w, players[i].y*h, w, h);
    strokeWeight(5);
    noFill();
    if (!players[i].infected) {
      stroke(players[i].col);
      rect(players[i].prevX*w, players[i].prevY*h, w, h);
    }
    else {
      stroke(255, 0, 0);
      rect((2*players[i].x-players[i].prevX)*w, (2*players[i].y-players[i].prevY)*h, w, h);
    }
  }
  noStroke();

  fill(0, 255, 0);
  for (let i=0; i<tokens.length; i++) {
    rect(tokens[i][0]*w+0.1*w, tokens[i][1]*h+0.1*h, w*0.8, h*0.8);
  }

  fill(100, 0, 0, 100);
  for (let i=0; i<shots.length; i++) {
    if (shots[i] != null) {
      for (let j=0; j<shots[i].positions.length; j++)
        rect(shots[i].positions[j][0]*w, shots[i].positions[j][1]*h, w, h);
    }
  }

  fill(255);
  if (gameLoop) {text("ammo: " + players[findCurrent(playerID)].ammo, w/2, h/2);}

  if (gameOver) {
    textAlign(CENTER);
    noStroke();
    textSize(25);
    if (youWin){
      fill(0, 150, 0);
      rect(width*0.15, height/4, width*0.7, height/2);
      fill(255);
    }
    else {
      fill(150);
      rect(width*0.15, height/4, width*0.7, height/2);
      fill(255);
    }

    if (infectedWon && !youWin)
      text("The INFECTED have won", width/2, height/2);
    else if (infectedWon && youWin)
      text("You INFECTED everyone. YOU WIN!", width/2, height/2);
    else if (!infectedWon && youWin)
      text("You survived, YOU WIN!", width/2, height/2);
    else 
      text("All players were not INFECTED", width/2, height/2);
    text("Press PLAY to join a new game", width/2, height/2+35);
    noLoop();
  }
}

function keyPressed() {
  let direction;
  let changed = true;
  direction = [0, 0];
  switch (keyCode) {
    case UP_ARROW:
      direction = [0, -1];
      break;
    case DOWN_ARROW:
      direction = [0, 1];
      break;
    case LEFT_ARROW:
      direction = [-1, 0];
      break;
    case RIGHT_ARROW:
      direction = [1, 0];
      break;
    default:
      changed = false;
  }
  if (changed) {
    socket.emit('move', {dir: direction, id: playerID, currentGroup: players[findCurrent(playerID)].group});
  }
  else if (keyCode == 32) {
    if (!players[findCurrent(playerID)].infected)
      socket.emit('placeWall', {id: playerID, currentGroup: players[0].group});
    else {
      let currentPlayer = players[findCurrent(playerID)];
      socket.emit('newShot', {id: playerID, currentGroup: players[0].group});
    }
  }
}



function updateColors() {
  for (let i=0; i<players.length; i++) {
    switch(players[i].id) {
      case 1:
      players[i].col = color(237, 246, 125);
      break;
      case 2:
      players[i].col = color(248, 150, 216);
      break;
      case 3: 
      players[i].col = color(86, 69, 146);
      break;
      case 4: 
      players[i].col = color(134, 187, 216);
      break;
    }
  }
}


function findCurrent(idC) {
  for (let i=0; i<players.length; i++) {
    if (players[i].id == idC) {
      return i;
    }
  }
}


function calcMults() {
  while (windowWidth*hMult > windowHeight*0.95) {
    wMult -= 0.01;
    hMult -= 0.012;
  }
}