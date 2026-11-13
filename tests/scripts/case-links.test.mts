// K-1, G-5 of binding: every row of `cases` of packages/rust/interface.json links a member to a group of a case file,
// whose cases a generated binding test runs as cases of that member. Each case has an id, and a key for every
// parameter of the member that has no default, named in snake_case, as the generator reads them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ROOT } from '../../scripts/registry.mts';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const read = (file: string): Json => {
  const value: unknown = JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
  assert.ok(isObject(value), `${file} is no object`);
  return value;
};
const text = (value: unknown, where: string): string => {
  assert.equal(typeof value, 'string', `${where} is no text`);
  return String(value);
};

test('every case that interface.json links has an id and the parameters of its member', () => {
  const contract = read('packages/rust/interface.json');
  const members = new Map<string, Json>();
  for (const unit of list(contract['units']).filter(isObject)) {
    for (const member of list(unit['members']).filter(isObject)) members.set(text(member['id'], 'a member id'), member);
  }
  const findings: string[] = [];
  for (const link of list(contract['cases']).filter(isObject)) {
    const [id, file, group] = [text(link['member'], 'a row member'), text(link['file'], 'a row file'), text(link['group'], 'a row group')];
    const member = members.get(id);
    assert.ok(member, `the row of ${file} names no member ${id}`);
    const cases = read(file)[group];
    assert.ok(Array.isArray(cases), `${file} has no group ${group}`);
    const required = list(member['parameters'])
      .filter(isObject)
      .filter((parameter) => parameter['default'] === undefined && parameter['rest'] !== true)
      .map((parameter) => list(parameter['name']).map(String).join('_'));
    cases.forEach((kase: unknown, at: number) => {
      const fields = isObject(kase) ? kase : {};
      const name = typeof fields['id'] === 'string' ? fields['id'] : undefined;
      const where = `${file} ${group}[${at}]${name === undefined ? '' : ` (${name})`} of ${id}`;
      if (name === undefined) findings.push(`${where} has no id`);
      const missing = required.filter((key) => !(key in fields));
      if (missing.length > 0) findings.push(`${where} has no ${missing.join(', ')}`);
    });
  }
  assert.deepEqual(findings, []);
});
