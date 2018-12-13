import httpErrors from "http-errors";
import ScopeBag from "../../src/util/scope";

test('a bag with no scopes', () => {
  const bag = new ScopeBag(null);
  expect(() => bag.require('foo')).toThrow(httpErrors.Unauthorized);
  expect(() => bag.require('bar')).toThrow(httpErrors.Unauthorized);
  expect(() => bag.require('')).toThrow(httpErrors.Unauthorized);
});

test('a bag with some scopes', () => {
  const bag = new ScopeBag('create update delete');
  expect(() => bag.require('create')).not.toThrow();
  expect(() => bag.require('update')).not.toThrow();
  expect(() => bag.require('delete')).not.toThrow();
  expect(() => bag.require('media')).toThrow(httpErrors.Unauthorized);
  expect(() => bag.require('')).toThrow(httpErrors.Unauthorized);
});
