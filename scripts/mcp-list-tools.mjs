import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: '/home/thomaz/.cursor/bin/browsermcp-server.sh',
  args: [],
  env: {
    ...process.env,
    PATH: `/home/thomaz/.nvm/versions/node/v22.17.1/bin:${process.env.PATH ?? ''}`,
  },
});

const client = new Client({ name: 'mcp-test', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
const { tools } = await client.listTools();
console.log('toolCount', tools.length);
console.log(tools.map((t) => t.name).join(', '));
await client.close();
