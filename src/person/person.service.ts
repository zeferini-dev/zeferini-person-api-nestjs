import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonEntity } from './entities/person.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PersonService {
  constructor(private readonly eventsService: EventsService) {}

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
    const events = await this.eventsService.getEventsByAggregateType('Person');
    const personsMap = new Map<string, PersonEntity>();

    // Reconstruct state from events
    for (const event of events.reverse()) {
      const { aggregateId, eventType, eventData } = event;

      if (eventType === 'PersonCreated') {
        personsMap.set(aggregateId, new PersonEntity({
          id: eventData.id,
          name: eventData.name,
          email: eventData.email,
          createdAt: new Date(eventData.createdAt),
          updatedAt: new Date(eventData.createdAt),
        }));
      } else if (eventType === 'PersonUpdated') {
        const person = personsMap.get(aggregateId);
        if (person) {
          person.name = eventData.name || person.name;
          person.email = eventData.email || person.email;
          person.updatedAt = new Date(eventData.updatedAt);
        }
      } else if (eventType === 'PersonDeleted') {
        personsMap.delete(aggregateId);
      }
    }

    // Return all non-deleted persons
    return Array.from(personsMap.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findOne(id: string): Promise<PersonEntity> {
    const events = await this.eventsService.getEventsByAggregateId(id);

    if (events.length === 0) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    let person: PersonEntity | null = null;

    // Reconstruct state from events
    for (const event of events) {
      const { eventType, eventData } = event;

      if (eventType === 'PersonCreated') {
        person = new PersonEntity({
          id: eventData.id,
          name: eventData.name,
          email: eventData.email,
          createdAt: new Date(eventData.createdAt),
          updatedAt: new Date(eventData.createdAt),
        });
      } else if (eventType === 'PersonUpdated' && person) {
        person.name = eventData.name || person.name;
        person.email = eventData.email || person.email;
        person.updatedAt = new Date(eventData.updatedAt);
      } else if (eventType === 'PersonDeleted' && person) {
        person = null;
      }
    }

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
