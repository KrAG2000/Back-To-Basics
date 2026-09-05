import { DomainError } from '../lib.js';

export function chooseProvider({ method, amount, scenario = {}, providers }) {
  const available = providers
    .filter((provider) => provider.enabled && provider.methods.includes(method))
    .filter((provider) => !provider.maxAmount || amount <= provider.maxAmount)
    .sort((a, b) => a.priority - b.priority || b.successRate - a.successRate || a.latency - b.latency);
  const selected = scenario.provider && scenario.provider !== 'AUTO'
    ? available.find((provider) => provider.id === scenario.provider)
    : available[0];
  if (!selected) throw new DomainError('No eligible provider route', 'NO_ROUTE', 503);
  return {
    provider: selected.id,
    reason: scenario.provider && scenario.provider !== 'AUTO' ? 'Explicit scenario route' : 'Priority, eligibility, success rate, then latency',
    candidates: available.map(({ id, successRate, latency, priority }) => ({ id, successRate, latency, priority }))
  };
}
