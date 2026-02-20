const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Allows your WordPress site to talk to this server
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    players[socket.id] = {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 200,
        z: 0,
        color: '#3498db',
        lastMsg: ""
    };

    socket.emit('init', { id: socket.id, player: players[socket.id] });
    io.emit('updatePlayers', players);

    socket.on('move', (data) => {
        if (players[socket.id]) {
            Object.assign(players[socket.id], data);
            socket.broadcast.emit('updatePlayers', players);
        }
    });

    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].lastMsg = msg;
            io.emit('newChatMessage', { id: socket.id.substr(0, 4), text: msg, color: players[socket.id].color });
            io.emit('updatePlayers', players);
            setTimeout(() => {
                if (players[socket.id]) { players[socket.id].lastMsg = ""; io.emit('updatePlayers', players); }
            }, 5000);
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; io.emit('updatePlayers', players); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
