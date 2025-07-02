/* eslint-disable prettier/prettier */
import { GameState, Position } from "src/models/game-state.model";

export interface MoveBallResponse {
  state: GameState;
  path: Position[]; 
}
