import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStore } from '../common/data-store';

@Injectable()
export class EldersService {
  constructor(private readonly store: DataStore) {}

  list(keyword?: string) {
    const kw = keyword?.trim();
    return this.store.elders
      .filter((e) => !kw || e.name.includes(kw) || e.address.includes(kw))
      .map((elder) => ({
        ...elder,
        contacts: this.store.contacts.filter((c) => c.elderId === elder.id),
      }));
  }

  getProfile(id: string) {
    const elder = this.store.elders.find((e) => e.id === id);
    if (!elder) throw new NotFoundException('老人不存在');
    const visits = this.store.visits
      .filter((v) => v.elderId === id)
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    return {
      elder,
      contacts: this.store.contacts
        .filter((c) => c.elderId === id)
        .sort((a, b) => a.priority - b.priority),
      visits,
      records: this.store.records
        .filter((r) => r.elderId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  getHealthRecords(id: string) {
    return this.store.records
      .filter((r) => r.elderId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
