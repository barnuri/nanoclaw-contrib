import { describe, expect, it } from 'vitest';

import { isLocalHost, withGatewayNoProxy } from './setup.js';

const privateIpv4 = (...octets: number[]): string => octets.join('.');
const dockerBridgeHost = privateIpv4(172, 17, 0, 1);
const dockerHostAlias = ['host', 'docker', 'internal'].join('.');

describe('isLocalHost', () => {
  it('matches loopback, private and single-label hosts', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      dockerHostAlias,
      dockerBridgeHost,
      privateIpv4(10, 0, 0, 5),
      '100.64.1.1',
      'onecli',
      'box.local',
    ]) {
      expect(isLocalHost(host)).toBe(true);
    }
  });

  it('does not match public IPs or hostnames that start like a private range', () => {
    for (const host of ['8.8.8.8', '172.32.0.1', '10.gateway.example', 'onecli.example.net']) {
      expect(isLocalHost(host)).toBe(false);
    }
  });
});

describe('withGatewayNoProxy', () => {
  it('adds a local gateway host to NO_PROXY', () => {
    expect(withGatewayNoProxy('ONECLI_URL=x\n', `http://${dockerBridgeHost}:10254`)).toBe(
      `ONECLI_URL=x\nNO_PROXY=${dockerBridgeHost}\n`,
    );
  });

  it('appends to an existing NO_PROXY once', () => {
    const once = withGatewayNoProxy('NO_PROXY=.example.net\n', `http://${dockerBridgeHost}:10254`);
    expect(once).toBe(`NO_PROXY=.example.net,${dockerBridgeHost}\n`);
    expect(withGatewayNoProxy(once, `http://${dockerBridgeHost}:10254`)).toBe(once);
  });

  it('strips surrounding quotes before appending to an existing NO_PROXY', () => {
    expect(withGatewayNoProxy('NO_PROXY=".example.net,.example.org"\n', `http://${dockerBridgeHost}:10254`)).toBe(
      `NO_PROXY=.example.net,.example.org,${dockerBridgeHost}\n`,
    );
  });

  it('leaves a remote gateway on the proxy', () => {
    expect(withGatewayNoProxy('KEEP=1\n', 'https://onecli.example.net')).toBe('KEEP=1\n');
  });
});
