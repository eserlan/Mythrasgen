export type RelationshipType = "Ally" | "Contact" | "Enemy" | "Rival";
export type RelationshipSource = "reputation" | "connections";

export interface FamilyRelationship {
  source: RelationshipSource;
  allowedTypes: RelationshipType[];
  type: RelationshipType;
  name: string;
}

export const ALL_RELATIONSHIP_TYPES: RelationshipType[] = ["Ally", "Contact", "Enemy", "Rival"];

export function formatFamilyRelationships(relationships: FamilyRelationship[], source: RelationshipSource): string {
  return relationships
    .filter(relationship => relationship.source === source)
    .map(relationship => `${relationship.type}${relationship.name ? ` (${relationship.name})` : ""}`)
    .join(", ") || "None generated";
}

/** Read the relationship count and constraints printed in a Core family table result. */
export function familyRelationshipSpec(result: string): { count: number; die: number; allowedTypes: RelationshipType[] } {
  if (/^None\b/i.test(result)) return { count: 0, die: 0, allowedTypes: [] };
  const allowedTypes: RelationshipType[] = /Enem(?:y|ies)/i.test(result)
    ? ["Enemy", "Rival"]
    : /Contact/i.test(result) ? ["Contact", "Ally"] : ALL_RELATIONSHIP_TYPES;
  const variable = result.match(/(\d+)d(\d+)/i);
  if (variable) return { count: 0, die: Number(variable[2]), allowedTypes };
  const fixed = result.match(/\b(\d+)\b/);
  return { count: fixed ? Number(fixed[1]) : 0, die: 0, allowedTypes };
}

/** Resolve one source's count, retaining the subsidiary die result for saves. */
export function resolveFamilyRelationshipCount(
  result: string,
  rollDie: (sides: number) => number,
): { count: number; countRoll: number; allowedTypes: RelationshipType[] } {
  const spec = familyRelationshipSpec(result);
  const countRoll = spec.die ? rollDie(spec.die) : 0;
  return { count: spec.die ? countRoll : spec.count, countRoll, allowedTypes: spec.allowedTypes };
}

/** Replace only one source's generated slots, preserving compatible player choices. */
export function reconcileFamilyRelationships(
  relationships: FamilyRelationship[],
  source: RelationshipSource,
  count: number,
  allowedTypes: RelationshipType[],
): FamilyRelationship[] {
  let remaining = count;
  const next = relationships.flatMap(relationship => {
    if (relationship.source !== source) return [relationship];
    if (remaining <= 0) return [];
    remaining--;
    const validTypes = allowedTypes.includes(relationship.type) ? relationship.type : allowedTypes[0];
    return [{ ...relationship, allowedTypes: [...allowedTypes], type: validTypes }];
  });
  while (remaining-- > 0) {
    next.push({ source, allowedTypes: [...allowedTypes], type: allowedTypes[0], name: "" });
  }
  return next;
}
