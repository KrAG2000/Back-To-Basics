export function evaluateRisk({ amount, method, customer, recentPayments = 0, scenario = {} }) {
  let score = 5;
  const reasons = [];
  if (amount >= 2000000) { score += 50; reasons.push('Amount is at least ₹20,000'); }
  else if (amount >= 500000) { score += 25; reasons.push('Elevated transaction amount'); }
  if (recentPayments >= 5) { score += 35; reasons.push('Velocity: five or more recent payments'); }
  if (customer?.risk_level === 'HIGH') { score += 45; reasons.push('Customer risk profile is HIGH'); }
  if (method === 'CARD' && scenario.deviceRisk === 'HIGH') { score += 35; reasons.push('Synthetic device risk is HIGH'); }
  if (scenario.risk === 'BLOCK') { score = 100; reasons.push('Scenario forced a deterministic block'); }
  if (scenario.risk === 'REVIEW') { score = Math.max(score, 65); reasons.push('Scenario forced manual review'); }
  const decision = score >= 90 ? 'BLOCKED' : score >= 60 ? 'REVIEW_REQUIRED' : score >= 30 ? 'MEDIUM_RISK' : 'LOW_RISK';
  return { score, decision, reasons: reasons.length ? reasons : ['No elevated deterministic signals'] };
}
