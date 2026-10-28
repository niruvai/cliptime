import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, stats } from '../extension/lib/text-tools.js';

test('remove blank lines', () => {
  assert.equal(TOOLS.removeBlankLines('a\r\n\r\n  \nb\n\n\nc\n'), 'a\nb\nc');
});
test('collapse blank lines', () => {
  assert.equal(TOOLS.collapseBlankLines('\n\na\n \n\n\nb\n\n'), 'a\n\nb');
});
test('smart clean', () => {
  assert.equal(TOOLS.smartClean('  hello    world \n\n\t foo  bar  \n'), 'hello world\nfoo bar');
});
test('cases', () => {
  assert.equal(TOOLS.title('hello WORLD-wide web'), 'Hello World-Wide Web');
  assert.equal(TOOLS.sentence('HELLO there. how ARE you? fine'), 'Hello there. How are you? Fine');
  assert.equal(TOOLS.camel('Hello world foo'), 'helloWorldFoo');
  assert.equal(TOOLS.pascal('hello_world foo'), 'HelloWorldFoo');
  assert.equal(TOOLS.snake('helloWorld XMLHttpRequest'), 'hello_world_xml_http_request');
  assert.equal(TOOLS.kebab('Hello World'), 'hello-world');
  assert.equal(TOOLS.constant('max retry count'), 'MAX_RETRY_COUNT');
  assert.equal(TOOLS.toggle('aBc'), 'AbC');
  assert.equal(TOOLS.snake('line one\nline two'), 'line_one\nline_two');
});
test('lines', () => {
  assert.equal(TOOLS.sortLines('b\na10\na2'), 'a2\na10\nb');
  assert.equal(TOOLS.uniqueLines('a\nb\na'), 'a\nb');
  assert.equal(TOOLS.numberLines('x\n\ny'), '1. x\n\n2. y');
  assert.equal(TOOLS.removeNumbering('1. x\n২) y\n- z'), 'x\ny\nz');
  assert.equal(TOOLS.joinLines(' a \n\n b '), 'a b');
});
test('bangla digits', () => {
  assert.equal(TOOLS.toBnDigits('2026-10'), '২০২৬-১০');
  assert.equal(TOOLS.toEnDigits('৩০ দিন'), '30 দিন');
});
test('strip html (no DOM)', () => {
  assert.equal(TOOLS.stripHtml('<p>Hi &amp; <b>bye</b></p><script>x()</script>'), 'Hi & bye');
});
test('stats', () => {
  assert.deepEqual(stats('আমি বাংলায় লিখি\nhello world'), { chars: 28, words: 5, lines: 2 });
});
