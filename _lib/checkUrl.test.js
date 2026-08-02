import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl } from './checkUrl.js';

const reject = async (url) => {
  const r = await checkUrl(url);
  assert.equal(r.ok, false, `${url} should be refused`);
  return r;
};

test('an ordinary site passes', async () => {
  assert.equal((await checkUrl('https://example.com/article')).ok, true);
});

test('loopback is refused by address and by name', async () => {
  assert.equal((await reject('http://127.0.0.1/')).reason, 'private_address');
  assert.equal((await reject('http://127.1.2.3/')).reason, 'private_address');
  assert.equal((await reject('http://[::1]/')).reason, 'private_address');
  assert.equal((await reject('http://localhost/')).reason, 'private_address');
});

test('private ranges are refused', async () => {
  for (const ip of ['10.0.0.1', '172.16.5.4', '172.31.0.1', '192.168.1.1']) {
    assert.equal((await reject(`http://${ip}/`)).reason, 'private_address', ip);
  }
});

test('cloud metadata is refused', async () => {
  assert.equal(
    (await reject('http://169.254.169.254/latest/meta-data/')).reason,
    'private_address'
  );
});

test('the CGNAT range is refused', async () => {
  for (const ip of ['100.64.0.1', '100.100.100.100', '100.127.255.254']) {
    assert.equal((await reject(`http://${ip}/`)).reason, 'private_address', ip);
  }
});

test('addresses next to private blocks still pass', async () => {
  for (const ip of ['172.15.0.1', '172.32.0.1', '100.128.0.1', '11.0.0.1']) {
    assert.equal((await checkUrl(`http://${ip}/`)).ok, true, ip);
  }
});

test('IPv4 wrapped in IPv6 is not a way round', async () => {
  assert.equal((await reject('http://[::ffff:127.0.0.1]/')).reason, 'private_address');
  assert.equal((await reject('http://[::ffff:7f00:1]/')).reason, 'private_address');
  assert.equal((await reject('http://[::ffff:a00:1]/')).reason, 'private_address');
  assert.equal((await reject('http://[::ffff:6440:1]/')).reason, 'private_address');
  assert.equal((await reject('http://[fd00::1]/')).reason, 'private_address');
  assert.equal((await reject('http://[fe80::1]/')).reason, 'private_address');
});

test('a wrapped public IPv4 passes', async () => {
  assert.equal((await checkUrl('http://[::ffff:5db8:d822]/')).ok, true);
});

test('only http and https', async () => {
  assert.equal((await reject('file:///etc/passwd')).reason, 'bad_scheme');
  assert.equal((await reject('ftp://example.com/x')).reason, 'bad_scheme');
  assert.equal((await reject('gopher://example.com/')).reason, 'bad_scheme');
});

test('nonsense is refused clearly', async () => {
  assert.equal((await reject('just some text')).reason, 'bad_url');
});

test('an unresolvable name is refused rather than thrown', async () => {
  assert.equal(
    (await reject('http://this-name-does-not-exist-xyz123.invalid/')).reason,
    'dns_failed'
  );
});

test('social sites are refused before any network call', async () => {
  for (const url of [
    'https://instagram.com/p/x',
    'https://www.instagram.com/p/x',
    'https://es.pinterest.com/pin/1',
    'https://vm.tiktok.com/abc',
    'https://youtube.com/watch?v=1',
    'https://youtu.be/abc',
    'https://facebook.com/x',
  ]) {
    assert.equal((await reject(url)).reason, 'never_articles', url);
  }
});

test('sites that sometimes work are not blocked', async () => {
  for (const url of ['https://x.com/user/status/1', 'https://share.google/abc']) {
    assert.equal((await checkUrl(url)).ok, true, url);
  }
});

test('every refusal carries something to show the sender', async () => {
  for (const url of ['http://127.0.0.1/', 'file:///x', 'nonsense', 'https://instagram.com/x']) {
    const r = await checkUrl(url);

    assert.equal(typeof r.message, 'string');
    assert.ok(r.message.length > 10, url);
  }
});
