import { FcfaPipe } from './fcfa-pipe';

describe('FcfaPipe', () => {
  it('formats FCFA prices with non-breaking spaces', () => {
    const pipe = new FcfaPipe();
    expect(pipe.transform(25000)).toBe('25\u00A0000\u00A0FCFA');
    expect(pipe.transform(0)).toBe('0\u00A0FCFA');
    expect(pipe.transform(null)).toBe('');
  });
});
