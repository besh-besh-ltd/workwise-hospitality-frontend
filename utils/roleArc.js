// A role is an "ARC role" when it approves or performs any ARC stage. ARC roles
// act on both Unit ARC and Group ARC, so the UI says so wherever they are named.
export const ARC_ROLE_HINT = "Unit & Group ARC";

export const isArcRole = (role) =>
  [...(role?.approvable_entity_types || []), ...(role?.performs_entity_types || [])].some((t) =>
    String(t).startsWith("ARC")
  );
