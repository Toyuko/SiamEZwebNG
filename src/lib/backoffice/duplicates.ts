export type DuplicatePerson = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type DuplicateGroup = {
  reason: "email" | "phone" | "name";
  key: string;
  people: DuplicatePerson[];
};

function phoneKey(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-9);
}

export function findDuplicateGroups(people: DuplicatePerson[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const collect = (reason: DuplicateGroup["reason"], keyOf: (person: DuplicatePerson) => string | null) => {
    const buckets = new Map<string, DuplicatePerson[]>();
    for (const person of people) {
      const key = keyOf(person);
      if (!key) continue;
      const list = buckets.get(key) ?? [];
      list.push(person);
      buckets.set(key, list);
    }
    for (const [key, list] of buckets) {
      const unique = [...new Map(list.map((person) => [person.id, person])).values()];
      if (unique.length > 1) groups.push({ reason, key, people: unique });
    }
  };
  collect("email", (person) => person.email?.trim().toLowerCase() || null);
  collect("phone", (person) => phoneKey(person.phone));
  collect("name", (person) => {
    const name = person.name?.trim().toLowerCase() ?? "";
    return name.length >= 4 ? name : null;
  });
  return groups;
}
