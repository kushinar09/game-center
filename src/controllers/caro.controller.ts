/* eslint-disable prettier/prettier */
import { Controller, Get, Render } from "@nestjs/common"

@Controller("caro")
export class CaroController {
  @Get()
  @Render("caro/index")
  getGamePage() {
    return {
      title: "Caro Game",
      description: "Play Caro game online with friends",
    }
  }
}
