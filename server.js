const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

let players = {};
io.on('connection', (socket) => {
    players[socket.id] = { x: 200, y: 200, z: 0, nick: "Guest", lastMsg: "" };
    socket.emit('init', { id: socket.id, player: players[socket.id] });
    
    socket.on('move', (data) => {
        if (players[socket.id]) {
            Object.assign(players[socket.id], data);
            socket.broadcast.emit('updatePlayers', players);
        }
    });

    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].lastMsg = msg;
            io.emit('newChatMessage', { id: players[socket.id].nick || "Guest", text: msg });
            io.emit('updatePlayers', players);
            setTimeout(() => { if(players[socket.id]){ players[socket.id].lastMsg = ""; io.emit('updatePlayers', players); }}, 5000);
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; io.emit('updatePlayers', players); });
});

server.listen(process.env.PORT || 3000);
