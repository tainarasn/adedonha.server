import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = require('http').createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});


app.use(cors());

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`)
    console.log(`Salas do cliente ${socket.id}:`, socket.rooms);
    
    socket.on('join-room', (data: { roomId: string, username: string }) => {
        const { roomId, username } = data
        
        console.log(`User ${username} (ID: ${socket.id}) entrou na sala ${roomId}`)
        socket.join(roomId)
        
        io.to(roomId).emit('user-joined', { id: socket.id, username, rooms: socket.rooms });
    })
  
    socket.on('leave-room', (data: { roomId: string, username:string }) => {
        const { roomId, username } = data

        console.log(`User ${username} saiu da sala ${roomId}`)
        socket.leave(roomId);
        socket.to(roomId).emit('user-left',{ userId: socket.id, username})
    })

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`)
      })
})

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000/')
})