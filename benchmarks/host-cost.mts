// Runs the measurement of the conversion of RQ-036 (make benchmark-host) and writes its record. The measuring command,
// examples/host_cost.rs of the Rust package, prints one JSON line per measurement: the document, the direction, the fixed
// run count, the median of the conversion (host_ms) and the median of the text path (text_ms). Each line is read when the
// command prints it, with the load average of the machine at that moment, and the record is published by one rename. A
// ratio never fails the measurement: a ratio above LIMIT prints a WARNING line with the value and the limit. The script
// fails only for a usage error, a command that fails, a line that is no measurement and a run without a measurement.
//
//   node benchmarks/host-cost.mts --report <file> -- <command> [<argument>...]
import { spawn } from 'node:child_process';
import os from 'node:os';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { writeRecord } from '../scripts/records.mts';

/** The ratio of the conversion to the text path above which the measurement prints a warning. */
const LIMIT = 1.5;

type Measurement = { document: string; direction: string; runs: number; host_ms: number; text_ms: number };
type Entry = { language: 'rust' } & Measurement & { ratio: number; load_average: number[] };

/** The measurement of one line of the command, or an Error that names the line and the member it lacks. */
function measurement(line: string): Measurement {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    value = undefined;
  }
  if (value === null || typeof value !== 'object') throw new Error(`the command printed a line that is no measurement: ${line}`);
  const members: Record<string, unknown> = { ...value };
  const text = (name: string): string => {
    const member = members[name];
    if (typeof member !== 'string') throw new Error(`the measurement has no text ${name}: ${line}`);
    return member;
  };
  const number = (name: string): number => {
    const member = members[name];
    if (typeof member !== 'number' || !(member > 0)) throw new Error(`the measurement has no positive number ${name}: ${line}`);
    return member;
  };
  return { document: text('document'), direction: text('direction'), runs: number('runs'), host_ms: number('host_ms'), text_ms: number('text_ms') };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ options: { report: { type: 'string' } }, allowPositionals: true });
  const [command, ...args] = positionals;
  if (values.report === undefined || values.report === '' || command === undefined) {
    throw new Error('usage: node benchmarks/host-cost.mts --report <file> -- <command> [<argument>...]; --report names the file of the record');
  }
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });
  const ended = new Promise<string | undefined>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve(code === 0 ? undefined : code === null ? `ended by ${signal}` : `exited with ${code}`));
  });
  const entries: Entry[] = [];
  const refused: Error[] = [];
  for await (const line of createInterface({ input: child.stdout })) {
    try {
      const measured = measurement(line);
      const ratio = measured.host_ms / measured.text_ms;
      const load = os.loadavg();
      entries.push({ language: 'rust', ...measured, ratio, load_average: load });
      console.log(`${measured.document}\t${measured.direction}\tvalue_in/value_out ${measured.host_ms.toFixed(3)} ms\ttext ${measured.text_ms.toFixed(3)} ms\tratio ${ratio.toFixed(2)}\tload ${load.map((value) => value.toFixed(2)).join(' ')}`);
      if (ratio > LIMIT) console.log(`WARNING: ${measured.document} ${measured.direction}: value_in/value_out takes ${ratio.toFixed(2)} times the time of text, above the limit ${LIMIT.toFixed(2)}`);
    } catch (error) {
      refused.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  const failure = await ended;
  if (failure !== undefined) throw new Error(`the command ${[command, ...args].join(' ')} ${failure}`);
  if (refused.length) throw new Error(refused.map((error) => error.message).join('\n'));
  if (!entries.length) throw new Error(`the command ${[command, ...args].join(' ')} printed no measurement`);
  writeRecord(values.report, entries);
  console.log(`Saved ${values.report}`);
}

if (import.meta.main) await main();
