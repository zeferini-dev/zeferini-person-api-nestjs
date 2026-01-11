import { Injectable, Logger } from '@nestjs/common';
import { EventEntity } from './event.entity';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

export interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private pool: Pool;

  constructor() {
    this.initializePool();
  }

  private initializePool(): void {
    const databaseUrl = process.env.EVENTS_DATABASE_URL || 
      'postgresql://events:events123@localhost:5433/eventstore';

    this.logger.log(`Connecting to events database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

    this.pool = new Pool({
      connectionString: databaseUrl,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err);
    });
  }

  async publishEvent(payload: EventPayload): Promise<EventEntity> {
    const event = new EventEntity({
      id: uuidv4(),
      aggregateId: payload.aggregateId,
      aggregateType: payload.aggregateType,
      eventType: payload.eventType,
      eventData: payload.eventData,
      metadata: payload.metadata || {},
      version: 1,
      timestamp: new Date(),
      createdAt: new Date(),
    });

    await this.saveEventToDatabase(event);

    return event;
  }

  private async saveEventToDatabase(event: EventEntity): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO eventstore.events 
        (id, "aggregateId", "aggregateType", "eventType", "eventData", metadata, version, timestamp, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await client.query(query, [
        event.id,
        event.aggregateId,
        event.aggregateType,
        event.eventType,
        JSON.stringify(event.eventData),
        JSON.stringify(event.metadata),
        event.version,
        event.timestamp,
        event.createdAt,
      ]);

      this.logger.debug(
        `Event published: ${event.eventType} for ${event.aggregateType}/${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save event: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  private parseJsonField(value: unknown): any {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  async getEventsByAggregateId(aggregateId: string): Promise<EventEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 
          id, 
          "aggregateId" as "aggregateId",
          "aggregateType" as "aggregateType",
          "eventType" as "eventType",
          "eventData" as "eventData",
          metadata,
          version,
          timestamp,
          "createdAt" as "createdAt"
        FROM eventstore.events
        WHERE "aggregateId" = $1
        ORDER BY "createdAt" ASC
      `;

      const result = await client.query(query, [aggregateId]);

      return result.rows.map(
        (row) =>
          new EventEntity({
            ...row,
            eventData: this.parseJsonField(row.eventData),
            metadata: this.parseJsonField(row.metadata),
          }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getEventsByAggregateType(aggregateType: string): Promise<EventEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 
          id,
          "aggregateId" as "aggregateId",
          "aggregateType" as "aggregateType",
          "eventType" as "eventType",
          "eventData" as "eventData",
          metadata,
          version,
          timestamp,
          "createdAt" as "createdAt"
        FROM eventstore.events
        WHERE "aggregateType" = $1
        ORDER BY "createdAt" DESC
      `;

      const result = await client.query(query, [aggregateType]);

      return result.rows.map(
        (row) =>
          new EventEntity({
            ...row,
            eventData: this.parseJsonField(row.eventData),
            metadata: this.parseJsonField(row.metadata),
          }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllEvents(): Promise<EventEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 
          id,
          "aggregateId" as "aggregateId",
          "aggregateType" as "aggregateType",
          "eventType" as "eventType",
          "eventData" as "eventData",
          metadata,
          version,
          timestamp,
          "createdAt" as "createdAt"
        FROM eventstore.events
        ORDER BY "createdAt" DESC
        LIMIT 1000
      `;

      const result = await client.query(query);

      return result.rows.map(
        (row) =>
          new EventEntity({
            ...row,
            eventData: this.parseJsonField(row.eventData),
            metadata: this.parseJsonField(row.metadata),
          }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
