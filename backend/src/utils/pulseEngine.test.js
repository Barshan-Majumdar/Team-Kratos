const pulseEngine = require('./pulseEngine');

describe('Pulse Engine In-Memory States and Operations Tests', () => {
  const tenantId = 'test-tenant-123';
  const user1 = {
    id: 'u1',
    baseSalary: 60000, // hourly rate = 60000 / 240 = 250
    displayName: 'Alice Cooper',
    department: 'Engineering',
    avatarUrl: 'https://avatar.example.com/alice.png'
  };

  const user2 = {
    id: 'u2',
    baseSalary: 48000, // hourly rate = 48000 / 240 = 200
    displayName: 'Bob Dylan',
    department: 'Marketing',
    avatarUrl: null
  };

  beforeEach(() => {
    pulseEngine.clearStateForTesting(tenantId);
  });

  test('Should register check-in and update headcount and burnRate correctly', () => {
    const snap = pulseEngine.registerCheckIn(tenantId, user1);
    
    const stateObj = pulseEngine.getTenantState(tenantId);
    expect(stateObj.headcount).toBe(1);
    expect(stateObj.burnRate).toBe(250);
    expect(stateObj.recentEvents.length).toBe(1);
    expect(stateObj.recentEvents[0].type).toBe('checkin');
    expect(stateObj.recentEvents[0].displayName).toBe('Alice Cooper');
  });

  test('Should verify idempotency - duplicate check-ins should not increase headcount', () => {
    pulseEngine.registerCheckIn(tenantId, user1);
    pulseEngine.registerCheckIn(tenantId, user1); // duplicate
    
    const stateObj = pulseEngine.getTenantState(tenantId);
    expect(stateObj.headcount).toBe(1);
    expect(stateObj.burnRate).toBe(250);
  });

  test('Should register check-out and remove user from state correctly', () => {
    pulseEngine.registerCheckIn(tenantId, user1);
    pulseEngine.registerCheckIn(tenantId, user2);
    
    let stateObj = pulseEngine.getTenantState(tenantId);
    expect(stateObj.headcount).toBe(2);
    expect(stateObj.burnRate).toBe(450);

    pulseEngine.registerCheckOut(tenantId, user1);
    
    stateObj = pulseEngine.getTenantState(tenantId);
    expect(stateObj.headcount).toBe(1);
    expect(stateObj.burnRate).toBe(200);
    expect(stateObj.recentEvents[0].type).toBe('checkout');
    expect(stateObj.recentEvents[0].userId).toBe('u1');
  });

  test('Should accumulate accrued cost per minute correctly on tick', () => {
    pulseEngine.registerCheckIn(tenantId, user1); // burn rate = 250
    pulseEngine.registerCheckIn(tenantId, user2); // burn rate = 200 => total 450
    
    const initialSnapshot = pulseEngine.getTenantState(tenantId);
    const initialCost = initialSnapshot.cumulativeCost;

    pulseEngine.tickAllTenants();

    const updatedSnapshot = pulseEngine.getTenantState(tenantId);
    // Cost should accrue: total burnRate (450) / 60 mins = 7.5 per minute
    expect(updatedSnapshot.cumulativeCost).toBe(initialCost + 7.5);
  });
});
