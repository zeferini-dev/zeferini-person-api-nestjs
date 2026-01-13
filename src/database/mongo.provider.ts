import { MongoClient, Collection } from 'mongodb';
import { PersonEntity } from '../person/entities/person.entity';
import { Provider } from '@nestjs/common';

export const personCollectionProvider: Provider = {
  provide: 'PERSON_COLLECTION',
  useFactory: async (): Promise<Collection<PersonEntity>> => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGO_DB || 'zeferini';
    const client = new MongoClient(uri);
    await client.connect();
    return client.db(dbName).collection<PersonEntity>('persons');
  },
};
