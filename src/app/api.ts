// CORE owns generated types and transport. All feature screens share this instance.
import { createApiClient, type ApiClient, type DataMode, type OperationId, type OperationInput, type OperationOutput } from '../../packages/api-client/index';
import { demoCompanion, demoRequest, selectDemoCompanion, setDemoPerson } from './demo-api';

const transport = createApiClient();
let mode: DataMode = 'live';
export const api: ApiClient = {
  setDataMode(next) { mode = next; transport.setDataMode(next); if (next !== 'demo') setDemoPerson(null); },
  cancelPending() { transport.cancelPending(); },
  async request<T extends OperationId>(operation: T, input: OperationInput<T>): Promise<OperationOutput<T>> {
    if (mode === 'demo') {
      const simulated = demoRequest(operation, input);
      if (simulated !== undefined) return simulated as OperationOutput<T>;
    }
    let forwarded = input;
    if (mode === 'demo' && operation === 'registerCompanionImport') {
      const current = await transport.request('getCompanionSettings', {});
      const registration = input as { body: { selectCurrent: boolean; settingsVersion?: number | null } };
      forwarded = { ...input, body: { ...registration.body, settingsVersion: current.data.version } } as OperationInput<T>;
    }
    const result = await transport.request(operation, forwarded);
    if (mode === 'demo' && operation === 'listCompanions') {
      const list = result as { items: Array<{ id: string }>; nextCursor: string | null };
      return { ...list, items: [demoCompanion(), ...list.items.filter(item => item.id !== demoCompanion().id)] } as OperationOutput<T>;
    }
    if (mode === 'demo' && operation === 'registerCompanionImport') {
      const registration = result as { data?: { companion?: { id?: string } } };
      const requested = input as { body?: { selectCurrent?: boolean } };
      if (requested.body?.selectCurrent && registration.data?.companion?.id) selectDemoCompanion(registration.data.companion.id);
    }
    if (mode === 'demo' && (operation === 'getSession' || operation === 'postSession')) {
      const person = (result as { data?: { person?: { id?: string } } }).data?.person;
      if (person?.id) setDemoPerson(person.id);
    }
    return result;
  },
};
