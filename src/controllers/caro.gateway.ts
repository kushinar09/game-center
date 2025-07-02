/* eslint-disable prettier/prettier */
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CaroService } from 'src/services/caro.service';

@WebSocketGateway({ namespace: '/caro', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly caroService: CaroService) {}

  handleConnection(client: Socket) {
    this.caroService.addPlayer(client, this.server);
  }

  @SubscribeMessage('move')
  handleMove(client: Socket, payload: { x: number; y: number }) {
    this.caroService.processMove(client, payload, this.server);
  }

  @SubscribeMessage('rematch')
  handleRematchRequest(client: Socket) {
    this.caroService.requestRematch(client, this.server);
  }
}
