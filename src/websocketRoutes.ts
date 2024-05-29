import { Server as SocketIOServer } from "socket.io";

export const handleWebSocketRoutes = (io: SocketIOServer) => {

    var activeSockets: { id: string, name: string, role: string }[] = [];

    io.on("connection", socket => {

        const findUser = (socketId: string) => activeSockets.find(existingSocket => existingSocket.id === socketId);

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

        socket.on("call-user", (data: any) => {
            socket.to(data.to).emit("call-made", {
                offer: data.offer,
                socket: socket.id,
                data: findUser(socket.id)
            });
        });

    socket.on("make-answer", data => {
        socket.to(data.to).emit("answer-made", {
            socket: socket.id,
            answer: data.answer
        });
    });

    socket.on("reject-call", data => {
        socket.to(data.from).emit("call-rejected", {
            socket: socket.id,
            data: findUser(socket.id)
        });
    });

    socket.on("disconnect", () => {
        activeSockets = activeSockets.filter(
            existingSocket => existingSocket.id !== socket.id
        );
        socket.broadcast.emit("remove-user", {
            socketId: socket.id
        });
    });
});
}