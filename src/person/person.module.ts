import { Module } from '@nestjs/common';
import { PersonController } from './person.controller';
import { PersonService } from './person.service';
import { EventsModule } from '../events/events.module';
import { personCollectionProvider } from '../database';

@Module({
  imports: [EventsModule],
  controllers: [PersonController],
  providers: [PersonService, personCollectionProvider],
})
export class PersonModule {}
