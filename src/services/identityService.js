const prisma = require("../config/prisma");

async function identifyContact(email, phoneNumber) {
  // Step 1: Find matching contacts
  const existingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  // TEMP placeholder
  return {
    contact: {
      primaryContatctId: null,
      emails: [],
      phoneNumbers: [],
      secondaryContactIds: []
    }
  };
}

module.exports = { identifyContact };