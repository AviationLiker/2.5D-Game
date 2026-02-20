const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS configuration to allow your WordPress site to connect
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Initial player state
    players[socket.id] = {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 200,
        z: 0,
        nick: "Guest", // Default nickname
        color: '#3498db',
        lastMsg: ""
    };

    // Send initial data to the player who just joined
    socket.emit('init', { id: socket.id, player: players[socket.id] });

    // Tell everyone a new player is here
    io.emit('updatePlayers', players);

    // Handle movement and nickname updates
    socket.on('move', (data) => {
        if (players[socket.id]) {
            // Update x, y, z, and nick if provided
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].z = data.z;
            if (data.nick !== undefined) {
                players[socket.id].nick = data.nick;
            }
            // Broadcast the update to everyone else
            socket.broadcast.emit('updatePlayers', players);
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].lastMsg = msg;
            
            // Send the message to everyone's chat log
            // Uses the nickname if available, otherwise first 4 chars of ID
            const displayName = players[socket.id].nick || socket.id.substr(0, 4);
            io.emit('newChatMessage', { 
                id: displayName, 
                text: msg 
            });

            // Refresh all players to show the bubble above the head
            io.emit('updatePlayers', players);

            // Clear the bubble after 5 seconds
            setTimeout(() => {
                if (players[socket.id]) {
                    players[socket.id].lastMsg = "";
                    io.emit('updatePlayers', players);
                }
            }, 5000);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

// Port configuration for Render/Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
