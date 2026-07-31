async function getUserChatbotContext(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      displayName: true, 
      department: true, 
      attritionRiskScore: true, 
      attritionRiskLabel: true, 
      riskUpdatedAt: true 
    },
  });
  return user;
}

module.exports = { getUserChatbotContext };
