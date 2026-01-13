
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonEntity } from './entities/person.entity';
import { v4 as uuidv4 } from 'uuid';
import { Collection } from 'mongodb';
// Use nest-mongodb or sua própria injeção de Collection
// Exemplo: @Inject('PERSON_COLLECTION')


@Injectable()
export class PersonService {
  constructor(
    private readonly eventsService: EventsService,
    @Inject('PERSON_COLLECTION')
    private readonly personCollection: Collection<PersonEntity>,
  ) {}

  async create(data: CreatePersonDto): Promise<PersonEntity> {
    const personId = uuidv4();
    const now = new Date();

    const person = new PersonEntity({
      id: personId,
      name: data.name,
      email: data.email,
      createdAt: now,
      updatedAt: now,
    });

    await this.eventsService.publishEvent({
      aggregateId: person.id,
      aggregateType: 'Person',
      eventType: 'PersonCreated',
      eventData: {
        id: person.id,
        name: person.name,
        email: person.email,
        createdAt: person.createdAt,
      },
      metadata: {
        source: 'person-service',
        userId: null,
      },
    });

    return person;
  }

  async findAll(): Promise<PersonEntity[]> {
    const persons = await this.personCollection.find({}).toArray();
    return persons.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findOne(id: string): Promise<PersonEntity> {
    const person = await this.personCollection.findOne({ id });
    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }
    return person;
  }

  async update(id: string, data: UpdatePersonDto): Promise<PersonEntity> {
    // First check if person exists
    const existingPerson = await this.findOne(id);

    const now = new Date();
    const updatedPerson = new PersonEntity({
      ...existingPerson,
      name: data.name ?? existingPerson.name,
      email: data.email ?? existingPerson.email,
      updatedAt: now,
    });

    await this.eventsService.publishEvent({
      aggregateId: id,
      aggregateType: 'Person',
      eventType: 'PersonUpdated',
      eventData: {
        id: updatedPerson.id,
        name: updatedPerson.name,
        email: updatedPerson.email,
        updatedAt: updatedPerson.updatedAt,
        changes: data,
      },
      metadata: {
        source: 'person-service',
        userId: null,
      },
    });

    return updatedPerson;
  }

  async remove(id: string): Promise<PersonEntity> {
    // First check if person exists
    const person = await this.findOne(id);

    await this.eventsService.publishEvent({
      aggregateId: id,
      aggregateType: 'Person',
      eventType: 'PersonDeleted',
      eventData: {
        id: person.id,
        name: person.name,
        email: person.email,
        deletedAt: new Date(),
      },
      metadata: {
        source: 'person-service',
        userId: null,
      },
    });

    return person;
  }
}
