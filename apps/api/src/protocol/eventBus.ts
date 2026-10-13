import { EventEmitter } from 'node:events';

export interface CivilizationEvent { id?: number; event: string; detail: string; proposalId: string | null; organizationId: string | null; createdAt: string }
const emitter = new EventEmitter();
emitter.setMaxListeners(500);

export const civilizationEvents = {
  publish(event: CivilizationEvent) { emitter.emit('civilization', event); },
  subscribe(listener: (event: CivilizationEvent) => void) { emitter.on('civilization', listener); return () => emitter.off('civilization', listener); },
};
