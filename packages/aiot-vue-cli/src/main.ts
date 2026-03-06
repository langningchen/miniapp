import cac from 'cac';
import z from 'zod';
import { deviceBuild } from './cli-actions/build.js';
import { init } from './libs/appinfo.js';

const CliSchema = z.object({
  dir: z.string().default('.'),
  mock: z.boolean().default(false),
  env: z.array(z.string()).default([]),
});
type CliOptions = z.infer<typeof CliSchema>;

const cli = cac('aiot-cli');
cli.help().option('-d, --dir <type>', 'Project root directory', { default: '.' });
cli
  .command('build', 'Build application')
  .option('-m, --mock', 'Mock JSAPI')
  .option(
    '-e, --env <var...>',
    'Define environment variables, e.g. -e NODE_ENV=production -e API_URL=https://api.example.com',
  )
  .action(async (options: CliOptions) => {
    const { dir, mock, env } = CliSchema.parse(options);
    await init(dir);
    await deviceBuild({ mock, env });
    process.exit(0);
  });
cli.parse();
