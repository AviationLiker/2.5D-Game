const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: { origin: "*" }
});

const path = require('path');

// Serve the game file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Default player data
    players[socket.id] = {
        x: 200,
        y: 200,
        z: 0,
        color: '#3498db',
        nick: "Guest",
        lastMsg: ""
    };

    // Send initial data to the new player
    socket.emit('init', { id: socket.id, player: players[socket.id] });

    // Handle movement, color, and nickname updates
    socket.on('move', (data) => {
        if (players[socket.id]) {
            Object.assign(players[socket.id], data);
            socket.broadcast.emit('updatePlayers', players);
        }
    });

    // Handle chat
    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].lastMsg = msg;
            io.emit('newChatMessage', { 
                id: players[socket.id].nick || "Guest", 
                text: msg 
            });
            io.emit('updatePlayers', players);

            // Hide bubble after 5 seconds
            setTimeout(() => {
                if (players[socket.id]) {
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
