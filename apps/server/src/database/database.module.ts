import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { InMemoryStore } from './in-memory.store';
import { SupabaseStore } from './supabase.store';

const databaseProvider = {
  provide: DatabaseService,
  useFactory: (): DatabaseService => {
    const url = process.env.SUPABASE_URL ?? '';
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
    const configured = url && !url.includes('placeholder') && key;
    return configured ? new SupabaseStore() : new InMemoryStore();
  },
};

@Module({
  providers: [databaseProvider],
  exports: [DatabaseService],
})
export class DatabaseModule {}
