const leaveValidations = require('./validations/leave');
const onboardingValidations = require('./validations/onboarding');
const performanceValidations = require('./validations/performance');

module.exports = {
  ...leaveValidations,
  ...onboardingValidations,
  ...performanceValidations
};
