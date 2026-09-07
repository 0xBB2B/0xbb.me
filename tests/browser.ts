// Run the real installed browser. This helper neither serves nor mocks the site.
export async function runBrowser<T>(source: string): Promise<T> {
  const process = Bun.spawn(['ego-browser', 'nodejs'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  process.stdin.write(source);
  process.stdin.end();
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`ego-browser exited ${exitCode}\n${stderr}\n${stdout}`);
  }
  const prefix = 'PLAYABLE_TOWN_RESULT:';
  const result = `${stdout}\n${stderr}`.split('\n').find((line) => line.startsWith(prefix));
  if (!result) throw new Error(`ego-browser returned no observation\n${stdout}\n${stderr}`);
  return JSON.parse(result.slice(prefix.length)) as T;
}
