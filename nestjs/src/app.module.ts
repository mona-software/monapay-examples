import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [PaymentsController],
  providers: [OrdersService],
})
export class AppModule {}
