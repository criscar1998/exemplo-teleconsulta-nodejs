import express, { Application } from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";
import { middlewareCors } from "./middlewareCors";
import router from "./routes";
import { handleWebSocketRoutes } from "./websocketRoutes";


export class Server {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private readonly DEFAULT_PORT = 5000;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new SocketIOServer(this.httpServer, { cors: {origin: 'http://localhost:4200'}, transports: ['websocket', 'polling'] });

        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }

    private configureApp(): void {
        this.app.use(middlewareCors());
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    private configureRoutes(): void {
        this.app.use("/", router);
    }

    private handleSocketConnection(): void {
        handleWebSocketRoutes(this.io)
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}
