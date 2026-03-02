const prisma = require("../config/prisma");

/**
 * Returns all contacts connected to the given seed contacts:
 * - includes the seed rows
 * - includes their primary rows
 * - includes all secondaries of those primaries
 */
async function fetchContactGraph(seedContacts) {
  const ids = new Set();
  const primaryIds = new Set();

  for (const c of seedContacts) {
    ids.add(c.id);
    if (c.linkPrecedence === "primary") primaryIds.add(c.id);
    if (c.linkedId) primaryIds.add(c.linkedId);
  }

  if (primaryIds.size === 0) return [];

  const primariesAndSecondaries = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  for (const c of primariesAndSecondaries) ids.add(c.id);

  // Return deduped full rows (ordered by createdAt asc helps picking oldest)
  const all = await prisma.contact.findMany({
    where: { id: { in: Array.from(ids) } },
    orderBy: { createdAt: "asc" },
  });

  return all;
}

function buildResponseFromGroup(primary, group) {
  const emails = [];
  const phones = [];
  const secondaryIds = [];

  // Primary first
  if (primary.email) emails.push(primary.email);
  if (primary.phoneNumber) phones.push(primary.phoneNumber);

  // Then add unique from rest
  for (const c of group) {
    if (c.id === primary.id) continue;

    if (c.linkPrecedence === "secondary") secondaryIds.push(c.id);

    if (c.email && !emails.includes(c.email)) emails.push(c.email);
    if (c.phoneNumber && !phones.includes(c.phoneNumber)) phones.push(c.phoneNumber);
  }

  return {
    contact: {
      primaryContatctId: primary.id, // note: spelling matches PDF requirement
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds,
    },
  };
}

async function identifyContact(email, phoneNumber) {
  const incomingEmail = email || null;
  const incomingPhone = phoneNumber ? String(phoneNumber) : null;

  // 1) Find direct matches
  const seedMatches = await prisma.contact.findMany({
    where: {
      OR: [
        incomingEmail ? { email: incomingEmail } : undefined,
        incomingPhone ? { phoneNumber: incomingPhone } : undefined,
      ].filter(Boolean),
    },
    orderBy: { createdAt: "asc" },
  });

  // Case 1: No match → create new primary
  if (seedMatches.length === 0) {
    const created = await prisma.contact.create({
      data: {
        email: incomingEmail,
        phoneNumber: incomingPhone,
        linkPrecedence: "primary",
        linkedId: null,
      },
    });

    return buildResponseFromGroup(created, [created]);
  }

  // 2) Fetch the whole connected graph
  let group = await fetchContactGraph(seedMatches);

  // 3) Determine all primaries involved
  const primaryCandidates = group.filter((c) => c.linkPrecedence === "primary");
  primaryCandidates.sort((a, b) => a.createdAt - b.createdAt);
  const oldestPrimary = primaryCandidates[0];

  // 4) If multiple primaries exist, merge them:
  //    all other primaries become secondary linked to oldestPrimary
  const otherPrimaries = primaryCandidates.filter((p) => p.id !== oldestPrimary.id);

  if (otherPrimaries.length > 0) {
    await prisma.$transaction(
      otherPrimaries.map((p) =>
        prisma.contact.update({
          where: { id: p.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: oldestPrimary.id,
          },
        })
      )
    );

    // also ensure any secondaries linked to those primaries now point to oldestPrimary
    await prisma.contact.updateMany({
      where: {
        linkedId: { in: otherPrimaries.map((p) => p.id) },
      },
      data: {
        linkedId: oldestPrimary.id,
      },
    });

    // re-fetch group after merge updates
    group = await prisma.contact.findMany({
      where: {
        OR: [{ id: oldestPrimary.id }, { linkedId: oldestPrimary.id }],
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    // ensure group is only for oldestPrimary
    group = await prisma.contact.findMany({
      where: {
        OR: [{ id: oldestPrimary.id }, { linkedId: oldestPrimary.id }],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // 5) If incoming has new info not present in group → create secondary
  const emailsInGroup = new Set(group.map((c) => c.email).filter(Boolean));
  const phonesInGroup = new Set(group.map((c) => c.phoneNumber).filter(Boolean));

  const hasNewEmail = incomingEmail && !emailsInGroup.has(incomingEmail);
  const hasNewPhone = incomingPhone && !phonesInGroup.has(incomingPhone);

  if (hasNewEmail || hasNewPhone) {
    const createdSecondary = await prisma.contact.create({
      data: {
        email: incomingEmail,
        phoneNumber: incomingPhone,
        linkPrecedence: "secondary",
        linkedId: oldestPrimary.id,
      },
    });

    group.push(createdSecondary);
    // keep ordering consistent
    group.sort((a, b) => a.createdAt - b.createdAt);
  }

  // 6) Build final response
  const primary = await prisma.contact.findUnique({ where: { id: oldestPrimary.id } });
  return buildResponseFromGroup(primary, group);
}

module.exports = { identifyContact };