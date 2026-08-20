import { newId } from '../id';

describe('id 생성', () => {
  it('빈 값을 돌려주지 않는다', () => {
    // id가 비면 두 항목이 같은 id를 갖게 되고, 하나를 지울 때 다른 것까지 지워진다
    expect(newId()).toBeTruthy();
  });

  it('부를 때마다 다르다', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
  });

  it('UUID 모양이다', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
