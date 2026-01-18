import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

type State = { id: string; dbUrl: string };

export default async function globalTeardown(): Promise<void> {
  const statePath = join(
    process.cwd(),
    'test/integration/setup/.container-state.json',
  );

  const raw = readFileSync(statePath, 'utf-8');
  const { id } = JSON.parse(raw) as State;

  await execAsync(`docker rm -f ${id}`);
}
