import { ApiProperty } from '@nestjs/swagger';

export class PersonEntity {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name: string;

  @ApiProperty({ example: 'ada@example.com' })
  email: string;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-02T12:00:00.000Z' })
  updatedAt: Date;

  constructor(partial: Partial<PersonEntity>) {
    Object.assign(this, partial);
  }
}
