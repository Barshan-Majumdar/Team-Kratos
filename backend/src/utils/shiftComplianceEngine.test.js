const { computeShiftCompliance, isDateOnApprovedLeave } = require('./shiftComplianceEngine');

describe('Shift Compliance Engine Tests', () => {
  const mockPolicy = {
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    overtimeRateMultiplier: 1.5,
    lateDeductionPerMinute: 2, // ₹2 per minute
    minOvertimeMinutes: 30
  };

  const baseSalary = 24000; // hourly rate = 24000 / (30 * 9h) = ₹88.89 per hour

  test('Scenario 1: Normal shift, on-time check-in and check-out', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:00:00Z'),
      checkOut: new Date('2026-07-01T18:00:00Z')
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    expect(result.overtimeHours).toBe(0);
    expect(result.overtimeBonus).toBe(0);
    expect(result.lateDeductions).toBe(0);
    expect(result.deductions.length).toBe(0);
    expect(result.bonuses.length).toBe(0);
  });

  test('Scenario 2: Late check-in beyond grace period', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:20:00Z'), // 20 mins late (> 15 mins grace)
      checkOut: new Date('2026-07-01T18:00:00Z')
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    expect(result.lateDeductions).toBe(40); // 20 mins * ₹2 = ₹40
    expect(result.deductions[0].type).toBe('late_arrival');
    expect(result.deductions[0].minutes).toBe(20);
  });

  test('Scenario 3: Late check-in within grace period', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:10:00Z'), // 10 mins late (<= 15 mins grace)
      checkOut: new Date('2026-07-01T18:00:00Z')
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    expect(result.lateDeductions).toBe(0);
    expect(result.deductions.length).toBe(0);
  });

  test('Scenario 4: Overtime beyond minOvertimeMinutes', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:00:00Z'),
      checkOut: new Date('2026-07-01T19:00:00Z') // 1 hour overtime
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    // Hourly rate = 24000 / (30 * 9h) = ₹88.8888
    // OT Bonus = 1.0 * 88.8888 * 1.5 = ₹133.33
    expect(result.overtimeHours).toBe(1.0);
    expect(result.overtimeBonus).toBe(133.33);
    expect(result.bonuses[0].type).toBe('overtime');
  });

  test('Scenario 5: Overtime below minOvertimeMinutes', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:00:00Z'),
      checkOut: new Date('2026-07-01T18:20:00Z') // 20 mins overtime (< 30 min threshold)
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    expect(result.overtimeHours).toBe(0);
    expect(result.overtimeBonus).toBe(0);
    expect(result.bonuses.length).toBe(0);
  });

  test('Scenario 6: Early check-out before shift end', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:00:00Z'),
      checkOut: new Date('2026-07-01T17:45:00Z') // 15 mins early
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary);

    expect(result.lateDeductions).toBe(30); // 15 mins * ₹2 = ₹30
    expect(result.deductions[0].type).toBe('early_departure');
    expect(result.deductions[0].minutes).toBe(15);
  });

  test('Scenario 7: Approved leave suppresses timing checks', () => {
    const attendances = [{
      date: new Date('2026-07-01'),
      checkIn: new Date('2026-07-01T09:30:00Z'), // late
      checkOut: new Date('2026-07-01T17:30:00Z') // early
    }];

    const approvedLeaves = [{
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-01'),
      status: 'Approved'
    }];

    const result = computeShiftCompliance(attendances, mockPolicy, baseSalary, approvedLeaves);

    expect(result.lateDeductions).toBe(0);
    expect(result.deductions.length).toBe(0);
  });

  test('Scenario 8: Overnight shift computation (22:00 -> 06:00)', () => {
    const overnightPolicy = {
      startTime: '22:00',
      endTime: '06:00',
      graceMinutes: 15,
      overtimeRateMultiplier: 1.5,
      lateDeductionPerMinute: 2,
      minOvertimeMinutes: 30
    };

    const attendances = [{
      date: new Date('2026-07-01'),
      // Checks in at 22:20 (20 min late) on July 1st, clocks out at 07:00 (1 hour overtime) on July 2nd
      checkIn: new Date('2026-07-01T22:20:00Z'),
      checkOut: new Date('2026-07-02T07:00:00Z')
    }];

    const result = computeShiftCompliance(attendances, overnightPolicy, baseSalary);

    expect(result.lateDeductions).toBe(40); // 20 min * ₹2 = ₹40
    expect(result.overtimeHours).toBe(1.0); // 1 hour OT (06:00 to 07:00)
    // Overnight Shift Hours = 22:00 to 06:00 = 8 hours
    // Hourly rate = 24000 / (30 * 8h) = ₹100
    // OT Bonus = 1.0 * 100 * 1.5 = ₹150.00
    expect(result.overtimeBonus).toBe(150.00);
  });
});
