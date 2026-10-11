import { requiredNonBlank } from './vendor.validators';
import { FormControl } from '@angular/forms';

describe('requiredNonBlank', () => {
  it.each([[''], ['   '], [null], [undefined]])('rejects %j', (value) => {
    expect(requiredNonBlank(new FormControl(value))).toEqual({ required: true });
  });

  it('accepts a value with content', () => {
    expect(requiredNonBlank(new FormControl(' a@b.c '))).toBeNull();
  });
});
