# Event Sourcing Architecture

## Overview
This project uses **pure Event Sourcing** for all data persistence. All state is derived from events stored in the `postgres-events` database. There is no traditional CRUD database - all data is reconstructed from the event log.

## Architecture

### Events Database (postgres-events)
- **Container**: postgres-events
- **Database**: eventstore
- **User**: events
- **Password**: events123
- **Port**: 5433
- **Purpose**: Single source of truth - stores all domain events

### How It Works

#### Write Operations
1. User creates/updates/deletes a Person
2. Service generates a unique ID and creates an event
3. Event is persisted to `eventstore.events` table
4. Operation completes (no other database involved)

#### Read Operations
1. Service queries all events for aggregate type (Person)
2. Events are replayed in order to reconstruct current state
3. Final state is returned to client

### Event Types

**Person Aggregate Events:**
1. **PersonCreated** - A new person was created
2. **PersonUpdated** - Person details were modified
3. **PersonDeleted** - Person was deleted (soft delete via event)

### Event Table Structure
```sql
CREATE TABLE eventstore.events (
  id UUID PRIMARY KEY,
  "aggregateId" UUID NOT NULL,      -- Person ID
  "aggregateType" VARCHAR(255),     -- "Person"
  "eventType" VARCHAR(255),         -- "PersonCreated", etc.
  "eventData" JSONB,                -- Event payload
  metadata JSONB,                   -- Source, userId, etc.
  version INTEGER,                  -- Event version
  timestamp TIMESTAMP,              -- Event time
  "createdAt" TIMESTAMP            -- Storage time
);
```

## Environment Configuration

`.env` file:
```env
EVENTS_DATABASE_URL="postgresql://events:events123@localhost:5433/eventstore"
```

## Running the Application

### 1. Start Docker Containers
```bash
docker-compose up -d postgres-events
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Application
```bash
npm run start:dev
```

## Benefits of This Architecture

✅ **Complete Audit Trail** - Every change is recorded forever  
✅ **Time Travel** - Can reconstruct state at any point in time  
✅ **Event Replay** - Rebuild entire system from events  
✅ **No Data Loss** - Events are immutable and never deleted  
✅ **Debugging** - Full history of all changes  
✅ **Analytics** - Rich event data for business intelligence  

## Implementation Details

### PersonService
- No longer uses Prisma or SQLite
- Creates UUIDs for new entities
- Publishes events to event store
- Reconstructs state by replaying events from database

### EventsService
- Direct PostgreSQL connection using `pg` library
- Stores events with full metadata
- Queries events by aggregate ID or type
- Returns events in chronological order

## Event Sourcing Pattern

```typescript
// Create a person
const person = await personService.create({
  name: 'John Doe',
  email: 'john@example.com'
});
// → Stores PersonCreated event

// Update the person
await personService.update(person.id, {
  email: 'newemail@example.com'
});
// → Stores PersonUpdated event

// Read the person
const current = await personService.findOne(person.id);
// → Replays PersonCreated + PersonUpdated events
// → Returns current state

// Delete the person
await personService.remove(person.id);
// → Stores PersonDeleted event
// → Future reads will not return this person
```

## Performance Considerations

- Events are indexed by aggregateId, aggregateType, and createdAt
- For production, consider implementing snapshots for large event streams
- Add caching layer for frequently accessed aggregates
- Implement CQRS (Command Query Responsibility Segregation) with read models

## Next Steps

1. ✅ Pure event sourcing implementation
2. ✅ Event replay for state reconstruction
3. 🔄 Add snapshots for performance optimization
4. 🔄 Implement CQRS read models (e.g., MongoDB projections)
5. 🔄 Add event versioning strategies
6. 🔄 Implement saga patterns for distributed transactions

