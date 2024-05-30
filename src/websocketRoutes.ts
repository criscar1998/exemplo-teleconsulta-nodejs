import { Server as SocketIOServer } from "socket.io";
import { generateUniqueId } from "./_helpers/genereteUniqueId";

interface user {
    id: string;
    name: string;
    role: string;
    offer?: any;
}

interface room {
    id: string,
    name: string,
    users: user[]
}

export const handleWebSocketRoutes = (io: SocketIOServer) => {
    //const maximum = 4;
    var activeSockets: user[] = [];
    var rooms: room[] = [];

    const findUser = (socketId: string) => activeSockets.find(existingSocket => existingSocket.id === socketId);

    io.on("connection", socket => {

        socket.on("user-identified", (userData: { name: string, role: string }) => {

            const existingSocket = activeSockets.find(
                existingSocket => existingSocket.id === socket.id
            );

            if (!existingSocket) {
                activeSockets.push({ id: socket.id, ...userData });
            } else {
                existingSocket.name = userData.name;
                existingSocket.role = userData.role;
            }

            const doctors = activeSockets.filter(
                existingSocket => existingSocket.role === 'doctor'
            );

            const patients = activeSockets.filter(
                existingSocket => existingSocket.role !== 'doctor'
            );

            doctors.forEach(doctor => {
                io.to(doctor.id).emit("update-patient-list", {
                    patients: patients
                });
            });
        });

        socket.on("call-user-room", (data: any) => {
            io.to(data.socketId).emit("room-invite", { room: data.room, user: findUser(socket.id) });
        });

        socket.on("create-room", (roomName: string) => {
            const roomId = generateUniqueId();
            const newRoom: room = {
                id: roomId,
                name: roomName,
                users: []
            };
            rooms.push(newRoom);
            io.emit("room-created", newRoom);
        });


        socket.on("join-room", data => {
            const room = rooms.find(room => room.id === data.roomId);
            if (room) {
                /*  if (room.users.length >= maximum) {
                     socket.emit("room-full");
                     return;
                 } */
                const user = findUser(socket.id);
                const userWithOffer = { ...user, offer: data.offer };
                room.users.push(userWithOffer);
                socket.join(data.roomId);
                io.to(data.roomId).emit("user-joined", { user: userWithOffer });

                console.log(room);
            }
        });

        socket.on("leave-room", (roomId: string) => {
            const room = rooms.find(room => room.id === roomId);
            if (room) {
                room.users = room.users.filter(user => user.id !== socket.id);
                socket.leave(roomId);
                io.to(roomId).emit("user-left", { userId: socket.id });
            }
        });

        socket.on('answer', (data: any) => {
            const user = findUser(socket.id);
            const room = rooms.find(room => room.id === data.roomId);
            if (room && user) {
                room.users.forEach(user => {
                    io.to(user.id).emit('answer', { answer: data.answer });
                });
            }
        });

        socket.on("ice-candidate", (data) => {
            const candidate = data.candidate;
            socket.to(data.socketId).emit("ice-candidate", { candidate: candidate });
            console.log(data);
            // Aqui você pode encaminhar o candidato ICE para o outro usuário na sala

        });


        socket.on("disconnect", () => {
            activeSockets = activeSockets.filter(existingSocket => existingSocket.id !== socket.id);
        });

    });
}