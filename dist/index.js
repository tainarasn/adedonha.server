"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const server = require('http').createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    }
});
app.use((0, cors_1.default)());
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    console.log(`Salas do cliente ${socket.id}:`, socket.rooms);
    socket.on('join-room', (data) => {
        const { roomId, username } = data;
        console.log(`User ${username} (ID: ${socket.id}) entrou na sala ${roomId}`);
        socket.join(roomId);
        io.to(roomId).emit('user-joined', { id: socket.id, username, rooms: socket.rooms });
    });
    socket.on('leave-room', (data) => {
        const { roomId, username } = data;
        console.log(`User ${username} saiu da sala ${roomId}`);
        socket.leave(roomId);
        socket.to(roomId).emit('user-left', { userId: socket.id, username });
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
});
