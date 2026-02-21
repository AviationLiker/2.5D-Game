const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

let players = {};
let coin = { x: 400, y: 300 };

function respawnCoin() {
    coin.x = 100 + Math.random() * (800 - 200);
    coin.y = 100 + Math.random() * (600 - 200);
    io.emit('coinUpdate', coin);
}

io.on('connection', (socket) => {
    players[socket.id] = { x: 300, y: 300, z: 0, color: '#3498db', nick: "Guest", score: 0, lastMsg: "" };
    
    socket.emit('init', { id: socket.id, coin: coin });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            Object.assign(players[socket.id], data);
            
            // Server-side coin collision
            let dx = players[socket.id].x - coin.x;
            let dy = (players[socket.id].y - players[socket.id].z) - coin.y;
            if (Math.sqrt(dx*dx + dy*dy) < 30) {
                players[socket.id].score++;
                respawnCoin();
                io.emit('updatePlayers', players);
            }
            socket.broadcast.emit('updatePlayers', players);
        }
    });

    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].lastMsg = msg;
            io.emit('newChatMessage', { id: players[socket.id].nick, text: msg });
            io.emit('updatePlayers', players);
            setTimeout(() => { 
                if(players[socket.id]){ 
                    players[socket.id].lastMsg = ""; 
                    io.emit('updatePlayers', players); 
                }
            }, 5000);
        }
    });

    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        io.emit('updatePlayers', players); 
    });
});

server.listen(process.env.PORT || 3000);
